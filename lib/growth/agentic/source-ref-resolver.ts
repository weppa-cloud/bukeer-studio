export type SourceRefResolutionStatus =
  | "VERIFIED_FACT_REF"
  | "VERIFIED_EXTERNAL_REF"
  | "UNRESOLVED_PROVIDER_CACHE_REF"
  | "INVALID_OR_STALE_REF";

export type SourceRefFreshnessStatus = "fresh" | "stale" | "unknown";
export type SourceRefPolicyStatus = "allowed" | "blocked" | "unknown";
export type SourceRefLocaleMarketStatus = "exact" | "explicit_fallback" | "blocked";

export type SourceRefExternalMatch = {
  provider?: string;
  cache_table?: string;
  cache_key?: string;
  observed_at?: string;
};

export type SourceRefResolutionInput = {
  source_ref: string | Record<string, unknown> | null | undefined;
  source_locale: string;
  target_locale?: string;
  market: string;
  expected_target_locale?: string;
  expected_market?: string;
  allowed_fallback?: boolean;
  observed_at?: string;
  now?: Date;
  max_age_days?: number;
  policy_allowed?: boolean;
  known_fact_ids?: Set<string> | string[];
  external_match?: SourceRefExternalMatch | null;
};

export type SourceRefResolutionResult = {
  status: SourceRefResolutionStatus;
  source_ref_raw: unknown;
  source_fact_id?: string;
  external_ref?: SourceRefExternalMatch;
  freshness_status: SourceRefFreshnessStatus;
  policy_status: SourceRefPolicyStatus;
  locale_market_status: SourceRefLocaleMarketStatus;
  reasons: string[];
};

const FACT_REF_PREFIX = "growth_signal_facts:";

function normalizeKnownFactIds(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

function classifyLocaleMarket(input: SourceRefResolutionInput): SourceRefLocaleMarketStatus {
  const targetLocale = input.target_locale ?? input.expected_target_locale;
  const expectedLocale = input.expected_target_locale ?? targetLocale;
  const expectedMarket = input.expected_market ?? input.market;

  if (!targetLocale || !input.market || !expectedLocale || !expectedMarket) {
    return "blocked";
  }

  if (targetLocale === expectedLocale && input.market === expectedMarket) {
    return "exact";
  }

  return input.allowed_fallback ? "explicit_fallback" : "blocked";
}

function classifyFreshness(input: SourceRefResolutionInput): SourceRefFreshnessStatus {
  if (!input.observed_at || !input.max_age_days) return "unknown";

  const observed = Date.parse(input.observed_at);
  if (Number.isNaN(observed)) return "unknown";

  const now = input.now ?? new Date();
  const ageMs = now.getTime() - observed;
  const maxAgeMs = input.max_age_days * 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs ? "fresh" : "stale";
}

function classifyPolicy(input: SourceRefResolutionInput): SourceRefPolicyStatus {
  if (typeof input.policy_allowed !== "boolean") return "unknown";
  return input.policy_allowed ? "allowed" : "blocked";
}

function stringifyRef(ref: SourceRefResolutionInput["source_ref"]): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return ref.trim() || null;
  if (typeof ref === "object") {
    const possible = ref["source_fact_id"] ?? ref["fact_id"] ?? ref["source_ref"] ?? ref["ref"];
    return typeof possible === "string" && possible.trim() ? possible.trim() : null;
  }
  return null;
}

function extractFactId(ref: string): string | null {
  if (!ref.startsWith(FACT_REF_PREFIX)) return null;
  const id = ref.slice(FACT_REF_PREFIX.length).trim();
  return id || null;
}

function isProviderCacheRef(ref: string): boolean {
  return ref.startsWith("provider:") || ref.startsWith("cache:");
}

export function resolveSourceRefDryRun(input: SourceRefResolutionInput): SourceRefResolutionResult {
  const reasons: string[] = [];
  const raw = input.source_ref;
  const ref = stringifyRef(input.source_ref);
  const freshness_status = classifyFreshness(input);
  const policy_status = classifyPolicy(input);
  const locale_market_status = classifyLocaleMarket(input);
  const knownFactIds = normalizeKnownFactIds(input.known_fact_ids);

  if (!ref) {
    return {
      status: "INVALID_OR_STALE_REF",
      source_ref_raw: raw,
      freshness_status,
      policy_status,
      locale_market_status,
      reasons: ["missing_source_ref"],
    };
  }

  if (locale_market_status === "blocked") reasons.push("locale_market_blocked");
  if (policy_status === "blocked") reasons.push("policy_blocked");
  if (freshness_status === "stale") reasons.push("stale_source_ref");

  const factId = extractFactId(ref);
  if (factId) {
    if (!knownFactIds.has(factId)) {
      return {
        status: "INVALID_OR_STALE_REF",
        source_ref_raw: raw,
        source_fact_id: factId,
        freshness_status,
        policy_status,
        locale_market_status,
        reasons: [...reasons, "fact_ref_not_verified"],
      };
    }

    if (reasons.length > 0 || freshness_status !== "fresh" || policy_status !== "allowed") {
      return {
        status: "INVALID_OR_STALE_REF",
        source_ref_raw: raw,
        source_fact_id: factId,
        freshness_status,
        policy_status,
        locale_market_status,
        reasons: [
          ...reasons,
          ...(freshness_status === "unknown" ? ["freshness_unknown"] : []),
          ...(policy_status === "unknown" ? ["policy_unknown"] : []),
        ],
      };
    }

    return {
      status: "VERIFIED_FACT_REF",
      source_ref_raw: raw,
      source_fact_id: factId,
      freshness_status,
      policy_status,
      locale_market_status,
      reasons: ["verified_fact_ref"],
    };
  }

  if (isProviderCacheRef(ref)) {
    if (input.external_match) {
      return {
        status: "VERIFIED_EXTERNAL_REF",
        source_ref_raw: raw,
        external_ref: input.external_match,
        freshness_status,
        policy_status,
        locale_market_status,
        reasons: [...reasons, "external_ref_verified_but_not_fact_ref"],
      };
    }

    return {
      status: "UNRESOLVED_PROVIDER_CACHE_REF",
      source_ref_raw: raw,
      freshness_status,
      policy_status,
      locale_market_status,
      reasons: [...reasons, "provider_cache_ref_without_fact_mapping"],
    };
  }

  return {
    status: "INVALID_OR_STALE_REF",
    source_ref_raw: raw,
    freshness_status,
    policy_status,
    locale_market_status,
    reasons: [...reasons, "unsupported_source_ref_format"],
  };
}

export function canUseSourceRefForAutonomousContext(result: SourceRefResolutionResult): boolean {
  return (
    result.status === "VERIFIED_FACT_REF" &&
    result.freshness_status === "fresh" &&
    result.policy_status === "allowed" &&
    (result.locale_market_status === "exact" || result.locale_market_status === "explicit_fallback")
  );
}
