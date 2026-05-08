import type {
  GrowthMarket,
  GrowthProfileInsert,
  GrowthProfileType,
} from "@bukeer/website-contract";
import { GrowthProfileInsertSchema } from "@bukeer/website-contract";

import {
  addHours,
  asRecord,
  type GrowthRuntimeScope,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";

export interface RefreshGrowthProfilesOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  cycleId?: string;
  dryRun?: boolean;
  now?: Date;
}

export interface RefreshGrowthProfilesResult {
  profiles: GrowthProfileInsert[];
  profileTypes: GrowthProfileType[];
  insertedOrUpdated: number;
  dryRun: boolean;
}

function profileTtl(profileType: GrowthProfileType): number {
  if (profileType === "risk_policy" || profileType === "page_product") return 1;
  if (profileType === "seo_market" || profileType === "competitor") return 24 * 7;
  return 24 * 30;
}

function confidenceForProfile(profileType: GrowthProfileType): number {
  if (profileType === "risk_policy") return 0.99;
  if (profileType === "page_product") return 0.82;
  if (profileType === "seo_market") return 0.78;
  if (profileType === "buyer") return 0.76;
  if (profileType === "business") return 0.84;
  if (profileType === "agent_lane") return 0.8;
  return 0.7;
}

function buildProfile({
  scope,
  profileType,
  payload,
  sourceSignalFactIds,
  now,
}: {
  scope: GrowthRuntimeScope;
  profileType: GrowthProfileType;
  payload: JsonRecord;
  sourceSignalFactIds: string[];
  now: Date;
}): GrowthProfileInsert {
  const ttl = profileTtl(profileType);
  return GrowthProfileInsertSchema.parse({
    account_id: scope.accountId,
    website_id: scope.websiteId,
    locale: scope.locale,
    market: scope.market,
    profile_type: profileType,
    subject_table: null,
    subject_id: null,
    subject_key: null,
    source: "growth_runtime_cycle",
    confidence: confidenceForProfile(profileType),
    valid_from: now.toISOString(),
    valid_until: addHours(now, ttl).toISOString(),
    freshness_ttl_hours: ttl,
    payload,
    source_signal_fact_ids: sourceSignalFactIds,
    policy_version: "profile-freshness-v1",
  });
}

export async function refreshGrowthProfiles(
  input: RefreshGrowthProfilesOptions,
): Promise<RefreshGrowthProfilesResult> {
  const now = input.now ?? new Date();
  const scope: GrowthRuntimeScope = {
    accountId: input.accountId,
    websiteId: input.websiteId,
    locale: input.locale ?? "es-CO",
    market: input.market ?? "CO",
  };

  const [{ data: websiteRows, error: websiteError }, { data: signalRows, error: signalError }, { data: policyRows, error: policyError }] =
    await Promise.all([
      input.supabase
        .from("websites")
        .select("id,account_id,subdomain,custom_domain,status,updated_at")
        .eq("id", input.websiteId)
        .eq("account_id", input.accountId)
        .limit(1),
      input.supabase
        .from("growth_signal_facts")
        .select("*")
        .eq("account_id", input.accountId)
        .eq("website_id", input.websiteId)
        .gte("expires_at", now.toISOString())
        .order("confidence", { ascending: false })
        .limit(100),
      input.supabase
        .from("growth_autonomy_policies")
        .select("*")
        .eq("account_id", input.accountId)
        .eq("website_id", input.websiteId)
        .limit(100),
    ]);

  if (websiteError) throw new Error(`website profile lookup failed: ${websiteError.message}`);
  if (signalError) throw new Error(`signal profile lookup failed: ${signalError.message}`);
  if (policyError) throw new Error(`policy profile lookup failed: ${policyError.message}`);

  const website = Array.isArray(websiteRows) ? websiteRows[0] : websiteRows;
  const signals = Array.isArray(signalRows) ? signalRows : [];
  const policies = Array.isArray(policyRows) ? policyRows : [];
  const sourceSignalFactIds = signals
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));

  const signalTypes = signals.map((row) => String(row.signal_type ?? row.source));
  const profiles = [
    buildProfile({
      scope,
      profileType: "business",
      payload: {
        website: asRecord(website),
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
    buildProfile({
      scope,
      profileType: "buyer",
      payload: {
        inferred_from: signalTypes.filter((type) =>
          /crm|funnel|lead|whatsapp|booking/i.test(type),
        ),
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
    buildProfile({
      scope,
      profileType: "seo_market",
      payload: {
        active_signal_types: signalTypes,
        top_sources: signals.slice(0, 10).map((row) => row.source),
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
    buildProfile({
      scope,
      profileType: "page_product",
      payload: {
        website_id: input.websiteId,
        surface: "public_website",
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
    buildProfile({
      scope,
      profileType: "agent_lane",
      payload: {
        enabled_policies: policies.filter((row) => row.enabled).length,
        dry_run_policies: policies.filter((row) => row.dry_run_only).length,
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
    buildProfile({
      scope,
      profileType: "risk_policy",
      payload: {
        blocked_surfaces: [
          "pricing",
          "availability",
          "reservations",
          "payments",
          "paid_media",
          "crm_mutation",
        ],
        production_mutations_allowed: false,
        runtime_cycle_id: input.cycleId ?? null,
      },
      sourceSignalFactIds,
      now,
    }),
  ];

  if (!input.dryRun) {
    const { error } = await input.supabase
      .from("growth_profiles")
      .upsert(profiles, {
        onConflict:
          "website_id,locale,market,profile_type,subject_table,subject_id,subject_key",
      });
    if (error) throw new Error(`profile refresh upsert failed: ${error.message}`);
  }

  return {
    profiles,
    profileTypes: profiles.map((profile) => profile.profile_type),
    insertedOrUpdated: input.dryRun ? 0 : profiles.length,
    dryRun: input.dryRun ?? false,
  };
}
