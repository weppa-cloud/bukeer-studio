import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('revalidate');

const RevalidateBodySchema = z.object({
  subdomain: z.string().min(1).transform((s) => s.toLowerCase().trim()),
  path: z.string().optional(),
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
      return NextResponse.json(
        { error: 'Revalidation not configured' },
        { status: 500 }
      );
    }

    // 3. Parse and validate request body
    const raw = await request.json();
    const parsed = RevalidateBodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subdomain, path } = parsed.data;

    // Check auth: Bearer token or legacy body secret
    if (authHeader !== `Bearer ${expectedSecret}`) {
      if (parsed.data.secret !== expectedSecret) {
        log.error('Invalid or missing authorization');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 4. Validate subdomain exists in database

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!website) {
      console.warn(`[Revalidate] Invalid subdomain: ${subdomain}`);
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      );
    }

    // 5. Perform revalidation
    const sitePath = `/site/${subdomain}`;
    revalidatePath(sitePath);

    // Also revalidate specific path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
    }

    // Common paths that should always be revalidated
    revalidatePath(`/site/${subdomain}/blog`);

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

    return NextResponse.json({
      revalidated: true,
      subdomain,
      paths: [sitePath, ...(path ? [path] : [])],
      timestamp: new Date().toISOString(),
      duration_ms: duration,
    });
  } catch (error) {
    log.error('Unexpected error', { message: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
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
    },
  });
}
