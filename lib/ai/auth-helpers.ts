import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface AuthContext {
  userId: string;
  accountId: string;
  role: string;
  token: string;
}

/**
 * Extract and validate JWT from Authorization header.
 * For editor routes — requires valid Supabase JWT.
 */
export async function getEditorAuth(
  request: NextRequest
): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Get account_id and role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('account_id, roles(role_name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!roles) return null;

  const roleData = roles.roles as unknown as { role_name: string } | null;

  return {
    userId: user.id,
    accountId: roles.account_id,
    role: roleData?.role_name ?? 'agent',
    token,
  };
}

/** Roles allowed to use editor AI features. */
const EDITOR_ROLES = new Set(['super_admin', 'owner', 'admin', 'agent']);

/**
 * Check if auth context has editor-level permissions.
 */
export function hasEditorRole(auth: AuthContext): boolean {
  return EDITOR_ROLES.has(auth.role);
}

/**
 * Get client IP for public-chat rate limiting.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
