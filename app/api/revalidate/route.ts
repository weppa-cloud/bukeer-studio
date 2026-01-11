import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/revalidate
 *
 * Handles ISR revalidation requests from Supabase Edge Functions.
 * Called when website content is updated in Flutter editor.
 *
 * Security features:
 * - Bearer token authentication (REVALIDATE_SECRET)
 * - Subdomain validation against database
 * - In-memory rate limiting per IP (5 requests/minute)
 * - Audit logging to revalidation_logs table
 *
 * Request body:
 * - subdomain: string - The subdomain to revalidate
 * - path?: string - Optional specific path (defaults to site root)
 */

// Simple in-memory rate limiter
// Note: For production with multiple instances, use Upstash Redis
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate limit check
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    if (!checkRateLimit(`revalidate:${ip}`, 10, 60000)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    // 2. Authentication via Bearer token
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret) {
      console.error('[Revalidate] REVALIDATE_SECRET not configured');
      return NextResponse.json(
        { error: 'Revalidation not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      // Also check legacy body secret for backwards compatibility
      const body = await request.clone().json();
      if (body.secret !== expectedSecret) {
        console.error('[Revalidate] Invalid or missing authorization');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 3. Parse request body
    const body = await request.json();
    const { subdomain, path } = body;

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { error: 'subdomain is required' },
        { status: 400 }
      );
    }

    // 4. Validate subdomain exists in database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Revalidate] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, subdomain, status')
      .eq('subdomain', subdomain.toLowerCase().trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (websiteError) {
      console.error('[Revalidate] Database error:', websiteError.message);
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
    console.log(
      `[Revalidate] Success: ${subdomain} in ${duration}ms (IP: ${ip})`
    );

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
          console.warn('[Revalidate] Failed to log:', error.message);
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
    console.error('[Revalidate] Error:', error);
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
