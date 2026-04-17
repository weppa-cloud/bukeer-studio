/**
 * RBAC permissions for Website Studio admin.
 * 3 levels: viewer, editor, publisher
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminRole = 'viewer' | 'editor' | 'publisher' | 'owner';

export interface AdminPermissions {
  canView: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  canManageSettings: boolean;
  canManageDomain: boolean;
  canExportData: boolean;
}

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  viewer: {
    canView: true,
    canEdit: false,
    canPublish: false,
    canDelete: false,
    canManageSettings: false,
    canManageDomain: false,
    canExportData: false,
  },
  editor: {
    canView: true,
    canEdit: true,
    canPublish: false,
    canDelete: false,
    canManageSettings: false,
    canManageDomain: false,
    canExportData: true,
  },
  publisher: {
    canView: true,
    canEdit: true,
    canPublish: true,
    canDelete: true,
    canManageSettings: true,
    canManageDomain: false,
    canExportData: true,
  },
  owner: {
    canView: true,
    canEdit: true,
    canPublish: true,
    canDelete: true,
    canManageSettings: true,
    canManageDomain: true,
    canExportData: true,
  },
};

export function getPermissions(role: AdminRole): AdminPermissions {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  role: AdminRole,
  permission: keyof AdminPermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

export async function getUserRole(
  userId: string,
  accountId: string,
  supabase: SupabaseClient
): Promise<AdminRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!data) return 'viewer';

  const roleName = extractRoleName((data as { roles?: unknown }).roles);
  if (!roleName) return 'viewer';

  // Map internal roles to admin roles
  const roleMap: Record<string, AdminRole> = {
    super_admin: 'owner',
    owner: 'owner',
    admin: 'publisher',
    agent: 'editor',
    accounting: 'viewer',
  };

  return roleMap[roleName] || 'viewer';
}

function extractRoleName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const role = value[0] as { role_name?: unknown } | undefined;
    return typeof role?.role_name === 'string' ? role.role_name : null;
  }
  const role = value as { role_name?: unknown };
  return typeof role.role_name === 'string' ? role.role_name : null;
}
