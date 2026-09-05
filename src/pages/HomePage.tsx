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
  Sparkles,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ProductType = (searchParams.get('tab') as ProductType) || 'food';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
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
    setVegFilter('all');
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
          // If table is empty or error, use fallback catalog
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
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }
      // Veg/Non-Veg filter (applied strictly on food tab)
      if (activeTab === 'food') {
        if (vegFilter === 'veg' && p.is_veg !== true) {
          return false;
        }
        if (vegFilter === 'non-veg' && p.is_veg === true) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedCategory, activeTab, vegFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-10 shadow-md">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-[11px] font-bold text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Fresh, Delicious & Delivered Fast
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Delicious Food & Farm-Fresh Produce, Delivered Fast
          </h1>

          <p className="text-amber-100 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Enjoy authentic pure-veg & rich non-veg culinary specialties prepared fresh daily, alongside crisp farm-direct vegetables.
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs font-semibold text-amber-200">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-300" /> Fast Doorstep Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-300" /> Pure Veg & Non-Veg Available
            </span>
          </div>
        </div>

        {/* Decorative graphic glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </section>

      {/* Main Tabs (Food Menu vs Fresh Vegetables) */}
      <div className="flex items-center justify-center">
        <div className="bg-stone-200/80 p-1 rounded-2xl flex items-center gap-1 max-w-md w-full shadow-inner">
          <button
            onClick={() => handleTabChange('food')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'food'
                ? 'bg-white text-stone-900 shadow-xs scale-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Utensils className={`w-4 h-4 ${activeTab === 'food' ? 'text-amber-600' : 'text-stone-400'}`} />
            <span>Food Menu</span>
          </button>

          <button
            onClick={() => handleTabChange('vegetable')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'vegetable'
                ? 'bg-white text-stone-900 shadow-xs scale-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Carrot className={`w-4 h-4 ${activeTab === 'vegetable' ? 'text-emerald-600' : 'text-stone-400'}`} />
            <span>Fresh Vegetables</span>
          </button>
        </div>
      </div>

      {/* Debounced Search Bar */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              activeTab === 'food'
                ? 'Search biryani, paneer butter masala, chicken tikka, rotis...'
                : 'Search farm tomatoes, palak, potatoes, onions, chillies...'
            }
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-stone-200 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
              }}
              className="absolute right-3.5 top-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Diet Filter Chips: "All" | "🟢 Veg Only" | "🔴 Non-Veg Only" (Food Menu tab only) */}
      {activeTab === 'food' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            id="diet-filter-all"
            type="button"
            onClick={() => setVegFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              vegFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            All
          </button>

          <button
            id="diet-filter-veg"
            type="button"
            onClick={() => setVegFilter('veg')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              vegFilter === 'veg'
                ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600 shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span className="w-3.5 h-3.5 border border-emerald-600 rounded-[2px] flex items-center justify-center bg-white p-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </span>
            <span>🟢 Veg Only</span>
          </button>

          <button
            id="diet-filter-non-veg"
            type="button"
            onClick={() => setVegFilter('non-veg')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              vegFilter === 'non-veg'
                ? 'bg-rose-50 text-rose-900 border-2 border-rose-700 shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span className="w-3.5 h-3.5 border border-rose-700 rounded-[2px] flex items-center justify-center bg-white p-0.5">
              <svg viewBox="0 0 10 10" className="w-2 h-2 fill-rose-700">
                <polygon points="5,1 9,9 1,9" />
              </svg>
            </span>
            <span>🔴 Non-Veg Only</span>
          </button>
        </div>
      )}

      {/* Categories Horizontal Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-xs border-amber-600'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Catalog Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-xs font-semibold">Fetching freshest items...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-base">
            No items found {debouncedQuery && `for "${debouncedQuery}"`}
          </h3>
          <p className="text-stone-500 text-xs">
            Try searching for another dish or clear your dietary and category filters to view our full menu.
          </p>
          {(debouncedQuery || selectedCategory !== 'all' || vegFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
                setSelectedCategory('all');
                setVegFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all"
            >
              View Full Menu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

// Comprehensive fallback catalog with Pure Veg & Non-Veg options
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
      name: 'Chicken Dum Biryani Special',
      description: 'Slow-cooked fragrant basmati rice layered with spiced tender chicken, saffron, mint and served with raita.',
      price: 280,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60',
      calories: 550,
      prep_time_minutes: 25,
      unit: '500g',
      is_veg: false,
    },
    {
      id: 'f3',
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
      id: 'f4',
      name: 'Butter Chicken (Boneless)',
      description: 'Charcoal-grilled tender chicken chunks simmered in a silky tomato, cream & butter makhani gravy.',
      price: 320,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=60',
      calories: 520,
      prep_time_minutes: 22,
      unit: '350ml',
      is_veg: false,
    },
    {
      id: 'f5',
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
      id: 'f6',
      name: 'Mutton Rogan Josh',
      description: 'Tender mutton cuts slow-braised in authentic Kashmiri spices, dried ginger and rich caramelized onion gravy.',
      price: 390,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1545247181-516773cae754?w=600&auto=format&fit=crop&q=60',
      calories: 580,
      prep_time_minutes: 30,
      unit: '350ml',
      is_veg: false,
    },
    {
      id: 'f7',
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
      id: 'f8',
      name: 'Chicken Tikka Kebab (6 pcs)',
      description: 'Succulent boneless chicken pieces marinated in yogurt and tandoori spices, char-grilled to perfection.',
      price: 260,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=60',
      calories: 340,
      prep_time_minutes: 18,
      unit: '6 pcs',
      is_veg: false,
    },
    {
      id: 'f9',
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
      id: 'f10',
      name: 'Egg Curry Special (2 Eggs)',
      description: 'Country boiled eggs pan-seared golden and simmered in a homestyle spiced onion-tomato curry.',
      price: 160,
      type: 'food',
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=60',
      calories: 310,
      prep_time_minutes: 15,
      unit: '300ml',
      is_veg: false,
    },
    {
      id: 'f11',
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
