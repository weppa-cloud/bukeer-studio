import { FullConfig } from '@playwright/test';

/**
 * Prewarms Turbopack-heavy routes before E2E tests start.
 * Without this, the first request to complex SSR routes (like /site/[subdomain])
 * returns 500 because the build-manifest.json hasn't been generated yet.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  // Grab website ID from env (set in .env.local)
  const websiteId = process.env.E2E_WEBSITE_ID ?? '';

  const routesToWarm = [
    '/login',
    '/dashboard',
    '/site/colombiatours',
    ...(websiteId ? [
      `/dashboard/${websiteId}/pages`,
      `/dashboard/${websiteId}/analytics`,
      `/dashboard/${websiteId}/contenido`,
      `/dashboard/${websiteId}/seo`,
    ] : []),
  ];

  console.log(`\n[globalSetup] Prewarming ${routesToWarm.length} routes on ${baseURL}...`);

  for (const route of routesToWarm) {
    const url = `${baseURL}${route}`;
    const maxAttempts = 60;
    let warmed = false;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.status < 500) {
          console.log(`[globalSetup] Warmed ${route} (${res.status}) in ${i + 1}s`);
          warmed = true;
          break;
        }
      } catch {
        // Server not ready yet — retry
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!warmed) {
      console.warn(`[globalSetup] Warning: ${route} not ready after ${maxAttempts}s — tests may fail`);
    }
  }
}

export default globalSetup;
