export type GovernedProvider = "manual" | "dataforseo" | "gsc" | "ga4" | "clarity";

export type GovernedProviderPolicy = {
  provider: GovernedProvider | string;
  provider_profile_type: string;
  locale: string;
  market: string;
  consent_granted: boolean;
  data_usage_policy: "read_only" | "download" | "store_normalized" | string;
  enabled: boolean;
  rate_limit_daily: number;
};

export type GovernedProviderEvidenceRow = {
  entity_path: string;
  observed_at: string;
  provider_payload: Record<string, unknown>;
  lineage_ref: string;
};

export type GovernedProviderRunnerInput = {
  tenant: string;
  account_id: string;
  website_id: string;
  provider: GovernedProvider | string;
  provider_profile_type: string;
  provider_profile_id: string;
  source_locale?: string;
  source_market?: string;
  target_locale: string;
  target_market: string;
  policy?: GovernedProviderPolicy | null;
  evidence_rows: GovernedProviderEvidenceRow[];
  existing_target_fact_ids_by_entity?: Record<string, string[]>;
  now?: string;
  max_rows?: number;
};

export type GovernedProviderRunnerVerdict =
  | "READY_FOR_NORMALIZATION_WRITE_GATE"
  | "BLOCKED_BY_POLICY"
  | "BLOCKED_BY_EVIDENCE"
  | "BLOCKED_BY_LOCALE_MARKET";

export type GovernedProviderNormalizedFactCandidate = {
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  source: string;
  signal_type: string;
  entity_table: "website_pages";
  entity_path: string;
  observed_at: string;
  expires_at: string;
  confidence: number;
  payload: Record<string, unknown>;
  idempotency_key: string;
  provider_profile_id: string;
};

export type GovernedProviderSourceRefCandidate = {
  website_id: string;
  locale: string;
  market: string;
  entity_path: string;
  source: string;
  status: "ready_fact_ref" | "needs_fact_write";
  source_fact_ref?: string;
  lineage_ref: string;
  freshness_status: "fresh";
};

export type GovernedProviderRunnerReport = {
  tenant: string;
  route: string;
  provider: string;
  provider_profile_type: string;
  verdict: GovernedProviderRunnerVerdict;
  blockers: string[];
  allowed_operations: Array<"read_provider_evidence" | "normalize_to_candidates" | "write_gate_required">;
  normalized_fact_candidates: GovernedProviderNormalizedFactCandidate[];
  source_ref_candidates: GovernedProviderSourceRefCandidate[];
  can_call_provider: false;
  can_write_database: false;
  can_publish: false;
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function signalType(provider: string): string {
  if (provider === "dataforseo") return "seo_provider_normalized_signal";
  if (provider === "gsc") return "search_console_normalized_signal";
  if (provider === "ga4") return "analytics_normalized_signal";
  if (provider === "clarity") return "ux_friction_normalized_signal";
  if (provider === "manual") return "operator_normalized_page_source_truth";
  return "provider_normalized_signal";
}

function stableKey(input: GovernedProviderRunnerInput, entityPath: string): string {
  return [
    "governed-provider-runner",
    input.website_id,
    input.provider,
    input.provider_profile_type,
    input.target_locale,
    input.target_market,
    entityPath,
  ].join(":");
}

function policyAllowsStoreNormalized(input: GovernedProviderRunnerInput): boolean {
  const p = input.policy;
  if (!p) return false;
  return Boolean(
    p.enabled &&
      p.consent_granted &&
      p.provider === input.provider &&
      p.provider_profile_type === input.provider_profile_type &&
      p.locale === input.target_locale &&
      p.market === input.target_market &&
      p.data_usage_policy === "store_normalized" &&
      p.rate_limit_daily > 0,
  );
}

export function buildGovernedProviderRunnerDryRun(
  input: GovernedProviderRunnerInput,
): GovernedProviderRunnerReport {
  const blockers: string[] = [];
  const now = input.now ?? new Date().toISOString();
  const maxRows = input.max_rows ?? input.policy?.rate_limit_daily ?? 0;
  const exactPtBr = input.target_locale === "pt-BR" && input.target_market === "BR";

  if (!exactPtBr) blockers.push("target_locale_market_must_be_exact_pt-BR_BR");
  if (!policyAllowsStoreNormalized(input)) blockers.push("provider_policy_must_enable_store_normalized_with_consent");
  if (input.evidence_rows.length === 0) blockers.push("provider_evidence_rows_required");
  if (input.evidence_rows.length > maxRows) blockers.push("evidence_rows_exceed_policy_rate_limit");

  const allowedByPolicy = blockers.length === 0;
  const rows = allowedByPolicy ? input.evidence_rows : [];

  const normalized_fact_candidates = rows.map((row) => ({
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.target_locale,
    market: input.target_market,
    source: input.provider,
    signal_type: signalType(input.provider),
    entity_table: "website_pages" as const,
    entity_path: row.entity_path,
    observed_at: row.observed_at,
    expires_at: addDays(row.observed_at || now, 7),
    confidence: input.provider === "manual" ? 0.82 : 0.76,
    payload: {
      dry_run: true,
      provider: input.provider,
      provider_profile_type: input.provider_profile_type,
      provider_profile_id: input.provider_profile_id,
      source_locale: input.source_locale,
      source_market: input.source_market,
      target_locale: input.target_locale,
      target_market: input.target_market,
      lineage_ref: row.lineage_ref,
      provider_payload: row.provider_payload,
      write_gate_required: true,
    },
    idempotency_key: stableKey(input, row.entity_path),
    provider_profile_id: input.provider_profile_id,
  }));

  const existing = input.existing_target_fact_ids_by_entity ?? {};
  const source_ref_candidates = rows.map((row) => {
    const factId = existing[row.entity_path]?.[0];
    return {
      website_id: input.website_id,
      locale: input.target_locale,
      market: input.target_market,
      entity_path: row.entity_path,
      source: input.provider,
      status: factId ? "ready_fact_ref" as const : "needs_fact_write" as const,
      source_fact_ref: factId ? `growth_signal_facts:${factId}` : undefined,
      lineage_ref: row.lineage_ref,
      freshness_status: "fresh" as const,
    };
  });

  let verdict: GovernedProviderRunnerVerdict = "READY_FOR_NORMALIZATION_WRITE_GATE";
  if (blockers.includes("target_locale_market_must_be_exact_pt-BR_BR")) verdict = "BLOCKED_BY_LOCALE_MARKET";
  else if (blockers.includes("provider_policy_must_enable_store_normalized_with_consent")) verdict = "BLOCKED_BY_POLICY";
  else if (blockers.length > 0) verdict = "BLOCKED_BY_EVIDENCE";

  return {
    tenant: input.tenant,
    route: `${input.source_locale ?? "provider"}/${input.source_market ?? "provider"} → ${input.target_locale}/${input.target_market}`,
    provider: input.provider,
    provider_profile_type: input.provider_profile_type,
    verdict,
    blockers,
    allowed_operations: verdict === "READY_FOR_NORMALIZATION_WRITE_GATE"
      ? ["read_provider_evidence", "normalize_to_candidates", "write_gate_required"]
      : [],
    normalized_fact_candidates,
    source_ref_candidates,
    can_call_provider: false,
    can_write_database: false,
    can_publish: false,
  };
}

export function summarizeGovernedProviderRunner(report: GovernedProviderRunnerReport): string {
  const lines = [
    `Governed Provider Runner — ${report.tenant}`,
    `  Route: ${report.route}`,
    `  Provider: ${report.provider}/${report.provider_profile_type}`,
    `  Verdict: ${report.verdict}`,
    `  Candidates: ${report.normalized_fact_candidates.length}`,
    `  Source refs: ${report.source_ref_candidates.length}`,
    `  Can call provider: ${report.can_call_provider}`,
    `  Can write database: ${report.can_write_database}`,
    `  Can publish: ${report.can_publish}`,
  ];
  if (report.blockers.length > 0) {
    lines.push("  Blockers:");
    for (const blocker of report.blockers) lines.push(`    • ${blocker}`);
  }
  return lines.join("\n");
}
