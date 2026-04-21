#!/usr/bin/env node
/**
 * Transcreate planner bios/positions/specialties es-CO → en-US for colombiatours.travel
 *
 * Run: node scripts/seo/transcreate-planners.mjs [--dry-run] [--force] [--ids <id1,id2>]
 *
 * Flow per planner:
 *   1. Fetch contacts where is_planner = true for the ColombiaTours account
 *   2. Skip if translations['en-US'] already fully populated (unless --force)
 *   3. Call AI to transcreate bio, position, specialty (skipping blank fields)
 *   4. Write result to contacts.translations jsonb column via jsonb_set RPC
 *   5. Log progress per contact
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const SOURCE_LOCALE = 'es-CO';
const TARGET_LOCALE = 'en-US';
const DELAY_MS = 800;

/** Fields we transcreate and write into translations['en-US'] */
const TRANSLATABLE_FIELDS = ['bio', 'position', 'specialty'];

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

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, force: false, ids: null, websiteId: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') { out.dryRun = true; continue; }
    if (args[i] === '--force')   { out.force = true; continue; }
    if (args[i] === '--ids' && args[i + 1]) {
      out.ids = args[++i].split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }
    if (args[i] === '--website-id' && args[i + 1]) { out.websiteId = args[++i].trim(); continue; }
  }
  return out;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Skip check ──────────────────────────────────────────────────────────────

/**
 * Returns true if all non-blank source fields already have an en-US translation.
 * A contact with no translatable content at all is also considered "done".
 */
function isFullyTranslated(contact) {
  const enUS = contact.translations?.['en-US'];
  if (!enUS) return false;

  for (const field of TRANSLATABLE_FIELDS) {
    const sourceValue = (contact[field] ?? '').trim();
    if (!sourceValue) continue; // blank source — nothing to translate
    if (!(enUS[field] ?? '').trim()) return false; // translated value missing
  }
  return true;
}

// ─── AI ──────────────────────────────────────────────────────────────────────

function buildPrompt(contact, fieldsToTranslate) {
  const lines = [
    `You are a professional travel industry translator. Translate the following planner profile fields from Spanish (Colombian) to natural, fluent English (US).`,
    ``,
    `RULES:`,
    `- Keep proper nouns unchanged: Colombian city names (Bogotá, Medellín, Cartagena, Cali, etc.), brand names, place names, and ColombiaTours itself.`,
    `- Use travel industry terminology appropriate for an international (US) audience.`,
    `- "position" should be a job title — translate naturally, e.g. "Directora de Viajes" → "Travel Director".`,
    `- "specialty" should read as a short phrase or comma-separated list of specializations.`,
    `- "bio" should be natural paragraph prose, not formal or stiff.`,
    `- Do NOT add, omit, or invent information. Translate only what is given.`,
    ``,
    `Planner name (do not translate): ${[contact.name, contact.last_name].filter(Boolean).join(' ') || '(unknown)'}`,
    ``,
    `Source fields (Spanish):`,
  ];

  for (const field of fieldsToTranslate) {
    lines.push(`${field}: ${contact[field]}`);
  }

  lines.push(``);
  lines.push(`Respond ONLY with a JSON object containing the translated fields. Example:`);

  const example = {};
  for (const field of fieldsToTranslate) example[field] = '...';
  lines.push(JSON.stringify(example));

  return lines.join('\n');
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
      max_tokens: 800,
    }),
  });

  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const json = await r.json();
  return {
    content: json.choices?.[0]?.message?.content ?? null,
    usage: json.usage ?? null,
  };
}

function parseAI(text) {
  if (!text) return null;
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };

  // Direct parse
  const direct = tryParse(text.trim());
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;

  // Fence extraction
  const f = text.indexOf('```'), l = text.lastIndexOf('```');
  if (f >= 0 && l > f) {
    const nl = text.indexOf('\n', f);
    const inner = nl >= 0 && nl < l ? text.slice(nl + 1, l).trim() : text.slice(f + 3, l).trim();
    const d2 = tryParse(inner);
    if (d2) return d2;
    const s = inner.indexOf('{'), e = inner.lastIndexOf('}');
    if (s >= 0 && e > s) { const d3 = tryParse(inner.slice(s, e + 1)); if (d3) return d3; }
  }

  // Bare JSON object anywhere in text
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s >= 0 && e > s) return tryParse(text.slice(s, e + 1));

  return null;
}

// ─── Per-planner logic ────────────────────────────────────────────────────────

async function transcreatePlanner(admin, contact, dryRun, force) {
  const { id } = contact;
  const displayName = [contact.name, contact.last_name].filter(Boolean).join(' ') || id.slice(0, 8);

  // Determine which fields actually need translation
  const fieldsToTranslate = TRANSLATABLE_FIELDS.filter(field => {
    const sourceValue = (contact[field] ?? '').trim();
    return sourceValue.length > 0;
  });

  if (fieldsToTranslate.length === 0) {
    return { id, status: 'skipped', reason: 'no translatable content (bio/position/specialty all blank)' };
  }

  // Skip check (unless --force)
  if (!force && isFullyTranslated(contact)) {
    return { id, status: 'skipped', reason: 'en-US translations already complete' };
  }

  if (dryRun) {
    const existing = contact.translations?.['en-US'];
    const missingFields = fieldsToTranslate.filter(f => !(existing?.[f] ?? '').trim());
    console.log(`  [DRY-RUN] "${displayName}" — would translate: [${fieldsToTranslate.join(', ')}]${missingFields.length < fieldsToTranslate.length ? ` (missing: ${missingFields.join(', ')})` : ''}`);
    return { id, status: 'dry-run', name: displayName, fields: fieldsToTranslate };
  }

  // AI call with retry (once)
  let aiText, usage;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await callAI(buildPrompt(contact, fieldsToTranslate));
      aiText = result.content;
      usage = result.usage;
      break;
    } catch (e) {
      if (attempt === 2) return { id, status: 'error', reason: `AI: ${e.message}` };
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const parsed = parseAI(aiText);
  if (!parsed) {
    console.log(`  [PARSE-DBG] ${aiText?.slice(0, 300)}`);
    return { id, status: 'error', reason: 'AI response parse failed' };
  }

  // Build the en-US payload — only include fields we asked AI to translate
  const enUS = {};
  for (const field of fieldsToTranslate) {
    const translated = (parsed[field] ?? '').trim();
    if (translated) enUS[field] = translated;
  }

  if (Object.keys(enUS).length === 0) {
    return { id, status: 'error', reason: 'AI returned no valid translated fields' };
  }

  // Merge with any pre-existing translations for this locale
  const existingEnUS = contact.translations?.['en-US'] ?? {};
  const mergedEnUS = { ...existingEnUS, ...enUS };

  // Write to DB: merge full translations object with updated en-US key
  const existingTranslations = contact.translations ?? {};
  const newTranslations = { ...existingTranslations, [TARGET_LOCALE]: mergedEnUS };

  const { error: updateErr } = await admin
    .from('contacts')
    .update({ translations: newTranslations })
    .eq('id', id);

  if (updateErr) return { id, status: 'error', reason: `DB update: ${updateErr.message}` };

  const tokensUsed = usage ? (usage.total_tokens ?? usage.prompt_tokens + usage.completion_tokens) : null;
  return {
    id,
    status: 'success',
    name: displayName,
    fields: Object.keys(enUS),
    tokensUsed,
    sample: enUS.position ?? enUS.bio?.slice(0, 60) ?? '(translated)',
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const admin = makeAdmin();
  const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;

  // Resolve account_id from website
  const { data: website, error: wsErr } = await admin
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();

  if (wsErr || !website?.account_id) {
    console.error('Failed to resolve account_id from website:', wsErr?.message ?? 'no data');
    process.exit(1);
  }
  const accountId = website.account_id;

  // Fetch planners
  let query = admin
    .from('contacts')
    .select('id, name, last_name, bio, position, specialty, translations')
    .eq('account_id', accountId)
    .eq('show_on_website', true)
    .is('deleted_at', null);

  if (args.ids) {
    query = query.in('id', args.ids);
  }

  const { data: planners, error: fetchErr } = await query;
  if (fetchErr || !planners) {
    console.error('Failed to fetch planners:', fetchErr?.message ?? 'no data');
    process.exit(1);
  }

  if (planners.length === 0) {
    console.log('No planners found for this account.');
    process.exit(0);
  }

  console.log(`\nColombiaTours Planner Transcreation — es-CO → en-US`);
  console.log(`Account ID : ${accountId}`);
  console.log(`Planners   : ${planners.length}`);
  console.log(`Dry run    : ${args.dryRun}`);
  console.log(`Force      : ${args.force}`);
  if (args.ids) console.log(`Target IDs : ${args.ids.join(', ')}`);
  console.log('');

  const results = [];
  for (let i = 0; i < planners.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS));
    const planner = planners[i];
    const displayName = ([planner.name, planner.last_name].filter(Boolean).join(' ') || planner.id.slice(0, 8)).slice(0, 40);
    process.stdout.write(`[${i + 1}/${planners.length}] ${planner.id.slice(0, 8)} "${displayName}"... `);

    const r = await transcreatePlanner(admin, planner, args.dryRun, args.force);

    if (r.status === 'success') {
      console.log(`OK  fields:[${r.fields.join(',')}] tokens:${r.tokensUsed ?? '?'} — "${r.sample}"`);
    } else if (r.status === 'skipped') {
      console.log(`SKIP  ${r.reason}`);
    } else if (r.status === 'dry-run') {
      console.log(`DRY   would translate: [${r.fields.join(',')}]`);
    } else {
      console.log(`ERR  ${r.reason}`);
    }

    results.push(r);
  }

  const success = results.filter(r => r.status === 'success');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors  = results.filter(r => r.status === 'error');
  const dry     = results.filter(r => r.status === 'dry-run');

  console.log(`\n─── Summary ─────────────────────────────────────`);
  console.log(`Success : ${success.length}`);
  console.log(`Skipped : ${skipped.length}`);
  console.log(`Dry-run : ${dry.length}`);
  console.log(`Errors  : ${errors.length}`);

  if (errors.length) {
    console.log(`\nErrors:`);
    errors.forEach(e => console.log(`  ${e.id}: ${e.reason}`));
  }

  if (success.length) {
    console.log(`\nTranscreated:`);
    success.forEach(r => console.log(`  ${r.id.slice(0, 8)} "${r.name}" — [${r.fields.join(',')}]`));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
