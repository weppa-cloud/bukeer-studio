#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const phaseIssueNumber = '616';

const requiredRoutes = [
  ['Dashboard', 'app/admin/dashboard/page.tsx', 'app/admin/dashboard/smoke/page.tsx'],
  ['Contactos', 'app/admin/contacts/page.tsx', 'app/admin/contacts/smoke/page.tsx'],
  ['Agenda', 'app/admin/agenda/page.tsx', 'app/admin/agenda/smoke/page.tsx'],
  ['Mi cuenta', 'app/admin/account/page.tsx', 'app/admin/account/smoke/page.tsx'],
  ['Configuracion', 'app/admin/settings/page.tsx', 'app/admin/settings/smoke/page.tsx'],
  ['Productos', 'app/admin/products/page.tsx', 'app/admin/products/smoke/page.tsx'],
  ['Conversaciones', 'app/admin/conversations/page.tsx', 'app/admin/conversations/smoke/page.tsx'],
  ['Reportes', 'app/admin/reports/page.tsx', 'app/admin/reports/smoke/page.tsx'],
  ['Pagos', 'app/admin/payments/page.tsx', 'app/admin/payments/smoke/page.tsx'],
  ['Itinerarios', 'app/admin/itineraries/page.tsx', 'app/admin/itineraries/smoke/page.tsx'],
];

const requiredScripts = [
  'admin-next:scope:evolucion',
  'admin-next:validate:evolucion',
  'admin-next:smoke:evolucion:worker',
  'admin-next:smoke:evolucion:itineraries',
  'admin-next:visual-qa:evolucion',
  'admin-next:lighthouse:evolucion',
  'build:worker',
  'typecheck',
];

const requiredEvidenceEnv = [
  {
    key: 'ADMIN_NEXT_CUTOVER_APPROVER',
    label: 'human approver',
    validate: (value) => value.trim().length >= 3,
    expected: 'non-empty approver name or handle',
  },
  {
    key: 'ADMIN_NEXT_CUTOVER_DECISION',
    label: 'cutover decision',
    validate: (value) => value === 'GO',
    expected: 'GO',
  },
  {
    key: 'ADMIN_NEXT_CUTOVER_PREVIEW_URL',
    label: 'validated preview url',
    validate: (value) => /^https:\/\/.+/.test(value),
    expected: 'https URL used for final smoke',
  },
  {
    key: 'ADMIN_NEXT_CUTOVER_SOAK_HOURS',
    label: 'soak window',
    validate: (value) => Number(value) >= 24,
    expected: '>= 24',
  },
  {
    key: 'ADMIN_NEXT_ROLLBACK_SECONDS',
    label: 'rollback target',
    validate: (value) => Number(value) > 0 && Number(value) <= 5,
    expected: '<= 5',
  },
  {
    key: 'ADMIN_NEXT_FLUTTER_FREEZE_CONFIRMED',
    label: 'flutter freeze',
    validate: isTrue,
    expected: 'true',
  },
  {
    key: 'ADMIN_NEXT_FLUTTER_WEB_READONLY_CONFIRMED',
    label: 'flutter web readonly fallback',
    validate: isTrue,
    expected: 'true',
  },
  {
    key: 'ADMIN_NEXT_AGENT_EVALS_STATUS',
    label: 'agent evals',
    validate: isPass,
    expected: 'pass',
  },
  {
    key: 'ADMIN_NEXT_LIGHTHOUSE_STATUS',
    label: 'lighthouse gate',
    validate: isPass,
    expected: 'pass',
  },
  {
    key: 'ADMIN_NEXT_A11Y_STATUS',
    label: 'accessibility gate',
    validate: isPass,
    expected: 'pass',
  },
  {
    key: 'ADMIN_NEXT_VISUAL_QA_STATUS',
    label: 'visual qa',
    validate: isPass,
    expected: 'pass',
  },
];

const checks = [];

function main() {
  checkRoutes();
  checkPackageScripts();
  checkThemeContract();
  checkGitClean();
  checkPhaseIssue();
  checkCutoverEvidence();

  const failed = checks.filter((check) => check.status === 'fail');
  const result = {
    status: failed.length === 0 ? 'GO' : 'NO-GO',
    scope: 'admin-next-evolucion-final-cutover-readiness',
    generatedAt: new Date().toISOString(),
    repo: repoRoot,
    checks,
    nextAction:
      failed.length === 0
        ? 'Proceed with authorized final cutover and keep rollback operator on watch.'
        : `Do not mark issue ${phaseIssueNumber} Corte final complete. Attach this JSON with owner/action for each failing check.`,
  };

  console.log(JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

function checkRoutes() {
  const missing = [];

  for (const [moduleName, routePath, smokePath] of requiredRoutes) {
    if (!existsSync(path.join(repoRoot, routePath))) {
      missing.push(`${moduleName}: ${routePath}`);
    }
    if (!existsSync(path.join(repoRoot, smokePath))) {
      missing.push(`${moduleName}: ${smokePath}`);
    }
  }

  addCheck('next route coverage', missing.length === 0 ? 'pass' : 'fail', {
    modules: requiredRoutes.map(([moduleName]) => moduleName),
    missing,
  });
}

function checkPackageScripts() {
  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  const scripts = packageJson.scripts ?? {};
  const missing = requiredScripts.filter((scriptName) => !scripts[scriptName]);

  addCheck('verification scripts', missing.length === 0 ? 'pass' : 'fail', {
    required: requiredScripts,
    missing,
  });
}

function checkThemeContract() {
  const files = [
    'packages/theme-sdk/src/presets/evolucion-preset.ts',
    'lib/admin-next/evolucion-theme.ts',
    'app/admin/layout.tsx',
    'app/globals.css',
  ];
  const missing = files.filter((file) => !existsSync(path.join(repoRoot, file)));
  const bridge = safeRead('lib/admin-next/evolucion-theme.ts');

  addCheck('evolucion theme bridge', missing.length === 0 ? 'pass' : 'fail', {
    files,
    missing,
    usesCompileTheme: bridge.includes('compileTheme'),
    referencesPreset: bridge.includes(['EVOLUCION', 'PRESET'].join('_')),
  });
}

function checkGitClean() {
  const status = safeExec('git', ['status', '--short']);
  const dirtyLines = status ? status.split(/\r?\n/).filter(Boolean) : [];

  addCheck('clean release worktree', dirtyLines.length === 0 ? 'pass' : 'fail', {
    dirtyCount: dirtyLines.length,
    dirtyFiles: dirtyLines.map(parseGitStatusPath),
  });
}

function checkPhaseIssue() {
  const output = safeExec('gh', [
    'issue',
    'view',
    phaseIssueNumber,
    '--repo',
    'weppa-cloud/bukeer-studio',
    '--json',
    'body,state,title,url',
  ]);

  if (!output) {
    const manualStatus = (process.env.ADMIN_NEXT_PHASE_ISSUE_STATUS ?? '')
      .trim()
      .toLowerCase();
    if (manualStatus === 'pass') {
      addCheck(`github issue ${phaseIssueNumber}`, 'pass', {
        source: 'ADMIN_NEXT_PHASE_ISSUE_STATUS',
        reason: 'manual phase issue verification supplied because gh was unavailable',
      });
      return;
    }

    addCheck(`github issue ${phaseIssueNumber}`, 'fail', {
      reason:
        'gh issue view failed; set ADMIN_NEXT_PHASE_ISSUE_STATUS=pass only after manually verifying the issue checklist',
    });
    return;
  }

  const issue = JSON.parse(output);
  const checklistLine = issue.body
    .split(/\r?\n/)
    .find((line) => line.includes('Lista/kanban itinerarios')) ?? '';
  const fiveSlicesDone =
    checklistLine.includes('[x] Lista/kanban itinerarios') &&
    checklistLine.includes('[x] Detalle 5 tabs') &&
    checklistLine.includes('[x] Cuotas y medios de pago') &&
    checklistLine.includes('[x] Vista pública 3 páginas') &&
    checklistLine.includes('[x] Móvil (11 pantallas)');
  const cutoverOpen = checklistLine.includes('[ ] Corte final');

  addCheck(
    `github issue ${phaseIssueNumber} phase state`,
    issue.state === 'OPEN' && fiveSlicesDone && cutoverOpen ? 'pass' : 'fail',
    {
      state: issue.state,
      title: issue.title,
      url: issue.url,
      checklistLine,
      expected: 'first five slices checked, Corte final unchecked before cutover',
    },
  );
}

function checkCutoverEvidence() {
  const failed = [];
  const values = {};

  for (const requirement of requiredEvidenceEnv) {
    const raw = process.env[requirement.key] ?? '';
    values[requirement.key] = raw ? '<present>' : '<missing>';

    if (!raw || !requirement.validate(raw.trim().toLowerCase())) {
      failed.push({
        key: requirement.key,
        label: requirement.label,
        expected: requirement.expected,
        present: Boolean(raw),
      });
    }
  }

  addCheck('final cutover evidence', failed.length === 0 ? 'pass' : 'fail', {
    missingOrInvalid: failed,
    valuesPrinted: false,
  });
}

function addCheck(name, status, details = {}) {
  checks.push({ name, status, ...details });
}

function safeRead(relativePath) {
  try {
    return readFileSync(path.join(repoRoot, relativePath), 'utf8');
  } catch {
    return '';
  }
}

function safeExec(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function parseGitStatusPath(line) {
  const normalized =
    line.length > 3 && line[2] === ' '
      ? line.slice(3)
      : line.slice(2).trimStart();
  return normalized.includes(' -> ') ? normalized.split(' -> ').at(-1) : normalized;
}

function isTrue(value) {
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function isPass(value) {
  return value === 'pass';
}

main();
