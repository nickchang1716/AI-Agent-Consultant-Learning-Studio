import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** 未設定 env 或仍為範例值時為 null，App 以訪客模式運作 */
export const isSupabaseConfigured = Boolean(url && anon && !url.includes('your-project-ref'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anon as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
