import type { SupabaseLike } from "./runtime-common";
import { asRecord } from "./runtime-common";

export type DataForSeoAccessStatus =
  | "available"
  | "missing_access"
  | "cost_gated"
  | "stale"
  | "empty"
  | "blocked"
  | "excepted";

export type DataForSeoFeatureProfile =
  | "onpage"
  | "serp"
  | "labs_keywords"
  | "content_analysis"
  | "domain_analytics"
  | "ai_optimization"
  | "unknown";

export interface DataForSeoCacheRow {
  id: string;
  endpoint: string;
  cache_key: string;
  cache_tag: string;
  payload: unknown;
  fetched_at: string;
  expires_at: string;
}

export interface DataForSeoFeatureSnapshot {
  provider: "dataforseo";
  feature_profile: DataForSeoFeatureProfile;
  fetched_at: string | null;
  expires_at: string | null;
  cache_ids: string[];
  endpoint_family: string;
  market: string | null;
  locale: string | null;
  target_scope: string | null;
  row_count: number;
  evidence_count: number;
  access_status: DataForSeoAccessStatus;
  blockers: string[];
}

export interface DataForSeoProviderSnapshot {
  provider: "dataforseo";
  generated_at: string;
  access_status: DataForSeoAccessStatus;
  blockers: string[];
  feature_profiles: DataForSeoFeatureSnapshot[];
  by_feature_profile: Partial<
    Record<DataForSeoFeatureProfile, DataForSeoFeatureSnapshot>
  >;
}

export interface DataForSeoEvidenceRequirement {
  required: boolean;
  feature_profile: DataForSeoFeatureProfile;
  status: DataForSeoAccessStatus;
  blockers: string[];
  snapshot: DataForSeoFeatureSnapshot | null;
  exception_reason: string | null;
}

function inferFeatureProfile(
  endpoint: string,
  cacheTag: string,
): DataForSeoFeatureProfile {
  const value = `${endpoint} ${cacheTag}`.toLowerCase();
  if (/on[_-]?page|crawl/.test(value)) return "onpage";
  if (/content[_-]?analysis|content_analysis/.test(value)) {
    return "content_analysis";
  }
  if (/dataforseo_labs|keyword|keywords|labs/.test(value)) {
    return "labs_keywords";
  }
  if (/ai[_-]?optimization|ai[_-]?overview|ai[_-]?search|geo/.test(value)) {
    return "ai_optimization";
  }
  if (/domain|backlink|rank[_-]?overview|competitor/.test(value)) {
    return "domain_analytics";
  }
  if (/serp/.test(value)) return "serp";
  return "unknown";
}

function endpointFamily(endpoint: string): string {
  const parts = endpoint.split("/").filter(Boolean);
  if (parts.length <= 2) return endpoint || "unknown";
  return parts.slice(0, 4).join("/");
}

function readString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function countEvidence(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + Math.max(1, countEvidence(item)), 0);
  }
  if (!value || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  let total = 0;
  for (const key of ["tasks", "items", "results", "data", "pages", "keywords"]) {
    const child = record[key];
    if (Array.isArray(child)) total += child.length;
  }
  return total;
}

function statusForRows(
  rows: DataForSeoCacheRow[],
  now: Date,
): DataForSeoAccessStatus {
  if (rows.length === 0) return "empty";
  const hasFresh = rows.some((row) => Date.parse(row.expires_at) > now.getTime());
  if (!hasFresh) return "stale";
  const evidence = rows.reduce((sum, row) => sum + countEvidence(row.payload), 0);
  return evidence > 0 ? "available" : "empty";
}

export function buildDataForSeoProviderSnapshot(
  rows: DataForSeoCacheRow[],
  now = new Date(),
): DataForSeoProviderSnapshot {
  const byFeature = new Map<DataForSeoFeatureProfile, DataForSeoCacheRow[]>();
  for (const row of rows) {
    const feature = inferFeatureProfile(row.endpoint, row.cache_tag);
    const existing = byFeature.get(feature) ?? [];
    existing.push(row);
    byFeature.set(feature, existing);
  }

  const featureProfiles = Array.from(byFeature.entries()).map(
    ([feature, featureRows]): DataForSeoFeatureSnapshot => {
      const sorted = [...featureRows].sort(
        (a, b) => Date.parse(b.fetched_at) - Date.parse(a.fetched_at),
      );
      const latest = sorted[0];
      const payload = asRecord(latest?.payload);
      const accessStatus = statusForRows(featureRows, now);
      const blockers =
        accessStatus === "available" ? [] : [`dataforseo_${accessStatus}:${feature}`];
      const evidenceCount = featureRows.reduce(
        (sum, row) => sum + countEvidence(row.payload),
        0,
      );
      return {
        provider: "dataforseo",
        feature_profile: feature,
        fetched_at: latest?.fetched_at ?? null,
        expires_at: latest?.expires_at ?? null,
        cache_ids: sorted.map((row) => row.id),
        endpoint_family: endpointFamily(latest?.endpoint ?? "unknown"),
        market: readString(payload, ["market", "location_name", "country"]),
        locale: readString(payload, ["locale", "language_code", "language"]),
        target_scope: readString(payload, [
          "target",
          "url",
          "query",
          "keyword",
          "domain",
        ]),
        row_count: featureRows.length,
        evidence_count: evidenceCount,
        access_status: accessStatus,
        blockers,
      };
    },
  );

  const byFeatureProfile = Object.fromEntries(
    featureProfiles.map((snapshot) => [snapshot.feature_profile, snapshot]),
  ) as DataForSeoProviderSnapshot["by_feature_profile"];
  const blockers = featureProfiles.flatMap((snapshot) => snapshot.blockers);
  const accessStatus = statusForRows(rows, now);

  return {
    provider: "dataforseo",
    generated_at: now.toISOString(),
    access_status: accessStatus,
    blockers:
      rows.length === 0
        ? ["dataforseo_cache_empty"]
        : blockers.length > 0
          ? blockers
          : [],
    feature_profiles: featureProfiles,
    by_feature_profile: byFeatureProfile,
  };
}

export async function readDataForSeoProviderSnapshot({
  supabase,
  accountId,
  websiteId,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  now?: Date;
}): Promise<DataForSeoProviderSnapshot> {
  const { data, error } = await supabase
    .from("growth_dataforseo_cache")
    .select("id,endpoint,cache_key,cache_tag,payload,fetched_at,expires_at")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .order("fetched_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      provider: "dataforseo",
      generated_at: now.toISOString(),
      access_status: "missing_access",
      blockers: [`dataforseo_cache_read_failed:${error.message ?? "unknown"}`],
      feature_profiles: [],
      by_feature_profile: {},
    };
  }

  return buildDataForSeoProviderSnapshot((data ?? []) as DataForSeoCacheRow[], now);
}

export function dataForSeoFeatureForAction(
  actionClass: string,
  signalText: string,
): DataForSeoFeatureProfile {
  const normalized = signalText.toLowerCase();
  if (actionClass === "safe_apply") return "onpage";
  if (/content[_-]?analysis/.test(normalized)) return "content_analysis";
  if (/competitor|domain|backlink/.test(normalized)) return "domain_analytics";
  if (/serp/.test(normalized)) return "serp";
  if (/translation|locale|transcreation/.test(normalized)) return "serp";
  return "labs_keywords";
}

export function dataForSeoRequirementFromSnapshot({
  required,
  featureProfile,
  snapshot,
  exceptionReason,
}: {
  required: boolean;
  featureProfile: DataForSeoFeatureProfile;
  snapshot: DataForSeoProviderSnapshot | null;
  exceptionReason?: string | null;
}): DataForSeoEvidenceRequirement {
  if (!required) {
    return {
      required: false,
      feature_profile: featureProfile,
      status: "excepted",
      blockers: [],
      snapshot: null,
      exception_reason: exceptionReason ?? null,
    };
  }
  if (exceptionReason?.trim()) {
    return {
      required: true,
      feature_profile: featureProfile,
      status: "excepted",
      blockers: [],
      snapshot: null,
      exception_reason: exceptionReason.trim(),
    };
  }

  const featureSnapshot =
    snapshot?.by_feature_profile[featureProfile] ??
    (featureProfile === "labs_keywords"
      ? snapshot?.by_feature_profile.serp
      : null) ??
    null;
  if (!featureSnapshot) {
    return {
      required: true,
      feature_profile: featureProfile,
      status: snapshot?.access_status === "missing_access" ? "missing_access" : "blocked",
      blockers: snapshot?.blockers?.length
        ? snapshot.blockers
        : [`dataforseo_missing_feature:${featureProfile}`],
      snapshot: null,
      exception_reason: null,
    };
  }

  return {
    required: true,
    feature_profile: featureProfile,
    status: featureSnapshot.access_status,
    blockers: featureSnapshot.blockers,
    snapshot: featureSnapshot,
    exception_reason: null,
  };
}
