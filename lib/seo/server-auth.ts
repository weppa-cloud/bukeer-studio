import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { SeoApiError } from '@/lib/seo/errors';

export interface WebsiteAccessContext {
  userId: string;
  websiteId: string;
  accountId: string;
  role: string;
}

export async function requireWebsiteAccess(websiteId: string): Promise<WebsiteAccessContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
