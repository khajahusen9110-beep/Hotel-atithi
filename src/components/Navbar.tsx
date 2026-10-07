import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg sm:text-xl text-stone-900 tracking-tight whitespace-nowrap">
                {settings?.hotel_name || 'Hotel Atithi'}
              </span>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-orange-50 text-orange-700 border border-orange-200">
                VEG & NON-VEG
              </span>
            </div>
            <p className="hidden sm:block text-xs text-stone-500 font-medium truncate">
              Fresh food, delivered hot
            </p>
          </div>
        </Link>

        {/* Right Actions: Cart & Sign In */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/cart"
            className="relative w-11 h-11 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 transition-all border border-stone-200 flex items-center justify-center shadow-2xs"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 text-stone-800" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 min-w-[20px] text-center rounded-full bg-orange-600 text-white text-[10px] font-black shadow-xs">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/profile"
              className="h-11 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="max-w-[100px] truncate hidden sm:inline">
                {profile?.name || 'Account'}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="h-11 px-4 sm:px-5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="whitespace-nowrap">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
