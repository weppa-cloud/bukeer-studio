const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/growth/profile-source-auditor.mjs');
const fixturePath = path.join(repoRoot, 'scripts/growth/fixtures/profile-source-auditor.fixture.json');

function runAuditor(extraArgs = []) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-source-auditor-'));
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      `--fixture=${fixturePath}`,
      '--format=both',
      '--stdout=json',
      `--out-dir=${outDir}`,
      ...extraArgs,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return { result, outDir };
}

describe('growth profile source auditor fixture mode', () => {
  test('writes deterministic JSON and Markdown reports covering required verdicts', () => {
    const { result, outDir } = runAuditor();
    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/token-fixture|service-role-fixture|Bearer\s+eyJ/i);

    const jsonPath = path.join(outDir, 'profile-source-auditor-report.json');
    const markdownPath = path.join(outDir, 'profile-source-auditor-report.md');
    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(markdownPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(report.schema_version).toBe('growth-profile-source-auditor/v1');
    expect(report.mode).toBe('fixture');
    expect(report.safety).toMatchObject({
      readonly: true,
      writes_attempted: 0,
      provider_calls_attempted: 0,
      crons_modified: 0,
      dispatch_attempted: 0,
      secrets_redacted: true,
    });

    const verdicts = new Set([
      ...report.action_audits.map((audit) => audit.verdict),
      ...report.action_audits.flatMap((audit) =>
        audit.required_profiles.map((profile) => profile.verdict),
      ),
    ]);
    for (const verdict of [
      'PASS_AUTONOMOUS',
      'PASS_CANARY_ONLY',
      'FAIL_MISSING_PROFILE',
      'FAIL_STALE',
      'FAIL_LOCALE_MISMATCH',
      'FAIL_MISSING_SOURCE_REFS',
      'FAIL_PROVIDER_CACHE_EMPTY',
      'FAIL_LOW_CONFIDENCE',
    ]) {
      expect(verdicts.has(verdict)).toBe(true);
    }

    const missingRefsProfiles = report.action_audits
      .flatMap((audit) => audit.required_profiles)
      .filter((profile) => profile.source_signal_fact_ids_count === 0);
    expect(missingRefsProfiles.length).toBeGreaterThan(0);
    for (const profile of missingRefsProfiles) {
      expect(profile.verdict).not.toMatch(/^PASS_/);
    }

    const markdown = fs.readFileSync(markdownPath, 'utf8');
    expect(markdown).toContain('## Executive rollup');
    expect(markdown).toContain('## Safety statement');
    expect(markdown).toContain('## Locale/action matrix');
    expect(markdown).toContain('[REDACTED]');
    expect(markdown).not.toMatch(/token-fixture|service-role-fixture|Bearer\s+eyJ/i);
  });

  test('rejects v1 mutation flags and mutation APIs in source', () => {
    const { result } = runAuditor(['--apply']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Disallowed v1 mutation flag');

    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).not.toMatch(/\.insert\s*\(/);
    expect(source).not.toMatch(/\.update\s*\(/);
    expect(source).not.toMatch(/\.upsert\s*\(/);
    expect(source).not.toMatch(/\.delete\s*\(/);
    expect(source).not.toMatch(/hermes\s+kanban/i);
  });
});
