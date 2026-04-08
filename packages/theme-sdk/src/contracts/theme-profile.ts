/**
 * @bukeer/theme-sdk — Theme Profile Contract v3.0
 *
 * High-level brand/mood profile that drives design token generation.
 * Tourism-ready: supports mood, section style intents, and brand identity.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------
export const THEME_PROFILE_SCHEMA_VERSION = '3.0.0';

// ---------------------------------------------------------------------------
// Brand Identity
// ---------------------------------------------------------------------------

export const BrandMoodEnum = z.enum([
  'adventurous',   // Bold colors, dynamic motion, dramatic shadows
  'luxurious',     // Deep tones, refined typography, subtle motion
  'tropical',      // Warm/vibrant palette, relaxed spacing, playful shapes
  'corporate',     // Neutral palette, minimal motion, clean lines
  'boutique',      // Earthy tones, artisanal feel, moderate rounding
  'cultural',      // Rich warm colors, serif headings, expressive
  'eco',           // Green palette, natural tones, organic shapes
  'romantic',      // Soft pastels, elegant typography, gentle motion
]);

export const BrandIdentitySchema = z.object({
  /** Brand mood — drives automatic token defaults */
  mood: BrandMoodEnum,
  /** Brand name (used in meta/accessibility) */
  name: z.string().min(1).max(100),
  /** Tagline (optional, used in previews) */
  tagline: z.string().max(200).optional(),
  /** Brand logo URL (optional) */
  logoUrl: z.string().url().optional(),
  /** Favicon URL (optional) */
  faviconUrl: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Layout Intent
// ---------------------------------------------------------------------------

export const LayoutVariantEnum = z.enum(['modern', 'classic', 'minimal', 'bold']);
export const HeroStyleEnum = z.enum(['full', 'split', 'centered', 'minimal', 'video', 'slideshow']);
export const NavStyleEnum = z.enum(['sticky', 'static', 'transparent', 'hidden']);
export const FooterStyleEnum = z.enum(['full', 'compact', 'minimal']);

export const LayoutIntentSchema = z.object({
  variant: LayoutVariantEnum.default('modern'),
  heroStyle: HeroStyleEnum.default('full'),
  navStyle: NavStyleEnum.default('sticky'),
  footerStyle: FooterStyleEnum.default('full'),
  /** Max content width in px (800 – 1600) */
  maxContentWidth: z.number().int().min(800).max(1600).default(1200),
});

// ---------------------------------------------------------------------------
// Section Style Intents
// ---------------------------------------------------------------------------

export const SectionStyleIntentEnum = z.enum([
  'default',       // Standard section styling
  'emphasized',    // Uses primaryContainer background
  'inverted',      // Dark background with light text
  'subtle',        // Muted background
  'hero',          // Full-width, immersive
  'card-grid',     // Card-based layout
  'alternating',   // Alternates between default/subtle
]);

export const SectionStyleOverridesSchema = z.record(
  z.string(), // section type (e.g., 'hero', 'features', 'pricing')
  SectionStyleIntentEnum,
).default({});

// ---------------------------------------------------------------------------
// Color Mode Preference
// ---------------------------------------------------------------------------

export const ColorModeEnum = z.enum(['light', 'dark', 'system']);

// ---------------------------------------------------------------------------
// Theme Profile (root)
// ---------------------------------------------------------------------------

export const ThemeProfileSchema = z.object({
  /** Schema version */
  $schema: z.literal(THEME_PROFILE_SCHEMA_VERSION),
  /** Brand identity */
  brand: BrandIdentitySchema,
  /** Color mode preference */
  colorMode: ColorModeEnum.default('system'),
  /** Layout intent */
  layout: LayoutIntentSchema,
  /** Per-section style overrides */
  sectionStyles: SectionStyleOverridesSchema,
  /** Custom metadata (extensible) */
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type BrandMood = z.infer<typeof BrandMoodEnum>;
export type BrandIdentity = z.infer<typeof BrandIdentitySchema>;
export type LayoutVariant = z.infer<typeof LayoutVariantEnum>;
export type HeroStyle = z.infer<typeof HeroStyleEnum>;
export type NavStyle = z.infer<typeof NavStyleEnum>;
export type FooterStyle = z.infer<typeof FooterStyleEnum>;
export type LayoutIntent = z.infer<typeof LayoutIntentSchema>;
export type SectionStyleIntent = z.infer<typeof SectionStyleIntentEnum>;
export type ColorMode = z.infer<typeof ColorModeEnum>;
export type ThemeProfile = z.infer<typeof ThemeProfileSchema>;
