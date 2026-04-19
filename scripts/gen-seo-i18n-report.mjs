#!/usr/bin/env node
/**
 * EPIC #207 W5.4 — SEO + i18n E2E gate telemetry generator.
 *
 * Reads Playwright's JSON reporter output produced by the `@p0-seo` suite and
 * emits a compact summary at `reports/e2e-seo-i18n/latest.json` per ADR-010.
 *
 * STATUS: STUB. Schema is stable; full gap-matrix row id mapping TODO.
 *
 * TODO (follow-up workstream):
 *   - Map each spec file → gap-matrix row id per
 *     docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (Gap Matrix section).
 *   - Emit historic trend (compare with previous run if cached).
 *   - Surface flaky tests (retries > 0) separately from hard failures.
 *   - Post-process into `reports/e2e-seo-i18n/history/<run-id>.json`.
 *
 * Inputs (searched in order):
 *   - PLAYWRIGHT_JSON_OUTPUT_NAME env
 *   - playwright-report/default/results.json
 *   - playwright-report/results.json
 *
 * Output:
 *   - reports/e2e-seo-i18n/latest.json
 *
 * Exit codes:
 *   - 0: report written (even when no input was found, to avoid failing CI).
 *   - 1: unexpected internal error.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const OUT_DIR = resolve(REPO_ROOT, 'reports/e2e-seo-i18n');
const OUT_FILE = resolve(OUT_DIR, 'latest.json');

// Minimal gap-matrix mapping (see docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md
// Gap Matrix section). Extend as new specs land.
const GAP_MATRIX = {
  'public-sitemap.spec.ts': ['P0-1', 'P0-2', 'P0-3'],
  'public-seo-metadata.spec.ts': ['P0-5', 'P0-6'],
  'public-hreflang.spec.ts': ['P0-7'],
  'public-structured-data.spec.ts': ['P0-8'],
  'middleware-locale-routing.spec.ts': ['P0-9'],
  'revalidate-flow.spec.ts': ['P0-10'],
  'seo-transcreate-v2-lifecycle.spec.ts': ['P0-11'],
  'public-runtime.smoke.spec.ts': ['SMOKE'],
};

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function locateResultsFile() {
  const candidates = [
    process.env.PLAYWRIGHT_JSON_OUTPUT_NAME,
    'playwright-report/default/results.json',
    'playwright-report/results.json',
    'test-results/default/results.json',
  ].filter(Boolean);

  for (const c of candidates) {
    const abs = resolve(REPO_ROOT, c);
    if (await fileExists(abs)) return abs;
  }
  return null;
}

function specKey(file) {
  if (!file) return 'unknown';
  const parts = String(file).split('/');
  return parts[parts.length - 1];
}

function classifyStatus(status) {
  // Playwright statuses: passed, failed, timedOut, skipped, interrupted
  if (status === 'passed') return 'PASS';
  if (status === 'skipped') return 'SKIP';
  return 'FAIL';
}

function collectTests(suite, acc = []) {
  if (!suite) return acc;
  if (Array.isArray(suite.specs)) {
    for (const spec of suite.specs) {
      for (const test of spec.tests || []) {
        const result = (test.results && test.results[test.results.length - 1]) || {};
        acc.push({
          specFile: specKey(spec.file || suite.file),
          title: spec.title,
          status: classifyStatus(result.status || test.status),
          durationMs: result.duration ?? 0,
          tags: (spec.title?.match(/@[a-z0-9-]+/gi) || []).map((t) => t.toLowerCase()),
        });
      }
    }
  }
  for (const child of suite.suites || []) collectTests(child, acc);
  return acc;
}

async function buildReport(resultsPath) {
  const summary = {
    generatedAt: new Date().toISOString(),
    epic: 207,
    workstream: 'W5',
    source: resultsPath ? resultsPath.replace(REPO_ROOT + '/', '') : null,
    totals: { tests: 0, passed: 0, failed: 0, skipped: 0 },
    specs: [],
    gapMatrix: {},
    notes: [],
  };

  if (!resultsPath) {
    summary.notes.push(
      'No Playwright results.json found. Configure --reporter=json or set PLAYWRIGHT_JSON_OUTPUT_NAME.',
    );
    return summary;
  }

  let raw;
  try {
    raw = await readFile(resultsPath, 'utf8');
  } catch (err) {
    summary.notes.push(`Could not read results file: ${err.message}`);
    return summary;
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    summary.notes.push(`Could not parse results JSON: ${err.message}`);
    return summary;
  }

  const tests = [];
  for (const suite of json.suites || []) collectTests(suite, tests);

  for (const t of tests) {
    summary.totals.tests += 1;
    if (t.status === 'PASS') summary.totals.passed += 1;
    else if (t.status === 'SKIP') summary.totals.skipped += 1;
    else summary.totals.failed += 1;
  }

  const bySpec = new Map();
  for (const t of tests) {
    if (!bySpec.has(t.specFile)) {
      bySpec.set(t.specFile, { specFile: t.specFile, tests: 0, passed: 0, failed: 0, skipped: 0 });
    }
    const row = bySpec.get(t.specFile);
    row.tests += 1;
    if (t.status === 'PASS') row.passed += 1;
    else if (t.status === 'SKIP') row.skipped += 1;
    else row.failed += 1;
  }

  summary.specs = Array.from(bySpec.values()).sort((a, b) => a.specFile.localeCompare(b.specFile));

  for (const specRow of summary.specs) {
    const gapIds = GAP_MATRIX[specRow.specFile] ?? [];
    for (const gapId of gapIds) {
      summary.gapMatrix[gapId] = {
        specFile: specRow.specFile,
        status: specRow.failed > 0 ? 'FAIL' : specRow.passed > 0 ? 'PASS' : 'SKIP',
        passed: specRow.passed,
        failed: specRow.failed,
        skipped: specRow.skipped,
      };
    }
  }

  return summary;
}

async function main() {
  const resultsPath = await locateResultsFile();
  const report = await buildReport(resultsPath);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const status = report.totals.failed > 0 ? 'FAIL' : 'PASS';
  console.log(
    `[gen-seo-i18n-report] ${status} · total=${report.totals.tests} pass=${report.totals.passed} fail=${report.totals.failed} skip=${report.totals.skipped} → ${OUT_FILE}`,
  );
}

main().catch((err) => {
  console.error('[gen-seo-i18n-report] internal error:', err);
  process.exitCode = 1;
});
