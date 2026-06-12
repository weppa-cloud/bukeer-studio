import {
  GrowthProviderContextPacketSchema,
  type GrowthProviderContextFactBucket,
  type GrowthProviderContextFacts,
  type GrowthProviderContextPacket,
  type GrowthProviderDedupeVerdict,
  type GrowthProviderFreshnessEntry,
  type GrowthProviderFreshnessStatus,
  type GrowthProviderPreviousAction,
  type GrowthProviderSourceProfile,
} from "@bukeer/website-contract";

import { asRecord, addHours } from "@/lib/growth/autonomy/runtime-common";
import {
  computeGrowthEvidenceFingerprint,
  evaluateGrowthEvidenceCorrelation,
  type ExistingGrowthEvidenceWork,
} from "@/lib/growth/providers/evidence-correlation";
import { GROWTH_PROVIDER_PROFILE_REGISTRY } from "@/lib/growth/providers/profile-registry";

import type {
  BuildGrowthProviderContextPacketOptions,
  GrowthProviderContextPacketTableRow,
} from "./types";

const DIRECT_PROVIDER_API_BLOCK = {
  action: "call_provider_api_directly",
  reason: "Provider API access is restricted to provider profiles.",
};

const PAID_MUTATION_BLOCKS = [
  {
    action: "mutate_paid_media_campaign",
    reason: "Paid media mutation is out of scope for the read-only beta.",
  },
  {
    action: "upload_provider_conversion",
    reason: "Conversion uploads require a separately approved contract.",
  },
];

const FACT_BUCKETS = [
  "search_demand",
  "technical_issues",
  "market_terms",
  "conversion_signals",
  "paid_signals",
  "ux_friction",
] as const;

const PROFILE_TO_BUCKET: Record<string, keyof GrowthProviderContextFacts> = {
  gsc_daily_complete_web_v1: "search_demand",
  gsc_growth_minimum_v1: "search_demand",
  gsc_indexability_v1: "technical_issues",
  ga4_daily_web_traffic_v1: "conversion_signals",
  ga4_daily_landing_channel_v1: "conversion_signals",
  ga4_growth_minimum_v1: "conversion_signals",
  ga4_admin_governance_v1: "conversion_signals",
  dataforseo_serp_opportunity_v1: "market_terms",
  dfs_onpage_full_comparable_v3: "technical_issues",
  dfs_onpage_changed_urls_v1: "technical_issues",
  dfs_serp_labs_primary_v1: "market_terms",
  dfs_serp_labs_secondary_v1: "market_terms",
  clarity_ux_friction_v1: "ux_friction",
};

function emptyFacts(): GrowthProviderContextFacts {
  return {
    search_demand: { items: [], source_profile_ids: [], no_go_reasons: [] },
    technical_issues: { items: [], source_profile_ids: [], no_go_reasons: [] },
    market_terms: { items: [], source_profile_ids: [], no_go_reasons: [] },
    conversion_signals: { items: [], source_profile_ids: [], no_go_reasons: [] },
    paid_signals: { items: [], source_profile_ids: [], no_go_reasons: [] },
    ux_friction: { items: [], source_profile_ids: [], no_go_reasons: [] },
  };
}

async function readRows(
  supabase: BuildGrowthProviderContextPacketOptions["supabase"],
  table: string,
  accountId: string,
  websiteId: string,
): Promise<GrowthProviderContextPacketTableRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .order(orderColumnForTable(table), { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message ?? String(error)}`);
  }
  return Array.isArray(data) ? data : [];
}

function orderColumnForTable(table: string) {
  if (table === "growth_gsc_cache" || table === "growth_ga4_cache" || table === "growth_dataforseo_cache") {
    return "fetched_at";
  }
  if (table === "growth_inventory") {
    return "updated_at";
  }
  return "created_at";
}

function profileDefinition(profileId: string) {
  return GROWTH_PROVIDER_PROFILE_REGISTRY.find(
    (definition) => definition.profileId === profileId,
  );
}

function providerForProfile(profileId: string, row?: GrowthProviderContextPacketTableRow) {
  const rowProvider = typeof row?.provider === "string" ? row.provider : null;
  return rowProvider ?? profileDefinition(profileId)?.provider ?? "unknown";
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function classifyFreshness(
  profileId: string,
  row: GrowthProviderContextPacketTableRow | undefined,
  now: Date,
): { status: GrowthProviderFreshnessStatus; expiresAt: string | null; fetchedAt: string | null; reasons: string[] } {
  if (!row) {
    return {
      status: "missing",
      expiresAt: null,
      fetchedAt: null,
      reasons: [`profile_missing:${profileId}`],
    };
  }

  const explicitStatus = typeof row.freshness_status === "string" ? row.freshness_status : null;
  const runStatus = typeof row.run_status === "string" ? row.run_status : null;
  const legacyStatus = typeof row.status === "string" ? row.status : null;
  const qualityStatus = typeof row.quality_status === "string" ? row.quality_status : null;
  const fetchedAt = isoOrNull(row.completed_at) ?? isoOrNull(row.fetched_at) ?? isoOrNull(row.created_at);
  const explicitExpiresAt = isoOrNull(row.expires_at);
  const ttlHours = profileDefinition(profileId)?.cadence.freshnessTtlHours;
  const computedExpiresAt = fetchedAt && ttlHours ? addHours(new Date(fetchedAt), ttlHours).toISOString() : null;
  const expiresAt = explicitExpiresAt ?? computedExpiresAt;
  const costGated = runStatus === "cost_gated" || explicitStatus === "cost_gated" || legacyStatus === "cost_gated";
  const approvalRequired = runStatus === "blocked" && explicitStatus === "approval_required";
  const blocked = legacyStatus === "blocked" || qualityStatus === "blocked";

  if (costGated) {
    return {
      status: "cost_gated",
      expiresAt,
      fetchedAt,
      reasons: [`profile_cost_gated:${profileId}`],
    };
  }

  if (approvalRequired) {
    return {
      status: "approval_required",
      expiresAt,
      fetchedAt,
      reasons: [`profile_approval_required:${profileId}`],
    };
  }

  if (blocked) {
    return {
      status: "blocked",
      expiresAt,
      fetchedAt,
      reasons: [`profile_blocked:${profileId}`],
    };
  }

  if (
    explicitStatus &&
    ["blocked", "approval_required", "cost_gated", "quota_exhausted", "missing"].includes(explicitStatus)
  ) {
    return {
      status: explicitStatus as GrowthProviderFreshnessStatus,
      expiresAt,
      fetchedAt,
      reasons: [`profile_${explicitStatus}:${profileId}`],
    };
  }

  const expired = expiresAt ? Date.parse(expiresAt) <= now.getTime() : false;
  if (explicitStatus === "stale" || expired) {
    return {
      status: "stale",
      expiresAt,
      fetchedAt,
      reasons: [`profile_stale:${profileId}`],
    };
  }

  return { status: "fresh", expiresAt, fetchedAt, reasons: [] };
}

function sourceRefs(row: GrowthProviderContextPacketTableRow): string[] {
  const refs = row.source_refs;
  if (Array.isArray(refs)) {
    return refs.map((ref) => {
      if (typeof ref === "string") return ref;
      if (ref && typeof ref === "object") {
        const record = ref as Record<string, unknown>;
        const type = typeof record.type === "string" ? record.type : "ref";
        const value = typeof record.ref === "string" ? record.ref : JSON.stringify(record);
        return `${type}:${value}`;
      }
      return String(ref);
    });
  }
  const id = typeof row.id === "string" ? row.id : null;
  const profileId = typeof row.profile_id === "string" ? row.profile_id : "profile";
  return id ? [`growth_profile_runs:${id}`] : [`growth_profile_runs:${profileId}`];
}

function latestRowsByProfile(rows: GrowthProviderContextPacketTableRow[]) {
  const byProfile = new Map<string, GrowthProviderContextPacketTableRow>();
  for (const row of rows) {
    const profileId = typeof row.profile_id === "string" ? row.profile_id : null;
    if (!profileId || byProfile.has(profileId)) continue;
    byProfile.set(profileId, row);
  }
  return byProfile;
}

function buildFactItem(row: GrowthProviderContextPacketTableRow) {
  const payload = asRecord(row.payload);
  const summary = asRecord(payload.summary);
  return {
    profile_id: String(row.profile_id ?? "unknown"),
    provider: String(row.provider ?? "unknown"),
    run_id: typeof row.id === "string" ? row.id : null,
    evidence_fingerprint: typeof row.evidence_fingerprint === "string" ? row.evidence_fingerprint : null,
    ...summary,
  };
}

function pushNoGoToEmptyBuckets(facts: GrowthProviderContextFacts, reasons: string[]) {
  if (reasons.length === 0) return;
  for (const bucket of FACT_BUCKETS) {
    const factBucket = facts[bucket] as GrowthProviderContextFactBucket;
    if (factBucket.items.length === 0 && factBucket.source_profile_ids.length === 0) {
      factBucket.no_go_reasons.push(...reasons);
    }
  }
}

function buildPreviousActions(
  workItems: GrowthProviderContextPacketTableRow[],
  publicationJobs: GrowthProviderContextPacketTableRow[],
  outcomes: GrowthProviderContextPacketTableRow[],
): GrowthProviderPreviousAction[] {
  const mapRow = (table: string, row: GrowthProviderContextPacketTableRow): GrowthProviderPreviousAction => {
    const id = String(row.id ?? "unknown");
    const evidence = asRecord(row.evidence);
    const correlation = asRecord(evidence.correlation);
    return {
      ref: `${table}:${id}`,
      table,
      id,
      status: typeof row.status === "string" ? row.status : null,
      action_key: typeof row.action_key === "string" ? row.action_key : null,
      evidence_fingerprint:
        typeof correlation.evidence_fingerprint === "string"
          ? correlation.evidence_fingerprint
          : typeof row.evidence_fingerprint === "string"
            ? row.evidence_fingerprint
            : null,
      measurement_window_end:
        isoOrNull(row.measurement_window_end) ?? isoOrNull(row.measuring_until),
      metadata: asRecord(row.metadata),
    };
  };

  return [
    ...workItems.map((row) => mapRow("growth_work_items", row)),
    ...publicationJobs.map((row) => mapRow("growth_publication_jobs", row)),
    ...outcomes.map((row) => mapRow("growth_work_item_outcomes", row)),
  ];
}

function mapCorrelationVerdict(verdict: string): GrowthProviderDedupeVerdict {
  if (verdict === "create") return "proceed";
  if (verdict === "block") return "blocked";
  if (verdict === "scale") return "skip";
  if (["coalesce", "skip", "reopen"].includes(verdict)) {
    return verdict as GrowthProviderDedupeVerdict;
  }
  return "proceed";
}

function sourceProfilesFromRows(rows: GrowthProviderContextPacketTableRow[]): GrowthProviderSourceProfile[] {
  return rows.map((row) => ({
    profile_id: String(row.profile_id),
    provider: providerForProfile(String(row.profile_id), row),
    run_id: typeof row.id === "string" ? row.id : null,
    window_start: isoOrNull(row.started_at),
    window_end: isoOrNull(row.completed_at) ?? isoOrNull(row.fetched_at),
    cache_refs: sourceRefs(row).filter((ref) => ref.includes("cache")),
    fact_ids: [],
    evidence_fingerprint:
      typeof row.evidence_fingerprint === "string" ? row.evidence_fingerprint : null,
    source_refs: sourceRefs(row),
  }));
}

export async function buildGrowthProviderContextPacket(
  options: BuildGrowthProviderContextPacketOptions,
): Promise<GrowthProviderContextPacket> {
  const now = options.now ?? new Date();
  const requiredProfileIds = options.requiredProfileIds?.length
    ? options.requiredProfileIds
    : ["gsc_growth_minimum_v1"];
  const entityKey = `${options.entity.type}:${options.entity.id ?? options.entity.path ?? options.entity.canonical_url ?? "unknown"}`;
  const actionKey = `${options.workType}:${entityKey}`;

  const [
    profileRows,
    gscRows,
    ga4Rows,
    dataforseoRows,
    inventoryRows,
    funnelRows,
    workItems,
    publicationJobs,
    outcomes,
  ] = await Promise.all([
    readRows(options.supabase, "growth_profile_runs", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_gsc_cache", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_ga4_cache", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_dataforseo_cache", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_inventory", options.accountId, options.websiteId),
    readRows(options.supabase, "funnel_events", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_work_items", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_publication_jobs", options.accountId, options.websiteId),
    readRows(options.supabase, "growth_work_item_outcomes", options.accountId, options.websiteId),
  ]);

  const rowsByProfile = latestRowsByProfile(profileRows);
  const freshnessMap: Record<string, GrowthProviderFreshnessEntry> = {};
  const packetNoGoReasons: string[] = [];
  const freshRequiredRows: GrowthProviderContextPacketTableRow[] = [];
  const availableRequiredRows: GrowthProviderContextPacketTableRow[] = [];

  for (const profileId of requiredProfileIds) {
    const row = rowsByProfile.get(profileId);
    const freshness = classifyFreshness(profileId, row, now);
    packetNoGoReasons.push(...freshness.reasons);
    if (row) availableRequiredRows.push(row);
    if (row && freshness.status === "fresh") freshRequiredRows.push(row);

    freshnessMap[profileId] = {
      profile_id: profileId,
      provider: providerForProfile(profileId, row),
      status: freshness.status,
      required: true,
      fetched_at: freshness.fetchedAt,
      expires_at: freshness.expiresAt,
      quality_status:
        typeof row?.quality_status === "string" && ["pass", "watch", "blocked"].includes(row.quality_status)
          ? (row.quality_status as "pass" | "watch" | "blocked")
          : freshness.status === "fresh"
            ? "pass"
            : "watch",
      run_id: typeof row?.id === "string" ? row.id : null,
      no_go_reasons: freshness.reasons,
    };
  }

  const facts = emptyFacts();
  for (const row of freshRequiredRows) {
    const profileId = String(row.profile_id);
    const bucketName = PROFILE_TO_BUCKET[profileId] ?? "market_terms";
    const bucket = facts[bucketName];
    bucket.items.push(buildFactItem(row));
    bucket.source_profile_ids.push(profileId);
  }

  for (const row of availableRequiredRows) {
    const profileId = String(row.profile_id);
    const freshness = freshnessMap[profileId];
    if (!freshness || freshness.status === "fresh") continue;
    const bucketName = PROFILE_TO_BUCKET[profileId] ?? "market_terms";
    const bucket = facts[bucketName];
    bucket.no_go_reasons.push(...freshness.no_go_reasons);
  }

  if (
    gscRows.length > 0 &&
    (facts.search_demand.source_profile_ids.includes("gsc_growth_minimum_v1") ||
      facts.search_demand.source_profile_ids.includes("gsc_daily_complete_web_v1"))
  ) {
    facts.search_demand.items.push(...gscRows.slice(0, 10).map(asRecord));
  }
  if (
    ga4Rows.length > 0 &&
    (facts.conversion_signals.source_profile_ids.includes("ga4_growth_minimum_v1") ||
      facts.conversion_signals.source_profile_ids.includes("ga4_daily_web_traffic_v1") ||
      facts.conversion_signals.source_profile_ids.includes("ga4_daily_landing_channel_v1"))
  ) {
    facts.conversion_signals.items.push(...ga4Rows.slice(0, 10).map(asRecord));
  }
  if (dataforseoRows.length > 0) {
    facts.technical_issues.items.push(...dataforseoRows.slice(0, 10).map(asRecord));
  }
  if (inventoryRows.length > 0) {
    facts.technical_issues.items.push(...inventoryRows.slice(0, 10).map(asRecord));
  }
  if (funnelRows.length > 0) {
    facts.conversion_signals.items.push(...funnelRows.slice(0, 10).map(asRecord));
  }

  pushNoGoToEmptyBuckets(facts, packetNoGoReasons);

  const evidence = {
    entity_key: entityKey,
    action_key: actionKey,
    profiles: freshRequiredRows.map((row) => ({
      profile_id: row.profile_id,
      evidence_fingerprint: row.evidence_fingerprint,
    })),
    facts,
  };
  const fallbackFingerprint = computeGrowthEvidenceFingerprint(evidence);
  const primaryFingerprint =
    freshRequiredRows.find((row) => typeof row.evidence_fingerprint === "string")?.evidence_fingerprint as string | undefined;

  let status: "pass" | "watch" | "blocked" = "pass";
  if (Object.values(freshnessMap).some((entry) => entry.status === "missing" || entry.status === "blocked")) {
    status = "blocked";
  } else if (Object.values(freshnessMap).some((entry) => entry.status !== "fresh")) {
    status = "watch";
  }

  let dedupeVerdict: GrowthProviderDedupeVerdict = "proceed";
  let dedupeReason = "fresh_required_profiles";
  let previousRefs: string[] = [];
  let dedupeNoGoReasons = [...packetNoGoReasons];

  if (status === "blocked") {
    dedupeVerdict = "blocked";
    dedupeReason = "required_profile_missing_or_blocked";
  } else if (status === "watch") {
    dedupeVerdict = "request_refresh";
    dedupeReason = "required_profile_stale_or_gated";
  } else {
    const existingWork: ExistingGrowthEvidenceWork[] = workItems
      .filter((row) => {
        const evidenceRecord = asRecord(row.evidence);
        const correlation = asRecord(evidenceRecord.correlation);
        const rowFingerprint = correlation.evidence_fingerprint;
        return !rowFingerprint || rowFingerprint === primaryFingerprint;
      })
      .map((row) => ({
        id: String(row.id),
        status: String(row.status ?? "unknown"),
        evidence: asRecord(row.evidence),
        outcome_status: typeof row.outcome_status === "string" ? row.outcome_status : null,
      }));

    const correlation = evaluateGrowthEvidenceCorrelation({
      websiteId: options.websiteId,
      decisionFamily: "provider_context_packet",
      entityKey,
      actionKey,
      evidence: primaryFingerprint ? { evidence_fingerprint: primaryFingerprint } : evidence,
      existingWork,
    });
    dedupeVerdict = mapCorrelationVerdict(correlation.dedupe_verdict);
    dedupeReason = correlation.reason ?? "anti_rework_gate";
    previousRefs = correlation.previous_work_item_ids.map((id) => `growth_work_items:${id}`);
    dedupeNoGoReasons = correlation.no_go_reasons;
    if (dedupeVerdict === "coalesce") {
      dedupeReason = dedupeNoGoReasons.some((reason) => reason.startsWith("active_work:"))
        ? "active_work_coalesced"
        : dedupeReason;
      dedupeNoGoReasons = dedupeNoGoReasons.filter((reason) => !reason.startsWith("active_work:"));
    }
  }

  const packet = {
    packet_version: "growth-provider-context-packet-v1",
    status,
    generated_at: now.toISOString(),
    account_id: options.accountId,
    website_id: options.websiteId,
    locale: options.entity.locale ?? "es-CO",
    market: options.entity.market ?? "CO",
    worker_lane: options.workerLane,
    work_type: options.workType,
    entity: {
      id: null,
      canonical_url: null,
      locale: options.entity.locale ?? "es-CO",
      market: options.entity.market ?? "CO",
      path: null,
      slug: null,
      metadata: {},
      ...options.entity,
    },
    freshness_map: freshnessMap,
    source_profiles: sourceProfilesFromRows(availableRequiredRows),
    facts,
    previous_actions: buildPreviousActions(workItems, publicationJobs, outcomes),
    dedupe_verdict: {
      verdict: dedupeVerdict,
      evidence_fingerprint: primaryFingerprint ?? fallbackFingerprint,
      reason: dedupeReason,
      previous_refs: previousRefs,
      no_go_reasons: dedupeNoGoReasons,
    },
    allowed_actions: options.allowedActions ?? [],
    blocked_actions: [DIRECT_PROVIDER_API_BLOCK, ...PAID_MUTATION_BLOCKS],
  };

  return GrowthProviderContextPacketSchema.parse(packet);
}
