import { apiInternalError, apiSuccess, apiUnauthorized } from '@/lib/api';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized('Unauthorized');
  }

  const token = process.env.SITE_PREVIEW_TOKEN || process.env.REVALIDATE_SECRET;
  if (!token) {
    return apiInternalError('Preview token is not configured');
  }

  return apiSuccess({ token });
}
