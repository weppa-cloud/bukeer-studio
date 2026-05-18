import type {
  AdminPermission,
  AdminSessionContext,
} from '@bukeer/admin-contract';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { isAdminNextPrototypeEnabled } from '@/lib/admin-next/flags';

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'trace.view',
    'manager.view',
  ],
  owner: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'trace.view',
    'manager.view',
  ],
  admin: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'trace.view',
    'manager.view',
  ],
  agent: ['admin_next.view', 'planner.view', 'planner.suggest', 'trace.view'],
  accounting: ['admin_next.view', 'planner.view', 'trace.view'],
};

export async function getAdminSessionContext(): Promise<AdminSessionContext> {
  const flags = {
    adminNextPrototype: isAdminNextPrototypeEnabled(),
  };

  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);

  if (ctx.status === 'unauthenticated') {
    return { status: 'unauthenticated', flags };
  }

  if (ctx.status === 'missing_role') {
    return {
      status: 'missing_role',
      userId: ctx.userId,
      email: ctx.email,
      displayName: ctx.displayName,
      flags,
    };
  }

  return {
    status: 'authenticated',
    userId: ctx.userId,
    email: ctx.email,
    accountId: ctx.accountId,
    role: ctx.role,
    displayName: ctx.displayName,
    permissions: permissionsForRole(ctx.role),
    flags,
  };
}

export function permissionsForRole(role: string): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.agent;
}

export function hasAdminPermission(
  ctx: AdminSessionContext,
  permission: AdminPermission,
): boolean {
  return ctx.status === 'authenticated' && ctx.permissions.includes(permission);
}
