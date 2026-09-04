import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const StickyCartBar: React.FC = () => {
  const { itemCount, subtotal } = useCart();
  const location = useLocation();

  if (itemCount === 0 || location.pathname === '/cart' || location.pathname === '/checkout') {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-6 left-4 right-4 z-40 max-w-md mx-auto">
      <Link
        to="/cart"
        className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-600/25 transition-all transform active:scale-98"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
            </div>
            <div className="text-[11px] text-amber-100 font-medium">
              Subtotal: ₹{subtotal}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span>View Cart</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
};
