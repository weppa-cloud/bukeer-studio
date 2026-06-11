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

const modules = [
  ['dashboard', '/admin/dashboard/smoke', 'admin-next-dashboard-root'],
  ['contacts', '/admin/contacts/smoke', 'admin-next-contacts-root'],
  ['agenda', '/admin/agenda/smoke', 'admin-next-agenda-root'],
  ['account', '/admin/account/smoke', 'admin-next-account-root'],
  ['settings', '/admin/settings/smoke', 'admin-next-settings-root'],
  ['products', '/admin/products/smoke', 'admin-next-products-root'],
  ['conversations', '/admin/conversations/smoke', 'admin-next-conversations-root'],
  ['reports', '/admin/reports/smoke', 'admin-next-reports-root'],
  ['payments', '/admin/payments/smoke', 'admin-next-payments-root'],
  [
    'itineraries',
    '/admin/itineraries/smoke?view=list&status=all&owner=all&selected=it-2651&tab=services',
    'admin-next-itineraries-root',
  ],
];

const viewports = [
  ['desktop', { width: 1440, height: 960 }],
  ['mobile', { width: 390, height: 844 }],
];

const externalBaseUrl = process.env.ADMIN_NEXT_VISUAL_QA_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_VISUAL_QA_OUTPUT_DIR ||
  'output/playwright/admin-next/visual-qa';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before visual QA.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const [moduleName, route, rootTestId] of modules) {
      for (const [viewportName, viewport] of viewports) {
        const targetUrl = new URL(route, baseUrl).toString();
        await waitForHttp(targetUrl);
        results.push(
          await inspectModule(browser, {
            moduleName,
            route,
            rootTestId,
            targetUrl,
            viewportName,
            viewport,
          }),
        );
      }
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((result) => result.status !== 'pass');
  const summary = {
    status: failed.length === 0 ? 'pass' : 'fail',
    scope: 'admin-next-evolucion-visual-qa',
    generatedAt: new Date().toISOString(),
    baseUrl,
    moduleCount: modules.length,
    viewportCount: viewports.length,
    checks: results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

async function inspectModule(
  browser,
  { moduleName, route, rootTestId, targetUrl, viewportName, viewport },
) {
  const page = await newAdminNextSmokePage(browser, targetUrl, viewport);
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
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const root = page.getByTestId(rootTestId);
    await root.waitFor({ timeout: 20_000 });

    const pageTitle = await page.title();
    const heading = (await page.locator('h1').first().textContent())?.trim() ?? null;
    const preset = await root.getAttribute('data-theme-preset');
    const rootBox = await root.boundingBox();
    const frameworkOverlay = await hasFrameworkOverlay(page);
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      bodyTextLength: document.body.innerText.trim().length,
      fontHeading: getComputedStyle(document.documentElement)
        .getPropertyValue('--font-heading')
        .trim(),
      fontBody: getComputedStyle(document.documentElement)
        .getPropertyValue('--font-body')
        .trim(),
    }));
    const a11y = await collectA11yFindings(page);
    const screenshot = path.join(
      outputDir,
      `${moduleName}-${viewportName}-evolucion-light.png`,
    );
    await page.screenshot({ path: screenshot, fullPage: false });

    const failures = [];
    if (!response?.ok()) failures.push(`http_status:${response?.status() ?? 'missing'}`);
    if (preset !== 'evolucion') failures.push(`theme_preset:${preset ?? 'missing'}`);
    if (!heading) failures.push('missing_h1');
    if (!rootBox || rootBox.width < 320 || rootBox.height < 320) {
      failures.push('root_not_meaningful');
    }
    if (layout.bodyTextLength < 300) failures.push('blank_or_sparse_body');
    if (layout.scrollWidth > layout.viewportWidth + 2) {
      failures.push('horizontal_overflow');
    }
    if (!layout.fontHeading.includes('Outfit')) failures.push('font_heading_missing');
    if (!layout.fontBody.includes('Readex')) failures.push('font_body_missing');
    if (frameworkOverlay) failures.push('framework_overlay');
    if (consoleMessages.length > 0) failures.push('console_warnings_or_errors');
    if (pageErrors.length > 0) failures.push('page_errors');
    if (a11y.findings.length > 0) failures.push('a11y_findings');

    return {
      status: failures.length === 0 ? 'pass' : 'fail',
      module: moduleName,
      route,
      viewport: viewportName,
      httpStatus: response?.status() ?? null,
      pageTitle,
      heading,
      preset,
      layout,
      a11y,
      consoleMessages,
      pageErrors,
      frameworkOverlay,
      screenshot,
      failures,
    };
  } finally {
    await page.context().close();
  }
}

async function collectA11yFindings(page) {
  return page.evaluate(() => {
    const findings = [];
    const interactiveSelector = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const interactiveElements = Array.from(
      document.querySelectorAll(interactiveSelector),
    );

    for (const element of interactiveElements) {
      const htmlElement = element;
      const disabled =
        htmlElement.hasAttribute('disabled') ||
        htmlElement.getAttribute('aria-hidden') === 'true';
      if (disabled) continue;

      const name = [
        htmlElement.getAttribute('aria-label'),
        htmlElement.getAttribute('title'),
        htmlElement.textContent,
        htmlElement.getAttribute('value'),
        htmlElement.getAttribute('placeholder'),
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (!name) {
        findings.push({
          rule: 'interactive-accessible-name',
          tag: htmlElement.tagName.toLowerCase(),
          testId: htmlElement.getAttribute('data-testid'),
        });
      }
    }

    for (const image of Array.from(document.querySelectorAll('img'))) {
      if (!image.hasAttribute('alt')) {
        findings.push({
          rule: 'image-alt',
          src: image.getAttribute('src'),
        });
      }
    }

    return {
      interactiveCount: interactiveElements.length,
      findings,
    };
  });
}

async function hasFrameworkOverlay(page) {
  const overlayText = await page.locator('body').innerText({ timeout: 5_000 });
  return [
    'Unhandled Runtime Error',
    'Build Error',
    'Hydration failed',
    'Application error',
    'This page could not be found',
  ].some((needle) => overlayText.includes(needle));
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
    process.stdout.write(`[next-visual-qa:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-visual-qa:${sessionName}] ${chunk}`);
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
