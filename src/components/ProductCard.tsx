import React from 'react';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Clock, Flame } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find((item) => item.product.id === product.id);

  const fallbackImage =
    product.type === 'food'
      ? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=60'
      : 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&auto=format&fit=crop&q=60';

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Product Image Banner */}
      <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
        <img
          src={product.image_url || fallbackImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />

        {/* Pure Veg Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-xs flex items-center justify-center">
          <span className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center p-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          </span>
        </div>

        {/* Type / Unit Pill */}
        {product.unit && (
          <div className="absolute top-3 right-3 bg-stone-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            {product.unit}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-xs">
            Currently Unavailable
          </div>
        )}
      </div>

      {/* Product Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
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

          {/* Meta specs (calories, prep time, weight) */}
          <div className="flex items-center gap-2.5 mt-2.5 text-[11px] text-stone-500 flex-wrap">
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
        <div className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs text-stone-400">Price</span>
            <div className="font-display font-bold text-base sm:text-lg text-stone-900">
              ₹{product.price}
            </div>
          </div>

          <div>
            {!product.is_available ? (
              <span className="text-xs text-stone-400 font-medium">Out of Stock</span>
            ) : cartItem ? (
              <div className="flex items-center bg-amber-50 rounded-2xl border border-amber-200 px-1 py-0.5">
                <button
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-amber-100 text-amber-900 flex items-center justify-center transition-colors shadow-xs"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-3 text-xs font-bold text-amber-950">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="w-7 h-7 rounded-xl bg-white hover:bg-amber-100 text-amber-900 flex items-center justify-center transition-colors shadow-xs"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(product)}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
