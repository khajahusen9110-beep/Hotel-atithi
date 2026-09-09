import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types/database';
import { ProductCard } from '../components/ProductCard';
import {
  Loader2,
  ArrowLeft,
  UtensilsCrossed,
  ChevronRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Category State from Database
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>({});

  // Selected Category (null = show Food Categories overview; string = show Food Items in that category)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    searchParams.get('category') || null
  );

  // Products State for Selected Category
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productsCacheRef = useRef<Map<string, Product[]>>(new Map());

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

  // 1. Fetch Existing Food Categories from database
  useEffect(() => {
    let isCancelled = false;
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('type', 'food')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && !isCancelled) {
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

  // 2. Fetch Category Product Counts in background for item count badges
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

  // 3. Sync selectedCategoryId from URL param if changed
  useEffect(() => {
    const catFromUrl = searchParams.get('category');
    if (catFromUrl !== selectedCategoryId) {
      setSelectedCategoryId(catFromUrl || null);
    }
  }, [searchParams]);

  // 4. When customer selects a category: Fetch ONLY the food items belonging to that category
  useEffect(() => {
    let isCancelled = false;

    if (!selectedCategoryId) {
      setProducts([]);
      return;
    }

    // Instant cache hit for fast switching
    if (productsCacheRef.current.has(selectedCategoryId)) {
      setProducts(productsCacheRef.current.get(selectedCategoryId)!);
      setLoadingProducts(false);
      return;
    }

    const fetchCategoryProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('type', 'food')
          .eq('category_id', selectedCategoryId)
          .order('name', { ascending: true });

        if (isCancelled) return;

        if (!error && data) {
          setProducts(data);
          productsCacheRef.current.set(selectedCategoryId, data);
        } else {
          if (error) {
            console.error('Supabase error fetching products for category:', error);
          }
          setProducts([]);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error querying category products:', err);
          setProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingProducts(false);
        }
      }
    };

    fetchCategoryProducts();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategoryId]);

  // Helper to open a category
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setSearchParams({ category: catId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to return to Food Categories list
  const handleBackToCategories = () => {
    setSelectedCategoryId(null);
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Currently selected category object
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  return (
    <div className="pb-24 pt-2 space-y-6">
      {/* 
        =============================================================================
        NAVIGATION FLOW:
        HOTEL ATITHI (Header)
             ↓
        FOOD CATEGORIES (Categories Grid)
             ↓
        SELECT CATEGORY
             ↓
        FOOD ITEMS (Only dishes in selected category)
        =============================================================================
      */}

      {!selectedCategoryId ? (
        /* =========================================================================
           VIEW 1: FOOD CATEGORIES (SND Mart-Style Clean Card Layout)
           ========================================================================= */
        <section className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
                Food Categories
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                Select a category to view dishes
              </p>
            </div>
            {categories.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
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
              {categories.map((category) => {
                const count = categoryProductCounts[category.id] || 0;
                const imgSrc = category.image_url || getCategoryFallbackImage(category.name);

                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:border-orange-500 hover:shadow-md transition-all p-3 sm:p-4 text-center cursor-pointer group flex flex-col items-center justify-between"
                  >
                    {/* Category Image Box */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-orange-50/50 mb-2.5 flex items-center justify-center relative">
                      <img
                        src={imgSrc}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCategoryFallbackImage(category.name);
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
                          {count > 0 ? `${count} items` : 'Explore'}
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
           VIEW 2: SELECT CATEGORY → FOOD ITEMS (Dishes in Selected Category Only)
           ========================================================================= */
        <section className="space-y-4">
          {/* Top Bar: Back to Categories & Quick Category Switcher */}
          <div className="flex flex-col gap-3">
            {/* Back Button & Active Title */}
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <button
                onClick={handleBackToCategories}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Categories</span>
              </button>

              <div className="text-right">
                <span className="text-xs text-stone-500 font-medium">Category: </span>
                <span className="text-xs font-bold text-stone-900">
                  {activeCategory?.name || 'Dishes'}
                </span>
              </div>
            </div>

            {/* Quick Category Switcher Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isActive = cat.id === selectedCategoryId;
                const count = categoryProductCounts[cat.id] || 0;

                return (
                  <button
                    key={`pill-${cat.id}`}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs scale-102 ring-2 ring-orange-200'
                        : 'bg-white text-stone-700 border border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? 'bg-orange-600 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Header Card */}
          <div className="bg-orange-50/70 border border-orange-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <h2 className="font-display font-black text-xl text-stone-900">
                {activeCategory?.name || 'Dishes'}
              </h2>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                Showing food items belonging to this category
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-orange-500 text-white shadow-2xs shrink-0">
              {products.length} {products.length === 1 ? 'dish' : 'dishes'}
            </span>
          </div>

          {/* Food Items Grid for this category only */}
          {loadingProducts ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-xs font-semibold">Loading dishes...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-display font-bold text-stone-900 text-base">
                No items currently found in {activeCategory?.name || 'this category'}
              </h3>
              <p className="text-stone-500 text-xs">
                Please check another category from the menu.
              </p>
              <button
                onClick={handleBackToCategories}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Back to All Categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
