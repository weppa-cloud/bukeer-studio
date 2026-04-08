/**
 * @bukeer/theme-sdk — Preset Metadata Contract v3.0
 *
 * Defines the shape of theme presets: reusable theme configurations
 * with metadata for discovery, preview, and versioned publish/rollback.
 */

import { z } from 'zod';
import { DesignTokensSchema } from './design-tokens';
import { ThemeProfileSchema } from './theme-profile';

// ---------------------------------------------------------------------------
// Preset Category
// ---------------------------------------------------------------------------

export const PresetCategoryEnum = z.enum([
  'adventure',
  'luxury',
  'tropical',
  'corporate',
  'boutique',
  'cultural',
  'eco',
  'romantic',
  'custom',
]);

// ---------------------------------------------------------------------------
// Preset Quality Checklist
// ---------------------------------------------------------------------------

export const PresetQualityChecklistSchema = z.object({
  /** All color pairs pass WCAG AA contrast (4.5:1 normal, 3:1 large) */
  contrastAA: z.boolean(),
  /** Dark mode palette is complete and tested */
  darkModeComplete: z.boolean(),
  /** Typography uses only allowlisted fonts */
  fontsAllowlisted: z.boolean(),
  /** All section style intents render correctly */
  sectionStylesVerified: z.boolean(),
  /** Preview screenshot captured */
  previewCaptured: z.boolean(),
  /** Tested on mobile viewport */
  mobileVerified: z.boolean(),
});

// ---------------------------------------------------------------------------
// Preset Version (for publish/rollback)
// ---------------------------------------------------------------------------

export const PresetVersionSchema = z.object({
  /** Semantic version */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** ISO 8601 publish timestamp */
  publishedAt: z.string().datetime(),
  /** Who published */
  publishedBy: z.string(),
  /** Deterministic hash of tokens + profile at publish time */
  snapshotHash: z.string(),
  /** Change description */
  changelog: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Preset Metadata
// ---------------------------------------------------------------------------

export const PresetMetadataSchema = z.object({
  /** Unique preset ID */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z.string().min(1).max(100),
  /** URL-friendly slug */
  slug: z.string().regex(/^[a-z0-9-]+$/).max(50),
  /** Description */
  description: z.string().max(500).optional(),
  /** Category for filtering */
  category: PresetCategoryEnum,
  /** Emoji visual identifier */
  emoji: z.string().max(4),
  /** Tags for discovery */
  tags: z.array(z.string().max(30)).max(10).default([]),
  /** Whether this is a system preset (available to all accounts) */
  isSystem: z.boolean().default(false),
  /** Whether this preset is active / visible */
  isActive: z.boolean().default(true),
  /** Display sort order */
  displayOrder: z.number().int().min(0).default(0),
  /** Preview image URL */
  previewUrl: z.string().url().optional(),
  /** Suggested section types when using this preset */
  suggestedSections: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Full Preset (metadata + tokens + profile)
// ---------------------------------------------------------------------------

export const ThemePresetSchema = z.object({
  metadata: PresetMetadataSchema,
  tokens: DesignTokensSchema,
  profile: ThemeProfileSchema,
  /** Quality checklist results */
  quality: PresetQualityChecklistSchema.optional(),
  /** Published versions (newest first) */
  versions: z.array(PresetVersionSchema).default([]),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type PresetCategory = z.infer<typeof PresetCategoryEnum>;
export type PresetQualityChecklist = z.infer<typeof PresetQualityChecklistSchema>;
export type PresetVersion = z.infer<typeof PresetVersionSchema>;
export type PresetMetadata = z.infer<typeof PresetMetadataSchema>;
export type ThemePreset = z.infer<typeof ThemePresetSchema>;
