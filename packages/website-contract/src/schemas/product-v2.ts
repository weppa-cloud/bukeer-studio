/**
 * Product V2 schemas for RPC bridge payloads.
 * All V2 fields are optional to preserve backwards compatibility with legacy RPC output.
 */

import { z } from 'zod';

import { CustomSectionSchema } from './custom-section';

const ProductTypeSchema = z.enum(['destination', 'hotel', 'activity', 'transfer', 'package']);
const NumericSchema = z.union([
  z.number(),
  z.string().regex(/^-?\d+(?:\.\d+)?$/).transform(Number),
]);
const StringOrStringArraySchema = z.union([z.string(), z.array(z.string())]);
const JsonObjectSchema = z.record(z.string(), z.unknown());
const JsonValueSchema: z.ZodType<
  string | number | boolean | null | Record<string, unknown> | unknown[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);
const RichTextListSchema = z.union([
  z.array(z.string()),
  z.array(JsonObjectSchema),
]);

export const ScheduleEventTypeSchema = z.enum([
  'transport',
  'activity',
  'meal',
  'lodging',
  'free_time',
  'flight',
]);

export const ScheduleEntrySchema = z.object({
  day: z.number().int().positive().optional(),
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  time: z.string().optional(),
  event_type: ScheduleEventTypeSchema.optional(),
});

export const MeetingPointSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip_code: z.string().optional(),
  google_place_id: z.string().optional(),
  latitude: NumericSchema.optional(),
  longitude: NumericSchema.optional(),
});

export const ActivityPriceSchema = z.object({
  unit_type_code: z.string(),
  season: z.string(),
  price: NumericSchema,
  currency: z.string(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

export const ActivityOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing_per: z.enum(['UNIT', 'BOOKING']),
  min_units: z.number().int().positive().optional(),
  max_units: z.number().int().positive().optional(),
  start_times: z.array(z.string()).optional(),
  is_refundable: z.boolean().optional(),
  prices: z.array(ActivityPriceSchema),
});

export const PackageVersionSchema = z.object({
  version_number: z.number().int().positive(),
  total_price: NumericSchema,
  base_currency: z.string(),
  services_snapshot_summary: z.string(),
  duration_days: z.number().int().positive().optional(),
  duration_nights: z.number().int().nonnegative().optional(),
});

export const ProductFAQSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const ItineraryItemSchema = z.object({
  day: z.number().int().optional(),
  title: z.string(),
  description: z.string().optional(),
  event_type: ScheduleEventTypeSchema.optional(),
});

const ProductPageCustomSectionSchema = z.union([
  CustomSectionSchema,
  z.object({
    id: z.string().uuid().or(z.string().min(1)),
    type: z.string().min(1),
    position: z.number().int().nonnegative().default(0),
    content: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
]);

export const ProductDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  type: ProductTypeSchema,

  amenities: z.array(z.string()).optional(),
  star_rating: NumericSchema.optional(),
  is_featured: z.boolean().optional(),

  inclusions: z.union([z.string(), RichTextListSchema]).optional(),
  exclusions: z.union([z.string(), RichTextListSchema]).optional(),
  recommendations: z.string().optional(),
  instructions: z.string().optional(),

  duration_minutes: NumericSchema.optional(),
  duration: z.string().nullish(),
  from_location: z.string().optional(),
  to_location: z.string().optional(),
  itinerary_items: z.array(ItineraryItemSchema).optional(),

  latitude: NumericSchema.optional(),
  longitude: NumericSchema.optional(),
  rating: NumericSchema.optional(),
  review_count: NumericSchema.optional(),
  price: z.union([NumericSchema, z.string()]).optional(),
  currency: z.string().optional(),
  includes: StringOrStringArraySchema.optional(),
  excludes: StringOrStringArraySchema.optional(),

  // V2 fields (optional)
  schedule: z.array(ScheduleEntrySchema).optional(),
  meeting_point: MeetingPointSchema.optional(),
  highlights: z.array(z.string()).optional(),
  photos: z.union([z.array(z.string()), z.array(JsonObjectSchema)]).optional(),
  social_image: z.string().optional(),
  user_rating: NumericSchema.optional(),
  experience_type: z.string().optional(),
  activity_type: z.string().optional(),
  region: z.string().optional(),
  options: z.array(ActivityOptionSchema).optional(),
  package_version: PackageVersionSchema.optional(),
  package_versions: z.array(PackageVersionSchema).optional(),
  services_snapshot_summary: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
  duration_nights: z.number().int().nonnegative().optional(),

  // Video field (#165)
  video_url: z.string().url().nullish(),
  video_caption: z.string().nullish(),

  // Package aggregated + AI-generated fields (Gate B F1 #172, Gate D F3 #174)
  program_inclusions: z.array(z.string()).optional(),
  program_exclusions: z.array(z.string()).optional(),
  // `program_gallery` may arrive as `string[]` (legacy) or as
  // `{url, alt?, caption?}[]` (current SSR — activity & package branches of
  // `get_website_product_page`). Renderer normalizes both shapes.
  program_gallery: z
    .array(
      z.union([
        z.string(),
        z.object({
          url: z.string(),
          alt: z.string().optional(),
          caption: z.string().optional(),
        }).passthrough(),
      ])
    )
    .optional(),
  program_highlights: z.array(z.string()).optional(),
});

export const ProductPageCustomizationSchema = z.object({
  id: z.string(),
  custom_hero: z.object({
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    backgroundImage: z.string().nullish(),
  }).nullish(),
  custom_sections: z.array(ProductPageCustomSectionSchema).max(20).nullish(),
  sections_order: z.array(z.string()).nullish(),
  hidden_sections: z.array(z.string()).nullish(),
  custom_seo_title: z.string().nullish(),
  custom_seo_description: z.string().nullish(),
  robots_noindex: z.boolean().nullish(),
  custom_faq: z.array(ProductFAQSchema).max(10).nullish(),
  custom_highlights: z.array(z.string()).max(6).nullish(),
  custom_tiers: z.array(z.record(z.string(), JsonValueSchema)).nullish(),
  is_published: z.boolean(),
});

export const ProductPageDataSchema = z.object({
  product: ProductDataSchema,
  page: ProductPageCustomizationSchema.optional(),
});

export const CategoryProductsSchema = z.object({
  items: z.array(ProductDataSchema),
  total: NumericSchema,
});

export type ProductDataInput = z.input<typeof ProductDataSchema>;
export type ProductDataOutput = z.output<typeof ProductDataSchema>;
export type ProductPageDataInput = z.input<typeof ProductPageDataSchema>;
export type ProductPageDataOutput = z.output<typeof ProductPageDataSchema>;
