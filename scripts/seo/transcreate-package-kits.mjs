#!/usr/bin/env node
/**
 * Transcreate package_kits content es-CO → en-US for ColombiaTours
 *
 * Run: node scripts/seo/transcreate-package-kits.mjs [--dry-run] [--limit 20] [--force] [--ids <id1,id2>]
 *
 * Model: writes to package_kits.translations['en-US'] via jsonb_set UPDATE.
 * Source fields: name, description, program_highlights (jsonb array of strings).
 * Null/empty description is skipped gracefully — only non-empty fields are sent.
 *
 * CLI flags:
 *   --dry-run      Print what would be done without calling AI or writing to DB
 *   --force        Re-transcreate even if translations['en-US'].name already populated
 *   --limit N      Max packages to process (default 20)
 *   --ids a,b,c    Process only these package_kit IDs (implies --force per ID)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const TARGET_LOCALE = 'en-US';
const DELAY_MS = 1500;

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

// ─── Args ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, force: false, limit: 20, ids: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') { out.dryRun = true; continue; }
    if (args[i] === '--force') { out.force = true; continue; }
    if (args[i] === '--limit' && args[i + 1]) { out.limit = Number(args[++i]) || 20; continue; }
    if (args[i] === '--ids' && args[i + 1]) { out.ids = args[++i].split(',').map(s => s.trim()).filter(Boolean); continue; }
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

// ─── AI ──────────────────────────────────────────────────────────────────────

function buildPrompt(pkg) {
  const lines = [
    `You are a travel industry copywriter specializing in English translations for Colombian tour packages.`,
    `Transcreate the following package fields from Spanish to natural, compelling English for the US market.`,
    ``,
    `RULES:`,
    `- Keep all destination names unchanged: Colombia, Cartagena, Bogotá, Medellín, Cali, Amazonas, etc.`,
    `- Keep duration info exact (e.g. "5 days / 4 nights" → "5 days / 4 nights")`,
    `- Keep price references exact if present`,
    `- name: short, engaging English package title`,
    `- description: full travel-industry English description, preserve all factual details`,
    `- program_highlights: translate each highlight bullet faithfully; return as JSON array of strings`,
    `- If a field is not provided, omit it from the response JSON`,
    ``,
    `SOURCE (Spanish):`,
    `name: ${pkg.name}`,
  ];

  if (pkg.description) {
    lines.push(`description: ${pkg.description}`);
  }

  if (pkg.program_highlights && pkg.program_highlights.length > 0) {
    lines.push(`program_highlights (one per line):`);
    for (const h of pkg.program_highlights) {
      lines.push(`- ${h}`);
    }
  }

  lines.push(``);
  lines.push(`Respond ONLY with valid JSON, no extra text:`);

  // Build the expected shape dynamically
  const exampleFields = { name: '...' };
  if (pkg.description) exampleFields.description = '...';
  if (pkg.program_highlights && pkg.program_highlights.length > 0) exampleFields.program_highlights = ['...'];
  lines.push(JSON.stringify(exampleFields));

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
      max_tokens: 1200,
    }),
  });

  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const json = await r.json();
  const content = json.choices?.[0]?.message?.content ?? null;
  const tokensUsed = json.usage?.total_tokens ?? null;
  return { content, tokensUsed };
}

function parseAIResponse(text) {
  if (!text) return null;
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };

  // Direct parse
  const d = tryParse(text.trim());
  if (d) return d;

  // Code fence extraction
  const fOpen = text.indexOf('```');
  const fClose = text.lastIndexOf('```');
  if (fOpen >= 0 && fClose > fOpen) {
    const nl = text.indexOf('\n', fOpen);
    const inner = nl >= 0 && nl < fClose ? text.slice(nl + 1, fClose).trim() : text.slice(fOpen + 3, fClose).trim();
    const d2 = tryParse(inner);
    if (d2) return d2;
    const s = inner.indexOf('{'), e = inner.lastIndexOf('}');
    if (s >= 0 && e > s) { const d3 = tryParse(inner.slice(s, e + 1)); if (d3) return d3; }
  }

  // Bare JSON object extraction
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s >= 0 && e > s) return tryParse(text.slice(s, e + 1));

  return null;
}

// ─── Per-package logic ────────────────────────────────────────────────────────

async function transcreatePackage(admin, pkg, dryRun, forceUpdate) {
  const { id, name, description, program_highlights, translations } = pkg;

  // Skip check: translations['en-US'].name already populated (unless --force)
  if (!forceUpdate) {
    const existing = translations?.[TARGET_LOCALE]?.name;
    if (existing) {
      return { id, status: 'skipped', reason: 'en-US translation already exists', name };
    }
  }

  // Build source object — only non-empty fields
  const source = { name };
  if (description && description.trim()) {
    source.description = description.trim();
  }
  if (Array.isArray(program_highlights) && program_highlights.length > 0) {
    source.program_highlights = program_highlights.filter(h => typeof h === 'string' && h.trim());
  }

  if (dryRun) {
    const fields = Object.keys(source).filter(k => k !== 'name');
    console.log(`  [DRY-RUN] "${name}" → fields: name${fields.length ? ', ' + fields.join(', ') : ''}`);
    return { id, status: 'dry-run', name, fields: Object.keys(source) };
  }

  // AI call
  let aiContent, tokensUsed;
  try {
    const result = await callAI(buildPrompt(source));
    aiContent = result.content;
    tokensUsed = result.tokensUsed;
  } catch (e) {
    return { id, status: 'error', reason: `AI call failed: ${e.message}`, name };
  }

  const parsed = parseAIResponse(aiContent);
  if (!parsed || !parsed.name) {
    console.log(`  [PARSE-DBG] Raw AI response: ${aiContent?.slice(0, 300)}`);
    return { id, status: 'error', reason: 'AI response parse failed or missing name field', name };
  }

  // Build the en-US translation object — only include fields that were sent + returned
  const enTranslation = { name: parsed.name };
  const translatedFields = ['name'];

  if (source.description && parsed.description) {
    enTranslation.description = parsed.description;
    translatedFields.push('description');
  }

  if (source.program_highlights && Array.isArray(parsed.program_highlights) && parsed.program_highlights.length > 0) {
    enTranslation.program_highlights = parsed.program_highlights;
    translatedFields.push('program_highlights');
  }

  // Write to package_kits.translations via jsonb_set
  // Merge with any existing translations (preserve other locales)
  const existingTranslations = translations ?? {};
  const updatedTranslations = {
    ...existingTranslations,
    [TARGET_LOCALE]: enTranslation,
  };

  const { error: updateErr } = await admin
    .from('package_kits')
    .update({ translations: updatedTranslations })
    .eq('id', id);

  if (updateErr) {
    return { id, status: 'error', reason: `DB update failed: ${updateErr.message}`, name };
  }

  return {
    id,
    status: 'success',
    name,
    enName: enTranslation.name,
    translatedFields,
    tokensUsed: tokensUsed ?? 'n/a',
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const admin = makeAdmin();

  // Resolve forceUpdate: always true when --ids is set (re-run specific packages), or when --force
  const forceUpdate = args.force || !!args.ids;

  console.log(`\nColombiaTours Package Kits Transcreation — es-CO -> en-US`);
  console.log(`Website ID: ${WEBSITE_ID}`);
  console.log(`Dry run: ${args.dryRun} | Force: ${forceUpdate} | Limit: ${args.ids ? 'n/a (--ids mode)' : args.limit}\n`);

  // ── Fetch packages ──────────────────────────────────────────────────────────
  // Join via website_product_pages to get only packages linked to ColombiaTours
  // Select the overlay rows first, then join package_kits fields

  let overlayQuery = admin
    .from('website_product_pages')
    .select('product_id')
    .eq('website_id', WEBSITE_ID)
    .eq('product_type', 'package')
    .not('product_id', 'is', null);

  if (args.ids) {
    overlayQuery = overlayQuery.in('product_id', args.ids);
  } else {
    overlayQuery = overlayQuery.limit(args.limit + 10); // fetch a few extra, filter below
  }

  const { data: overlayRows, error: overlayErr } = await overlayQuery;
  if (overlayErr || !overlayRows) {
    console.error('Failed to fetch website_product_pages:', overlayErr);
    process.exit(1);
  }

  const productIds = [...new Set(overlayRows.map(r => r.product_id))];
  if (productIds.length === 0) {
    console.log('No package_kits found for this website. Exiting.');
    process.exit(0);
  }

  // Fetch package_kits details for those IDs
  const { data: packages, error: pkgErr } = await admin
    .from('package_kits')
    .select('id,name,description,program_highlights,translations')
    .in('id', productIds)
    .not('name', 'is', null);

  if (pkgErr || !packages) {
    console.error('Failed to fetch package_kits:', pkgErr);
    process.exit(1);
  }

  // Apply limit (when not using --ids)
  const targets = args.ids ? packages : packages.slice(0, args.limit);

  console.log(`Packages linked to website: ${productIds.length}`);
  console.log(`Packages to process: ${targets.length}\n`);

  // ── Process each package ────────────────────────────────────────────────────

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS));

    const pkg = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${pkg.id.slice(0, 8)} "${(pkg.name ?? '').slice(0, 45)}"... `);

    const r = await transcreatePackage(admin, pkg, args.dryRun, forceUpdate);

    if (r.status === 'success') {
      console.log(`OK "${r.enName}" [${r.translatedFields.join(', ')}] tokens:${r.tokensUsed}`);
    } else if (r.status === 'skipped') {
      console.log(`SKIP ${r.reason}`);
    } else if (r.status === 'dry-run') {
      console.log(`DRY fields:[${r.fields.join(', ')}]`);
    } else {
      console.log(`ERROR ${r.reason}`);
    }

    results.push(r);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const success = results.filter(r => r.status === 'success');
  const skipped = results.filter(r => r.status === 'skipped');
  const dryRuns = results.filter(r => r.status === 'dry-run');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n--- Summary ---`);
  console.log(`Success: ${success.length} | Skipped: ${skipped.length} | Dry-run: ${dryRuns.length} | Errors: ${errors.length}`);

  if (success.length > 0) {
    const totalTokens = success.reduce((acc, r) => acc + (typeof r.tokensUsed === 'number' ? r.tokensUsed : 0), 0);
    console.log(`Total tokens used: ${totalTokens}`);
    success.forEach(r => console.log(`  OK ${r.id.slice(0, 8)} "${r.name}" -> "${r.enName}" [${r.translatedFields.join(', ')}]`));
  }

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach(e => console.log(`  ERROR ${e.id.slice(0, 8)} "${e.name}": ${e.reason}`));
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
