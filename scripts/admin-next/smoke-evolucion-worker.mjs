#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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
  const smokeOutput = execFileSync('node', ['scripts/admin-next/smoke-evolucion.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ADMIN_NEXT_SMOKE_BASE_URL: baseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const parsed = JSON.parse(smokeOutput.slice(smokeOutput.indexOf('{')));

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        runtime: 'cloudflare-opennext-preview',
        previewEnv,
        baseUrl,
        smoke: parsed,
      },
      null,
      2,
    ),
  );
}

function createSmokeWranglerConfig() {
  const source = readFileSync(path.join(repoRoot, 'wrangler.toml'), 'utf8');
  const marker = `[env.${previewEnv}.vars]\n`;

  if (!source.includes(marker)) {
    throw new Error(`Could not find ${marker.trim()} in wrangler.toml.`);
  }

  const smokeVars = [
    'ADMIN_NEXT_PROTOTYPE_ENABLED = "true"',
    'ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED = "true"',
    'ADMIN_NEXT_DATA_SOURCE_MODE = "fixture"',
  ].join('\n');

  return source.replace(marker, `${marker}${smokeVars}\n`);
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
