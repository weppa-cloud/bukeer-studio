import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiRateLimited,
  apiSuccess,
  apiValidationError,
} from '@/lib/api';
import { checkRateLimit, extractClientIp } from '@/lib/booking/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api.newsletter');

const RequestSchema = z.object({
  email: z.string().trim().email(),
  subdomain: z.string().trim().min(1),
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

async function resolveTenant(subdomain: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('websites')
    .select('id,account_id')
    .eq('subdomain', subdomain)
    .eq('status', 'published')
    .maybeSingle<{ id: string; account_id: string | null }>();

  if (error) {
    log.warn('tenant_lookup_failed', { subdomain, error: error.message });
    return null;
  }

  return data ?? null;
}

async function createSessionKey(subdomain: string, email: string, placement: string) {
  const normalized = `${subdomain}:${email.trim().toLowerCase()}:${placement}`;
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `newsletter:${hex.slice(0, 32)}`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const body = parsed.data;
    const ip = extractClientIp(request.headers);
    const rate = await checkRateLimit(
      {
        scope: 'newsletter_signup',
        key: `${body.subdomain}:${body.email.toLowerCase()}:${ip}`,
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

    const tenant = await resolveTenant(body.subdomain);
    if (!tenant) {
      return apiError('TENANT_NOT_FOUND', 'Website subdomain not found or not published', 404);
    }

    const supabase = createSupabaseAdmin();
    const sessionKey = await createSessionKey(body.subdomain, body.email, body.placement);
    const subscribedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('waflow_leads')
      .insert({
        account_id: tenant.account_id,
        website_id: tenant.id,
        subdomain: body.subdomain,
        variant: 'D',
        step: 'confirmation',
        session_key: sessionKey,
        submitted_at: subscribedAt,
        source_ip: ip,
        source_user_agent: request.headers.get('user-agent'),
        payload: {
          source: 'newsletter_signup',
          placement: body.placement,
          email: body.email.trim().toLowerCase(),
          locale: body.locale ?? null,
          subscribed_at: subscribedAt,
        },
      })
      .select('id')
      .maybeSingle<{ id: string }>();

    if (error) {
      log.error('newsletter_persist_failed', {
        subdomain: body.subdomain,
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
