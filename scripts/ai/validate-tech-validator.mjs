#!/usr/bin/env node

/**
 * validate-tech-validator.mjs
 *
 * Automated CODE-mode gate for tech-validator:
 * - Skill structure checks
 * - ADR alignment checks (ADR-003, ADR-007, ADR-011, ADR-012, ADR-013, ADR-014)
 * - Static analysis gates (delta TypeScript, lint, build)
 *
 * Usage:
 *   npm run tech-validator:code
 *   npm run tech-validator:code -- --quick
 *   npm run tech-validator:code -- --strict-global
 *   npm run tech-validator:code -- --strict-global-full
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const TECH_VALIDATOR_DIR = join(ROOT, '.claude/skills/tech-validator');
const ARCHITECTURE_DOC = join(ROOT, 'docs/architecture/ARCHITECTURE.md');
const ADR_013_DOC = join(ROOT, 'docs/architecture/ADR-013-tech-validator-quality-gate.md');
const ADR_014_DOC = join(ROOT, 'docs/architecture/ADR-014-delta-typescript-quality-gate.md');

const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const allFiles = args.has('--all-files');
const skipTypecheck = args.has('--no-typecheck');
const strictGlobal = args.has('--strict-global');
const strictGlobalFull = args.has('--strict-global-full');
const legacyGlobalOnly = args.has('--legacy-global-only');
const skipLint = args.has('--no-lint') || quick || (strictGlobal && !strictGlobalFull);
const skipBuild = args.has('--no-build') || quick || (strictGlobal && !strictGlobalFull);

if ((strictGlobal && legacyGlobalOnly) || (strictGlobalFull && legacyGlobalOnly)) {
  console.error('Cannot combine strict-global modes with --legacy-global-only.');
  process.exit(1);
}

if (strictGlobal && strictGlobalFull) {
  console.error('Use only one strict mode: --strict-global or --strict-global-full.');
  process.exit(1);
}

const findings = [];
let gatesFailed = 0;

const EDGE_ALLOWLIST = new Set([
  'app/api/seo/sync/route.ts',
  'lib/seo/state-token.ts',
]);

function addFinding(level, code, message, file = null) {
  findings.push({ level, code, message, file });
}

function rel(path) {
  return path.replace(`${ROOT}/`, '');
}

function toRelPath(filePath) {
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(ROOT, filePath);
  return relative(ROOT, absolutePath).replace(/\\/g, '/');
}

function runCapture(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    return '';
  }

  return result.stdout.trim();
}

function runGate(label, command, commandArgs) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const ok = (result.status ?? 1) === 0;
  if (!ok) {
    gatesFailed += 1;
    addFinding('error', 'QUALITY_GATE', `${label} failed`, null);
  }

  return ok;
}

function parseGitPaths(output) {
  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => existsSync(join(ROOT, file)));
}

async function findFiles(startDir, matcher) {
  if (!existsSync(startDir)) {
    return [];
  }

  const entries = await readdir(startDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFiles(fullPath, matcher);
      results.push(...nested);
      continue;
    }

    if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

async function checkTechValidatorStructure() {
  const requiredFiles = [
    'SKILL.md',
    'PLAN_MODE.md',
    'TASK_MODE.md',
    'CODE_MODE.md',
    'REFERENCE_FILES.md',
  ];

  for (const file of requiredFiles) {
    const fullPath = join(TECH_VALIDATOR_DIR, file);
    if (!existsSync(fullPath)) {
      addFinding('error', 'SKILL_STRUCTURE', `Missing required skill file: ${file}`, rel(fullPath));
    }
  }

  const skillPath = join(TECH_VALIDATOR_DIR, 'SKILL.md');
  if (!existsSync(skillPath)) {
    return;
  }

  const skillContent = await readFile(skillPath, 'utf-8');
  const requiredTokens = ['MODE: PLAN', 'MODE: TASK', 'MODE: CODE', 'ADR-003', 'ADR-007', 'ADR-011', 'ADR-012'];

  for (const token of requiredTokens) {
    if (!skillContent.includes(token)) {
      addFinding('error', 'SKILL_CONTENT', `SKILL.md is missing required token: ${token}`, rel(skillPath));
    }
  }

  const codeModePath = join(TECH_VALIDATOR_DIR, 'CODE_MODE.md');
  if (existsSync(codeModePath)) {
    const codeMode = await readFile(codeModePath, 'utf-8');
    if (!codeMode.includes('npx tsc --noEmit')) {
      addFinding('warning', 'SKILL_CONTENT', 'CODE_MODE.md should include tsc quality gate command', rel(codeModePath));
    }
    if (!codeMode.includes('npm run lint')) {
      addFinding('warning', 'SKILL_CONTENT', 'CODE_MODE.md should include lint quality gate command', rel(codeModePath));
    }
    if (!codeMode.includes('npm run build')) {
      addFinding('warning', 'SKILL_CONTENT', 'CODE_MODE.md should include build quality gate command', rel(codeModePath));
    }
  }
}

async function checkAdrRegistration() {
  if (!existsSync(ADR_013_DOC)) {
    addFinding('error', 'ADR_REGISTRY', 'ADR-013 file is missing', rel(ADR_013_DOC));
  }

  if (!existsSync(ADR_014_DOC)) {
    addFinding('error', 'ADR_REGISTRY', 'ADR-014 file is missing', rel(ADR_014_DOC));
  }

  if (!existsSync(ARCHITECTURE_DOC)) {
    addFinding('error', 'ADR_REGISTRY', 'ARCHITECTURE.md is missing', rel(ARCHITECTURE_DOC));
    return;
  }

  const architecture = await readFile(ARCHITECTURE_DOC, 'utf-8');
  if (!architecture.includes('ADR-013')) {
    addFinding('error', 'ADR_REGISTRY', 'ARCHITECTURE.md ADR index is missing ADR-013 entry', rel(ARCHITECTURE_DOC));
  }
  if (!architecture.includes('ADR-014')) {
    addFinding('error', 'ADR_REGISTRY', 'ARCHITECTURE.md ADR index is missing ADR-014 entry', rel(ARCHITECTURE_DOC));
  }
}

function checkApiEnvelope(content) {
  const isStreaming =
    content.includes('text/event-stream') ||
    content.includes('ReadableStream') ||
    content.includes('StreamingTextResponse') ||
    content.includes('createDataStreamResponse(');

  if (isStreaming) {
    return { ok: true, skipped: true };
  }

  const hasSuccessHelper = /apiSuccess\s*\(/.test(content);
  const hasErrorHelper = /api(Error|ValidationError|Unauthorized|NotFound|RateLimited|InternalError)\s*\(/.test(content);
  const hasSuccessLiteral = /success\s*:\s*true/.test(content);
  const hasErrorLiteral = /success\s*:\s*false/.test(content);

  return {
    ok: (hasSuccessHelper || hasSuccessLiteral) && (hasErrorHelper || hasErrorLiteral),
    skipped: false,
  };
}

function checkBoundaryValidation(content) {
  const hasBodyMethod = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(content);
  const readsJson = /request\.json\s*\(/.test(content);

  if (!hasBodyMethod || !readsJson) {
    return { ok: true, skipped: true };
  }

  const hasZodValidation =
    /safeParse\s*\(/.test(content) ||
    /\.parse\s*\(/.test(content) ||
    /z\.object\s*\(/.test(content) ||
    /zod/i.test(content);

  return { ok: hasZodValidation, skipped: false };
}

function checkNodeOnlyApis(content, filePath) {
  const relativePath = rel(filePath);
  if (EDGE_ALLOWLIST.has(relativePath)) {
    return { ok: true, skipped: true };
  }

  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(relativePath)) {
    return { ok: true, skipped: true };
  }

  const nodeOnlyPattern = /from\s+['"]node:|require\(\s*['"]node:|from\s+['"](fs|path|crypto|child_process|net|tls|dns|http2|zlib|cluster|worker_threads)['"]/;
  return {
    ok: !nodeOnlyPattern.test(content),
    skipped: false,
  };
}

function checkCacheConfig(content) {
  const hasCacheDirective = /export\s+const\s+(revalidate|dynamic|fetchCache|runtime)\s*=/.test(content);
  return { ok: hasCacheDirective, skipped: false };
}

function checkEditorialHeroSsrContract(heroContent, rotatorContent) {
  const hasServerFrame = /data-ssr-hero-frame=["']true["']/.test(heroContent);
  const hasPriorityServerImage = /<Image[\s\S]{0,800}\bpriority\b/.test(heroContent);
  const heroUsesFramerMotion = /from\s+['"]framer-motion['"]|motion\.|AnimatePresence/.test(heroContent);
  const rotatorUsesFramerMotion = /from\s+['"]framer-motion['"]|motion\.|AnimatePresence/.test(rotatorContent);
  const rotatorDefersAfterPaint =
    /hasHydratedAfterPaint/.test(rotatorContent) &&
    /requestAnimationFrame/.test(rotatorContent) &&
    /return\s+null\s*;/.test(rotatorContent);
  const rotatorStillPriorityLoads = /<Image[\s\S]{0,800}\bpriority\b/.test(rotatorContent);

  const errors = [];
  if (!hasServerFrame) {
    errors.push('Editorial hero must render the LCP first frame on the server with data-ssr-hero-frame="true"');
  }
  if (!hasPriorityServerImage) {
    errors.push('Editorial hero SSR first frame must own the priority image');
  }
  if (!rotatorDefersAfterPaint) {
    errors.push('Editorial hero rotator must defer client rendering until after first paint');
  }
  if (rotatorStillPriorityLoads) {
    errors.push('Editorial hero rotator must not priority-load client overlay images');
  }
  if (heroUsesFramerMotion || rotatorUsesFramerMotion) {
    errors.push('Editorial hero and rotator must not import framer-motion on public critical routes');
  }

  return errors;
}

function checkCriticalPublicRouteMotionBudget(content) {
  if (/from\s+['"]framer-motion['"]|motion\.|AnimatePresence/.test(content)) {
    return ['Critical public listing route must not import framer-motion'];
  }

  return [];
}

function checkPublicLayoutPerformanceContract(content) {
  const errors = [];
  const defersHeadAnalytics = /<GoogleTagManager\s+analytics=\{website\.analytics\}\s+defer\s*\/>/.test(content);
  const defersBodyAnalytics = /<GoogleTagManagerBody\s+analytics=\{website\.analytics\}\s+defer\s*\/>/.test(content);
  const hasEditorialFontGate = /shouldInjectThemeFontStyles\s*=\s*!isEditorial/.test(content);
  const gatesThemeFontLinks =
    /shouldInjectThemeFontStyles\s+&&\s+themeOutput\.fontUrls\.map/.test(content) ||
    /shouldInjectThemeFontStyles\s+&&\s*\(\s*themeOutput\.fontUrls\.map/.test(content);

  if (!defersHeadAnalytics || !defersBodyAnalytics) {
    errors.push('Public site layout must pass defer to analytics head and body scripts');
  }
  if (!hasEditorialFontGate || !gatesThemeFontLinks) {
    errors.push('Editorial public layout must not inject theme Google Font stylesheets as render-blocking links');
  }

  return errors;
}

function checkPublicHomeStreamingContract(content) {
  const errors = [];
  const hasSuspense = /<Suspense\s+fallback=\{null\}>[\s\S]{0,600}<DeferredHomeSections/.test(content);
  const hasCriticalPlan =
    /buildHomeSectionPlan\s*\(\s*enabledSections\s*\)/.test(content) &&
    /criticalSections\.map/.test(content) &&
    /criticalSectionIds/.test(content);
  const hasDeferredComponent = /async\s+function\s+DeferredHomeSections/.test(content);
  const hasTopLevelHeavyAwait =
    /export\s+default\s+async\s+function\s+SitePage[\s\S]*?const\s+\[[\s\S]*?Promise\.all\s*\(\s*\[/.test(content);

  if (!hasSuspense || !hasDeferredComponent) {
    errors.push('Public home must defer below-the-fold data behind Suspense/DeferredHomeSections');
  }
  if (!hasCriticalPlan) {
    errors.push('Public home must render critical sections before deferred sections');
  }
  if (hasTopLevelHeavyAwait) {
    errors.push('Public home must not await the heavy below-the-fold Promise.all before returning the critical shell');
  }

  return errors;
}

function parseTscDiagnostics(output, changedFiles) {
  const diagnostics = [];
  const lines = output.split(/\r?\n/);
  const withLocationPattern = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error TS(?<code>\d+): (?<message>.*)$/;
  const withoutLocationPattern = /^error TS(?<code>\d+): (?<message>.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const withLocationMatch = trimmed.match(withLocationPattern);
    if (withLocationMatch?.groups) {
      const relativePath = toRelPath(withLocationMatch.groups.file);
      diagnostics.push({
        file: relativePath,
        line: Number(withLocationMatch.groups.line),
        column: Number(withLocationMatch.groups.column),
        code: `TS${withLocationMatch.groups.code}`,
        message: withLocationMatch.groups.message,
        scope: changedFiles.has(relativePath) ? 'new' : 'legacy',
        raw: trimmed,
      });
      continue;
    }

    const withoutLocationMatch = trimmed.match(withoutLocationPattern);
    if (withoutLocationMatch?.groups) {
      diagnostics.push({
        file: null,
        line: null,
        column: null,
        code: `TS${withoutLocationMatch.groups.code}`,
        message: withoutLocationMatch.groups.message,
        scope: 'legacy',
        raw: trimmed,
      });
    }
  }

  return diagnostics;
}

function summarizeTscOutput(mode, diagnostics) {
  const total = diagnostics.length;
  const legacy = diagnostics.filter((diag) => diag.scope === 'legacy').length;
  const newErrors = diagnostics.filter((diag) => diag.scope === 'new').length;
  const strict = mode === 'strict-global' || mode === 'strict-global-full' || mode === 'legacy-global-only';
  const failed = strict ? total > 0 : newErrors > 0;

  return {
    mode,
    status: failed ? 'fail' : 'pass',
    total_errors: total,
    legacy_errors: legacy,
    new_errors: newErrors,
    diagnostics,
    failed,
  };
}

function printTypecheckSummary(typecheck) {
  console.log('\n▶ TypeScript quality gate');
  console.log(`Mode: ${typecheck.mode}`);
  console.log(`Total diagnostics: ${typecheck.total_errors}`);
  console.log(`New errors: ${typecheck.new_errors}`);
  console.log(`Legacy errors: ${typecheck.legacy_errors}`);

  if (typecheck.status === 'pass') {
    console.log('TypeScript gate: pass');
    return;
  }

  if (
    typecheck.mode === 'strict-global' ||
    typecheck.mode === 'strict-global-full' ||
    typecheck.mode === 'legacy-global-only'
  ) {
    console.log('TypeScript gate: fail (global mode)');
    return;
  }

  console.log('TypeScript gate: fail (new errors only)');

  const newDiagnostics = typecheck.diagnostics.filter((diag) => diag.scope === 'new');
  for (const diag of newDiagnostics.slice(0, 20)) {
    const where = diag.file ? `${diag.file}:${diag.line}:${diag.column}` : 'global';
    console.log(`- [${diag.code}] ${where} ${diag.message}`);
  }

  if (newDiagnostics.length > 20) {
    console.log(`- ...and ${newDiagnostics.length - 20} more new TypeScript diagnostics`);
  }
}

async function runTypecheck(changedFiles) {
  const mode = strictGlobalFull ? 'strict-global-full' : strictGlobal ? 'strict-global' : legacyGlobalOnly ? 'legacy-global-only' : 'delta';
  const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  const diagnostics = parseTscDiagnostics(output, changedFiles);
  const typecheck = summarizeTscOutput(mode, diagnostics);

  if (mode === 'strict-global' || mode === 'legacy-global-only') {
    if (output) {
      process.stdout.write(`${output}\n`);
    }
  }

  return typecheck;
}

async function runPolicyScans(changedFiles) {
  const apiRoutes = await findFiles(join(ROOT, 'app/api'), (filePath) => filePath.endsWith('/route.ts') || filePath.endsWith('/route.tsx'));

  const changedSet = new Set(changedFiles);
  const targetRoutes = allFiles
    ? apiRoutes
    : apiRoutes.filter((routePath) => changedSet.has(rel(routePath)));

  for (const routePath of targetRoutes) {
    const content = await readFile(routePath, 'utf-8');

    const envelope = checkApiEnvelope(content);
    if (!envelope.ok && !envelope.skipped) {
      addFinding('error', 'ADR-012', 'API route must use standard success/error envelope', rel(routePath));
    }

    const boundaryValidation = checkBoundaryValidation(content);
    if (!boundaryValidation.ok && !boundaryValidation.skipped) {
      addFinding('error', 'ADR-003', 'Body parsing route must validate request payload with Zod at boundary', rel(routePath));
    }
  }

  if (!allFiles && targetRoutes.length === 0) {
    addFinding('warning', 'ADR-012', 'No changed API routes found; envelope check skipped for untouched routes', null);
  }

  const edgeCandidateFiles = (allFiles ? await findFiles(ROOT, (filePath) => /\.(ts|tsx|js|mjs)$/.test(filePath)) : changedFiles.map((file) => join(ROOT, file)))
    .filter((filePath) => {
      const relativePath = rel(filePath);
      return (
        relativePath.startsWith('app/') ||
        relativePath.startsWith('components/') ||
        relativePath.startsWith('lib/') ||
        relativePath.startsWith('packages/theme-sdk/src/') ||
        relativePath.startsWith('packages/website-contract/src/')
      );
    });

  for (const filePath of edgeCandidateFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf-8');
    const nodeOnly = checkNodeOnlyApis(content, filePath);
    if (!nodeOnly.ok && !nodeOnly.skipped) {
      addFinding('error', 'ADR-007', 'Node-only API detected in edge-compatible source', rel(filePath));
    }
  }

  const changedViewFiles = changedFiles
    .filter((file) => file.startsWith('app/site/') || file.startsWith('app/domain/'))
    .filter((file) => file.endsWith('/page.tsx') || file.endsWith('/layout.tsx'));

  const targetViews = allFiles
    ? await findFiles(join(ROOT, 'app'), (filePath) =>
        (filePath.includes('/site/') || filePath.includes('/domain/')) &&
        (filePath.endsWith('/page.tsx') || filePath.endsWith('/layout.tsx')),
      )
    : changedViewFiles.map((file) => join(ROOT, file));

  for (const filePath of targetViews) {
    if (!existsSync(filePath)) {
      continue;
    }
    const content = await readFile(filePath, 'utf-8');
    const cacheConfig = checkCacheConfig(content);
    if (!cacheConfig.ok) {
      addFinding('error', 'ADR-011', 'Site/domain view must define cache strategy (revalidate/dynamic/fetchCache/runtime)', rel(filePath));
    }
  }

  if (!allFiles && targetViews.length === 0) {
    addFinding('warning', 'ADR-011', 'No changed app/site or app/domain page/layout files found; cache check skipped', null);
  }

  const heroPath = join(ROOT, 'components/site/themes/editorial-v1/sections/hero.tsx');
  const rotatorPath = join(ROOT, 'components/site/themes/editorial-v1/sections/hero-rotator.client.tsx');
  const shouldCheckHero =
    allFiles ||
    changedFiles.includes(rel(heroPath)) ||
    changedFiles.includes(rel(rotatorPath)) ||
    changedFiles.some((file) => file.startsWith('components/site/themes/editorial-v1/sections/'));

  if (shouldCheckHero && existsSync(heroPath) && existsSync(rotatorPath)) {
    const heroContent = await readFile(heroPath, 'utf-8');
    const rotatorContent = await readFile(rotatorPath, 'utf-8');
    const heroErrors = checkEditorialHeroSsrContract(heroContent, rotatorContent);
    for (const message of heroErrors) {
      addFinding('error', 'PERF-SSR-HERO', message, rel(heroPath));
    }
  }

  const criticalPublicRoutes = [
    join(ROOT, 'components/pages/packages-listing-page.tsx'),
    join(ROOT, 'components/pages/activities-listing-page.tsx'),
  ];
  for (const routePath of criticalPublicRoutes) {
    const routeRel = rel(routePath);
    if (!allFiles && !changedFiles.includes(routeRel)) {
      continue;
    }
    if (!existsSync(routePath)) {
      continue;
    }

    const routeContent = await readFile(routePath, 'utf-8');
    const routeErrors = checkCriticalPublicRouteMotionBudget(routeContent);
    for (const message of routeErrors) {
      addFinding('error', 'PERF-PUBLIC-JS', message, routeRel);
    }
  }

  const publicLayoutPath = join(ROOT, 'app/site/[subdomain]/layout.tsx');
  const publicLayoutRel = rel(publicLayoutPath);
  if ((allFiles || changedFiles.includes(publicLayoutRel)) && existsSync(publicLayoutPath)) {
    const publicLayoutContent = await readFile(publicLayoutPath, 'utf-8');
    const publicLayoutErrors = checkPublicLayoutPerformanceContract(publicLayoutContent);
    for (const message of publicLayoutErrors) {
      addFinding('error', 'PERF-PUBLIC-LAYOUT', message, publicLayoutRel);
    }
  }

  const publicHomePath = join(ROOT, 'app/site/[subdomain]/page.tsx');
  const publicHomeRel = rel(publicHomePath);
  if ((allFiles || changedFiles.includes(publicHomeRel)) && existsSync(publicHomePath)) {
    const publicHomeContent = await readFile(publicHomePath, 'utf-8');
    const publicHomeErrors = checkPublicHomeStreamingContract(publicHomeContent);
    for (const message of publicHomeErrors) {
      addFinding('error', 'PERF-HOME-STREAMING', message, publicHomeRel);
    }
  }
}

function collectChangedFiles() {
  const unstaged = parseGitPaths(runCapture('git', ['diff', '--name-only', '--diff-filter=ACMRTUXB']));
  const staged = parseGitPaths(runCapture('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']));
  const branch = parseGitPaths(runCapture('git', ['diff', '--name-only', '--diff-filter=ACMRTUXB', 'main...HEAD']));

  return [...new Set([...unstaged, ...staged, ...branch])];
}

async function writeReport(changedFiles, gates, typecheckDetails) {
  const reportPath = join(ROOT, 'reports/tech-validator/latest.json');
  await mkdir(join(ROOT, 'reports/tech-validator'), { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: quick ? 'quick' : 'full',
    filesAnalyzed: allFiles ? 'all-files' : 'changed-files',
    changedFiles,
    gates,
    typecheck: typecheckDetails,
    findings,
    summary: {
      errors: findings.filter((f) => f.level === 'error').length,
      warnings: findings.filter((f) => f.level === 'warning').length,
      legacyTypecheckErrors: typecheckDetails?.legacy_errors ?? 0,
      newTypecheckErrors: typecheckDetails?.new_errors ?? 0,
      totalTypecheckErrors: typecheckDetails?.total_errors ?? 0,
    },
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`\n🧾 Report written: ${rel(reportPath)}`);
}

function printSummary() {
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');

  console.log('\n==============================================');
  console.log(' Tech Validator — CODE Gate Summary');
  console.log('==============================================');
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors');
    for (const finding of errors) {
      const where = finding.file ? ` (${finding.file})` : '';
      console.log(`- [${finding.code}] ${finding.message}${where}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings');
    for (const finding of warnings) {
      const where = finding.file ? ` (${finding.file})` : '';
      console.log(`- [${finding.code}] ${finding.message}${where}`);
    }
  }

  console.log('');
}

async function main() {
  console.log('\n🔍 Running Tech Validator CODE gate...');
  console.log(`Mode: ${quick ? 'quick' : 'full'}`);
  console.log(`Scope: ${allFiles ? 'all files' : 'changed files + quality gates'}\n`);

  const changedFiles = collectChangedFiles();
  if (!allFiles && changedFiles.length === 0) {
    addFinding('warning', 'GIT_SCOPE', 'No changed files detected; policy scans will run in passive mode', null);
  }

  await checkTechValidatorStructure();
  await checkAdrRegistration();
  await runPolicyScans(changedFiles);

  const gates = {
    typecheck: skipTypecheck ? 'skipped' : 'pending',
    lint: skipLint ? 'skipped' : 'pending',
    build: skipBuild ? 'skipped' : 'pending',
  };
  let typecheckDetails = null;

  if (!skipTypecheck) {
    const typecheck = await runTypecheck(new Set(changedFiles));
    typecheckDetails = typecheck;
    gates.typecheck = typecheck.status;
    printTypecheckSummary(typecheck);
    if (typecheck.failed) {
      gatesFailed += 1;
      addFinding('error', 'QUALITY_GATE', `TypeScript quality gate failed in ${typecheck.mode} mode`, null);
    }
  }

  if (!skipLint) {
    gates.lint = runGate('Lint: npm run lint', 'npm', ['run', 'lint']) ? 'pass' : 'fail';
  }

  if (!skipBuild) {
    gates.build = runGate('Build: npm run build', 'npm', ['run', 'build']) ? 'pass' : 'fail';
  }

  await writeReport(changedFiles, gates, typecheckDetails);
  printSummary();

  const errorCount = findings.filter((f) => f.level === 'error').length;
  const exitCode = errorCount > 0 || gatesFailed > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log('✅ Tech Validator gate PASSED');
  } else {
    console.log('❌ Tech Validator gate FAILED');
  }

  process.exit(exitCode);
}

await main();
