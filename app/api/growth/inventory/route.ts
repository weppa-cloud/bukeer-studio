/**
 * GET /api/growth/inventory
 *
 * Returns the Growth Inventory rows for a tenant (account_id + website_id),
 * optionally filtered by locale, market, cluster, funnel_stage, status, result.
 *
 * Cache (ADR-016):
 *   - Response header: `cache-tag: growth-inventory:website:<website_id>`
 *   - `s-maxage=3600, stale-while-revalidate=7200`
 *   - NO render-path calls to paid sources — rows come from the
 *     `growth_inventory` table populated by the W2 ingestion job.
 *
 * Envelope (ADR-012): { success, data | error }.
 *
 * @see SPEC #337 (W2 day 13-14) — A1 Backend/Contracts
 * @see lib/api/response.ts — apiSuccess / apiError helpers
 */

import type { NextRequest } from 'next/server';
import {
  GrowthInventoryQuerySchema,
  GrowthInventoryRowSchema,
  type GrowthInventoryRow,
} from '@bukeer/website-contract';
import { apiError, apiInternalError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('growth.inventory');

interface InventoryMeta {
  total: number;
  limit: number;
  offset: number;
  fetchedAt: string;
  cacheTag: string;
  source: 'live' | 'mock';
}

function inventoryCacheTag(websiteId: string): string {
  return `growth-inventory:website:${websiteId}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const parsed = GrowthInventoryQuerySchema.safeParse(params);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }
  const query = parsed.data;
  const cacheTag = inventoryCacheTag(query.website_id);

  let rows: GrowthInventoryRow[] = [];
  let total = 0;
  let source: InventoryMeta['source'] = 'live';

  try {
    const access = await requireWebsiteAccess(query.website_id);
    if (query.account_id !== access.accountId) {
      return apiError('FORBIDDEN', 'Insufficient permissions for this account', 403);
    }

    const admin = createSupabaseServiceRoleClient();
    let q = admin
      .from('growth_inventory')
      .select('*', { count: 'exact' })
      .eq('account_id', access.accountId)
      .eq('website_id', access.websiteId);

    if (query.locale) q = q.eq('locale', query.locale);
    if (query.market) q = q.eq('market', query.market);
    if (query.cluster) q = q.eq('cluster', query.cluster);
    if (query.funnel_stage) q = q.eq('funnel_stage', query.funnel_stage);
    if (query.status) q = q.eq('status', query.status);
    if (query.result) q = q.eq('result', query.result);

    const { data, count, error } = await q
      .order('priority_score', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    if (error) {
      // Treat missing-table gracefully (W2 ingestion job not deployed yet).
      const code = (error as { code?: string }).code;
      const message = error.message ?? '';
      const tableMissing =
        code === '42P01' /* undefined_table */ ||
        message.toLowerCase().includes('relation') ||
        message.toLowerCase().includes('does not exist');
      if (tableMissing) {
        log.warn('growth_inventory table missing, returning empty mock', { error: message });
        source = 'mock';
        rows = [];
        total = 0;
      } else {
        return apiError('INVENTORY_READ_FAILED', 'Unable to read growth inventory', 500, message);
      }
    } else {
      // Defensive parse — schema acts as the contract for downstream consumers.
      const parsedRows: GrowthInventoryRow[] = [];
      for (const raw of data ?? []) {
        const result = GrowthInventoryRowSchema.safeParse(raw);
        if (result.success) {
          parsedRows.push(result.data);
        } else {
          log.warn('inventory row failed schema parse', {
            issues: result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`),
          });
        }
      }
      rows = parsedRows;
      total = count ?? parsedRows.length;
    }
  } catch (e) {
    if (e instanceof SeoApiError) {
      return apiError(e.code, e.message, e.status, e.details);
    }
    log.error('growth inventory unexpected error', { error: e instanceof Error ? e.message : String(e) });
    return apiInternalError('Unexpected error reading growth inventory');
  }

  const meta: InventoryMeta = {
    total,
    limit: query.limit,
    offset: query.offset,
    fetchedAt: new Date().toISOString(),
    cacheTag,
    source,
  };

  const response = apiSuccess({ rows, meta });
  // ADR-016 cache headers — Cloudflare Worker honors `cache-tag` for purge.
  response.headers.set('cache-control', 's-maxage=3600, stale-while-revalidate=7200');
  response.headers.set('cache-tag', cacheTag);
  return response;
}
