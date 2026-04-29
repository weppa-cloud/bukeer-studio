#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_RUN_ID = '04290125-1574-0216-0000-00a1195b1ba0';
const OUT_DIR = 'artifacts/seo/2026-04-29-growth-audit-diff';

const args = parseArgs(process.argv.slice(2));
const currentRun = args.current ?? DEFAULT_RUN_ID;
const previousRun = args.previous ?? currentRun;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const supportsFindingRunColumns = await supportsColumns('seo_audit_findings', [
    'crawl_task_id',
    'finding_fingerprint',
  ]);
  const current = await loadRun(currentRun, supportsFindingRunColumns);
  const previous = await loadRun(previousRun, supportsFindingRunColumns);
  const diff = compare(current, previous);
  const report = {
    generated_at: new Date().toISOString(),
    website_id: WEBSITE_ID,
    current_run: currentRun,
    previous_run: previousRun,
    identity_source: supportsFindingRunColumns
      ? 'physical columns preferred; evidence fallback enabled'
      : 'evidence fallback only',
    counts: {
      current: current.size,
      previous: previous.size,
      new: diff.new.length,
      open: diff.open.length,
      resolved: diff.resolved.length,
      regressed: diff.regressed.length,
      watch: diff.watch.length,
    },
    samples: {
      new: diff.new.slice(0, 20),
      open: diff.open.slice(0, 20),
      resolved: diff.resolved.slice(0, 20),
      watch: diff.watch.slice(0, 20),
    },
  };
  await fs.writeFile(path.join(OUT_DIR, 'growth-audit-diff.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'growth-audit-diff.md'), toMarkdown(report));
  console.log(JSON.stringify(report.counts, null, 2));
}

async function loadRun(runId, supportsFindingRunColumns) {
  const columns = [
    'public_url',
    'finding_type',
    'severity',
    'status',
    'evidence',
    'source',
    ...(supportsFindingRunColumns ? ['crawl_task_id', 'finding_fingerprint'] : []),
  ];
  const { data, error } = await sb
    .from('seo_audit_findings')
    .select(columns.join(','))
    .eq('website_id', WEBSITE_ID)
    .eq('source', 'dataforseo:on_page')
    .limit(5000);
  if (error) throw new Error(error.message);
  const map = new Map();
  for (const row of data ?? []) {
    const evidence = row.evidence ?? {};
    const crawlTaskId = supportsFindingRunColumns
      ? row.crawl_task_id ?? evidence.crawl_task_id
      : evidence.crawl_task_id;
    if (crawlTaskId !== runId) continue;
    const fingerprint = supportsFindingRunColumns
      ? row.finding_fingerprint ?? evidence.finding_fingerprint ?? `${row.public_url}|${row.finding_type}|${row.source}`
      : evidence.finding_fingerprint ?? `${row.public_url}|${row.finding_type}|${row.source}`;
    map.set(fingerprint, {
      url: row.public_url,
      finding_type: row.finding_type,
      severity: row.severity,
      status: row.status,
      identity_source:
        supportsFindingRunColumns && row.crawl_task_id && row.finding_fingerprint
          ? 'columns'
          : 'evidence',
    });
  }
  return map;
}

async function supportsColumns(table, columns) {
  const { error } = await sb.from(table).select(columns.join(',')).limit(1);
  return !error;
}

function compare(current, previous) {
  const out = { new: [], open: [], resolved: [], regressed: [], watch: [] };
  for (const [key, value] of current.entries()) {
    if (value.severity === 'info') out.watch.push(value);
    if (previous.has(key)) out.open.push(value);
    else out.new.push(value);
  }
  for (const [key, value] of previous.entries()) {
    if (!current.has(key)) out.resolved.push(value);
  }
  return out;
}

function toMarkdown(report) {
  return `# Growth Audit Diff

Generated: ${report.generated_at}

| Field | Value |
|---|---|
| Current run | ${report.current_run} |
| Previous run | ${report.previous_run} |
| Identity source | ${report.identity_source} |
| Current findings | ${report.counts.current} |
| Previous findings | ${report.counts.previous} |
| New | ${report.counts.new} |
| Open | ${report.counts.open} |
| Resolved | ${report.counts.resolved} |
| Regressed | ${report.counts.regressed} |
| Watch | ${report.counts.watch} |

Note: with only one real normalized run, current-vs-current is the fixture baseline.
The next DataForSEO run should use this same script with a different previous run id.
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) i += 1;
  }
  return parsed;
}
