/**
 * Standalone auth guard for editor routes.
 *
 * Two modes:
 * 1. Embedded: Token received via postMessage from Flutter (existing)
 * 2. Standalone: Direct Supabase Auth session
 *
 * This module handles mode 2 — direct browser session via Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates an authenticated Supabase client from the browser session.
 * Returns null if no session exists.
 */
export function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export interface AuthUser {
  id: string;
  email: string;
  accountId: string;
  role: string;
}

/**
 * Gets the current authenticated user, or null if not authenticated.
 * For standalone editor mode (not embedded iframe).
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createAuthClient();

  const { data: { user }, error } = await supabase.auth.getUser();
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
    id: user.id,
    email: user.email ?? '',
    accountId: roles.account_id,
    role: roleData?.role_name ?? 'agent',
  };
}

/**
 * Checks if a user has editor access for a specific website.
 * Validates account_id ownership.
 */
export async function canEditWebsite(
  userId: string,
  accountId: string,
  websiteId: string
): Promise<boolean> {
  const supabase = createAuthClient();

  const { data, error } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .single();

  return !error && !!data;
}

export type AuthMode = 'embedded' | 'standalone';

/**
 * Detects the auth mode based on context.
 * - If loaded in an iframe (window.parent !== window), it's embedded mode.
 * - Otherwise, it's standalone mode.
 */
export function detectAuthMode(): AuthMode {
  if (typeof window === 'undefined') return 'standalone';
  try {
    return window.parent !== window ? 'embedded' : 'standalone';
  } catch {
    // Cross-origin access to window.parent throws — means we're embedded
    return 'embedded';
  }
}
