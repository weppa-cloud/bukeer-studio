import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { getDashboardUserContext } from '@/lib/admin/user-context';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);

  if (ctx.status !== 'authenticated') notFound();

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('roles!inner(role_name)')
    .eq('user_id', ctx.userId)
    .eq('is_active', true)
    .limit(10);

  const isSuperAdmin = (roleRow ?? []).some((r) => {
    const roles = r as unknown as { roles?: { role_name?: string } | Array<{ role_name?: string }> };
    if (Array.isArray(roles.roles)) return roles.roles.some((x) => x.role_name === 'super_admin');
    return roles.roles?.role_name === 'super_admin';
  });

  if (!isSuperAdmin) notFound();

  return <>{children}</>;
}
