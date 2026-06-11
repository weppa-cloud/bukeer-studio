#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { adminNextSmokeHeaders, adminNextSmokeToken, newAdminNextSmokePage } from './smoke-auth-headers.mjs';

const route = '/admin/reports/smoke?report=receivables&range=30d&min=500000&max=15000000';
const externalBaseUrl = process.env.ADMIN_NEXT_REPORTS_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_REPORTS_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/reports';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before reports smoke.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  const targetUrl = new URL(route, baseUrl).toString();
  await waitForHttp(targetUrl);

  const result = await runPlaywrightSmoke(targetUrl);
  console.log(JSON.stringify(result, null, 2));
}

async function startLocalServer() {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  port = session.PORT;

  server = spawn('npm', ['start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_NEXT_PROTOTYPE_ENABLED: 'true',
      ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED: 'true',
      ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN: adminNextSmokeToken,
      ADMIN_NEXT_DATA_SOURCE_MODE: 'fixture',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next-reports:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-reports:${sessionName}] ${chunk}`);
  });

  return `http://localhost:${port}`;
}

function acquireSession() {
  const output = execFileSync('bash', ['scripts/session-acquire.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const session = {};

  for (const line of output.split('\n')) {
    const match = line.match(/^export\s+([A-Z_]+)=(.+)$/);
    if (match) {
      session[match[1]] = match[2].trim();
    }
  }

  if (!session.SESSION_NAME || !session.PORT) {
    throw new Error(`Could not acquire a local session slot:\n${output}`);
  }

  return session;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 30_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual', headers: adminNextSmokeHeaders() });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function runPlaywrightSmoke(targetUrl) {
  const browser = await chromium.launch({ headless: true });
  const page = await newAdminNextSmokePage(browser, targetUrl, { width: 1440, height: 960 });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    const root = page.locator('[data-testid="admin-next-reports-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const reportCount = await page.locator('[data-testid^="admin-next-report-tab-"]').count();
    const initialReport = await root.getAttribute('data-active-report');
    const initialRange = await root.getAttribute('data-active-range');
    const initialMin = await root.getAttribute('data-price-min');
    const initialMax = await root.getAttribute('data-price-max');
    const hasFilters = await page.getByTestId('admin-next-reports-filters').isVisible();
    const hasDetail = await page.getByTestId('admin-next-reports-detail').isVisible();
    const hasInsights = await page.getByTestId('admin-next-reports-insights').isVisible();
    const hasAiPanel = await page.getByTestId('admin-next-reports-ai-panel').isVisible();
    const initialScreenshot = path.join(outputDir, 'reports-deeplink-evolucion-light.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });

    await page.getByTestId('admin-next-report-tab-sales-intelligence').click();
    await page.waitForURL(/report=sales-intelligence/);
    await page.getByTestId('admin-next-reports-range-90d').click();
    await page.waitForURL(/range=90d/);
    await page.getByTestId('admin-next-reports-price-premium').click();
    await page.waitForURL(/min=15000000/);

    const updatedUrl = page.url();
    const updatedReport = await root.getAttribute('data-active-report');
    const updatedRange = await root.getAttribute('data-active-range');
    const updatedMin = await root.getAttribute('data-price-min');
    const updatedScreenshot = path.join(outputDir, 'reports-url-state-evolucion-light.png');
    await page.screenshot({ path: updatedScreenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Reportes') {
      throw new Error(`Unexpected reports title: ${title}`);
    }
    if (reportCount !== 7) {
      throw new Error(`Expected 7 reports, got ${reportCount}`);
    }
    if (
      initialReport !== 'receivables' ||
      initialRange !== '30d' ||
      initialMin !== '500000' ||
      initialMax !== '15000000'
    ) {
      throw new Error('Initial reports deep-link did not hydrate URL state.');
    }
    if (!hasFilters || !hasDetail || !hasInsights || !hasAiPanel) {
      throw new Error('Reports required surfaces are not visible.');
    }
    if (
      updatedReport !== 'sales-intelligence' ||
      updatedRange !== '90d' ||
      updatedMin !== '15000000' ||
      !updatedUrl.includes('report=sales-intelligence') ||
      !updatedUrl.includes('range=90d')
    ) {
      throw new Error(`Reports URL state did not update correctly: ${updatedUrl}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      reportCount,
      initialReport,
      initialRange,
      initialMin,
      initialMax,
      updatedReport,
      updatedRange,
      updatedMin,
      updatedUrl,
      hasFilters,
      hasDetail,
      hasInsights,
      hasAiPanel,
      consoleMessages,
      screenshots: [initialScreenshot, updatedScreenshot],
    };
  } finally {
    await browser.close();
  }
}

async function cleanup() {
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  if (sessionName) {
    try {
      execFileSync('bash', ['scripts/session-release.sh', sessionName], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    } catch (error) {
      process.stderr.write(`Could not release session ${sessionName}: ${error.message}\n`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
