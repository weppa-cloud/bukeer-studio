/**
 * parseTheme() — Parse and normalize raw theme input into validated contracts.
 *
 * Accepts unknown JSON input and returns validated DesignTokens + ThemeProfile,
 * applying defaults where possible.
 */

import { z } from 'zod';
import {
  DesignTokensSchema,
  DESIGN_TOKENS_SCHEMA_VERSION,
  type DesignTokens,
} from '../contracts/design-tokens';
import {
  ThemeProfileSchema,
  THEME_PROFILE_SCHEMA_VERSION,
  type ThemeProfile,
} from '../contracts/theme-profile';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ParseResult {
  success: true;
  tokens: DesignTokens;
  profile: ThemeProfile;
}

export interface ParseError {
  success: false;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export type ParseOutput = ParseResult | ParseError;

// ---------------------------------------------------------------------------
// parseTheme
// ---------------------------------------------------------------------------

/**
 * Parse raw JSON into validated DesignTokens + ThemeProfile.
 *
 * Input shape:
 * ```json
 * {
 *   "tokens": { ... DesignTokens ... },
 *   "profile": { ... ThemeProfile ... }
 * }
 * ```
 */
export function parseTheme(input: unknown): ParseOutput {
  if (!input || typeof input !== 'object') {
    return {
      success: false,
      errors: [{ path: '', message: 'Input must be a non-null object' }],
    };
  }

  const raw = input as Record<string, unknown>;

  // Inject schema versions if missing
  const tokensInput = injectSchemaVersion(raw.tokens, '$schema', DESIGN_TOKENS_SCHEMA_VERSION);
  const profileInput = injectSchemaVersion(raw.profile, '$schema', THEME_PROFILE_SCHEMA_VERSION);

  const errors: Array<{ path: string; message: string }> = [];

  // Parse tokens
  const tokensResult = DesignTokensSchema.safeParse(tokensInput);
  if (!tokensResult.success) {
    for (const issue of flattenZodErrors(tokensResult.error)) {
      errors.push({ path: `tokens.${issue.path}`, message: issue.message });
    }
  }

  // Parse profile
  const profileResult = ThemeProfileSchema.safeParse(profileInput);
  if (!profileResult.success) {
    for (const issue of flattenZodErrors(profileResult.error)) {
      errors.push({ path: `profile.${issue.path}`, message: issue.message });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    tokens: tokensResult.data!,
    profile: profileResult.data!,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function injectSchemaVersion(input: unknown, key: string, version: string): unknown {
  if (!input || typeof input !== 'object') return input;
  const obj = input as Record<string, unknown>;
  if (!(key in obj)) {
    return { ...obj, [key]: version };
  }
  return input;
}

function flattenZodErrors(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
