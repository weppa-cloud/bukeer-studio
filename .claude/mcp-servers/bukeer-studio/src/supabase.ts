/**
 * Supabase service-role client. Created once at startup (lazy) and shared.
 * Service-role key is required for direct DB helpers; API-route tools do not
 * use this client.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.BUKEER_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (falls back to NEXT_PUBLIC_SUPABASE_URL / BUKEER_SERVICE_ROLE_KEY).',
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application': 'mcp-bukeer-studio' } },
  });
  return client;
}
