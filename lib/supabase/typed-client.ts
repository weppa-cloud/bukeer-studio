/**
 * Helper to cast a `SupabaseClient` to a typed view backed by the generated
 * `Database` type at `types/supabase.ts`. Repository convention: the global
 * `lib/supabase/{client,server-client,service-role}.ts` clients return the
 * untyped variant to avoid cascading typecheck pressure on legacy code paths.
 * Modules that want full typing for a query should narrow at the call site:
 *
 *     import { asTyped } from '@/lib/supabase/typed-client';
 *     const { data } = await asTyped(supabase)
 *       .from('growth_agent_runs')
 *       .select('*');
 *
 * Re-generate `types/supabase.ts` after every Supabase migration:
 *   supabase MCP → generate_typescript_types(project_id=<id>)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function asTyped(client: SupabaseClient): TypedSupabaseClient {
  return client as unknown as TypedSupabaseClient;
}

/**
 * Cast an arbitrary `Record<string, unknown>` payload to Supabase's `Json` so
 * it can be inserted into a `jsonb` column without spurious TS errors. Throws
 * at runtime via Supabase's own JSON serializer if the value is not actually
 * JSON-serializable (functions, symbols, BigInt, circular refs).
 */
export function toJson(value: unknown): Json {
  return value as Json;
}

export type { Database, Json };
