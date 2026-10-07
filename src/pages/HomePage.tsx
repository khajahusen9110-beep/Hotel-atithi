import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Category } from '../types/database';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import {
  MENU_PAGE_SIZE,
  MenuQuery,
  MenuSort,
  prefetchMenuProducts,
  sanitizeSearch,
  useMenuProducts,
} from '../hooks/useMenuProducts';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { imageSrcSet, sizedImageUrl } from '../utils/image';
import {
  ArrowLeft,
  UtensilsCrossed,
  ChevronRight,
  Search,
  X,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  SearchX,
} from 'lucide-react';

const SORT_OPTIONS: { value: MenuSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const parseSort = (value: string | null): MenuSort =>
  SORT_OPTIONS.some((o) => o.value === value) ? (value as MenuSort) : 'recommended';

// Searches shorter than this return most of the menu, so they are ignored
const MIN_SEARCH_LENGTH = 2;

// Categories and their dish counts barely change; keep them for the whole visit
// so returning to the menu renders instantly without a loading flash.
let categoriesCache: Category[] | null = null;
let categoryCountsCache: Record<string, number> | null = null;

// Category image fallback helper
const getCategoryFallbackImage = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('biryani') || n.includes('rice')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('chicken') || n.includes('mutton') || n.includes('non-veg') || n.includes('meat')) {
    return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('starter') || n.includes('tikka') || n.includes('kebab') || n.includes('tandoori')) {
    return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('roti') || n.includes('bread') || n.includes('naan') || n.includes('paratha')) {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('chinese') || n.includes('noodle') || n.includes('soup') || n.includes('fried rice')) {
    return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('veg') || n.includes('paneer') || n.includes('dal') || n.includes('curry')) {
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('drink') || n.includes('beverage') || n.includes('juice')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60';
  }
  return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60';
};

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth, so filtered views can be shared and the back button works
  const selectedCategoryId = searchParams.get('category') || null;
  const vegOnly = searchParams.get('veg') === '1';
  const sort = parseSort(searchParams.get('sort'));
  const urlSearch = searchParams.get('q') || '';

  // Category State from Database
  const [categories, setCategories] = useState<Category[]>(categoriesCache || []);
  const [loadingCategories, setLoadingCategories] = useState(!categoriesCache);
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>(
    categoryCountsCache || {}
  );

  // Search box: typed text is debounced before it reaches the URL and the database
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const lastWrittenSearchRef = useRef(urlSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateParams = useCallback(
    (changes: Record<string, string | null>, options?: { replace?: boolean }) => {
      setSearchParams(
        () => {
          // Read the live URL, not the hook's `prev`: `prev` is from the last render, so two
          // quick changes (e.g. Veg off, then sort) would otherwise undo the first one.
          const next = new URLSearchParams(window.location.search);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === '') next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: options?.replace }
      );
    },
    [setSearchParams]
  );

  // 1. Fetch Existing Food Categories from database
  useEffect(() => {
    let isCancelled = false;
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('type', 'food')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && !isCancelled) {
          categoriesCache = data;
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        if (!isCancelled) {
          setLoadingCategories(false);
        }
      }
    };

    fetchCategories();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Fetch Category Product Counts in background for item count badges (one tiny column only)
  useEffect(() => {
    let isCancelled = false;
    const fetchCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('category_id')
          .eq('type', 'food');

        if (!error && data && !isCancelled) {
          const counts: Record<string, number> = {};
          for (const item of data) {
            if (item.category_id) {
              counts[item.category_id] = (counts[item.category_id] || 0) + 1;
            }
          }
          categoryCountsCache = counts;
          setCategoryProductCounts(counts);
        }
      } catch (err) {
        console.warn('Error fetching category counts:', err);
      }
    };

    fetchCounts();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 3. Push the debounced search text into the URL
  useEffect(() => {
    const value = debouncedSearch.trim();
    if (value === urlSearch) return;
    lastWrittenSearchRef.current = value;
    updateParams({ q: value || null }, { replace: true });
    // Only a new debounced value should write; urlSearch is read, not a trigger
  }, [debouncedSearch]);

  // 4. URL changed from outside (back button, shared link): reflect it in the search box
  useEffect(() => {
    if (urlSearch !== lastWrittenSearchRef.current) {
      lastWrittenSearchRef.current = urlSearch;
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  const cleanSearch = sanitizeSearch(urlSearch);
  const isSearching = cleanSearch.length >= MIN_SEARCH_LENGTH;
  const showDishes = isSearching || !!selectedCategoryId;

  // 5. Paginated dishes: search spans the whole menu, otherwise the selected category
  const menuQuery = useMemo<MenuQuery | null>(() => {
    if (!showDishes) return null;
    return {
      categoryId: isSearching ? null : selectedCategoryId,
      search: isSearching ? cleanSearch : '',
      vegOnly,
      sort,
    };
  }, [showDishes, isSearching, selectedCategoryId, cleanSearch, vegOnly, sort]);

  const { items: products, total, hasMore, loading, loadingMore, error, loadMore, retry } =
    useMenuProducts(menuQuery);

  // A new search / filter / sort replaces the list, so start reading it from the top
  const listKey = menuQuery ? JSON.stringify(menuQuery) : null;
  const previousListKeyRef = useRef(listKey);
  useEffect(() => {
    if (previousListKeyRef.current === listKey) return;
    previousListKeyRef.current = listKey;
    if (listKey && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [listKey]);

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(
    loadMore,
    showDishes && hasMore && !loading && !loadingMore && !error
  );

  const prefetchCategory = (catId: string) =>
    prefetchMenuProducts({ categoryId: catId, search: '', vegOnly, sort });

  // Helper to open a category
  const handleSelectCategory = (catId: string) => {
    lastWrittenSearchRef.current = '';
    setSearchInput('');
    updateParams({ category: catId, q: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to return to Food Categories list
  const handleBackToCategories = () => {
    lastWrittenSearchRef.current = '';
    setSearchInput('');
    updateParams({ category: null, q: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    lastWrittenSearchRef.current = '';
    setSearchInput('');
    updateParams({ q: null }, { replace: true });
    searchInputRef.current?.focus();
  };

  // Currently selected category object
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const listTitle = isSearching
    ? `Results for “${cleanSearch}”`
    : activeCategory?.name || 'Dishes';
  const dishCount = total ?? products.length;

  return (
    <div className="pb-24 -mt-6 space-y-5">
      {/* =====================================================================
          STICKY TOOLBAR: search, veg filter, sort and category switcher
          ===================================================================== */}
      <div className="sticky top-18 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-stone-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for biryani, kebab, noodles…"
            aria-label="Search dishes"
            maxLength={60}
            className="w-full h-11 pl-10 pr-10 rounded-2xl bg-stone-100/80 border border-transparent focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 outline-none text-sm font-medium text-stone-900 placeholder:text-stone-400 transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showDishes && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {/* Veg only toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={vegOnly}
              onClick={() => updateParams({ veg: vegOnly ? null : '1' }, { replace: true })}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                vegOnly
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-emerald-300'
              }`}
            >
              <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-[2px] flex items-center justify-center bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              Veg only
              {vegOnly && <X className="w-3 h-3" />}
            </button>

            {/* Sort */}
            <label
              className={`shrink-0 relative flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                sort !== 'recommended'
                  ? 'bg-orange-50 border-orange-400 text-orange-700'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-orange-300'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="sr-only">Sort dishes</span>
              <select
                value={sort}
                onChange={(e) =>
                  updateParams(
                    { sort: e.target.value === 'recommended' ? null : e.target.value },
                    { replace: true }
                  )
                }
                className="bg-transparent outline-none appearance-none pr-1 cursor-pointer font-bold"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Quick category switcher (category view only) */}
            {!isSearching && categories.length > 0 && (
              <>
                <span className="shrink-0 w-px h-5 bg-stone-200 mx-1" aria-hidden="true" />
                {categories.map((cat) => {
                  const isActive = cat.id === selectedCategoryId;
                  return (
                    <button
                      key={`pill-${cat.id}`}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      onPointerEnter={() => prefetchCategory(cat.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {!showDishes ? (
        /* =========================================================================
           VIEW 1: FOOD CATEGORIES
           ========================================================================= */
        <section className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
                What would you like to eat?
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                Pick a category or search for a dish
              </p>
            </div>
            {categories.length > 0 && (
              <span className="hidden sm:inline px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                {categories.length} Categories
              </span>
            )}
          </div>

          {/* Categories Grid */}
          {loadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4.5 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col items-center animate-pulse space-y-3"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-stone-100" />
                  <div className="w-20 h-4 rounded-md bg-stone-100" />
                  <div className="w-14 h-3 rounded-full bg-stone-100" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-display font-bold text-stone-800 text-base">
                No categories available
              </h3>
              <p className="text-xs text-stone-500">
                Please check back soon for our delicious menu offerings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4.5 pt-1">
              {categories.map((category, index) => {
                const count = categoryProductCounts[category.id] || 0;
                const imgSrc = category.image_url || getCategoryFallbackImage(category.name);
                // The first row is above the fold on every screen size: load it eagerly
                const aboveFold = index < 5;

                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    onPointerEnter={() => prefetchCategory(category.id)}
                    onTouchStart={() => prefetchCategory(category.id)}
                    onFocus={() => prefetchCategory(category.id)}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:border-orange-500 hover:shadow-md transition-all p-3 sm:p-4 text-center cursor-pointer group flex flex-col items-center justify-between"
                  >
                    {/* Category Image Box */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-orange-50/50 mb-2.5 flex items-center justify-center relative">
                      <img
                        src={sizedImageUrl(imgSrc, 112)}
                        srcSet={imageSrcSet(imgSrc, 112)}
                        alt={category.name}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={aboveFold ? 'eager' : 'lazy'}
                        fetchPriority={index < 2 ? 'high' : undefined}
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const fallback = getCategoryFallbackImage(category.name);
                          if (img.src !== fallback) {
                            img.srcset = '';
                            img.src = fallback;
                          }
                        }}
                      />
                    </div>

                    {/* Category Title & Count */}
                    <div className="w-full">
                      <h2 className="font-display font-bold text-stone-900 text-sm sm:text-base group-hover:text-orange-600 transition-colors line-clamp-1">
                        {category.name}
                      </h2>
                      <div className="mt-1.5 flex items-center justify-center gap-1">
                        <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                          {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Explore'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* =========================================================================
           VIEW 2: DISHES (selected category or search results), paginated
           ========================================================================= */
        <section className="space-y-4" aria-busy={loading}>
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={isSearching ? clearSearch : handleBackToCategories}
                aria-label={isSearching ? 'Clear search' : 'Back to all categories'}
                className="shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <h1 className="font-display font-extrabold text-lg sm:text-xl text-stone-900 truncate">
                {listTitle}
              </h1>
            </div>
            {!loading && !error && (
              <span className="shrink-0 px-3 py-1 rounded-full text-xs font-extrabold bg-orange-500 text-white shadow-2xs">
                {dishCount} {dishCount === 1 ? 'dish' : 'dishes'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error && products.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-display font-bold text-stone-900 text-base">{error}</h3>
              <button
                onClick={retry}
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
              <SearchX className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-display font-bold text-stone-900 text-base">
                {isSearching
                  ? `No dishes match “${cleanSearch}”${vegOnly ? ' in veg' : ''}`
                  : vegOnly
                    ? `No veg dishes in ${activeCategory?.name || 'this category'}`
                    : `No items currently found in ${activeCategory?.name || 'this category'}`}
              </h3>
              <p className="text-stone-500 text-xs">
                {isSearching ? 'Try a different spelling or a shorter word.' : 'Please check another category from the menu.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {vegOnly && (
                  <button
                    onClick={() => updateParams({ veg: null }, { replace: true })}
                    className="px-4 py-2 rounded-xl border border-stone-200 hover:border-orange-300 text-stone-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    Show all dishes
                  </button>
                )}
                <button
                  onClick={isSearching ? clearSearch : handleBackToCategories}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {isSearching ? 'Clear search' : 'Back to All Categories'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} showCategory={isSearching} />
                ))}
                {loadingMore &&
                  Array.from({ length: Math.min(4, MENU_PAGE_SIZE) }, (_, i) => (
                    <ProductCardSkeleton key={`more-${i}`} />
                  ))}
              </div>

              {/* Infinite scroll: next page starts loading ~800px before the end */}
              <div ref={sentinelRef} aria-hidden="true" />

              {error ? (
                <div className="flex justify-center">
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 hover:border-orange-300 text-stone-700 font-bold text-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {error} Retry
                  </button>
                </div>
              ) : hasMore ? (
                <div className="flex justify-center">
                  {/* Fallback for browsers without IntersectionObserver / keyboard users */}
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50/50 text-stone-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {loadingMore ? 'Loading more dishes…' : 'Show more dishes'}
                  </button>
                </div>
              ) : (
                products.length > MENU_PAGE_SIZE && (
                  <p className="text-center text-xs font-medium text-stone-400">
                    You've seen all {dishCount} dishes
                  </p>
                )
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};
