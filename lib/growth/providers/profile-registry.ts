import type { GrowthProvider } from "@bukeer/website-contract";

export type ProviderProfilePriority = "P0" | "P1";

export type ProviderProfileAutonomy =
  | "automatic"
  | "automatic_read_only"
  | "automatic_follow_up"
  | "cost_gated_automatic"
  | "approval_gated"
  | "explicit_cost_approval"
  | "human_initiated";

export type ProviderProfileCostMode =
  | "free_read_only"
  | "low_cost"
  | "cost_gated"
  | "approval_required"
  | "opt_in_cost_gated";

export interface ProviderProfileCadence {
  interval:
    | "immediate"
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "on_demand";
  description: string;
  freshnessTtlHours: number;
}

export interface ProviderProfileApprovalMetadata {
  required: boolean;
  ownerIssueRequired: boolean;
  costEstimateRequired: boolean;
  scopeRequired: boolean;
  expiresAtRequired: boolean;
  allowedApproverRoles: Array<"owner" | "admin" | "growth_owner">;
}

export interface ProviderProfileCircuitBreakerMetadata {
  consecutiveFailureLimit: number;
  quotaStatus: "quota_exhausted";
  costStatus: "cost_gated";
  providerErrorStatus: "blocked_provider_error";
  cooldownHours: number;
}

export interface GrowthProviderProfileDefinition {
  provider: GrowthProvider;
  profileId: string;
  profileType: string;
  priority: ProviderProfilePriority;
  source: string;
  cadence: ProviderProfileCadence;
  autonomy: ProviderProfileAutonomy;
  costMode: ProviderProfileCostMode;
  defaultMarkets: string[];
  outputProfileTypes: string[];
  approval: ProviderProfileApprovalMetadata;
  circuitBreaker: ProviderProfileCircuitBreakerMetadata;
}

const DEFAULT_CIRCUIT_BREAKER: ProviderProfileCircuitBreakerMetadata = {
  consecutiveFailureLimit: 3,
  quotaStatus: "quota_exhausted",
  costStatus: "cost_gated",
  providerErrorStatus: "blocked_provider_error",
  cooldownHours: 24,
};

const AUTOMATIC_APPROVAL: ProviderProfileApprovalMetadata = {
  required: false,
  ownerIssueRequired: false,
  costEstimateRequired: false,
  scopeRequired: true,
  expiresAtRequired: false,
  allowedApproverRoles: ["owner", "admin", "growth_owner"],
};

const PAID_APPROVAL: ProviderProfileApprovalMetadata = {
  required: true,
  ownerIssueRequired: true,
  costEstimateRequired: true,
  scopeRequired: true,
  expiresAtRequired: true,
  allowedApproverRoles: ["owner", "admin", "growth_owner"],
};

export const GROWTH_PROVIDER_PROFILE_REGISTRY = [
  {
    provider: "dataforseo",
    profileId: "dfs_onpage_full_comparable_v3",
    profileType: "technical_onpage_profile",
    priority: "P0",
    source:
      "OnPage task/summary/pages/duplicate tags plus seo_audit_results/findings",
    cadence: {
      interval: "biweekly",
      description: "Biweekly or monthly full crawl; never weekly by default.",
      freshnessTtlHours: 24 * 30,
    },
    autonomy: "approval_gated",
    costMode: "approval_required",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["page_product", "technical_onpage_profile"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "dataforseo",
    profileId: "dfs_onpage_changed_urls_v1",
    profileType: "technical_onpage_profile",
    priority: "P0",
    source: "OnPage changed URL follow-up and post-apply validation tasks",
    cadence: {
      interval: "weekly",
      description: "Weekly only for Growth OS changed URLs or active alerts.",
      freshnessTtlHours: 24 * 14,
    },
    autonomy: "automatic_follow_up",
    costMode: "cost_gated",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["page_product", "technical_onpage_profile"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "dataforseo",
    profileId: "dfs_serp_labs_primary_v1",
    profileType: "seo_market_profile",
    priority: "P0",
    source: "SERP organic advanced, local/maps, Labs keyword/domain data",
    cadence: {
      interval: "biweekly",
      description: "Biweekly for approved primary markets CO/US/MX.",
      freshnessTtlHours: 24 * 21,
    },
    autonomy: "cost_gated_automatic",
    costMode: "cost_gated",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["seo_market", "competitor"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "dataforseo",
    profileId: "dfs_serp_labs_secondary_v1",
    profileType: "seo_market_profile",
    priority: "P0",
    source: "SERP and Labs keyword/domain data for secondary markets",
    cadence: {
      interval: "monthly",
      description: "Monthly for approved secondary markets.",
      freshnessTtlHours: 24 * 35,
    },
    autonomy: "cost_gated_automatic",
    costMode: "cost_gated",
    defaultMarkets: ["CA", "EU", "OTHER"],
    outputProfileTypes: ["seo_market", "competitor"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "dataforseo",
    profileId: "dfs_historical_trends_v1",
    profileType: "historical_trend_profile",
    priority: "P0",
    source: "Historical SERP, historical ranked keywords, keyword trends",
    cadence: {
      interval: "monthly",
      description: "Monthly or quarterly for approved keyword/page sets only.",
      freshnessTtlHours: 24 * 95,
    },
    autonomy: "explicit_cost_approval",
    costMode: "opt_in_cost_gated",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["seo_market"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "dataforseo",
    profileId: "dfs_authority_fallback_v1",
    profileType: "authority_profile",
    priority: "P1",
    source: "Labs/domain-intersection and traffic-estimate authority fallback",
    cadence: {
      interval: "monthly",
      description: "Monthly while Backlinks access is blocked.",
      freshnessTtlHours: 24 * 45,
    },
    autonomy: "cost_gated_automatic",
    costMode: "cost_gated",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["competitor", "authority_profile"],
    approval: PAID_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "gsc",
    profileId: "gsc_growth_minimum_v1",
    profileType: "search_demand_profile",
    priority: "P0",
    source: "Search Analytics query/page/date",
    cadence: {
      interval: "weekly",
      description: "Weekly before Growth Council; optional daily anomaly window.",
      freshnessTtlHours: 24 * 8,
    },
    autonomy: "automatic_read_only",
    costMode: "free_read_only",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["seo_market", "page_product"],
    approval: AUTOMATIC_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "gsc",
    profileId: "gsc_indexability_v1",
    profileType: "indexability_profile",
    priority: "P0",
    source: "URL Inspection, Sitemaps and Sites",
    cadence: {
      interval: "weekly",
      description: "Post publish/apply plus weekly top-50 sample.",
      freshnessTtlHours: 24 * 8,
    },
    autonomy: "automatic_read_only",
    costMode: "free_read_only",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["page_product", "technical_onpage_profile"],
    approval: AUTOMATIC_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "ga4",
    profileId: "ga4_growth_minimum_v1",
    profileType: "page_performance_profile",
    priority: "P0",
    source: "Data API runReport landing/channel/source/medium/page",
    cadence: {
      interval: "weekly",
      description: "Weekly before Growth Council; optional daily anomaly window.",
      freshnessTtlHours: 24 * 8,
    },
    autonomy: "automatic_read_only",
    costMode: "free_read_only",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["page_product", "risk_policy"],
    approval: AUTOMATIC_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "ga4",
    profileId: "ga4_admin_governance_v1",
    profileType: "activation_event_profile",
    priority: "P0",
    source: "Admin API key events, audiences, data streams and metadata",
    cadence: {
      interval: "weekly",
      description: "Weekly read-only governance against funnel_events.",
      freshnessTtlHours: 24 * 8,
    },
    autonomy: "automatic_read_only",
    costMode: "free_read_only",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["risk_policy"],
    approval: AUTOMATIC_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
  {
    provider: "clarity",
    profileId: "clarity_ux_friction_v1",
    profileType: "ux_friction_profile",
    priority: "P0",
    source: "Aggregate URL/device/country/source friction export; no recordings",
    cadence: {
      interval: "daily",
      description: "Daily targeted 1-3 day aggregate window within quota.",
      freshnessTtlHours: 24 * 4,
    },
    autonomy: "automatic",
    costMode: "low_cost",
    defaultMarkets: ["CO", "US", "MX"],
    outputProfileTypes: ["page_product"],
    approval: AUTOMATIC_APPROVAL,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  },
] as const satisfies readonly GrowthProviderProfileDefinition[];

export type GrowthProviderProfileId =
  (typeof GROWTH_PROVIDER_PROFILE_REGISTRY)[number]["profileId"];

export function getGrowthProviderProfile(
  profileId: string,
): GrowthProviderProfileDefinition | undefined {
  return GROWTH_PROVIDER_PROFILE_REGISTRY.find(
    (profile) => profile.profileId === profileId,
  );
}

export function listGrowthProviderProfiles(
  provider?: GrowthProvider,
): readonly GrowthProviderProfileDefinition[] {
  if (!provider) return GROWTH_PROVIDER_PROFILE_REGISTRY;
  return GROWTH_PROVIDER_PROFILE_REGISTRY.filter(
    (profile) => profile.provider === provider,
  );
}
