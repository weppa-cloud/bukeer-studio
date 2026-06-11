#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const route = '/admin/contacts/smoke';
const externalBaseUrl = process.env.ADMIN_NEXT_CONTACTS_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_CONTACTS_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/contacts';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before contacts smoke.',
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
      ADMIN_NEXT_DATA_SOURCE_MODE: 'fixture',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next-contacts:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-contacts:${sessionName}] ${chunk}`);
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
      const response = await fetch(url, { redirect: 'manual' });
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
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
    const root = page.locator('[data-testid="admin-next-contacts-root"]');
    await root.waitFor({ timeout: 10_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const contactCount = await page.locator('[data-testid^="admin-next-contact-card-"]').count();
    const hasToolbar = await page.getByTestId('admin-next-contacts-toolbar').isVisible();
    const hasDetail = await page.getByTestId('admin-next-contacts-detail').isVisible();
    const hasAiPanel = await page.getByTestId('admin-next-contacts-ai-panel').isVisible();
    const screenshot = path.join(outputDir, 'contacts-evolucion-light.png');
    await page.screenshot({ path: screenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Contactos') {
      throw new Error(`Unexpected contacts title: ${title}`);
    }
    if (contactCount < 6) {
      throw new Error(`Expected at least 6 contacts, got ${contactCount}`);
    }
    if (!hasToolbar || !hasDetail || !hasAiPanel) {
      throw new Error('Contacts required panels are not visible.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      contactCount,
      hasToolbar,
      hasDetail,
      hasAiPanel,
      consoleMessages,
      screenshots: [screenshot],
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
