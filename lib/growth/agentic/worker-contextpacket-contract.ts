export type GrowthWorkerContextPacketContract = {
  contract_version: "growth-worker-contextpacket-contract-v1";
  worker_kind: string;
  lane: string;
  required_locale: string;
  required_market: string;
  required_sources: string[];
  min_source_refs: number;
  allowed_actions: string[];
  required_blocked_actions: string[];
  freshness_required: "fresh_or_watch" | "fresh_only";
  publish_allowed: false;
  provider_api_calls_allowed: false;
};

export type GrowthWorkerContractValidation = {
  status: "PASS" | "WATCH" | "BLOCKED";
  blockers: string[];
  warnings: string[];
  usable_source_refs: string[];
  can_call_provider: false;
  can_publish: false;
};

type PacketLike = Record<string, unknown>;

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      const row = entry as Record<string, unknown>;
      return String(row.ref ?? row.id ?? row.source_fact_ref ?? row.source ?? "");
    }
    return String(entry ?? "");
  }).filter(Boolean);
}

function sourceRefs(packet: PacketLike): string[] {
  const direct = list(packet.source_refs);
  if (direct.length > 0) return direct;
  const profiles = Array.isArray(packet.source_profiles) ? packet.source_profiles : [];
  return profiles.flatMap((profile) => {
    if (!profile || typeof profile !== "object") return [];
    return list((profile as Record<string, unknown>).source_refs);
  });
}

function blockedActions(packet: PacketLike): string[] {
  const raw = packet.blocked_actions;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return String((entry as Record<string, unknown>).action ?? "");
    return "";
  }).filter(Boolean);
}

function freshnessStatuses(packet: PacketLike): string[] {
  const map = packet.freshness_map;
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  return Object.values(map as Record<string, unknown>).map((entry) => {
    if (entry && typeof entry === "object") return String((entry as Record<string, unknown>).status ?? "missing");
    return String(entry ?? "missing");
  });
}

export function defaultSeoContentWorkerContract(): GrowthWorkerContextPacketContract {
  return {
    contract_version: "growth-worker-contextpacket-contract-v1",
    worker_kind: "seo_content_recommendation",
    lane: "content_creator",
    required_locale: "pt-BR",
    required_market: "BR",
    required_sources: ["manual", "gsc"],
    min_source_refs: 2,
    allowed_actions: ["prepare_recommendation", "request_refresh", "create_review_artifact"],
    required_blocked_actions: ["call_provider_api_directly", "content_publish", "mass_transcreation"],
    freshness_required: "fresh_or_watch",
    publish_allowed: false,
    provider_api_calls_allowed: false,
  };
}

export function validateGrowthWorkerContextPacketContract(
  packet: PacketLike,
  contract: GrowthWorkerContextPacketContract,
): GrowthWorkerContractValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const refs = sourceRefs(packet);
  const blocked = blockedActions(packet);
  const freshness = freshnessStatuses(packet);
  const locale = String(packet.locale ?? (packet.entity as Record<string, unknown> | undefined)?.locale ?? "");
  const market = String(packet.market ?? (packet.entity as Record<string, unknown> | undefined)?.market ?? "");

  if (locale !== contract.required_locale || market !== contract.required_market) {
    blockers.push(`locale_market_mismatch:${locale}/${market}`);
  }
  if (refs.length < contract.min_source_refs) {
    blockers.push(`source_refs_below_min:${refs.length}/${contract.min_source_refs}`);
  }
  for (const source of contract.required_sources) {
    if (!refs.some((ref) => ref.toLowerCase().includes(source.toLowerCase()))) {
      blockers.push(`missing_required_source_ref:${source}`);
    }
  }
  for (const action of contract.required_blocked_actions) {
    if (!blocked.includes(action)) blockers.push(`missing_blocked_action:${action}`);
  }
  if (blocked.includes("call_provider_api_directly") === false) {
    blockers.push("provider_api_direct_call_not_explicitly_blocked");
  }
  if (String(packet.validation_verdict ?? packet.status ?? "").toLowerCase().includes("blocked")) {
    blockers.push("packet_verdict_blocked");
  }
  if (freshness.length === 0) warnings.push("freshness_map_absent_or_empty");
  if (freshness.some((status) => ["missing", "stale", "blocked", "approval_required", "cost_gated", "quota_exhausted"].includes(status))) {
    const status = contract.freshness_required === "fresh_only" ? "block" : "watch";
    if (status === "block") blockers.push("required_freshness_not_fresh");
    else warnings.push("freshness_requires_watch");
  }

  return {
    status: blockers.length > 0 ? "BLOCKED" : warnings.length > 0 ? "WATCH" : "PASS",
    blockers,
    warnings,
    usable_source_refs: blockers.length > 0 ? [] : refs,
    can_call_provider: false,
    can_publish: false,
  };
}
