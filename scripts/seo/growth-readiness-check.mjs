#!/usr/bin/env node
/**
 * Growth Readiness Integration Health Check
 *
 * Pings GSC, GA4, DataForSEO, AI (OpenRouter/NVIDIA), Supabase SEO tables for a given website.
 * Emits JSON report under docs/evidence/growth-readiness/integration-health-YYYY-MM-DD.json
 *
 * Usage:
 *   node scripts/seo/growth-readiness-check.mjs --website-id=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.slice(2).split('=');
      return [k, rest.join('=')];
    })
);

const WEBSITE_ID = args['website-id'] ?? '894545b7-73ca-4dae-b76a-da5b6a3f8441';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

async function timed(name, fn) {
  const t0 = Date.now();
  try {
    const data = await fn();
    results.push({ name, status: 'pass', latencyMs: Date.now() - t0, ...data });
  } catch (err) {
    results.push({
      name,
      status: 'fail',
      latencyMs: Date.now() - t0,
      error: err.message ?? String(err),
    });
  }
}

async function checkSupabaseTables() {
  const tables = [
    'seo_render_snapshots',
    'seo_audit_findings',
    'seo_keywords',
    'seo_keyword_snapshots',
    'seo_keyword_research_runs',
    'seo_keyword_candidates',
    'seo_page_metrics_daily',
    'seo_ga4_page_metrics',
    'seo_content_clusters',
    'seo_cluster_metrics_daily',
    'seo_optimization_briefs',
    'seo_optimizer_actions',
    'seo_transcreation_jobs',
    'seo_localized_variants',
    'seo_item_overlays',
    'seo_gsc_credentials',
  ];
  const byTable = {};
  for (const t of tables) {
    try {
      const { count, error } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .eq('website_id', WEBSITE_ID);
      if (error && !/does not exist/i.test(error.message)) {
        byTable[t] = { count: null, error: error.message };
      } else {
        byTable[t] = { count: count ?? 0 };
      }
    } catch (e) {
      byTable[t] = { count: null, error: e.message };
    }
  }
  return { tables: byTable };
}

async function checkGscCreds() {
  const { data, error } = await supabase
    .from('seo_gsc_credentials')
    .select('provider, access_token, site_url, property_id, token_expiry, last_error')
    .eq('website_id', WEBSITE_ID);
  if (error) throw new Error(error.message);
  const gsc = data?.find((d) => d.provider === 'gsc');
  const ga4 = data?.find((d) => d.provider === 'ga4');
  return {
    gsc: {
      connected: !!gsc?.access_token,
      configured: !!gsc?.access_token && !!gsc?.site_url,
      siteUrl: gsc?.site_url ?? null,
      expiresAt: gsc?.token_expiry ?? null,
      lastError: gsc?.last_error ?? null,
    },
    ga4: {
      connected: !!ga4?.access_token,
      configured: !!ga4?.access_token && !!ga4?.property_id,
      propertyId: ga4?.property_id ?? null,
      expiresAt: ga4?.token_expiry ?? null,
      lastError: ga4?.last_error ?? null,
    },
  };
}

async function checkFreshness() {
  const out = {};
  for (const table of ['seo_keyword_snapshots', 'seo_page_metrics_daily', 'seo_ga4_page_metrics']) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('website_id, created_at, updated_at, fetched_at')
        .eq('website_id', WEBSITE_ID)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (error && !/does not exist|column .* does not exist/i.test(error.message)) throw new Error(error.message);
      const row = data?.[0];
      const latest = row?.updated_at ?? row?.created_at ?? row?.fetched_at ?? null;
      const ageDays = latest ? (Date.now() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24) : null;
      out[table] = { latest, ageDays };
    } catch (e) {
      out[table] = { error: e.message };
    }
  }
  return out;
}

async function checkDataForSeoPing() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return { status: 'missing_creds', note: 'DATAFORSEO_LOGIN/PASSWORD not set' };
  }
  const basic = Buffer.from(`${login}:${password}`).toString('base64');
  const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });
  const json = await res.json().catch(() => null);
  const money = json?.tasks?.[0]?.result?.[0]?.money ?? null;
  return {
    httpStatus: res.status,
    apiStatusCode: json?.status_code ?? null,
    apiStatusMessage: json?.status_message ?? null,
    balance: money?.balance ?? null,
    total: money?.total ?? null,
    note: 'Credentials valid but backend endpoints NOT wired into app (flag includeDataForSeo is noop)',
  };
}

async function checkAiPing() {
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  const token = process.env.OPENROUTER_AUTH_TOKEN;
  const model = process.env.OPENROUTER_MODEL;
  if (!baseUrl || !token || !model) {
    return { status: 'missing_creds', note: 'OPENROUTER_{BASE_URL,AUTH_TOKEN,MODEL} not all set' };
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 8,
      temperature: 0,
    }),
  });
  const json = await res.json().catch(() => null);
  const usage = json?.usage ?? null;
  return {
    httpStatus: res.status,
    model,
    content: json?.choices?.[0]?.message?.content ?? null,
    usage,
  };
}

async function checkGscRealPing() {
  const creds = await checkGscCreds();
  if (!creds.gsc.configured) return { status: 'skipped', note: 'GSC not configured' };
  return { status: 'creds_ok', ...creds.gsc };
}

async function run() {
  console.log(`[growth-readiness-check] websiteId=${WEBSITE_ID}`);

  await timed('supabase_tables', checkSupabaseTables);
  await timed('gsc_credentials', checkGscCreds);
  await timed('ga4_credentials', checkGscCreds);
  await timed('freshness', checkFreshness);
  await timed('dataforseo_ping', checkDataForSeoPing);
  await timed('ai_ping', checkAiPing);
  await timed('gsc_real_ping', checkGscRealPing);

  const readiness = computeReadiness(results);
  const report = {
    websiteId: WEBSITE_ID,
    generatedAt: new Date().toISOString(),
    readiness,
    checks: results,
  };

  const date = new Date().toISOString().slice(0, 10);
  const outDir = join(REPO_ROOT, 'docs/evidence/growth-readiness');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `integration-health-${date}.json`);
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`[growth-readiness-check] readiness=${readiness} written=${outFile}`);
}

function computeReadiness(checks) {
  const byName = Object.fromEntries(checks.map((c) => [c.name, c]));
  const gsc = byName.gsc_credentials;
  const ai = byName.ai_ping;
  const sb = byName.supabase_tables;
  const df = byName.dataforseo_ping;
  const core =
    gsc?.gsc?.configured &&
    ai?.httpStatus === 200 &&
    sb?.tables?.seo_gsc_credentials?.count > 0;
  if (!core) return 'not_ready';
  const expanded = core && df?.httpStatus === 200;
  return expanded ? 'ready_partial_dataforseo_unwired' : 'partial';
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
