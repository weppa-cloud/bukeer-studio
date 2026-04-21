import { createClient } from '@supabase/supabase-js';
import {
  BrandClaimsRowSchema,
  brandClaimsRowToClaims,
  type BrandClaims,
} from '@bukeer/website-contract';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Editorial v1 — fetch dynamic brand claims for an account.
 *
 * Calls the SQL RPC `get_brand_claims(p_account_id)` and normalises the row
 * into the camel-case `BrandClaims` contract. Returns `null` on missing
 * client, RPC error, or empty result — callers should treat every field as
 * optional and avoid rendering claims when data is absent.
 */
export async function getBrandClaims(
  accountId: string,
): Promise<BrandClaims | null> {
  if (!supabase || !accountId) return null;

  try {
    const { data, error } = await supabase.rpc('get_brand_claims', {
      p_account_id: accountId,
    });
    if (error) {
      console.error('[getBrandClaims] RPC error:', error);
      return null;
    }
    // `RETURNS TABLE` returns an array; pick the first row.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    const parsed = BrandClaimsRowSchema.safeParse(row);
    if (!parsed.success) {
      console.warn('[getBrandClaims] Schema mismatch:', parsed.error.issues.slice(0, 3));
      return null;
    }
    return brandClaimsRowToClaims(parsed.data);
  } catch (e) {
    console.error('[getBrandClaims] Exception:', e);
    return null;
  }
}
