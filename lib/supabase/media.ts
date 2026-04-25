import { generateObject } from 'ai';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { buildImageMetadataPrompt } from '@/lib/ai/prompts/image-metadata';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type BatchEntityType = 'all' | 'blog_post' | 'package' | 'activity';
export type MediaEntityType =
  | 'blog_post'
  | 'package'
  | 'activity'
  | 'hotel'
  | 'transfer'
  | 'destination'
  | 'website'
  | 'section'
  | 'page'
  | 'brand'
  | 'review'
  | 'gallery_item';
export type MediaUsageContext = 'featured' | 'body' | 'hero' | 'gallery' | 'avatar' | 'og';

const MAX_BATCH_SIZE = 50;
const MEDIA_ALT_SCHEMA = z.object({
  alt: z.string().min(1).max(125),
  title: z.string().min(1).max(60),
  caption: z.string().max(120).optional().default(''),
});

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface MediaRouteAccess {
  userId: string;
  accountId: string;
  websiteId: string;
  role: string;
}

export interface MediaDiscoveryItem {
  entityType: 'blog_post' | 'package' | 'activity';
  entityId: string;
  entityName: string;
  entitySlug: string;
  usageContext: 'featured';
  imageUrl: string;
  existingFeaturedAlt?: string | null;
}

export interface HealthCheckResult {
  status: number;
  ok: boolean;
  method: 'HEAD' | 'GET' | 'none';
  error?: string;
}

export interface GeneratedAltMetadata {
  alt: string;
  title: string;
  caption: string;
}

export interface UploadImageMetadata {
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  format: 'jpeg' | 'jpg' | 'png' | 'webp' | 'gif' | null;
}

export class MediaApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function slugify(input: string): string {
  const value = (input || '').trim().toLowerCase();
  if (!value) return 'item';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function sanitizePathSegment(value: string, fallback = 'item'): string {
  const sanitized = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || fallback;
}

function normalizeLocale(locale: string | undefined): string {
  return (locale || 'es').trim().toLowerCase().replace('_', '-') || 'es';
}

function localizeText(locale: string, text: string): Record<string, string> {
  return { [normalizeLocale(locale)]: text.trim() };
}

function mapMimeToFormat(mimeType: string): UploadImageMetadata['format'] {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === 'image/jpeg') return 'jpeg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  return null;
}

function hashUrl(url: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;

  for (let index = 0; index < url.length; index += 1) {
    const code = url.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x85ebca6b);
  }

  const partA = (hashA >>> 0).toString(16).padStart(8, '0');
  const partB = (hashB >>> 0).toString(16).padStart(8, '0');
  const partC = (url.length >>> 0).toString(16).padStart(8, '0');
  return `${partA}${partB}${partC}`.slice(0, 24);
}

function decodeStoragePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function parseStorageLocationFromUrl(imageUrl: string): { bucket: string; path: string; publicUrl: string } {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return { bucket: 'external', path: `unknown/${Date.now()}`, publicUrl: imageUrl };
  }

  try {
    const parsed = new URL(trimmed);
    const marker = '/storage/v1/object/public/';
    const index = parsed.pathname.indexOf(marker);

    if (index >= 0) {
      const suffix = parsed.pathname.slice(index + marker.length);
      const [bucket, ...rest] = suffix.split('/');
      const storagePath = decodeStoragePath(rest.join('/'));
      if (bucket && storagePath) {
        return { bucket, path: storagePath, publicUrl: imageUrl };
      }
    }
  } catch {
    // fall through to external
  }

  return {
    bucket: 'external',
    path: `url/${hashUrl(trimmed)}`,
    publicUrl: imageUrl,
  };
}

async function healthFetch(
  imageUrl: string,
  method: 'HEAD' | 'GET',
  timeoutMs = 9000,
): Promise<HealthCheckResult> {
  try {
    const response = await fetch(imageUrl, {
      method,
      redirect: 'follow',
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      status: response.status,
      ok: response.ok,
      method,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      method,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkAssetHealth(imageUrl: string): Promise<HealthCheckResult> {
  const head = await healthFetch(imageUrl, 'HEAD');
  if (head.status === 200) return head;

  // Many CDNs block HEAD, so fallback to tiny GET request.
  if (head.status === 0 || head.status === 403 || head.status === 405 || head.status === 429) {
    const get = await healthFetch(imageUrl, 'GET');
    if (get.status !== 0) return get;
    return {
      status: 0,
      ok: false,
      method: 'none',
      error: get.error || head.error,
    };
  }

  return head;
}

export async function requireMediaRouteAccess(
  request: NextRequest,
  websiteId: string,
): Promise<MediaRouteAccess> {
  if (!websiteId) {
    throw new MediaApiError('VALIDATION_ERROR', 'websiteId is required', 400);
  }

  const bearerAuth = request.headers.get('authorization');
  if (bearerAuth?.startsWith('Bearer ')) {
    const auth = await getEditorAuth(request);
    if (!auth) {
      throw new MediaApiError('UNAUTHORIZED', 'Unauthorized', 401);
    }
    if (!hasEditorRole(auth)) {
      throw new MediaApiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const service = createSupabaseServiceRoleClient();
    const { data: website, error } = await service
      .from('websites')
      .select('id, account_id')
      .eq('id', websiteId)
      .eq('account_id', auth.accountId)
      .single();

    if (error || !website) {
      throw new MediaApiError('FORBIDDEN', 'Website access denied', 403);
    }

    return {
      userId: auth.userId,
      accountId: auth.accountId,
      websiteId,
      role: auth.role,
    };
  }

  try {
    const access = await requireWebsiteAccess(websiteId);
    return {
      userId: access.userId,
      accountId: access.accountId,
      websiteId,
      role: access.role,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const seoError = error as { status: number; code?: string; message?: string };
      throw new MediaApiError(
        seoError.code || 'FORBIDDEN',
        seoError.message || 'Website access denied',
        seoError.status || 403,
      );
    }
    throw new MediaApiError('FORBIDDEN', 'Website access denied', 403);
  }
}

export async function enforceUploadRateLimit(accountId: string, websiteId: string): Promise<void> {
  const rateCheck = await checkRateLimit(`${accountId}:media-upload:${websiteId}`, 'editor');
  if (!rateCheck.allowed) {
    throw new MediaApiError('RATE_LIMITED', rateCheck.reason ?? 'Upload rate limit exceeded', 429);
  }
}

export async function enforceBatchRateLimit(accountId: string, websiteId: string): Promise<void> {
  const rateCheck = await checkRateLimit(`${accountId}:media-batch-alt:${websiteId}`, 'editor');
  if (!rateCheck.allowed) {
    throw new MediaApiError('RATE_LIMITED', rateCheck.reason ?? 'Batch rate limit exceeded', 429);
  }
}

export async function discoverAssetsForBatch(params: {
  accountId: string;
  websiteId: string;
  entityType: BatchEntityType;
  limit: number;
}): Promise<MediaDiscoveryItem[]> {
  const { accountId, websiteId, entityType } = params;
  const limit = Math.min(MAX_BATCH_SIZE, Math.max(1, params.limit));
  const service = createSupabaseServiceRoleClient();
  const items: MediaDiscoveryItem[] = [];

  if (entityType === 'all' || entityType === 'blog_post') {
    const { data, error } = await service
      .from('website_blog_posts')
      .select('id, title, slug, featured_image, featured_alt')
      .eq('website_id', websiteId)
      .not('featured_image', 'is', null)
      .or('featured_alt.is.null,featured_alt.eq.')
      .limit(limit);

    if (error) {
      throw new MediaApiError('INTERNAL_ERROR', 'Failed to discover blog assets', 500, error.message);
    }

    for (const row of data ?? []) {
      if (!row.featured_image) continue;
      items.push({
        entityType: 'blog_post',
        entityId: row.id,
        entityName: row.title || 'Blog post',
        entitySlug: (row.slug || slugify(row.title || row.id)).slice(0, 80),
        usageContext: 'featured',
        imageUrl: row.featured_image,
        existingFeaturedAlt: row.featured_alt,
      });
    }
  }

  if (entityType === 'all' || entityType === 'package') {
    const { data, error } = await service
      .from('package_kits')
      .select('id, name, cover_image_url')
      .eq('account_id', accountId)
      .not('cover_image_url', 'is', null)
      .limit(limit);

    if (error) {
      throw new MediaApiError('INTERNAL_ERROR', 'Failed to discover package assets', 500, error.message);
    }

    for (const row of data ?? []) {
      if (!row.cover_image_url) continue;
      items.push({
        entityType: 'package',
        entityId: row.id,
        entityName: row.name || 'Package',
        entitySlug: slugify(row.name || row.id),
        usageContext: 'featured',
        imageUrl: row.cover_image_url,
      });
    }
  }

  if (entityType === 'all' || entityType === 'activity') {
    const { data, error } = await service
      .from('activities')
      .select('id, name, slug, main_image')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .not('main_image', 'is', null)
      .limit(limit);

    if (error) {
      throw new MediaApiError('INTERNAL_ERROR', 'Failed to discover activity assets', 500, error.message);
    }

    for (const row of data ?? []) {
      if (!row.main_image) continue;
      items.push({
        entityType: 'activity',
        entityId: row.id,
        entityName: row.name || 'Activity',
        entitySlug: (row.slug || slugify(row.name || row.id)).slice(0, 80),
        usageContext: 'featured',
        imageUrl: row.main_image,
      });
    }
  }

  return items.slice(0, limit);
}

export async function generateAssetMetadata(params: {
  locale: string;
  entityType: MediaEntityType;
  usageContext: MediaUsageContext;
  entityName: string;
  destination?: string;
}): Promise<GeneratedAltMetadata> {
  const locale = normalizeLocale(params.locale);
  const prompt = buildImageMetadataPrompt({
    reviewerName: params.entityName || 'Travel image',
    reviewText: `Image for ${params.entityType} in ${params.usageContext} context`,
    agencyName: 'Bukeer',
    locale,
    entityType: params.entityType,
    usageContext: params.usageContext,
    entityName: params.entityName,
    destination: params.destination,
  });

  try {
    const { object } = await generateObject({
      model: getEditorModel(),
      schema: MEDIA_ALT_SCHEMA,
      prompt,
    });
    return {
      alt: object.alt.slice(0, 125),
      title: object.title.slice(0, 60),
      caption: (object.caption || '').slice(0, 120),
    };
  } catch {
    const fallbackName = params.entityName?.trim() || 'Imagen de viaje';
    return {
      alt: `${fallbackName}`.slice(0, 125),
      title: fallbackName.slice(0, 60),
      caption: '',
    };
  }
}

export async function upsertMediaAssetRecord(params: {
  accountId: string;
  websiteId: string;
  imageUrl: string;
  entityType: MediaEntityType;
  entityId: string | null;
  usageContext: MediaUsageContext;
  locale: string;
  aiGenerated: boolean;
  metadata: GeneratedAltMetadata;
  httpStatus: number | null;
  fileSizeBytes?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  format?: UploadImageMetadata['format'];
}): Promise<{ id: string }> {
  const service = createSupabaseServiceRoleClient();
  const location = parseStorageLocationFromUrl(params.imageUrl);
  const now = new Date().toISOString();

  const payload = {
    account_id: params.accountId,
    website_id: params.websiteId,
    storage_bucket: location.bucket,
    storage_path: location.path,
    public_url: location.publicUrl,
    alt: localizeText(params.locale, params.metadata.alt),
    title: localizeText(params.locale, params.metadata.title),
    caption: params.metadata.caption ? localizeText(params.locale, params.metadata.caption) : {},
    entity_type: params.entityType,
    entity_id: params.entityId,
    usage_context: params.usageContext,
    ai_generated: params.aiGenerated,
    ai_model: params.aiGenerated ? (process.env.OPENROUTER_MODEL || 'default') : null,
    http_status: params.httpStatus,
    last_verified_at: now,
    file_size_bytes: params.fileSizeBytes ?? null,
    width_px: params.widthPx ?? null,
    height_px: params.heightPx ?? null,
    format: params.format ?? null,
    updated_at: now,
  };

  const { data, error } = await service
    .from('media_assets')
    .upsert(payload, { onConflict: 'storage_bucket,storage_path' })
    .select('id')
    .single();

  if (error || !data) {
    throw new MediaApiError('INTERNAL_ERROR', 'Failed to persist media asset', 500, error?.message);
  }

  return { id: data.id };
}

export async function updateBlogFeaturedAltIfMissing(params: {
  websiteId: string;
  postId: string;
  existingFeaturedAlt?: string | null;
  alt: string;
}): Promise<void> {
  const current = params.existingFeaturedAlt?.trim();
  if (current) return;

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from('website_blog_posts')
    .update({ featured_alt: params.alt })
    .eq('website_id', params.websiteId)
    .eq('id', params.postId)
    .or('featured_alt.is.null,featured_alt.eq.');

  if (error) {
    throw new MediaApiError('INTERNAL_ERROR', 'Failed to backfill featured_alt', 500, error.message);
  }
}

export async function createMediaAltJob(params: {
  accountId: string;
  websiteId: string;
  requestedBy: string;
  entityType: BatchEntityType;
  locales: string[];
  dryRun: boolean;
  limit: number;
}) {
  const service = createSupabaseServiceRoleClient();
  const payload = {
    account_id: params.accountId,
    website_id: params.websiteId,
    requested_by: params.requestedBy,
    entity_type: params.entityType,
    locales: params.locales,
    dry_run: params.dryRun,
    limit_count: Math.min(MAX_BATCH_SIZE, Math.max(1, params.limit)),
    status: 'running',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await service
    .from('media_alt_jobs')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new MediaApiError('INTERNAL_ERROR', 'Unable to create media job', 500, error?.message);
  }
  return data;
}

export async function updateMediaAltJob(params: {
  jobId: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  total?: number;
  processed?: number;
  failed?: number;
  errors?: Array<{ entityId: string; entityType: string; message: string }>;
  brokenUrls?: string[];
}) {
  const service = createSupabaseServiceRoleClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.status) payload.status = params.status;
  if (params.total !== undefined) payload.total = params.total;
  if (params.processed !== undefined) payload.processed = params.processed;
  if (params.failed !== undefined) payload.failed = params.failed;
  if (params.errors !== undefined) payload.errors = params.errors;
  if (params.brokenUrls !== undefined) payload.broken_urls = params.brokenUrls;
  if (params.status === 'completed' || params.status === 'failed') {
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await service
    .from('media_alt_jobs')
    .update(payload)
    .eq('id', params.jobId);

  if (error) {
    throw new MediaApiError('INTERNAL_ERROR', 'Unable to update media job', 500, error.message);
  }
}

export async function getMediaAltJobById(jobId: string) {
  const service = createSupabaseServiceRoleClient();
  const { data, error } = await service
    .from('media_alt_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new MediaApiError('NOT_FOUND', 'Job not found', 404);
  }
  return data;
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < pngSignature.length; i += 1) {
    if (bytes[i] !== pngSignature[i]) return null;
  }
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function parseGifDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10) return null;
  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width > 0 && height > 0) {
        return { width, height };
      }
      return null;
    }
    offset += 2 + size;
  }
  return null;
}

function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== 'RIFF' || webp !== 'WEBP') return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
    if (chunkType === 'VP8X' && offset + 18 <= bytes.length) {
      const width = 1 + (bytes[offset + 12] | (bytes[offset + 13] << 8) | (bytes[offset + 14] << 16));
      const height = 1 + (bytes[offset + 15] | (bytes[offset + 16] << 8) | (bytes[offset + 17] << 16));
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    const padded = chunkSize + (chunkSize % 2);
    offset += 8 + padded;
  }
  return null;
}

export function extractUploadImageMetadata(file: File, fileBytes: Uint8Array): UploadImageMetadata {
  const format = mapMimeToFormat(file.type);
  let dimensions: { width: number; height: number } | null = null;

  if (format === 'png') dimensions = parsePngDimensions(fileBytes);
  else if (format === 'gif') dimensions = parseGifDimensions(fileBytes);
  else if (format === 'jpeg' || format === 'jpg') dimensions = parseJpegDimensions(fileBytes);
  else if (format === 'webp') dimensions = parseWebpDimensions(fileBytes);

  return {
    sizeBytes: file.size,
    widthPx: dimensions?.width ?? null,
    heightPx: dimensions?.height ?? null,
    format,
  };
}

export function buildCanonicalSiteMediaPath(params: {
  accountId: string;
  websiteId: string;
  entityType: MediaEntityType;
  entitySlug?: string;
  usageContext: MediaUsageContext;
  extension: string;
}): string {
  const timestamp = Date.now();
  const safeExt = params.extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeEntitySlug = slugify(params.entitySlug || 'asset');
  return [
    sanitizePathSegment(params.accountId, 'account'),
    sanitizePathSegment(params.websiteId, 'website'),
    sanitizePathSegment(params.entityType, 'entity'),
    safeEntitySlug,
    `${slugify(params.usageContext)}-${timestamp}.${safeExt}`,
  ].join('/');
}

export function normalizeBatchLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return 50;
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(limit)));
}
