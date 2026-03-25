import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '../supabase/middleware-client';

/**
 * Auth guard middleware module.
 * Protects /dashboard/* routes — redirects to /login if no session.
 * Handles JWT one-time token from Flutter bridge.
 */
export async function authGuard(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) return null;

  const supabase = createSupabaseMiddlewareClient(request, response);

  // Handle one-time JWT token from Flutter (bridge handoff)
  const token = request.nextUrl.searchParams.get('token');
  if (token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    if (!error && data.session) {
      // Remove token from URL and redirect
      const cleanUrl = new URL(request.nextUrl);
      cleanUrl.searchParams.delete('token');
      return NextResponse.redirect(cleanUrl);
    }
  }

  // Check session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Refresh session (keep it alive)
  await supabase.auth.getUser();

  return null; // Continue to next middleware
}
