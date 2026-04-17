import { z } from 'zod';

export const PackageAggregatedDataSchema = z.object({
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  gallery: z.array(z.string()),
});

export type PackageAggregatedData = z.infer<typeof PackageAggregatedDataSchema>;
