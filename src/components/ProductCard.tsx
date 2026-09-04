import React from 'react';
import { Product } from '../types/database';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Clock, Flame, Star } from 'lucide-react';

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
    <div className="flex gap-4 py-5 border-b border-stone-100">
      {/* Left: Details */}
      <div className="flex-1 min-w-0">
        {/* Veg Indicator */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-4 h-4 border-2 border-emerald-600 flex items-center justify-center rounded-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </span>
          {product.is_available && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
              4.2
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug truncate">
          {product.name}
        </h3>

        {/* Price */}
        <div className="font-semibold text-stone-800 text-sm mt-0.5">
          ₹{product.price}
          {product.unit && <span className="text-stone-400 font-normal text-xs ml-1">· {product.unit}</span>}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-stone-400 text-xs mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Meta specs */}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400">
          {product.prep_time_minutes ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {product.prep_time_minutes} min
            </span>
          ) : null}
          {product.calories ? (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {product.calories} kcal
            </span>
          ) : null}
          {product.weight_grams ? (
            <span>{product.weight_grams}g</span>
          ) : null}
        </div>

        {/* Add to Cart Button */}
        <div className="mt-3">
          {!product.is_available ? (
            <span className="text-xs text-rose-500 font-semibold">Out of Stock</span>
          ) : cartItem ? (
            <div className="inline-flex items-center bg-white border-2 border-emerald-500 rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 text-sm font-bold text-emerald-700">
                {cartItem.quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="px-5 py-1.5 rounded-lg bg-white border-2 border-emerald-500 text-emerald-600 text-sm font-bold uppercase tracking-wide hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
            >
              Add +
            </button>
          )}
        </div>
      </div>

      {/* Right: Image */}
      <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-stone-100 relative">
        <img
          src={product.image_url || fallbackImage}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
        {!product.is_available && (
          <div className="absolute inset-0 bg-stone-950/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">Unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
};
