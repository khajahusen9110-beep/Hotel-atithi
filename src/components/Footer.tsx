import React from 'react';
import { Utensils, MapPin, Phone, Clock, ShieldCheck, Heart, Mail, MessageCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatTime12Hour } from '../utils/productAvailability';
import { telHref, whatsappHref } from '../utils/contact';

export const Footer: React.FC = () => {
  const { settings, todayHoursText, storeHours } = useSettings();
  // Every detail here comes from the admin Settings page
  const name = settings?.hotel_name?.trim() || 'Hotel Atithi';
  const city = settings?.hotel_city?.trim() || 'Raichur';
  const pincode = settings?.hotel_pincode?.trim();
  const address = settings?.hotel_address?.trim() || city;
  const fullAddress = [
    address,
    // Avoid "Raichur, Raichur" when the admin already typed the city in the address
    address.toLowerCase().includes(city.toLowerCase()) ? null : city,
    pincode && !address.includes(pincode) ? pincode : null,
  ]
    .filter(Boolean)
    .join(', ');
  const phone = settings?.hotel_phone?.trim();
  const phoneLink = telHref(phone);
  const whatsappLink = whatsappHref(settings?.hotel_whatsapp, `Hi ${name}, I have a question about my order.`);
  const email = settings?.hotel_email?.trim();
  const lat = settings?.hotel_latitude;
  const lng = settings?.hotel_longitude;
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const closedDays = storeHours.filter((h) => h.is_closed).map((h) => DAY_SHORT[h.day_of_week]);
  const openDaysText =
    storeHours.length === 0 || closedDays.length === 0 ? 'Open All 7 Days' : `Closed on ${closedDays.join(', ')}`;
  const mapsLink =
    lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

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
              <span className="font-display font-bold text-xl text-white">{name}</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Biryani, tandoori, Chinese and home-style veg & non-veg meals from {city}, delivered hot to your doorstep.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-[11px] font-bold text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Veg & Non-Veg Available
            </div>
          </div>

          {/* Col 2: Timings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Operating Hours
            </h4>
            <div className="text-xs space-y-1.5 text-stone-400">
              <p className="font-medium text-stone-300">{openDaysText}</p>
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
              {mapsLink ? (
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="block hover:text-white">
                  {fullAddress}
                </a>
              ) : (
                <p>{fullAddress}</p>
              )}
              {phone && phoneLink && (
                <a
                  href={phoneLink}
                  className="flex items-center gap-1 text-stone-300 font-semibold pt-1 hover:text-white"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {phone}
                </a>
              )}
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-stone-300 font-semibold hover:text-white"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp us
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-1 text-stone-300 hover:text-white break-all">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  {email}
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
          <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> in {city}
          </p>
        </div>
      </div>
    </footer>
  );
};
