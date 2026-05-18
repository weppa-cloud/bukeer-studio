import {
  resolveSourceRefDryRun,
  type SourceRefResolutionInput,
  type SourceRefResolutionResult,
} from "@/lib/growth/agentic/source-ref-resolver";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProfileRunSample = {
  run_id: string;
  profile_type: string;
  provider: string;
  locale: string;
  market: string;
  source_refs: (string | Record<string, unknown> | null)[];
  observed_at?: string;
  policy_allowed?: boolean;
  freshness_status?: string;
};

export type CandidateFactMapping = {
  profile_type: string;
  provider: string;
  source_ref_raw: unknown;
  resolution: SourceRefResolutionResult;
  suggested_fact_type: string;
  mapped: boolean;
};

export type MissingFactCandidate = {
  profile_type: string;
  provider: string;
  suggested_fact_type: string;
  reason: string;
};

export type ProfileRefEvaluation = {
  run_id: string;
  profile_type: string;
  provider: string;
  locale: string;
  market: string;
  refs_resolved: SourceRefResolutionResult[];
  candidate_mappings: CandidateFactMapping[];
  fully_resolved: boolean;
  block_reasons: string[];
};

export type SourceTruthReadinessReport = {
  website_id: string;
  tenant: string;
  target_locale: string;
  target_market: string;
  source_locale: string;
  source_market: string;
  profiles_evaluated: ProfileRefEvaluation[];
  total_refs: number;
  verified_fact_refs: number;
  verified_external_refs: number;
  unresolved_provider_cache_refs: number;
  invalid_or_stale_refs: number;
  missing_fact_candidates: MissingFactCandidate[];
  ready: boolean;
  blockers: string[];
};

// ─── Profile type → suggested fact type mapping ─────────────────────────────

const PROFILE_TYPE_TO_FACT: Record<string, string> = {
  gsc_growth_minimum_v1: "search_demand_metrics",
  gsc_indexability_v1: "indexability_status",
  gsc_query_performance_v1: "query_performance",
  ga4_growth_minimum_v1: "conversion_signals",
  ga4_admin_governance_v1: "admin_governance",
  dfs_onpage_full_comparable_v3: "onpage_tech_issues",
  dfs_onpage_changed_urls_v1: "url_change_log",
  dfs_serp_labs_primary_v1: "serp_landscape",
  dfs_serp_labs_secondary_v1: "serp_landscape_secondary",
  clarity_ux_friction_v1: "ux_friction_signals",
  transcreation_agent: "transcreation_content",
};

const DEFAULT_FACT_TYPE = "generic_profile_fact";

function suggestedFactType(profileType: string): string {
  return PROFILE_TYPE_TO_FACT[profileType] ?? `${profileType}_${DEFAULT_FACT_TYPE}`;
}

// ─── Helper: build resolution options for each ref ──────────────────────────

function buildResolutionOptions(
  sample: ProfileRunSample,
  ref: string | Record<string, unknown> | null,
  knownFactIds: Set<string>,
  targetLocale: string,
  targetMarket: string,
): SourceRefResolutionInput {
  return {
    source_ref: ref,
    source_locale: sample.locale,
    target_locale: sample.locale,
    market: sample.market,
    expected_target_locale: targetLocale,
    expected_market: targetMarket,
    allowed_fallback: false,
    observed_at: sample.observed_at,
    max_age_days: 30,
    policy_allowed: sample.policy_allowed ?? true,
    known_fact_ids: knownFactIds,
  };
}

// ─── Dry-run normalizer ─────────────────────────────────────────────────────

/**
 * Evaluate a batch of existing profile runs for source-truth readiness.
 *
 * Phase A (dry-run):
 * - Resolves every source_ref in every profile run.
 * - Classifies results (verified, unresolved, invalid).
 * - Identifies candidate fact mappings for provider/cache refs.
 * - Produces a readiness report with precise blockers.
 * - Does NOT write to any database or call any provider.
 */
export function evaluateSourceTruthDryRun(
  websiteId: string,
  tenant: string,
  targetLocale: string,
  targetMarket: string,
  sourceLocale: string,
  sourceMarket: string,
  profileSamples: ProfileRunSample[],
  knownFactIds: string[] = [],
): SourceTruthReadinessReport {
  const blockers: string[] = [];
  const profilesEvaluated: ProfileRefEvaluation[] = [];
  const missingFactCandidates: MissingFactCandidate[] = [];

  const factIdSet = new Set(knownFactIds);

  let totalRefs = 0;
  let verifiedFactRefs = 0;
  let verifiedExternalRefs = 0;
  let unresolvedProviderCacheRefs = 0;
  let invalidOrStale = 0;

  for (const sample of profileSamples) {
    const resolutions: SourceRefResolutionResult[] = [];
    const candidateMappings: CandidateFactMapping[] = [];
    const blockReasons: string[] = [];

    const refs = sample.source_refs ?? [];

    for (const ref of refs) {
      totalRefs++;
      const options = buildResolutionOptions(sample, ref, factIdSet, targetLocale, targetMarket);
      const result = resolveSourceRefDryRun(options);

      resolutions.push(result);

      if (result.status === "VERIFIED_FACT_REF") {
        verifiedFactRefs++;
      } else if (result.status === "VERIFIED_EXTERNAL_REF") {
        verifiedExternalRefs++;
      } else if (result.status === "UNRESOLVED_PROVIDER_CACHE_REF") {
        unresolvedProviderCacheRefs++;
        // Record candidate fact mapping suggestion
        const factType = suggestedFactType(sample.profile_type);
        candidateMappings.push({
          profile_type: sample.profile_type,
          provider: sample.provider,
          source_ref_raw: result.source_ref_raw,
          resolution: result,
          suggested_fact_type: factType,
          mapped: false,
        });
        const key = `${sample.provider}:${sample.profile_type}->${factType}`;
        if (
          !missingFactCandidates.some(
            (m) => `${m.provider}:${m.profile_type}->${m.suggested_fact_type}` === key,
          )
        ) {
          missingFactCandidates.push({
            profile_type: sample.profile_type,
            provider: sample.provider,
            suggested_fact_type: factType,
            reason: `Unresolved provider/cache ref needs mapping to growth_signal_facts with type '${factType}'`,
          });
        }
      } else {
        invalidOrStale++;
      }

      blockReasons.push(...result.reasons);
    }

    const fullyResolved = resolutions.every(
      (r) => r.status === "VERIFIED_FACT_REF" || r.status === "VERIFIED_EXTERNAL_REF",
    );
    if (!fullyResolved) {
      const unresolvedCount = resolutions.filter(
        (r) => r.status !== "VERIFIED_FACT_REF" && r.status !== "VERIFIED_EXTERNAL_REF",
      ).length;
      blockers.push(
        `profile_run:${sample.run_id} (${sample.profile_type}) — ${unresolvedCount}/${resolutions.length} refs unresolved`,
      );
    }

    profilesEvaluated.push({
      run_id: sample.run_id,
      profile_type: sample.profile_type,
      provider: sample.provider,
      locale: sample.locale,
      market: sample.market,
      refs_resolved: resolutions,
      candidate_mappings: candidateMappings,
      fully_resolved: fullyResolved,
      block_reasons: blockReasons,
    });
  }

  // Locale/market gap: no pt-BR/BR profiles at all
  const hasTargetLocaleProfiles = profileSamples.some(
    (s) => s.locale === targetLocale && s.market === targetMarket,
  );
  if (!hasTargetLocaleProfiles) {
    blockers.push(
      `No existing profiles for target locale/market: ${targetLocale}/${targetMarket}. All profile data is from source locale/market (${sourceLocale}/${sourceMarket}).`,
    );
  }

  // No known facts for target
  if (factIdSet.size === 0) {
    blockers.push(
      "No known growth_signal_fact IDs provided. Zero facts can be verified in the VERIFIED_FACT_REF state.",
    );
  }

  const ready = blockers.length === 0;

  return {
    website_id: websiteId,
    tenant,
    target_locale: targetLocale,
    target_market: targetMarket,
    source_locale: sourceLocale,
    source_market: sourceMarket,
    profiles_evaluated: profilesEvaluated,
    total_refs: totalRefs,
    verified_fact_refs: verifiedFactRefs,
    verified_external_refs: verifiedExternalRefs,
    unresolved_provider_cache_refs: unresolvedProviderCacheRefs,
    invalid_or_stale_refs: invalidOrStale,
    missing_fact_candidates: missingFactCandidates,
    ready,
    blockers,
  };
}

// ─── Helper functions for report analysis ───────────────────────────────────

/**
 * Check whether a readiness report allows autonomous context processing.
 */
export function isReadyForAutonomousContext(report: SourceTruthReadinessReport): boolean {
  return report.ready;
}

/**
 * Produce a human-readable summary of the readiness report.
 */
export function summarizeReadiness(report: SourceTruthReadinessReport): string {
  const lines: string[] = [];
  lines.push(`Source Truth Readiness — ${report.tenant}`);
  lines.push("");
  lines.push(
    `  Route: ${report.source_locale}/${report.source_market} → ${report.target_locale}/${report.target_market}`,
  );
  lines.push(`  Profiles evaluated: ${report.profiles_evaluated.length}`);
  lines.push(`  Total refs: ${report.total_refs}`);
  lines.push(`  VERIFIED_FACT_REF: ${report.verified_fact_refs}`);
  lines.push(`  VERIFIED_EXTERNAL_REF: ${report.verified_external_refs}`);
  lines.push(`  UNRESOLVED_PROVIDER_CACHE_REF: ${report.unresolved_provider_cache_refs}`);
  lines.push(`  INVALID_OR_STALE_REF: ${report.invalid_or_stale_refs}`);
  lines.push(`  Missing fact mapping candidates: ${report.missing_fact_candidates.length}`);
  lines.push(`  Ready for autonomous context: ${report.ready ? "YES" : "NO"}`);
  if (report.blockers.length > 0) {
    lines.push("");
    lines.push(`  Blockers (${report.blockers.length}):`);
    for (const b of report.blockers) {
      lines.push(`    • ${b}`);
    }
  }
  return lines.join("\n");
}
