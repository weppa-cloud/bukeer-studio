#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_TASK_ID = '04290125-1574-0216-0000-00a1195b1ba0';
const DEFAULT_ARTIFACT_DIR = 'artifacts/seo/2026-04-28-dataforseo-onpage-full';
const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_MARKET = 'CO';

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === 'true';
const dryRun = !apply;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const taskId = args.taskId ?? DEFAULT_TASK_ID;
const artifactDir = args.artifactDir ?? DEFAULT_ARTIFACT_DIR;
const reportPath = args.reportPath ?? path.join(artifactDir, 'p0-p1-report.json');
const pagesPath = args.pagesPath ?? path.join(artifactDir, 'pages-all.json');
const summaryPath = args.summaryPath ?? path.join(artifactDir, 'summary-latest.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pages = readJson(pagesPath);
  const report = fs.existsSync(reportPath) ? readJson(reportPath) : buildReportFromPages(pages);
  const summary = fs.existsSync(summaryPath) ? readJson(summaryPath) : null;
  const generatedAt = report.generated_at ?? new Date().toISOString();
  const auditDate = generatedAt.slice(0, 10);
  const p0 = Array.isArray(report.p0) ? report.p0 : [];
  const p1 = Array.isArray(report.p1) ? report.p1 : [];
  const watch = Array.isArray(report.watch) ? report.watch : [];

  const findings = [
    ...p0.flatMap((item) => buildFindings(item, 'P0')),
    ...p1.flatMap((item) => buildFindings(item, 'P1')),
    ...watch.slice(0, Number(args.watchLimit ?? 50)).flatMap((item) => buildFindings(item, 'WATCH')),
  ];

  const results = uniqueBy(
    pages.map((item) => buildAuditResult(item, auditDate)),
    (row) => `${row.website_id}|${row.page_url}|${row.audit_date}`,
  );
  const actionableUrls = new Set(findings.map((finding) => finding.public_url));
  const inventoryRows = [...actionableUrls].map((url) => buildInventoryRow(url, findings.filter((f) => f.public_url === url)));

  const output = {
    mode: dryRun ? 'dry-run' : 'apply',
    taskId,
    artifactDir,
    pages: pages.length,
    auditResults: results.length,
    findings: findings.length,
    inventoryRows: inventoryRows.length,
    counts: report.counts ?? {},
  };

  if (dryRun) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const supportsFindingRunColumns = await supportsColumns('seo_audit_findings', ['crawl_task_id', 'finding_fingerprint']);

  await deleteExistingRun(taskId);

  const snapshotByUrl = await insertSnapshots(pages, generatedAt, summary);
  await insertAuditResults(results);
  await insertFindings(findings, snapshotByUrl, supportsFindingRunColumns, generatedAt);
  await upsertInventory(inventoryRows);

  console.log(JSON.stringify({ ...output, applied: true, supportsFindingRunColumns }, null, 2));
}

function buildReportFromPages(pages) {
  const out = {
    generated_at: new Date().toISOString(),
    counts: {
      source: 'generated_from_pages_all',
      total: pages.length,
      p0: 0,
      p1: 0,
      watch: 0,
    },
    p0: [],
    p1: [],
    watch: [],
  };

  for (const item of pages) {
    const types = issueTypesForPage(item);
    const severities = types.map(severityForType);
    if (severities.includes('critical')) {
      out.p0.push(item);
    } else if (severities.includes('warning')) {
      out.p1.push(item);
    } else {
      out.watch.push(item);
    }
  }
  out.counts.p0 = out.p0.length;
  out.counts.p1 = out.p1.length;
  out.counts.watch = out.watch.length;
  return out;
}

async function deleteExistingRun(runId) {
  await sb.from('seo_audit_results').delete().eq('website_id', websiteId).eq('crawl_task_id', runId);
  await sb.from('seo_render_snapshots').delete().eq('website_id', websiteId).eq('source', 'dataforseo:on_page');

  const { data: existing } = await sb
    .from('seo_audit_findings')
    .select('id,evidence')
    .eq('website_id', websiteId)
    .eq('source', 'dataforseo:on_page');

  const ids = (existing ?? [])
    .filter((row) => row.evidence?.crawl_task_id === runId)
    .map((row) => row.id);
  if (ids.length > 0) {
    await sb.from('seo_audit_findings').delete().in('id', ids);
  }
}

async function insertSnapshots(pages, fetchedAt, summary) {
  const rows = pages.map((item) => {
    const meta = item.meta ?? {};
    const url = normalizeUrl(item.url);
    return {
      website_id: websiteId,
      locale: inferLocale(url),
      page_type: inferPageType(url),
      page_id: null,
      public_url: url,
      title: cleanText(meta.title),
      meta_description: cleanText(meta.description),
      canonical_url: cleanText(meta.canonical) || url,
      hreflang: {},
      headings: meta.h1 ? [meta.h1].filter(Boolean) : [],
      visible_text: cleanText(meta.description || meta.title || ''),
      internal_links: [],
      schema_types: [],
      source: 'dataforseo:on_page',
      fetched_at: fetchedAt,
      confidence: 'live',
      captured_at: fetchedAt,
    };
  });

  const inserted = await insertChunks('seo_render_snapshots', rows, 'id,public_url');
  const out = new Map();
  for (const row of inserted.flat()) out.set(normalizeUrl(row.public_url), row.id);
  return out;
}

async function insertAuditResults(rows) {
  await insertChunks('seo_audit_results', rows);
}

async function insertFindings(findings, snapshotByUrl, supportsRunColumns, fetchedAt) {
  const rows = findings
    .map((finding) => {
      const snapshotId = snapshotByUrl.get(normalizeUrl(finding.public_url));
      if (!snapshotId) return null;
      const row = {
        website_id: websiteId,
        snapshot_id: snapshotId,
        locale: inferLocale(finding.public_url),
        page_type: inferPageType(finding.public_url),
        page_id: null,
        public_url: finding.public_url,
        finding_type: finding.finding_type,
        severity: finding.severity,
        status: 'open',
        title: finding.title,
        description: finding.description,
        evidence: finding.evidence,
        source: 'dataforseo:on_page',
        fetched_at: fetchedAt,
        confidence: 'live',
        decay_signal: 'none',
        priority_score: finding.priority_score,
        captured_at: fetchedAt,
        decision_grade_ready: true,
      };
      if (supportsRunColumns) {
        row.crawl_task_id = taskId;
        row.finding_fingerprint = finding.evidence.finding_fingerprint;
      }
      return row;
    })
    .filter(Boolean);
  await insertChunks('seo_audit_findings', rows);
}

async function upsertInventory(rows) {
  for (const chunk of chunks(rows, 100)) {
    const { error } = await sb.from('growth_inventory').upsert(chunk, { onConflict: 'website_id,source_url' });
    if (error) throw new Error(`growth_inventory upsert failed: ${error.message}`);
  }
}

async function insertChunks(table, rows, selectColumns = null) {
  const out = [];
  for (const chunk of chunks(rows, 100)) {
    let query = sb.from(table).insert(chunk);
    if (selectColumns) query = query.select(selectColumns);
    const { data, error } = await query;
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    if (data) out.push(data);
  }
  return out;
}

async function supportsColumns(table, columns) {
  const { error } = await sb.from(table).select(columns.join(',')).limit(1);
  return !error;
}

function buildAuditResult(item, auditDate) {
  const issues = issueTypesForPage(item).map((type) => ({
    type,
    severity: severityForType(type),
  }));
  return {
    website_id: websiteId,
    page_url: normalizeUrl(item.url),
    page_type: 'static',
    audit_date: auditDate,
    performance_score: null,
    lcp_ms: null,
    cls_score: null,
    issue_count_critical: issues.filter((i) => i.severity === 'critical').length,
    issue_count_warning: issues.filter((i) => i.severity === 'warning').length,
    issue_count_info: issues.filter((i) => i.severity === 'info').length,
    audit_duration_ms: null,
    last_error: item.status_code === 0 ? 'DataForSEO status 0 / broken fetch' : null,
    onpage_score: numberOrNull(item.onpage_score),
    crawl_task_id: taskId,
    source: 'dataforseo:on_page',
    issues,
  };
}

function buildFindings(item, bucket) {
  const url = normalizeUrl(item.url);
  const types = issueTypesForPage(item, bucket);
  return types.map((type) => {
    const severity = bucket === 'P0' ? 'critical' : bucket === 'P1' ? 'warning' : 'info';
    const fingerprint = sha256(`${url}|${type}|dataforseo:on_page`);
    return {
      public_url: url,
      finding_type: type,
      severity,
      title: titleForType(type),
      description: descriptionForType(type, item),
      priority_score: priorityFor(bucket, type, item),
      evidence: {
        crawl_task_id: taskId,
        finding_fingerprint: fingerprint,
        bucket,
        status_code: item.status_code ?? null,
        title: item.title ?? item.meta?.title ?? null,
        description: item.description ?? item.meta?.description ?? null,
        canonical: item.canonical ?? item.meta?.canonical ?? null,
        checks: item.checks ?? {},
        url,
      },
    };
  });
}

function issueTypesForPage(item, bucket = null) {
  const checks = item.checks ?? {};
  const meta = item.meta ?? {};
  const title = cleanText(item.title ?? meta.title);
  const description = cleanText(item.description ?? meta.description);
  const canonical = cleanText(item.canonical ?? meta.canonical);
  const statusCode = Number(item.status_code ?? 0);
  const types = [];

  if (statusCode === 0 || checks.is_broken) types.push('broken_fetch');
  if (statusCode >= 400 && statusCode < 500) types.push('http_4xx');
  if (statusCode >= 500) types.push('http_5xx');
  if (statusCode === 200 && /post (no encontrado|not found)/i.test(title)) types.push('visual_404_200');
  if (statusCode === 200 && !canonical) types.push('missing_canonical');
  if (checks.canonical_to_broken) types.push('canonical_to_broken');
  if (checks.canonical_to_redirect) types.push('canonical_to_redirect');
  if (checks.redirect_chain) types.push('redirect_chain');
  if (checks.is_orphan_page) types.push('orphan_page');
  if (statusCode === 200 && (!title || checks.no_title)) types.push('missing_title');
  if (statusCode === 200 && (!description || checks.no_description)) types.push('missing_description');
  if (statusCode === 200 && (checks.title_too_long || title.length > 60)) types.push('title_too_long');
  if (checks.no_h1_tag) types.push('missing_h1');
  if (checks.has_micromarkup_errors) types.push('schema_error');
  if (checks.no_image_alt) types.push('image_alt_missing');
  if (checks.high_loading_time || checks.high_waiting_time) types.push('slow_page');

  if (bucket === 'WATCH' && types.length === 0) {
    if (checks.is_redirect) types.push('redirect_watch');
    else if (statusCode === 200) types.push('technical_watch');
  }
  return Array.from(new Set(types));
}

function buildInventoryRow(url, urlFindings) {
  const worst = urlFindings.some((f) => f.severity === 'critical') ? 'blocked' : 'pass_with_watch';
  const p0 = urlFindings.filter((f) => f.severity === 'critical').length;
  const p1 = urlFindings.filter((f) => f.severity === 'warning').length;
  const watch = urlFindings.filter((f) => f.severity === 'info').length;
  const priority = p0 * 1000 + p1 * 250 + watch * 25;
  const ownerIssue = p0 || p1 ? '#313' : '#321';
  return {
    account_id: accountId,
    website_id: websiteId,
    locale: inferLocale(url),
    market: inferMarket(url),
    source_url: url,
    canonical_url: url,
    template_type: inferTemplateType(url),
    cluster: inferCluster(url),
    intent: inferIntent(url),
    funnel_stage: 'acquisition',
    channel: 'seo',
    gsc_clicks_28d: 0,
    gsc_impressions_28d: 0,
    gsc_ctr: 0,
    gsc_avg_position: 0,
    ga4_sessions_28d: 0,
    ga4_engagement: 0,
    technical_status: worst,
    content_status: 'unknown',
    conversion_status: 'unknown',
    attribution_status: 'unknown',
    status: p0 ? 'queued' : 'idea',
    priority_score: priority,
    owner: p0 || p1 ? 'A4 SEO' : 'A5 Growth Ops',
    owner_issue: ownerIssue,
    success_metric: p0 || p1 ? 'Finding resolved in next comparable crawl' : null,
    baseline_start: null,
    baseline_end: null,
    next_action: `DataForSEO ${taskId}: P0=${p0}, P1=${p1}, WATCH=${watch}. Normalize and validate in next crawl.`,
    result: 'pending',
    updated_at: new Date().toISOString(),
  };
}

function inferLocale(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith('/en/') ? 'en-US' : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function inferMarket(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes('mexico') || lower.includes('mexicanos')) return 'MX';
  if (lower.includes('/en/')) return 'US';
  return DEFAULT_MARKET;
}

function inferPageType(url) {
  const pathName = safePath(url);
  if (pathName === '/') return 'home';
  if (pathName.includes('/blog/')) return 'blog';
  if (pathName.includes('/paquetes') || pathName.includes('/l/')) return 'package';
  if (pathName.includes('/actividades')) return 'activity';
  if (pathName.includes('/destin')) return 'destination';
  return 'page';
}

function inferTemplateType(url) {
  const pageType = inferPageType(url);
  return ['home', 'destination', 'package', 'activity', 'blog'].includes(pageType) ? pageType : 'other';
}

function inferCluster(url) {
  const pathName = safePath(url);
  if (pathName.includes('/blog/')) return 'blog';
  if (pathName.includes('/paquetes') || pathName.includes('/l/')) return 'packages';
  if (pathName.includes('/actividades')) return 'activities';
  if (pathName.includes('mexico') || pathName.includes('mexicanos')) return 'mexico';
  if (pathName.includes('/en/')) return 'en-us';
  return 'technical-seo';
}

function inferIntent(url) {
  const pageType = inferPageType(url);
  if (pageType === 'package' || pageType === 'activity') return 'commercial';
  if (pageType === 'blog') return 'informational';
  return 'mixed';
}

function safePath(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '/';
  }
}

function titleForType(type) {
  return ({
    broken_fetch: 'Broken fetch in DataForSEO crawl',
    http_4xx: 'HTTP 4xx page',
    http_5xx: 'HTTP 5xx page',
    visual_404_200: 'Soft 404 content served with HTTP 200',
    missing_canonical: 'Missing canonical URL',
    canonical_to_broken: 'Canonical points to broken URL',
    canonical_to_redirect: 'Canonical points to redirect',
    redirect_chain: 'Redirect chain detected',
    orphan_page: 'Orphan page detected',
    missing_title: 'Missing title',
    missing_description: 'Missing meta description',
    title_too_long: 'Title too long',
    missing_h1: 'Missing H1',
    schema_error: 'Structured data error',
    image_alt_missing: 'Image alt text missing',
    slow_page: 'Slow page signal',
    redirect_watch: 'Redirect watch item',
    technical_watch: 'Technical watch item',
  })[type] ?? type;
}

function descriptionForType(type, item) {
  return `${titleForType(type)}. DataForSEO status=${item.status_code ?? 'n/a'} url=${normalizeUrl(item.url)}.`;
}

function severityForType(type) {
  if (['broken_fetch', 'http_5xx', 'visual_404_200', 'canonical_to_broken'].includes(type)) return 'critical';
  if (['http_4xx', 'missing_canonical', 'canonical_to_redirect', 'missing_title', 'missing_description', 'title_too_long'].includes(type)) return 'warning';
  return 'info';
}

function priorityFor(bucket, type, item) {
  const base = bucket === 'P0' ? 1000 : bucket === 'P1' ? 250 : 25;
  const statusBoost = Number(item.status_code ?? 0) === 200 ? 10 : 0;
  return base + statusBoost;
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return String(value ?? '');
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function chunks(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function uniqueBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) map.set(keyFn(row), row);
  return [...map.values()];
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) i += 1;
  }
  return parsed;
}
