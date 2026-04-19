#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'config/hardcoded-ui-allowlist.json');

const TARGET_PATHS = [
  'app/site',
  'components/site',
  'app/not-found.tsx',
  'app/global-error.tsx',
  'components/quote/quote-form.tsx',
];

const ATTRIBUTE_NAMES = new Set(['aria-label', 'title', 'placeholder', 'alt']);
const SCANNED_EXTENSIONS = new Set(['.tsx']);
const USER_FACING_NAME_HINTS = [
  'title',
  'subtitle',
  'label',
  'placeholder',
  'message',
  'description',
  'heading',
  'eyebrow',
  'cta',
  'button',
  'text',
  'copy',
  'error',
  'success',
  'empty',
  'notice',
  'helper',
  'badge',
  'aria',
  'caption',
  'hint',
];

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return { exact: [], contains: [], ignoreFiles: [] };
  }

  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    exact: Array.isArray(parsed.exact) ? parsed.exact.filter((item) => typeof item === 'string') : [],
    contains: Array.isArray(parsed.contains) ? parsed.contains.filter((item) => typeof item === 'string') : [],
    ignoreFiles: Array.isArray(parsed.ignoreFiles) ? parsed.ignoreFiles.filter((item) => typeof item === 'string') : [],
  };
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isHumanText(value) {
  if (!value) return false;
  if (/^&[a-z0-9#]+;$/i.test(value)) return false;
  if (value.includes('{') || value.includes('}')) return false;
  if (value.includes('/') || value.includes('://')) return false;
  if (/^var\(/i.test(value)) return false;
  if (/^rgba?\(/i.test(value)) return false;
  if (/^\[.*\]$/.test(value.trim())) return false;
  if (value.startsWith('--')) return false;
  if (/^[a-z0-9._:-]+$/i.test(value) && !/[A-Z]/.test(value) && !/\s/.test(value)) return false;
  const letterCount = (value.match(/\p{L}/gu) ?? []).length;
  return letterCount >= 3;
}

function isAllowed(value, allowlist) {
  if (allowlist.exact.includes(value)) return true;
  return allowlist.contains.some((part) => value.includes(part));
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function shouldIgnoreFile(relativePath, allowlist) {
  const normalized = normalizeRelativePath(relativePath);
  return allowlist.ignoreFiles.some((ignored) => normalized === ignored || normalized.startsWith(`${ignored}/`));
}

function collectTargetFiles() {
  const files = new Set();

  function visitRelative(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) return;

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(absolutePath)) {
        visitRelative(path.join(relativePath, child));
      }
      return;
    }

    if (SCANNED_EXTENSIONS.has(path.extname(relativePath))) {
      files.add(normalizeRelativePath(relativePath));
    }
  }

  for (const target of TARGET_PATHS) {
    visitRelative(target);
  }

  return Array.from(files).sort();
}

function collectFindingsForFile(relativePath, allowlist) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [{
      file: relativePath,
      line: 1,
      column: 1,
      text: `Target file not found: ${relativePath}`,
    }];
  }

  const sourceText = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(absolutePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  function report(node, rawText) {
    const text = normalizeText(rawText);
    if (!isHumanText(text)) return;
    if (isAllowed(text, allowlist)) return;

    const start = node.getStart(sourceFile);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    findings.push({
      file: relativePath,
      line: line + 1,
      column: character + 1,
      text,
    });
  }

  function getNodeText(node) {
    if (!node) return null;
    if (ts.isStringLiteralLike(node)) return node.text;
    return null;
  }

  function isLikelyUserFacingIdentifier(identifier) {
    if (!identifier) return false;
    const normalized = identifier.toLowerCase();
    return USER_FACING_NAME_HINTS.some((hint) => normalized.includes(hint));
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      report(node, node.getText(sourceFile));
    }

    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const attrName = node.name.getText(sourceFile);
      if (ATTRIBUTE_NAMES.has(attrName)) {
        report(node.initializer, node.initializer.text);
      }
    }

    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteralLike(node.expression)) {
      report(node.expression, node.expression.text);
    }

    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      const initializerText = getNodeText(node.initializer);
      if (initializerText && isLikelyUserFacingIdentifier(node.name.text)) {
        report(node.initializer, initializerText);
      }

      if (
        ts.isBinaryExpression(node.initializer)
        && (node.initializer.operatorToken.kind === ts.SyntaxKind.BarBarToken
          || node.initializer.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
      ) {
        const fallbackText = getNodeText(node.initializer.right);
        if (fallbackText && isLikelyUserFacingIdentifier(node.name.text)) {
          report(node.initializer.right, fallbackText);
        }
      }

      if (ts.isConditionalExpression(node.initializer)) {
        const whenTrue = getNodeText(node.initializer.whenTrue);
        const whenFalse = getNodeText(node.initializer.whenFalse);
        if (whenTrue && isLikelyUserFacingIdentifier(node.name.text)) {
          report(node.initializer.whenTrue, whenTrue);
        }
        if (whenFalse && isLikelyUserFacingIdentifier(node.name.text)) {
          report(node.initializer.whenFalse, whenFalse);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function main() {
  const allowlist = loadAllowlist();
  const targetFiles = collectTargetFiles();
  const findings = targetFiles
    .filter((file) => !shouldIgnoreFile(file, allowlist))
    .flatMap((file) => collectFindingsForFile(file, allowlist));

  if (findings.length === 0) {
    console.log('hardcoded-ui: ok');
    return;
  }

  console.error('hardcoded-ui: found user-visible hardcoded text in public surfaces:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}:${finding.column} -> ${finding.text}`);
  }
  process.exitCode = 1;
}

main();
