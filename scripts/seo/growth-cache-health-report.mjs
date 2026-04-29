#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const OUT_DIR = 'artifacts/seo/2026-04-29-growth-cache-health';

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = [
  {
    table: 'growth_gsc_cache',
    provider: 'gsc',
    freshnessHours: 24,
    timeColumns: ['fetched_at', 'created_at'],
    columns: ['cache_key', 'cache_tag', 'fetched_at', 'expires_at', 'payload'],
  },
  {
    table: 'growth_ga4_cache',
    provider: 'ga4',
    freshnessHours: 6,
    timeColumns: ['fetched_at', 'created_at'],
    columns: ['cache_key', 'cache_tag', 'fetched_at', 'expires_at', 'payload'],
  },
  {
    table: 'growth_dataforseo_cache',
    provider: 'dataforseo',
    freshnessHours: 24 * 7,
    timeColumns: ['fetched_at', 'created_at'],
    columns: ['endpoint', 'cache_key', 'cache_tag', 'fetched_at', 'expires_at', 'payload'],
  },
  {
    table: 'seo_audit_findings',
    provider: 'dataforseo-normalized',
    freshnessHours: 24 * 7,
    timeColumns: ['fetched_at', 'captured_at', 'updated_at', 'created_at'],
    columns: [
      'public_url',
      'finding_type',
      'severity',
      'status',
      'source',
      'fetched_at',
      'captured_at',
      'updated_at',
      'created_at',
      'crawl_task_id',
      'finding_fingerprint',
      'evidence',
    ],
  },
  {
    table: 'seo_audit_results',
    provider: 'dataforseo-normalized',
    freshnessHours: 24 * 7,
    timeColumns: ['created_at', 'updated_at', 'audit_date', 'fetched_at'],
    columns: [
      'page_url',
      'audit_date',
      'source',
      'crawl_task_id',
      'created_at',
      'updated_at',
      'fetched_at',
      'issue_count_critical',
      'issue_count_warning',
      'issue_count_info',
    ],
  },
  {
    table: 'funnel_events',
    provider: 'tracking',
    freshnessHours: 24 * 7,
    timeColumns: ['occurred_at', 'created_at'],
    columns: ['event_id', 'event_name', 'stage', 'channel', 'occurred_at', 'created_at', 'locale', 'market'],
  },
  {
    table: 'meta_conversion_events',
    provider: 'tracking',
    freshnessHours: 24 * 7,
    timeColumns: ['event_time', 'sent_at', 'updated_at', 'created_at'],
    columns: ['provider', 'event_name', 'event_id', 'status', 'event_time', 'sent_at', 'created_at', 'updated_at'],
  },
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const tables = [];
  for (const spec of TABLES) {
    tables.push(await inspectTable(spec));
  }

  const gscSearchAppearance = await inspectGscSearchAppearance();
  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    status: rollupStatus(tables, gscSearchAppearance),
    tables,
    gsc_search_appearance_discovery: gscSearchAppearance,
  };

  await fs.writeFile(path.join(OUT_DIR, 'growth-cache-health-report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'growth-cache-health-report.md'), toMarkdown(report));

  console.log(JSON.stringify({
    outDir: OUT_DIR,
    status: report.status,
    tables: tables.map(({ table, status, row_count, latest_at, age_hours }) => ({
      table,
      status,
      row_count,
      latest_at,
      age_hours,
    })),
    gsc_search_appearance_discovery: gscSearchAppearance.status,
  }, null, 2));
}

async function inspectTable(spec) {
  const countResult = await countRows(spec.table);
  if (countResult.error) {
    return {
      table: spec.table,
      provider: spec.provider,
      status: 'ERROR',
      row_count: null,
      error: countResult.error,
      freshness_sla_hours: spec.freshnessHours,
    };
  }

  const availableColumns = [];
  for (const column of spec.columns) {
    if (await supportsColumn(spec.table, column)) availableColumns.push(column);
  }
  const timeColumn = spec.timeColumns.find((column) => availableColumns.includes(column)) ?? null;
  const rows = timeColumn ? await latestRows(spec.table, availableColumns, timeColumn) : { rows: [], error: null };
  const latest = rows.rows[0] ?? null;
  const latestAt = latest ? latest[timeColumn] : null;
  const ageHours = ageInHours(latestAt);
  const expired = availableColumns.includes('expires_at') ? await countExpired(spec.table) : { count: null, error: null };
  const rowCount = countResult.count ?? 0;

  return {
    table: spec.table,
    provider: spec.provider,
    status: statusFor(rowCount, ageHours, spec.freshnessHours, rows.error ?? expired.error),
    row_count: rowCount,
    freshness_sla_hours: spec.freshnessHours,
    latest_at: latestAt,
    latest_time_column: timeColumn,
    age_hours: ageHours,
    expired_rows: expired.count,
    available_identity_columns: availableColumns.filter((column) =>
      ['crawl_task_id', 'finding_fingerprint'].includes(column),
    ),
    recent: rows.rows.slice(0, 5).map(summarizeRow),
    error: rows.error ?? expired.error ?? undefined,
  };
}

async function countRows(table) {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('website_id', websiteId);
  return { count, error: error?.message ?? null };
}

async function countExpired(table) {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('website_id', websiteId)
    .lt('expires_at', new Date().toISOString());
  return { count, error: error?.message ?? null };
}

async function supportsColumn(table, column) {
  const { error } = await sb.from(table).select(column).limit(1);
  return !error;
}

async function latestRows(table, columns, timeColumn) {
  const { data, error } = await sb
    .from(table)
    .select(columns.join(','))
    .eq('website_id', websiteId)
    .order(timeColumn, { ascending: false, nullsFirst: false })
    .limit(10);
  return { rows: data ?? [], error: error?.message ?? null };
}

async function inspectGscSearchAppearance() {
  const { data, error } = await sb
    .from('growth_gsc_cache')
    .select('cache_key,cache_tag,fetched_at,expires_at,payload')
    .eq('website_id', websiteId)
    .ilike('cache_key', '%searchAppearance%')
    .order('fetched_at', { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    return {
      status: 'WATCH',
      implementation: 'client path added in scripts/seo/populate-growth-google-cache.ts',
      cache_key: null,
      row_count: 0,
      note: `Unable to inspect growth_gsc_cache searchAppearance rows: ${error.message}`,
    };
  }

  const discoveryRows = (data ?? []).map(summarizeRow);
  const standalone = discoveryRows.find((row) => row.cache_key?.includes('|searchAppearance|'));
  const pageCombined = discoveryRows.find((row) => row.cache_key?.includes('page,searchAppearance'));

  if (standalone) {
    return {
      status: standalone.row_count > 0 ? 'PASS' : 'WATCH',
      implementation: 'standalone cache key present',
      cache_key: standalone.cache_key,
      row_count: standalone.row_count,
      note: standalone.row_count > 0
        ? 'Standalone GSC searchAppearance discovery is persisted in growth_gsc_cache.'
        : 'Standalone discovery ran but returned zero rows for the property/window.',
    };
  }

  return {
    status: 'WATCH',
    implementation: 'client path added in scripts/seo/populate-growth-google-cache.ts',
    cache_key: pageCombined?.cache_key ?? null,
    row_count: pageCombined?.row_count ?? 0,
    note: 'Run populate-growth-google-cache.ts with --apply --force to persist standalone searchAppearance discovery.',
  };
}

function summarizeRow(row) {
  const payloadRows = payloadRowCount(row.payload);
  return {
    cache_key: row.cache_key,
    cache_tag: row.cache_tag,
    endpoint: row.endpoint,
    fetched_at: row.fetched_at,
    expires_at: row.expires_at,
    public_url: row.public_url,
    page_url: row.page_url,
    finding_type: row.finding_type,
    severity: row.severity,
    source: row.source,
    status: row.status,
    event_name: row.event_name,
    stage: row.stage,
    channel: row.channel,
    occurred_at: row.occurred_at,
    event_time: row.event_time,
    crawl_task_id: row.crawl_task_id ?? row.evidence?.crawl_task_id,
    finding_fingerprint: row.finding_fingerprint ?? row.evidence?.finding_fingerprint,
    row_count: payloadRows,
  };
}

function payloadRowCount(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.rows)) return payload.rows.length;
  if (Array.isArray(payload?.tasks)) return payload.tasks.length;
  if (Array.isArray(payload?.result)) return payload.result.length;
  return null;
}

function statusFor(rowCount, ageHours, freshnessHours, error) {
  if (error) return 'ERROR';
  if (rowCount === 0) return 'EMPTY';
  if (ageHours === null) return 'WATCH';
  if (ageHours <= freshnessHours) return 'PASS';
  if (ageHours <= freshnessHours * 2) return 'WATCH';
  return 'BLOCK';
}

function rollupStatus(tables, gscSearchAppearance) {
  if (tables.some((table) => table.status === 'ERROR' || table.status === 'BLOCK')) return 'BLOCK';
  if (tables.some((table) => table.status === 'EMPTY' || table.status === 'WATCH')) return 'WATCH';
  if (gscSearchAppearance.status !== 'PASS') return 'WATCH';
  return 'PASS';
}

function ageInHours(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Number(((Date.now() - timestamp) / (1000 * 60 * 60)).toFixed(2));
}

function toMarkdown(report) {
  const tableRows = report.tables
    .map((row) => `| ${row.table} | ${row.status} | ${row.row_count ?? 'n/a'} | ${row.latest_at ?? 'n/a'} | ${row.age_hours ?? 'n/a'} | ${row.expired_rows ?? 'n/a'} | ${row.error ?? ''} |`)
    .join('\n');

  return `# Growth Cache Health Report

Generated: ${report.generated_at}
Website: ${report.website_id}
Status: ${report.status}

## Freshness

| Table | Status | Rows | Latest | Age hours | Expired rows | Error |
|---|---|---:|---|---:|---:|---|
${tableRows}

## GSC Search Appearance Discovery

| Field | Value |
|---|---|
| Status | ${report.gsc_search_appearance_discovery.status} |
| Implementation | ${report.gsc_search_appearance_discovery.implementation} |
| Cache key | ${report.gsc_search_appearance_discovery.cache_key ?? 'n/a'} |
| Rows | ${report.gsc_search_appearance_discovery.row_count} |
| Note | ${report.gsc_search_appearance_discovery.note} |
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (arg.startsWith('--website-id=')) parsed.websiteId = arg.slice('--website-id='.length);
  }
  return parsed;
}
