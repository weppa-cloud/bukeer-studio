#!/usr/bin/env node
/**
 * DORMANT — do not run until migration #129 (locale column) ships.
 * Verifies `locale` column exists on target tables; aborts with clear error if missing.
 *
 * One-shot backfill from the interim slug-prefix convention
 * (see lib/seo/slug-locale.ts) to the native `locale` column introduced
 * by migration #129.
 *
 * For each row in `website_blog_posts`, `website_pages`, `destinations`:
 *   1. If slug starts with a known locale prefix, set `locale` to that locale
 *      and strip the prefix from `slug`.
 *   2. Else set `locale` to the website's `default_locale` (fallback 'es-CO').
 *   3. Idempotent: re-running on already-migrated rows is a no-op.
 *
 * Usage:
 *   node scripts/seo/migrate-slug-prefix-to-locale-column.mjs \
 *        [--dry-run] [--website-id=<uuid>] \
 *        [--table=website_blog_posts|website_pages|destinations|all]
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_LOCALE = 'es-CO';
const TABLES = ['website_blog_posts', 'website_pages', 'destinations'];

// ---------------------------------------------------------------------------
// Local copy of slug-locale helpers (ESM script cannot import TS directly).
// Keep behavior in sync with lib/seo/slug-locale.ts.
// ---------------------------------------------------------------------------

const LOCALE_ALLOWED = /^[a-zA-Z0-9_-]+$/;

function localeToPrefix(locale) {
  if (typeof locale !== 'string' || locale.trim().length === 0) {
    throw new Error('locale must be non-empty string');
  }
  const trimmed = locale.trim();
  if (!LOCALE_ALLOWED.test(trimmed)) {
    throw new Error(`locale contains invalid characters: ${locale}`);
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function detectLocaleFromSlug(slug, candidates) {
  if (typeof slug !== 'string' || slug.trim().length === 0) return null;
  const trimmedSlug = slug.trim();
  const sorted = candidates
    .filter((c) => typeof c === 'string' && c.trim().length > 0)
    .map((c) => ({ locale: c, prefix: localeToPrefix(c) }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { locale, prefix } of sorted) {
    if (trimmedSlug.startsWith(`${prefix}-`)) return locale;
  }
  return null;
}

function stripLocalePrefix(slug, locale) {
  const prefix = localeToPrefix(locale);
  const needle = `${prefix}-`;
  return slug.startsWith(needle) ? slug.slice(needle.length) : slug;
}

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

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

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    dryRun: false,
    websiteId: '',
    table: 'all',
  };
  for (const token of args) {
    if (token === '--dry-run') parsed.dryRun = true;
    else if (token.startsWith('--website-id=')) {
      parsed.websiteId = token.slice('--website-id='.length).trim();
    } else if (token.startsWith('--table=')) {
      parsed.table = token.slice('--table='.length).trim();
    } else if (token === '--help' || token === '-h') {
      console.log(
        'Usage: migrate-slug-prefix-to-locale-column.mjs [--dry-run] [--website-id=<uuid>] [--table=all|website_blog_posts|website_pages|destinations]',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (parsed.table !== 'all' && !TABLES.includes(parsed.table)) {
    throw new Error(
      `Invalid --table=${parsed.table}. Must be one of: all, ${TABLES.join(', ')}`,
    );
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Preflight: verify `locale` column exists on each target table.
// Uses PostgREST HEAD by selecting `locale` with limit 0.
// ---------------------------------------------------------------------------

async function assertLocaleColumn(client, table) {
  const { error } = await client.from(table).select('locale').limit(0);
  if (error) {
    // PostgREST returns a 400 with message referencing missing column when
    // the column doesn't exist. Any error here means we cannot proceed.
    throw new Error(
      `locale column missing on ${table}; run migration #129 first (supabase error: ${error.message})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Website candidate locales
// ---------------------------------------------------------------------------

async function loadWebsites(client, websiteId) {
  let q = client
    .from('websites')
    .select('id, default_locale, supported_locales');
  if (websiteId) q = q.eq('id', websiteId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to load websites: ${error.message}`);

  return (data ?? []).map((w) => {
    const def =
      typeof w.default_locale === 'string' && w.default_locale.trim()
        ? w.default_locale.trim()
        : DEFAULT_LOCALE;
    const supported = Array.isArray(w.supported_locales)
      ? w.supported_locales.filter(
          (x) => typeof x === 'string' && x.trim().length > 0,
        )
      : [];
    // Candidates = supported minus default (default is the "bare" locale).
    const candidates = Array.from(
      new Set([...supported].filter((loc) => loc !== def)),
    );
    return { id: w.id, defaultLocale: def, candidates };
  });
}

// ---------------------------------------------------------------------------
// Per-table migration
// ---------------------------------------------------------------------------

async function migrateTable(client, table, websites, { dryRun }) {
  const stats = {
    table,
    rowsScanned: 0,
    rowsPrefixed: 0,
    rowsDefaulted: 0,
    rowsSkipped: 0,
  };

  for (const site of websites) {
    const { data, error } = await client
      .from(table)
      .select('id, slug, locale, website_id')
      .eq('website_id', site.id);

    if (error) {
      console.error(
        `[${table}] failed to read rows for website=${site.id}: ${error.message}`,
      );
      continue;
    }

    for (const row of data ?? []) {
      stats.rowsScanned += 1;

      // Idempotent: a row with a real locale set is already migrated.
      if (typeof row.locale === 'string' && row.locale.trim().length > 0) {
        stats.rowsSkipped += 1;
        continue;
      }

      if (typeof row.slug !== 'string' || row.slug.trim().length === 0) {
        stats.rowsSkipped += 1;
        continue;
      }

      const detected = detectLocaleFromSlug(row.slug, site.candidates);

      let update;
      if (detected) {
        update = {
          locale: detected,
          slug: stripLocalePrefix(row.slug, detected),
        };
        stats.rowsPrefixed += 1;
      } else {
        update = { locale: site.defaultLocale };
        stats.rowsDefaulted += 1;
      }

      if (dryRun) {
        console.log(
          `[dry-run][${table}] id=${row.id} website=${site.id} slug='${row.slug}' → ${JSON.stringify(update)}`,
        );
        continue;
      }

      const { error: upErr } = await client
        .from(table)
        .update(update)
        .eq('id', row.id);
      if (upErr) {
        console.error(
          `[${table}] failed to update id=${row.id}: ${upErr.message}`,
        );
      }
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  loadEnvFile();
  const args = parseArgs();
  const url = requiredEnv('SUPABASE_URL');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const targetTables = args.table === 'all' ? TABLES : [args.table];

  // Preflight: assert locale column on all target tables.
  for (const t of targetTables) {
    await assertLocaleColumn(client, t);
  }

  const websites = await loadWebsites(client, args.websiteId);
  if (websites.length === 0) {
    console.log(
      args.websiteId
        ? `No website found for --website-id=${args.websiteId}`
        : 'No websites found.',
    );
    process.exit(0);
  }

  console.log(
    `Migrating ${targetTables.length} table(s) across ${websites.length} website(s)${args.dryRun ? ' [dry-run]' : ''}`,
  );

  const allStats = [];
  for (const table of targetTables) {
    const stats = await migrateTable(client, table, websites, {
      dryRun: args.dryRun,
    });
    allStats.push(stats);
  }

  console.log('\n=== Migration summary ===');
  console.table(allStats);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
