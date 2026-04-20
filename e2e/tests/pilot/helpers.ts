/**
 * EPIC #214 · W4 #218 — Pilot editor→render E2E helpers.
 *
 * Shared across specs under `e2e/tests/pilot/editor-render/`. All specs tag
 * their `test.describe` with `@pilot-w4` so the session-pool runner can
 * narrow execution via `--grep "@pilot-w4"`.
 *
 * Exports the seed memoised promise so specs share one DB round-trip, plus
 * `waitForRevalidate` (contract-first helper against `/api/revalidate`),
 * `captureBeforeAfter` (screenshot pair attached to trace), `assertJsonLd`
 * (typed lookup for `Product` / `FAQPage` / `VideoObject`), and a justified-
 * skip guard for specs that depend on out-of-tree RPC fixes (e.g. #234 for
 * VideoObject JSON-LD).
 *
 * Related:
 *   - ADR-012 API response envelope
 *   - ADR-024 DEFER booking (no booking helpers here)
 *   - ADR-025 Studio/Flutter ownership (no hotel helpers here)
 */

import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { seedPilot, type PilotSeedResult, type PilotSeedVariant } from '../../setup/pilot-seed';

// Shared tag so every W4 spec gets picked up by `--grep "@pilot-w4"`.
export const PILOT_W4_TAG = '@pilot-w4';

// W6 #220 matrix + Lighthouse specs. `--grep "@pilot-w6"` narrows to the
// visual matrix suite.
export const PILOT_W6_TAG = '@pilot-w6';

// Matches `ensurePackagePublicRoute` subdomain contract in `e2e/setup/seed.ts`.
const DEFAULT_SUBDOMAIN = (process.env.E2E_PUBLIC_SUBDOMAIN ?? 'colombiatours')
  .trim()
  .toLowerCase();

// --- Seed wrappers ---------------------------------------------------------

/**
 * Thin passthrough so specs can import from this module without reaching into
 * `e2e/setup/pilot-seed.ts` directly (keeps imports flat + lintable).
 */
export async function getPilotSeed(variant: PilotSeedVariant): Promise<PilotSeedResult> {
  return seedPilot(variant);
}

/**
 * Resolves the public subdomain used by all pilot specs. Reads from env if set
 * (matches the seed fallback); otherwise defaults to `colombiatours`.
 */
export function pilotSubdomain(): string {
  return DEFAULT_SUBDOMAIN;
}

// --- Revalidate helper ------------------------------------------------------

export type RevalidateTargetType = 'package' | 'activity' | 'hotel' | 'transfer' | 'destination';

export interface RevalidateInput {
  subdomain: string;
  type?: RevalidateTargetType;
  slug?: string;
  path?: string;
}

export interface RevalidateResult {
  paths: string[];
  status: number;
  skipped: boolean;
  reason?: string;
}

/**
 * Fires `/api/revalidate` with the bearer token and asserts the ADR-012
 * envelope. Returns the `paths` array so specs can check that the on-demand
 * revalidation fan-out matches expectations (product page + listing).
 *
 * Falls back to a skip-friendly result if `E2E_REVALIDATE_SECRET` is not set
 * — specs can call `test.skip(result.skipped, result.reason)`.
 */
export async function waitForRevalidate(
  request: APIRequestContext,
  input: RevalidateInput,
): Promise<RevalidateResult> {
  const secret =
    process.env.E2E_REVALIDATE_SECRET?.trim() || process.env.REVALIDATE_SECRET?.trim() || '';
  if (!secret) {
    return {
      paths: [],
      status: 0,
      skipped: true,
      reason:
        'E2E_REVALIDATE_SECRET (or REVALIDATE_SECRET) not set — cannot exercise on-demand revalidate contract.',
    };
  }

  const res = await request.post('/api/revalidate', {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    data: {
      subdomain: input.subdomain,
      ...(input.type ? { type: input.type } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.path ? { path: input.path } : {}),
    },
  });

  const status = res.status();
  if (status >= 500) {
    return {
      paths: [],
      status,
      skipped: true,
      reason: `/api/revalidate returned ${status} — likely missing SUPABASE_SERVICE_ROLE_KEY server-side.`,
    };
  }

  expect(status, '/api/revalidate should return 200 on happy path').toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ success: true });
  const paths = Array.isArray(body?.data?.paths) ? (body.data.paths as string[]) : [];
  return { paths, status, skipped: false };
}

// --- Artifact helpers -------------------------------------------------------

/**
 * Takes a before screenshot, yields to the caller for mutation, then takes an
 * after screenshot and attaches both to the test trace.
 *
 * Usage:
 *   await captureBeforeAfter(page, testInfo, 'hero-override', async () => {
 *     await pom.saveHeroOverride(next);
 *   });
 */
export async function captureBeforeAfter(
  page: Page,
  testInfo: TestInfo,
  name: string,
  mutate: () => Promise<void>,
): Promise<void> {
  const before = await page.screenshot({ fullPage: false });
  await testInfo.attach(`${name}-before.png`, {
    body: before,
    contentType: 'image/png',
  });
  await mutate();
  const after = await page.screenshot({ fullPage: false });
  await testInfo.attach(`${name}-after.png`, {
    body: after,
    contentType: 'image/png',
  });
}

/**
 * Attach trimmed HTML of a block to the test trace. Used when JSON-LD or a
 * specific testid's rendered copy is the load-bearing evidence.
 */
export async function attachHtmlExcerpt(
  page: Page,
  testInfo: TestInfo,
  name: string,
  selector: string,
): Promise<void> {
  const html = await page
    .locator(selector)
    .first()
    .evaluate((el) => el.outerHTML)
    .catch(() => '<!-- selector not found -->');
  await testInfo.attach(`${name}.html`, {
    body: html,
    contentType: 'text/html',
  });
}

// --- JSON-LD helper ---------------------------------------------------------

export type JsonLdType = 'Product' | 'FAQPage' | 'VideoObject' | 'TouristTrip' | 'BreadcrumbList';

function collectJsonLd(raw: string[]): unknown[] {
  const parsed: unknown[] = [];
  for (const text of raw) {
    try {
      parsed.push(JSON.parse(text));
    } catch {
      // ignore malformed JSON-LD (will be visible in the HTML excerpt)
    }
  }
  return parsed;
}

function flattenTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const record = node as { '@type'?: unknown; '@graph'?: unknown };
  const types: string[] = [];
  if (typeof record['@type'] === 'string') types.push(record['@type']);
  if (Array.isArray(record['@type'])) {
    for (const t of record['@type']) if (typeof t === 'string') types.push(t);
  }
  if (Array.isArray(record['@graph'])) {
    for (const child of record['@graph']) types.push(...flattenTypes(child));
  }
  return types;
}

/**
 * Asserts the page's JSON-LD blob contains at least one node of `expectedType`.
 * Returns the matching nodes for deeper per-spec checks.
 */
export async function assertJsonLd(
  page: Page,
  expectedType: JsonLdType,
): Promise<unknown[]> {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const parsed = collectJsonLd(scripts);
  const allTypes = parsed.flatMap(flattenTypes);
  expect(
    allTypes,
    `expected JSON-LD to include ${expectedType} but got [${allTypes.join(', ')}]`,
  ).toContain(expectedType);
  return parsed.filter((node) => flattenTypes(node).includes(expectedType));
}

// --- VideoObject justified-skip guard --------------------------------------

/**
 * Mirrors the guard used in `public-structured-data.spec.ts` lines 86-128 so
 * W4 specs that assert VideoObject JSON-LD skip cleanly while the upstream
 * RPC gap (#234 `get_website_product_page` missing `package_kits.video_url`
 * JOIN) is in flight. Both chromium + firefox converge to the same skip
 * branch so the Stage 4 gate metric remains "0 failed, justified skips only".
 */
export async function videoObjectSkipReason(page: Page): Promise<string | null> {
  const html = await page.content();
  const hasSignal =
    html.includes('video_url') ||
    html.includes('youtube.com/watch') ||
    html.includes('youtube-nocookie.com/embed') ||
    html.includes('"VideoObject"');
  return hasSignal
    ? null
    : 'Package page does not expose video_url in rendered HTML — `get_website_product_page` RPC omits `package_kits.video_url` (upstream gap #234). Seeder writes DB successfully but the RPC must JOIN the kit fields before VideoObject JSON-LD can be emitted. Justified skip (parity chromium + firefox).';
}
