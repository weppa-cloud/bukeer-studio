#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const flutterRoot = resolveFlutterRoot();
const handoffRoot = path.join(
  flutterRoot,
  'design/evolucion-handoff/bukeer-flutter-a-next-js',
);

const requiredRepoFiles = [
  'AGENTS.md',
  'package.json',
  'next.config.ts',
  'open-next.config.ts',
  'wrangler.toml',
  'packages/theme-sdk/src/presets/evolucion-preset.ts',
  'lib/admin-next/evolucion-theme.ts',
  'scripts/admin-next/scope-audit-evolucion.mjs',
  'scripts/admin-next/validate-evolucion-contract.mjs',
  'scripts/admin-next/smoke-evolucion.mjs',
  'scripts/admin-next/smoke-evolucion-auth.mjs',
  'scripts/admin-next/smoke-evolucion-worker.mjs',
  'app/admin/prototype/planner-workbench/page.tsx',
  'app/admin/prototype/planner-workbench/smoke/page.tsx',
];

const requiredFlutterFiles = [
  'AGENTS.md',
  'DESIGN.md',
  'docs/04-design-system/M3_IMPLEMENTATION_QUICKSTART.md',
];

const requiredHandoffFiles = [
  'README.md',
  'project/Prototipo Bukeer.html',
  'project/Prototipo Bukeer Movil.html',
  'project/Sistema Evolución.html',
  'project/evolucion.tokens.json',
  'chats/chat1.md',
  'chats/chat2.md',
  'chats/chat3.md',
];

const requiredEnvKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'CLOUDFLARE_ACCOUNT_ID',
];

const requiredNpmScripts = [
  'admin-next:scope:evolucion',
  'admin-next:validate:evolucion',
  'admin-next:smoke:evolucion',
  'admin-next:smoke:evolucion:auth',
  'admin-next:smoke:evolucion:worker',
  'build:worker',
  'preview:worker',
  'typecheck',
  'test',
];

const checks = [];

function resolveFlutterRoot() {
  const candidates = [
    process.env.BUKEER_FLUTTER_ROOT,
    path.resolve(repoRoot, '../bukeer_flutter'),
    path.resolve(repoRoot, '../../bukeer_flutter'),
    path.resolve(repoRoot, '../../../bukeer_flutter'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'DESIGN.md'))) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve(repoRoot, '../bukeer_flutter');
}

function addCheck(name, status, details = {}) {
  checks.push({ name, status, ...details });
}

function safeExec(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    return null;
  }
}

function checkFiles(label, root, files) {
  const missing = files.filter((file) => !existsSync(path.join(root, file)));
  addCheck(label, missing.length === 0 ? 'pass' : 'fail', {
    checked: files.length,
    missing,
  });
}

function readEnvKeys() {
  const candidates = ['.env.local', '.dev.vars'];
  const present = new Set();
  const files = [];

  for (const file of candidates) {
    const absolutePath = path.join(repoRoot, file);
    if (!existsSync(absolutePath)) {
      continue;
    }

    files.push(file);
    const content = readFileSync(absolutePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match) {
        present.add(match[1]);
      }
    }
  }

  return { files, present };
}

function checkEnv() {
  const { files, present } = readEnvKeys();
  const missing = requiredEnvKeys.filter((key) => !present.has(key));

  addCheck('env keys', missing.length === 0 ? 'pass' : 'fail', {
    files,
    required: requiredEnvKeys,
    missing,
    valuesPrinted: false,
  });
}

function checkPackageScripts() {
  const packagePath = path.join(repoRoot, 'package.json');
  const parsed = JSON.parse(readFileSync(packagePath, 'utf8'));
  const scripts = parsed.scripts ?? {};
  const missing = requiredNpmScripts.filter((scriptName) => !scripts[scriptName]);

  addCheck('npm scripts', missing.length === 0 ? 'pass' : 'fail', {
    checked: requiredNpmScripts,
    missing,
  });
}

function checkGit() {
  const branch = safeExec('git', ['branch', '--show-current']);
  const dirty = safeExec('git', ['status', '--short']);

  addCheck('git branch', branch ? 'pass' : 'fail', {
    branch,
    dirtyWorktree: Boolean(dirty),
  });
}

function checkIssue(issueNumber, expectedTitleIncludes) {
  const output = safeExec('gh', [
    'issue',
    'view',
    String(issueNumber),
    '--repo',
    'weppa-cloud/bukeer-studio',
    '--json',
    'number,title,state,projectItems,url',
  ]);

  if (!output) {
    addCheck(`github issue ${issueNumber}`, 'fail', {
      reason: 'gh issue view failed',
    });
    return;
  }

  const issue = JSON.parse(output);
  const projectStatus =
    issue.projectItems?.find((item) => item.title === 'bukeer development')
      ?.status?.name ?? null;
  const titleMatches = issue.title.includes(expectedTitleIncludes);
  const open = issue.state === 'OPEN';

  addCheck(`github issue ${issueNumber}`, open && titleMatches ? 'pass' : 'fail', {
    state: issue.state,
    title: issue.title,
    url: issue.url,
    project: 'bukeer development',
    projectStatus,
  });
}

function checkCrossRepoIssue() {
  const output = safeExec('gh', [
    'issue',
    'view',
    '851',
    '--repo',
    'weppa-cloud/bukeer-flutter',
    '--json',
    'number,title,state,url',
  ]);

  if (!output) {
    addCheck('github issue flutter 851', 'fail', {
      reason: 'gh issue view failed',
    });
    return;
  }

  const issue = JSON.parse(output);
  addCheck('github issue flutter 851', issue.state === 'OPEN' ? 'pass' : 'fail', {
    state: issue.state,
    title: issue.title,
    url: issue.url,
  });
}

function checkCloudflare() {
  const wrangler = safeExec('npx', ['wrangler', '--version']);
  const configExists = existsSync(path.join(repoRoot, 'wrangler.toml'));
  const openNextConfigExists = existsSync(path.join(repoRoot, 'open-next.config.ts'));

  addCheck('cloudflare opennext local tooling', wrangler ? 'pass' : 'fail', {
    wranglerVersion: wrangler,
    wranglerConfig: configExists,
    openNextConfig: openNextConfigExists,
  });
}

function summarize() {
  const failed = checks.filter((check) => check.status !== 'pass');
  const result = {
    status: failed.length === 0 ? 'GO' : 'NO-GO',
    scope: 'admin-next-evolucion-phase-0-preflight',
    generatedAt: new Date().toISOString(),
    repo: repoRoot,
    flutterRoot,
    handoffRoot,
    checks,
  };

  console.log(JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

checkFiles('studio repo files', repoRoot, requiredRepoFiles);
checkFiles('flutter design contract files', flutterRoot, requiredFlutterFiles);
checkFiles('evolucion handoff files', handoffRoot, requiredHandoffFiles);
checkEnv();
checkPackageScripts();
checkGit();
checkIssue(612, 'Evolución');
checkIssue(613, 'Fase 0');
checkCrossRepoIssue();
checkCloudflare();
summarize();
