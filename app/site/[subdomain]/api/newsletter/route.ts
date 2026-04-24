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
  subdomain: z.string().trim().min(1).optional(),
  placement: z.enum(['footer', 'section']).default('footer'),
  locale: z.string().trim().min(2).max(16).optional().nullable(),
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
  return {
    email: form.get('email'),
    placement: form.get('placement'),
    locale: form.get('locale'),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  try {
    const routeParams = await params;
    const parsed = RequestSchema.safeParse(await parseBody(request));
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const body = parsed.data;
    const subdomain = body.subdomain || routeParams.subdomain;
    const email = body.email.toLowerCase();
    const emailHash = createHash('sha256')
      .update(`${subdomain}:${body.placement}:${email}`)
      .digest('hex');
    const ip = extractClientIp(request.headers);

    const rate = await checkRateLimit(
      {
        scope: 'newsletter_signup',
        key: `${subdomain}:${emailHash.slice(0, 24)}:${ip}`,
        limit: 6,
        windowSeconds: 10 * 60,
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

    const subscribedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('waflow_leads')
      .upsert(
        {
          account_id: website.account_id,
          website_id: website.id,
          subdomain,
          variant: 'D',
          step: 'confirmation',
          session_key: `newsletter:${emailHash.slice(0, 64)}`,
          payload: {
            source: 'newsletter_signup',
            placement: body.placement,
            email,
            locale: body.locale ?? null,
            subscribed_at: subscribedAt,
          },
          submitted_at: subscribedAt,
          source_ip: ip,
          source_user_agent: request.headers.get('user-agent'),
        },
        {
          onConflict: 'session_key,variant',
          ignoreDuplicates: false,
        },
      )
      .select('id')
      .maybeSingle<{ id: string }>();

    if (error) {
      log.error('newsletter_upsert_failed', {
        subdomain,
        placement: body.placement,
        error: error.message,
      });
      return apiInternalError('Failed to persist newsletter signup');
    }

    return apiSuccess(
      {
        id: data?.id ?? null,
        message: 'Newsletter signup saved successfully',
      },
      201,
    );
  } catch (error) {
    log.error('unhandled_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError();
  }
}
