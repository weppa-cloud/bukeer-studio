/**
 * Middleware Supabase client — simplified version without @supabase/ssr.
 * Uses cookie-based auth checking in middleware.ts directly.
 *
 * The middleware checks for sb-*-auth-token cookies to determine auth state.
 * Actual Supabase client operations happen in server/browser clients.
 */

// This file is kept as a placeholder. Auth checking in middleware is done
// via cookie inspection (no Supabase client needed in middleware).
// See middleware.ts for the implementation.
