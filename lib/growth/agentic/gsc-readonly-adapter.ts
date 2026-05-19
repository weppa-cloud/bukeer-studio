import {
  buildGovernedProviderRunnerDryRun,
  type GovernedProviderEvidenceRow,
  type GovernedProviderPolicy,
  type GovernedProviderRunnerReport,
} from "./governed-provider-runner";

export type GscSearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscReadonlyAdapterInput = {
  tenant: string;
  account_id: string;
  website_id: string;
  site_url: string;
  source_locale?: string;
  source_market?: string;
  target_locale: string;
  target_market: string;
  provider_profile_id?: string;
  policy?: GovernedProviderPolicy | null;
  rows: GscSearchAnalyticsRow[];
  start_date: string;
  end_date: string;
  observed_at: string;
  page_path_allowlist?: string[];
  max_entities?: number;
  existing_target_fact_ids_by_entity?: Record<string, string[]>;
};

export type GscEntityEvidence = GovernedProviderEvidenceRow & {
  page_url: string;
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  totals: {
    clicks: number;
    impressions: number;
    weighted_position: number;
    query_count: number;
  };
};

export type GscReadonlyAdapterReport = {
  provider: "gsc";
  provider_profile_type: "search_console_page_query";
  source: "gsc_search_analytics";
  date_range: { start_date: string; end_date: string };
  site_url: string;
  evidence_rows: GscEntityEvidence[];
  runner_report: GovernedProviderRunnerReport;
  can_call_provider: false;
  can_write_database: false;
  can_publish: false;
};

function normalizePathFromPageUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path.startsWith("/l/") && path.endsWith("-colombiatours")) {
      return `/${path.slice(3, -14)}`;
    }
    return path;
  } catch {
    if (pageUrl.startsWith("/")) return pageUrl.replace(/\/$/, "") || "/";
    return null;
  }
}

function weightedPosition(rows: GscSearchAnalyticsRow[]): number {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  if (impressions <= 0) return 0;
  return rows.reduce((sum, row) => sum + row.position * row.impressions, 0) / impressions;
}

function makeLineageRef(input: GscReadonlyAdapterInput, entityPath: string): string {
  return [
    "gsc://search-analytics",
    input.website_id,
    input.site_url,
    input.start_date,
    input.end_date,
    entityPath,
  ].join("/");
}

export function buildGscReadonlyEvidenceRows(input: GscReadonlyAdapterInput): GscEntityEvidence[] {
  const allowlist = new Set(input.page_path_allowlist ?? []);
  const grouped = new Map<string, { page_url: string; rows: GscSearchAnalyticsRow[] }>();

  for (const row of input.rows) {
    const pageUrl = row.keys[0];
    const query = row.keys[1];
    if (!pageUrl || !query) continue;
    const entityPath = normalizePathFromPageUrl(pageUrl);
    if (!entityPath) continue;
    if (allowlist.size > 0 && !allowlist.has(entityPath)) continue;
    const current = grouped.get(entityPath) ?? { page_url: pageUrl, rows: [] };
    current.rows.push(row);
    grouped.set(entityPath, current);
  }

  const evidence = Array.from(grouped.entries())
    .map(([entityPath, group]) => {
      const sortedRows = [...group.rows].sort((a, b) => b.impressions - a.impressions || a.position - b.position);
      const topRows = sortedRows.slice(0, 10);
      const clicks = group.rows.reduce((sum, row) => sum + row.clicks, 0);
      const impressions = group.rows.reduce((sum, row) => sum + row.impressions, 0);
      const payload = {
        source: "gsc_search_analytics",
        site_url: input.site_url,
        date_range: { start_date: input.start_date, end_date: input.end_date },
        page_url: group.page_url,
        entity_path: entityPath,
        totals: {
          clicks,
          impressions,
          weighted_position: weightedPosition(group.rows),
          query_count: group.rows.length,
        },
        top_queries: topRows.map((row) => ({
          query: row.keys[1],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })),
      };
      return {
        entity_path: entityPath,
        observed_at: input.observed_at,
        provider_payload: payload,
        lineage_ref: makeLineageRef(input, entityPath),
        page_url: group.page_url,
        queries: payload.top_queries,
        totals: payload.totals,
      };
    })
    .sort((a, b) => b.totals.impressions - a.totals.impressions || a.totals.weighted_position - b.totals.weighted_position);

  return evidence.slice(0, input.max_entities ?? evidence.length);
}

export function buildGscReadonlyAdapterDryRun(input: GscReadonlyAdapterInput): GscReadonlyAdapterReport {
  const evidenceRows = buildGscReadonlyEvidenceRows(input);
  const runnerReport = buildGovernedProviderRunnerDryRun({
    tenant: input.tenant,
    account_id: input.account_id,
    website_id: input.website_id,
    provider: "gsc",
    provider_profile_type: "search_console_page_query",
    provider_profile_id: input.provider_profile_id ?? "gsc/search_console_page_query",
    source_locale: input.source_locale,
    source_market: input.source_market,
    target_locale: input.target_locale,
    target_market: input.target_market,
    policy: input.policy,
    evidence_rows: evidenceRows,
    existing_target_fact_ids_by_entity: input.existing_target_fact_ids_by_entity,
    now: input.observed_at,
    max_rows: input.max_entities,
  });

  return {
    provider: "gsc",
    provider_profile_type: "search_console_page_query",
    source: "gsc_search_analytics",
    date_range: { start_date: input.start_date, end_date: input.end_date },
    site_url: input.site_url,
    evidence_rows: evidenceRows,
    runner_report: runnerReport,
    can_call_provider: false,
    can_write_database: false,
    can_publish: false,
  };
}
