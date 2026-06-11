#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import {
  adminNextSmokeHeaders,
  adminNextSmokeToken,
  newAdminNextSmokePage,
} from './smoke-auth-headers.mjs';

const route = '/admin/payments/smoke?method=card&batch=collect';
const externalBaseUrl = process.env.ADMIN_NEXT_PAYMENTS_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_PAYMENTS_SMOKE_OUTPUT_DIR || 'output/playwright/admin-next/payments';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before payments smoke.',
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
    process.stdout.write(`[next-payments:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-payments:${sessionName}] ${chunk}`);
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
      const response = await fetch(url, {
        redirect: 'manual',
        headers: adminNextSmokeHeaders(),
      });
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
  const page = await newAdminNextSmokePage(browser, targetUrl, {
    width: 1440,
    height: 960,
  });
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
    const root = page.locator('[data-testid="admin-next-payments-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const initialMethod = await root.getAttribute('data-active-method');
    const initialBatch = await root.getAttribute('data-active-batch');
    const stripeMode = await root.getAttribute('data-stripe-mode');
    const initialFee = await root.getAttribute('data-fee-amount-minor');
    const initialTotal = await root.getAttribute('data-total-amount-minor');
    const initialFeeIncluded = await root.getAttribute('data-fee-included-in-customer-total');
    const hasKpis = await page.getByTestId('admin-next-payments-kpis').isVisible();
    const hasCollectBatch = await page.getByTestId('admin-next-payments-collect-batch').isVisible();
    const hasSupplierBatch = await page
      .getByTestId('admin-next-payments-supplier-batch')
      .isVisible();
    const hasDueList = await page.getByTestId('admin-next-payments-due-list').isVisible();
    const hasMovements = await page.getByTestId('admin-next-payments-movements').isVisible();
    const hasAiPanel = await page.getByTestId('admin-next-payments-ai-panel').isVisible();
    const initialScreenshot = path.join(outputDir, 'payments-card-evolucion-light.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });

    await page.getByTestId('admin-next-payments-method-bank_transfer').click();
    await page.waitForURL(/method=bank_transfer/);
    await page.getByTestId('admin-next-payments-batch-supplier').click();
    await page.waitForURL(/batch=supplier/);

    const updatedUrl = page.url();
    const updatedMethod = await root.getAttribute('data-active-method');
    const updatedBatch = await root.getAttribute('data-active-batch');
    const updatedFee = await root.getAttribute('data-fee-amount-minor');
    const updatedTotal = await root.getAttribute('data-total-amount-minor');
    const updatedScreenshot = path.join(outputDir, 'payments-bank-transfer-evolucion-light.png');
    await page.screenshot({ path: updatedScreenshot, fullPage: false });
    const mobilePage = await newAdminNextSmokePage(browser, targetUrl, {
      width: 390,
      height: 844,
    });
    mobilePage.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        consoleMessages.push(`mobile ${message.type()}: ${message.text()}`);
      }
    });
    mobilePage.on('pageerror', (error) => pageErrors.push(`mobile: ${error.message}`));
    await mobilePage.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    const mobileRoot = mobilePage.locator('[data-testid="admin-next-payments-root"]');
    await mobileRoot.waitFor({ timeout: 20_000 });
    const hasMobileRoot = await mobileRoot.isVisible();
    const mobileScreenshot = path.join(outputDir, 'payments-mobile-evolucion-light.png');
    await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Pagos') {
      throw new Error(`Unexpected payments title: ${title}`);
    }
    if (
      initialMethod !== 'card' ||
      initialBatch !== 'collect' ||
      stripeMode !== 'test' ||
      initialFee !== '32000' ||
      initialTotal !== '1032000' ||
      initialFeeIncluded !== 'true'
    ) {
      throw new Error('Initial payments Stripe amount did not match the card contract.');
    }
    if (
      !hasKpis ||
      !hasCollectBatch ||
      !hasSupplierBatch ||
      !hasDueList ||
      !hasMovements ||
      !hasAiPanel
    ) {
      throw new Error('Payments required surfaces are not visible.');
    }
    if (
      updatedMethod !== 'bank_transfer' ||
      updatedBatch !== 'supplier' ||
      updatedFee !== '0' ||
      updatedTotal !== '1000000' ||
      !updatedUrl.includes('method=bank_transfer') ||
      !updatedUrl.includes('batch=supplier')
    ) {
      throw new Error(`Payments URL state did not update correctly: ${updatedUrl}`);
    }
    if (!hasMobileRoot) {
      throw new Error('Payments mobile viewport did not render the root.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      initialMethod,
      initialBatch,
      stripeMode,
      initialFee,
      initialTotal,
      initialFeeIncluded,
      updatedMethod,
      updatedBatch,
      updatedFee,
      updatedTotal,
      updatedUrl,
      hasKpis,
      hasCollectBatch,
      hasSupplierBatch,
      hasDueList,
      hasMovements,
      hasAiPanel,
      hasMobileRoot,
      consoleMessages,
      screenshots: [initialScreenshot, updatedScreenshot, mobileScreenshot],
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
