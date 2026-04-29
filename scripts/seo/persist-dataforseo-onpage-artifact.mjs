#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const artifactDir = args.artifactDir;
const taskId = args.taskId;
const tag = args.tag ?? null;

if (!artifactDir || !taskId) {
  console.error('Usage: node scripts/seo/persist-dataforseo-onpage-artifact.mjs --artifactDir <dir> --taskId <id> [--tag <tag>]');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const persisted = [];
  const taskPost = await readJsonIfExists(path.join(artifactDir, 'task-post-response.json'));
  const summary = await readJsonIfExists(path.join(artifactDir, 'summary-latest.json'));
  const pages = await readJsonIfExists(path.join(artifactDir, 'pages-all.json'));

  if (taskPost) {
    await persist('/v3/on_page/task_post', `epic310-onpage|${taskId}|task-post-response`, taskPost, taskPost.tasks?.[0]?.cost ?? 0, {
      status: taskPost.tasks?.[0]?.status_message ?? null,
    });
    persisted.push('task-post-response');
  }

  if (summary) {
    const result = summary.tasks?.[0]?.result?.[0] ?? {};
    await persist('/v3/on_page/summary', `epic310-onpage|${taskId}|summary-latest`, summary, summary.tasks?.[0]?.cost ?? 0, {
      crawl_progress: result.crawl_progress ?? null,
      crawl_status: result.crawl_status ?? null,
    });
    persisted.push('summary-latest');
  }

  if (Array.isArray(pages)) {
    await persist('/v3/on_page/pages', `epic310-onpage|${taskId}|pages-all`, pages, 0, {
      row_count: pages.length,
    });
    persisted.push('pages-all');
  }

  console.log(JSON.stringify({ taskId, artifactDir, persisted }, null, 2));
}

async function persist(endpoint, cacheKey, payload, cost, metadata) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const cacheTag = `growth:dataforseo:website:${websiteId}:onpage`;
  const { error: cacheError } = await sb.from('growth_dataforseo_cache').upsert(
    {
      account_id: accountId,
      website_id: websiteId,
      endpoint,
      cache_key: cacheKey,
      cache_tag: cacheTag,
      payload,
      fetched_at: now,
      expires_at: expiresAt,
    },
    { onConflict: 'website_id,endpoint,cache_key' },
  );
  if (cacheError) throw new Error(`growth_dataforseo_cache upsert failed: ${cacheError.message}`);

  const billingMonth = `${now.slice(0, 7)}-01`;
  const { data: existing, error: readError } = await sb
    .from('seo_provider_usage')
    .select('request_count,total_cost_usd,metadata,first_called_at')
    .eq('website_id', websiteId)
    .eq('provider', 'dataforseo')
    .eq('endpoint', endpoint)
    .eq('billing_month', billingMonth)
    .maybeSingle();
  if (readError) throw new Error(`seo_provider_usage read failed: ${readError.message}`);

  const { error: usageError } = await sb.from('seo_provider_usage').upsert(
    {
      website_id: websiteId,
      provider: 'dataforseo',
      endpoint,
      billing_month: billingMonth,
      request_count: Number(existing?.request_count ?? 0) + 1,
      total_cost_usd: Number(existing?.total_cost_usd ?? 0) + Number(cost ?? 0),
      metadata: {
        ...(existing?.metadata ?? {}),
        epic: 310,
        profile: 'dfs_onpage_full_v2',
        task_id: taskId,
        tag,
        last_cache_key: cacheKey,
        last_artifact_dir: artifactDir,
        ...metadata,
      },
      first_called_at: existing?.first_called_at ?? now,
      last_called_at: now,
      updated_at: now,
    },
    { onConflict: 'website_id,provider,endpoint,billing_month' },
  );
  if (usageError) throw new Error(`seo_provider_usage upsert failed: ${usageError.message}`);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
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
