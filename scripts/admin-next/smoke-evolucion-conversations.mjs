#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const route = '/admin/conversations/smoke';
const externalBaseUrl = process.env.ADMIN_NEXT_CONVERSATIONS_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_CONVERSATIONS_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/conversations';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before conversations smoke.',
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
    process.stdout.write(`[next-conversations:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-conversations:${sessionName}] ${chunk}`);
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
    const root = page.locator('[data-testid="admin-next-conversations-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const conversationCount = await page.locator('[data-testid^="admin-next-conversation-card-"]').count();
    const hasInbox = await page.getByTestId('admin-next-conversations-inbox').isVisible();
    const hasThread = await page.getByTestId('admin-next-conversations-thread').isVisible();
    const hasComposer = await page.getByTestId('admin-next-conversations-composer').isVisible();
    const hasCrmPanel = await page.getByTestId('admin-next-conversations-crm-panel').isVisible();
    const hasAiAssist = await page.getByTestId('admin-next-conversations-ai-assist').isVisible();
    const hasLinkedItinerary = await page.getByTestId('admin-next-conversations-linked-itinerary').isVisible();
    const hasCreateRequest = await page.getByTestId('admin-next-conversations-create-request').isVisible();
    const realtimeContract = await page
      .getByTestId('admin-next-conversations-realtime-status')
      .getAttribute('data-latency-contract');
    const leadTemperature = await page
      .getByTestId('admin-next-conversations-lead-temperature')
      .getAttribute('data-temperature');
    const templateCount = await page.locator('[data-testid^="admin-next-conversations-template-"]').count();
    const screenshot = path.join(outputDir, 'conversations-evolucion-light.png');
    await page.screenshot({ path: screenshot, fullPage: false });

    await page.getByTestId('admin-next-conversations-close').click();
    await page.getByTestId('admin-next-conversations-close-modal').waitFor({ timeout: 10_000 });
    const hasCloseModal = await page.getByTestId('admin-next-conversations-close-modal').isVisible();
    await page.getByTestId('admin-next-conversations-close-outcome-no_purchase').click();
    const reasonRequiredVisible = await page
      .getByTestId('admin-next-conversations-close-reason-required')
      .isVisible();
    const saveReadyBeforeReason = await page
      .getByTestId('admin-next-conversations-close-save')
      .getAttribute('data-close-ready');
    const saveDisabledBeforeReason = await page
      .getByTestId('admin-next-conversations-close-save')
      .isDisabled();
    const blockedScreenshot = path.join(outputDir, 'conversations-close-blocked-evolucion-light.png');
    await page.screenshot({ path: blockedScreenshot, fullPage: false });
    await page.getByTestId('admin-next-conversations-close-reason-price').click();
    const closeValidVisible = await page
      .getByTestId('admin-next-conversations-close-valid')
      .isVisible();
    const saveReadyAfterReason = await page
      .getByTestId('admin-next-conversations-close-save')
      .getAttribute('data-close-ready');
    const saveDisabledAfterReason = await page
      .getByTestId('admin-next-conversations-close-save')
      .isDisabled();
    const validScreenshot = path.join(outputDir, 'conversations-close-valid-evolucion-light.png');
    await page.screenshot({ path: validScreenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Conversaciones') {
      throw new Error(`Unexpected conversations title: ${title}`);
    }
    if (
      conversationCount < 3 ||
      !hasInbox ||
      !hasThread ||
      !hasComposer ||
      !hasCrmPanel ||
      !hasAiAssist ||
      !hasLinkedItinerary ||
      !hasCreateRequest ||
      templateCount < 2
    ) {
      throw new Error('Conversations required surfaces are not visible.');
    }
    if (realtimeContract !== '<= Flutter/Chatwoot' || leadTemperature !== 'hot') {
      throw new Error('Conversations realtime or lead qualification contract is missing.');
    }
    if (
      !hasCloseModal ||
      !reasonRequiredVisible ||
      saveReadyBeforeReason !== 'false' ||
      !saveDisabledBeforeReason ||
      !closeValidVisible ||
      saveReadyAfterReason !== 'true' ||
      saveDisabledAfterReason
    ) {
      throw new Error('No compro close reason gate is not enforced.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      conversationCount,
      hasInbox,
      hasThread,
      hasComposer,
      hasCrmPanel,
      hasAiAssist,
      hasLinkedItinerary,
      hasCreateRequest,
      realtimeContract,
      leadTemperature,
      templateCount,
      hasCloseModal,
      reasonRequiredVisible,
      saveReadyBeforeReason,
      saveDisabledBeforeReason,
      closeValidVisible,
      saveReadyAfterReason,
      saveDisabledAfterReason,
      consoleMessages,
      screenshots: [screenshot, blockedScreenshot, validScreenshot],
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
