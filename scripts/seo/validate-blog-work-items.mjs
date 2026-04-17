#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { file: 'docs/seo/templates/seo-blog-work-items.template.csv' };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --file');
      }
      args.file = value;
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(value);
      value = '';
      continue;
    }
    value += ch;
  }
  out.push(value);
  return out.map((item) => item.trim());
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must include header and at least one data row');
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

function splitDependencies(raw) {
  if (!raw) return [];
  return raw
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateWorkItems(rows) {
  const errors = [];
  const byId = new Map();
  const allowedStatus = new Set(['Open', 'In Progress', 'Blocked', 'Done']);

  for (const row of rows) {
    const workId = (row.work_id || '').trim();
    if (!workId) {
      errors.push('Row with empty work_id');
      continue;
    }
    if (byId.has(workId)) {
      errors.push(`Duplicate work_id detected: ${workId}`);
    }
    byId.set(workId, row);

    const status = (row.status || '').trim();
    if (!allowedStatus.has(status)) {
      errors.push(
        `Invalid status for ${workId}: "${status}". Allowed: Open, In Progress, Blocked, Done`
      );
    }
  }

  for (const row of rows) {
    const workId = (row.work_id || '').trim();
    if (!workId) continue;

    const dimension = (row.dimension || '').trim().toLowerCase();
    const status = (row.status || '').trim();
    const dependencies = splitDependencies(row.depends_on || '');

    if (dimension !== 'content' || status !== 'Done') {
      continue;
    }

    for (const depId of dependencies) {
      const dep = byId.get(depId);
      if (!dep) {
        errors.push(`${workId} depends_on missing work_id: ${depId}`);
        continue;
      }
      const depDimension = (dep.dimension || '').trim().toLowerCase();
      const depStatus = (dep.status || '').trim();
      if (depDimension !== 'technical') {
        errors.push(
          `${workId} invalid dependency ${depId}: expected technical dimension, got "${dep.dimension}"`
        );
      }
      if (depStatus !== 'Done') {
        errors.push(
          `${workId} cannot be Done: dependency ${depId} is "${depStatus}", expected "Done"`
        );
      }
    }
  }

  return errors;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node scripts/seo/validate-blog-work-items.mjs --file <path-to-csv>');
    process.exit(0);
  }

  const resolved = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`CSV file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const { rows } = parseCsv(raw);
  const errors = validateWorkItems(rows);

  if (errors.length === 0) {
    console.log(`PASS: dependency validation succeeded for ${rows.length} work items.`);
    process.exit(0);
  }

  console.error(`FAIL: found ${errors.length} validation issue(s).`);
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

main();
