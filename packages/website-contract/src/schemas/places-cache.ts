import { z } from 'zod';

export const PlaceSourceSchema = z.enum(['static', 'maptiler', 'manual']);

export const PlaceCacheRowSchema = z.object({
  normalized_name: z.string().min(1).max(200),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  source: PlaceSourceSchema,
  country_code: z.string().length(2).nullable(),
  updated_at: z.string().datetime(),
});

export const PlaceCacheInsertSchema = PlaceCacheRowSchema.omit({ updated_at: true }).extend({
  updated_at: z.string().datetime().optional(),
});

export type PlaceSource = z.infer<typeof PlaceSourceSchema>;
export type PlaceCacheRow = z.infer<typeof PlaceCacheRowSchema>;
export type PlaceCacheInsert = z.infer<typeof PlaceCacheInsertSchema>;
