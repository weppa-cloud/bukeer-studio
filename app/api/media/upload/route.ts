import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiError,
  apiInternalError,
  apiSuccess,
} from '@/lib/api/response';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MediaApiError,
  buildCanonicalSiteMediaPath,
  enforceUploadRateLimit,
  extractUploadImageMetadata,
  generateAssetMetadata,
  requireMediaRouteAccess,
  upsertMediaAssetRecord,
} from '@/lib/supabase/media';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

// Max width per usage context — withoutEnlargement prevents upscaling
const WEBP_MAX_WIDTH: Record<string, number> = {
  hero: 2400,
  og: 1200,
  featured: 1600,
  gallery: 1600,
  body: 1200,
  avatar: 400,
};

async function convertToWebP(
  bytes: Uint8Array,
  usageContext: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const maxWidth = WEBP_MAX_WIDTH[usageContext] ?? 1200;
  const pipeline = sharp(Buffer.from(bytes))
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 });
  const [buffer, meta] = await Promise.all([pipeline.toBuffer(), sharp(Buffer.from(bytes)).metadata()]);
  // Get actual output dimensions from converted buffer
  const outMeta = await sharp(buffer).metadata();
  return { buffer, width: outMeta.width ?? meta.width ?? 0, height: outMeta.height ?? meta.height ?? 0 };
}

const UploadMetadataSchema = z.object({
  websiteId: z.string().uuid(),
  entityType: z.enum(['blog_post', 'package', 'activity', 'page', 'brand', 'review', 'gallery_item']).default('blog_post'),
  entityId: z.string().uuid().optional(),
  entitySlug: z.string().min(1).max(120).optional(),
  usageContext: z.enum(['featured', 'body', 'hero', 'gallery', 'avatar', 'og']).default('body'),
  destination: z.string().max(120).optional(),
  locale: z.string().min(2).max(12).default('es'),
  alt: z.string().min(1).max(125).optional(),
});


export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return apiError('VALIDATION_ERROR', 'Request must be multipart/form-data', 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return apiError('VALIDATION_ERROR', 'Missing file', 400);
    }

    const metadataParsed = UploadMetadataSchema.safeParse({
      websiteId: formData.get('websiteId'),
      entityType: formData.get('entityType') ?? undefined,
      entityId: formData.get('entityId') ?? undefined,
      entitySlug: formData.get('entitySlug') ?? undefined,
      usageContext: formData.get('usageContext') ?? undefined,
      destination: formData.get('destination') ?? undefined,
      locale: formData.get('locale') ?? undefined,
      alt: formData.get('alt') ?? undefined,
    });

    if (!metadataParsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid upload metadata', 400, metadataParsed.error.issues);
    }

    const metadata = metadataParsed.data;
    const access = await requireMediaRouteAccess(request, metadata.websiteId);
    await enforceUploadRateLimit(access.accountId, metadata.websiteId);

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
      return apiError('VALIDATION_ERROR', 'Unsupported MIME type', 400, {
        mimeType: file.type,
        allowed: Array.from(ALLOWED_UPLOAD_MIME_TYPES),
      });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError('VALIDATION_ERROR', 'File exceeds 5MB limit', 400, {
        bytes: file.size,
        limit: MAX_UPLOAD_BYTES,
      });
    }

    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const isGif = file.type === 'image/gif';

    // Convert non-GIF to WebP; GIF preserved to retain animation
    let uploadBytes: Uint8Array;
    let uploadMime: string;
    let uploadExtension: string;
    let imageDims: { width: number | null; height: number | null };

    if (isGif) {
      uploadBytes = rawBytes;
      uploadMime = file.type;
      uploadExtension = 'gif';
      const raw = extractUploadImageMetadata(file, rawBytes);
      imageDims = { width: raw.widthPx, height: raw.heightPx };
    } else {
      const converted = await convertToWebP(rawBytes, metadata.usageContext);
      uploadBytes = new Uint8Array(converted.buffer);
      uploadMime = 'image/webp';
      uploadExtension = 'webp';
      imageDims = { width: converted.width, height: converted.height };
    }

    const storagePath = buildCanonicalSiteMediaPath({
      accountId: access.accountId,
      websiteId: metadata.websiteId,
      entityType: metadata.entityType,
      entitySlug: metadata.entitySlug,
      usageContext: metadata.usageContext,
      extension: uploadExtension,
    });

    const service = createSupabaseServiceRoleClient();
    const upload = await service.storage
      .from('site-media')
      .upload(storagePath, uploadBytes, {
        contentType: uploadMime,
        upsert: false,
      });

    if (upload.error) {
      return apiError('UPLOAD_FAILED', upload.error.message, 400);
    }

    const { data: publicData } = service.storage.from('site-media').getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;

    const generated = metadata.alt
      ? {
          alt: metadata.alt,
          title: metadata.alt,
          caption: '',
        }
      : await generateAssetMetadata({
          locale: metadata.locale,
          entityType: metadata.entityType,
          usageContext: metadata.usageContext,
          entityName: metadata.entitySlug || file.name,
          destination: metadata.destination,
        });

    const row = await upsertMediaAssetRecord({
      accountId: access.accountId,
      websiteId: metadata.websiteId,
      imageUrl: publicUrl,
      entityType: metadata.entityType,
      entityId: metadata.entityId ?? null,
      usageContext: metadata.usageContext,
      locale: metadata.locale,
      aiGenerated: !metadata.alt,
      metadata: generated,
      httpStatus: 200,
      fileSizeBytes: uploadBytes.byteLength,
      widthPx: imageDims.width,
      heightPx: imageDims.height,
      format: isGif ? 'gif' : 'webp',
    });

    return apiSuccess({
      mediaAssetId: row.id,
      bucket: 'site-media',
      path: storagePath,
      publicUrl,
      mimeType: uploadMime,
      sizeBytes: uploadBytes.byteLength,
      width: imageDims.width,
      height: imageDims.height,
      format: isGif ? 'gif' : 'webp',
      alt: generated.alt,
      title: generated.title,
      caption: generated.caption,
    }, 201);
  } catch (error) {
    if (error instanceof MediaApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    return apiInternalError(error instanceof Error ? error.message : 'Failed to upload media');
  }
}
