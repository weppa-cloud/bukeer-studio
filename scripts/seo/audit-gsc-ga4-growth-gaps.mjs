#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const OUT_DIR = 'artifacts/seo/2026-04-29-growth-gsc-ga4-gap-audit';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GAP_ROWS = [
  ['GSC query+page', 'gsc', ['query,page'], 'available', 'P0', 'Map query intent to URL opportunity.'],
  ['GSC page+country', 'gsc', ['page,country'], 'available', 'P0', 'Map market opportunities and country-specific regressions.'],
  ['GSC page+device', 'gsc', ['page,device'], 'available', 'P1', 'Prioritize mobile/desktop technical and CRO gaps.'],
  ['GSC searchAppearance discovery', 'gsc', ['searchAppearance'], 'available', 'P1', 'Use standalone discovery before attempting page-level rich result filters.'],
  ['GA4 landing+channel', 'ga4', ['landingPagePlusQueryString,sessionDefaultChannelGroup'], 'available', 'P0', 'Map landing acquisition quality by channel.'],
  ['GA4 source/medium', 'ga4', ['pagePath,sessionSourceMedium'], 'available', 'P0', 'Map page performance by source/medium.'],
  ['GA4 event/page', 'ga4', ['eventName,pagePath'], 'available', 'P0', 'Map activation/key-event gaps by page.'],
  ['GA4 campaign', 'ga4', ['sessionCampaignName,sessionSource,sessionMedium'], 'available', 'P2', 'Prepare paid-readiness campaign analysis.'],
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const counts = {};
  for (const table of [
    'growth_gsc_cache',
    'growth_ga4_cache',
    'growth_dataforseo_cache',
    'seo_ga4_page_metrics',
    'seo_page_metrics_daily',
    'growth_inventory',
    'funnel_events',
  ]) {
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).eq('website_id', WEBSITE_ID);
    counts[table] = error ? `ERR ${error.message}` : count;
  }

  const { data: gscCache } = await sb
    .from('growth_gsc_cache')
    .select('cache_key,cache_tag,fetched_at,expires_at,payload')
    .eq('website_id', WEBSITE_ID)
    .order('fetched_at', { ascending: false })
    .limit(5);

  const { data: ga4Cache } = await sb
    .from('growth_ga4_cache')
    .select('cache_key,cache_tag,fetched_at,expires_at,payload')
    .eq('website_id', WEBSITE_ID)
    .order('fetched_at', { ascending: false })
    .limit(5);

  const gscShapes = (gscCache ?? []).map(describeCacheShape);
  const ga4Shapes = (ga4Cache ?? []).map(describeCacheShape);

  const report = {
    generated_at: new Date().toISOString(),
    website_id: WEBSITE_ID,
    counts,
    gsc_cache_shapes: gscShapes,
    ga4_cache_shapes: ga4Shapes,
    gap_matrix: GAP_ROWS.map(([signal, provider, keyParts, available, priority, action]) => {
      const extracted = hasCacheShape(provider, keyParts, provider === 'gsc' ? gscShapes : ga4Shapes);
      return {
      signal,
      available,
      extracted: extracted ? 'yes: growth cache populated' : 'not extracted in current growth cache',
      persisted: extracted ? `yes: growth_${provider}_cache` : 'not persisted',
      used_in_council: extracted ? 'available for next Council intake; normalization still pending' : 'not used',
      gap_priority: priority,
      recommended_normalization: extracted ? `Normalize into growth_inventory where decision-grade: ${action}` : action,
    };
    }),
  };

  await fs.writeFile(path.join(OUT_DIR, 'gsc-ga4-gap-audit.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'gsc-ga4-gap-audit.md'), toMarkdown(report));
  console.log(JSON.stringify({ outDir: OUT_DIR, counts, gaps: report.gap_matrix.length }, null, 2));
}

function hasCacheShape(provider, keyParts, shapes) {
  return shapes.some((shape) => {
    const key = shape.cache_key ?? '';
    return keyParts.every((part) => key.includes(part));
  });
}

function describeCacheShape(row) {
  const payload = row.payload ?? {};
  const rows = Array.isArray(payload) ? payload : payload.rows;
  const first = Array.isArray(rows) ? rows[0] : null;
  return {
    cache_key: row.cache_key,
    cache_tag: row.cache_tag,
    fetched_at: row.fetched_at,
    expires_at: row.expires_at,
    row_count: Array.isArray(rows) ? rows.length : 0,
    first_keys: first ? Object.keys(first) : [],
    first_dimension_keys: first?.keys ?? first?.dimensionValues ?? null,
    metric_headers: payload.metricHeaders ?? null,
    dimension_headers: payload.dimensionHeaders ?? null,
  };
}

function toMarkdown(report) {
  const countRows = Object.entries(report.counts).map(([table, count]) => `| ${table} | ${count} |`).join('\n');
  const gapRows = report.gap_matrix
    .map((row) => `| ${row.signal} | ${row.gap_priority} | ${row.extracted} | ${row.persisted} | ${row.used_in_council} | ${row.recommended_normalization} |`)
    .join('\n');
  return `# GSC/GA4 Growth Gap Audit

Generated: ${report.generated_at}

## Counts

| Table | Rows |
|---|---:|
${countRows}

## Gap Matrix

| Signal | Priority | Extracted | Persisted | Used in Council | Recommended normalization |
|---|---|---|---|---|---|
${gapRows}
`;
}
