import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in the console instead of silently sending requests with an empty key
  console.error(
    'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting environment variables.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://jlfrnjhnprvixlckvvmc.supabase.co',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
