'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { createLogger } from '@/lib/logger';

const log = createLogger('actions.ops.reconciliation');

async function assertSuperAdmin(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);
  if (ctx.status !== 'authenticated') throw new Error('UNAUTHORIZED');

  const { data: rows } = await supabase
    .from('user_roles')
    .select('roles!inner(role_name)')
    .eq('user_id', ctx.userId)
    .eq('is_active', true)
    .limit(10);

  const isSuper = (rows ?? []).some((r) => {
    const roles = r as unknown as { roles?: { role_name?: string } | Array<{ role_name?: string }> };
    if (Array.isArray(roles.roles)) return roles.roles.some((x) => x.role_name === 'super_admin');
    return roles.roles?.role_name === 'super_admin';
  });

  if (!isSuper) throw new Error('FORBIDDEN');
  return ctx.userId;
}

export async function runReconciliation(input: {
  websiteId: string;
  windowHours?: number;
}): Promise<{ anomaliesCount: number }> {
  await assertSuperAdmin();
  const hours = Math.max(1, Math.min(input.windowHours ?? 24, 168));

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc('reconcile_package_kits_surfaces', {
    p_window: `${hours} hours`,
  });

  if (error) {
    log.error('reconciliation_failed', { error: error.message });
    throw new Error('RPC_FAILED');
  }

  const count = (data as { anomalies_count?: number } | null)?.anomalies_count ?? 0;

  log.info('reconciliation_run', {
    website_id: input.websiteId,
    window_hours: hours,
    anomalies_count: count,
  });

  revalidatePath(`/dashboard/${input.websiteId}/ops/reconciliation`);
  return { anomaliesCount: count };
}

export async function resolveAlert(input: {
  websiteId: string;
  alertId: string;
}): Promise<void> {
  const userId = await assertSuperAdmin();

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from('reconciliation_alerts')
    .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq('id', input.alertId)
    .is('resolved_at', null);

  if (error) {
    log.error('alert_resolve_failed', { alert_id: input.alertId, error: error.message });
    throw new Error('RESOLVE_FAILED');
  }

  log.info('alert_resolved', { alert_id: input.alertId, user_id: userId });
  revalidatePath(`/dashboard/${input.websiteId}/ops/reconciliation`);
}
