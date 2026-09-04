import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, Carrot, ShoppingBag, Clock, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const { user } = useAuth();

  const isActive = (path: string, search?: string) => {
    if (search) {
      return location.pathname === path && location.search.includes(search);
    }
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200/90 px-3 py-2">
      <div className="flex items-center justify-around">
        <Link
          to="/?tab=food"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/', 'tab=food') || (location.pathname === '/' && !location.search.includes('tab='))
              ? 'text-amber-600 font-bold'
              : 'text-stone-500 font-medium'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span className="text-[10px]">Food</span>
        </Link>

        <Link
          to="/?tab=vegetable"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/', 'tab=vegetable')
              ? 'text-emerald-600 font-bold'
              : 'text-stone-500 font-medium'
          }`}
        >
          <Carrot className="w-5 h-5" />
          <span className="text-[10px]">Veggies</span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/cart') ? 'text-amber-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-extrabold">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Cart</span>
        </Link>

        <Link
          to="/orders"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/orders') ? 'text-amber-600 font-bold' : 'text-stone-500 font-medium'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </Link>

        <Link
          to={user ? '/profile' : '/auth'}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/profile') || isActive('/auth')
              ? 'text-amber-600 font-bold'
              : 'text-stone-500 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{user ? 'Profile' : 'Sign In'}</span>
        </Link>
      </div>
    </nav>
  );
};
