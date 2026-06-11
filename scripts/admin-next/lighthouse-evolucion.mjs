#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { adminNextSmokeHeaders, adminNextSmokeToken } from './smoke-auth-headers.mjs';

const auditedRoutes = [
  ['dashboard', '/admin/dashboard/smoke'],
  ['products', '/admin/products/smoke'],
  ['payments', '/admin/payments/smoke?method=card&batch=collect'],
  [
    'itineraries',
    '/admin/itineraries/smoke?view=list&status=all&owner=all&selected=it-2651&tab=services',
  ],
];

const minPerformanceScore = Number(
  process.env.ADMIN_NEXT_LIGHTHOUSE_MIN_PERFORMANCE ?? '0.9',
);
const minAccessibilityScore = Number(
  process.env.ADMIN_NEXT_LIGHTHOUSE_MIN_ACCESSIBILITY ?? '1',
);
const retryCount = Number(process.env.ADMIN_NEXT_LIGHTHOUSE_RETRIES ?? '1');
const externalBaseUrl = process.env.ADMIN_NEXT_LIGHTHOUSE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_LIGHTHOUSE_OUTPUT_DIR ||
  'output/lighthouse/admin-next/evolucion';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before Lighthouse.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  const checks = [];
  await warmRoutes(baseUrl);

  for (const [moduleName, route] of auditedRoutes) {
    const targetUrl = new URL(route, baseUrl).toString();
    await waitForHttp(targetUrl);
    checks.push(runLighthouse({ moduleName, targetUrl }));
  }

  const failed = checks.filter((check) => check.status !== 'pass');
  const result = {
    status: failed.length === 0 ? 'pass' : 'fail',
    scope: 'admin-next-evolucion-lighthouse-a11y',
    generatedAt: new Date().toISOString(),
    baseUrl,
    minPerformanceScore,
    minAccessibilityScore,
    retryCount,
    checks,
  };

  console.log(JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

function runLighthouse({ moduleName, targetUrl }) {
  const attempts = [];

  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    const attemptResult = runLighthouseAttempt({ moduleName, targetUrl, attempt });
    attempts.push(attemptResult);

    if (attemptResult.status === 'pass') {
      return {
        ...attemptResult,
        attempts,
      };
    }
  }

  const bestAttempt = [...attempts]
    .sort((a, b) => {
      const performanceDelta = (b.performance ?? 0) - (a.performance ?? 0);
      if (performanceDelta !== 0) return performanceDelta;
      return (b.accessibility ?? 0) - (a.accessibility ?? 0);
    })
    .at(0);

  return {
    ...bestAttempt,
    attempts,
  };
}

function runLighthouseAttempt({ moduleName, targetUrl, attempt }) {
  const outputPath = path.join(
    outputDir,
    attempt === 1
      ? `${moduleName}-lighthouse.json`
      : `${moduleName}-lighthouse-attempt-${attempt}.json`,
  );
  const headers = JSON.stringify(adminNextSmokeHeaders());
  const args = [
    'lighthouse',
    targetUrl,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
    '--only-categories=performance,accessibility',
    '--preset=desktop',
    '--screenEmulation.disabled',
    '--throttling-method=provided',
    '--disable-storage-reset',
    `--extra-headers=${headers}`,
    '--output=json',
    `--output-path=${outputPath}`,
  ];

  execFileSync('npx', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const performance = report.categories.performance?.score ?? null;
  const accessibility = report.categories.accessibility?.score ?? null;
  const failures = [];

  if (performance === null || performance < minPerformanceScore) {
    failures.push(`performance:${performance}`);
  }
  if (accessibility === null || accessibility < minAccessibilityScore) {
    failures.push(`accessibility:${accessibility}`);
  }

  return {
    status: failures.length === 0 ? 'pass' : 'fail',
    module: moduleName,
    url: targetUrl,
    attempt,
    performance,
    accessibility,
    report: outputPath,
    failures,
  };
}

async function warmRoutes(baseUrl) {
  await Promise.all(
    auditedRoutes.map(async ([, route]) => {
      const targetUrl = new URL(route, baseUrl).toString();
      await waitForHttp(targetUrl);
    }),
  );
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
    process.stdout.write(`[next-lighthouse:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-lighthouse:${sessionName}] ${chunk}`);
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
