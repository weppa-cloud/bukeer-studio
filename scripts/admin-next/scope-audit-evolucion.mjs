#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const PHASE0_ALLOWLIST = [
  /^app\/\(auth\)\/login\/login-form\.tsx$/,
  /^app\/\(auth\)\/login\/page\.tsx$/,
  /^app\/admin\/prototype\/planner-workbench\/page\.tsx$/,
  /^app\/admin\/prototype\/planner-workbench\/smoke\//,
  /^app\/admin\/prototype\/planner-workbench\/smoke\/page\.tsx$/,
  /^app\/globals\.css$/,
  /^components\/admin-next\//,
  /^docs\/architecture\/ADR-NF-\d{3}-.*\.md$/,
  /^docs\/INDEX\.md$/,
  /^jest\.config\.js$/,
  /^lib\/admin-next\/admin-next-copy\.ts$/,
  /^lib\/admin-next\/evolucion-theme\.ts$/,
  /^middleware\.ts$/,
  /^package\.json$/,
  /^scripts\/admin-next\//,
  /^__tests__\/app\/admin-next-planner-workbench-page\.test\.tsx$/,
  /^__tests__\/app\/login-page\.test\.tsx$/,
  /^__tests__\/components\/admin-next\/signature-ui\.test\.tsx$/,
  /^__tests__\/lib\/admin-next\/admin-next-copy\.test\.ts$/,
  /^__tests__\/lib\/admin-next\/evolucion-theme\.test\.ts$/,
];

const KNOWN_MIXED_FILES = new Set(['package.json']);

function git(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3);
  const renamePath = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;

  return {
    status,
    path: renamePath,
  };
}

function isPhase0File(filePath) {
  return PHASE0_ALLOWLIST.some((pattern) => pattern.test(filePath));
}

function packageJsonSignals() {
  const diff = git(['diff', '--', 'package.json']);
  const addedLines = diff
    .split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'));
  const nonAdminAddedScripts = addedLines.filter((line) => {
    if (!line.includes('": "')) return false;
    return !line.includes('"admin-next:');
  });

  return {
    addedScriptLines: addedLines.filter((line) => line.includes('": "')).length,
    adminNextScriptLines: addedLines.filter((line) => line.includes('"admin-next:'))
      .length,
    nonAdminAddedScripts,
  };
}

function main() {
  const statusOutput = git(['status', '--porcelain']);
  const entries = statusOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseStatusLine);

  const phase0 = [];
  const unrelated = [];

  for (const entry of entries) {
    if (isPhase0File(entry.path)) {
      phase0.push(entry);
    } else {
      unrelated.push(entry);
    }
  }

  const packageSignals = packageJsonSignals();
  const mixedFiles = [...KNOWN_MIXED_FILES].filter((filePath) =>
    phase0.some((entry) => entry.path === filePath),
  );
  const packageHasNonAdminScripts = packageSignals.nonAdminAddedScripts.length > 0;
  const prReady = unrelated.length === 0 && !packageHasNonAdminScripts;
  const result = {
    status: prReady ? 'GO' : 'NO-GO',
    scope: 'admin-next-evolucion-phase-0-pr-scope',
    phase0Files: phase0.map((entry) => entry.path).sort(),
    unrelatedFiles: unrelated.map((entry) => entry.path).sort(),
    mixedFiles,
    packageJson: packageSignals,
    recommendation: prReady
      ? 'Safe to stage the Phase 0 scope for PR/deploy.'
      : 'Do not create a PR or remote preview from this worktree until unrelated files are isolated or package.json is hunk-staged without non-admin scripts.',
  };

  console.log(JSON.stringify(result, null, 2));

  if (!prReady) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
