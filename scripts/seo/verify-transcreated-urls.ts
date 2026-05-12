/**
 * verify-transcreated-urls.ts
 *
 * CLI script that runs the post-publish verifier against a set of transcreated
 * URLs. Can be invoked manually or via cron for F7 monitoring.
 *
 * Usage:
 *   npx tsx scripts/seo/verify-transcreated-urls.ts [--batch batch1|all]
 *
 * Batch definitions are in scripts/seo/verification-batches.ts
 */

import { verifyPublishedUrl } from '../../lib/seo/post-publish-verifier';
import type { VerificationResult } from '../../lib/seo/verification-types';

interface BatchItem {
  url: string;
  locale: string;
  label: string;
}

const BATCHES: Record<string, BatchItem[]> = {
  batch1: [
    // Cartagena Package (newly created)
    { url: 'https://colombiatours.travel/de/cartagena-reise', locale: 'de-DE', label: 'Cartagena Package DE' },
    { url: 'https://colombiatours.travel/fr/carthagene',     locale: 'fr-FR', label: 'Cartagena Package FR' },
    { url: 'https://colombiatours.travel/pt/cartagena',      locale: 'pt-BR', label: 'Cartagena Package PT' },
    // Medellin Package (updated)
    { url: 'https://colombiatours.travel/de/medellin-reise',  locale: 'de-DE', label: 'Medellin Package DE' },
    { url: 'https://colombiatours.travel/fr/medellin',        locale: 'fr-FR', label: 'Medellin Package FR' },
    { url: 'https://colombiatours.travel/pt/medellin',        locale: 'pt-BR', label: 'Medellin Package PT' },
    // Eje Cafetero Package (updated)
    { url: 'https://colombiatours.travel/de/eje-cafetero-reise', locale: 'de-DE', label: 'Eje Cafetero DE' },
    { url: 'https://colombiatours.travel/fr/eje-cafetero',      locale: 'fr-FR', label: 'Eje Cafetero FR' },
    { url: 'https://colombiatours.travel/pt/eixo-cafeeiro',     locale: 'pt-BR', label: 'Eje Cafetero PT' },
    // Santa Marta Package (updated)
    { url: 'https://colombiatours.travel/de/santa-marta-reise', locale: 'de-DE', label: 'Santa Marta DE' },
    { url: 'https://colombiatours.travel/fr/santa-marta',       locale: 'fr-FR', label: 'Santa Marta FR' },
    { url: 'https://colombiatours.travel/pt/santa-marta',       locale: 'pt-BR', label: 'Santa Marta PT' },
  ],
};

function formatResult(label: string, r: VerificationResult): void {
  const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
  const eligible = r.sitemap_eligible ? 'sitemap_ok' : 'sitemap_BLOCKED';
  console.log(`${icon} ${label}: ${r.status} (${eligible})`);
  for (const check of r.checks) {
    if (!check.passed) {
      const ci = check.critical ? '🔴' : '🟡';
      console.log(`  ${ci} ${check.label}: ${check.detail ?? 'FAILED'}`);
    }
  }
  if (r.checks.every(c => c.passed)) {
    console.log(`  All ${r.checks.length} checks passed`);
  }
}

async function main() {
  const batchArg = process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] ?? 'batch1';
  const batch = BATCHES[batchArg];
  if (!batch) {
    console.error(`Unknown batch: ${batchArg}. Available: ${Object.keys(BATCHES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🔍 Verifying batch "${batchArg}" — ${batch.length} URLs\n`);
  console.log('='.repeat(60));

  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const item of batch) {
    console.log(`\n--- ${item.label} ---`);
    try {
      const result = await verifyPublishedUrl(item.url, item.locale, { timeout: 15_000 });
      formatResult(item.label, result);
      if (result.status === 'pass') passed++;
      else if (result.status === 'warn') warned++;
      else failed++;
    } catch (err) {
      console.error(`❌ ${item.label}: CRASHED — ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ✅ ${passed} passed | ⚠️ ${warned} warnings | ❌ ${failed} failed`);
  console.log(`URLs checked: ${batch.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
