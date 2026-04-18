import { z } from 'zod';

export const MarketingFieldNameSchema = z.enum([
  'description',
  'program_highlights',
  'program_inclusions',
  'program_exclusions',
  'program_notes',
  'program_meeting_info',
  'program_gallery',
  'social_image',
  'cover_image_url',
]);
export type MarketingFieldName = z.infer<typeof MarketingFieldNameSchema>;

export const DescriptionPatchSchema = z.object({
  field: z.literal('description'),
  value: z.string().max(10000).nullable(),
});

export const HighlightsPatchSchema = z.object({
  field: z.literal('program_highlights'),
  value: z.array(z.string().min(1).max(200)).max(12),
});

export const InclusionsPatchSchema = z.object({
  field: z.literal('program_inclusions'),
  value: z.array(z.string().min(1).max(200)).max(20),
});

export const ExclusionsPatchSchema = z.object({
  field: z.literal('program_exclusions'),
  value: z.array(z.string().min(1).max(200)).max(20),
});

export const NotesPatchSchema = z.object({
  field: z.literal('program_notes'),
  value: z.string().max(5000).nullable(),
});

export const MeetingInfoPatchSchema = z.object({
  field: z.literal('program_meeting_info'),
  value: z.string().max(2000).nullable(),
});

export const GalleryPatchSchema = z.object({
  field: z.literal('program_gallery'),
  value: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().max(200).nullable().optional(),
        caption: z.string().max(200).nullable().optional(),
      }),
    )
    .max(20),
});

export const SocialImagePatchSchema = z.object({
  field: z.literal('social_image'),
  value: z.string().url().nullable(),
});

export const CoverImagePatchSchema = z.object({
  field: z.literal('cover_image_url'),
  value: z.string().url().nullable(),
});

export const MarketingFieldPatchSchema = z.discriminatedUnion('field', [
  DescriptionPatchSchema,
  HighlightsPatchSchema,
  InclusionsPatchSchema,
  ExclusionsPatchSchema,
  NotesPatchSchema,
  MeetingInfoPatchSchema,
  GalleryPatchSchema,
  SocialImagePatchSchema,
  CoverImagePatchSchema,
]);
export type MarketingFieldPatch = z.infer<typeof MarketingFieldPatchSchema>;

export const StudioEditorV2FlagResolutionSchema = z.object({
  enabled: z.boolean(),
  fields: z.array(MarketingFieldNameSchema),
  scope: z.enum(['website', 'account', 'default']),
});
export type StudioEditorV2FlagResolution = z.infer<typeof StudioEditorV2FlagResolutionSchema>;

export const ToggleStudioEditorV2RequestSchema = z.object({
  account_id: z.string().uuid(),
  website_id: z.string().uuid().nullable(),
  enabled: z.boolean(),
  fields: z.array(MarketingFieldNameSchema),
});
export type ToggleStudioEditorV2Request = z.infer<typeof ToggleStudioEditorV2RequestSchema>;
