/**
 * Direct batch-alt runner for colombiatours.travel
 * Bypasses HTTP auth by calling Supabase + AI SDK directly.
 * Usage: node scripts/run-batch-alt.mjs [--dry-run] [--entity-type blog_post]
 */
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
dotenv.config({ path: join(rootDir, '.env.local') });

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const LIMIT_PER_ROUND = 50;
const LOCALE = 'es';
const DRY_RUN = process.argv.includes('--dry-run');
const ENTITY_TYPE = process.argv.includes('--entity-type')
  ? process.argv[process.argv.indexOf('--entity-type') + 1]
  : 'blog_post';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openrouterUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const openrouterKey = process.env.OPENROUTER_AUTH_TOKEN || '';
const modelId = process.env.OPENROUTER_MODEL || 'mistralai/mistral-large';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const openrouter = createOpenAI({
  baseURL: openrouterUrl,
  apiKey: openrouterKey,
  headers: {
    'HTTP-Referer': 'https://app.bukeer.com',
    'X-Title': 'Bukeer Website Editor',
  },
});

const MEDIA_ALT_SCHEMA = z.object({
  alt: z.string().min(1).max(125),
  title: z.string().min(1).max(60),
  caption: z.string().max(120).optional().default(''),
});

function slugify(input) {
  return (input || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function hashUrl(url) {
  return createHash('sha1').update(url).digest('hex').slice(0, 24);
}

function parseStorageLocation(imageUrl) {
  const trimmed = (imageUrl || '').trim();
  if (!trimmed) return { bucket: 'external', path: `unknown/${Date.now()}`, publicUrl: imageUrl };
  try {
    const parsed = new URL(trimmed);
    const marker = '/storage/v1/object/public/';
    const index = parsed.pathname.indexOf(marker);
    if (index >= 0) {
      const suffix = parsed.pathname.slice(index + marker.length);
      const [bucket, ...rest] = suffix.split('/');
      const storagePath = decodeURIComponent(rest.join('/'));
      if (bucket && storagePath) return { bucket, path: storagePath, publicUrl: imageUrl };
    }
  } catch {}
  return { bucket: 'external', path: `url/${hashUrl(trimmed)}`, publicUrl: imageUrl };
}

async function healthFetch(imageUrl, method, timeoutMs = 9000) {
  try {
    const response = await fetch(imageUrl, {
      method,
      redirect: 'follow',
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: response.status, ok: response.ok, method };
  } catch (error) {
    return { status: 0, ok: false, method, error: error instanceof Error ? error.message : String(error) };
  }
}

async function checkAssetHealth(imageUrl) {
  const head = await healthFetch(imageUrl, 'HEAD');
  if (head.status === 200) return head;
  if (head.status === 0 || head.status === 403 || head.status === 405 || head.status === 429) {
    const get = await healthFetch(imageUrl, 'GET');
    if (get.status !== 0) return get;
    return { status: 0, ok: false, method: 'none', error: get.error || head.error };
  }
  return head;
}

async function generateAssetMetadata(entityName, entityType, locale) {
  const lang = locale.startsWith('en') ? 'English' : locale.startsWith('pt') ? 'Portuguese' : 'Spanish';
  const prompt = `You are an SEO specialist for a travel agency. Generate metadata for a travel image.

Context: Entity type: ${entityType}, Usage context: featured, Entity name: ${entityName}, Agency: Bukeer
Output language: ${lang}

Generate a JSON object:
- alt: SEO-optimized alt text (max 125 chars)
- title: Short image title (max 60 chars)
- caption: Brief display caption (max 80 chars)

Return ONLY valid JSON:
{"alt":"...","title":"...","caption":"..."}`;

  try {
    const { object } = await generateObject({
      model: openrouter.chat(modelId),
      schema: MEDIA_ALT_SCHEMA,
      prompt,
    });
    return {
      alt: object.alt.slice(0, 125),
      title: object.title.slice(0, 60),
      caption: (object.caption || '').slice(0, 120),
    };
  } catch (err) {
    const fallbackName = (entityName || 'Imagen de viaje').trim();
    console.warn(`  [WARN] AI generation failed for "${entityName}": ${err.message} — using fallback`);
    return { alt: fallbackName.slice(0, 125), title: fallbackName.slice(0, 60), caption: '' };
  }
}

async function discoverBlogAssets(websiteId, limit) {
  const { data, error } = await service
    .from('website_blog_posts')
    .select('id, title, slug, featured_image, featured_alt')
    .eq('website_id', websiteId)
    .not('featured_image', 'is', null)
    .or('featured_alt.is.null,featured_alt.eq.')
    .limit(limit);

  if (error) throw new Error(`Failed to discover blog assets: ${error.message}`);

  return (data || []).filter(r => r.featured_image).map(r => ({
    entityType: 'blog_post',
    entityId: r.id,
    entityName: r.title || 'Blog post',
    imageUrl: r.featured_image,
    existingFeaturedAlt: r.featured_alt,
  }));
}

async function countRemainingBlogPosts(websiteId) {
  const { count, error } = await service
    .from('website_blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', websiteId)
    .not('featured_image', 'is', null)
    .or('featured_alt.is.null,featured_alt.eq.');
  if (error) return null;
  return count;
}

async function upsertMediaAsset(accountId, websiteId, item, metadata, httpStatus) {
  const location = parseStorageLocation(item.imageUrl);
  const now = new Date().toISOString();
  const payload = {
    account_id: accountId,
    website_id: websiteId,
    storage_bucket: location.bucket,
    storage_path: location.path,
    public_url: location.publicUrl,
    alt: { [LOCALE]: metadata.alt.trim() },
    title: { [LOCALE]: metadata.title.trim() },
    caption: metadata.caption ? { [LOCALE]: metadata.caption.trim() } : {},
    entity_type: item.entityType,
    entity_id: item.entityId,
    usage_context: 'featured',
    ai_generated: httpStatus === 200,
    ai_model: httpStatus === 200 ? (modelId) : null,
    http_status: httpStatus,
    last_verified_at: now,
    updated_at: now,
  };

  const { error } = await service
    .from('media_assets')
    .upsert(payload, { onConflict: 'storage_bucket,storage_path' });

  if (error) throw new Error(`Failed to upsert media asset: ${error.message}`);
}

async function backfillFeaturedAlt(websiteId, postId, existingAlt, alt) {
  const current = (existingAlt || '').trim();
  if (current) return;
  const { error } = await service
    .from('website_blog_posts')
    .update({ featured_alt: alt })
    .eq('website_id', websiteId)
    .eq('id', postId)
    .or('featured_alt.is.null,featured_alt.eq.');
  if (error) throw new Error(`Failed to backfill featured_alt: ${error.message}`);
}

async function getAccountId(websiteId) {
  const { data, error } = await service
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();
  if (error || !data) throw new Error(`Website not found: ${error?.message}`);
  return data.account_id;
}

async function getFirstUserId(accountId) {
  const { data, error } = await service
    .from('user_roles')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (error || !data) throw new Error(`No active user found for account: ${error?.message}`);
  return data.user_id;
}

async function createJob(accountId, websiteId, dryRun, limit) {
  const requestedBy = await getFirstUserId(accountId);
  const { data, error } = await service
    .from('media_alt_jobs')
    .insert({
      account_id: accountId,
      website_id: websiteId,
      requested_by: requestedBy, // system run via script
      entity_type: ENTITY_TYPE,
      locales: [LOCALE],
      dry_run: dryRun,
      limit_count: limit,
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Failed to create job: ${error?.message}`);
  return data.id;
}

async function completeJob(jobId, total, processed, failed, brokenUrls, errors) {
  await service.from('media_alt_jobs').update({
    status: 'completed',
    total,
    processed,
    failed,
    errors,
    broken_urls: brokenUrls,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', jobId);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Bukeer Media Batch-Alt Pipeline ===`);
  console.log(`Website: ${WEBSITE_ID}`);
  console.log(`Entity type: ${ENTITY_TYPE}`);
  console.log(`Locale: ${LOCALE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Model: ${modelId}`);
  console.log(`\n`);

  const accountId = await getAccountId(WEBSITE_ID);
  console.log(`Account ID: ${accountId}`);

  // Phase 1: dry-run
  console.log(`\n--- Phase 1: Dry run (limit ${LIMIT_PER_ROUND}) ---`);
  const dryItems = await discoverBlogAssets(WEBSITE_ID, LIMIT_PER_ROUND);
  console.log(`Discovered ${dryItems.length} assets (dry run sample)`);
  if (dryItems.length === 0) {
    console.log('No assets found. All blog posts already have alt text or no featured images.');
    process.exit(0);
  }

  const remainingBefore = await countRemainingBlogPosts(WEBSITE_ID);
  console.log(`Total remaining blog posts without alt: ${remainingBefore}`);

  if (DRY_RUN) {
    console.log('\nDry run mode — not writing to DB. Sample:');
    dryItems.slice(0, 3).forEach((item, i) =>
      console.log(`  ${i + 1}. [${item.entityType}] ${item.entityName} — ${item.imageUrl.slice(0, 60)}...`)
    );
    process.exit(0);
  }

  // Phase 2: real rounds
  let roundNum = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  const allBrokenUrls = [];
  const allErrors = [];
  const jobIds = [];

  while (true) {
    const remaining = await countRemainingBlogPosts(WEBSITE_ID);
    console.log(`\n--- Round ${++roundNum} (remaining: ${remaining}) ---`);
    if (remaining === 0) {
      console.log('All blog posts processed!');
      break;
    }

    const items = await discoverBlogAssets(WEBSITE_ID, LIMIT_PER_ROUND);
    if (items.length === 0) {
      console.log('No more items discovered.');
      break;
    }

    const jobId = await createJob(accountId, WEBSITE_ID, false, items.length);
    jobIds.push(jobId);
    console.log(`Job ID: ${jobId} | Processing ${items.length} assets...`);

    let roundProcessed = 0, roundFailed = 0;
    const roundBroken = [], roundErrors = [];

    for (const item of items) {
      try {
        const health = await checkAssetHealth(item.imageUrl);
        const isBroken = health.status !== 200;

        if (isBroken) {
          roundFailed++;
          allBrokenUrls.push(item.imageUrl);
          roundBroken.push(item.imageUrl);
          console.log(`  [BROKEN ${health.status}] ${item.entityName}`);
        }

        const metadata = isBroken
          ? { alt: item.entityName, title: item.entityName, caption: '' }
          : await generateAssetMetadata(item.entityName, item.entityType, LOCALE);

        await upsertMediaAsset(accountId, WEBSITE_ID, item, metadata, health.status || null);

        // Always backfill featured_alt (even for broken) so it doesn't recycle
        if (item.entityType === 'blog_post') {
          await backfillFeaturedAlt(WEBSITE_ID, item.entityId, item.existingFeaturedAlt, metadata.alt);
        }

        if (!isBroken) {
          console.log(`  [OK] ${item.entityName} → "${metadata.alt.slice(0, 60)}..."`);
        }
      } catch (err) {
        roundFailed++;
        allErrors.push({ entityId: item.entityId, entityType: item.entityType, message: err.message });
        roundErrors.push({ entityId: item.entityId, entityType: item.entityType, message: err.message });
        console.error(`  [ERROR] ${item.entityName}: ${err.message}`);
      } finally {
        roundProcessed++;
      }
    }

    totalProcessed += roundProcessed;
    totalFailed += roundFailed;

    await completeJob(jobId, items.length, roundProcessed, roundFailed, roundBroken, roundErrors);
    console.log(`Round ${roundNum} done: ${roundProcessed} processed, ${roundFailed} failed`);

    // Safety: max 20 rounds to avoid infinite loops
    if (roundNum >= 20) {
      console.log('Max rounds reached (20). Stopping.');
      break;
    }
  }

  // Final summary
  const remainingAfter = await countRemainingBlogPosts(WEBSITE_ID);
  const uniqueBrokenUrls = [...new Set(allBrokenUrls)];
  console.log(`\n=== PIPELINE COMPLETE ===`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`Broken URLs (unique): ${uniqueBrokenUrls.length}`);
  console.log(`Remaining (no alt): ${remainingAfter}`);
  console.log(`Job IDs: ${jobIds.join(', ')}`);

  if (uniqueBrokenUrls.length > 0) {
    console.log(`\nBroken URLs:`);
    uniqueBrokenUrls.forEach(u => console.log(`  - ${u}`));
  }

  if (allErrors.length > 0) {
    console.log(`\nErrors:`);
    allErrors.forEach(e => console.log(`  - [${e.entityType}] ${e.entityId}: ${e.message}`));
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
