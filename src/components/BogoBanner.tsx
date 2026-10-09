import React, { useEffect, useState } from 'react';
import { Gift, Minus, Plus, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { getProductAvailability } from '../utils/productAvailability';
import { FALLBACK_FOOD_IMAGE, sizedImageUrl } from '../utils/image';
import { shortOpening } from '../utils/storeHours';
import { BOGO_END, BOGO_ITEMS, useBogoLive } from '../promo/bogo';

// Home page banner for the Buy 1 Get 1 offer: the four dishes with their photo,
// price and an Add button. Hidden on its own once the offer ends.

let productsCache: Product[] | null = null;

const endsText = (): string => {
  const left = BOGO_END - Date.now();
  if (left <= 24 * 60 * 60 * 1000) {
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    return `Ends tonight 11:59 PM · ${h > 0 ? `${h}h ` : ''}${m}m left`;
  }
  return 'Till 10 Oct, 11:59 PM';
};

const OfferTile: React.FC<{ label: string; product: Product }> = ({ label, product }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const { storeStatus } = useSettings();
  const cartItem = items.find((i) => i.product.id === product.id);
  const available = getProductAvailability(product).isAvailable;
  const img = product.image_url || FALLBACK_FOOD_IMAGE;

  return (
    <div className="snap-start shrink-0 w-40 sm:w-auto bg-white rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-4/3 bg-stone-100">
        <img
          src={sizedImageUrl(img, 320)}
          alt={label}
          width={320}
          height={240}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_FOOD_IMAGE) e.currentTarget.src = FALLBACK_FOOD_IMAGE;
          }}
        />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow">
          1 + 1 FREE
        </span>
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <p className="font-bold text-stone-900 text-xs sm:text-sm leading-tight">{label}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            <span className="font-bold text-stone-900">₹{product.price}</span> · 2 plates
          </p>
        </div>
        {!storeStatus.isOpen ? (
          <span className="flex items-center justify-center gap-1 h-8 rounded-xl bg-stone-100 text-stone-500 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            {storeStatus.nextOpenAt ? `Opens ${shortOpening(storeStatus.nextOpenAt)}` : 'Closed'}
          </span>
        ) : !available ? (
          <span className="flex items-center justify-center h-8 rounded-xl bg-stone-100 text-stone-500 text-[11px] font-semibold">
            Unavailable
          </span>
        ) : cartItem ? (
          <div className="flex items-center justify-between h-8 rounded-xl bg-orange-50 border border-orange-200 px-1">
            <button
              onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
              aria-label={`Remove one ${label}`}
              className="w-6 h-6 rounded-lg bg-white text-orange-900 flex items-center justify-center shadow-xs cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-bold text-orange-950">{cartItem.quantity}</span>
            <button
              onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
              aria-label={`Add one more ${label}`}
              className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => addToCart(product, 1)}
            className="flex items-center justify-center gap-1 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD
          </button>
        )}
      </div>
    </div>
  );
};

export const BogoBanner: React.FC = () => {
  const live = useBogoLive();
  const [products, setProducts] = useState<Product[]>(productsCache || []);
  const [, setMinute] = useState(0);

  useEffect(() => {
    if (!live || productsCache) return;
    let cancelled = false;
    supabase
      .from('products')
      .select('*')
      .in('name', BOGO_ITEMS.map((i) => i.productName))
      .eq('type', 'food')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        productsCache = data as Product[];
        setProducts(productsCache);
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  // Keep the "time left" fresh
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => window.clearInterval(t);
  }, [live]);

  if (!live) return null;

  const tiles = BOGO_ITEMS.map((i) => ({
    label: i.label,
    product: products.find((p) => p.name.trim().toLowerCase() === i.productName.toLowerCase()),
  })).filter((t): t is { label: string; product: Product } => !!t.product);

  return (
    <section
      aria-label="Buy 1 Get 1 Free offer"
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-red-950 p-4 sm:p-6 text-white shadow-lg"
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-[10px] font-extrabold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5" />
            Dhamaka Offer
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight mt-2">
            Buy 1 <span className="text-amber-400">Get 1 FREE!</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Order 1, get 2 plates. Pay for one only.
          </p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 text-[11px] sm:text-xs font-extrabold">
          <Clock className="w-3.5 h-3.5" />
          {endsText()}
        </span>
      </div>

      {tiles.length > 0 && (
        <div className="relative flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {tiles.map((t) => (
            <OfferTile key={t.product.id} label={t.label} product={t.product} />
          ))}
        </div>
      )}
    </section>
  );
};
