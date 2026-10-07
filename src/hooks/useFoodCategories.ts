import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types/database';

// Active food categories, shared by the menu, the category pages and the footer.
// Kept for the whole visit (refreshed in the background after a few minutes).

const STALE_MS = 5 * 60_000;
let cache: Category[] | null = null;
let fetchedAt = 0;
let inflight: Promise<Category[]> | null = null;
const listeners = new Set<(c: Category[]) => void>();

const load = (): Promise<Category[]> => {
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'food')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    cache = (data || []) as Category[];
    fetchedAt = Date.now();
    listeners.forEach((l) => l(cache!));
    return cache;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
};

export function useFoodCategories() {
  const [categories, setCategories] = useState<Category[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setCategories);
    if (!cache || Date.now() - fetchedAt > STALE_MS) {
      load()
        .catch((err) => console.error('Error fetching categories:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      listeners.delete(setCategories);
    };
  }, []);

  return { categories, loading };
}
