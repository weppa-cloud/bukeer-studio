import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import { WebsiteAdminLayout } from '@/components/admin/website-admin-layout';

export default async function WebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  const supabase = await createSupabaseServerClient();

  // Verify user has access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('account_id')
    .eq('auth_user_id', user.id)
    .single();

  const { data: website } = await supabase
    .from('websites')
    .select('id, subdomain, content, account_id')
    .eq('id', websiteId)
    .single();

  if (!website || website.account_id !== profile?.account_id) {
    redirect('/dashboard');
  }

  const websiteName = (website.content as any)?.siteName || website.subdomain;

  return (
    <WebsiteAdminLayout websiteId={websiteId} websiteName={websiteName}>
      {children}
    </WebsiteAdminLayout>
  );
}
