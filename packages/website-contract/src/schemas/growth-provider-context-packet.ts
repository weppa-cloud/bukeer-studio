import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';
import {
  GrowthProviderFreshnessStatusSchema,
  GrowthProviderQualityStatusSchema,
  GrowthProviderSchema,
} from './growth-provider-intelligence';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown());
const ProviderSchema = GrowthProviderSchema.or(z.string().min(1).max(80));
const SourceRefsSchema = z.union([
  z.array(z.string().min(1).max(240)),
  JsonRecordSchema,
]).default([]);

export const GrowthProviderContextPacketVersionSchema = z.literal(
  'growth-provider-context-packet-v1',
);
export type GrowthProviderContextPacketVersion = z.infer<
  typeof GrowthProviderContextPacketVersionSchema
>;

export const GrowthProviderContextPacketStatusSchema = z.enum([
  'pass',
  'watch',
  'blocked',
]);
export type GrowthProviderContextPacketStatus = z.infer<
  typeof GrowthProviderContextPacketStatusSchema
>;

export const GrowthProviderWorkerLaneSchema = z
  .enum([
    'content',
    'transcreation',
    'technical',
    'cro',
    'campaign_optimizer',
    'media',
    'all',
  ])
  .or(z.string().min(1).max(80));
export type GrowthProviderWorkerLane = z.infer<
  typeof GrowthProviderWorkerLaneSchema
>;

export const GrowthProviderContextEntitySchema = z.object({
  type: z.string().min(1).max(80),
  id: z.string().min(1).max(240).nullable().default(null),
  canonical_url: z.string().url().nullable().default(null),
  locale: z.string().min(2).max(16).nullable().default(null),
  market: z.string().min(2).max(16).nullable().default(null),
  path: z.string().min(1).max(500).nullable().default(null),
  slug: z.string().min(1).max(240).nullable().default(null),
  metadata: JsonRecordSchema.default({}),
});
export type GrowthProviderContextEntity = z.infer<
  typeof GrowthProviderContextEntitySchema
>;

export const GrowthProviderFreshnessEntrySchema = z.object({
  profile_id: z.string().min(1).max(120),
  provider: ProviderSchema,
  status: GrowthProviderFreshnessStatusSchema,
  required: z.boolean().default(true),
  fetched_at: DateTimeSchema.nullable().default(null),
  expires_at: DateTimeSchema.nullable().default(null),
  quality_status: GrowthProviderQualityStatusSchema.default('watch'),
  run_id: z.string().uuid().nullable().default(null),
  no_go_reasons: z.array(z.string().min(1).max(500)).default([]),
});
export type GrowthProviderFreshnessEntry = z.infer<
  typeof GrowthProviderFreshnessEntrySchema
>;

export const GrowthProviderSourceProfileSchema = z
  .object({
    profile_id: z.string().min(1).max(120),
    provider: ProviderSchema,
    run_id: z.string().uuid().nullable().default(null),
    window_start: DateTimeSchema.nullable().default(null),
    window_end: DateTimeSchema.nullable().default(null),
    cache_refs: z.array(z.string().min(1).max(240)).default([]),
    fact_ids: z.array(z.string().uuid()).default([]),
    evidence_fingerprint: z.string().min(8).max(160).nullable().default(null),
    source_refs: SourceRefsSchema,
  })
  .superRefine((profile, ctx) => {
    if (
      profile.window_start &&
      profile.window_end &&
      Date.parse(profile.window_end) < Date.parse(profile.window_start)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['window_end'],
        message: 'window_end must be after window_start.',
      });
    }
  });
export type GrowthProviderSourceProfile = z.infer<
  typeof GrowthProviderSourceProfileSchema
>;

export const GrowthProviderContextFactBucketSchema = z.object({
  items: z.array(JsonRecordSchema).default([]),
  source_profile_ids: z.array(z.string().min(1).max(120)).default([]),
  no_go_reasons: z.array(z.string().min(1).max(500)).default([]),
});
export type GrowthProviderContextFactBucket = z.infer<
  typeof GrowthProviderContextFactBucketSchema
>;

export const GrowthProviderContextFactsSchema = z.object({
  search_demand: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
  technical_issues: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
  market_terms: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
  conversion_signals: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
  paid_signals: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
  ux_friction: GrowthProviderContextFactBucketSchema.default({
    items: [],
    source_profile_ids: [],
    no_go_reasons: [],
  }),
});
export type GrowthProviderContextFacts = z.infer<
  typeof GrowthProviderContextFactsSchema
>;

export const GrowthProviderPreviousActionSchema = z.object({
  ref: z.string().min(1).max(240),
  table: z.string().min(1).max(120),
  id: z.string().min(1).max(120),
  status: z.string().min(1).max(120).nullable().default(null),
  action_key: z.string().min(1).max(300).nullable().default(null),
  evidence_fingerprint: z.string().min(8).max(160).nullable().default(null),
  measurement_window_end: DateTimeSchema.nullable().default(null),
  metadata: JsonRecordSchema.default({}),
});
export type GrowthProviderPreviousAction = z.infer<
  typeof GrowthProviderPreviousActionSchema
>;

export const GrowthProviderDedupeVerdictSchema = z.enum([
  'proceed',
  'skip',
  'coalesce',
  'reopen',
  'request_refresh',
  'blocked',
]);
export type GrowthProviderDedupeVerdict = z.infer<
  typeof GrowthProviderDedupeVerdictSchema
>;

export const GrowthProviderContextDedupeSchema = z.object({
  verdict: GrowthProviderDedupeVerdictSchema,
  evidence_fingerprint: z.string().min(8).max(160).nullable().default(null),
  reason: z.string().min(1).max(1000).nullable().default(null),
  previous_refs: z.array(z.string().min(1).max(240)).default([]),
  no_go_reasons: z.array(z.string().min(1).max(500)).default([]),
});
export type GrowthProviderContextDedupe = z.infer<
  typeof GrowthProviderContextDedupeSchema
>;

export const GrowthProviderBlockedActionSchema = z.object({
  action: z.string().min(1).max(160),
  reason: z.string().min(1).max(1000),
});
export type GrowthProviderBlockedAction = z.infer<
  typeof GrowthProviderBlockedActionSchema
>;

export const GrowthProviderContextPacketSchema = GrowthTenantScopeSchema.extend({
  packet_version: GrowthProviderContextPacketVersionSchema,
  status: GrowthProviderContextPacketStatusSchema,
  generated_at: DateTimeSchema,
  worker_lane: GrowthProviderWorkerLaneSchema,
  work_type: z.string().min(1).max(160),
  entity: GrowthProviderContextEntitySchema,
  freshness_map: z.record(z.string(), GrowthProviderFreshnessEntrySchema),
  source_profiles: z.array(GrowthProviderSourceProfileSchema).default([]),
  facts: GrowthProviderContextFactsSchema,
  previous_actions: z.array(GrowthProviderPreviousActionSchema).default([]),
  dedupe_verdict: GrowthProviderContextDedupeSchema,
  allowed_actions: z.array(z.string().min(1).max(160)).default([]),
  blocked_actions: z.array(GrowthProviderBlockedActionSchema).default([]),
}).superRefine((packet, ctx) => {
  const directProviderApiBlocked = packet.blocked_actions.some(
    (entry) => entry.action === 'call_provider_api_directly',
  );
  if (!directProviderApiBlocked) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['blocked_actions'],
      message: 'blocked_actions must include call_provider_api_directly.',
    });
  }

  const nonPassRequiredStatuses = new Set([
    'missing',
    'stale',
    'blocked',
    'approval_required',
    'cost_gated',
    'quota_exhausted',
  ]);
  const requiredNonPass = Object.values(packet.freshness_map).filter(
    (entry) => entry.required && nonPassRequiredStatuses.has(entry.status),
  );
  if (requiredNonPass.length > 0) {
    if (packet.status === 'pass') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'packet status cannot be pass when required evidence is missing or stale.',
      });
    }
    if (!['request_refresh', 'blocked'].includes(packet.dedupe_verdict.verdict)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dedupe_verdict', 'verdict'],
        message: 'dedupe verdict must request_refresh or blocked for missing/stale required evidence.',
      });
    }
  }

  const sourceProfileIds = new Set(
    packet.source_profiles.map((profile) => profile.profile_id),
  );
  for (const [bucketName, bucket] of Object.entries(packet.facts)) {
    for (const profileId of bucket.source_profile_ids) {
      if (!sourceProfileIds.has(profileId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facts', bucketName, 'source_profile_ids'],
          message: `fact source profile ${profileId} is absent from source_profiles.`,
        });
      }
    }
    if (
      bucket.items.length === 0 &&
      bucket.source_profile_ids.length === 0 &&
      packet.status !== 'pass' &&
      bucket.no_go_reasons.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facts', bucketName, 'no_go_reasons'],
        message: 'empty non-pass fact buckets must include an explicit no-go reason.',
      });
    }
  }
});
export type GrowthProviderContextPacket = z.infer<
  typeof GrowthProviderContextPacketSchema
>;

export const GrowthProviderContextPacketInputSchema = GrowthProviderContextPacketSchema;
export type GrowthProviderContextPacketInput = z.infer<
  typeof GrowthProviderContextPacketInputSchema
>;
