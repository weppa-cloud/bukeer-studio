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

const repoRoot = process.cwd();
const externalBaseUrl = process.env.ADMIN_NEXT_AGENT_EVALS_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_AGENT_EVALS_OUTPUT_DIR ||
  'output/playwright/admin-next/agent-evals';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(repoRoot, '.next', 'BUILD_ID');

const routeCatalog = [
  {
    key: 'dashboard',
    path: '/admin/dashboard/smoke',
    rootTestId: 'admin-next-dashboard-root',
    aiPanelTestId: 'admin-next-dashboard-ai-panel',
    nav: true,
  },
  {
    key: 'itineraries',
    path:
      '/admin/itineraries/smoke?view=list&status=all&owner=all&selected=it-2651&tab=services',
    rootTestId: 'admin-next-itineraries-root',
    aiPanelTestId: 'admin-next-itineraries-ai-panel',
    nav: true,
    expectedAttrs: {
      'data-selected-itinerary': 'it-2651',
      'data-active-tab': 'services',
    },
  },
  {
    key: 'planner',
    path: '/admin/prototype/planner-workbench/smoke',
    rootTestId: 'planner-workbench-root',
    nav: false,
  },
  {
    key: 'conversations',
    path: '/admin/conversations/smoke',
    rootTestId: 'admin-next-conversations-root',
    nav: true,
  },
  {
    key: 'contacts',
    path: '/admin/contacts/smoke',
    rootTestId: 'admin-next-contacts-root',
    aiPanelTestId: 'admin-next-contacts-ai-panel',
    nav: true,
  },
  {
    key: 'products',
    path: '/admin/products/smoke',
    rootTestId: 'admin-next-products-root',
    aiPanelTestId: 'admin-next-products-ai-panel',
    nav: true,
  },
  {
    key: 'reports',
    path: '/admin/reports/smoke?report=receivables&range=30d&min=500000&max=15000000',
    rootTestId: 'admin-next-reports-root',
    aiPanelTestId: 'admin-next-reports-ai-panel',
    nav: true,
  },
  {
    key: 'payments',
    path: '/admin/payments/smoke?method=card&batch=collect',
    rootTestId: 'admin-next-payments-root',
    aiPanelTestId: 'admin-next-payments-ai-panel',
    nav: true,
    expectedAttrs: {
      'data-active-method': 'card',
      'data-active-batch': 'collect',
    },
  },
  {
    key: 'agenda',
    path: '/admin/agenda/smoke',
    rootTestId: 'admin-next-agenda-root',
    aiPanelTestId: 'admin-next-agenda-ai-panel',
    nav: true,
  },
  {
    key: 'account',
    path: '/admin/account/smoke',
    rootTestId: 'admin-next-account-root',
    nav: true,
  },
  {
    key: 'settings',
    path: '/admin/settings/smoke',
    rootTestId: 'admin-next-settings-root',
    nav: true,
  },
];

const requiredNavTestIds = [
  'admin-next-nav-dashboard',
  'admin-next-nav-itineraries',
  'admin-next-nav-planner',
  'admin-next-nav-conversations',
  'admin-next-nav-contacts',
  'admin-next-nav-products',
  'admin-next-nav-reports',
  'admin-next-nav-payments',
  'admin-next-nav-agenda',
  'admin-next-nav-account',
  'admin-next-nav-settings',
];

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before agent evals.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  await waitForHttp(new URL(routeCatalog[0].path, baseUrl).toString());

  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const consoleMessages = [];
  const pageErrors = [];

  try {
    for (const route of routeCatalog) {
      checks.push(
        await evaluateRoute(browser, baseUrl, route, consoleMessages, pageErrors),
      );
    }

    checks.push(
      await evaluateItineraryDeepLinks(browser, baseUrl, consoleMessages, pageErrors),
    );
    checks.push(await evaluateTraceDrawer(browser, baseUrl, consoleMessages, pageErrors));
  } finally {
    await browser.close();
  }

  const failed = checks.filter((check) => check.status !== 'pass');
  const result = {
    status: failed.length === 0 && pageErrors.length === 0 ? 'pass' : 'fail',
    scope: 'admin-next-evolucion-agent-evals',
    baseUrl,
    routeCatalog: routeCatalog.map(({ key, path: routePath }) => ({
      key,
      path: routePath,
    })),
    checks,
    consoleMessages,
    pageErrors,
  };

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== 'pass') {
    process.exit(1);
  }
}

async function evaluateRoute(
  browser,
  baseUrl,
  route,
  consoleMessages,
  pageErrors,
) {
  const targetUrl = new URL(route.path, baseUrl).toString();
  const page = await newAdminNextSmokePage(browser, targetUrl, {
    width: 1440,
    height: 960,
  });
  wireDiagnostics(page, route.key, consoleMessages, pageErrors);

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const root = page.getByTestId(route.rootTestId);
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const rootFont = await page.evaluate(() =>
      window.getComputedStyle(document.querySelector('.bukeer-admin-signature')).fontFamily,
    );
    const headingFont = await page.evaluate(() =>
      window.getComputedStyle(document.querySelector('h1')).fontFamily,
    );
    const navCoverage = route.nav ? await countVisibleNavItems(page) : null;
    const aiPanelVisible = route.aiPanelTestId
      ? await page.getByTestId(route.aiPanelTestId).isVisible()
      : null;
    const attrs = await readExpectedAttrs(root, route.expectedAttrs ?? {});

    const failures = [];
    if (!response?.ok()) failures.push(`HTTP ${response?.status() ?? 'unknown'}`);
    if (preset !== 'evolucion') failures.push(`expected Evolucion preset, got ${preset}`);
    if (!rootFont.includes('Readex Pro')) failures.push(`body font mismatch: ${rootFont}`);
    if (!headingFont.includes('Outfit')) failures.push(`heading font mismatch: ${headingFont}`);
    if (route.nav && navCoverage !== requiredNavTestIds.length) {
      failures.push(`nav coverage ${navCoverage}/${requiredNavTestIds.length}`);
    }
    if (route.aiPanelTestId && !aiPanelVisible) failures.push(`${route.aiPanelTestId} hidden`);
    for (const [name, value] of Object.entries(attrs)) {
      if (value.actual !== value.expected) {
        failures.push(`${name}: expected ${value.expected}, got ${value.actual}`);
      }
    }

    return {
      name: `route:${route.key}`,
      status: failures.length === 0 ? 'pass' : 'fail',
      url: targetUrl,
      rootTestId: route.rootTestId,
      preset,
      rootFont,
      headingFont,
      navCoverage,
      aiPanelVisible,
      attrs,
      failures,
    };
  } finally {
    await page.close();
  }
}

async function evaluateItineraryDeepLinks(browser, baseUrl, consoleMessages, pageErrors) {
  const targetUrl = new URL(routeCatalog[1].path, baseUrl).toString();
  const page = await newAdminNextSmokePage(browser, targetUrl, {
    width: 1440,
    height: 960,
  });
  wireDiagnostics(page, 'itineraries-deeplink', consoleMessages, pageErrors);

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const root = page.getByTestId('admin-next-itineraries-root');
    await root.waitFor({ timeout: 20_000 });

    await page.getByTestId('admin-next-itinerary-tab-payments').click();
    await page.waitForURL(/tab=payments/, { timeout: 10_000 });
    const tabAfterClick = await root.getAttribute('data-active-tab');

    await page.getByTestId('admin-next-itinerary-tab-preview').click();
    await page.waitForURL(/tab=preview/, { timeout: 10_000 });
    await page.getByTestId('admin-next-itinerary-public-page-checkout').click();
    await page.waitForURL(/publicPage=checkout/, { timeout: 10_000 });
    const publicPage = await root.getAttribute('data-public-page');

    const failures = [];
    if (tabAfterClick !== 'payments') {
      failures.push(`payment tab did not sync URL/state: ${tabAfterClick}`);
    }
    if (publicPage !== 'checkout') {
      failures.push(`public page did not sync URL/state: ${publicPage}`);
    }

    return {
      name: 'itineraries:url-state',
      status: failures.length === 0 ? 'pass' : 'fail',
      tabAfterClick,
      publicPage,
      finalUrl: page.url(),
      failures,
    };
  } finally {
    await page.close();
  }
}

async function evaluateTraceDrawer(browser, baseUrl, consoleMessages, pageErrors) {
  const targetUrl = new URL('/admin/prototype/planner-workbench/smoke', baseUrl).toString();
  const page = await newAdminNextSmokePage(browser, targetUrl, {
    width: 1440,
    height: 960,
  });
  wireDiagnostics(page, 'trace-drawer', consoleMessages, pageErrors);

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.getByTestId('planner-workbench-root').waitFor({ timeout: 20_000 });
    await page.getByTestId('signature-trace-list-inspect').click();
    const drawer = page.getByTestId('trace-drawer-content');
    await drawer.waitFor({ timeout: 10_000 });

    const drawerFont = await drawer.evaluate((element) =>
      window.getComputedStyle(element).fontFamily,
    );
    const railVar = await drawer.evaluate((element) =>
      window.getComputedStyle(element).getPropertyValue('--bukeer-surface-rail').trim(),
    );
    const presetClass = await drawer.evaluate((element) =>
      element.classList.contains('bukeer-admin-signature'),
    );
    const screenshot = path.join(outputDir, 'trace-drawer-evolucion.png');
    await page.screenshot({ path: screenshot, fullPage: false });

    const failures = [];
    if (!drawerFont.includes('Readex Pro')) {
      failures.push(`TraceDrawer font mismatch: ${drawerFont}`);
    }
    if (!railVar) failures.push('TraceDrawer missing --bukeer-surface-rail');
    if (!presetClass) failures.push('TraceDrawer missing bukeer-admin-signature class');

    return {
      name: 'trace-drawer:portal-theme',
      status: failures.length === 0 ? 'pass' : 'fail',
      drawerFont,
      railVar,
      presetClass,
      screenshot,
      failures,
    };
  } finally {
    await page.close();
  }
}

async function countVisibleNavItems(page) {
  let visible = 0;
  for (const testId of requiredNavTestIds) {
    if (await page.getByTestId(testId).isVisible()) {
      visible += 1;
    }
  }
  return visible;
}

async function readExpectedAttrs(locator, expectedAttrs) {
  const attrs = {};
  for (const [name, expected] of Object.entries(expectedAttrs)) {
    attrs[name] = {
      expected,
      actual: await locator.getAttribute(name),
    };
  }
  return attrs;
}

function wireDiagnostics(page, routeKey, consoleMessages, pageErrors) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${routeKey} ${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(`${routeKey}: ${error.message}`);
  });
}

async function startLocalServer() {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  port = session.PORT;

  server = spawn('npm', ['start'], {
    cwd: repoRoot,
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
    process.stdout.write(`[agent-evals:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[agent-evals:${sessionName}] ${chunk}`);
  });

  return `http://localhost:${port}`;
}

function acquireSession() {
  const output = execFileSync('bash', ['scripts/session-acquire.sh'], {
    cwd: repoRoot,
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

async function cleanup() {
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  if (sessionName) {
    try {
      execFileSync('bash', ['scripts/session-release.sh', sessionName], {
        cwd: repoRoot,
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
