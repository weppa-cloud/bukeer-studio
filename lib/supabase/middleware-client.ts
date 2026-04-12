import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Create a Supabase client for use in middleware.
 *
 * This client reads auth cookies from the request and writes refreshed
 * cookies to the response. Use this to refresh expired auth tokens in
 * middleware before they reach Server Components.
 *
 * @see ADR-005 — Defense-in-Depth Security (Layer 1)
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * Refresh the Supabase auth session in middleware.
 *
 * Calls `getUser()` (not `getSession()`) to revalidate the JWT
 * and update cookies on the response. This prevents expired tokens
 * from reaching Server Components.
 *
 * Returns the response with refreshed cookies set.
 */
export async function refreshAuthSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createSupabaseMiddlewareClient(request, response)

  // getUser() validates the JWT with Supabase and triggers a refresh
  // if the access token is expired but the refresh token is valid.
  // The refreshed cookies are automatically set on the response.
  await supabase.auth.getUser()

  return response
}
