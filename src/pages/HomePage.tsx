import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product, Category, ProductType } from '../types/database';
import { ProductCard } from '../components/ProductCard';
import {
  Utensils,
  Carrot,
  Search,
  X,
  Loader2,
  MapPin,
  ChevronRight,
  Star,
  Timer,
  Leaf,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ProductType = (searchParams.get('tab') as ProductType) || 'food';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Debounced search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleTabChange = (tab: ProductType) => {
    setSearchParams({ tab });
    setSelectedCategory('all');
    setSearchInput('');
    setDebouncedQuery('');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch categories for this tab
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('type', activeTab)
          .order('sort_order', { ascending: true });

        setCategories(catData || []);

        // Fetch products for this tab
        let query = supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('type', activeTab);

        if (debouncedQuery) {
          query = query.ilike('name', `%${debouncedQuery}%`);
        }

        const { data: prodData, error } = await query;
        if (!error && prodData) {
          setProducts(prodData);
        } else {
          // If table is empty or error, use fallback sample pure veg catalog
          setProducts(getFallbackProducts(activeTab, debouncedQuery));
        }
      } catch (e) {
        console.warn('Error querying Supabase:', e);
        setProducts(getFallbackProducts(activeTab, debouncedQuery));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, debouncedQuery]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  // Category carousel icons
  const categoryIcons: Record<string, string> = {
    all: '🍽️',
  };

  return (
    <div className="pb-8">
      {/* Location Bar */}
      <div className="flex items-center gap-2 py-3 px-1">
        <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-stone-900 truncate">Hotel Atithi</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          </div>
          <p className="text-xs text-stone-400 truncate">Pure Veg Kitchen & Farm Fresh Vegetables</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={
            activeTab === 'food'
              ? 'Search for dishes...'
              : 'Search for vegetables...'
          }
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-stone-100 text-sm font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:bg-white transition-all"
        />
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              setDebouncedQuery('');
            }}
            className="absolute right-3 top-2.5 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Food / Vegetable Tab Switcher */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => handleTabChange('food')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'food'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Food Menu</span>
        </button>
        <button
          onClick={() => handleTabChange('vegetable')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'vegetable'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          }`}
        >
          <Carrot className="w-4 h-4" />
          <span>Fresh Veggies</span>
        </button>
      </div>

      {/* Category Carousel */}
      {categories.length > 0 && !debouncedQuery && (
        <div className="mb-2">
          <h2 className="font-bold text-sm text-stone-800 mb-3 px-1">What's on your mind?</h2>
          <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                  selectedCategory === 'all'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-stone-100 bg-stone-50'
                }`}
              >
                🍽️
              </div>
              <span className="text-[11px] font-medium text-stone-600">All</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                    selectedCategory === cat.id
                      ? activeTab === 'food'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-emerald-500 bg-emerald-50'
                      : 'border-stone-100 bg-stone-50'
                  }`}
                >
                  {cat.icon || (activeTab === 'food' ? '🍛' : '🥬')}
                </div>
                <span className="text-[11px] font-medium text-stone-600 text-center max-w-[64px] truncate">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!debouncedQuery && (
        <div className="flex items-center gap-4 my-4 px-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Timer className="w-4 h-4 text-orange-500" />
            <span className="font-medium">30-45 min</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
            <span className="font-medium">4.2 Rated</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">100% Veg</span>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <h2 className="font-bold text-base text-stone-900">
          {debouncedQuery
            ? `Results for "${debouncedQuery}"`
            : selectedCategory !== 'all'
            ? categories.find((c) => c.id === selectedCategory)?.name || 'Menu'
            : activeTab === 'food'
            ? 'Pure Veg Menu'
            : 'Fresh Farm Vegetables'}
        </h2>
        <span className="text-xs text-stone-400 font-medium">
          {filteredProducts.length} items
        </span>
      </div>

      {/* Catalog Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-xs font-semibold">Loading...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-stone-900 text-sm">
            No items found {debouncedQuery && `for "${debouncedQuery}"`}
          </h3>
          <p className="text-stone-400 text-xs">
            Try a different search or clear filters to see the full menu.
          </p>
          {(debouncedQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
                setSelectedCategory('all');
              }}
              className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all"
            >
              View Full Menu
            </button>
          )}
        </div>
      ) : (
        <div className="px-1">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

// Comprehensive pure veg fallback catalog if Supabase table is freshly instantiated
function getFallbackProducts(type: ProductType, search: string): Product[] {
  const foodItems: Product[] = [
    {
      id: 'f1',
      name: 'Paneer Butter Masala',
      description: 'Cottage cheese cubes tossed in rich velvety tomato, cashew & butter gravy with aromatic spices.',
      price: 240,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=60',
      calories: 420,
      prep_time_minutes: 20,
      unit: '350ml',
      is_veg: true,
    },
    {
      id: 'f2',
      name: 'Dal Tadka Special',
      description: 'Yellow lentils slow-simmered with garlic, cumin, red chillies and pure desi ghee tempering.',
      price: 180,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=60',
      calories: 280,
      prep_time_minutes: 15,
      unit: '300ml',
      is_veg: true,
    },
    {
      id: 'f3',
      name: 'Veg Dum Biryani with Raita',
      description: 'Fragrant basmati rice layered with seasonal garden vegetables, mint, saffron, served with cooling boondi raita.',
      price: 220,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60',
      calories: 480,
      prep_time_minutes: 25,
      unit: '500g',
      is_veg: true,
    },
    {
      id: 'f4',
      name: 'Butter Naan (2 pcs)',
      description: 'Tandoor baked soft flatbread glazed with melted salted Amul butter.',
      price: 70,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=60',
      calories: 260,
      prep_time_minutes: 10,
      unit: '2 pcs',
      is_veg: true,
    },
    {
      id: 'f5',
      name: 'Kaju Masala Gravy',
      description: 'Roasted cashew nuts simmered in an indulgent Mughlai style onion-tomato brown gravy.',
      price: 270,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=60',
      calories: 510,
      prep_time_minutes: 20,
      unit: '350ml',
      is_veg: true,
    },
    {
      id: 'f6',
      name: 'Jeera Rice Pure Ghee',
      description: 'Aromatic long-grain basmati cooked with cracked roasted cumin and fresh coriander.',
      price: 140,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=60',
      calories: 310,
      prep_time_minutes: 12,
      unit: '350g',
      is_veg: true,
    },
  ];

  const vegItems: Product[] = [
    {
      id: 'v1',
      name: 'Farm Fresh Tomatoes (Desi)',
      description: 'Juicy, naturally ripened desi tomatoes bursting with tanginess and lycopene.',
      price: 40,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=60',
      unit: '1 kg',
      weight_grams: 1000,
    },
    {
      id: 'v2',
      name: 'Fresh Spinach / Palak Bunch',
      description: 'Crisp green leaves freshly cut at sunrise from local polyhouses.',
      price: 30,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=60',
      unit: '1 bunch (~250g)',
      weight_grams: 250,
    },
    {
      id: 'v3',
      name: 'Red Onions (Nashik Quality)',
      description: 'Firm, dry-skinned, sweet and pungent Nashik grade onions.',
      price: 35,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=60',
      unit: '1 kg',
      weight_grams: 1000,
    },
    {
      id: 'v4',
      name: 'New Crop Potatoes (Aloo)',
      description: 'Clean, thin-skinned hill potatoes ideal for dry fries and gravies.',
      price: 32,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=60',
      unit: '1 kg',
      weight_grams: 1000,
    },
    {
      id: 'v5',
      name: 'Green Capsicum / Shimla Mirch',
      description: 'Crunchy bell peppers packed with Vitamin C and aroma.',
      price: 45,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=60',
      unit: '500g',
      weight_grams: 500,
    },
    {
      id: 'v6',
      name: 'Spicy Green Chillies (Lavangi)',
      description: 'Fresh sharp green chillies delivering authentic Indian heat.',
      price: 20,
      type: 'vegetable',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=60',
      unit: '100g',
      weight_grams: 100,
    },
  ];

  const list = type === 'food' ? foodItems : vegItems;
  if (!search) return list;
  return list.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );
}
