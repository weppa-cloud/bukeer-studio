import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiError,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import {
  MediaApiError,
  checkAssetHealth,
  createMediaAltJob,
  discoverAssetsForBatch,
  enforceBatchRateLimit,
  generateAssetMetadata,
  normalizeBatchLimit,
  requireMediaRouteAccess,
  updateBlogFeaturedAltIfMissing,
  updateMediaAltJob,
  upsertMediaAssetRecord,
} from '@/lib/supabase/media';

const BatchAltRequestSchema = z.object({
  websiteId: z.string().uuid(),
  entityType: z.enum(['all', 'blog_post', 'package', 'activity']).default('all'),
  dryRun: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(50),
  locales: z.array(z.string().min(2).max(12)).max(3).default(['es']),
  destination: z.string().max(120).optional(),
});

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    const parsed = BatchAltRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const payload = parsed.data;
    const locales = payload.locales.length > 0 ? payload.locales : ['es'];
    const primaryLocale = locales[0] || 'es';
    const limit = normalizeBatchLimit(payload.limit);
    const access = await requireMediaRouteAccess(request, payload.websiteId);
    await enforceBatchRateLimit(access.accountId, payload.websiteId);

    const job = await createMediaAltJob({
      accountId: access.accountId,
      websiteId: payload.websiteId,
      requestedBy: access.userId,
      entityType: payload.entityType,
      locales,
      dryRun: payload.dryRun,
      limit,
    });
    const currentJobId = job.id;
    jobId = currentJobId;

    const discovered = await discoverAssetsForBatch({
      accountId: access.accountId,
      websiteId: payload.websiteId,
      entityType: payload.entityType,
      limit,
    });

    const total = discovered.length;
    let processed = 0;
    let failed = 0;
    const brokenUrls: string[] = [];
    const errors: Array<{ entityId: string; entityType: string; message: string }> = [];

    await updateMediaAltJob({
      jobId: currentJobId,
      total,
      processed: 0,
      failed: 0,
      errors: [],
      brokenUrls: [],
      status: 'running',
    });

    for (const item of discovered) {
      try {
        const health = await checkAssetHealth(item.imageUrl);
        const isBroken = health.status !== 200;

        if (isBroken) {
          failed += 1;
          brokenUrls.push(item.imageUrl);
        }

        const metadata = isBroken
          ? {
              alt: item.entityName,
              title: item.entityName,
              caption: '',
            }
          : await generateAssetMetadata({
              locale: primaryLocale,
              entityType: item.entityType,
              usageContext: item.usageContext,
              entityName: item.entityName,
              destination: payload.destination,
            });

        if (!payload.dryRun) {
          await upsertMediaAssetRecord({
            accountId: access.accountId,
            websiteId: payload.websiteId,
            imageUrl: item.imageUrl,
            entityType: item.entityType,
            entityId: item.entityId,
            usageContext: item.usageContext,
            locale: primaryLocale,
            aiGenerated: !isBroken,
            metadata,
            httpStatus: health.status || null,
          });

          if (item.entityType === 'blog_post' && !isBroken) {
            await updateBlogFeaturedAltIfMissing({
              websiteId: payload.websiteId,
              postId: item.entityId,
              existingFeaturedAlt: item.existingFeaturedAlt,
              alt: metadata.alt,
            });
          }
        }
      } catch (error) {
        failed += 1;
        errors.push({
          entityId: item.entityId,
          entityType: item.entityType,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        await updateMediaAltJob({
          jobId: currentJobId,
          total,
          processed,
          failed,
          errors,
          brokenUrls,
        });
      }
    }

    await updateMediaAltJob({
      jobId: currentJobId,
      status: 'completed',
      total,
      processed,
      failed,
      errors,
      brokenUrls,
    });

    return apiSuccess({
      jobId,
      status: 'completed',
      dryRun: payload.dryRun,
      total,
      processed,
      failed,
      brokenUrls,
      errors,
      locales,
    });
  } catch (error) {
    if (jobId) {
      try {
        await updateMediaAltJob({ jobId, status: 'failed' });
      } catch {
        // Best effort.
      }
    }

    if (error instanceof MediaApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }

    return apiInternalError(error instanceof Error ? error.message : 'Batch alt generation failed');
  }
}
