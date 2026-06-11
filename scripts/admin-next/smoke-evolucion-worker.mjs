#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { adminNextSmokeToken } from './smoke-auth-headers.mjs';

const repoRoot = process.cwd();
const workerPath = path.join(repoRoot, '.open-next/worker.js');
const tempConfigPath = path.join(repoRoot, '.wrangler-admin-next-smoke.toml');
const previewEnv = process.env.ADMIN_NEXT_WORKER_PREVIEW_ENV || 'staging';

let preview = null;

async function main() {
  if (!existsSync(workerPath)) {
    throw new Error('Missing .open-next/worker.js. Run `npm run build:worker` first.');
  }

  writeFileSync(tempConfigPath, createSmokeWranglerConfig(), 'utf8');

  const baseUrl = await startPreview();
  const plannerSmoke = runSmoke('scripts/admin-next/smoke-evolucion.mjs', {
    ADMIN_NEXT_SMOKE_BASE_URL: baseUrl,
  });
  const accountSmoke = runSmoke('scripts/admin-next/smoke-evolucion-account.mjs', {
    ADMIN_NEXT_ACCOUNT_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_ACCOUNT_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/account-worker',
  });
  const settingsSmoke = runSmoke('scripts/admin-next/smoke-evolucion-settings.mjs', {
    ADMIN_NEXT_SETTINGS_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_SETTINGS_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/settings-worker',
  });
  const productsSmoke = runSmoke('scripts/admin-next/smoke-evolucion-products.mjs', {
    ADMIN_NEXT_PRODUCTS_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_PRODUCTS_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/products-worker',
  });
  const agendaSmoke = runSmoke('scripts/admin-next/smoke-evolucion-agenda.mjs', {
    ADMIN_NEXT_AGENDA_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_AGENDA_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/agenda-worker',
  });
  const dashboardSmoke = runSmoke('scripts/admin-next/smoke-evolucion-dashboard.mjs', {
    ADMIN_NEXT_DASHBOARD_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_DASHBOARD_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/dashboard-worker',
  });
  const contactsSmoke = runSmoke('scripts/admin-next/smoke-evolucion-contacts.mjs', {
    ADMIN_NEXT_CONTACTS_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_CONTACTS_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/contacts-worker',
  });
  const conversationsSmoke = runSmoke('scripts/admin-next/smoke-evolucion-conversations.mjs', {
    ADMIN_NEXT_CONVERSATIONS_SMOKE_BASE_URL: baseUrl,
    ADMIN_NEXT_CONVERSATIONS_SMOKE_OUTPUT_DIR:
      'output/playwright/admin-next/conversations-worker',
  });

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        runtime: 'cloudflare-opennext-preview',
        previewEnv,
        baseUrl,
        plannerSmoke,
        accountSmoke,
        settingsSmoke,
        productsSmoke,
        agendaSmoke,
        dashboardSmoke,
        contactsSmoke,
        conversationsSmoke,
      },
      null,
      2,
    ),
  );
}

function runSmoke(scriptPath, env) {
  const output = execFileSync('node', [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(output.slice(output.indexOf('{')));
}

function createSmokeWranglerConfig() {
  const source = readFileSync(path.join(repoRoot, 'wrangler.toml'), 'utf8');
  const marker = `[env.${previewEnv}.vars]\n`;

  if (!source.includes(marker)) {
    throw new Error(`Could not find ${marker.trim()} in wrangler.toml.`);
  }

  const requiredSmokeVars = [
    'ADMIN_NEXT_PROTOTYPE_ENABLED = "true"',
    'ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED = "true"',
    `ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN = "${adminNextSmokeToken}"`,
    'ADMIN_NEXT_DATA_SOURCE_MODE = "fixture"',
  ];

  return upsertEnvVars(source, marker, requiredSmokeVars);
}

function upsertEnvVars(source, marker, lines) {
  const start = source.indexOf(marker) + marker.length;
  const nextSection = source.slice(start).search(/\n\[/);
  const end = nextSection === -1 ? source.length : start + nextSection + 1;
  let section = source.slice(start, end);

  for (const line of lines) {
    const key = line.split('=')[0].trim();
    const keyPattern = new RegExp(`^${escapeRegExp(key)}\\s*=.*$`, 'm');
    section = keyPattern.test(section)
      ? section.replace(keyPattern, line)
      : `${line}\n${section}`;
  }

  return `${source.slice(0, start)}${section}${source.slice(end)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startPreview() {
  return new Promise((resolve, reject) => {
    let settled = false;
    let output = '';
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timed out waiting for OpenNext preview:\n${output}`));
    }, 45_000);

    preview = spawn(
      'npx',
      ['opennextjs-cloudflare', 'preview', '--config', tempConfigPath, '--env', previewEnv],
      {
        cwd: repoRoot,
        env: process.env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const onChunk = (chunk) => {
      const text = chunk.toString();
      output += text;

      const match = output.match(/Ready on (http:\/\/localhost:\d+)/);
      if (!match || settled) return;

      settled = true;
      clearTimeout(timeout);
      resolve(match[1]);
    };

    preview.stdout.on('data', onChunk);
    preview.stderr.on('data', onChunk);
    preview.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    preview.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `OpenNext preview exited before ready: code=${code} signal=${signal}\n${output}`,
        ),
      );
    });
  });
}

async function cleanup() {
  if (preview && !preview.killed) {
    try {
      process.kill(-preview.pid, 'SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    } catch {
      preview.kill('SIGTERM');
    }

    if (!preview.killed) {
      try {
        process.kill(-preview.pid, 'SIGKILL');
      } catch {
        preview.kill('SIGKILL');
      }
    }
  }

  try {
    rmSync(tempConfigPath, { force: true });
  } catch {
    // Best effort cleanup only.
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
