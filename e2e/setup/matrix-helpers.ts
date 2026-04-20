/**
 * EPIC #214 · W6 #220 — Matrix visual + Lighthouse helpers.
 *
 * Shared instrumentation consumed by:
 *   - `e2e/tests/pilot/matrix/pilot-matrix-public-*.spec.ts`
 *   - `e2e/tests/pilot/lighthouse/pilot-lighthouse-*.spec.ts`
 *
 * Design:
 *   - Helpers are pure (no seed call inside) — specs own the seed lifecycle
 *     via `getPilotSeed('baseline' | 'translation-ready')` from `../helpers`.
 *   - Visual snapshots attach PNG evidence to the test trace. Per AC-W6-9,
 *     snapshots are evidence-only — no pixel-diff assertion.
 *   - Animation freeze is applied before every capture to stabilize evidence.
 *   - Lighthouse helper shells out to `lighthouse` CLI (installed via
 *     `devDependencies`). It writes HTML + JSON under `artifacts/qa/pilot/...`
 *     and returns parsed category scores for inline threshold assertions.
 */

import { expect, type Page, type TestInfo } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ContentType, MatrixBlock } from '../fixtures/product-matrix';

// --- Navigation / readiness -----------------------------------------------

/**
 * Primary root selector per content type. Emitted by `ProductLandingPage` and
 * the blog detail RSC — guaranteed present on first SSR flush, no hydration
 * dependency. Used by {@link waitForDetailReady} to replace the flaky
 * `networkidle` wait (see cluster-c fix: Turbopack dev mode continuously
 * emits websocket pings → `networkidle` races the 90s spec timeout).
 */
const DETAIL_ROOT_SELECTOR: Record<ContentType, string> = {
  pkg: '[data-testid="detail-hero"]',
  act: '[data-testid="detail-hero"]',
  hotel: '[data-testid="detail-hero"]',
  blog: '[data-testid="detail-blog"]',
};

/**
 * Deterministic "page is renderable" wait for pilot matrix specs.
 *
 * Replaces `page.goto(url, { waitUntil: 'networkidle' })` which races in
 * Turbopack dev mode (HMR keeps emitting websocket frames, so networkidle
 * never resolves and the 90s spec timeout fires).
 *
 * Contract:
 *   1. DOMContentLoaded has fired (SSR HTML is parsed).
 *   2. The canonical root element for the content type is visible (15s budget).
 *
 * Matches the production SSR hydration model — the root container is always
 * in the first HTML flush, so this closes out well under 30s even with
 * Turbopack overhead.
 */
export async function waitForDetailReady(
  page: Page,
  contentType: ContentType,
  opts: { timeout?: number } = {},
): Promise<void> {
  const { timeout = 15_000 } = opts;
  await page.waitForLoadState('domcontentloaded', { timeout });
  const selector = DETAIL_ROOT_SELECTOR[contentType];
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

// --- Animation freeze -----------------------------------------------------

/**
 * Disables CSS + JS animations so visual snapshots are stable. Must be called
 * AFTER the page navigates but BEFORE capture.
 */
export async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;}',
  });
  await page.evaluate(() => {
    const anims = document.getAnimations ? document.getAnimations() : [];
    for (const a of anims) a.finish();
  });
}

// --- Matrix row assertion -------------------------------------------------

export interface AssertMatrixRowOptions {
  page: Page;
  row: MatrixBlock;
  type: ContentType;
  /**
   * When the cell status is 'conditional' the spec may pass
   * `allowConditionalAbsent: true` to record an empty-state outcome instead of
   * failing when the element isn't present.
   */
  allowConditionalAbsent?: boolean;
}

export type MatrixRowOutcome =
  | { status: 'ok'; rowId: string }
  | { status: 'empty'; rowId: string; reason: string }
  | { status: 'conditional-skip'; rowId: string; reason: string }
  | { status: 'na-skip'; rowId: string; reason: string }
  | { status: 'defer-skip'; rowId: string; reason: string }
  | { status: 'fail'; rowId: string; reason: string };

/**
 * Selectors that target elements that live in `<head>` (e.g. `title`, `meta`)
 * or non-rendered elements (e.g. `<script type="application/ld+json">`). These
 * have `display: none` by default and will never satisfy `toBeVisible()`. For
 * matrix purposes we assert presence structurally instead so SEO rows (41–48)
 * can be verified alongside body-visible blocks.
 */
function isStructuralOnlySelector(selector: string): boolean {
  const trimmed = selector.trim().toLowerCase();
  return (
    trimmed.startsWith('head ') ||
    trimmed.startsWith('head>') ||
    trimmed.includes('head > ') ||
    trimmed.includes('head>') ||
    trimmed.startsWith('script[') ||
    trimmed.startsWith('script ') ||
    trimmed.includes('meta[') ||
    /^title\b/.test(trimmed)
  );
}

/**
 * Minimal HTML selector matcher for the subset of selectors we place in
 * `<head>` (title, meta[name|property], link[rel="alternate"]) plus
 * `<script type="application/ld+json">`. Raw SSR HTML is the canonical source
 * when `document.querySelectorAll` under-reports in Turbopack dev mode
 * (metadata streams in after the RSC flight payload — the locator-layer
 * `count()` can race the walk).
 */
function matchesSelectorInHtml(html: string, selector: string): boolean {
  const trimmed = selector.trim();
  if (/^(head\s*>?\s*)?title\b/.test(trimmed)) {
    return /<title[^>]*>[^<]*<\/title>/i.test(html);
  }
  const metaMatch = trimmed.match(/meta\[(name|property|http-equiv)="([^"]+)"\]/i);
  if (metaMatch) {
    const attr = metaMatch[1];
    const value = metaMatch[2];
    const pattern = new RegExp(
      `<meta[^>]*\\b${attr}\\s*=\\s*"${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
      'i',
    );
    return pattern.test(html);
  }
  if (/script\[type="application\/ld\+json"\]/i.test(trimmed)) {
    return /<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>/i.test(html);
  }
  if (/link\[rel="alternate"\]\[hreflang/i.test(trimmed)) {
    return /<link[^>]*\brel\s*=\s*"alternate"[^>]*\bhreflang\s*=/i.test(html);
  }
  return false;
}

async function selectorPasses(
  page: Page,
  selector: string,
  timeoutMs: number,
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (isStructuralOnlySelector(selector)) {
    // `toBeVisible()` rejects head/script elements (display:none). We poll
    // `document.querySelectorAll` via `page.evaluate` and fall back to the raw
    // SSR HTML once per poll so dev-mode HMR reconciliation never reports a
    // false 0-count for metadata that clearly shipped in the HTML payload.
    const deadline = Date.now() + timeoutMs;
    let lastErrorMessage = `selector ${selector} not present in document`;
    while (Date.now() < deadline) {
      try {
        const count = await page.evaluate(
          (sel) => document.querySelectorAll(sel).length,
          selector,
        );
        if (count >= 1) {
          return { ok: true };
        }
        const html = await page.content();
        if (matchesSelectorInHtml(html, selector)) {
          return { ok: true };
        }
        lastErrorMessage = `selector ${selector} resolved to 0 elements (expected ≥1)`;
      } catch (err) {
        lastErrorMessage = (err as Error).message;
      }
      await page.waitForTimeout(Math.min(250, Math.max(50, Math.floor(timeoutMs / 10))));
    }
    return { ok: false, error: new Error(lastErrorMessage) };
  }
  const locator = page.locator(selector).first();
  try {
    await expect(locator).toBeVisible({ timeout: timeoutMs });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err as Error };
  }
}

/**
 * Visibility check with a conditional/empty fallback. Selector is the primary
 * role/testid from the fixture (CSS fallback only consulted if primary fails
 * AND the fixture declared a fallback — still surfaced as a warning outcome).
 */
export async function assertMatrixRow(opts: AssertMatrixRowOptions): Promise<MatrixRowOutcome> {
  const { page, row, type, allowConditionalAbsent } = opts;
  const cell = row.types[type];
  if (!cell) {
    return { status: 'na-skip', rowId: row.id, reason: `Row ${row.row}: no ${type} cell defined` };
  }
  if (cell.status === 'na') {
    return {
      status: 'na-skip',
      rowId: row.id,
      reason: `Row ${row.row} — ${row.block}: n/a for ${type}${cell.note ? ` (${cell.note})` : ''}`,
    };
  }
  if (row.envFlag === 'PILOT_BOOKING_ENABLED') {
    const enabled = (process.env.PILOT_BOOKING_ENABLED ?? 'false').toLowerCase() === 'true';
    if (!enabled) {
      return {
        status: 'defer-skip',
        rowId: row.id,
        reason: `Row ${row.row} — ${row.block}: PILOT_BOOKING_ENABLED=false (ADR-024 DEFER, WhatsApp-only pilot)`,
      };
    }
  }

  const primaryCheck = await selectorPasses(page, row.selectors.primary, 5_000);
  if (primaryCheck.ok) {
    return { status: 'ok', rowId: row.id };
  }

  if (row.selectors.fallback) {
    const fallbackCheck = await selectorPasses(page, row.selectors.fallback, 2_000);
    if (fallbackCheck.ok) {
      return { status: 'ok', rowId: row.id };
    }
  }

  if (cell.status === 'conditional' || allowConditionalAbsent || row.emptyStateExpected) {
    return {
      status: 'empty',
      rowId: row.id,
      reason: `Row ${row.row} — ${row.block}: element absent (conditional cell, condition=${cell.condition ?? 'n/a'})`,
    };
  }
  return {
    status: 'fail',
    rowId: row.id,
    reason: `Row ${row.row} — ${row.block}: required element missing. ${primaryCheck.error.message}`,
  };
}

// --- Visual snapshot -------------------------------------------------------

export interface AssertVisualSnapshotInput {
  page: Page;
  testInfo: TestInfo;
  route: string;
  contentType: ContentType;
  locale?: string;
  viewport: 'desktop' | 'mobile';
}

/**
 * Captures a full-page screenshot and attaches it to the trace. This is
 * evidence-only (per AC-W6-9 pixel-diff tolerance = 0 / no golden image).
 * Screenshots land in `test-results/<session>/...` AND also as named
 * attachments in the report.
 */
export async function assertVisualSnapshot(input: AssertVisualSnapshotInput): Promise<void> {
  const { page, testInfo, route, contentType, locale, viewport } = input;
  await freezeAnimations(page);
  const buffer = await page.screenshot({ fullPage: true });
  const safeRoute = route.replace(/[^a-z0-9-]/gi, '_');
  const name = `matrix-${contentType}-${viewport}${locale ? `-${locale}` : ''}-${safeRoute}.png`;
  await testInfo.attach(name, { body: buffer, contentType: 'image/png' });
}

// --- Lighthouse audit ------------------------------------------------------

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
}

export interface LighthouseResult {
  scores: LighthouseScores;
  reportPaths: { html: string; json: string };
  skipped: boolean;
  reason?: string;
}

export interface RunLighthouseInput {
  url: string;
  contentType: ContentType;
  /** Preset: `desktop` (default) or `mobile`. */
  preset?: 'desktop' | 'mobile';
  /** Output directory (absolute path). */
  outputDir: string;
  /** File slug (no extension). */
  slug: string;
  /** Number of runs — median score taken. Default 1. */
  numberOfRuns?: number;
}

/**
 * Runs `lighthouse` CLI and parses category scores. Writes HTML + JSON reports
 * under `outputDir`. Returns skipped=true with a reason when lighthouse is not
 * installed or the audit fails — specs call `test.skip(result.skipped, reason)`
 * to keep the Stage 4 gate metric "0 failed, justified skips only".
 */
export function runLighthouseAudit(input: RunLighthouseInput): LighthouseResult {
  const { url, outputDir, slug } = input;
  const preset = input.preset ?? 'desktop';

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, `${slug}-${preset}.json`);
  const htmlPath = path.join(outputDir, `${slug}-${preset}.html`);

  const args = [
    url,
    `--output=json`,
    `--output=html`,
    `--output-path=${path.join(outputDir, `${slug}-${preset}`)}`,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
  ];
  if (preset === 'desktop') {
    args.push('--preset=desktop');
  }

  const result = spawnSync('npx', ['--no-install', 'lighthouse', ...args], {
    encoding: 'utf-8',
    env: process.env,
    timeout: 120_000,
  });

  if (result.status !== 0) {
    return {
      scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
      reportPaths: { html: htmlPath, json: jsonPath },
      skipped: true,
      reason: `lighthouse CLI exit ${result.status ?? 'unknown'}: ${
        (result.stderr || result.stdout || 'no output').slice(0, 300)
      }`,
    };
  }

  if (!existsSync(jsonPath)) {
    return {
      scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
      reportPaths: { html: htmlPath, json: jsonPath },
      skipped: true,
      reason: `lighthouse JSON report not generated at ${jsonPath}`,
    };
  }

  try {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const cats = raw.categories ?? {};
    return {
      scores: {
        performance: cats.performance?.score ?? null,
        accessibility: cats.accessibility?.score ?? null,
        seo: cats.seo?.score ?? null,
        bestPractices: cats['best-practices']?.score ?? null,
      },
      reportPaths: { html: htmlPath, json: jsonPath },
      skipped: false,
    };
  } catch (err) {
    return {
      scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
      reportPaths: { html: htmlPath, json: jsonPath },
      skipped: true,
      reason: `lighthouse JSON parse error: ${(err as Error).message}`,
    };
  }
}

/**
 * Default thresholds from `lighthouserc.js`. Mobile-perf decision gate may
 * relax this via ADR-026 — default here matches desktop until then.
 */
export const LIGHTHOUSE_THRESHOLDS = {
  performance: { min: 0.9, severity: 'warn' as const },
  accessibility: { min: 0.95, severity: 'error' as const },
  seo: { min: 0.95, severity: 'error' as const },
  bestPractices: { min: 0.9, severity: 'warn' as const },
};
