#!/usr/bin/env npx tsx
/**
 * One-time migration: Convert websites.theme from flat v2 shape to v3 { tokens, profile }.
 *
 * Usage:
 *   cd packages/theme-sdk
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/migrate-websites-to-v3.ts
 *
 * Dry run (no writes):
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/migrate-websites-to-v3.ts
 */

import { DESIGN_TOKENS_SCHEMA_VERSION } from '../src/contracts/design-tokens';
import { THEME_PROFILE_SCHEMA_VERSION } from '../src/contracts/theme-profile';
import { TOURISM_PRESETS, getPresetBySlug } from '../src/presets/tourism-presets';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key for admin access
const DRY_RUN = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

async function query<T>(table: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Query ${table} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T[]>;
}

async function patch(table: string, id: string, body: Record<string, unknown>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Patch ${table}/${id} failed: ${res.status} ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Migration logic
// ---------------------------------------------------------------------------

interface WebsiteRow {
  id: string;
  subdomain: string;
  theme: Record<string, unknown> | null;
  content: { siteName?: string } | null;
}

function isAlreadyV3(theme: Record<string, unknown>): boolean {
  return 'tokens' in theme && typeof theme.tokens === 'object';
}

/**
 * Convert flat v2 theme to v3 { tokens, profile }.
 * Uses the Corporate preset as base for missing fields,
 * overriding with existing values where available.
 */
function convertToV3(
  theme: Record<string, unknown>,
  siteName: string,
): { tokens: Record<string, unknown>; profile: Record<string, unknown> } {
  const corporatePreset = getPresetBySlug('corporate')!;
  const baseTokens = JSON.parse(JSON.stringify(corporatePreset.tokens));
  const baseProfile = JSON.parse(JSON.stringify(corporatePreset.profile));

  // Override colors
  const seedColor = (theme.seedColor as string) || '#455A64';
  baseTokens.colors.seedColor = seedColor;

  // If v2 has light/dark color maps, use them (+ fill missing surface containers)
  const light = theme.light as Record<string, string> | undefined;
  const dark = theme.dark as Record<string, string> | undefined;

  if (light && typeof light === 'object' && Object.keys(light).length > 0) {
    // Merge existing colors into base, keeping base for any missing fields
    baseTokens.colors.light = { ...baseTokens.colors.light, ...light };
  }
  if (dark && typeof dark === 'object' && Object.keys(dark).length > 0) {
    baseTokens.colors.dark = { ...baseTokens.colors.dark, ...dark };
  }

  // Override typography
  const typo = theme.typography as { headingFont?: string; bodyFont?: string; scale?: string } | undefined;
  if (typo) {
    if (typo.headingFont) baseTokens.typography.display.family = typo.headingFont;
    if (typo.bodyFont) baseTokens.typography.body.family = typo.bodyFont;
    if (typo.scale) baseTokens.typography.scale = typo.scale;
  }

  // Override shape
  if (theme.radius) {
    baseTokens.shape.radius = theme.radius;
  }

  // Override layout
  const layout = theme.layout as { variant?: string; heroStyle?: string; navStyle?: string } | undefined;
  if (layout) {
    if (layout.variant) baseProfile.layout.variant = layout.variant;
    if (layout.heroStyle) baseProfile.layout.heroStyle = layout.heroStyle;
    if (layout.navStyle) baseProfile.layout.navStyle = layout.navStyle;
  }

  // Override color mode
  if (theme.mode) {
    baseProfile.colorMode = theme.mode === 'dark' ? 'dark' : theme.mode === 'light' ? 'light' : 'system';
  }

  // Set brand name from website content
  baseProfile.brand.name = siteName || '';

  return { tokens: baseTokens, profile: baseProfile };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🎨 Theme v3 Migration ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Fetch all websites with non-null theme that aren't already v3
  const websites = await query<WebsiteRow>('websites', {
    select: 'id,subdomain,theme,content',
    deleted_at: 'is.null',
    'theme': 'not.is.null',
  });

  const toMigrate = websites.filter((w) => w.theme && !isAlreadyV3(w.theme));
  const alreadyV3 = websites.filter((w) => w.theme && isAlreadyV3(w.theme));

  console.log(`   Total websites with theme: ${websites.length}`);
  console.log(`   Already v3: ${alreadyV3.length}`);
  console.log(`   Need migration: ${toMigrate.length}`);
  console.log('');

  if (toMigrate.length === 0) {
    console.log('✅ All websites already use v3 theme shape. Nothing to do.');
    return;
  }

  for (const website of toMigrate) {
    const siteName = website.content?.siteName || website.subdomain;
    const v3Theme = convertToV3(website.theme!, siteName);

    console.log(`   📦 ${website.subdomain} (${website.id})`);
    console.log(`      seedColor: ${website.theme!.seedColor || 'none'}`);
    console.log(`      has light/dark: ${!!website.theme!.light}/${!!website.theme!.dark}`);
    console.log(`      → v3 tokens.$schema: ${(v3Theme.tokens as Record<string, unknown>).$schema}`);

    if (!DRY_RUN) {
      await patch('websites', website.id, { theme: v3Theme });
      console.log(`      ✅ Migrated`);
    } else {
      console.log(`      ⏭️  Skipped (dry run)`);
    }
  }

  console.log(`\n${DRY_RUN ? '🔍 Dry run complete' : '✅ Migration complete'}. ${toMigrate.length} websites processed.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
