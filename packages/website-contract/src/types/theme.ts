/**
 * Theme v3 types — lightweight interfaces for website-contract consumers.
 *
 * Canonical schemas with Zod validation live in @bukeer/theme-sdk.
 * These are minimal TypeScript interfaces for type-safety in web-public.
 */

/** Theme v3 root shape stored in websites.theme JSONB */
export interface ThemeV3 {
  tokens: Record<string, unknown>;
  profile: Record<string, unknown>;
}
