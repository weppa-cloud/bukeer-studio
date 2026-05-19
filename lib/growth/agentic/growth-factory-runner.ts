import { simulateSeoContentAgentWithContextPacket } from "./growth-agent-flow-simulation";
import { defaultSeoContentWorkerContract } from "./worker-contextpacket-contract";

export type GrowthFactoryEvidenceRow = {
  entity_path: string;
  source: string;
  signal_type: string;
  fact_id: string;
  source_ref_id: string;
  freshness_status: string;
  payload: Record<string, unknown>;
};

export type GrowthFactoryCandidate = {
  entity_path: string;
  locale: string;
  market: string;
  evidence: GrowthFactoryEvidenceRow[];
  strategic_priority?: number;
};

export type GrowthFactoryBatchInput = {
  batch_id: string;
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  candidates: GrowthFactoryCandidate[];
  max_entities?: number;
};

export type GrowthFactoryBatchEntity = {
  entity_path: string;
  opportunity_score: number;
  context_packet: Record<string, unknown>;
  simulation: ReturnType<typeof simulateSeoContentAgentWithContextPacket>;
  review_artifact: {
    title: string;
    summary: string;
    recommendations: string[];
    source_refs: string[];
    status: "needs_review" | "blocked";
    publish_allowed: false;
    provider_calls_allowed: false;
  };
};

export type GrowthFactoryBatchReport = {
  runner_version: "growth-factory-runner-v0";
  batch_id: string;
  mode: "prepare_only";
  account_id: string;
  website_id: string;
  locale: string;
  market: string;
  selected_count: number;
  blocked_count: number;
  ready_for_review_count: number;
  entities: GrowthFactoryBatchEntity[];
  forbidden_actions: ["publish", "provider_api_call", "mass_transcreation"];
};

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function gscPayload(candidate: GrowthFactoryCandidate): Record<string, unknown> | undefined {
  return candidate.evidence.find((row) => row.source === "gsc")?.payload;
}

export function scoreGrowthFactoryCandidate(candidate: GrowthFactoryCandidate): number {
  const gsc = gscPayload(candidate);
  const metrics = gsc && typeof gsc.metrics === "object" && !Array.isArray(gsc.metrics)
    ? (gsc.metrics as Record<string, unknown>)
    : gsc;
  const impressions = num(metrics?.impressions);
  const weightedPosition = num(metrics?.weighted_position);
  const positionGap = weightedPosition > 0 ? Math.max(0, 80 - weightedPosition) : 0;
  const hasGsc = candidate.evidence.some((row) => row.source === "gsc");
  const hasManual = candidate.evidence.some((row) => row.source === "manual" || row.source.startsWith("manual/"));
  const freshRefs = candidate.evidence.filter((row) => row.freshness_status === "fresh").length;
  const strategic = candidate.strategic_priority ?? 0;

  return Math.round((impressions * 1.5 + positionGap * 0.75 + freshRefs * 8 + (hasGsc ? 20 : 0) + (hasManual ? 20 : 0) + strategic) * 100) / 100;
}

export function buildGrowthFactoryContextPacket(
  input: GrowthFactoryBatchInput,
  candidate: GrowthFactoryCandidate,
): Record<string, unknown> {
  return {
    packet_version: "growth-context-packet-factory-v0",
    batch_id: input.batch_id,
    account_id: input.account_id,
    website_id: input.website_id,
    entity_path: candidate.entity_path,
    locale: input.locale,
    market: input.market,
    lane: "content_creator",
    worker_kind: "seo_content_recommendation",
    allowed_actions: ["prepare_recommendation", "create_review_artifact"],
    blocked_actions: ["call_provider_api_directly", "content_publish", "mass_transcreation"],
    source_refs: candidate.evidence.map((row) => `${row.source}:${row.source_ref_id}`),
    facts: candidate.evidence.map((row) => ({
      id: row.fact_id,
      source: row.source,
      signal_type: row.signal_type,
      source_ref_id: row.source_ref_id,
      freshness_status: row.freshness_status,
      payload: row.payload,
    })),
    freshness_map: Object.fromEntries(candidate.evidence.map((row) => [row.source_ref_id, { status: row.freshness_status }])),
    review_required: true,
    publish_allowed: false,
    provider_api_calls_allowed: false,
    validation_verdict: "PASS_WITH_WATCH",
  };
}

export function runGrowthFactoryBatch(input: GrowthFactoryBatchInput): GrowthFactoryBatchReport {
  const selected = [...input.candidates]
    .filter((candidate) => candidate.locale === input.locale && candidate.market === input.market)
    .map((candidate) => ({ candidate, score: scoreGrowthFactoryCandidate(candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.entity_path.localeCompare(b.candidate.entity_path))
    .slice(0, input.max_entities ?? 5);

  const contract = defaultSeoContentWorkerContract({
    required_locale: input.locale,
    required_market: input.market,
  });
  const entities: GrowthFactoryBatchEntity[] = selected.map(({ candidate, score }) => {
    const contextPacket = buildGrowthFactoryContextPacket(input, candidate);
    const simulation = simulateSeoContentAgentWithContextPacket({
      task_id: `${input.batch_id}:${candidate.entity_path}`,
      entity_path: candidate.entity_path,
      objective: "prepare SEO/content recommendation from governed ContextPacket",
      context_packet: contextPacket,
      contract,
    });
    const sourceRefs = (contextPacket.source_refs as string[]) ?? [];
    return {
      entity_path: candidate.entity_path,
      opportunity_score: score,
      context_packet: contextPacket,
      simulation,
      review_artifact: {
        title: `Growth Factory recommendation — ${candidate.entity_path}`,
        summary: simulation.reviewer.verdict === "PASS_WITH_WATCH"
          ? "Prepare-only SEO/content recommendation generated from governed source_refs. Human review required before any publish."
          : `Blocked by ContextPacket contract: ${simulation.reviewer.blockers.join(", ")}`,
        recommendations: simulation.agent_output.recommendations,
        source_refs: sourceRefs,
        status: simulation.reviewer.verdict === "PASS_WITH_WATCH" ? "needs_review" : "blocked",
        publish_allowed: false,
        provider_calls_allowed: false,
      },
    };
  });

  return {
    runner_version: "growth-factory-runner-v0",
    batch_id: input.batch_id,
    mode: "prepare_only",
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    market: input.market,
    selected_count: entities.length,
    blocked_count: entities.filter((entity) => entity.review_artifact.status === "blocked").length,
    ready_for_review_count: entities.filter((entity) => entity.review_artifact.status === "needs_review").length,
    entities,
    forbidden_actions: ["publish", "provider_api_call", "mass_transcreation"],
  };
}
