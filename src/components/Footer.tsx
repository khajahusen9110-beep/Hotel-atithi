import React from 'react';
import { Utensils, MapPin, Phone, Clock, ShieldCheck, Heart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const Footer: React.FC = () => {
  const { settings } = useSettings();

  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 pb-24 md:pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                <Utensils className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-xl text-white">Hotel Atithi</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Serving delicious pure-veg and non-veg culinary delights & delivering fresh farm vegetables directly to your doorstep.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-[11px] font-bold text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Pure Veg & Non-Veg Available
            </div>
          </div>

          {/* Col 2: Timings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Operating Hours
            </h4>
            <div className="text-xs space-y-1.5 text-stone-400">
              <p className="font-medium text-stone-300">Open All 7 Days</p>
              <p>Kitchen: {settings?.opening_time || '08:00'} - {settings?.closing_time || '23:00'}</p>
              <p>Vegetable Dispatch: 07:00 - 21:00</p>
            </div>
          </div>

          {/* Col 3: Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              Contact & Location
            </h4>
            <div className="text-xs space-y-1.5 text-stone-400">
              <p>{settings?.hotel_address || 'Hotel Atithi, Station Road, Pune'}</p>
              <p className="flex items-center gap-1 text-stone-300 font-semibold pt-1">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                {settings?.hotel_phone || '+91 98765 43210'}
              </p>
            </div>
          </div>

          {/* Col 4: Trust & Assurances */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Quality Assured
            </h4>
            <ul className="text-xs space-y-1.5 text-stone-400">
              <li>• Hygienically prepped pure veg dishes</li>
              <li>• Farm-direct daily harvested veggies</li>
              <li>• Cash on Delivery & Razorpay supported</li>
              <li>• Live GPS tracking on all orders</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Hotel Atithi. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for pure veg food lovers
          </p>
        </div>
      </div>
    </footer>
  );
};
