#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const SCAN_ROOTS = [
  'app/admin',
  'components/admin-next',
  'lib/admin-next',
  'scripts/admin-next',
];

const FILE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const JSX_FILE_EXTENSIONS = new Set(['.jsx', '.tsx']);
const HARD_CODED_HEX = /(^|[^\w-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g;
const THEME_SDK_IMPORT = /from\s+['"]@bukeer\/theme-sdk['"]|require\(['"]@bukeer\/theme-sdk['"]\)/;
const EVOLUCION_PRESET_REFERENCE = /\bEVOLUCION_PRESET\b/;
const INTERACTIVE_TAG = /<(button|Button|a)\b[\s\S]*?>/g;
const STATIC_JSX_COPY = />\s*([^<{}`\r\n][^<{}`\r\n]*[A-Za-zÁÉÍÓÚáéíóúÑñ][^<{}`\r\n]*)\s*</g;
const COPY_ATTRIBUTE = /\b(?:aria-label|title|placeholder|alt)=("[^"]*[A-Za-zÁÉÍÓÚáéíóúÑñ][^"]*"|'[^']*[A-Za-zÁÉÍÓÚáéíóúÑñ][^']*')/g;

const APPROVED_THEME_BRIDGE = 'lib/admin-next/evolucion-theme.ts';
const SELF_FILE = 'scripts/admin-next/validate-evolucion-contract.mjs';
const JSX_COPY_SCAN_ROOTS = ['app/admin', 'components/admin-next'];

const HARDCODED_COPY_BASELINE = {
  'components/admin-next/admin-shell.tsx': 0,
  'components/admin-next/agent-cards.tsx': 0,
  'components/admin-next/approval-command-bar.tsx': 0,
  'components/admin-next/live-feed-column.tsx': 0,
  'components/admin-next/planner-workbench-prototype.tsx': 0,
  'components/admin-next/planning-canvas.tsx': 0,
  'components/admin-next/signature-ui.tsx': 0,
  'components/admin-next/trace-drawer.tsx': 0,
  'components/admin-next/trip-rail.tsx': 0,
  'components/admin-next/workflow-panels.tsx': 0,
};

const violations = [];
const hardcodedCopyCounts = {};

async function collectFiles(rootRelativePath) {
  const root = path.join(repoRoot, rootRelativePath);

  try {
    await stat(root);
  } catch {
    return [];
  }

  const files = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') {
          continue;
        }

        pending.push(absolutePath);
        continue;
      }

      if (entry.isFile() && FILE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  return files;
}

function addViolation(file, lineNumber, rule, message) {
  violations.push({
    file,
    line: lineNumber,
    rule,
    message,
  });
}

function findHardcodedHex(file, content) {
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    HARD_CODED_HEX.lastIndex = 0;

    if (HARD_CODED_HEX.test(line)) {
      addViolation(
        file,
        index + 1,
        'evolucion/no-hardcoded-hex',
        'Use compileTheme() CSS variables or semantic Tailwind tokens instead of hex literals.',
      );
    }
  }
}

function findForbiddenThemeSdkAccess(file, content) {
  if (file === APPROVED_THEME_BRIDGE || file === SELF_FILE) {
    return;
  }

  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (THEME_SDK_IMPORT.test(line)) {
      addViolation(
        file,
        index + 1,
        'evolucion/theme-sdk-bridge-only',
        `Import @bukeer/theme-sdk only from ${APPROVED_THEME_BRIDGE}; client/admin files must receive compiled CSS vars.`,
      );
    }

    if (EVOLUCION_PRESET_REFERENCE.test(line)) {
      addViolation(
        file,
        index + 1,
        'evolucion/preset-bridge-only',
        `Reference EVOLUCION_PRESET only from ${APPROVED_THEME_BRIDGE}; downstream code must use the compiled bridge output.`,
      );
    }
  }
}

function lineForOffset(content, offset) {
  return content.slice(0, offset).split(/\r?\n/).length;
}

function findInteractiveWithoutTestId(file, content) {
  if (!JSX_FILE_EXTENSIONS.has(path.extname(file))) {
    return;
  }

  INTERACTIVE_TAG.lastIndex = 0;
  let match;

  while ((match = INTERACTIVE_TAG.exec(content)) !== null) {
    const tag = match[0];

    if (tag.includes('data-testid=')) {
      continue;
    }

    addViolation(
      file,
      lineForOffset(content, match.index),
      'evolucion/interactive-data-testid',
      'Interactive Admin Next elements must expose data-testid for Playwright and agent verification.',
    );
  }
}

function countHardcodedCopy(content) {
  let count = 0;

  STATIC_JSX_COPY.lastIndex = 0;
  COPY_ATTRIBUTE.lastIndex = 0;

  let match;
  while ((match = STATIC_JSX_COPY.exec(content)) !== null) {
    const copy = match[1].trim();
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    if (line.includes('=> Promise<')) {
      continue;
    }

    if (copy && !/^[|,.:;\-–—()[\]{}]+$/.test(copy)) {
      count += 1;
    }
  }

  while ((match = COPY_ATTRIBUTE.exec(content)) !== null) {
    count += 1;
  }

  return count;
}

function trackHardcodedCopy(file, content) {
  if (!JSX_FILE_EXTENSIONS.has(path.extname(file))) {
    return;
  }

  if (!JSX_COPY_SCAN_ROOTS.some((root) => file.startsWith(`${root}/`))) {
    return;
  }

  const copyCount = countHardcodedCopy(content);

  if (copyCount === 0) {
    return;
  }

  hardcodedCopyCounts[file] = copyCount;

  const baseline = HARDCODED_COPY_BASELINE[file] ?? 0;

  if (copyCount > baseline) {
    addViolation(
      file,
      1,
      'evolucion/no-new-hardcoded-copy',
      `Hardcoded JSX copy increased from baseline ${baseline} to ${copyCount}. Move new copy into the Admin Next i18n contract.`,
    );
  }
}

async function main() {
  const files = (await Promise.all(SCAN_ROOTS.map(collectFiles))).flat();

  for (const absolutePath of files) {
    const relativePath = path.relative(repoRoot, absolutePath);
    const content = await readFile(absolutePath, 'utf8');

    findHardcodedHex(relativePath, content);
    findForbiddenThemeSdkAccess(relativePath, content);
    findInteractiveWithoutTestId(relativePath, content);
    trackHardcodedCopy(relativePath, content);
  }

  const result = {
    status: violations.length === 0 ? 'pass' : 'fail',
    contract: 'admin-next-evolucion',
    scannedRoots: SCAN_ROOTS,
    scannedFiles: files.length,
    hardcodedCopyBaseline: HARDCODED_COPY_BASELINE,
    hardcodedCopyCounts,
    violations,
  };

  if (violations.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
