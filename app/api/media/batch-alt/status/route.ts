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
  getMediaAltJobById,
  requireMediaRouteAccess,
} from '@/lib/supabase/media';

const StatusQuerySchema = z.object({
  jobId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = StatusQuerySchema.safeParse({
      jobId: request.nextUrl.searchParams.get('jobId'),
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const job = await getMediaAltJobById(parsed.data.jobId);
    await requireMediaRouteAccess(request, job.website_id);

    return apiSuccess({
      jobId: job.id,
      status: job.status,
      dryRun: job.dry_run,
      total: job.total,
      processed: job.processed,
      failed: job.failed,
      errors: Array.isArray(job.errors) ? job.errors : [],
      brokenUrls: Array.isArray(job.broken_urls) ? job.broken_urls : [],
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      entityType: job.entity_type,
      locales: Array.isArray(job.locales) ? job.locales : ['es'],
      websiteId: job.website_id,
    });
  } catch (error) {
    if (error instanceof MediaApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    return apiInternalError(error instanceof Error ? error.message : 'Failed to read media job status');
  }
}
