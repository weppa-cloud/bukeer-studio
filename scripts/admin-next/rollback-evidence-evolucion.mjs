#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_MAX_AGE_HOURS = 48;

export function validateRollbackEvidenceFromEnv({
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const evidencePath = env.ADMIN_NEXT_ROLLBACK_EVIDENCE_PATH?.trim();

  if (!evidencePath) {
    return fail({
      reason: 'ADMIN_NEXT_ROLLBACK_EVIDENCE_PATH is required',
      expected:
        'JSON drill artifact with rollbackSeconds <= 5, operator, command, versions, checks and verdict GO',
    });
  }

  const resolvedPath = path.isAbsolute(evidencePath)
    ? evidencePath
    : path.join(cwd, evidencePath);

  if (!existsSync(resolvedPath)) {
    return fail({
      reason: 'rollback evidence file does not exist',
      path: evidencePath,
    });
  }

  let evidence;
  try {
    evidence = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    return fail({
      reason: 'rollback evidence file is not valid JSON',
      path: evidencePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const findings = [];
  const maxAgeHours = Number(
    env.ADMIN_NEXT_ROLLBACK_EVIDENCE_MAX_AGE_HOURS ?? DEFAULT_MAX_AGE_HOURS,
  );
  const rollbackSeconds = Number(evidence.rollbackSeconds);
  const measuredAt = new Date(evidence.measuredAt ?? '');
  const evidenceAgeHours = Number.isNaN(measuredAt.getTime())
    ? Number.POSITIVE_INFINITY
    : (Date.now() - measuredAt.getTime()) / 36e5;
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];

  requireField(
    findings,
    evidence.scope === 'admin-next-evolucion-final-cutover',
    'scope',
    'admin-next-evolucion-final-cutover',
  );
  requireField(
    findings,
    typeof evidence.previewUrl === 'string' &&
      /^https:\/\/.+/.test(evidence.previewUrl),
    'previewUrl',
    'https URL used for rollback drill',
  );
  requireField(
    findings,
    !Number.isNaN(measuredAt.getTime()),
    'measuredAt',
    'valid ISO timestamp',
  );
  requireField(
    findings,
    Number.isFinite(evidenceAgeHours) &&
      evidenceAgeHours >= 0 &&
      evidenceAgeHours <= maxAgeHours,
    'measuredAt',
    `not older than ${maxAgeHours}h`,
  );
  requireField(
    findings,
    typeof evidence.operator === 'string' && evidence.operator.trim().length >= 3,
    'operator',
    'human approver/operator handle',
  );
  requireField(
    findings,
    typeof evidence.command === 'string' && evidence.command.trim().length >= 5,
    'command',
    'rollback command or governed operation id',
  );
  requireField(
    findings,
    typeof evidence.fromVersion === 'string' &&
      evidence.fromVersion.trim().length > 0,
    'fromVersion',
    'version before rollback',
  );
  requireField(
    findings,
    typeof evidence.toVersion === 'string' && evidence.toVersion.trim().length > 0,
    'toVersion',
    'version after rollback',
  );
  requireField(
    findings,
    rollbackSeconds > 0 && rollbackSeconds <= 5,
    'rollbackSeconds',
    '<= 5',
  );
  requireField(findings, evidence.verdict === 'GO', 'verdict', 'GO');
  requireField(
    findings,
    checks.length > 0 && checks.every((check) => check?.status === 'pass'),
    'checks',
    'non-empty array with every check.status=pass',
  );

  const details = {
    path: evidencePath,
    valuesPrinted: false,
    scope: evidence.scope ?? null,
    previewUrl: evidence.previewUrl ?? null,
    operator: evidence.operator ? '<present>' : '<missing>',
    command: evidence.command ? '<present>' : '<missing>',
    fromVersion: evidence.fromVersion ?? null,
    toVersion: evidence.toVersion ?? null,
    rollbackSeconds: Number.isFinite(rollbackSeconds) ? rollbackSeconds : null,
    measuredAt: evidence.measuredAt ?? null,
    evidenceAgeHours: Number.isFinite(evidenceAgeHours)
      ? Number(evidenceAgeHours.toFixed(3))
      : null,
    maxAgeHours,
    checkCount: checks.length,
    failedFields: findings,
  };

  return {
    status: findings.length === 0 ? 'pass' : 'fail',
    ...details,
  };
}

function requireField(findings, condition, field, expected) {
  if (!condition) {
    findings.push({ field, expected });
  }
}

function fail(details) {
  return {
    status: 'fail',
    valuesPrinted: false,
    ...details,
  };
}

function main() {
  const result = validateRollbackEvidenceFromEnv();
  console.log(
    JSON.stringify(
      {
        status: result.status,
        scope: 'admin-next-evolucion-rollback-evidence',
        generatedAt: new Date().toISOString(),
        evidence: result,
      },
      null,
      2,
    ),
  );

  if (result.status !== 'pass') {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
