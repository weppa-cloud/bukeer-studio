#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const route = '/admin/prototype/planner-workbench/smoke';
const externalBaseUrl = process.env.ADMIN_NEXT_SMOKE_BASE_URL;
const outputDir = process.env.ADMIN_NEXT_SMOKE_OUTPUT_DIR || 'output/playwright/admin-next';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before admin-next smoke.'
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
      ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED: 'true',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next:${sessionName}] ${chunk}`);
  });

  server.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`[next:${sessionName}] exited with code ${code}\n`);
    }
    if (signal) {
      process.stderr.write(`[next:${sessionName}] exited with signal ${signal}\n`);
    }
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
    const root = page.locator('[data-testid="planner-workbench-root"]');
    await root.waitFor({ timeout: 10_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const initialAppearance = await root.getAttribute('data-appearance');
    const initialBackground = await root.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    );
    const title = await page.locator('h1').first().textContent();
    const hasFixture = await page.getByText('Mariana Rios').first().isVisible();
    const screenshotLight = path.join(outputDir, 'planner-workbench-smoke-evolucion-light.png');
    await page.screenshot({ path: screenshotLight, fullPage: false });

    await page.getByTestId('planner-workbench-dark-mode').click();
    await page.waitForFunction(() => {
      const rootNode = document.querySelector('[data-testid="planner-workbench-root"]');
      return rootNode?.getAttribute('data-appearance') === 'dark';
    });
    const darkAppearance = await root.getAttribute('data-appearance');
    const darkBackground = await root.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    );
    const darkRailLead = await page
      .getByTestId('trip-rail-lead-0')
      .evaluate((node) => {
        return {
          color: getComputedStyle(node).color,
          background: getComputedStyle(node.closest('button')).backgroundColor,
        };
      });
    const screenshotDark = path.join(outputDir, 'planner-workbench-smoke-evolucion-dark.png');
    await page.screenshot({ path: screenshotDark, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Planner Workbench') {
      throw new Error(`Unexpected page title: ${title}`);
    }
    if (!hasFixture) {
      throw new Error('Fixture lead Mariana Rios was not visible.');
    }
    if (initialAppearance !== 'light' || darkAppearance !== 'dark') {
      throw new Error(
        `Appearance toggle failed: ${initialAppearance} -> ${darkAppearance}`
      );
    }
    if (initialBackground === darkBackground) {
      throw new Error(
        `Dark mode did not change workbench background: ${initialBackground}`
      );
    }
    if (!isReadableDarkModeText(darkRailLead.color)) {
      throw new Error(`Dark rail lead text is too dark: ${darkRailLead.color}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      interaction: `${initialAppearance} -> ${darkAppearance}`,
      backgrounds: {
        light: initialBackground,
        dark: darkBackground,
      },
      darkRailLead,
      hasFixture,
      consoleMessages,
      screenshots: [screenshotLight, screenshotDark],
    };
  } finally {
    await browser.close();
  }
}

function isReadableDarkModeText(color) {
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;

  const [, red, green, blue] = match.map(Number);
  return red + green + blue > 540;
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
