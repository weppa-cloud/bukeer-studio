import { z } from 'zod'

/**
 * Server-side environment variable validation.
 * Import this module to validate that all required env vars are set.
 * Fails fast with a clear error message listing missing variables.
 *
 * @see ADR-005 — Defense-in-Depth Security
 */

const serverEnvSchema = z.object({
  // Supabase (shared with bukeer-flutter)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Service role — required in production, optional in dev
  SUPABASE_SERVICE_ROLE_KEY: process.env.NODE_ENV === 'production'
    ? z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required in production')
    : z.string().optional(),

  // AI integration
  OPENROUTER_AUTH_TOKEN: z.string().min(1, 'OPENROUTER_AUTH_TOKEN is required'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-sonnet-4-5'),

  // ISR revalidation
  REVALIDATE_SECRET: z.string().min(1, 'REVALIDATE_SECRET is required'),

  // Public URL
  NEXT_PUBLIC_URL: z.string().url().default('https://bukeer.com'),
  NEXT_PUBLIC_MAIN_DOMAIN: z.string().default('bukeer.com'),

  // Optional
  NEXT_PUBLIC_GA_ID: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let _validatedEnv: ServerEnv | null = null

/**
 * Validate and return server environment variables.
 * Caches the result after first successful validation.
 * Throws with a descriptive error if required vars are missing.
 */
export function getServerEnv(): ServerEnv {
  if (_validatedEnv) return _validatedEnv

  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `[env] Missing or invalid environment variables:\n${missing}\n\n` +
      'Check your .env.local file or CI/CD secrets configuration.'
    )
  }

  _validatedEnv = result.data
  return _validatedEnv
}
