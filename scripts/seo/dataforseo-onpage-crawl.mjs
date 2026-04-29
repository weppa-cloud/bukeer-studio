#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'https://api.dataforseo.com/v3';
const DEFAULT_TARGET = 'colombiatours.travel';
const DEFAULT_START_URL = 'https://colombiatours.travel/';
const DEFAULT_MAX_PAGES = 1000;
const DEFAULT_OUT_DIR = path.join('artifacts', 'seo', `${todayIso()}-dataforseo-onpage`);
const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';

const args = parseArgs(process.argv.slice(2));
const target = args.target ?? DEFAULT_TARGET;
const startUrl = args.startUrl ?? DEFAULT_START_URL;
const maxCrawlPages = Number.parseInt(args.maxCrawlPages ?? String(DEFAULT_MAX_PAGES), 10);
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const poll = args.poll !== 'false';
const pollSeconds = Number.parseInt(args.pollSeconds ?? '30', 10);
const maxWaitSeconds = Number.parseInt(args.maxWaitSeconds ?? '900', 10);
const respectSitemap = parseBooleanArg(args.respectSitemap, true);
const loadResources = parseBooleanArg(args.loadResources, false);
const enableJavascript = parseBooleanArg(args.enableJavascript, false);
const enableBrowserRendering = parseBooleanArg(args.enableBrowserRendering, false);
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const persist = args.persist !== 'false';

const login = process.env.DATAFORSEO_LOGIN?.trim();
const password = process.env.DATAFORSEO_PASSWORD?.trim();

if (!login || !password) {
  console.error('Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD');
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outDir, { recursive: true });

  if (args.taskId) {
    await pollExistingTask(args.taskId, outDir);
    return;
  }

  const tag = args.tag ?? `post-cutover-basic-${Date.now()}`;
  const taskPayload = [{
    target,
    start_url: startUrl,
    max_crawl_pages: maxCrawlPages,
    respect_sitemap: respectSitemap,
    load_resources: loadResources,
    enable_javascript: enableJavascript,
    enable_browser_rendering: enableBrowserRendering,
    return_despite_timeout: true,
    tag,
  }];

  const taskResponse = await dataForSeoPost('/on_page/task_post', taskPayload);
  await writeFile(path.join(outDir, 'task-post-response.json'), JSON.stringify(redactResponse(taskResponse), null, 2));

  const task = taskResponse.tasks?.[0];
  const taskId = task?.id;
  if (!taskId) {
    throw new Error(`DataForSEO did not return a task id: ${JSON.stringify(taskResponse)}`);
  }

  console.log(`DataForSEO OnPage task submitted: ${taskId}`);
  console.log(`Tag: ${tag}`);
  console.log(`Output: ${outDir}`);
  await persistDataForSeoPayload('/v3/on_page/task_post', `epic310-onpage|${taskId}|task-post-response`, taskResponse, taskId, tag, task?.cost ?? 0);

  if (!poll) return;

  const started = Date.now();
  let summaryResponse;
  while (Date.now() - started < maxWaitSeconds * 1000) {
    await sleep(pollSeconds * 1000);
    summaryResponse = await dataForSeoGet(`/on_page/summary/${taskId}`);
    await writeFile(path.join(outDir, 'summary-latest.json'), JSON.stringify(redactResponse(summaryResponse), null, 2));

    const summary = extractSummary(summaryResponse);
    await persistDataForSeoPayload('/v3/on_page/summary', `epic310-onpage|${taskId}|summary-latest`, summaryResponse, taskId, tag, summary.cost ?? 0);
    console.log(`[poll] progress=${summary.crawlProgress} crawled=${summary.pagesCrawled} queue=${summary.pagesInQueue} cost=${summary.cost ?? 'n/a'}`);
    if (summary.crawlProgress === 'finished') {
      await fetchPages(taskId, outDir);
      await writeFile(path.join(outDir, 'summary.md'), toMarkdown(summaryResponse, taskId, taskPayload[0]));
      return;
    }
  }

  console.log(`Task still running after ${maxWaitSeconds}s. Latest summary written to ${path.join(outDir, 'summary-latest.json')}`);
}

async function pollExistingTask(taskId, outputDir) {
  const summaryResponse = await dataForSeoGet(`/on_page/summary/${taskId}`);
  await writeFile(path.join(outputDir, 'summary-latest.json'), JSON.stringify(redactResponse(summaryResponse), null, 2));

  const summary = extractSummary(summaryResponse);
  await persistDataForSeoPayload('/v3/on_page/summary', `epic310-onpage|${taskId}|summary-latest`, summaryResponse, taskId, args.tag ?? null, summary.cost ?? 0);
  console.log(`[summary] progress=${summary.crawlProgress} crawled=${summary.pagesCrawled} queue=${summary.pagesInQueue} cost=${summary.cost ?? 'n/a'}`);
  if (summary.crawlProgress === 'finished' || args.fetchPages === 'true') {
    await fetchPages(taskId, outputDir);
    await writeFile(path.join(outputDir, 'summary.md'), toMarkdown(summaryResponse, taskId, { target, start_url: startUrl, max_crawl_pages: maxCrawlPages, respect_sitemap: 'n/a', load_resources: 'n/a', enable_javascript: 'n/a', enable_browser_rendering: 'n/a' }));
  }
}

async function fetchPages(taskId, outputDir) {
  const allItems = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const response = await dataForSeoPost('/on_page/pages', [{ id: taskId, limit, offset }]);
    await writeFile(path.join(outputDir, `pages-${offset}.json`), JSON.stringify(redactResponse(response), null, 2));
    const result = response.tasks?.[0]?.result?.[0];
    const items = result?.items ?? [];
    allItems.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  await writeFile(path.join(outputDir, 'pages-all.json'), JSON.stringify(allItems, null, 2));
  await writeFile(path.join(outputDir, 'pages-summary.csv'), pagesToCsv(allItems));
  await persistDataForSeoPayload('/v3/on_page/pages', `epic310-onpage|${taskId}|pages-all`, allItems, taskId, args.tag ?? null, 0, { row_count: allItems.length });
}

async function dataForSeoPost(endpoint, body) {
  return dataForSeoFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function dataForSeoGet(endpoint) {
  return dataForSeoFetch(endpoint, { method: 'GET' });
}

async function dataForSeoFetch(endpoint, options) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'content-type': 'application/json',
    },
  });
  const json = await response.json();
  if (!response.ok || json.status_code >= 30000) {
    throw new Error(`DataForSEO API error ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function extractSummary(summaryResponse) {
  const task = summaryResponse.tasks?.[0];
  const result = task?.result?.[0] ?? {};
  const crawlStatus = result.crawl_status ?? {};
  return {
    cost: task?.cost,
    crawlProgress: result.crawl_progress,
    pagesCrawled: crawlStatus.pages_crawled,
    pagesInQueue: crawlStatus.pages_in_queue,
    maxCrawlPages: crawlStatus.max_crawl_pages,
    checks: result.checks ?? {},
  };
}

function toMarkdown(summaryResponse, taskId, taskPayload) {
  const summary = extractSummary(summaryResponse);
  const checks = Object.entries(summary.checks)
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([check, value]) => `| ${check} | ${value} |`)
    .join('\n') || '| none | 0 |';

  return `# DataForSEO OnPage Crawl

| Field | Value |
|---|---|
| Task ID | ${taskId} |
| Target | ${taskPayload.target} |
| Start URL | ${taskPayload.start_url} |
| Max crawl pages | ${taskPayload.max_crawl_pages} |
| Respect sitemap | ${taskPayload.respect_sitemap} |
| Load resources | ${taskPayload.load_resources} |
| Enable JavaScript | ${taskPayload.enable_javascript} |
| Browser rendering | ${taskPayload.enable_browser_rendering} |
| Crawl progress | ${summary.crawlProgress} |
| Pages crawled | ${summary.pagesCrawled} |
| Pages in queue | ${summary.pagesInQueue} |
| Cost USD | ${summary.cost ?? 'n/a'} |

## Checks

| Check | Count |
|---|---:|
${checks}
`;
}

function pagesToCsv(items) {
  const headers = [
    'url',
    'status_code',
    'resource_type',
    'title',
    'description',
    'canonical',
    'is_broken',
    'is_4xx_code',
    'is_5xx_code',
    'no_title',
    'duplicate_title',
    'no_description',
    'duplicate_description',
  ];
  return [
    headers.join(','),
    ...items.map((item) => {
      const meta = item.meta ?? {};
      const checks = item.checks ?? {};
      const row = {
        url: item.url,
        status_code: item.status_code,
        resource_type: item.resource_type,
        title: meta.title,
        description: meta.description,
        canonical: meta.canonical,
        is_broken: checks.is_broken,
        is_4xx_code: checks.is_4xx_code,
        is_5xx_code: checks.is_5xx_code,
        no_title: checks.no_title,
        duplicate_title: checks.duplicate_title,
        no_description: checks.no_description,
        duplicate_description: checks.duplicate_description,
      };
      return headers.map((header) => csvCell(row[header])).join(',');
    }),
  ].join('\n');
}

function redactResponse(value) {
  return value;
}

async function persistDataForSeoPayload(endpoint, cacheKey, payload, taskId, tag, cost = 0, extraMetadata = {}) {
  if (!persist) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return;

  const now = new Date().toISOString();
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cacheTag = `growth:dataforseo:website:${websiteId}:onpage`;
  const { error: cacheError } = await admin.from('growth_dataforseo_cache').upsert(
    {
      account_id: accountId,
      website_id: websiteId,
      endpoint,
      cache_key: cacheKey,
      cache_tag: cacheTag,
      payload,
      fetched_at: now,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'website_id,endpoint,cache_key' },
  );
  if (cacheError) {
    console.warn(`[persist] growth_dataforseo_cache failed: ${cacheError.message}`);
  }

  const billingMonth = `${now.slice(0, 7)}-01`;
  const { data: existing, error: existingError } = await admin
    .from('seo_provider_usage')
    .select('request_count,total_cost_usd,metadata')
    .eq('website_id', websiteId)
    .eq('provider', 'dataforseo')
    .eq('endpoint', endpoint)
    .eq('billing_month', billingMonth)
    .maybeSingle();
  if (existingError) {
    console.warn(`[persist] seo_provider_usage read failed: ${existingError.message}`);
    return;
  }

  const metadata = {
    ...(existing?.metadata ?? {}),
    epic: 310,
    profile: 'dfs_onpage_full_v2',
    task_id: taskId,
    tag,
    last_cache_key: cacheKey,
    last_artifact_dir: outDir,
    ...extraMetadata,
  };
  const usageRow = {
    website_id: websiteId,
    provider: 'dataforseo',
    endpoint,
    billing_month: billingMonth,
    request_count: Number(existing?.request_count ?? 0) + 1,
    total_cost_usd: Number(existing?.total_cost_usd ?? 0) + Number(cost ?? 0),
    metadata,
    first_called_at: existing ? undefined : now,
    last_called_at: now,
    updated_at: now,
  };
  Object.keys(usageRow).forEach((key) => usageRow[key] === undefined && delete usageRow[key]);
  const { error: usageError } = await admin.from('seo_provider_usage').upsert(
    usageRow,
    { onConflict: 'website_id,provider,endpoint,billing_month' },
  );
  if (usageError) {
    console.warn(`[persist] seo_provider_usage failed: ${usageError.message}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function parseBooleanArg(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function csvCell(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
