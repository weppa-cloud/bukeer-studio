import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const NullableUrlSchema = z.string().url().max(2048).nullable().default(null);
const NullableShortStringSchema = z.string().min(1).max(500).nullable().default(null);

export const GrowthMediaPackVersionSchema = z.literal('growth-media-pack-v1');
export type GrowthMediaPackVersion = z.infer<typeof GrowthMediaPackVersionSchema>;

export const GrowthMediaPackSlotStatusSchema = z.enum([
  'filled',
  'missing',
  'needs_human_asset',
]);
export type GrowthMediaPackSlotStatus = z.infer<
  typeof GrowthMediaPackSlotStatusSchema
>;

export const GrowthMediaLicenseStatusSchema = z.enum([
  'approved',
  'permissioned',
  'commercial_license_verified',
  'human_legal_exception',
  'reference_only',
  'unverified',
  'missing',
  'rejected',
]);
export type GrowthMediaLicenseStatus = z.infer<
  typeof GrowthMediaLicenseStatusSchema
>;

export const GrowthMediaProvenanceTypeSchema = z.enum([
  'first_party_media_library',
  'existing_cms_asset',
  'operator_photo',
  'customer_approved_asset',
  'licensed_external',
  'google_places_discovery',
  'serpapi_discovery',
  'reviews_discovery',
  'reference_only_visual_brief',
  'ai_assisted_real_photo_derivative',
  'clean_ai_illustrative',
  'not_sourced',
]);
export type GrowthMediaProvenanceType = z.infer<
  typeof GrowthMediaProvenanceTypeSchema
>;

export const GrowthMediaMatchStatusSchema = z.enum([
  'pass',
  'watch',
  'fail',
  'unknown',
]);
export type GrowthMediaMatchStatus = z.infer<typeof GrowthMediaMatchStatusSchema>;

export const GrowthMediaDuplicateCheckSchema = z.enum([
  'unique',
  'duplicate',
  'near_duplicate',
  'not_checked',
]);
export type GrowthMediaDuplicateCheck = z.infer<
  typeof GrowthMediaDuplicateCheckSchema
>;

export const GrowthMediaPackReadinessStatusSchema = z.enum([
  'technical_published',
  'traffic_ready',
  'hold_scale',
]);
export type GrowthMediaPackReadinessStatus = z.infer<
  typeof GrowthMediaPackReadinessStatusSchema
>;

export const GrowthMediaVisualIntentSchema = z.object({
  section_key: z.string().min(1).max(120),
  visual_intent: z.string().min(1).max(1000),
  required_count: z.number().int().min(1).max(100).default(1),
});
export type GrowthMediaVisualIntent = z.infer<
  typeof GrowthMediaVisualIntentSchema
>;

export const GrowthMediaDimensionsSchema = z.object({
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
});
export type GrowthMediaDimensions = z.infer<typeof GrowthMediaDimensionsSchema>;

export const GrowthMediaReferenceOnlyVisualBriefSchema = z.object({
  allowed: z.literal(true),
  non_publishable_source_url: z.string().url().max(2048),
  factual_observations: z.array(z.string().min(1).max(500)).min(1).max(30),
});
export type GrowthMediaReferenceOnlyVisualBrief = z.infer<
  typeof GrowthMediaReferenceOnlyVisualBriefSchema
>;

export const GrowthMediaGeneratedOrEditedFinalSchema = z.object({
  model: z.string().min(1).max(200).nullable().default(null),
  base_provenance_type: GrowthMediaProvenanceTypeSchema,
  base_license_status: GrowthMediaLicenseStatusSchema,
  editing_actions: z.array(z.string().min(1).max(500)).default([]),
  disclosure_label: z.string().min(1).max(200),
});
export type GrowthMediaGeneratedOrEditedFinal = z.infer<
  typeof GrowthMediaGeneratedOrEditedFinalSchema
>;

export const GrowthMediaPackSlotSchema = z
  .object({
    slot_index: z.number().int().min(1).max(500),
    section_key: z.string().min(1).max(120),
    visual_intent: z.string().min(1).max(1000),
    status: GrowthMediaPackSlotStatusSchema,

    image_url: NullableUrlSchema,
    source_url: NullableUrlSchema,
    source_ref: NullableShortStringSchema,
    license_status: GrowthMediaLicenseStatusSchema,
    provenance_type: GrowthMediaProvenanceTypeSchema,

    destination_match: GrowthMediaMatchStatusSchema,
    section_match: GrowthMediaMatchStatusSchema,
    alt: z.string().min(1).max(300).nullable().default(null),
    caption: z.string().min(1).max(500).nullable().default(null),
    dimensions: GrowthMediaDimensionsSchema.nullable().default(null),
    hash: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .nullable()
      .default(null),
    duplicate_check: GrowthMediaDuplicateCheckSchema,
    visual_quality_score: z.number().int().min(0).max(100).nullable().default(null),

    reference_only_visual_brief:
      GrowthMediaReferenceOnlyVisualBriefSchema.nullable().default(null),
    publishable_base_required: z.boolean().default(false),
    generated_or_edited_final:
      GrowthMediaGeneratedOrEditedFinalSchema.nullable().default(null),
    reality_preservation_pass: z.boolean().default(false),
  })
  .superRefine((slot, ctx) => {
    const publishableLicenseStatuses = new Set<GrowthMediaLicenseStatus>([
      'approved',
      'permissioned',
      'commercial_license_verified',
      'human_legal_exception',
    ]);
    const discoveryOnlyProvenance = new Set<GrowthMediaProvenanceType>([
      'google_places_discovery',
      'serpapi_discovery',
      'reviews_discovery',
      'reference_only_visual_brief',
    ]);

    if (slot.status === 'filled') {
      if (!slot.image_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['image_url'],
          message: 'filled MediaPack slots must include image_url.',
        });
      }
      if (!slot.source_url && !slot.source_ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['source_ref'],
          message: 'filled MediaPack slots must include source_url or source_ref.',
        });
      }
      if (!publishableLicenseStatuses.has(slot.license_status)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['license_status'],
          message:
            'filled MediaPack slots require approved, permissioned, commercial_license_verified, or human_legal_exception license status.',
        });
      }
      if (discoveryOnlyProvenance.has(slot.provenance_type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['provenance_type'],
          message:
            'Google/SerpAPI/review discovery images are reference-only and cannot be filled publishable MediaPack slots.',
        });
      }
      if (slot.destination_match !== 'pass' || slot.section_match !== 'pass') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destination_match'],
          message: 'filled MediaPack slots must pass destination and section match.',
        });
      }
      if (slot.duplicate_check !== 'unique') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['duplicate_check'],
          message: 'filled MediaPack slots must pass duplicate check as unique.',
        });
      }
      if (slot.visual_quality_score == null || slot.visual_quality_score < 70) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['visual_quality_score'],
          message: 'filled MediaPack slots require visual_quality_score >= 70.',
        });
      }
    }

    if (slot.license_status === 'reference_only') {
      if (!slot.reference_only_visual_brief) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reference_only_visual_brief'],
          message:
            'reference_only assets must be stored only as a non-published visual brief.',
        });
      }
      if (!slot.publishable_base_required) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['publishable_base_required'],
          message:
            'reference_only assets must require a separate publishable base.',
        });
      }
    }

    if (slot.generated_or_edited_final) {
      const baseLicense = slot.generated_or_edited_final.base_license_status;
      const baseProvenance = slot.generated_or_edited_final.base_provenance_type;
      if (!publishableLicenseStatuses.has(baseLicense)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['generated_or_edited_final', 'base_license_status'],
          message:
            'AI-assisted real-photo derivatives require a publishable base license; reference-only pixels are not enough.',
        });
      }
      if (discoveryOnlyProvenance.has(baseProvenance)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['generated_or_edited_final', 'base_provenance_type'],
          message:
            'AI-assisted final images cannot be based on Google/SerpAPI/review reference-only pixels.',
        });
      }
      if (!slot.reality_preservation_pass) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reality_preservation_pass'],
          message:
            'AI-assisted final images must pass destination-truth/reality preservation.',
        });
      }
    }
  });
export type GrowthMediaPackSlot = z.infer<typeof GrowthMediaPackSlotSchema>;

export const GrowthMediaHumanApprovedExceptionSchema = z.object({
  approved_by: z.string().min(1).max(200),
  approved_at: DateTimeSchema,
  reason: z.string().min(1).max(1000),
  minimum_publishable_slots: z.number().int().min(0).max(500),
});
export type GrowthMediaHumanApprovedException = z.infer<
  typeof GrowthMediaHumanApprovedExceptionSchema
>;

export const GrowthMediaPackSchema = GrowthTenantScopeSchema.extend({
  pack_version: GrowthMediaPackVersionSchema,
  requested_by: z.string().min(1).max(120),
  owned_by_lane: z.literal('growth-media-agent'),
  canonical_url: z.string().url().max(2048),
  keyword: z.string().min(1).max(300),
  destination_entities: z.array(z.string().min(1).max(200)).default([]),
  target_image_count: z.number().int().min(0).max(500),
  required_visual_intents: z.array(GrowthMediaVisualIntentSchema).default([]),
  slots: z.array(GrowthMediaPackSlotSchema).max(500),
  human_approved_exception:
    GrowthMediaHumanApprovedExceptionSchema.nullable().default(null),
  generated_at: DateTimeSchema,
}).superRefine((pack, ctx) => {
  if (pack.slots.length !== pack.target_image_count) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['slots'],
      message:
        'MediaPack must include one slot per target_image_count; unfilled benchmark slots are explicit missing or needs_human_asset rows.',
    });
  }

  const slotIndexes = new Set<number>();
  for (const slot of pack.slots) {
    if (slotIndexes.has(slot.slot_index)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slots'],
        message: `Duplicate MediaPack slot_index ${slot.slot_index}.`,
      });
    }
    slotIndexes.add(slot.slot_index);
  }
});
export type GrowthMediaPack = z.infer<typeof GrowthMediaPackSchema>;

export const GrowthMediaPackReadinessSchema = z.object({
  status: GrowthMediaPackReadinessStatusSchema,
  target_image_count: z.number().int().min(0).max(500),
  filled_approved_slots: z.number().int().min(0).max(500),
  missing_slots: z.number().int().min(0).max(500),
  needs_human_asset_slots: z.number().int().min(0).max(500),
  blockers: z.array(z.string().min(1).max(200)).default([]),
});
export type GrowthMediaPackReadiness = z.infer<
  typeof GrowthMediaPackReadinessSchema
>;

export function evaluateGrowthMediaPackReadiness(
  pack: GrowthMediaPack,
): GrowthMediaPackReadiness {
  const publishableLicenseStatuses = new Set<GrowthMediaLicenseStatus>([
    'approved',
    'permissioned',
    'commercial_license_verified',
    'human_legal_exception',
  ]);
  const filledApprovedSlots = pack.slots.filter(
    (slot) => slot.status === 'filled' && publishableLicenseStatuses.has(slot.license_status),
  ).length;
  const missingSlots = pack.slots.filter((slot) => slot.status === 'missing').length;
  const needsHumanAssetSlots = pack.slots.filter(
    (slot) => slot.status === 'needs_human_asset',
  ).length;
  const blockers = new Set<string>();

  if (missingSlots > 0) {
    blockers.add('missing_slots');
  }
  if (needsHumanAssetSlots > 0) {
    blockers.add('needs_human_asset');
  }
  if (pack.slots.some((slot) => slot.publishable_base_required)) {
    blockers.add('publishable_base_required');
  }
  if (pack.slots.some((slot) => slot.license_status === 'reference_only')) {
    blockers.add('reference_only_not_publishable');
  }

  const exceptionMinimum = pack.human_approved_exception?.minimum_publishable_slots;
  const exceptionAllowsTrafficReady =
    typeof exceptionMinimum === 'number' && filledApprovedSlots >= exceptionMinimum;
  const trafficReady =
    blockers.size === 0 &&
    (filledApprovedSlots >= pack.target_image_count || exceptionAllowsTrafficReady);

  return GrowthMediaPackReadinessSchema.parse({
    status: trafficReady ? 'traffic_ready' : 'hold_scale',
    target_image_count: pack.target_image_count,
    filled_approved_slots: filledApprovedSlots,
    missing_slots: missingSlots,
    needs_human_asset_slots: needsHumanAssetSlots,
    blockers: trafficReady ? [] : Array.from(blockers),
  });
}

export const GrowthMediaPackInputSchema = GrowthMediaPackSchema;
export type GrowthMediaPackInput = z.input<typeof GrowthMediaPackSchema>;
