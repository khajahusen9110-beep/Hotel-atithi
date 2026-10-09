import React from 'react';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Clock, Flame, AlertCircle } from 'lucide-react';
import { getProductAvailability } from '../utils/productAvailability';
import { FALLBACK_FOOD_IMAGE, responsiveSrcSet, sizedImageUrl } from '../utils/image';
import { useSettings } from '../context/SettingsContext';
import { shortOpening } from '../utils/storeHours';
import { isBogoProduct, useBogoLive } from '../promo/bogo';

interface ProductCardProps {
  product: Product;
  /** Show the dish's category (used in search results that span categories) */
  showCategory?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showCategory = false }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find((item) => item.product.id === product.id);
  const availability = getProductAvailability(product);
  // Outside the hotel's timings every dish is unavailable, whatever its own serving window
  const { storeStatus } = useSettings();
  const storeClosed = !storeStatus.isOpen;
  // Buy 1 Get 1 offer tag (display only, ends on its own)
  const bogoLive = useBogoLive();
  const bogo = bogoLive && isBogoProduct(product.name);

  const fallbackImage =
    product.type === 'food'
      ? FALLBACK_FOOD_IMAGE
      : 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&auto=format&fit=crop&q=60';
  const imageUrl = product.image_url || fallbackImage;

  return (
    // Mobile: compact row (details left, photo right) like the big delivery apps.
    // sm and up: classic card with the photo on top.
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-row-reverse sm:flex-col overflow-hidden group">
      {/* Product Image */}
      <div className="relative shrink-0 w-28 h-28 m-3 ml-0 rounded-2xl sm:m-0 sm:w-auto sm:h-auto sm:rounded-none sm:aspect-4/3 overflow-hidden bg-stone-100">
        <img
          src={sizedImageUrl(imageUrl, 400)}
          srcSet={responsiveSrcSet(imageUrl, [224, 400, 640, 800])}
          sizes="(min-width: 640px) 400px, 112px"
          alt={product.name}
          width={400}
          height={300}
          decoding="async"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            availability.isAvailable ? 'group-hover:scale-105' : 'grayscale-30 brightness-90'
          }`}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== fallbackImage) {
              img.srcset = '';
              img.src = fallbackImage;
            }
          }}
        />

        {/* FSSAI Standard Food Indicator (Food Menu items only) */}
        {product.type === 'food' && (
          <div
            id={`food-badge-${product.id}`}
            className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-xs flex items-center justify-center"
            title={product.is_veg !== false ? 'Pure Vegetarian' : 'Non-Vegetarian'}
            aria-label={product.is_veg !== false ? 'Pure Vegetarian' : 'Non-Vegetarian'}
          >
            {product.is_veg !== false ? (
              // Veg: Green square with green circle
              <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-[2px] flex items-center justify-center bg-white p-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
            ) : (
              // Non-Veg: Red/Brown square with filled triangle
              <span className="w-3.5 h-3.5 border-2 border-rose-700 rounded-[2px] flex items-center justify-center bg-white p-0.5">
                <svg viewBox="0 0 10 10" className="w-2 h-2 fill-rose-700">
                  <polygon points="5,1 9,9 1,9" />
                </svg>
              </span>
            )}
          </div>
        )}

        {/* Type / Unit Pill */}
        {product.unit && (
          <div className="hidden sm:block absolute top-3 right-3 bg-stone-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            {product.unit}
          </div>
        )}

        {bogo && (
          <div className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-center text-[10px] sm:text-xs font-extrabold tracking-wide py-1">
            BUY 1 GET 1 FREE
          </div>
        )}

        {/* Serving Hours or Availability Overlay */}
        {!availability.isAvailable && (
          <div className="absolute inset-0 bg-stone-950/65 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 text-white">
            <Clock className="w-5 h-5 text-amber-300 mb-1 animate-pulse" />
            <span className="font-bold text-[11px] sm:text-sm leading-tight">
              {availability.servingWindowText ? 'Outside Serving Hours' : 'Currently Unavailable'}
            </span>
            {availability.servingWindowText && (
              <span className="hidden sm:inline text-[11px] text-amber-200 font-medium mt-0.5">
                Available: {availability.servingWindowText}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Product Body */}
      <div className="p-3 sm:p-4 flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {showCategory && product.category?.name && (
            <span className="block text-[10px] font-bold uppercase tracking-wide text-orange-600 mb-0.5">
              {product.category.name}
            </span>
          )}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-amber-600 transition-colors">
              {product.name}
            </h3>
          </div>

          {product.description && (
            <p className="text-stone-500 text-xs mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Meta specs (calories, prep time, weight, and serving hours) */}
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-stone-500 flex-wrap">
            {availability.servingWindowText && (
              <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg font-medium text-[10px] border border-amber-200/60">
                <Clock className="w-3 h-3 text-amber-600" />
                {availability.servingWindowText}
              </span>
            )}

            {product.prep_time_minutes ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {product.prep_time_minutes}m prep
              </span>
            ) : null}

            {product.calories ? (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                {product.calories} kcal
              </span>
            ) : null}

            {product.weight_grams ? (
              <span className="text-stone-400 font-medium">
                Approx. {product.weight_grams}g
              </span>
            ) : null}
          </div>
        </div>

        {/* Price & Action Button */}
        <div className="pt-3 sm:pt-4 mt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <span className="hidden sm:block text-xs text-stone-400">Price</span>
            <div className="font-display font-bold text-base sm:text-lg text-stone-900">
              ₹{product.price}
            </div>
            {bogo && <p className="text-[10px] font-bold text-red-600 leading-tight">2 plates for ₹{product.price}</p>}
          </div>

          <div>
            {storeClosed ? (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-[11px] font-semibold border border-stone-200 cursor-not-allowed">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>Closed</span>
                </span>
                {storeStatus.nextOpenAt && (
                  <p className="text-[10px] text-stone-500 mt-0.5 font-medium">
                    Opens {shortOpening(storeStatus.nextOpenAt)}
                  </p>
                )}
              </div>
            ) : !availability.isAvailable ? (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-[11px] font-semibold border border-stone-200 cursor-not-allowed">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>Unavailable</span>
                </span>
                {availability.formattedFrom && (
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Starts {availability.formattedFrom}
                  </p>
                )}
              </div>
            ) : cartItem ? (
              <div className="flex items-center bg-orange-50 rounded-2xl border border-orange-200 px-1 py-0.5">
                <button
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-orange-100 text-orange-900 flex items-center justify-center transition-colors shadow-xs"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-3 text-xs font-bold text-orange-950">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-orange-100 text-orange-900 flex items-center justify-center transition-colors shadow-xs"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(product)}
                className="px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold uppercase tracking-wide transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export const ProductCardSkeleton: React.FC = () => (
  <div
    className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 overflow-hidden animate-pulse flex flex-row-reverse sm:flex-col"
    aria-hidden="true"
  >
    <div className="shrink-0 w-28 h-28 m-3 ml-0 rounded-2xl sm:m-0 sm:w-auto sm:h-auto sm:rounded-none sm:aspect-4/3 bg-stone-100" />
    <div className="flex-1 p-3 sm:p-4 space-y-2.5">
      <div className="h-4 w-3/4 rounded-md bg-stone-100" />
      <div className="h-3 w-full rounded-md bg-stone-100" />
      <div className="h-3 w-2/3 rounded-md bg-stone-100" />
      <div className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between">
        <div className="h-5 w-14 rounded-md bg-stone-100" />
        <div className="h-8 w-20 rounded-2xl bg-stone-100" />
      </div>
    </div>
  </div>
);
