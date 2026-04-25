#!/usr/bin/env node

/**
 * check-media-asset-guardrails.mjs
 *
 * ADR-028 guardrail:
 * If a change introduces image/media URL fields, upload flows, gallery fields,
 * or content media references, it must also reference the canonical media
 * registry contract (`media_assets`, `register_media_asset_reference`, or
 * ADR-028). This keeps new Studio/Flutter-compatible image work from becoming
 * URL-only drift.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const args = new Set(process.argv.slice(2));
const allFiles = args.has('--all-files');
const json = args.has('--json');

const MEDIA_FIELD_PATTERN =
  /\b(avatar|gallery|thumbnail|backgroundImage|background_image|heroImage|hero_image|coverImage|cover_image|mainImage|main_image|featuredImage|featured_image|socialImage|social_image|ogImage|og_image|image_url|imageUrl|images_url|public_url|storage_path|storage_bucket)\b/i;

const MEDIA_URL_PATTERN = /\.(avif|gif|jpe?g|jfif|png|webp|svg)(\?|#|['"`)\]} ]|$)|\/storage\/v1\/(object|render\/image)\/public\//i;
const MEDIA_UPLOAD_PATTERN = /\b(upload|uploads|bucket|storage)\b/i;
const MEDIA_CONTEXT_PATTERN = /\b(image|images|media|asset|assets|avatar|gallery|photo|picture|file|files)\b/i;

const GUARDRAIL_PATTERN =
  /ADR-028|media_assets|register_media_asset_reference|backfill_media_assets_from_legacy_references|media_asset_inventory|SPEC_MEDIA_ASSET_INVENTORY|media-inventory-runbook/i;

const FILE_ALLOWLIST = [
  /^docs\/architecture\/ADR-028-media-assets-canonical-registry\.md$/,
  /^docs\/specs\/SPEC_MEDIA_ASSET_INVENTORY\.md$/,
  /^docs\/ops\/media-inventory-runbook\.md$/,
  /^docs\/ops\/media-asset-guardrails\.md$/,
  /^docs\/evidence\/media-/,
  /^supabase\/migrations\/\d+_media_asset_inventory_v1\.sql$/,
  /^supabase\/verification\/media-inventory-check\.sql$/,
  /^scripts\/ai\/check-media-asset-guardrails\.mjs$/,
];

const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.sql',
  '.md',
  '.mdx',
  '.json',
  '.yml',
  '.yaml',
]);

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function toRelPath(filePath) {
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(ROOT, filePath);
  return relative(ROOT, absolutePath).replace(/\\/g, '/');
}

function pathExt(filePath) {
  const match = filePath.match(/(\.[^.\/]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function isTextCandidate(filePath) {
  if (FILE_ALLOWLIST.some((pattern) => pattern.test(filePath))) {
    return false;
  }

  if (filePath.startsWith('node_modules/') || filePath.startsWith('.next/') || filePath.startsWith('.open-next/')) {
    return false;
  }

  if (filePath.startsWith('playwright-report/') || filePath.startsWith('test-results/')) {
    return false;
  }

  return EXTENSIONS.has(pathExt(filePath));
}

function parseNameOnly(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => existsSync(join(ROOT, file)))
    .map(toRelPath);
}

function collectChangedFiles() {
  if (allFiles) {
    return parseNameOnly(run('git', ['ls-files']).stdout);
  }

  const unstaged = parseNameOnly(run('git', ['diff', '--name-only', '--diff-filter=ACMRTUXB']).stdout);
  const staged = parseNameOnly(run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']).stdout);
  const branch = parseNameOnly(run('git', ['diff', '--name-only', '--diff-filter=ACMRTUXB', 'main...HEAD']).stdout);
  const untracked = parseNameOnly(run('git', ['ls-files', '--others', '--exclude-standard']).stdout);

  return [...new Set([...unstaged, ...staged, ...branch, ...untracked])];
}

function collectAddedLinesFromDiff(diffOutput) {
  const entries = [];
  let currentFile = null;

  for (const line of diffOutput.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = toRelPath(fileMatch[1]);
      continue;
    }

    if (!currentFile || !line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    entries.push({ file: currentFile, line: line.slice(1) });
  }

  return entries;
}

function getDiffAddedLines() {
  const outputs = [
    run('git', ['diff', '--unified=0', '--diff-filter=ACMRTUXB']).stdout,
    run('git', ['diff', '--cached', '--unified=0', '--diff-filter=ACMRTUXB']).stdout,
  ];

  return outputs.flatMap(collectAddedLinesFromDiff);
}

function getUntrackedAddedLines(files) {
  const tracked = new Set(parseNameOnly(run('git', ['ls-files']).stdout));
  const entries = [];

  for (const file of files) {
    if (tracked.has(file) || !isTextCandidate(file)) {
      continue;
    }

    const content = readFileSync(join(ROOT, file), 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      entries.push({ file, line });
    }
  }

  return entries;
}

function fileContainsGuardrail(file) {
  if (!existsSync(join(ROOT, file)) || !isTextCandidate(file)) {
    return false;
  }

  return GUARDRAIL_PATTERN.test(readFileSync(join(ROOT, file), 'utf-8'));
}

function isMediaSignalLine(line) {
  if (/^\s*-\s*image\s*:\s*[\w./:-]+/i.test(line) || /^\s*image\s*:\s*[\w./:-]+/i.test(line)) {
    return false;
  }

  if (MEDIA_FIELD_PATTERN.test(line) || MEDIA_URL_PATTERN.test(line)) {
    return true;
  }

  return MEDIA_UPLOAD_PATTERN.test(line) && MEDIA_CONTEXT_PATTERN.test(line);
}

function main() {
  const changedFiles = collectChangedFiles().filter(isTextCandidate);
  const addedLines = allFiles
    ? changedFiles.flatMap((file) => {
        const content = readFileSync(join(ROOT, file), 'utf-8');
        return content.split(/\r?\n/).map((line) => ({ file, line }));
      })
    : [...getDiffAddedLines(), ...getUntrackedAddedLines(changedFiles)].filter(({ file }) => isTextCandidate(file));

  const mediaSignals = addedLines
    .filter(({ line }) => isMediaSignalLine(line))
    .map(({ file, line }) => ({ file, line: line.trim().slice(0, 240) }));

  const signalFiles = [...new Set(mediaSignals.map((signal) => signal.file))];
  const hasGuardrailReference =
    changedFiles.some(fileContainsGuardrail) ||
    mediaSignals.some(({ line }) => GUARDRAIL_PATTERN.test(line));

  const result = {
    status: mediaSignals.length === 0 || hasGuardrailReference ? 'pass' : 'fail',
    changedFiles,
    signalFiles,
    mediaSignals: mediaSignals.slice(0, 40),
    hasGuardrailReference,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log('Media asset guardrail');
    console.log(`Changed files scanned: ${changedFiles.length}`);
    console.log(`Media/image signals: ${mediaSignals.length}`);

    if (mediaSignals.length > 0) {
      console.log(`Signal files: ${signalFiles.join(', ')}`);
    }

    if (result.status === 'pass') {
      console.log('Result: pass');
    } else {
      console.error('Result: fail');
      console.error('Image/media changes must reference ADR-028, media_assets, register_media_asset_reference, or a documented media backfill.');
      console.error('Add the Media / Images Impact checklist to the spec/issue/PR or wire the code path to media_assets.');
    }
  }

  process.exit(result.status === 'pass' ? 0 : 1);
}

main();
