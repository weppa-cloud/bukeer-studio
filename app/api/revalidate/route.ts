import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError, apiInternalError } from '@/lib/api';
import { invalidatePublicDataCache } from '@/lib/supabase/get-pages';

const log = createLogger('revalidate');

// Maps a content type to the public URL segment used in site routes.
const TYPE_TO_SEGMENT: Record<string, string> = {
  package: 'paquetes',
  activity: 'actividades',
  hotel: 'hoteles',
  transfer: 'traslados',
  destination: 'destinos',
};

const RevalidateBodySchema = z.object({
  subdomain: z.string().min(1).transform((s) => s.toLowerCase().trim()),
  path: z.string().optional(),
  // Optional structured payload for content-type-aware revalidation.
  // Callers (e.g. Supabase Edge Functions / DB triggers) can pass
  // { type: 'package', slug: 'machu-picchu-7d' } to invalidate the
  // specific product page without computing the route segment themselves.
  type: z.enum(['package', 'activity', 'hotel', 'transfer', 'destination']).optional(),
  slug: z.string().min(1).optional(),
  secret: z.string().optional(), // Legacy body-based auth
});

/**
 * API Route: /api/revalidate
 *
 * Handles ISR revalidation requests from Supabase Edge Functions.
 * Called when website content is updated in Flutter editor.
 *
 * Security features:
 * - Bearer token authentication (REVALIDATE_SECRET)
 * - Subdomain validation against database
 * - Audit logging to revalidation_logs table
 *
 * Request body:
 * - subdomain: string - The subdomain to revalidate
 * - path?: string - Optional specific path (defaults to site root)
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Extract IP for logging
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    // 2. Authentication via Bearer token
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret) {
      log.error('REVALIDATE_SECRET not configured');
      // Keep auth contract deterministic in non-configured environments.
      return apiUnauthorized();
    }

    // 3. Parse and validate request body
    const raw = await request.json();
    const parsed = RevalidateBodySchema.safeParse(raw);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { subdomain, path, type, slug } = parsed.data;

    // Check auth: Bearer token or legacy body secret
    if (authHeader !== `Bearer ${expectedSecret}`) {
      if (parsed.data.secret !== expectedSecret) {
        log.error('Invalid or missing authorization');
        return apiUnauthorized();
      }
    }

    // 4. Validate subdomain exists in database

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('Missing Supabase configuration');
      return apiInternalError('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, subdomain, status')
      .eq('subdomain', subdomain)
      .is('deleted_at', null)
      .maybeSingle();

    if (websiteError) {
      log.error('Database error', { message: websiteError.message });
      return apiInternalError('Database error');
    }

    if (!website) {
      log.warn(`Invalid subdomain: ${subdomain}`);
      return apiError('VALIDATION_ERROR', 'Invalid subdomain');
    }

    // 5. Perform revalidation
    invalidatePublicDataCache(subdomain);
    const sitePath = `/site/${subdomain}`;
    const revalidatedPaths: string[] = [sitePath];
    revalidatePath(sitePath);

    // Also revalidate specific path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
      revalidatedPaths.push(path);
    }

    // Content-type-aware revalidation: targets the specific product route
    // plus its category listing so both pages pick up the change.
    if (type && slug) {
      const segment = TYPE_TO_SEGMENT[type];
      if (segment) {
        const productPath = `/site/${subdomain}/${segment}/${slug}`;
        const listingPath = `/site/${subdomain}/${segment}`;
        revalidatePath(productPath);
        revalidatePath(listingPath);
        revalidatedPaths.push(productPath, listingPath);
      }
    }

    // Common paths that should always be revalidated
    revalidatePath(`/site/${subdomain}/blog`);
    revalidatedPaths.push(`/site/${subdomain}/blog`);

    const duration = Date.now() - startTime;
    log.info(`Success: ${subdomain} in ${duration}ms`, { ip });

    // 6. Log revalidation (fire and forget)
    supabase
      .from('revalidation_logs')
      .insert({
        website_id: website.id,
        subdomain,
        path: path || sitePath,
        ip,
        user_agent: request.headers.get('user-agent') || null,
      })
      .then(({ error }) => {
        if (error) {
          log.warn('Failed to write audit log', { message: error.message });
        }
      });

    return apiSuccess({
      revalidated: true,
      subdomain,
      paths: revalidatedPaths,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
    });
  } catch (error) {
    log.error('Unexpected error', { message: String(error) });
    return apiInternalError();
  }
}

// Health check
export async function GET() {
  return apiSuccess({
    status: 'ok',
    endpoint: '/api/revalidate',
    method: 'POST',
    description: 'ISR revalidation endpoint for website content updates',
    required_headers: {
      Authorization: 'Bearer <REVALIDATE_SECRET>',
      'Content-Type': 'application/json',
    },
    required_body: {
      subdomain: 'string (required)',
      path: 'string (optional)',
      type: 'package|activity|hotel|transfer|destination (optional)',
      slug: 'string (optional, paired with type to target a specific product page)',
    },
  });
}
