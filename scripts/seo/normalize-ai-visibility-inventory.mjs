#!/usr/bin/env node
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_BASE_URL = 'https://colombiatours.travel';

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === 'true';
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const runTag = args.runTag;
const runId = args.runId;
const baseUrl = (args.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

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
  const run = await resolveRun();
  const { data: facts, error } = await sb
    .from('seo_ai_visibility_facts')
    .select('*')
    .eq('run_id', run.id);
  if (error) throw new Error(`seo_ai_visibility_facts read failed: ${error.message}`);

  const rows = buildInventoryRows(run, facts ?? []);
  const output = {
    mode: apply ? 'apply' : 'dry-run',
    run_id: run.id,
    run_tag: run.run_tag,
    facts: facts?.length ?? 0,
    inventory_rows: rows.length,
    rows: rows.map((row) => ({
      source_url: row.source_url,
      locale: row.locale,
      market: row.market,
      cluster: row.cluster,
      intent: row.intent,
      priority_score: row.priority_score,
      content_status: row.content_status,
      next_action: row.next_action,
    })),
  };

  if (!apply) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  for (const chunk of chunks(rows, 100)) {
    const { error: upsertError } = await sb
      .from('growth_inventory')
      .upsert(chunk, { onConflict: 'website_id,source_url' });
    if (upsertError) throw new Error(`growth_inventory upsert failed: ${upsertError.message}`);
  }

  console.log(JSON.stringify({ ...output, applied: true }, null, 2));
}

async function resolveRun() {
  let query = sb
    .from('seo_ai_visibility_runs')
    .select('*')
    .eq('website_id', websiteId)
    .order('started_at', { ascending: false })
    .limit(1);
  if (runId) query = query.eq('id', runId);
  if (runTag) query = query.eq('run_tag', runTag);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`seo_ai_visibility_runs read failed: ${error.message}`);
  if (!data) throw new Error('No seo_ai_visibility_runs row found');
  return data;
}

function buildInventoryRows(run, facts) {
  const byPrompt = new Map();
  for (const fact of facts) {
    const current = byPrompt.get(fact.prompt_id) ?? [];
    current.push(fact);
    byPrompt.set(fact.prompt_id, current);
  }

  return [...byPrompt.entries()].map(([promptId, promptFacts]) => {
    const first = promptFacts[0];
    const mentioned = promptFacts.some((fact) => fact.mentioned);
    const cited = promptFacts.some((fact) => fact.cited);
    const sourceDomains = unique(promptFacts.map((fact) => fact.source_domain).filter(Boolean));
    const ownedUrls = unique(promptFacts.map((fact) => cleanOwnedUrl(fact.owned_url)).filter(Boolean));
    const competitorDomains = unique(promptFacts.flatMap((fact) => Array.isArray(fact.competitor_domains) ? fact.competitor_domains : []))
      .filter((domain) => domain && !domain.endsWith(run.target_domain))
      .slice(0, 10);
    const visibilityScore = Math.max(...promptFacts.map((fact) => Number(fact.visibility_score ?? 0)), 0);
    const priorityScore = priorityFor({ mentioned, cited, competitorDomains, intent: first.prompt_intent });
    const action = nextActionFor({ mentioned, cited, ownedUrls, competitorDomains, prompt: first.prompt });
    const sourceUrl = ownedUrls[0] ?? `${baseUrl}/?ai_search_prompt=${encodeURIComponent(promptId)}`;

    return {
      account_id: accountId,
      website_id: websiteId,
      locale: first.locale,
      market: normalizeMarket(first.market),
      source_url: sourceUrl,
      canonical_url: ownedUrls[0] ?? baseUrl,
      template_type: inferTemplateType(ownedUrls[0]),
      cluster: first.keyword_cluster,
      intent: normalizeIntent(first.prompt_intent),
      funnel_stage: 'acquisition',
      channel: 'ai_search',
      gsc_clicks_28d: 0,
      gsc_impressions_28d: 0,
      gsc_ctr: 0,
      gsc_avg_position: 0,
      ga4_sessions_28d: 0,
      ga4_engagement: 0,
      waflow_opens: 0,
      waflow_submits: 0,
      whatsapp_clicks: 0,
      qualified_leads: 0,
      quotes_sent: 0,
      bookings_confirmed: 0,
      booking_value: 0,
      gross_margin: 0,
      hypothesis: `If ColombiaTours improves AI search coverage for "${first.prompt}", then AI visibility and assisted organic discovery should improve for ${first.market}/${first.locale}.`,
      experiment_id: null,
      ICE_score: null,
      RICE_score: null,
      success_metric: 'AI visibility facts: mentioned=true and cited=true on next comparable run',
      baseline_start: run.started_at,
      baseline_end: run.finished_at ?? run.started_at,
      owner: 'Growth Council',
      owner_issue: '#365',
      change_shipped_at: null,
      evaluation_date: evaluationDate(run.finished_at ?? run.started_at),
      result: 'pending',
      learning: null,
      next_action: action,
      technical_status: 'pass_with_watch',
      content_status: mentioned && cited ? 'pass_with_watch' : 'blocked',
      conversion_status: 'unknown',
      attribution_status: 'unknown',
      status: mentioned && cited ? 'idea' : 'queued',
      priority_score: priorityScore,
      updated_at: new Date().toISOString(),
    };
  });
}

function priorityFor({ mentioned, cited, competitorDomains, intent }) {
  let score = 35;
  if (!mentioned) score += 25;
  if (mentioned && !cited) score += 15;
  if (cited) score += 5;
  if (competitorDomains.length > 0) score += Math.min(15, competitorDomains.length * 3);
  if (['commercial', 'transactional'].includes(intent)) score += 15;
  return Math.min(100, score);
}

function nextActionFor({ mentioned, cited, ownedUrls, competitorDomains, prompt }) {
  if (!mentioned) {
    return `Create or strengthen an entity/content brief for AI prompt "${prompt}". Competitor/source domains observed: ${competitorDomains.slice(0, 5).join(', ') || 'none'}.`;
  }
  if (!cited) {
    return `ColombiaTours is mentioned but not cited for "${prompt}". Improve source-worthiness, structured content, and third-party corroboration.`;
  }
  return `ColombiaTours is cited for "${prompt}". Monitor next run and connect cited URL to GA4/funnel baseline: ${ownedUrls[0] ?? 'owned URL unavailable'}.`;
}

function inferTemplateType(url) {
  if (!url) return 'landing';
  if (url.includes('/blog/')) return 'blog';
  if (url.includes('/paquetes/')) return 'package';
  if (url.includes('/actividades/')) return 'activity';
  if (url.includes('/destinos/')) return 'destination';
  return 'landing';
}

function cleanOwnedUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return value;
  }
}

function normalizeMarket(value) {
  return ['CO', 'MX', 'US', 'CA', 'EU', 'OTHER'].includes(value) ? value : 'OTHER';
}

function normalizeIntent(value) {
  return ['informational', 'navigational', 'commercial', 'transactional', 'mixed'].includes(value) ? value : 'mixed';
}

function evaluationDate(value) {
  const date = new Date(value);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

function unique(items) {
  return [...new Set(items)];
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
