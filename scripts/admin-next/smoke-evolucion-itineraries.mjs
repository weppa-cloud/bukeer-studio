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

const route =
  '/admin/itineraries/smoke?view=list&status=all&owner=all&selected=it-2651&tab=services';
const externalBaseUrl = process.env.ADMIN_NEXT_ITINERARIES_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_ITINERARIES_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/itineraries';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before itineraries smoke.',
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
    process.stdout.write(`[next-itineraries:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-itineraries:${sessionName}] ${chunk}`);
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
    const root = page.locator('[data-testid="admin-next-itineraries-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const initialView = await root.getAttribute('data-active-view');
    const initialStatus = await root.getAttribute('data-active-status');
    const initialOwner = await root.getAttribute('data-active-owner');
    const selectedItinerary = await root.getAttribute('data-selected-itinerary');
    const initialTab = await root.getAttribute('data-active-tab');
    const initialCount = await root.getAttribute('data-visible-itineraries');
    const kanbanColumns = await root.getAttribute('data-kanban-columns');
    const hasList = await page.getByTestId('admin-next-itineraries-list').isVisible();
    const hasDetail = await page.getByTestId('admin-next-itinerary-detail').isVisible();
    const hasServicesTab = await page
      .getByTestId('admin-next-itinerary-tab-panel-services')
      .isVisible();
    const hasAiPanel = await page.getByTestId('admin-next-itineraries-ai-panel').isVisible();
    const initialScreenshot = path.join(outputDir, 'itineraries-list-evolucion-light.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });

    await page.getByTestId('admin-next-itinerary-tab-payments').click();
    await page.waitForURL(/tab=payments/);
    const paymentsTab = await root.getAttribute('data-active-tab');
    const hasPaymentsTab = await page
      .getByTestId('admin-next-itinerary-tab-panel-payments')
      .isVisible();
    const paymentPlan = page.getByTestId('admin-next-itinerary-payment-plan');
    const initialPaymentMethod = await root.getAttribute('data-payment-method');
    const initialFeeIncluded = await paymentPlan.getAttribute('data-fee-included');
    const hasLockedPayment = await page
      .locator('[data-testid^="admin-next-itinerary-payment-locked-"]')
      .first()
      .isVisible();
    await page.getByTestId('admin-next-itinerary-payment-method-bank_transfer').click();
    await page.waitForURL(/method=bank_transfer/);
    const updatedPaymentMethod = await root.getAttribute('data-payment-method');
    const updatedFeeIncluded = await paymentPlan.getAttribute('data-fee-included');
    await page.getByTestId('admin-next-itinerary-tab-preview').click();
    await page.waitForURL(/tab=preview/);
    await page.getByTestId('admin-next-itinerary-public-page-checkout').click();
    await page.waitForURL(/publicPage=checkout/);
    const publicPage = await root.getAttribute('data-public-page');
    const hasPublicProposal = await page
      .getByTestId('admin-next-itinerary-public-proposal')
      .isVisible();
    const hasPublicCheckout = await page
      .getByTestId('admin-next-itinerary-public-page-panel-checkout')
      .isVisible();

    await page.getByTestId('admin-next-itineraries-view-kanban').click();
    await page.waitForURL(/view=kanban/);
    await page.getByTestId('admin-next-itineraries-status-won').click();
    await page.waitForURL(/status=won/);
    await page.getByTestId('admin-next-itineraries-owner-daniel').click();
    await page.waitForURL(/owner=daniel/);

    const updatedUrl = page.url();
    const updatedView = await root.getAttribute('data-active-view');
    const updatedStatus = await root.getAttribute('data-active-status');
    const updatedOwner = await root.getAttribute('data-active-owner');
    const updatedCount = await root.getAttribute('data-visible-itineraries');
    const hasKanban = await page.getByTestId('admin-next-itineraries-kanban').isVisible();
    const wonColumn = await page.getByTestId('admin-next-itineraries-kanban-won').isVisible();
    const updatedScreenshot = path.join(outputDir, 'itineraries-kanban-evolucion-light.png');
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
    const mobileRoot = mobilePage.locator('[data-testid="admin-next-itineraries-root"]');
    await mobileRoot.waitFor({ timeout: 20_000 });
    const hasMobileRoot = await mobileRoot.isVisible();
    const mobileScreenshot = path.join(outputDir, 'itineraries-mobile-evolucion-light.png');
    await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Itinerarios') {
      throw new Error(`Unexpected itineraries title: ${title}`);
    }
    if (
      initialView !== 'list' ||
      initialStatus !== 'all' ||
      initialOwner !== 'all' ||
      selectedItinerary !== 'it-2651' ||
      initialTab !== 'services' ||
      initialCount !== '5' ||
      kanbanColumns !== '5'
    ) {
      throw new Error('Initial itineraries URL state did not hydrate correctly.');
    }
    if (!hasList || !hasDetail || !hasServicesTab || !hasAiPanel) {
      throw new Error('Itineraries list, detail or AI panel did not render.');
    }
    if (
      paymentsTab !== 'payments' ||
      !hasPaymentsTab ||
      initialPaymentMethod !== 'card' ||
      initialFeeIncluded !== 'true' ||
      updatedPaymentMethod !== 'bank_transfer' ||
      updatedFeeIncluded !== 'false' ||
      !hasLockedPayment
    ) {
      throw new Error('Itinerary detail payments tab did not expose methods and locked paid installments.');
    }
    if (publicPage !== 'checkout' || !hasPublicProposal || !hasPublicCheckout) {
      throw new Error('Itinerary public proposal 3-page preview did not render checkout.');
    }
    if (
      updatedView !== 'kanban' ||
      updatedStatus !== 'won' ||
      updatedOwner !== 'daniel' ||
      updatedCount !== '1' ||
      !updatedUrl.includes('view=kanban') ||
      !updatedUrl.includes('status=won') ||
      !updatedUrl.includes('owner=daniel')
    ) {
      throw new Error(`Itineraries URL state did not update correctly: ${updatedUrl}`);
    }
    if (!hasKanban || !wonColumn || !hasMobileRoot) {
      throw new Error('Itineraries required kanban/mobile surfaces are not visible.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      initialView,
      initialStatus,
      initialOwner,
      selectedItinerary,
      initialTab,
      initialCount,
      kanbanColumns,
      paymentsTab,
      initialPaymentMethod,
      initialFeeIncluded,
      updatedPaymentMethod,
      updatedFeeIncluded,
      publicPage,
      hasPublicProposal,
      hasPublicCheckout,
      hasDetail,
      hasServicesTab,
      hasPaymentsTab,
      hasLockedPayment,
      updatedView,
      updatedStatus,
      updatedOwner,
      updatedCount,
      updatedUrl,
      hasList,
      hasKanban,
      wonColumn,
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
