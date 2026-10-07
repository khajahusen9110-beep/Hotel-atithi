import React from 'react';
import { Utensils, MapPin, Phone, Clock, ShieldCheck, Heart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatTime12Hour } from '../utils/productAvailability';

export const Footer: React.FC = () => {
  const { settings, todayHoursText } = useSettings();
  const phone = settings?.hotel_phone?.trim();

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
              Biryani, tandoori, Chinese and home-style veg & non-veg meals from Sindhanur, delivered hot to your doorstep.
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
              <p>{todayHoursText.replace(/^Hours:\s*/, 'Today: ')}</p>
              {settings?.opening_time && settings?.closing_time && (
                <p>
                  Kitchen: {formatTime12Hour(settings.opening_time)} - {formatTime12Hour(settings.closing_time)}
                </p>
              )}
            </div>
          </div>

          {/* Col 3: Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              Contact & Location
            </h4>
            <div className="text-xs space-y-1.5 text-stone-400">
              <p>{settings?.hotel_address || 'NH150A, Bassapura, Sindhanur, Raichur, Karnataka 584128'}</p>
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-1 text-stone-300 font-semibold pt-1 hover:text-white"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {phone}
                </a>
              )}
            </div>
          </div>

          {/* Col 4: Trust & Assurances */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Quality Assured
            </h4>
            <ul className="text-xs space-y-1.5 text-stone-400">
              <li>• Freshly cooked, hygienically prepared dishes</li>
              <li>• Clear veg / non-veg marking on every dish</li>
              <li>• Cash on Delivery (cash or UPI to delivery person)</li>
              <li>• Live order status tracking</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Hotel Atithi. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> in Sindhanur
          </p>
        </div>
      </div>
    </footer>
  );
};
