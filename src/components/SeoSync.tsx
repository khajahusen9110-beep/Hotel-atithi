import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { toE164India } from '../utils/contact';

// Keeps the page's local-SEO data in step with the admin Settings page:
// the Restaurant structured data (address, phone, location, opening hours),
// the geo meta tags and the title. index.html carries Raichur defaults for
// crawlers that don't run JavaScript (WhatsApp / Facebook link previews).

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const JSONLD_ID = 'restaurant-jsonld';

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);

const setMeta = (selector: string, attr: 'content', value: string) => {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el && el.getAttribute(attr) !== value) el.setAttribute(attr, value);
};

export const SeoSync: React.FC = () => {
  const { settings, storeHours, loading } = useSettings();
  const { pathname } = useLocation();
  // Category pages (/menu/<slug>) set their own title
  const ownsTitle = !pathname.startsWith('/menu/');

  useEffect(() => {
    if (loading || !settings) return;

    const name = settings.hotel_name?.trim() || 'Hotel Atithi';
    const city = settings.hotel_city?.trim() || 'Raichur';
    const street = settings.hotel_address?.trim() || city;
    const lat = settings.hotel_latitude != null ? Number(settings.hotel_latitude) : null;
    const lng = settings.hotel_longitude != null ? Number(settings.hotel_longitude) : null;
    const phone = toE164India(settings.hotel_phone);
    const email = settings.hotel_email?.trim() || null;

    // Group days that share the same hours, skip closed days
    const groups = new Map<string, { opens: string; closes: string; days: string[] }>();
    for (const h of [...storeHours].sort((a, b) => a.day_of_week - b.day_of_week)) {
      const opens = hhmm(h.open_time);
      const closes = hhmm(h.close_time);
      if (h.is_closed || !opens || !closes) continue;
      const key = `${opens}-${closes}`;
      const g = groups.get(key) ?? { opens, closes, days: [] };
      g.days.push(DAY_NAMES[h.day_of_week]);
      groups.set(key, g);
    }

    const script = document.getElementById(JSONLD_ID);
    if (script) {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(script.textContent || '{}');
      } catch {
        // fall back to building it from scratch
      }
      const next: Record<string, unknown> = {
        ...data,
        name,
        description: `Multi-cuisine restaurant in ${city} serving Biryani, Tandoori, Chinese, Veg and Non-Veg dishes with home delivery.`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: street,
          addressLocality: city,
          addressRegion: 'Karnataka',
          ...(settings.hotel_pincode?.trim() ? { postalCode: settings.hotel_pincode.trim() } : {}),
          addressCountry: 'IN',
        },
        areaServed: { '@type': 'City', name: city },
      };
      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        next.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
      }
      if (phone) next.telephone = phone;
      else delete next.telephone;
      if (email) next.email = email;
      else delete next.email;
      if (groups.size > 0) {
        next.openingHoursSpecification = [...groups.values()].map((g) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: g.days,
          opens: g.opens,
          closes: g.closes,
        }));
      }
      const json = JSON.stringify(next, null, 2);
      if (script.textContent !== json) script.textContent = json;
    }

    if (lat != null && lng != null) {
      setMeta('meta[name="geo.position"]', 'content', `${lat};${lng}`);
      setMeta('meta[name="ICBM"]', 'content', `${lat}, ${lng}`);
    }
    setMeta('meta[name="geo.placename"]', 'content', `${city}, Karnataka`);

    const title = `${name} ${city} - Order Food Online | Biryani, Tandoori & Chinese Delivery`;
    if (ownsTitle && document.title !== title) document.title = title;
  }, [settings, storeHours, loading, ownsTitle]);

  return null;
};
