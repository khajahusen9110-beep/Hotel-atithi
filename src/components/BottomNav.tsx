import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Star, ShoppingCart, ReceiptText, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const { user } = useAuth();

  const isHomeActive = location.pathname === '/';

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200/90 px-3 py-2">
      <div className="flex items-center justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isHomeActive ? 'text-orange-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>

        <Link
          to="/reviews"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive('/reviews') ? 'text-orange-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px]">Reviews</span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive('/cart') ? 'text-orange-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[18px] text-center rounded-full bg-orange-600 text-white text-[9px] font-black shadow-xs">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Cart</span>
        </Link>

        <Link
          to="/orders"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive('/orders') ? 'text-orange-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </Link>

        <Link
          to={user ? '/profile' : '/auth'}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive('/profile') || isActive('/auth')
              ? 'text-orange-600 font-bold'
              : 'text-stone-500 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Account</span>
        </Link>
      </div>
    </nav>
  );
};
