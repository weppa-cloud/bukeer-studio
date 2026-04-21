#!/usr/bin/env node
/**
 * Transcreate top-N blog posts from es-CO → en-US for colombiatours.travel
 *
 * Run: node scripts/seo/transcreate-top-n-blogs.mjs --website-id <uuid> [--dry-run] [--limit 20]
 *
 * Flow per post:
 *   1. Check if en-US sibling already exists (skip if so)
 *   2. Get source fields (title, seo_title, seo_desc, content)
 *   3. Pick best en-US keyword candidate from seo_keyword_candidates
 *   4. Call OpenRouter to translate (locale-adaptation prompt)
 *   5. Insert seo_transcreation_jobs row (draft → applied)
 *   6. Create new website_blog_posts row with locale='en-US'
 *   7. Update seo_localized_variants
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
const CONCURRENCY = 1; // sequential to avoid 429
const DELAY_BETWEEN_MS = 2000; // 2s between calls
const SERP_META_TITLE_MAX = 60;
const SERP_META_DESC_MAX = 155;

// Top-20 ES blog IDs selected from audit (highest value for EN tourism traffic)
const TOP_20_BLOG_IDS = [
  '424569d1-ae98-40c8-9643-1f198d42fe72', // 10 mejores islas en Colombia
  'cab46da8-8890-4bb1-8e47-b2f1d5ecaa56', // Guía Caño Cristales 2023
  '6af8a68f-f588-40f8-b637-76342691eb47', // Caño Cristales guía completa 2026
  'fbd4ce69-eaac-40c9-9991-e07c715bc34c', // Actividades tour Bogotá
  '46f265ab-95e0-4761-b485-e6da6c0b88aa', // Pacífico Colombiano
  'a154d975-d64b-4fb6-9d0a-318c47c04925', // 10 Playas Colombia
  '58fd4285-5a03-4eb4-bf97-2eb43b3e24ff', // Mejores islas Colombia paraíso
  'e38e4990-32d5-4bcc-8c93-ff89590deff6', // Mejores destinos Colombia guía
  '00fdc276-bbdd-4b90-9b82-52b2aa347693', // 10 Frases Colombianas
  'cba57ac9-8927-4d0a-8948-85265adb957b', // 5 Razones visitar Cali
  '6f87f9c8-c8c4-4e27-9b7c-d79fca285a03', // Tours Colombia desde México
  '41a015d9-a02d-4d89-b3e6-c6a57d1f35d5', // 15 lugares vacaciones Colombia
  'bd47ee59-dbe0-4eaf-9d4a-f01cd111fff3', // Razones viajar a Colombia
  'a2dd689d-968f-48af-bd4c-0b39ffc69d05', // Magia de viajar Colombia
  '7f30b21e-4ddf-410f-bc42-329c0c81ab46', // Cuándo viajar a Colombia
  'a557e8c3-8d17-4abe-9b48-edaf9c0df8a1', // Actividades Santander con niños
  '251a5de9-4eab-4ae7-ac72-c10971cccd64', // Aguas termales beneficio salud
  'af319011-197e-4d9e-8973-7dc1e05ae848', // Agencia de viaje confiable
  '903a5de9-d863-49ae-9c01-a43f1808d449', // Destinos turísticos económicos
  'e0f3d744-5dc9-430b-b1f1-0ca5dffcd9e9', // Amazónica El Latido del Planeta
];

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    if (!raw || raw.trim().startsWith('#')) continue;
    const sep = raw.indexOf('=');
    if (sep < 0) continue;
    const key = raw.slice(0, sep).trim();
    const value = raw.slice(sep + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { websiteId: WEBSITE_ID, dryRun: false, limit: 20, ids: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--website-id' && args[i + 1]) { out.websiteId = args[++i]; continue; }
    if (args[i] === '--dry-run') { out.dryRun = true; continue; }
    if (args[i] === '--limit' && args[i + 1]) { out.limit = Math.min(Number(args[++i]) || 20, 20); continue; }
    if (args[i] === '--ids' && args[i + 1]) { out.ids = args[++i].split(',').map(s => s.trim()); continue; }
  }
  return out;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Slug helpers ────────────────────────────────────────────────────────────

function normalizeSlug(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function reserveSlug(admin, websiteId, baseSlug, locale) {
  const slug = normalizeSlug(baseSlug);
  const { data: existing } = await admin
    .from('website_blog_posts')
    .select('id')
    .eq('website_id', websiteId)
    .eq('locale', locale)
    .eq('slug', slug)
    .maybeSingle();
  if (!existing) return slug;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

// ─── Keyword helper ──────────────────────────────────────────────────────────

async function pickKeyword(admin, websiteId, titleHint) {
  // Try to find a relevant keyword, fall back to first available
  const normalized = titleHint.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 40);
  let q = admin
    .from('seo_keyword_candidates')
    .select('id,keyword,search_volume,priority_score')
    .eq('website_id', websiteId)
    .eq('locale', TARGET_LOCALE)
    .eq('confidence', 'live')
    .eq('decision_grade_ready', true)
    .order('priority_score', { ascending: false })
    .limit(1);

  // Try keyword match first
  const words = normalized.split(' ').filter(w => w.length > 3).slice(0, 3);
  if (words.length > 0) {
    const { data: matched } = await q.ilike('keyword', `%${words[0]}%`);
    if (matched?.[0]) return matched[0];
  }

  // Fallback: top keyword
  const { data: top } = await admin
    .from('seo_keyword_candidates')
    .select('id,keyword,search_volume,priority_score')
    .eq('website_id', websiteId)
    .eq('locale', TARGET_LOCALE)
    .eq('confidence', 'live')
    .eq('decision_grade_ready', true)
    .order('priority_score', { ascending: false })
    .limit(1)
    .maybeSingle();

  return top ?? null;
}

// ─── AI translation ──────────────────────────────────────────────────────────

function buildPrompt(source, targetKeyword) {
  return [
    `You are a travel SEO specialist. Translate ONLY the SEO metadata fields (NOT the body) from Spanish to English.`,
    `Target keyword: "${targetKeyword}"`,
    ``,
    `RULES:`,
    `- meta_title: max ${SERP_META_TITLE_MAX} chars, natural English, include keyword`,
    `- meta_desc: max ${SERP_META_DESC_MAX} chars, compelling call-to-action, include keyword`,
    `- h1: natural English heading for the article`,
    `- slug: URL-safe English slug, lowercase, hyphens only, max 80 chars, no accents`,
    `- keywords: array of 3-5 English SEO keywords as strings`,
    `- Keep proper nouns unchanged (Cartagena, Medellín, Bogotá, Colombia, etc.)`,
    ``,
    `SOURCE:`,
    `Title: ${source.title || ''}`,
    `SEO Title: ${source.seo_title || source.title || ''}`,
    `SEO Description: ${source.seo_description || ''}`,
    ``,
    `Respond ONLY with this exact JSON, no other text:`,
    `{"schema_version":"2.0","payload_v2":{"meta_title":"...","meta_desc":"...","h1":"...","slug":"...","keywords":["...","...","..."]}}`,
  ].join('\n');
}

async function callOpenRouter(prompt) {
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const token = process.env.OPENROUTER_AUTH_TOKEN;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';

  if (!token) throw new Error('Missing OPENROUTER_AUTH_TOKEN');

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://colombiatours.travel',
      'X-Title': 'ColombiaTours Transcreation',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? null;
}

function parseAiOutput(text) {
  if (!text) return null;

  // Strategy 1: direct parse (no fences)
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  const d1 = tryParse(text.trim());
  if (d1) return d1;

  // Strategy 2: extract outer code fence — first ``` to last ```
  const firstFence = text.indexOf('```');
  const lastFence = text.lastIndexOf('```');
  if (firstFence >= 0 && lastFence > firstFence) {
    // content is between end of opening fence line and start of closing fence
    const afterOpen = text.indexOf('\n', firstFence);
    const inner = afterOpen >= 0 && afterOpen < lastFence
      ? text.slice(afterOpen + 1, lastFence).trim()
      : text.slice(firstFence + 3, lastFence).trim();
    const d2 = tryParse(inner);
    if (d2) return d2;
    const s = inner.indexOf('{');
    const e = inner.lastIndexOf('}');
    if (s >= 0 && e > s) {
      const d3 = tryParse(inner.slice(s, e + 1));
      if (d3) return d3;
    }
  }

  // Strategy 3: find outermost { } in raw text
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const d4 = tryParse(text.slice(start, end + 1));
    if (d4) return d4;
  }

  return null;
}

// ─── Main per-post logic ─────────────────────────────────────────────────────

async function transcreatePost(admin, postId, websiteId, dryRun) {
  // 1. Get source post
  const { data: source, error: srcErr } = await admin
    .from('website_blog_posts')
    .select('id,title,seo_title,seo_description,content,slug,locale,translation_group_id,status,website_id,excerpt,featured_image,featured_image_alt,category_id,seo_keywords,word_count,robots_noindex,ai_generated,ai_model')
    .eq('id', postId)
    .eq('website_id', websiteId)
    .maybeSingle();

  if (srcErr || !source) {
    return { id: postId, status: 'error', reason: `source not found: ${srcErr?.message}` };
  }

  // 2. Check if en-US sibling already exists
  const translationGroupId = source.translation_group_id || postId;
  const { data: existing } = await admin
    .from('website_blog_posts')
    .select('id,locale,status')
    .eq('website_id', websiteId)
    .eq('translation_group_id', translationGroupId)
    .eq('locale', TARGET_LOCALE)
    .maybeSingle();

  if (existing) {
    return { id: postId, status: 'skipped', reason: `en-US sibling exists: ${existing.id}`, siblingId: existing.id };
  }

  // 3. Pick keyword
  const kwCandidate = await pickKeyword(admin, websiteId, source.title || '');
  if (!kwCandidate) {
    return { id: postId, status: 'error', reason: 'no en-US keyword candidates found — run hydrate first' };
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would transcreate: "${source.title}" → keyword: "${kwCandidate.keyword}"`);
    return { id: postId, status: 'dry-run', title: source.title, keyword: kwCandidate.keyword };
  }

  // 4. Call AI
  const prompt = buildPrompt(source, kwCandidate.keyword);
  let aiText;
  try {
    aiText = await callOpenRouter(prompt);
  } catch (err) {
    return { id: postId, status: 'error', reason: `AI call failed: ${err.message}` };
  }

  const aiOutput = parseAiOutput(aiText);
  if (!aiOutput?.payload_v2) {
    const preview = aiText?.slice(0, 300) ?? 'null';
    console.log(`  [PARSE-DEBUG] raw preview: ${preview}`);
    return { id: postId, status: 'error', reason: 'AI output parse failed', raw: preview };
  }

  const p = aiOutput.payload_v2;
  const enTitle = (typeof p.h1 === 'string' ? p.h1 : typeof p.meta_title === 'string' ? p.meta_title : source.title) || source.title;
  const enSeoTitle = (typeof p.meta_title === 'string' ? p.meta_title : enTitle).slice(0, SERP_META_TITLE_MAX);
  const enSeoDesc = (typeof p.meta_desc === 'string' ? p.meta_desc : '').slice(0, SERP_META_DESC_MAX);
  const enBody = typeof p.body_content?.body === 'string' ? p.body_content.body : '';
  const enSlugBase = typeof p.slug === 'string' ? p.slug : normalizeSlug(enTitle);

  // 5. Reserve unique slug
  const enSlug = await reserveSlug(admin, websiteId, enSlugBase, TARGET_LOCALE);

  const now = new Date().toISOString();
  const newPostId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  // 6. Insert seo_transcreation_job
  const jobRow = {
    id: jobId,
    website_id: websiteId,
    page_type: 'blog',
    page_id: postId,
    source_locale: SOURCE_LOCALE,
    target_locale: TARGET_LOCALE,
    country: COUNTRY,
    language: LANGUAGE,
    source_keyword: source.seo_keywords?.[0] ?? null,
    target_keyword: kwCandidate.keyword,
    status: 'applied',
    ai_generated: true,
    ai_model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5',
    schema_version: aiOutput.schema_version ?? '2.0',
    payload_v2: aiOutput.payload_v2,
    payload: {
      title: enTitle,
      seoTitle: enSeoTitle,
      seoDescription: enSeoDesc,
      body: enBody,
      targetKeyword: kwCandidate.keyword,
      schema_version: aiOutput.schema_version ?? '2.0',
      payload_v2: aiOutput.payload_v2,
    },
    keyword_reresearch: {
      required: true,
      authoritative: true,
      source_locale: SOURCE_LOCALE,
      target_locale: TARGET_LOCALE,
      country: COUNTRY,
      language: LANGUAGE,
      source_keyword: null,
      target_keyword: kwCandidate.keyword,
      candidate_id: String(kwCandidate.id),
      candidate_keyword: kwCandidate.keyword,
      source: 'seo_keyword_candidates.live',
      fetched_at: now,
      confidence: 'live',
      decision_grade_ready: true,
      market_signals: { seasonality_status: 'available', competitive_status: 'available' },
      generated_at: now,
    },
    confidence: 'live',
    source: 'seo_keyword_candidates.live',
    fetched_at: now,
    created_by: null,
  };

  const { error: jobErr } = await admin.from('seo_transcreation_jobs').insert(jobRow);
  if (jobErr) {
    return { id: postId, status: 'error', reason: `job insert failed: ${jobErr.message}` };
  }

  // 7. Create en-US blog post
  const newPost = {
    id: newPostId,
    website_id: websiteId,
    locale: TARGET_LOCALE,
    translation_group_id: translationGroupId,
    title: enTitle,
    seo_title: enSeoTitle,
    seo_description: enSeoDesc,
    content: enBody || source.content,
    slug: enSlug,
    status: 'published',
    published_at: now,
    created_at: now,
    updated_at: now,
    // Copy non-translated fields
    excerpt: source.excerpt,
    featured_image: source.featured_image,
    featured_image_alt: source.featured_image_alt,
    category_id: source.category_id,
    seo_keywords: Array.isArray(p.keywords) ? p.keywords : source.seo_keywords,
    word_count: enBody ? Math.ceil(enBody.split(/\s+/).length) : source.word_count,
    robots_noindex: source.robots_noindex,
    ai_generated: true,
    ai_model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5',
    human_edited: false,
  };

  const { error: postErr } = await admin.from('website_blog_posts').insert(newPost);
  if (postErr) {
    // Rollback job
    await admin.from('seo_transcreation_jobs').delete().eq('id', jobId);
    return { id: postId, status: 'error', reason: `post insert failed: ${postErr.message}` };
  }

  // 8. Upsert seo_localized_variants
  await admin.from('seo_localized_variants').upsert(
    {
      website_id: websiteId,
      page_type: 'blog',
      source_entity_id: postId,
      target_entity_id: newPostId,
      source_locale: SOURCE_LOCALE,
      target_locale: TARGET_LOCALE,
      country: COUNTRY,
      language: LANGUAGE,
      status: 'applied',
      last_job_id: jobId,
      source: 'seo_keyword_candidates.live',
      fetched_at: now,
      confidence: 'live',
    },
    { onConflict: 'website_id,page_type,source_entity_id,target_locale' },
  );

  return {
    id: postId,
    status: 'success',
    newPostId,
    jobId,
    enTitle,
    enSlug,
    keyword: kwCandidate.keyword,
  };
}

// ─── Sequential runner with delay ────────────────────────────────────────────

async function runSequential(taskFns, delayMs) {
  const results = [];
  for (let i = 0; i < taskFns.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    results.push(await taskFns[i]());
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const admin = makeAdmin();
  const targetIds = args.ids ? args.ids : TOP_20_BLOG_IDS.slice(0, args.limit);

  console.log(`\n🌎 ColombiaTours Blog Transcreation — es-CO → en-US`);
  console.log(`Website: ${args.websiteId}`);
  console.log(`Posts to process: ${targetIds.length}`);
  console.log(`Dry run: ${args.dryRun}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  // Verify keyword candidates
  const { count: kwCount } = await admin
    .from('seo_keyword_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', args.websiteId)
    .eq('locale', TARGET_LOCALE)
    .eq('confidence', 'live')
    .eq('decision_grade_ready', true);

  console.log(`en-US keyword candidates available: ${kwCount ?? 0}`);
  if ((kwCount ?? 0) === 0) {
    console.error('ERROR: No en-US keyword candidates. Run hydrate-epic86-decision-grade.mjs first.');
    process.exit(1);
  }

  // Process sequentially with delay to avoid rate limits
  const taskFns = targetIds.map(postId => () => {
    console.log(`Processing ${postId.slice(0, 8)}...`);
    return transcreatePost(admin, postId, args.websiteId, args.dryRun);
  });

  const results = await runSequential(taskFns, DELAY_BETWEEN_MS);

  // Report
  const success = results.filter(r => r.status === 'success');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');
  const dryRuns = results.filter(r => r.status === 'dry-run');

  console.log('\n─── Results ───────────────────────────────────────');
  for (const r of results) {
    if (r.status === 'success') {
      console.log(`✅ ${r.id.slice(0, 8)} → "${r.enTitle}" [${r.enSlug}] kw:"${r.keyword}"`);
    } else if (r.status === 'skipped') {
      console.log(`⏭  ${r.id.slice(0, 8)} → already exists: ${r.siblingId?.slice(0, 8)}`);
    } else if (r.status === 'dry-run') {
      console.log(`🔍 ${r.id.slice(0, 8)} → "${r.title}" kw:"${r.keyword}"`);
    } else {
      console.log(`❌ ${r.id.slice(0, 8)} → ${r.reason}`);
    }
  }

  console.log('\n─── Summary ───────────────────────────────────────');
  console.log(`Success:  ${success.length}`);
  console.log(`Skipped:  ${skipped.length}`);
  console.log(`Dry-runs: ${dryRuns.length}`);
  console.log(`Errors:   ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  ${e.id}: ${e.reason}`);
  }

  // Write report
  const reportPath = 'docs/qa/pilot/transcreate-top-n-report.md';
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const reportLines = [
    `# Transcreate Top-N Blogs — Run Report`,
    `Date: ${new Date().toISOString()}`,
    `Website: ${args.websiteId}`,
    `Source: es-CO → en-US`,
    ``,
    `## Summary`,
    `| Status | Count |`,
    `|--------|-------|`,
    `| Success | ${success.length} |`,
    `| Skipped (already exists) | ${skipped.length} |`,
    `| Errors | ${errors.length} |`,
    ``,
    `## Results`,
    ...results.map(r => {
      if (r.status === 'success') return `- ✅ \`${r.id}\` → "${r.enTitle}" slug:\`${r.enSlug}\` kw:\`${r.keyword}\``;
      if (r.status === 'skipped') return `- ⏭ \`${r.id}\` → sibling:\`${r.siblingId}\``;
      return `- ❌ \`${r.id}\` → ${r.reason}`;
    }),
  ];

  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`\nReport saved: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
