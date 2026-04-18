import { z } from 'zod';

export const DataSourceCodeSchema = z.enum([
  'flutter',      // product catalog
  'studio',       // page customization
  'ai',           // AI-generated
  'aggregation',  // RPC-aggregated from children
  'computed',     // derived at render
  'google',       // external (Google Places)
  'hardcoded',    // static fallback in code
]);
export type DataSourceCode = z.infer<typeof DataSourceCodeSchema>;

export const GhostReasonSchema = z.enum([
  'empty',
  'threshold_not_met',
  'dependency_missing',
  'feature_disabled',
]);
export type GhostReason = z.infer<typeof GhostReasonSchema>;

export const GhostSectionSchema = z.object({
  section: z.string(),
  label: z.string(),
  reason: GhostReasonSchema,
  cta: z
    .object({
      label: z.string(),
      anchor: z.string(),
    })
    .nullable(),
});
export type GhostSection = z.infer<typeof GhostSectionSchema>;

export const AiFieldSchema = z.object({
  field: z.string(),
  locked: z.boolean(),
  generated_at: z.string().datetime().nullable(),
  hash: z.string().nullable(),
});
export type AiField = z.infer<typeof AiFieldSchema>;

export const ContentHealthSchema = z.object({
  product_id: z.string().uuid(),
  product_type: z.enum(['activity', 'hotel', 'transfer', 'destination', 'package']),
  score: z.number().int().min(0).max(100),
  ghosts: z.array(GhostSectionSchema),
  ai_fields: z.array(AiFieldSchema),
  fallbacks: z.array(z.string()),
  computed: z.array(z.string()),
  last_computed_at: z.string().datetime(),
});
export type ContentHealth = z.infer<typeof ContentHealthSchema>;

export const ContentHealthListItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  product_slug: z.string(),
  product_type: z.enum(['activity', 'hotel', 'transfer', 'destination', 'package']),
  score: z.number().int().min(0).max(100),
  ghosts_count: z.number().int().nonnegative(),
  ai_unlocked_count: z.number().int().nonnegative(),
  fallbacks_count: z.number().int().nonnegative(),
  last_computed_at: z.string().datetime(),
});
export type ContentHealthListItem = z.infer<typeof ContentHealthListItemSchema>;

export const ContentHealthListSchema = z.object({
  items: z.array(ContentHealthListItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});
export type ContentHealthList = z.infer<typeof ContentHealthListSchema>;

export const AiFlagsUpdateRequestSchema = z.object({
  field: z.string().min(1),
  locked: z.boolean(),
});
export type AiFlagsUpdateRequest = z.infer<typeof AiFlagsUpdateRequestSchema>;
