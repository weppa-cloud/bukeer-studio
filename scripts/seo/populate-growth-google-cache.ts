#!/usr/bin/env tsx

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import process from 'node:process';
import * as dotenv from 'dotenv';
import { createSupabaseServiceRoleClient } from '../../lib/supabase/service-role';
import { queryGscSearchAnalytics } from '../../lib/growth/gsc-client';
import { runGa4Report } from '../../lib/growth/ga4-client';

dotenv.config({ path: '.env.local' });

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const OUT_DIR = 'artifacts/seo/2026-04-29-growth-google-cache-populate';

type PullStatus = 'planned' | 'live' | 'cache' | 'mock' | 'error';

interface PullResult {
  provider: 'gsc' | 'ga4';
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  status: PullStatus;
  row_count: number;
  cache_tag?: string;
  cache_hit?: boolean;
  error?: string;
}

interface Args {
  apply: boolean;
  force: boolean;
  from: string;
  to: string;
}

const GSC_PULLS = [
  {
    name: 'query_page',
    priority: 'P0' as const,
    dimensions: ['query', 'page'] as const,
    rowLimit: 25000,
  },
  {
    name: 'page_country',
    priority: 'P0' as const,
    dimensions: ['page', 'country'] as const,
    rowLimit: 25000,
  },
  {
    name: 'page_device',
    priority: 'P1' as const,
    dimensions: ['page', 'device'] as const,
    rowLimit: 25000,
  },
  {
    name: 'date_page',
    priority: 'P1' as const,
    dimensions: ['date', 'page'] as const,
    rowLimit: 25000,
  },
  {
    name: 'search_appearance_discovery',
    priority: 'P1' as const,
    dimensions: ['searchAppearance'] as const,
    rowLimit: 1000,
  },
  {
    name: 'page_search_appearance',
    priority: 'P1' as const,
    dimensions: ['page', 'searchAppearance'] as const,
    rowLimit: 25000,
  },
];

const GA4_PULLS = [
  {
    name: 'landing_channel',
    priority: 'P0' as const,
    dimensions: ['landingPagePlusQueryString', 'sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'screenPageViews', 'engagementRate', 'conversions'],
    limit: 10000,
  },
  {
    name: 'page_source_medium',
    priority: 'P0' as const,
    dimensions: ['pagePath', 'sessionSourceMedium'],
    metrics: ['sessions', 'totalUsers', 'screenPageViews', 'engagementRate', 'conversions'],
    limit: 10000,
  },
  {
    name: 'event_page',
    priority: 'P0' as const,
    dimensions: ['eventName', 'pagePath'],
    metrics: ['eventCount', 'conversions'],
    limit: 10000,
  },
  {
    name: 'campaign_source_medium',
    priority: 'P2' as const,
    dimensions: ['sessionCampaignName', 'sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'totalUsers', 'conversions'],
    limit: 10000,
  },
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: PullResult[] = [];
  if (!args.apply) {
    for (const pull of GSC_PULLS) {
      results.push({ provider: 'gsc', name: pull.name, priority: pull.priority, status: 'planned', row_count: 0 });
    }
    for (const pull of GA4_PULLS) {
      results.push({ provider: 'ga4', name: pull.name, priority: pull.priority, status: 'planned', row_count: 0 });
    }
  } else {
    for (const pull of GSC_PULLS) {
      results.push(await runGscPull(args, pull));
    }
    for (const pull of GA4_PULLS) {
      results.push(await runGa4Pull(args, pull));
    }
  }

  const counts = await getCacheCounts();
  const report = {
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    website_id: WEBSITE_ID,
    account_id: ACCOUNT_ID,
    window: { from: args.from, to: args.to },
    counts,
    pulls: results,
  };

  await fs.writeFile(path.join(OUT_DIR, 'growth-google-cache-populate.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'growth-google-cache-populate.md'), toMarkdown(report));
  console.log(JSON.stringify({
    mode: report.mode,
    window: report.window,
    counts,
    pulls: results.map(({ provider, name, status, row_count, error }) => ({ provider, name, status, row_count, error })),
    outDir: OUT_DIR,
  }, null, 2));
}

function parseArgs(argv: string[]): Args {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);

  const args: Args = {
    apply: argv.includes('--apply'),
    force: argv.includes('--force'),
    from: formatDate(start),
    to: formatDate(end),
  };

  for (const arg of argv) {
    if (arg.startsWith('--from=')) args.from = arg.slice('--from='.length);
    if (arg.startsWith('--to=')) args.to = arg.slice('--to='.length);
  }
  return args;
}

async function runGscPull(args: Args, pull: (typeof GSC_PULLS)[number]): Promise<PullResult> {
  try {
    const result = await queryGscSearchAnalytics({
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      locale: 'es',
      startDate: args.from,
      endDate: args.to,
      dimensions: pull.dimensions as never,
      rowLimit: pull.rowLimit,
      forceRefresh: args.force,
    });
    return {
      provider: 'gsc',
      name: pull.name,
      priority: pull.priority,
      status: result.source,
      row_count: result.rows.length,
      cache_tag: result.cacheTag,
      cache_hit: result.cacheHit,
    };
  } catch (error) {
    return errorResult('gsc', pull.name, pull.priority, error);
  }
}

async function runGa4Pull(args: Args, pull: (typeof GA4_PULLS)[number]): Promise<PullResult> {
  try {
    const result = await runGa4Report({
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      locale: 'es',
      startDate: args.from,
      endDate: args.to,
      dimensions: pull.dimensions,
      metrics: pull.metrics,
      limit: pull.limit,
      forceRefresh: args.force,
    });
    return {
      provider: 'ga4',
      name: pull.name,
      priority: pull.priority,
      status: result.source,
      row_count: result.rows.length,
      cache_tag: result.cacheTag,
      cache_hit: result.cacheHit,
    };
  } catch (error) {
    return errorResult('ga4', pull.name, pull.priority, error);
  }
}

function errorResult(provider: 'gsc' | 'ga4', name: string, priority: PullResult['priority'], error: unknown): PullResult {
  return {
    provider,
    name,
    priority,
    status: 'error',
    row_count: 0,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function getCacheCounts() {
  const admin = createSupabaseServiceRoleClient();
  const out: Record<string, number | string | null> = {};
  for (const table of ['growth_gsc_cache', 'growth_ga4_cache']) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('website_id', WEBSITE_ID);
    out[table] = error ? `ERR ${error.message}` : count;
  }
  return out;
}

function toMarkdown(report: {
  generated_at: string;
  mode: string;
  website_id: string;
  window: { from: string; to: string };
  counts: Record<string, number | string | null>;
  pulls: PullResult[];
}) {
  const countRows = Object.entries(report.counts).map(([table, count]) => `| ${table} | ${count} |`).join('\n');
  const pullRows = report.pulls
    .map((pull) => `| ${pull.provider} | ${pull.name} | ${pull.priority} | ${pull.status} | ${pull.row_count} | ${pull.error ?? ''} |`)
    .join('\n');
  return `# Growth Google Cache Populate

Generated: ${report.generated_at}
Mode: ${report.mode}
Website: ${report.website_id}
Window: ${report.window.from} -> ${report.window.to}

## Counts

| Table | Rows |
|---|---:|
${countRows}

## Pulls

| Provider | Pull | Priority | Status | Rows | Error |
|---|---|---|---|---:|---|
${pullRows}
`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
