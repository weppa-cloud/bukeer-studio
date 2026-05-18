export type ProviderNormalizationSliceInput = {
  tenant: string;
  website_id: string;
  source_locale: string;
  source_market: string;
  target_locale: string;
  target_market: string;
  entity_path: string;
  entity_table?: string;
  provider: string;
  provider_profile_id: string;
  observed_at?: string;
  existing_source_fact_ids?: string[];
  provider_lineage_refs?: Array<Record<string, unknown>>;
  policy_allowed?: boolean;
};

export type ProviderNormalizationVerdict =
  | "READY_FOR_CONTROLLED_WRITE_GATE"
  | "BLOCKED_WITH_PRECISE_DATA_NEED";

export type CandidateGrowthSignalFact = {
  website_id: string;
  locale: string;
  market: string;
  source: string;
  signal_type: string;
  entity_table: string;
  entity_path: string;
  observed_at?: string;
  payload: Record<string, unknown>;
  provider_profile_id: string;
  idempotency_key: string;
};

export type CandidateGrowthSourceRef = {
  website_id: string;
  locale: string;
  market: string;
  source_fact_ref?: string;
  provider_lineage_refs: Array<Record<string, unknown>>;
  status: "candidate_only" | "blocked_no_fact_ref";
  reason: string;
};

export type ProviderNormalizationSliceReport = {
  tenant: string;
  website_id: string;
  route: string;
  entity_path: string;
  provider: string;
  provider_profile_id: string;
  verdict: ProviderNormalizationVerdict;
  candidate_fact: CandidateGrowthSignalFact;
  candidate_source_ref: CandidateGrowthSourceRef;
  blockers: string[];
  allowed_next_action: "controlled_write_gate" | "collect_or_normalize_fact_first";
};

function stableIdempotencyKey(input: ProviderNormalizationSliceInput): string {
  return [
    "growth-provider-normalization",
    input.website_id,
    input.target_locale,
    input.target_market,
    input.entity_path,
    input.provider,
    input.provider_profile_id,
  ]
    .join(":")
    .replace(/\s+/g, "_");
}

function inferSignalType(input: ProviderNormalizationSliceInput): string {
  if (input.provider === "dataforseo") return "seo_provider_normalized_signal";
  if (input.provider === "gsc") return "search_console_normalized_signal";
  if (input.provider === "ga4") return "analytics_normalized_signal";
  if (input.provider === "clarity") return "ux_friction_normalized_signal";
  return "provider_normalized_signal";
}

export function buildProviderNormalizationSliceDryRun(
  input: ProviderNormalizationSliceInput,
): ProviderNormalizationSliceReport {
  const blockers: string[] = [];
  const policyAllowed = input.policy_allowed ?? false;
  const knownFacts = input.existing_source_fact_ids ?? [];
  const lineage = input.provider_lineage_refs ?? [];

  if (!policyAllowed) blockers.push("provider_policy_not_explicitly_allowed");
  if (input.target_locale !== "pt-BR" || input.target_market !== "BR") {
    blockers.push("target_locale_market_not_colombiatours_ptbr_slice");
  }
  if (lineage.length === 0) blockers.push("missing_provider_lineage_evidence");
  if (knownFacts.length === 0) blockers.push("missing_verified_target_growth_signal_fact_id");

  const candidate_fact: CandidateGrowthSignalFact = {
    website_id: input.website_id,
    locale: input.target_locale,
    market: input.target_market,
    source: input.provider,
    signal_type: inferSignalType(input),
    entity_table: input.entity_table ?? "website_pages",
    entity_path: input.entity_path,
    observed_at: input.observed_at,
    provider_profile_id: input.provider_profile_id,
    idempotency_key: stableIdempotencyKey(input),
    payload: {
      dry_run: true,
      source_locale: input.source_locale,
      source_market: input.source_market,
      provider_profile_id: input.provider_profile_id,
      provider_lineage_refs: lineage,
      note: "candidate shape only; not inserted by dry-run normalizer",
    },
  };

  const sourceFactId = knownFacts[0];
  const candidate_source_ref: CandidateGrowthSourceRef = sourceFactId
    ? {
        website_id: input.website_id,
        locale: input.target_locale,
        market: input.target_market,
        source_fact_ref: `growth_signal_facts:${sourceFactId}`,
        provider_lineage_refs: lineage,
        status: "candidate_only",
        reason: "fact-level ref is available but still requires controlled write gate",
      }
    : {
        website_id: input.website_id,
        locale: input.target_locale,
        market: input.target_market,
        provider_lineage_refs: lineage,
        status: "blocked_no_fact_ref",
        reason: "provider/cache lineage cannot be upgraded without a verified growth_signal_facts id",
      };

  const verdict: ProviderNormalizationVerdict = blockers.length === 0
    ? "READY_FOR_CONTROLLED_WRITE_GATE"
    : "BLOCKED_WITH_PRECISE_DATA_NEED";

  return {
    tenant: input.tenant,
    website_id: input.website_id,
    route: `${input.source_locale}/${input.source_market} → ${input.target_locale}/${input.target_market}`,
    entity_path: input.entity_path,
    provider: input.provider,
    provider_profile_id: input.provider_profile_id,
    verdict,
    candidate_fact,
    candidate_source_ref,
    blockers,
    allowed_next_action: verdict === "READY_FOR_CONTROLLED_WRITE_GATE"
      ? "controlled_write_gate"
      : "collect_or_normalize_fact_first",
  };
}

export function summarizeProviderNormalizationSlice(report: ProviderNormalizationSliceReport): string {
  const lines = [
    `Provider Normalization Slice — ${report.tenant}`,
    `  Route: ${report.route}`,
    `  Entity: ${report.entity_path}`,
    `  Provider: ${report.provider}/${report.provider_profile_id}`,
    `  Verdict: ${report.verdict}`,
    `  Source ref status: ${report.candidate_source_ref.status}`,
    `  Allowed next action: ${report.allowed_next_action}`,
  ];
  if (report.blockers.length > 0) {
    lines.push("  Blockers:");
    for (const blocker of report.blockers) lines.push(`    • ${blocker}`);
  }
  return lines.join("\n");
}
