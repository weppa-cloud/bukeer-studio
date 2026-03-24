import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface AuthenticatedDashboardUserContext {
  status: 'authenticated';
  user: User;
  userId: string;
  email: string;
  accountId: string;
  role: string;
  displayName: string;
  lastName: string | null;
}

export interface MissingRoleDashboardUserContext {
  status: 'missing_role';
  user: User;
  userId: string;
  email: string;
  displayName: string;
  lastName: string | null;
}

export interface UnauthenticatedDashboardUserContext {
  status: 'unauthenticated';
}

export type DashboardUserContext =
  | AuthenticatedDashboardUserContext
  | MissingRoleDashboardUserContext
  | UnauthenticatedDashboardUserContext;

interface UserRoleRow {
  account_id: string | null;
  roles: { role_name?: string | null } | Array<{ role_name?: string | null }> | null;
}

interface ContactRow {
  name: string | null;
  last_name: string | null;
  email: string | null;
}

/**
 * Source of truth for dashboard user context.
 * - Auth identity: auth.users via getUser()
 * - Account/role: public.user_roles
 * - Display profile: public.contacts
 */
export async function getDashboardUserContext(
  supabase: SupabaseClient,
): Promise<DashboardUserContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: 'unauthenticated' };
  }

  const email = user.email ?? '';

  const { data: contact } = await supabase
    .from('contacts')
    .select('name, last_name, email')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle<ContactRow>();

  const displayName = buildDisplayName(contact, email);
  const lastName = contact?.last_name ?? null;

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('account_id, roles(role_name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(10)
    .returns<UserRoleRow[]>();

  const roleRow = roleRows?.find((row) => !!row.account_id) ?? null;

  if (!roleRow?.account_id) {
    return {
      status: 'missing_role',
      user,
      userId: user.id,
      email,
      displayName,
      lastName,
    };
  }

  return {
    status: 'authenticated',
    user,
    userId: user.id,
    email,
    accountId: roleRow.account_id,
    role: extractRoleName(roleRow.roles) ?? 'agent',
    displayName,
    lastName,
  };
}

function buildDisplayName(contact: ContactRow | null, fallbackEmail: string): string {
  const fullName = [contact?.name, contact?.last_name]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(' ')
    .trim();
  if (fullName.length > 0) return fullName;
  if (contact?.email && contact.email.trim().length > 0) return contact.email;
  return fallbackEmail;
}

export function extractRoleName(
  roleValue: UserRoleRow['roles'],
): string | null {
  if (!roleValue) return null;
  if (Array.isArray(roleValue)) {
    return roleValue[0]?.role_name ?? null;
  }
  return roleValue.role_name ?? null;
}
