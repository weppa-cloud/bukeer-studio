#!/usr/bin/env node
/**
 * Verifies that paid landing URLs return HTTP 200 directly (no redirect chain).
 *
 * Usage:
 *   node scripts/growth/check-paid-landings-http.mjs
 */

const URLS = [
  'https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos',
  'https://colombiatours.travel/agencia-de-viajes-a-colombia-para-espanoles',
  'https://colombiatours.travel/viajes-a-colombia-desde-chile',
  'https://colombiatours.travel/pt/pacotes-colombia',
  'https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias',
];

async function headOrGet(url) {
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return head;
  } catch {
    return fetch(url, { method: 'GET', redirect: 'manual' });
  }
}

async function main() {
  let failed = 0;

  for (const url of URLS) {
    const res = await headOrGet(url);
    const status = res.status;
    const location = res.headers.get('location');
    const ok = status === 200;
    const marker = ok ? 'OK' : 'WARN';
    console.log(`${marker} ${status} ${url}${location ? ` -> ${location}` : ''}`);
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\n${failed} paid landing URL(s) are not direct 200.`);
    process.exit(1);
  }

  console.log('\nAll paid landing URLs returned direct 200.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

