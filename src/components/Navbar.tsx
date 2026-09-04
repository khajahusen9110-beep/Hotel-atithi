import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, ShoppingBag, User, Star, Carrot } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { user, profile } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg text-stone-900 tracking-tight">
                Hotel Atithi
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                100% Veg
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium -mt-0.5">
              Pure Veg & Fresh Vegetables
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/?tab=food"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive('/') && (!location.search || location.search.includes('tab=food'))
                ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            <span>Food Menu</span>
          </Link>

          <Link
            to="/?tab=vegetable"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive('/') && location.search.includes('tab=vegetable')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Carrot className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fresh Vegetables</span>
          </Link>

          <Link
            to="/reviews"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive('/reviews')
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Reviews</span>
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/cart"
            className="relative p-2.5 rounded-2xl bg-stone-100 hover:bg-amber-50 text-stone-800 hover:text-amber-900 transition-all border border-stone-200/70"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-extrabold shadow-sm animate-scale-in">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all border border-stone-200/70"
            >
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                {profile?.name ? profile.name[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">
                {profile?.name || 'My Account'}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-2xl bg-stone-900 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
