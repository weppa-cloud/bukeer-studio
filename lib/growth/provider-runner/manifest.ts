import { z } from 'zod';
import type { GrowthProviderRunnerProfileManifest, ProviderId } from './types';

type RegistryProfile = {
  id: string;
  provider: ProviderId;
  family: string;
  priority: GrowthProviderRunnerProfileManifest['priority'];
  cadence: GrowthProviderRunnerProfileManifest['cadence'];
  costClass: GrowthProviderRunnerProfileManifest['cost_policy']['cost_class'];
  approval: string;
  rawCache?: GrowthProviderRunnerProfileManifest['cache_target'];
  factTargets?: string[];
  ownerIssues?: string[];
  status: GrowthProviderRunnerProfileManifest['status'];
  extractionScripts?: string[];
  normalizerScripts?: string[];
};

const registryProfiles: RegistryProfile[] = [
  {
    id: 'gsc_daily_complete_web_v1',
    provider: 'gsc',
    family: 'search_console',
    priority: 'P0',
    cadence: 'daily',
    costClass: 'free',
    approval: 'automatic',
    rawCache: 'growth_gsc_cache',
    factTargets: ['seo_gsc_daily_facts'],
    ownerIssues: ['#378', '#321'],
    status: 'partial',
    extractionScripts: ['scripts/seo/populate-growth-google-cache.ts'],
    normalizerScripts: ['scripts/seo/normalize-growth-gsc-cache.mjs'],
  },
  {
    id: 'ga4_daily_web_traffic_v1',
    provider: 'ga4',
    family: 'analytics',
    priority: 'P0',
    cadence: 'daily',
    costClass: 'free',
    approval: 'automatic',
    rawCache: 'growth_ga4_cache',
    factTargets: ['seo_ga4_landing_daily_facts'],
    ownerIssues: ['#379', '#321'],
    status: 'partial',
    extractionScripts: ['scripts/seo/populate-growth-google-cache.ts'],
    normalizerScripts: ['scripts/seo/normalize-growth-ga4-cache.mjs'],
  },
  {
    id: 'ga4_daily_landing_channel_v1',
    provider: 'ga4',
    family: 'analytics',
    priority: 'P0',
    cadence: 'daily',
    costClass: 'free',
    approval: 'automatic',
    rawCache: 'growth_ga4_cache',
    factTargets: ['seo_ga4_landing_daily_facts'],
    ownerIssues: ['#379', '#321'],
    status: 'partial',
    extractionScripts: ['scripts/seo/populate-growth-google-cache.ts'],
    normalizerScripts: ['scripts/seo/normalize-growth-ga4-cache.mjs'],
  },
  {
    id: 'dataforseo_serp_opportunity_v1',
    provider: 'dataforseo',
    family: 'serp_labs',
    priority: 'P0',
    cadence: 'weekly',
    costClass: 'paid_normal',
    approval: 'required_to_start',
    rawCache: 'growth_dataforseo_cache',
    factTargets: ['seo_serp_opportunity_facts'],
    ownerIssues: ['#600', '#321'],
    status: 'partial',
    extractionScripts: ['scripts/seo/run-dataforseo-max-performance-profiles.mjs'],
    normalizerScripts: ['scripts/seo/run-growth-joint-normalizers.mjs'],
  },
  {
    id: 'dfs_onpage_full_comparable_v3',
    provider: 'dataforseo',
    family: 'onpage',
    priority: 'P0',
    cadence: 'weekly',
    costClass: 'paid_normal',
    approval: 'required_to_start',
    rawCache: 'growth_dataforseo_cache',
    factTargets: ['seo_audit_results', 'seo_audit_findings'],
    ownerIssues: ['#312', '#313'],
    status: 'implemented',
    extractionScripts: [
      'scripts/seo/dataforseo-onpage-crawl.mjs',
      'scripts/seo/persist-dataforseo-onpage-artifact.mjs',
    ],
    normalizerScripts: [
      'scripts/seo/normalize-dataforseo-onpage.mjs',
      'scripts/seo/triage-dataforseo-findings.mjs',
    ],
  },
];

export const providerManifestSchema = z.object({
  profile_id: z.string().min(1),
  provider: z.enum(['dataforseo', 'gsc', 'ga4', 'clarity']),
  domain: z.enum(['seo', 'analytics', 'paid_media', 'ux', 'tracking', 'joint']),
  family: z.string().min(1),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  cadence: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'on_approval', 'continuous', 'no_default']),
  freshness_ttl_hours: z.number().int().positive().nullable(),
  cost_policy: z.object({
    cost_class: z.enum(['free', 'paid_normal', 'paid_heavy']),
    estimated_cost_usd: z.number().nonnegative().optional(),
    cost_requires_owner_issue: z.boolean(),
  }),
  approval_policy: z.object({
    mode: z.enum([
      'automatic_read_only',
      'required_to_start',
      'required_every_run',
      'profile_approved_scope_required',
      'blocked',
    ]),
    owner_issues: z.array(z.string()),
    approval_metadata_required: z.boolean(),
  }),
  runner_policy: z.object({
    mutation_allowed: z.literal(false),
    read_only: z.literal(true),
    dry_run_supported: z.literal(true),
    live_call_flag_required: z.literal(true),
    blocked_direct_consumers: z.array(z.string()),
  }),
  required_identifiers: z.array(z.enum(['website_id', 'account_id', 'site_url', 'ga4_property_id', 'provider_account_id', 'customer_id'])),
  cache_target: z.enum(['growth_gsc_cache', 'growth_ga4_cache', 'growth_dataforseo_cache', 'growth_profile_runs']).nullable(),
  extraction_scripts: z.array(z.string()),
  normalizer_scripts: z.array(z.string()),
  fact_outputs: z.array(z.string()),
  pii_policy: z.enum(['aggregate_only', 'redacted_rows_only', 'blocked_raw_pii']),
  status: z.enum(['implemented', 'partial', 'planned', 'excluded']),
});

export function getProviderProfileManifest(profileId: string): GrowthProviderRunnerProfileManifest {
  const profile = registryProfiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error(`Unknown provider runner profile: ${profileId}`);
  }
  return normalizeRegistryProfile(profile);
}

export function listProviderProfileManifests(): GrowthProviderRunnerProfileManifest[] {
  return registryProfiles.map(normalizeRegistryProfile);
}

function normalizeRegistryProfile(profile: RegistryProfile): GrowthProviderRunnerProfileManifest {
  const manifest: GrowthProviderRunnerProfileManifest = {
    profile_id: profile.id,
    provider: profile.provider,
    domain: domainForProvider(profile.provider, profile.family),
    family: profile.family,
    priority: profile.priority,
    cadence: profile.cadence,
    freshness_ttl_hours: ttlForCadence(profile.cadence),
    cost_policy: {
      cost_class: profile.costClass,
      estimated_cost_usd: profile.costClass === 'free' ? 0 : undefined,
      cost_requires_owner_issue: profile.costClass !== 'free',
    },
    approval_policy: {
      mode: approvalMode(profile),
      owner_issues: profile.ownerIssues ?? [],
      approval_metadata_required: profile.costClass !== 'free' || profile.approval !== 'automatic',
    },
    runner_policy: {
      mutation_allowed: false,
      read_only: true,
      dry_run_supported: true,
      live_call_flag_required: true,
      blocked_direct_consumers: ['worker', 'context_packet_consumer', 'growth_worker'],
    },
    required_identifiers: ['website_id', 'account_id'],
    cache_target: profile.rawCache ?? null,
    extraction_scripts: profile.extractionScripts ?? [],
    normalizer_scripts: profile.normalizerScripts ?? [],
    fact_outputs: profile.factTargets ?? [],
    pii_policy: 'aggregate_only',
    status: profile.status,
  };
  return providerManifestSchema.parse(manifest) as GrowthProviderRunnerProfileManifest;
}

function ttlForCadence(cadence: GrowthProviderRunnerProfileManifest['cadence']): number | null {
  const hours = {
    daily: 24,
    weekly: 168,
    biweekly: 336,
    monthly: 720,
    quarterly: 2160,
    on_approval: null,
    continuous: null,
    no_default: null,
  } satisfies Record<GrowthProviderRunnerProfileManifest['cadence'], number | null>;
  return hours[cadence];
}

function approvalMode(profile: RegistryProfile): GrowthProviderRunnerProfileManifest['approval_policy']['mode'] {
  if (profile.status === 'excluded' || profile.status === 'planned') return 'blocked';
  if (profile.approval === 'automatic' && profile.costClass === 'free') return 'automatic_read_only';
  if (profile.approval === 'required_to_start') return 'required_to_start';
  if (profile.approval === 'required_every_run') return 'required_every_run';
  return 'profile_approved_scope_required';
}

function domainForProvider(provider: ProviderId, family: string): GrowthProviderRunnerProfileManifest['domain'] {
  if (provider === 'ga4') return 'analytics';
  if (provider === 'clarity') return 'ux';
  if (family.includes('paid')) return 'paid_media';
  return 'seo';
}
