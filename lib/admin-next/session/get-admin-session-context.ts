import type {
  AdminFeatureFlags,
  AdminPermission,
  AdminSessionContext,
} from '@bukeer/admin-contract';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import {
  getAdminNextBetaReadonlyGate,
  getAdminNextExternalHandoffGate,
  isAdminNextPrototypeEnabled,
} from '@/lib/admin-next/flags';

export type AdminNextSessionFlags = AdminFeatureFlags & {
  adminNextBetaReadonlyEnabled: boolean;
  adminNextBetaAccountAllowed: boolean;
  adminNextBetaRoleAllowed: boolean;
  adminNextBetaReadonly: boolean;
  adminNextExternalHandoff: boolean;
};

export type AdminNextSessionContext =
  | WithAdminNextSessionFlags<
      Extract<AdminSessionContext, { status: 'authenticated' }>
    >
  | WithAdminNextSessionFlags<
      Extract<AdminSessionContext, { status: 'missing_role' }>
    >
  | WithAdminNextSessionFlags<
      Extract<AdminSessionContext, { status: 'unauthenticated' }>
    >;

type WithAdminNextSessionFlags<T extends { flags: AdminFeatureFlags }> = Omit<
  T,
  'flags'
> & {
  flags: AdminNextSessionFlags;
};

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'payments.manage',
    'trace.view',
    'manager.view',
  ],
  owner: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'payments.manage',
    'trace.view',
    'manager.view',
  ],
  admin: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'payments.manage',
    'trace.view',
    'manager.view',
  ],
  agent: ['admin_next.view', 'planner.view', 'planner.suggest', 'trace.view'],
  accounting: ['admin_next.view', 'planner.view', 'payments.manage', 'trace.view'],
};

export async function getAdminSessionContext(): Promise<AdminNextSessionContext> {
  const defaultFlags = getAdminNextSessionFlags();

  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);

  if (ctx.status === 'unauthenticated') {
    return { status: 'unauthenticated', flags: defaultFlags };
  }

  if (ctx.status === 'missing_role') {
    return {
      status: 'missing_role',
      userId: ctx.userId,
      email: ctx.email,
      displayName: ctx.displayName,
      flags: defaultFlags,
    };
  }

  const flags = getAdminNextSessionFlags({
    accountId: ctx.accountId,
    role: ctx.role,
  });

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

export function getAdminNextSessionFlags(input?: {
  accountId?: string | null;
  role?: string | null;
}): AdminNextSessionFlags {
  const adminNextPrototype = isAdminNextPrototypeEnabled();
  const betaGate = getAdminNextBetaReadonlyGate({
    accountId: input?.accountId,
    role: input?.role,
  });
  const externalHandoffGate = getAdminNextExternalHandoffGate({
    accountId: input?.accountId,
    role: input?.role,
  });

  return {
    adminNextPrototype,
    adminNextBetaReadonlyEnabled: betaGate.enabled,
    adminNextBetaAccountAllowed: betaGate.accountAllowed,
    adminNextBetaRoleAllowed: betaGate.roleAllowed,
    adminNextBetaReadonly: adminNextPrototype && betaGate.betaReadonly,
    adminNextExternalHandoff:
      adminNextPrototype && externalHandoffGate.externalHandoff,
  };
}

export function permissionsForRole(role: string): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasAdminPermission(
  ctx: AdminSessionContext,
  permission: AdminPermission,
): boolean {
  return ctx.status === 'authenticated' && ctx.permissions.includes(permission);
}
