import {
  buildGrowthFactoryContextPacket,
  runGrowthFactoryBatch,
  type GrowthFactoryBatchEntity,
  type GrowthFactoryCandidate,
  type GrowthFactoryEvidenceRow,
} from "./growth-factory-runner";
import { defaultSeoContentWorkerContract, validateGrowthWorkerContextPacketContract } from "./worker-contextpacket-contract";

export type GrowthSearchConsolePageMetric = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GrowthRecoveryCandidate = GrowthFactoryCandidate & {
  url: string;
  entity_path: string;
  baseline: GrowthSearchConsolePageMetric;
  current: GrowthSearchConsolePageMetric;
  lost_clicks: number;
  lost_impressions: number;
  ctr_delta: number;
  position_delta: number;
  recovery_priority_score: number;
};

export type GrowthProductionWorkerLane = {
  id: "data" | "brief_refresh_transcreation" | "review";
  lane: "orchestrator" | "content_creator" | "content_curator";
  agent_profile: string;
  mode: "observe_only" | "prepare_only";
  max_concurrent: number;
  allowed_action_class: "observe" | "prepare";
  responsibilities: string[];
  blocked_action_classes: ["content_publish", "paid_mutation", "outreach_send"];
};

export type GrowthPublishGatePacket = {
  gate_version: "growth-publish-gate-v0";
  mode: "dry_run";
  status: "blocked_until_human_approval";
  required_consistency_window: {
    min_change_sets: 30;
    max_change_sets_before_canary: 50;
  };
  required_checks: string[];
  forbidden_until_gate_passes: ["automatic_publish", "mass_transcreation", "paid_mutation"];
};

export type GrowthProductionQueueInput = {
  batch_id: string;
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  baseline_window: { start: string; end: string; label: string };
  current_window: { start: string; end: string; label: string };
  baseline_pages: GrowthSearchConsolePageMetric[];
  current_pages: GrowthSearchConsolePageMetric[];
  max_entities?: number;
};

export type GrowthProductionQueueReport = {
  runner_version: "growth-production-queue-runner-v0";
  batch_id: string;
  mode: "prepare_only";
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  recovery_candidates: GrowthRecoveryCandidate[];
  factory_entities: GrowthFactoryBatchEntity[];
  worker_lanes: GrowthProductionWorkerLane[];
  publish_gate: GrowthPublishGatePacket;
  ready_for_review_count: number;
  blocked_count: number;
};

function pathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function pct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function metricByUrl(metrics: GrowthSearchConsolePageMetric[]): Map<string, GrowthSearchConsolePageMetric> {
  return new Map(metrics.map((metric) => [metric.url, metric]));
}

function evidenceForRecoveryCandidate(
  input: GrowthProductionQueueInput,
  baseline: GrowthSearchConsolePageMetric,
  current: GrowthSearchConsolePageMetric,
  score: number,
): GrowthFactoryEvidenceRow[] {
  const entityPath = pathFromUrl(baseline.url);
  const lostClicks = Math.max(0, baseline.clicks - current.clicks);
  const lostImpressions = Math.max(0, baseline.impressions - current.impressions);
  const clicksDropPct = pct(lostClicks, baseline.clicks);
  const impressionsDropPct = pct(lostImpressions, baseline.impressions);

  return [
    {
      entity_path: entityPath,
      source: "gsc",
      signal_type: "gsc_recovery_page_delta",
      fact_id: `${input.batch_id}:${entityPath}:gsc-recovery-fact`,
      source_ref_id: `${input.batch_id}:${entityPath}:gsc-recovery-ref`,
      freshness_status: "fresh",
      payload: {
        baseline_window: input.baseline_window,
        current_window: input.current_window,
        baseline,
        current,
        metrics: {
          clicks: current.clicks,
          impressions: current.impressions,
          weighted_position: current.position,
          ctr: current.ctr,
          baseline_clicks: baseline.clicks,
          baseline_impressions: baseline.impressions,
          lost_clicks: lostClicks,
          lost_impressions: lostImpressions,
          clicks_drop_pct: clicksDropPct,
          impressions_drop_pct: impressionsDropPct,
          ctr_delta: current.ctr - baseline.ctr,
          position_delta: current.position - baseline.position,
          recovery_priority_score: score,
        },
      },
    },
    {
      entity_path: entityPath,
      source: "manual/operator_source_truth_write_gate",
      signal_type: "operator_normalized_recovery_source_truth",
      fact_id: `${input.batch_id}:${entityPath}:manual-source-truth-fact`,
      source_ref_id: `${input.batch_id}:${entityPath}:manual-source-truth-ref`,
      freshness_status: "fresh",
      payload: {
        normalization_mode: "operator_controlled_recovery_seed",
        page_url: baseline.url,
        entity_path: entityPath,
        recovery_lane: true,
        publish_allowed: false,
        provider_api_calls_allowed: false,
        blocked_actions: ["content_publish", "mass_transcreation", "paid_mutation"],
        required_review: "growth_operator",
      },
    },
  ];
}

export function scoreRecoveryOpportunity(
  baseline: GrowthSearchConsolePageMetric,
  current: GrowthSearchConsolePageMetric,
): number {
  const lostClicks = Math.max(0, baseline.clicks - current.clicks);
  const lostImpressions = Math.max(0, baseline.impressions - current.impressions);
  const clickDropPct = pct(lostClicks, baseline.clicks);
  const impressionDropPct = pct(lostImpressions, baseline.impressions);
  const ctrLoss = Math.max(0, baseline.ctr - current.ctr) * 100;
  const rankingDamage = Math.max(0, current.position - baseline.position);

  return Math.round((lostClicks * 12 + lostImpressions * 0.08 + clickDropPct * 7 + impressionDropPct * 2 + ctrLoss * 10 + rankingDamage * 3) * 100) / 100;
}

export function buildRecoveryCandidates(input: GrowthProductionQueueInput): GrowthRecoveryCandidate[] {
  const currentByUrl = metricByUrl(input.current_pages);

  return input.baseline_pages
    .filter((baseline) => !baseline.url.includes("/wp-content/") && !baseline.url.endsWith(".pdf"))
    .map((baseline) => {
      const current = currentByUrl.get(baseline.url) ?? {
        url: baseline.url,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 100,
      };
      const score = scoreRecoveryOpportunity(baseline, current);
      const entityPath = pathFromUrl(baseline.url);
      const lostClicks = Math.max(0, baseline.clicks - current.clicks);
      const lostImpressions = Math.max(0, baseline.impressions - current.impressions);
      return {
        url: baseline.url,
        entity_path: entityPath,
        locale: input.locale,
        market: input.market,
        baseline,
        current,
        lost_clicks: lostClicks,
        lost_impressions: lostImpressions,
        ctr_delta: current.ctr - baseline.ctr,
        position_delta: current.position - baseline.position,
        recovery_priority_score: score,
        strategic_priority: Math.min(2000, Math.round(lostClicks * 4 + lostImpressions * 0.02)),
        evidence: evidenceForRecoveryCandidate(input, baseline, current, score),
      };
    })
    .filter((candidate) => candidate.lost_clicks > 0 || candidate.lost_impressions > 0)
    .sort((a, b) => b.recovery_priority_score - a.recovery_priority_score || a.entity_path.localeCompare(b.entity_path))
    .slice(0, input.max_entities ?? 10);
}

export function productionWorkerLanes(): GrowthProductionWorkerLane[] {
  return [
    {
      id: "data",
      lane: "orchestrator",
      agent_profile: "growth-data-agent",
      mode: "observe_only",
      max_concurrent: 1,
      allowed_action_class: "observe",
      responsibilities: [
        "refresh free GSC/GA4 read-only signals",
        "normalize page deltas into source_refs/facts",
        "prioritize recovery queue without direct provider mutation",
      ],
      blocked_action_classes: ["content_publish", "paid_mutation", "outreach_send"],
    },
    {
      id: "brief_refresh_transcreation",
      lane: "content_creator",
      agent_profile: "growth-brief-agent",
      mode: "prepare_only",
      max_concurrent: 2,
      allowed_action_class: "prepare",
      responsibilities: [
        "consume governed ContextPackets only",
        "draft refresh briefs and content update plans",
        "prepare transcreation plans only when target profiles/source_refs exist",
      ],
      blocked_action_classes: ["content_publish", "paid_mutation", "outreach_send"],
    },
    {
      id: "review",
      lane: "content_curator",
      agent_profile: "growth-review-agent",
      mode: "prepare_only",
      max_concurrent: 1,
      allowed_action_class: "prepare",
      responsibilities: [
        "score change_sets and cite source_refs",
        "block packets with stale/missing refs or locale/market mismatch",
        "promote only reviewed artifacts into publish gate candidates",
      ],
      blocked_action_classes: ["content_publish", "paid_mutation", "outreach_send"],
    },
  ];
}

export function buildPublishGatePacket(): GrowthPublishGatePacket {
  return {
    gate_version: "growth-publish-gate-v0",
    mode: "dry_run",
    status: "blocked_until_human_approval",
    required_consistency_window: {
      min_change_sets: 30,
      max_change_sets_before_canary: 50,
    },
    required_checks: [
      "change_set_status_approved",
      "human_growth_operator_approval",
      "source_refs_present_and_fresh_or_watch",
      "locale_market_exact_match",
      "diff_preview_present",
      "rollback_payload_present",
      "indexability_check_passed",
      "canonical_hreflang_check_passed",
      "schema_smoke_check_passed",
      "post_publish_monitoring_baseline_present",
    ],
    forbidden_until_gate_passes: ["automatic_publish", "mass_transcreation", "paid_mutation"],
  };
}

export function runGrowthProductionQueue(input: GrowthProductionQueueInput): GrowthProductionQueueReport {
  const recoveryCandidates = buildRecoveryCandidates(input);
  const factoryReport = runGrowthFactoryBatch({
    batch_id: input.batch_id,
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    market: input.market,
    max_entities: input.max_entities ?? 10,
    candidates: recoveryCandidates,
  });

  const contract = defaultSeoContentWorkerContract({
    required_locale: input.locale,
    required_market: input.market,
  });
  const contextPacketInput = {
    batch_id: input.batch_id,
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    market: input.market,
    candidates: recoveryCandidates,
  };

  for (const candidate of recoveryCandidates) {
    const packet = buildGrowthFactoryContextPacket(contextPacketInput, candidate);
    const validation = validateGrowthWorkerContextPacketContract(packet, contract);
    if (validation.can_publish || validation.can_call_provider) {
      throw new Error(`unsafe_context_packet:${candidate.entity_path}`);
    }
  }

  return {
    runner_version: "growth-production-queue-runner-v0",
    batch_id: input.batch_id,
    mode: "prepare_only",
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    market: input.market,
    recovery_candidates: recoveryCandidates,
    factory_entities: factoryReport.entities,
    worker_lanes: productionWorkerLanes(),
    publish_gate: buildPublishGatePacket(),
    ready_for_review_count: factoryReport.ready_for_review_count,
    blocked_count: factoryReport.blocked_count,
  };
}
