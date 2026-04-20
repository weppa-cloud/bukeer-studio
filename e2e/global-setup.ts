import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function ensureRequiredRpcsAvailable() {
  if (process.env.E2E_SKIP_RPC_PREFLIGHT === '1') {
    console.log('[globalSetup] RPC preflight skipped via E2E_SKIP_RPC_PREFLIGHT=1');
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[globalSetup] Skipping RPC preflight (missing Supabase credentials)');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const probes: Array<{ name: string; args: Record<string, string> }> = [
    {
      name: 'resolve_theme_designer_v1',
      args: { p_account_id: ZERO_UUID, p_website_id: ZERO_UUID },
    },
    {
      name: 'get_latest_pilot_theme_snapshot',
      args: { p_website_id: ZERO_UUID },
    },
  ];

  const missing: string[] = [];
  for (const probe of probes) {
    const { error } = await supabase.rpc(probe.name, probe.args);
    if (error?.code === 'PGRST202') {
      missing.push(probe.name);
      continue;
    }

    if (error) {
      console.warn(`[globalSetup] RPC probe ${probe.name} returned ${error.code}: ${error.message}`);
      continue;
    }

    console.log(`[globalSetup] RPC probe ok: ${probe.name}`);
  }

  if (missing.length) {
    throw new Error(
      `[globalSetup] Missing required Supabase RPC(s): ${missing.join(', ')}. ` +
      'Apply pending migrations before running E2E.',
    );
  }
}

/**
 * Prewarms Turbopack-heavy routes before E2E tests start.
 * Without this, the first request to complex SSR routes (like /site/[subdomain])
 * returns 500 because the build-manifest.json hasn't been generated yet.
 */
async function globalSetup(config: FullConfig) {
  await ensureRequiredRpcsAvailable();

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
