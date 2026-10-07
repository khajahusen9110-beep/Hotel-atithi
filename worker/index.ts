// Cloudflare Worker for the customer website.
// Everything is served from the static build (./dist) except /sitemap.xml, which is
// built live from Supabase so a new or renamed menu category shows up in Google
// without a redeploy. If Supabase can't be reached, the static sitemap is served.

import { slugify } from '../src/utils/slug';
import { SITE_URL } from '../src/utils/site';
// Written by the Vite build from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (the same
// public values the website already ships to every browser).
import buildConfig from './supabase-config.generated.json';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface CategoryRow {
  id: string;
  name: string;
  created_at: string | null;
}

interface ProductRow {
  category_id: string | null;
  updated_at: string | null;
}

const SITEMAP_TTL_SECONDS = 3600;

const day = (iso: string | null | undefined): string | null => (iso ? iso.slice(0, 10) : null);
const latest = (a: string | null, b: string | null): string | null => (!a ? b : !b ? a : a > b ? a : b);

async function buildSitemap(env: Env): Promise<string> {
  const base = (env.SUPABASE_URL || buildConfig.url || '').replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY || buildConfig.anonKey;
  if (!base || !key) throw new Error('Supabase is not configured for the sitemap');

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers });
    if (!res.ok) throw new Error(`Supabase ${res.status} for ${path}`);
    return (await res.json()) as T;
  };

  const [categories, products] = await Promise.all([
    get<CategoryRow[]>('categories?select=id,name,created_at&type=eq.food&is_active=eq.true&order=sort_order.asc'),
    get<ProductRow[]>('products?select=category_id,updated_at&type=eq.food'),
  ]);

  // A category's page changes when any of its dishes changes
  const dishes = new Map<string, { count: number; updated: string | null }>();
  for (const p of products) {
    if (!p.category_id) continue;
    const entry = dishes.get(p.category_id) ?? { count: 0, updated: null };
    entry.count++;
    entry.updated = latest(entry.updated, day(p.updated_at));
    dishes.set(p.category_id, entry);
  }

  const urls: { loc: string; lastmod: string | null; changefreq: string; priority: string }[] = [];
  const seen = new Set<string>();
  let menuUpdated: string | null = null;
  for (const c of categories) {
    const d = dishes.get(c.id);
    if (!d || d.count === 0) continue; // empty categories have nothing to show
    const path = `/menu/${slugify(c.name)}`;
    if (seen.has(path)) continue;
    seen.add(path);
    const lastmod = latest(day(c.created_at), d.updated);
    menuUpdated = latest(menuUpdated, lastmod);
    urls.push({ loc: `${SITE_URL}${path}`, lastmod, changefreq: 'weekly', priority: '0.8' });
  }
  urls.unshift({ loc: `${SITE_URL}/`, lastmod: menuUpdated, changefreq: 'daily', priority: '1.0' });
  urls.push({ loc: `${SITE_URL}/reviews`, lastmod: null, changefreq: 'weekly', priority: '0.5' });

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}` +
        `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function sitemap(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = (globalThis as unknown as { caches: { default: Cache } }).caches.default;
  const cacheKey = new Request(new URL('/sitemap.xml', request.url).toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const xml = await buildSitemap(env);
    const response = new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${SITEMAP_TTL_SECONDS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    console.error('Live sitemap failed, serving the static one:', err);
    return env.ASSETS.fetch(request);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml' && (request.method === 'GET' || request.method === 'HEAD')) {
      return sitemap(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
