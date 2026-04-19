import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { SeoApiError } from '@/lib/seo/errors';
import type { User } from '@supabase/supabase-js';

export interface WebsiteAccessContext {
  userId: string;
  websiteId: string;
  accountId: string;
  role: string;
}

function isRateLimitedAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: string; message?: string };
  if (candidate.status === 429) return true;
  if (candidate.code === 'over_request_rate_limit') return true;
  return /rate limit/i.test(candidate.message ?? '');
}

async function resolveAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const maxAttempts = 3;
  let lastRateLimitError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user) return user;

    if (isRateLimitedAuthError(error)) {
      lastRateLimitError = error;
      const delayMs = 150 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    return null;
  }

  if (lastRateLimitError) {
    // Fallback only when auth endpoint is rate-limited. This avoids turning
    // a valid session into false AUTH_EXPIRED during high-concurrency E2E/API load.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }
  }

  return null;
}

export async function requireWebsiteAccess(websiteId: string): Promise<WebsiteAccessContext> {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    throw new SeoApiError('AUTH_EXPIRED', 'Unauthorized', 401);
  }

  const adminClient = createSupabaseServiceRoleClient();

  const { data: website, error: websiteError } = await adminClient
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    throw new SeoApiError('VALIDATION_ERROR', 'Website not found', 404);
  }

  const { data: roleRow, error: roleError } = await adminClient
    .from('user_roles')
    .select('account_id, is_active, roles(role_name)')
    .eq('user_id', user.id)
    .eq('account_id', website.account_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new SeoApiError('FORBIDDEN', 'Insufficient permissions for this website', 403);
  }

  const roleData = roleRow.roles as { role_name?: string } | null;

  return {
    userId: user.id,
    websiteId,
    accountId: website.account_id,
    role: roleData?.role_name ?? 'agent',
  };
}
