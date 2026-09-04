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

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-10 shadow-md">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-[11px] font-bold text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            100% Pure Vegetarian Kitchen & Farm Direct
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Authentic Pure Veg Dishes & Farm-Fresh Vegetables
          </h1>

          <p className="text-amber-100 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
            Cooked with unadulterated cold-pressed oils, organic spices, and vegetables harvested fresh this morning.
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs font-semibold text-amber-200">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-300" /> Fast Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-300" /> Zero Preservatives
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
            <span>Pure Veg Food</span>
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
                ? 'Search paneer butter masala, dal tadka, rotis, biryani...'
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
            Try searching for another dish or clear your filter to view our full pure veg menu.
          </p>
          {(debouncedQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedQuery('');
                setSelectedCategory('all');
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
