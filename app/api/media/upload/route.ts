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

function getFileExtension(fileName: string, mimeType: string): string {
  const nameExt = fileName.includes('.') ? fileName.split('.').pop() : undefined;
  if (nameExt && /^[a-z0-9]+$/i.test(nameExt)) return nameExt.toLowerCase();

  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

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

    const extension = getFileExtension(file.name, file.type);
    const storagePath = buildCanonicalSiteMediaPath({
      accountId: access.accountId,
      websiteId: metadata.websiteId,
      entityType: metadata.entityType,
      entitySlug: metadata.entitySlug,
      usageContext: metadata.usageContext,
      extension,
    });

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const service = createSupabaseServiceRoleClient();
    const upload = await service.storage
      .from('site-media')
      .upload(storagePath, fileBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) {
      return apiError('UPLOAD_FAILED', upload.error.message, 400);
    }

    const { data: publicData } = service.storage.from('site-media').getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;
    const imageMetadata = extractUploadImageMetadata(file, fileBytes);

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
      fileSizeBytes: imageMetadata.sizeBytes,
      widthPx: imageMetadata.widthPx,
      heightPx: imageMetadata.heightPx,
      format: imageMetadata.format,
    });

    return apiSuccess({
      mediaAssetId: row.id,
      bucket: 'site-media',
      path: storagePath,
      publicUrl,
      mimeType: file.type,
      sizeBytes: imageMetadata.sizeBytes,
      width: imageMetadata.widthPx,
      height: imageMetadata.heightPx,
      format: imageMetadata.format,
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
