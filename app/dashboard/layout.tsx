import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { DashboardShell } from '@/components/admin/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, account_id, accounts(name)')
    .eq('auth_user_id', user.id)
    .single();

  return (
    <DashboardShell
      userName={profile?.name || user.email || ''}
      accountName={(profile?.accounts as any)?.name || ''}
      avatarUrl={user.user_metadata?.avatar_url}
    >
      {children}
    </DashboardShell>
  );
}
