import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!url || !anonKey) {
      throw new Error(
        "Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
      );
    }
    _client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

/**
 * Lazily-initialized Supabase client.
 * The client is NOT created at import time — only on first property access.
 * This prevents module-level crashes in test environments that don't have env vars set.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getClient() as any)[prop];
  },
});
