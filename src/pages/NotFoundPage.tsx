import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
  <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
    <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto" />
    <h1 className="font-display font-extrabold text-2xl text-stone-900">Page not found</h1>
    <p className="text-sm text-stone-500">
      The page you are looking for doesn't exist. Let's get you back to the menu.
    </p>
    <Link
      to="/"
      className="inline-block px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm"
    >
      Browse Menu
    </Link>
  </div>
);
export default NotFoundPage;
