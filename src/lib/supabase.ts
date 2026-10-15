import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when real credentials are present (not the .env.example placeholders). */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !String(url).includes('YOUR_') && !String(anonKey).includes('YOUR_'),
)

export const supabase: SupabaseClient | null = isSupabaseConfigured && url && anonKey ? createClient(url, anonKey) : null

export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
