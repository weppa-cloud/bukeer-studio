import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiInternalError,
  apiRateLimited,
  apiSuccess,
  apiValidationError,
} from '@/lib/api';
import { checkRateLimit, extractClientIp } from '@/lib/booking/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api.site.newsletter');

const RequestSchema = z.object({
  email: z.string().trim().email().max(254),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for newsletter API');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function parseBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return request.json();
  }

  const form = await request.formData();
  return { email: form.get('email') };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  try {
    const { subdomain } = await params;
    const parsed = RequestSchema.safeParse(await parseBody(request));
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const email = parsed.data.email.toLowerCase();
    const emailHash = createHash('sha256').update(email).digest('hex');
    const ip = extractClientIp(request.headers);

    const rate = await checkRateLimit(
      {
        scope: 'newsletter_signup',
        key: `${subdomain}:${emailHash.slice(0, 24)}:${ip}`,
        limit: 5,
        windowSeconds: 60 * 60,
      },
      {
        supabaseUrl: supabaseUrl ?? '',
        supabaseServiceRoleKey: serviceRoleKey ?? '',
      },
    );
    if (!rate.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000),
      );
      return apiRateLimited(retryAfter);
    }

    const supabase = createSupabaseAdmin();
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, account_id')
      .eq('subdomain', subdomain)
      .eq('status', 'published')
      .maybeSingle<{ id: string; account_id: string | null }>();

    if (websiteError || !website) {
      log.warn('tenant_lookup_failed', {
        subdomain,
        error: websiteError?.message ?? 'not_found',
      });
      return apiInternalError('Failed to resolve website');
    }

    const { error } = await supabase
      .from('waflow_leads')
      .upsert(
        {
          account_id: website.account_id,
          website_id: website.id,
          subdomain,
          variant: 'A',
          step: 'contact',
          session_key: `newsletter:${emailHash.slice(0, 64)}`,
          payload: {
            source: 'footer_newsletter',
            email,
          },
          submitted_at: new Date().toISOString(),
          source_ip: ip,
          source_user_agent: request.headers.get('user-agent'),
        },
        {
          onConflict: 'session_key,variant',
          ignoreDuplicates: false,
        },
      );

    if (error) {
      log.error('newsletter_upsert_failed', { subdomain, error: error.message });
      return apiInternalError('Failed to persist newsletter signup');
    }

    return apiSuccess({ subscribed: true }, 201);
  } catch (error) {
    log.error('unhandled_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError();
  }
}
