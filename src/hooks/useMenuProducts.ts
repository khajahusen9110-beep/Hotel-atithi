import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types/database';

// Server-side paginated menu: the browser only downloads the dishes that are on
// screen (plus one page ahead via the infinite-scroll sentinel), never the whole menu.

export type MenuSort = 'recommended' | 'price_asc' | 'price_desc';

export interface MenuQuery {
  categoryId: string | null;
  search: string;
  vegOnly: boolean;
  sort: MenuSort;
}

export const MENU_PAGE_SIZE = 12;
const CACHE_TTL_MS = 5 * 60_000;

interface CacheEntry {
  items: Product[];
  total: number | null;
  hasMore: boolean;
  fetchedAt: number;
}

interface PageResult {
  items: Product[];
  total: number | null;
}

// Module-level so results survive page navigation (menu -> cart -> back is instant)
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PageResult>>();

/** PostgREST filter syntax uses , ( ) . : * % as operators, so strip them from user input. */
export const sanitizeSearch = (raw: string): string =>
  raw
    .replace(/[,().:*%\\"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

const queryKey = (q: MenuQuery): string =>
  JSON.stringify([q.categoryId, sanitizeSearch(q.search).toLowerCase(), q.vegOnly, q.sort]);

const fetchPage = (q: MenuQuery, offset: number): Promise<PageResult> => {
  const requestKey = `${queryKey(q)}|${offset}`;
  const pending = inflight.get(requestKey);
  if (pending) return pending;

  const run = async (): Promise<PageResult> => {
    // Exact count only on the first page; later pages don't need to recount
    let query = supabase
      .from('products')
      .select('*, category:categories(id, name)', offset === 0 ? { count: 'exact' } : undefined)
      .eq('type', 'food');

    if (q.categoryId) query = query.eq('category_id', q.categoryId);
    // Products with is_veg = null are shown as veg by the card, so treat them the same here
    if (q.vegOnly) query = query.not('is_veg', 'is', false);

    const search = sanitizeSearch(q.search);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    if (q.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (q.sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('is_available', { ascending: false }).order('name', { ascending: true });
    // Unique tie-breaker keeps page boundaries stable (no duplicated or skipped dishes)
    query = query.order('id', { ascending: true });

    const { data, error, count } = await query.range(offset, offset + MENU_PAGE_SIZE - 1);
    if (error) throw error;
    return { items: (data || []) as Product[], total: count ?? null };
  };

  const promise = run().finally(() => inflight.delete(requestKey));
  inflight.set(requestKey, promise);
  return promise;
};

const isFresh = (entry: CacheEntry | undefined): entry is CacheEntry =>
  !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;

/** Warm the first page of a query (e.g. when a finger lands on a category tile). */
export const prefetchMenuProducts = (q: MenuQuery): void => {
  const key = queryKey(q);
  if (isFresh(cache.get(key))) return;
  fetchPage(q, 0)
    .then(({ items, total }) => {
      if (isFresh(cache.get(key))) return;
      cache.set(key, {
        items,
        total,
        hasMore: total !== null ? items.length < total : items.length === MENU_PAGE_SIZE,
        fetchedAt: Date.now(),
      });
    })
    .catch(() => {});
};

interface MenuState {
  items: Product[];
  total: number | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

const EMPTY: MenuState = {
  items: [],
  total: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
};

/**
 * Paginated dishes for `query`. Pass null to fetch nothing (e.g. on the category overview).
 */
export function useMenuProducts(query: MenuQuery | null) {
  const key = query ? queryKey(query) : null;
  const [state, setState] = useState<MenuState>(() => {
    const entry = key ? cache.get(key) : undefined;
    return entry ? { ...EMPTY, items: entry.items, total: entry.total, hasMore: entry.hasMore } : EMPTY;
  });

  const keyRef = useRef(key);
  const queryRef = useRef(query);
  const loadingMoreRef = useRef(false);
  keyRef.current = key;
  queryRef.current = query;

  const loadFirstPage = useCallback((q: MenuQuery, k: string, background: boolean) => {
    if (!background) setState({ ...EMPTY, loading: true });
    fetchPage(q, 0)
      .then(({ items, total }) => {
        const hasMore = total !== null ? items.length < total : items.length === MENU_PAGE_SIZE;
        cache.set(k, { items, total, hasMore, fetchedAt: Date.now() });
        if (keyRef.current !== k) return; // the customer has moved on to another query
        setState({ ...EMPTY, items, total, hasMore });
      })
      .catch((err) => {
        console.error('Error fetching dishes:', err);
        if (keyRef.current !== k || background) return;
        setState({ ...EMPTY, error: 'Could not load dishes. Please check your connection.' });
      });
  }, []);

  useEffect(() => {
    loadingMoreRef.current = false;
    if (!query || !key) {
      setState(EMPTY);
      return;
    }
    const entry = cache.get(key);
    if (entry) {
      // Show cached dishes instantly; quietly refresh them if they are getting old
      setState({ ...EMPTY, items: entry.items, total: entry.total, hasMore: entry.hasMore });
      if (!isFresh(entry)) loadFirstPage(query, key, true);
      return;
    }
    loadFirstPage(query, key, false);
    // `key` captures every field of `query`
  }, [key, loadFirstPage]);

  const loadMore = useCallback(() => {
    const q = queryRef.current;
    const k = keyRef.current;
    if (!q || !k || loadingMoreRef.current) return;
    const entry = cache.get(k);
    if (!entry || !entry.hasMore) return;

    loadingMoreRef.current = true;
    setState((s) => ({ ...s, loadingMore: true, error: null }));

    fetchPage(q, entry.items.length)
      .then(({ items: page }) => {
        const current = cache.get(k) ?? entry;
        const seen = new Set(current.items.map((p) => p.id));
        const items = current.items.concat(page.filter((p) => !seen.has(p.id)));
        const hasMore =
          page.length === MENU_PAGE_SIZE && (current.total === null || items.length < current.total);
        cache.set(k, { ...current, items, hasMore });
        if (keyRef.current !== k) return;
        setState((s) => ({ ...s, items, hasMore, loadingMore: false }));
      })
      .catch((err) => {
        console.error('Error fetching more dishes:', err);
        if (keyRef.current !== k) return;
        setState((s) => ({ ...s, loadingMore: false, error: 'Could not load more dishes.' }));
      })
      .finally(() => {
        if (keyRef.current === k) loadingMoreRef.current = false;
      });
  }, []);

  const retry = useCallback(() => {
    const q = queryRef.current;
    const k = keyRef.current;
    if (!q || !k) return;
    if (cache.get(k)) loadMore();
    else loadFirstPage(q, k, false);
  }, [loadFirstPage, loadMore]);

  return { ...state, loadMore, retry };
}
