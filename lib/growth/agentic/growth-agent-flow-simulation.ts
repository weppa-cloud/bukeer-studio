import {
  defaultSeoContentWorkerContract,
  validateGrowthWorkerContextPacketContract,
  type GrowthWorkerContextPacketContract,
  type GrowthWorkerContractValidation,
} from "./worker-contextpacket-contract";

export type GrowthAgentFlowSimulationInput = {
  task_id: string;
  entity_path: string;
  objective: string;
  context_packet: Record<string, unknown>;
  contract?: GrowthWorkerContextPacketContract;
};

export type GrowthAgentClaim = {
  claim: string;
  source_ref: string;
  confidence: number;
};

export type GrowthAgentFlowSimulationReport = {
  simulation_version: "growth-agent-flow-simulation-v1";
  task_id: string;
  entity_path: string;
  worker_contract_status: GrowthWorkerContractValidation;
  agent_output: {
    status: "prepared" | "blocked";
    recommendations: string[];
    claims: GrowthAgentClaim[];
    forbidden_actions_attempted: string[];
  };
  reviewer: {
    verdict: "PASS_WITH_WATCH" | "BLOCKED";
    checked_claims: number;
    blockers: string[];
  };
  can_call_provider: false;
  can_publish: false;
};

function refsFromPacket(packet: Record<string, unknown>): string[] {
  const direct = Array.isArray(packet.source_refs) ? packet.source_refs : [];
  const refs = direct.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      const row = entry as Record<string, unknown>;
      return String(row.ref ?? row.id ?? row.source_fact_ref ?? row.source ?? "");
    }
    return "";
  }).filter(Boolean);
  if (refs.length > 0) return refs;
  const profiles = Array.isArray(packet.source_profiles) ? packet.source_profiles : [];
  return profiles.flatMap((profile) => {
    if (!profile || typeof profile !== "object") return [];
    const sourceRefs = (profile as Record<string, unknown>).source_refs;
    if (!Array.isArray(sourceRefs)) return [];
    return sourceRefs.map(String);
  });
}

function factsFromPacket(packet: Record<string, unknown>): Record<string, unknown>[] {
  const facts = packet.facts;
  if (Array.isArray(facts)) return facts.filter((fact): fact is Record<string, unknown> => Boolean(fact && typeof fact === "object" && !Array.isArray(fact)));
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return [];
  return Object.values(facts as Record<string, unknown>).flatMap((bucket) => {
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) return [];
    const items = (bucket as Record<string, unknown>).items;
    return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
  });
}

function bestRef(refs: string[], source: string): string {
  return refs.find((ref) => ref.toLowerCase().includes(source)) ?? refs[0] ?? "";
}

export function simulateSeoContentAgentWithContextPacket(
  input: GrowthAgentFlowSimulationInput,
): GrowthAgentFlowSimulationReport {
  const contract = input.contract ?? defaultSeoContentWorkerContract();
  const validation = validateGrowthWorkerContextPacketContract(input.context_packet, contract);
  const refs = refsFromPacket(input.context_packet);
  const facts = factsFromPacket(input.context_packet);

  if (validation.status === "BLOCKED") {
    return {
      simulation_version: "growth-agent-flow-simulation-v1",
      task_id: input.task_id,
      entity_path: input.entity_path,
      worker_contract_status: validation,
      agent_output: {
        status: "blocked",
        recommendations: [],
        claims: [],
        forbidden_actions_attempted: [],
      },
      reviewer: {
        verdict: "BLOCKED",
        checked_claims: 0,
        blockers: validation.blockers,
      },
      can_call_provider: false,
      can_publish: false,
    };
  }

  const manualRef = bestRef(refs, "manual");
  const gscRef = bestRef(refs, "gsc");
  const hasSearchDemand = facts.some((fact) => String(fact.source ?? fact.provider ?? "").toLowerCase().includes("gsc"));
  const claims: GrowthAgentClaim[] = [
    {
      claim: `${input.entity_path} has governed source-truth context for ${String(input.context_packet.locale)}/${String(input.context_packet.market)}.`,
      source_ref: manualRef,
      confidence: 0.82,
    },
    {
      claim: hasSearchDemand
        ? "Search Console demand signals are available as normalized facts."
        : "Search demand must stay in WATCH until a GSC fact is linked in the packet.",
      source_ref: gscRef,
      confidence: hasSearchDemand ? 0.76 : 0.55,
    },
  ].filter((claim) => claim.source_ref);

  const recommendations = [
    "Prepare a market-specific SEO brief only from packet facts; do not call providers.",
    "Use GSC top-query evidence to prioritize headings/meta updates, keeping publish blocked.",
    "If a claim cannot cite a source_ref, convert it into a data request instead of content guidance.",
  ];

  const reviewerBlockers = claims.length === 0 ? ["no_citable_claims"] : claims.filter((claim) => !claim.source_ref).map((claim) => `claim_missing_source_ref:${claim.claim}`);

  return {
    simulation_version: "growth-agent-flow-simulation-v1",
    task_id: input.task_id,
    entity_path: input.entity_path,
    worker_contract_status: validation,
    agent_output: {
      status: "prepared",
      recommendations,
      claims,
      forbidden_actions_attempted: [],
    },
    reviewer: {
      verdict: reviewerBlockers.length > 0 ? "BLOCKED" : "PASS_WITH_WATCH",
      checked_claims: claims.length,
      blockers: reviewerBlockers,
    },
    can_call_provider: false,
    can_publish: false,
  };
}
