import {
  buildGovernedProviderRunnerDryRun,
  type GovernedProviderPolicy,
  type GovernedProviderRunnerReport,
} from "./governed-provider-runner";

export type DataForSeoReadonlyEvidenceRow = {
  entity_path: string;
  observed_at: string;
  feature_profile: string;
  provider_payload: Record<string, unknown>;
  lineage_ref: string;
};

export type DataForSeoReadonlyAdapterInput = {
  tenant: string;
  account_id: string;
  website_id: string;
  source_locale?: string;
  source_market?: string;
  target_locale: string;
  target_market: string;
  provider_profile_type: string;
  provider_profile_id?: string;
  policy?: GovernedProviderPolicy | null;
  rows: DataForSeoReadonlyEvidenceRow[];
  max_entities?: number;
  existing_target_fact_ids_by_entity?: Record<string, string[]>;
};

export type DataForSeoReadonlyAdapterReport = {
  provider: "dataforseo";
  provider_profile_type: string;
  source: "dataforseo_cached_evidence";
  evidence_rows: DataForSeoReadonlyEvidenceRow[];
  runner_report: GovernedProviderRunnerReport;
  can_call_provider: false;
  can_write_database: false;
  can_publish: false;
};

export function buildDataForSeoReadonlyAdapterDryRun(
  input: DataForSeoReadonlyAdapterInput,
): DataForSeoReadonlyAdapterReport {
  const evidenceRows = input.rows.slice(0, input.max_entities ?? input.rows.length);
  const runnerReport = buildGovernedProviderRunnerDryRun({
    tenant: input.tenant,
    account_id: input.account_id,
    website_id: input.website_id,
    provider: "dataforseo",
    provider_profile_type: input.provider_profile_type,
    provider_profile_id: input.provider_profile_id ?? `dataforseo/${input.provider_profile_type}`,
    source_locale: input.source_locale,
    source_market: input.source_market,
    target_locale: input.target_locale,
    target_market: input.target_market,
    policy: input.policy,
    evidence_rows: evidenceRows,
    existing_target_fact_ids_by_entity: input.existing_target_fact_ids_by_entity,
    max_rows: input.max_entities,
    now: evidenceRows[0]?.observed_at,
  });

  return {
    provider: "dataforseo",
    provider_profile_type: input.provider_profile_type,
    source: "dataforseo_cached_evidence",
    evidence_rows: evidenceRows,
    runner_report: runnerReport,
    can_call_provider: false,
    can_write_database: false,
    can_publish: false,
  };
}
