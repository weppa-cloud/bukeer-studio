#!/usr/bin/env node
/**
 * Transcreate top-N activity SEO overlays es-CO → en-US for colombiatours.travel
 *
 * Run: node scripts/seo/transcreate-top-n-activities.mjs [--dry-run] [--limit 20]
 *
 * NOTE: Activities follow the OVERLAY model (not new-row).
 * Creates/upserts website_product_pages with locale='en-US' containing EN SEO fields.
 * Truth table (activities.name/description) unchanged per ADR-025.
 *
 * Flow per activity:
 *   1. Skip test/pilot entries
 *   2. Check if en-US overlay already exists (skip)
 *   3. Get source fields from activities + es-CO overlay (if any)
 *   4. Pick best en-US keyword candidate
 *   5. Call AI for EN SEO fields only (title, desc, h1, slug, keywords)
 *   6. Upsert website_product_pages locale='en-US'
 *   7. Insert seo_transcreation_jobs + seo_localized_variants
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const SOURCE_LOCALE = 'es-CO';
const TARGET_LOCALE = 'en-US';
const COUNTRY = 'United States';
const LANGUAGE = 'en';
const SERP_META_TITLE_MAX = 60;
const SERP_META_DESC_MAX = 155;
const DELAY_MS = 2000;

// Test/pilot activity IDs to skip
const SKIP_IDS = new Set([
  'a7ccf9fd-4bde-4386-adaa-367af6cd28f7', // Pilot baseline
  '605d4437-c02a-4ace-a10d-4949887dafd8', // Bilingual test
  '2476ffbd-33b8-49d0-ba9e-bea9c981a67e', // Solo español test
  '81f21822-02c3-43d6-b46a-0dfe144963b5', // Activity Empty State (test)
]);

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const sep = raw.indexOf('=');
    if (!raw || raw.trim().startsWith('#') || sep < 0) continue;
    const k = raw.slice(0, sep).trim();
    const v = raw.slice(sep + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, limit: 20, ids: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') { out.dryRun = true; continue; }
    if (args[i] === '--limit' && args[i + 1]) { out.limit = Number(args[++i]) || 20; continue; }
    if (args[i] === '--ids' && args[i + 1]) { out.ids = args[++i].split(',').map(s => s.trim()); continue; }
  }
  return out;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Slug helper ─────────────────────────────────────────────────────────────

function normalizeSlug(input) {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// ─── Keyword helper ──────────────────────────────────────────────────────────

async function pickKeyword(admin, nameHint) {
  const words = nameHint.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3).slice(0, 3);
  // Try each word — return first match
  for (const word of words) {
    const { data } = await admin
      .from('seo_keyword_candidates')
      .select('id,keyword')
      .eq('website_id', WEBSITE_ID)
      .eq('locale', TARGET_LOCALE)
      .eq('confidence', 'live')
      .eq('decision_grade_ready', true)
      .ilike('keyword', `%${word}%`)
      .order('priority_score', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  // Try Colombia/tour generic fallback keywords (relevant to tourism)
  for (const generic of ['colombia tour', 'colombia travel', 'tour colombia']) {
    const gword = generic.split(' ')[0];
    const { data } = await admin
      .from('seo_keyword_candidates')
      .select('id,keyword')
      .eq('website_id', WEBSITE_ID)
      .eq('locale', TARGET_LOCALE)
      .eq('confidence', 'live')
      .eq('decision_grade_ready', true)
      .ilike('keyword', `%${gword}%`)
      .order('priority_score', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null; // no match — caller will proceed without keyword constraint
}

// ─── AI ──────────────────────────────────────────────────────────────────────

function buildPrompt(source, keyword) {
  const kwLine = keyword
    ? `Target keyword: "${keyword}" — include it naturally in meta_title and h1 if relevant to the activity.`
    : `No specific target keyword — focus on accurately translating the activity name and creating compelling English SEO copy.`;
  return [
    `You are a travel SEO specialist. Translate ONLY the SEO metadata fields from Spanish to English for a Colombian tourism activity page.`,
    kwLine,
    ``,
    `RULES:`,
    `- meta_title: max ${SERP_META_TITLE_MAX} chars, natural English, accurately describes THIS activity`,
    `- meta_desc: max ${SERP_META_DESC_MAX} chars, compelling, action-oriented`,
    `- h1: clear English heading for the activity page`,
    `- slug: URL-safe English slug, lowercase, hyphens only, max 80 chars`,
    `- keywords: array of 3-5 English SEO keywords relevant to THIS activity`,
    `- Keep proper nouns unchanged (Cartagena, Medellín, Guatapé, etc.)`,
    `- NEVER use unrelated topics (flights, airlines, etc.) unless the activity is about them`,
    ``,
    `SOURCE (Spanish):`,
    `Activity name: ${source.name || ''}`,
    `SEO Title: ${source.seo_title || source.name || ''}`,
    `SEO Description: ${source.seo_desc || ''}`,
    `Short description: ${source.description_short || ''}`,
    ``,
    `Respond ONLY with this exact JSON, no other text:`,
    `{"schema_version":"2.0","payload_v2":{"meta_title":"...","meta_desc":"...","h1":"...","slug":"...","keywords":["...","...","..."]}}`,
  ].join('\n');
}

async function callAI(prompt) {
  const url = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const token = process.env.OPENROUTER_AUTH_TOKEN;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';
  if (!token) throw new Error('Missing OPENROUTER_AUTH_TOKEN');

  const r = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://colombiatours.travel',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 100)}`);
  return (await r.json()).choices?.[0]?.message?.content ?? null;
}

function parseAI(text) {
  if (!text) return null;
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };
  const d = tryParse(text.trim());
  if (d) return d;
  // fence extraction: first ``` to last ```
  const f = text.indexOf('```'), l = text.lastIndexOf('```');
  if (f >= 0 && l > f) {
    const nl = text.indexOf('\n', f);
    const inner = nl >= 0 && nl < l ? text.slice(nl + 1, l).trim() : text.slice(f + 3, l).trim();
    const d2 = tryParse(inner);
    if (d2) return d2;
    const s = inner.indexOf('{'), e = inner.lastIndexOf('}');
    if (s >= 0 && e > s) { const d3 = tryParse(inner.slice(s, e + 1)); if (d3) return d3; }
  }
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s >= 0 && e > s) return tryParse(text.slice(s, e + 1));
  return null;
}

// ─── Per-activity logic ───────────────────────────────────────────────────────

async function transcreateActivity(admin, activity, dryRun, forceUpdate = false) {
  const { id, name, slug: esSlug, description_short } = activity;

  if (SKIP_IDS.has(id)) {
    return { id, status: 'skipped', reason: 'test/pilot entry' };
  }

  // Check en-US overlay exists (skip unless --ids forces a re-run)
  if (!forceUpdate) {
    const { data: existing } = await admin
      .from('website_product_pages')
      .select('id')
      .eq('website_id', WEBSITE_ID)
      .eq('product_id', id)
      .eq('product_type', 'activity')
      .eq('locale', TARGET_LOCALE)
      .maybeSingle();

    if (existing) return { id, status: 'skipped', reason: 'en-US overlay exists' };
  }

  // Get es-CO overlay if any (id used as translation_group_id)
  const { data: esOverlay } = await admin
    .from('website_product_pages')
    .select('id,custom_seo_title,custom_seo_description,target_keyword')
    .eq('website_id', WEBSITE_ID)
    .eq('product_id', id)
    .eq('product_type', 'activity')
    .eq('locale', SOURCE_LOCALE)
    .maybeSingle();

  const source = {
    name,
    seo_title: esOverlay?.custom_seo_title ?? name,
    seo_desc: esOverlay?.custom_seo_description ?? '',
    description_short: description_short ?? '',
  };

  const kw = await pickKeyword(admin, name); // may be null — AI proceeds without keyword constraint

  if (dryRun) {
    console.log(`  [DRY-RUN] "${name}" → kw:"${kw?.keyword ?? '(none)'}"`);
    return { id, status: 'dry-run', name, keyword: kw?.keyword ?? null };
  }

  // AI call
  let aiText;
  try { aiText = await callAI(buildPrompt(source, kw.keyword)); }
  catch (e) { return { id, status: 'error', reason: `AI: ${e.message}` }; }

  const ai = parseAI(aiText);
  if (!ai?.payload_v2) {
    console.log(`  [PARSE-DBG] ${aiText?.slice(0, 200)}`);
    return { id, status: 'error', reason: 'parse failed' };
  }

  const p = ai.payload_v2;
  const enTitle = (p.meta_title || p.h1 || name).slice(0, SERP_META_TITLE_MAX);
  const enDesc = (p.meta_desc || '').slice(0, SERP_META_DESC_MAX);
  const enH1 = p.h1 || enTitle;
  const enSlug = normalizeSlug(p.slug || p.h1 || name);
  const enKeywords = Array.isArray(p.keywords) ? p.keywords.slice(0, 5) : (kw ? [kw.keyword] : [name]);

  const now = new Date().toISOString();
  const jobId = crypto.randomUUID();
  const overlayId = crypto.randomUUID();
  // translation_group_id links es-CO and en-US overlays for the same product
  const translationGroupId = esOverlay?.id ?? crypto.randomUUID();

  // Upsert en-US overlay
  const { error: overlayErr } = await admin
    .from('website_product_pages')
    .upsert({
      id: overlayId,
      website_id: WEBSITE_ID,
      product_id: id,
      product_type: 'activity',
      locale: TARGET_LOCALE,
      translation_group_id: translationGroupId,
      custom_seo_title: enTitle,
      custom_seo_description: enDesc,
      target_keyword: kw?.keyword ?? null,
      custom_seo_keywords: enKeywords,
      seo_intro: enH1,
      body_content: { h1: enH1, slug: enSlug },
      created_at: now,
      updated_at: now,
    }, { onConflict: 'website_id,product_type,product_id,locale' });

  if (overlayErr) return { id, status: 'error', reason: `overlay: ${overlayErr.message}` };

  // Job row
  await admin.from('seo_transcreation_jobs').insert({
    id: jobId,
    website_id: WEBSITE_ID,
    page_type: 'activity',
    page_id: id,
    source_locale: SOURCE_LOCALE,
    target_locale: TARGET_LOCALE,
    country: COUNTRY,
    language: LANGUAGE,
    source_keyword: esOverlay?.target_keyword ?? null,
    target_keyword: kw?.keyword ?? null,
    status: 'applied',
    ai_generated: true,
    ai_model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5',
    schema_version: '2.0',
    payload_v2: ai.payload_v2,
    payload: { seoTitle: enTitle, seoDescription: enDesc, h1: enH1, slug: enSlug, targetKeyword: kw?.keyword ?? null },
    keyword_reresearch: kw ? {
      required: true, authoritative: true,
      source_locale: SOURCE_LOCALE, target_locale: TARGET_LOCALE,
      country: COUNTRY, language: LANGUAGE,
      source_keyword: null, target_keyword: kw.keyword,
      candidate_id: String(kw.id), candidate_keyword: kw.keyword,
      source: 'seo_keyword_candidates.live', fetched_at: now, confidence: 'live',
      decision_grade_ready: true,
      market_signals: { seasonality_status: 'available', competitive_status: 'available' },
      generated_at: now,
    } : null,
    confidence: kw ? 'live' : 'name-based',
    source: kw ? 'seo_keyword_candidates.live' : 'activity_name',
    fetched_at: now,
    created_by: null,
  });

  // Localized variant
  await admin.from('seo_localized_variants').upsert({
    website_id: WEBSITE_ID,
    page_type: 'activity',
    source_entity_id: id,
    target_entity_id: id, // same entity, overlay model
    source_locale: SOURCE_LOCALE,
    target_locale: TARGET_LOCALE,
    country: COUNTRY, language: LANGUAGE,
    status: 'applied', last_job_id: jobId,
    source: kw ? 'seo_keyword_candidates.live' : 'activity_name',
    fetched_at: now,
    confidence: kw ? 'live' : 'name-based',
  }, { onConflict: 'website_id,page_type,source_entity_id,target_locale' });

  return { id, status: 'success', name, enTitle, enSlug, keyword: kw?.keyword ?? null };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const admin = makeAdmin();

  // Get activities list
  let activitiesQuery = admin
    .from('activities')
    .select('id,name,description_short,slug')
    .eq('account_id', (await admin.from('websites').select('account_id').eq('id', WEBSITE_ID).single()).data.account_id)
    .is('deleted_at', null)
    .not('name', 'is', null)
    .order('updated_at', { ascending: false });

  if (args.ids) {
    activitiesQuery = activitiesQuery.in('id', args.ids);
  } else {
    activitiesQuery = activitiesQuery.limit(args.limit + SKIP_IDS.size + 5);
  }

  const { data: activities, error } = await activitiesQuery;
  if (error || !activities) { console.error('Failed to fetch activities:', error); process.exit(1); }

  const targets = args.ids ? activities : activities.filter(a => !SKIP_IDS.has(a.id)).slice(0, args.limit);

  console.log(`\n🏃 ColombiaTours Activity Transcreation — es-CO → en-US`);
  console.log(`Activities to process: ${targets.length}`);
  console.log(`Dry run: ${args.dryRun}\n`);

  const { count: kwCount } = await admin
    .from('seo_keyword_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', WEBSITE_ID)
    .eq('locale', TARGET_LOCALE)
    .eq('confidence', 'live')
    .eq('decision_grade_ready', true);

  if ((kwCount ?? 0) === 0) { console.error('No en-US keywords. Run hydrate first.'); process.exit(1); }
  console.log(`en-US keyword candidates: ${kwCount}\n`);

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS));
    process.stdout.write(`[${i + 1}/${targets.length}] ${targets[i].id.slice(0, 8)} "${targets[i].name?.slice(0, 40)}"... `);
    const r = await transcreateActivity(admin, targets[i], args.dryRun, !!args.ids);
    console.log(
      r.status === 'success' ? `✅ "${r.enTitle}"` :
      r.status === 'skipped' ? `⏭  ${r.reason}` :
      r.status === 'dry-run' ? `🔍 kw:"${r.keyword}"` :
      `❌ ${r.reason}`
    );
    results.push(r);
  }

  const success = results.filter(r => r.status === 'success');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n─── Summary ───────────────────────────────`);
  console.log(`Success: ${success.length} | Skipped: ${skipped.length} | Errors: ${errors.length}`);
  if (errors.length) errors.forEach(e => console.log(`  ❌ ${e.id}: ${e.reason}`));

  // Write report
  const reportDir = 'docs/qa/pilot';
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const lines = [
    `# Transcreate Top-N Activities — Report`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `| Status | Count |`,
    `|--------|-------|`,
    `| Success | ${success.length} |`,
    `| Skipped | ${skipped.length} |`,
    `| Errors | ${errors.length} |`,
    ``,
    ...success.map(r => `- ✅ \`${r.id}\` "${r.name}" → "${r.enTitle}" [${r.enSlug}]`),
    ...errors.map(r => `- ❌ \`${r.id}\` → ${r.reason}`),
  ];
  fs.writeFileSync(`${reportDir}/transcreate-top-n-activities-report.md`, lines.join('\n'));
  console.log(`\nReport: ${reportDir}/transcreate-top-n-activities-report.md`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
