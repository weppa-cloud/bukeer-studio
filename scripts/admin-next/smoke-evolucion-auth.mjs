#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const protectedRoute = '/admin/prototype/planner-workbench';
const externalBaseUrl = process.env.ADMIN_NEXT_AUTH_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_AUTH_SMOKE_OUTPUT_DIR || 'output/playwright/admin-next';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let server = null;

async function main() {
  hydrateLocalEnv();

  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before admin-next auth smoke.',
    );
  }

  const email = requireEnv('E2E_USER_EMAIL');
  const password = requireEnv('E2E_USER_PASSWORD');

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  await waitForHttp(new URL('/login', baseUrl).toString());
  const result = await runAuthSmoke({
    baseUrl,
    email,
    password,
  });

  console.log(JSON.stringify(result, null, 2));
}

function hydrateLocalEnv() {
  for (const file of ['.env.local', '.dev.vars']) {
    const absolutePath = path.join(process.cwd(), file);
    if (!existsSync(absolutePath)) continue;

    const content = readFileSync(absolutePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key]) continue;

      process.env[key] = stripEnvQuotes(rawValue);
    }
  }
}

function stripEnvQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env key ${key}.`);
  }

  return value;
}

async function startLocalServer() {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  const port = session.PORT;

  server = spawn('npm', ['start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_NEXT_PROTOTYPE_ENABLED: 'true',
      ADMIN_NEXT_DATA_SOURCE_MODE: 'fixture',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next-auth:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-auth:${sessionName}] ${chunk}`);
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
      if (response.ok || response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function runAuthSmoke({ baseUrl, email, password }) {
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
    const protectedUrl = new URL(protectedRoute, baseUrl).toString();
    const initialResponse = await page.goto(protectedUrl, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    if (!page.url().includes('/login')) {
      throw new Error(`Expected unauthenticated redirect to login, got ${page.url()}`);
    }

    const loginUrl = new URL(page.url());
    const nextParam = loginUrl.searchParams.get('next');
    if (nextParam !== protectedRoute) {
      throw new Error(`Expected login next=${protectedRoute}, got ${nextParam}`);
    }

    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await page.waitForURL((url) => url.pathname === protectedRoute, {
      timeout: 30_000,
    });
    await page.locator('[data-testid="planner-workbench-root"]').waitFor({
      timeout: 20_000,
    });

    const root = page.locator('[data-testid="planner-workbench-root"]');
    const preset = await root.getAttribute('data-theme-preset');
    const appearance = await root.getAttribute('data-appearance');
    const dataSourceMode = await root.getAttribute('data-source-mode');
    const sessionIdentityVisible = await page
      .getByTestId('signature-session-identity')
      .isVisible();
    const screenshot = path.join(
      outputDir,
      'planner-workbench-auth-shared-session-evolucion.png',
    );
    await page.screenshot({ path: screenshot, fullPage: false });

    const cookies = await page.context().cookies(baseUrl);
    const supabaseCookieCount = cookies.filter((cookie) =>
      cookie.name.includes('sb-'),
    ).length;

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset after auth, got ${preset}`);
    }
    if (dataSourceMode !== 'fixture') {
      throw new Error(`Expected fixture mode for auth smoke, got ${dataSourceMode}`);
    }
    if (!sessionIdentityVisible) {
      throw new Error('Authenticated session identity was not visible.');
    }
    if (supabaseCookieCount === 0) {
      throw new Error('No Supabase session cookies were set after login.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: 'pass',
      initialStatus: initialResponse?.status() ?? null,
      finalUrl: page.url(),
      redirectedThroughLogin: true,
      nextParam,
      preset,
      appearance,
      dataSourceMode,
      sessionIdentityVisible,
      supabaseCookieCount,
      consoleMessages,
      screenshot,
      credentialsPrinted: false,
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
