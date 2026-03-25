import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { DashboardShell } from '@/components/admin/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('account_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const accountId = roleRow?.account_id ?? null;

  const { data: contact } = await supabase
    .from('contacts')
    .select('name, last_name, email')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  const displayName =
    [contact?.name, contact?.last_name].filter(Boolean).join(' ').trim()
    || contact?.email
    || user.email
    || '';

  let accountName = '';
  if (accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .maybeSingle();
    accountName = account?.name ?? '';
  }

  return (
    <DashboardShell
      userName={displayName}
      accountName={accountName}
      avatarUrl={user.user_metadata?.avatar_url}
    >
      {!accountId ? (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-4 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            No tienes un rol activo en ninguna cuenta. Contacta a un administrador.
          </div>
        </div>
      ) : (
        children
      )}
    </DashboardShell>
  );
}
