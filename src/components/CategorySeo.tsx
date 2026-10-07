import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';
import { Category } from '../types/database';
import { categoryPath } from '../utils/slug';
import { SITE_URL } from '../utils/site';

// Search-engine data for a category page (/menu/<slug>): its own title, description,
// canonical address and a schema.org Menu listing every dish with its price.
// Everything is put back to the home page values when the visitor leaves the page.

const MENU_JSONLD_ID = 'menu-jsonld';

interface MenuDish {
  name: string;
  description: string | null;
  price: number;
  is_veg: boolean | null;
}

const HEAD_TAGS: [selector: string, attr: 'content' | 'href'][] = [
  ['meta[name="description"]', 'content'],
  ['link[rel="canonical"]', 'href'],
  ['meta[property="og:url"]', 'content'],
  ['meta[property="og:title"]', 'content'],
  ['meta[property="og:description"]', 'content'],
  ['meta[name="twitter:title"]', 'content'],
  ['meta[name="twitter:description"]', 'content'],
];

const setTag = (selector: string, attr: 'content' | 'href', value: string) => {
  const el = document.head.querySelector(selector);
  if (el && el.getAttribute(attr) !== value) el.setAttribute(attr, value);
};

export const CategorySeo: React.FC<{ category: Category }> = ({ category }) => {
  const { settings } = useSettings();
  const [dishes, setDishes] = useState<MenuDish[] | null>(null);

  const hotel = settings?.hotel_name?.trim() || 'Hotel Atithi';
  const city = settings?.hotel_city?.trim() || 'Raichur';
  const url = `${SITE_URL}${categoryPath(category.name)}`;

  // Every dish of the category (a small list), independent of the on-screen filters
  useEffect(() => {
    let cancelled = false;
    setDishes(null);
    supabase
      .from('products')
      .select('name, description, price, is_veg')
      .eq('category_id', category.id)
      .eq('type', 'food')
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (!cancelled && !error) setDishes((data || []) as MenuDish[]);
      });
    return () => {
      cancelled = true;
    };
  }, [category.id]);

  // Title, description and canonical address; restored when leaving the page
  useEffect(() => {
    const saved = HEAD_TAGS.map(([sel, attr]) => document.head.querySelector(sel)?.getAttribute(attr) ?? null);
    const savedTitle = document.title;
    return () => {
      HEAD_TAGS.forEach(([sel, attr], i) => {
        const value = saved[i];
        if (value !== null) setTag(sel, attr, value);
      });
      document.title = savedTitle;
    };
  }, [category.id]);

  useEffect(() => {
    const title = `${category.name} in ${city} - Order Online | ${hotel}`;
    const sample = (dishes || []).slice(0, 4).map((d) => d.name);
    const description =
      `Order ${category.name} online from ${hotel}, ${city}` +
      (sample.length ? `: ${sample.join(', ')}${(dishes?.length || 0) > sample.length ? ' and more' : ''}` : '') +
      `. ${dishes?.length ? `${dishes.length} dishes. ` : ''}Home delivery, no delivery charge, Cash on Delivery.`;

    document.title = title;
    setTag('meta[name="description"]', 'content', description);
    setTag('link[rel="canonical"]', 'href', url);
    setTag('meta[property="og:url"]', 'content', url);
    setTag('meta[property="og:title"]', 'content', title);
    setTag('meta[property="og:description"]', 'content', description);
    setTag('meta[name="twitter:title"]', 'content', title);
    setTag('meta[name="twitter:description"]', 'content', description);
  }, [category.name, city, hotel, url, dishes]);

  // schema.org Menu + breadcrumbs
  useEffect(() => {
    if (!dishes) return;
    const data = [
      {
        '@context': 'https://schema.org',
        '@type': 'Menu',
        name: `${category.name} - ${hotel}, ${city}`,
        url,
        inLanguage: 'en-IN',
        hasMenuSection: {
          '@type': 'MenuSection',
          name: category.name,
          hasMenuItem: dishes.map((d) => ({
            '@type': 'MenuItem',
            name: d.name,
            ...(d.description ? { description: d.description } : {}),
            offers: { '@type': 'Offer', price: Number(d.price).toFixed(2), priceCurrency: 'INR' },
            ...(d.is_veg === false ? {} : { suitableForDiet: 'https://schema.org/VegetarianDiet' }),
          })),
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Menu', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: category.name, item: url },
        ],
      },
    ];
    let script = document.getElementById(MENU_JSONLD_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = MENU_JSONLD_ID;
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }, [dishes, category.name, hotel, city, url]);

  useEffect(() => () => document.getElementById(MENU_JSONLD_ID)?.remove(), []);

  return null;
};
