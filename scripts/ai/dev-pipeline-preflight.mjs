#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const REQUIRED_NODE_MAJOR = 22;
const DEFAULT_REQUIRED_PROFILES = ['specifier', 'tech-validator', 'developer', 'qa-engineer', 'learning-curator'];
const DEFAULT_REQUIRED_REPO_SKILLS = ['specifying', 'tech-validator', 'nextjs-developer', 'debugger', 'website-quality-gate', 'docs-keeper'];
const SECRET_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(token|secret|password|key)=([^\s]+)/gi,
];

function redact(value = '') {
  let out = String(value);
  out = out.replace(/(token|secret|password|key)=([^\s]+)/gi, '$1=<redacted>');
  for (const pattern of SECRET_PATTERNS.filter((pattern) => !pattern.source.includes('token|secret'))) {
    out = out.replace(pattern, '<redacted>');
  }
  return out.trim();
}

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: options.timeout ?? 30_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, ...options.env },
    shell: false,
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    stdout: redact(result.stdout || ''),
    stderr: redact(result.stderr || result.error?.message || ''),
  };
}

function parseListEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function firstLines(text, count = 8) {
  return text.split(/\r?\n/).filter(Boolean).slice(0, count).join('\n');
}

function check(name, fn) {
  try {
    return { name, ...fn() };
  } catch (error) {
    return { name, status: 'FAIL', message: redact(error?.message || String(error)) };
  }
}

const selfTest = process.argv.includes('--self-test');
if (selfTest) {
  const redacted = redact('token=abc123 ghp_abcdefghijklmnopqrstuvwxyz Bearer abc.def.ghi');
  const repoSkills = DEFAULT_REQUIRED_REPO_SKILLS.every((skill) => typeof skill === 'string' && skill.length > 0);
  const result = redacted.includes('token=<redacted>')
    && redacted.includes('<redacted>')
    && !redacted.includes('ghp_abcdefghijklmnopqrstuvwxyz')
    && !redacted.includes('Bearer abc.def.ghi')
    && repoSkills;
  console.log(JSON.stringify({ status: result ? 'PASS' : 'FAIL', checks: { redaction: redacted, default_repo_skills: repoSkills } }, null, 2));
  process.exit(result ? 0 : 1);
}

const checks = [];

checks.push(check('node_runtime', () => {
  const node = run('node', ['--version']);
  const npm = run('npm', ['--version']);
  const major = Number((node.stdout.match(/v?(\d+)/) || [])[1] || 0);
  return {
    status: major >= REQUIRED_NODE_MAJOR ? 'PASS' : 'FAIL',
    message: major >= REQUIRED_NODE_MAJOR
      ? `Node ${node.stdout}; npm ${npm.stdout}`
      : `NODE_VERSION_TOO_LOW required>=${REQUIRED_NODE_MAJOR} actual=${node.stdout || 'unknown'}`,
    evidence: { node: node.stdout, npm: npm.stdout },
  };
}));

checks.push(check('package_install_state', () => {
  const npm = run('npm', ['--version']);
  const hasNodeModules = existsSync(join(repoRoot, 'node_modules'));
  return {
    status: npm.status === 0 && hasNodeModules ? 'PASS' : 'FAIL',
    message: hasNodeModules ? `npm ${npm.stdout}; node_modules present` : 'INSTALL_REQUIRED: node_modules is missing; run npm ci before implementation gates',
    evidence: { npm: npm.stdout, node_modules: hasNodeModules },
  };
}));

checks.push(check('branch_and_worktree', () => {
  const status = run('git', ['status', '--short', '--branch']);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const top = run('git', ['rev-parse', '--show-toplevel']);
  const mergeBase = run('git', ['merge-base', '--is-ancestor', 'origin/dev', 'HEAD']);
  const stat = run('git', ['diff', '--stat']);
  const dirtyLines = status.stdout.split(/\r?\n/).filter((line) => line && !line.startsWith('##'));
  const allowDirty = process.env.KANBAN_PREFLIGHT_STRICT_DIRTY !== '1';
  const problems = [];
  if (branch.stdout === 'main') problems.push('BRANCH_MAIN_FORBIDDEN');
  if (top.stdout !== repoRoot) problems.push(`WORKTREE_MISMATCH expected=${repoRoot} actual=${top.stdout}`);
  if (mergeBase.status !== 0) problems.push('ORIGIN_DEV_NOT_ANCESTOR');
  if (dirtyLines.length && !allowDirty) problems.push(`DIRTY_WORKTREE files=${dirtyLines.length}`);
  const statusName = problems.length ? 'FAIL' : dirtyLines.length ? 'WARN' : 'PASS';
  return {
    status: statusName,
    message: problems.length ? problems.join('; ') : dirtyLines.length ? `DIRTY_WORKTREE_ALLOWED files=${dirtyLines.length}` : `branch=${branch.stdout} clean and based on origin/dev`,
    evidence: { branch: branch.stdout, status: status.stdout, diff_stat: stat.stdout },
  };
}));

checks.push(check('session_pool', () => {
  const result = run('npm', ['run', 'session:list'], { timeout: 60_000 });
  const controlled = /Slot\s+Port\s+Status|FREE|BUSY|all/i.test(`${result.stdout}\n${result.stderr}`);
  return {
    status: result.status === 0 && controlled ? 'PASS' : 'FAIL',
    message: result.status === 0 && controlled ? 'session pool reported controlled slot state; no server started' : 'SESSION_POOL_UNAVAILABLE_OR_UNCONTROLLED',
    evidence: firstLines(`${result.stdout}\n${result.stderr}`),
  };
}));

checks.push(check('tech_validator_command', () => {
  const result = run('npm', ['run', '--silent', 'tech-validator:code:quick'], { timeout: 300_000 });
  return {
    status: result.status === 0 ? 'PASS' : 'FAIL',
    message: result.status === 0 ? 'tech-validator quick gate passed' : 'TECH_VALIDATOR_QUICK_FAILED',
    evidence: firstLines(`${result.stdout}\n${result.stderr}`, 12),
  };
}));

checks.push(check('hermes_profiles_and_skills', () => {
  const requiredProfiles = parseListEnv('KANBAN_PREFLIGHT_REQUIRED_PROFILES', DEFAULT_REQUIRED_PROFILES);
  const requiredRepoSkills = parseListEnv('KANBAN_PREFLIGHT_REQUIRED_REPO_SKILLS', DEFAULT_REQUIRED_REPO_SKILLS);
  const hermes = run('hermes', ['--version']);
  if (hermes.status !== 0) {
    return {
      status: 'BLOCKED',
      message: 'BLOCKED_HERMES_CLI_UNAVAILABLE next_step="Install Hermes CLI or run inside a configured Hermes worker, then unblock task."',
      evidence: hermes.stderr || hermes.stdout,
    };
  }
  const profiles = run('hermes', ['profile', 'list'], { timeout: 60_000 });
  const skills = run('hermes', ['skills', 'list'], { timeout: 60_000 });
  const repoSkillDirs = existsSync(join(repoRoot, '.agents/skills'))
    ? readdirSync(join(repoRoot, '.agents/skills'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];
  const missingProfiles = requiredProfiles.filter((profile) => !profiles.stdout.includes(profile));
  const missingRepoSkills = requiredRepoSkills.filter((skill) => !repoSkillDirs.includes(skill) && !skills.stdout.includes(skill));
  if (missingProfiles.length || missingRepoSkills.length) {
    return {
      status: 'BLOCKED',
      message: `UNKNOWN_PROFILE_OR_SKILL_BLOCKED missing_profiles=[${missingProfiles.join(',')}] missing_skills=[${missingRepoSkills.join(',')}] next_step="Install or rename missing profile/skill, then unblock task. Do not run without it."`,
      evidence: { required_profiles: requiredProfiles, required_repo_skills: requiredRepoSkills },
    };
  }
  return {
    status: 'PASS',
    message: `Hermes CLI available; required profiles and repo skills found (${requiredProfiles.length} profiles, ${requiredRepoSkills.length} skills)`,
    evidence: { profiles: requiredProfiles, repo_skills: requiredRepoSkills },
  };
}));

checks.push(check('developer_auth_smoke', () => {
  const codexVersion = run('codex', ['--version']);
  const hermesLoginHelp = run('hermes', ['login', '--provider', 'openai-codex', '--help']);
  const hasCodex = codexVersion.status === 0;
  const hasHermesHelp = hermesLoginHelp.status === 0 || /provider|usage|login/i.test(`${hermesLoginHelp.stdout}\n${hermesLoginHelp.stderr}`);
  return {
    status: hasCodex || hasHermesHelp ? 'PASS' : 'BLOCKED',
    message: hasCodex ? `codex runtime visible: ${codexVersion.stdout || 'version unavailable'}` : hasHermesHelp ? 'Hermes login help available for openai-codex provider' : 'BLOCKED_CODEX_RUNTIME_UNAVAILABLE next_step="Run hermes login --provider openai-codex or route to an approved configured developer profile."',
    evidence: { codex: codexVersion.stdout || codexVersion.stderr, hermes_login_help: hasHermesHelp },
  };
}));

checks.push(check('github_auth_smoke', () => {
  const gh = run('gh', ['auth', 'status']);
  const remote = run('git', ['remote', '-v']);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (gh.status === 0) {
    return { status: 'PASS', message: 'GitHub CLI authenticated for PR creation', evidence: firstLines(gh.stdout || gh.stderr) };
  }
  return {
    status: 'WARN',
    message: `GITHUB_AUTH_UNAVAILABLE_FALLBACK branch=${branch.stdout} compare_url=https://github.com/weppa-cloud/bukeer-studio/compare/dev...${branch.stdout}?expand=1`,
    evidence: { gh: firstLines(gh.stderr || gh.stdout), remotes: firstLines(remote.stdout, 4) },
  };
}));

const summary = checks.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});
const hasFail = checks.some((item) => item.status === 'FAIL' || item.status === 'BLOCKED');
const output = {
  command: 'npm run kanban:preflight',
  status: hasFail ? 'BLOCKED_OR_FAILED' : 'PASS_WITH_WARNINGS_OK',
  summary,
  checks,
  next_steps: hasFail
    ? ['Fix FAIL/BLOCKED checks before implementation, or block the Kanban task with the exact state code shown above.']
    : ['Proceed with implementation. Treat WARN items as handoff requirements, not silent skips.'],
};
console.log(JSON.stringify(output, null, 2));
process.exit(hasFail ? 1 : 0);
