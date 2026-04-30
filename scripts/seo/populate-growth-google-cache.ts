#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import * as path from "node:path";
import process from "node:process";
import * as dotenv from "dotenv";
import { createSupabaseServiceRoleClient } from "../../lib/supabase/service-role";
import { queryGscSearchAnalytics } from "../../lib/growth/gsc-client";
import {
  querySearchConsole,
  refreshGoogleToken,
  type SearchConsoleRow,
} from "../../lib/seo/google-client";
import { runGa4Report } from "../../lib/growth/ga4-client";

dotenv.config({ path: ".env.local" });

const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const OUT_DIR = "artifacts/seo/2026-04-29-growth-google-cache-populate";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ROW_LIMIT = 25_000;
const DEFAULT_MAX_PAGES = 20;
const DEFAULT_LOCALE_PATH_REGEX = "\\/(en|mx)(\\/|$)";
const DEFAULT_BRAND_QUERY_REGEX = "bukeer|colombia\\s*tours?|colombiatours";

type PullStatus = "planned" | "live" | "cache" | "mock" | "error";
type GscDimension =
  | "query"
  | "page"
  | "country"
  | "device"
  | "date"
  | "searchAppearance";
type GscSearchType = "web" | "image";
type GscFilterOperator =
  | "equals"
  | "contains"
  | "includingRegex"
  | "excludingRegex";

interface GscDimensionFilter {
  dimension: Exclude<GscDimension, "date" | "searchAppearance">;
  operator: GscFilterOperator;
  expression: string;
}

interface PullResult {
  provider: "gsc" | "ga4";
  name: string;
  priority: "P0" | "P1" | "P2";
  status: PullStatus;
  row_count: number;
  window?: { from: string; to: string };
  profile?: string;
  dimensions?: string[];
  search_type?: GscSearchType;
  filters?: GscDimensionFilter[];
  cache_key?: string;
  cache_tag?: string;
  cache_hit?: boolean;
  page_count?: number;
  smoke?: "dry-run" | "compatibility";
  error?: string;
}

interface Args {
  apply: boolean;
  force: boolean;
  ga4CompatibilitySmoke: boolean;
  daily: boolean;
  expanded: boolean;
  localeProfile: boolean;
  locale: string;
  maxPages: number;
  from: string;
  to: string;
  fromExplicit: boolean;
  toExplicit: boolean;
}

interface GscIntegrationRow {
  account_id: string;
  website_id: string;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  site_url: string | null;
}

const GSC_PULLS = [
  {
    name: "query_page",
    priority: "P0" as const,
    dimensions: ["query", "page"] as const,
    rowLimit: 25000,
  },
  {
    name: "page_country",
    priority: "P0" as const,
    dimensions: ["page", "country"] as const,
    rowLimit: 25000,
  },
  {
    name: "page_device",
    priority: "P1" as const,
    dimensions: ["page", "device"] as const,
    rowLimit: 25000,
  },
  {
    name: "date_page",
    priority: "P1" as const,
    dimensions: ["date", "page"] as const,
    rowLimit: 25000,
  },
  {
    name: "search_appearance_discovery",
    priority: "P1" as const,
    dimensions: ["searchAppearance"] as const,
    rowLimit: 1000,
  },
  {
    name: "page_search_appearance",
    priority: "P1" as const,
    dimensions: ["page", "searchAppearance"] as const,
    rowLimit: 25000,
  },
];

type Ga4Pull = {
  name: string;
  priority: PullResult["priority"];
  dimensions: string[];
  metrics: string[];
  limit: number;
  window?: "completed-day" | "args";
  dimensionFilter?: Record<string, unknown>;
};

const GA4_PULLS: Ga4Pull[] = [
  {
    name: "ga4_daily_landing_channel_v1",
    priority: "P0" as const,
    window: "completed-day",
    dimensions: [
      "date",
      "landingPagePlusQueryString",
      "sessionDefaultChannelGroup",
    ],
    metrics: [
      "sessions",
      "totalUsers",
      "screenPageViews",
      "engagementRate",
      "keyEvents",
      "conversions",
    ],
    limit: 25000,
  },
  {
    name: "ga4_council_landing_channel_28d_v1",
    priority: "P0" as const,
    dimensions: ["landingPagePlusQueryString", "sessionDefaultChannelGroup"],
    metrics: [
      "sessions",
      "totalUsers",
      "screenPageViews",
      "engagementRate",
      "bounceRate",
      "averageSessionDuration",
    ],
    limit: 25000,
  },
  {
    name: "ga4_page_source_medium_28d_v1",
    priority: "P0" as const,
    dimensions: ["pagePath", "sessionSourceMedium"],
    metrics: [
      "sessions",
      "totalUsers",
      "screenPageViews",
      "engagementRate",
      "keyEvents",
      "conversions",
    ],
    limit: 25000,
  },
  {
    name: "ga4_event_page_28d_v1",
    priority: "P0" as const,
    dimensions: ["eventName", "pagePath"],
    metrics: ["eventCount", "keyEvents", "conversions"],
    limit: 25000,
  },
  {
    name: "ga4_campaign_source_medium_28d_v1",
    priority: "P0" as const,
    dimensions: ["sessionCampaignName", "sessionSource", "sessionMedium"],
    metrics: ["sessions", "totalUsers", "keyEvents", "conversions"],
    limit: 25000,
  },
  {
    name: "ga4_geo_landing_28d_v1",
    priority: "P1" as const,
    dimensions: ["country", "city", "landingPagePlusQueryString"],
    metrics: [
      "sessions",
      "totalUsers",
      "engagementRate",
      "keyEvents",
      "conversions",
    ],
    limit: 25000,
  },
  {
    name: "ga4_device_landing_28d_v1",
    priority: "P1" as const,
    dimensions: ["deviceCategory", "landingPagePlusQueryString"],
    metrics: [
      "sessions",
      "totalUsers",
      "engagementRate",
      "bounceRate",
      "averageSessionDuration",
      "keyEvents",
    ],
    limit: 25000,
  },
  {
    name: "ga4_hostname_locale_28d_v1",
    priority: "P1" as const,
    dimensions: [
      "hostname",
      "landingPagePlusQueryString",
      "sessionDefaultChannelGroup",
    ],
    metrics: ["sessions", "totalUsers", "engagementRate", "keyEvents"],
    limit: 25000,
  },
  {
    name: "ga4_internal_search_v1",
    priority: "P2" as const,
    dimensions: ["eventName", "pagePath"],
    metrics: ["eventCount", "totalUsers"],
    limit: 10000,
    dimensionFilter: eventNameInListFilter(["view_search_results", "search"]),
  },
  {
    name: "ga4_file_outbound_engagement_v1",
    priority: "P2" as const,
    dimensions: ["eventName", "pagePath"],
    metrics: ["eventCount", "totalUsers"],
    limit: 10000,
    dimensionFilter: eventNameInListFilter([
      "file_download",
      "click",
      "scroll",
    ]),
  },
];

const EXPANDED_GSC_PULLS = [
  {
    name: "daily_complete_web",
    profile: "gsc_daily_complete_web_v1",
    priority: "P0" as const,
    cadence: "daily" as const,
    dimensions: ["date", "page", "query", "country", "device"] as const,
    searchType: "web" as const,
    rowLimit: 25000,
  },
  {
    name: "daily_complete_image",
    profile: "gsc_daily_complete_image_v1",
    priority: "P1" as const,
    cadence: "daily" as const,
    dimensions: ["date", "page", "query", "country", "device"] as const,
    searchType: "image" as const,
    rowLimit: 25000,
  },
  {
    name: "locale_path",
    profile: "gsc_locale_path_v1",
    priority: "P1" as const,
    cadence: "weekly" as const,
    dimensions: ["page", "query", "country"] as const,
    searchType: "web" as const,
    rowLimit: 25000,
    filters: [
      {
        dimension: "page",
        operator: "includingRegex",
        expression: DEFAULT_LOCALE_PATH_REGEX,
      },
    ] satisfies GscDimensionFilter[],
  },
  {
    name: "brand_query_page",
    profile: "gsc_brand_nonbrand_v1",
    priority: "P1" as const,
    cadence: "weekly" as const,
    dimensions: ["query", "page"] as const,
    searchType: "web" as const,
    rowLimit: 25000,
    segment: "brand" as const,
    filters: [
      {
        dimension: "query",
        operator: "includingRegex",
        expression: DEFAULT_BRAND_QUERY_REGEX,
      },
    ] satisfies GscDimensionFilter[],
  },
  {
    name: "nonbrand_query_page",
    profile: "gsc_brand_nonbrand_v1",
    priority: "P1" as const,
    cadence: "weekly" as const,
    dimensions: ["query", "page"] as const,
    searchType: "web" as const,
    rowLimit: 25000,
    segment: "nonbrand" as const,
    filters: [
      {
        dimension: "query",
        operator: "excludingRegex",
        expression: DEFAULT_BRAND_QUERY_REGEX,
      },
    ] satisfies GscDimensionFilter[],
  },
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: PullResult[] = [];
  const expandedGscPulls = selectedExpandedGscPulls(args);
  if (!args.apply) {
    for (const pull of GSC_PULLS) {
      results.push(plannedGscPull(pull));
    }
    for (const pull of expandedGscPulls) {
      results.push(plannedExpandedGscPull(args, pull));
    }
    for (const pull of GA4_PULLS) {
      results.push({
        provider: "ga4",
        name: pull.name,
        priority: pull.priority,
        status: "planned",
        row_count: 0,
        window: getGa4PullWindow(args, pull),
        smoke: args.ga4CompatibilitySmoke ? "dry-run" : undefined,
      });
    }
  } else {
    for (const pull of GSC_PULLS) {
      results.push(await runGscPull(args, pull));
    }
    for (const pull of expandedGscPulls) {
      results.push(await runExpandedGscPull(args, pull));
    }
    for (const pull of GA4_PULLS) {
      results.push(await runGa4Pull(args, pull));
    }
  }

  const counts = await getCacheCounts();
  const report = {
    generated_at: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    ga4_compatibility_smoke: args.ga4CompatibilitySmoke,
    gsc_expanded: {
      daily: args.daily,
      expanded: args.expanded,
      locale_profile: args.localeProfile,
      locale: args.locale,
      max_pages: args.maxPages,
    },
    website_id: WEBSITE_ID,
    account_id: ACCOUNT_ID,
    window: { from: args.from, to: args.to },
    counts,
    pulls: results,
  };

  await fs.writeFile(
    path.join(OUT_DIR, "growth-google-cache-populate.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(OUT_DIR, "growth-google-cache-populate.md"),
    toMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        ga4_compatibility_smoke: report.ga4_compatibility_smoke,
        window: report.window,
        counts,
        pulls: results.map(
          ({
            provider,
            name,
            profile,
            status,
            row_count,
            window,
            page_count,
            cache_key,
            smoke,
            error,
          }) => ({
            provider,
            name,
            profile,
            status,
            row_count,
            window,
            page_count,
            cache_key,
            smoke,
            error,
          }),
        ),
        outDir: OUT_DIR,
      },
      null,
      2,
    ),
  );
}

function parseArgs(argv: string[]): Args {
  const today = new Date();
  const end = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - 1,
    ),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);

  const args: Args = {
    apply: argv.includes("--apply"),
    force: argv.includes("--force"),
    ga4CompatibilitySmoke: argv.includes("--ga4-compatibility-smoke"),
    daily: argv.includes("--daily"),
    expanded: argv.includes("--expanded"),
    localeProfile: argv.includes("--locale"),
    locale: "es",
    maxPages: DEFAULT_MAX_PAGES,
    from: formatDate(start),
    to: formatDate(end),
    fromExplicit: false,
    toExplicit: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--from=")) {
      args.from = arg.slice("--from=".length);
      args.fromExplicit = true;
    }
    if (arg.startsWith("--to=")) {
      args.to = arg.slice("--to=".length);
      args.toExplicit = true;
    }
    if (arg.startsWith("--locale=")) {
      args.locale = arg.slice("--locale=".length);
      args.localeProfile = true;
    }
    if (arg.startsWith("--max-pages=")) {
      const value = Number(arg.slice("--max-pages=".length));
      if (Number.isFinite(value) && value > 0)
        args.maxPages = Math.floor(value);
    }
  }
  return args;
}

function eventNameInListFilter(values: string[]): Record<string, unknown> {
  return {
    filter: {
      fieldName: "eventName",
      inListFilter: {
        values,
        caseSensitive: false,
      },
    },
  };
}

function getGa4PullWindow(args: Args, pull: Ga4Pull) {
  if (
    pull.window === "completed-day" &&
    !args.fromExplicit &&
    !args.toExplicit
  ) {
    return { from: args.to, to: args.to };
  }
  return { from: args.from, to: args.to };
}

async function runGscPull(
  args: Args,
  pull: (typeof GSC_PULLS)[number],
): Promise<PullResult> {
  try {
    const result = await queryGscSearchAnalytics({
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      locale: args.locale as never,
      startDate: args.from,
      endDate: args.to,
      dimensions: pull.dimensions as never,
      rowLimit: pull.rowLimit,
      forceRefresh: args.force,
    });
    return {
      provider: "gsc",
      name: pull.name,
      priority: pull.priority,
      status: result.source,
      row_count: result.rows.length,
      dimensions: [...pull.dimensions],
      search_type: "web",
      cache_tag: result.cacheTag,
      cache_hit: result.cacheHit,
    };
  } catch (error) {
    return errorResult("gsc", pull.name, pull.priority, error);
  }
}

async function runGa4Pull(
  args: Args,
  pull: (typeof GA4_PULLS)[number],
): Promise<PullResult> {
  try {
    const window = getGa4PullWindow(args, pull);
    const result = await runGa4Report({
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      locale: args.locale as never,
      startDate: window.from,
      endDate: window.to,
      dimensions: pull.dimensions,
      metrics: pull.metrics,
      dimensionFilter: pull.dimensionFilter,
      limit: args.ga4CompatibilitySmoke ? 1 : pull.limit,
      forceRefresh: args.force,
    });
    return {
      provider: "ga4",
      name: pull.name,
      priority: pull.priority,
      status: result.source,
      row_count: result.rows.length,
      window,
      cache_tag: result.cacheTag,
      cache_hit: result.cacheHit,
      smoke: args.ga4CompatibilitySmoke ? "compatibility" : undefined,
    };
  } catch (error) {
    return errorResult("ga4", pull.name, pull.priority, error);
  }
}

function selectedExpandedGscPulls(args: Args) {
  if (!args.daily && !args.expanded && !args.localeProfile) return [];

  return EXPANDED_GSC_PULLS.filter((pull) => {
    if (args.expanded) return true;
    if (args.daily && pull.cadence === "daily") return true;
    if (args.localeProfile && pull.profile === "gsc_locale_path_v1")
      return true;
    return false;
  });
}

function plannedGscPull(pull: (typeof GSC_PULLS)[number]): PullResult {
  return {
    provider: "gsc",
    name: pull.name,
    priority: pull.priority,
    status: "planned",
    row_count: 0,
    dimensions: [...pull.dimensions],
    search_type: "web",
  };
}

function plannedExpandedGscPull(
  args: Args,
  pull: (typeof EXPANDED_GSC_PULLS)[number],
): PullResult {
  const window = getExpandedGscPullWindow(args, pull);
  return {
    provider: "gsc",
    name: pull.name,
    profile: pull.profile,
    priority: pull.priority,
    status: "planned",
    row_count: 0,
    window,
    dimensions: [...pull.dimensions],
    search_type: pull.searchType,
    filters: pull.filters,
    cache_key: buildExpandedGscCacheKey(args, pull, window),
  };
}

async function runExpandedGscPull(
  args: Args,
  pull: (typeof EXPANDED_GSC_PULLS)[number],
): Promise<PullResult> {
  const window = getExpandedGscPullWindow(args, pull);
  const cacheKey = buildExpandedGscCacheKey(args, pull, window);
  const cacheTag = `growth:gsc:website:${WEBSITE_ID}:locale:${args.locale}:profile:${pull.profile}`;
  const admin = createSupabaseServiceRoleClient();

  try {
    if (!args.force) {
      const { data: cached } = await admin
        .from("growth_gsc_cache")
        .select("payload,fetched_at")
        .eq("website_id", WEBSITE_ID)
        .eq("cache_key", cacheKey)
        .maybeSingle();

      const row = cached as {
        payload?: unknown;
        fetched_at?: string | null;
      } | null;
      if (row?.fetched_at && isFresh(row.fetched_at)) {
        const cachedRows = rowsFromPayload(row.payload);
        return {
          provider: "gsc",
          name: pull.name,
          profile: pull.profile,
          priority: pull.priority,
          status: "cache",
          row_count: cachedRows.length,
          window,
          dimensions: [...pull.dimensions],
          search_type: pull.searchType,
          filters: pull.filters,
          cache_key: cacheKey,
          cache_tag: cacheTag,
          cache_hit: true,
        };
      }
    }

    const integration = await loadGscIntegration();
    if (!integration?.refresh_token || !integration.site_url) {
      return {
        provider: "gsc",
        name: pull.name,
        profile: pull.profile,
        priority: pull.priority,
        status: "mock",
        row_count: 0,
        window,
        dimensions: [...pull.dimensions],
        search_type: pull.searchType,
        filters: pull.filters,
        cache_key: cacheKey,
        cache_tag: cacheTag,
        cache_hit: false,
      };
    }

    const accessToken = await ensureFreshAccessToken(integration);
    const rows: SearchConsoleRow[] = [];
    let pageCount = 0;
    const rowLimit = Math.min(pull.rowLimit, DEFAULT_ROW_LIMIT);

    for (let startRow = 0; pageCount < args.maxPages; startRow += rowLimit) {
      const page = await querySearchConsole({
        accessToken,
        siteUrl: integration.site_url,
        body: {
          startDate: window.from,
          endDate: window.to,
          dimensions: pull.dimensions,
          rowLimit,
          startRow,
          type: pull.searchType,
          ...(pull.filters
            ? { dimensionFilterGroups: [{ filters: pull.filters }] }
            : {}),
        },
      });
      pageCount += 1;
      rows.push(...page);
      if (page.length < rowLimit) break;
    }

    const normalizedRows = rows.map((row) => ({
      keys: Array.isArray(row.keys) ? row.keys : [],
      clicks: typeof row.clicks === "number" ? row.clicks : 0,
      impressions: typeof row.impressions === "number" ? row.impressions : 0,
      ctr: typeof row.ctr === "number" ? row.ctr : 0,
      position: typeof row.position === "number" ? row.position : 0,
    }));

    await admin.from("growth_gsc_cache").upsert(
      {
        website_id: WEBSITE_ID,
        account_id: ACCOUNT_ID,
        cache_key: cacheKey,
        cache_tag: cacheTag,
        payload: {
          profile: pull.profile,
          pull: pull.name,
          search_type: pull.searchType,
          dimensions: [...pull.dimensions],
          filters: pull.filters ?? [],
          segment: "segment" in pull ? pull.segment : undefined,
          window,
          rows: normalizedRows,
          summary: summarizeRows(normalizedRows),
        },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "website_id,cache_key" },
    );

    return {
      provider: "gsc",
      name: pull.name,
      profile: pull.profile,
      priority: pull.priority,
      status: "live",
      row_count: normalizedRows.length,
      window,
      dimensions: [...pull.dimensions],
      search_type: pull.searchType,
      filters: pull.filters,
      cache_key: cacheKey,
      cache_tag: cacheTag,
      cache_hit: false,
      page_count: pageCount,
    };
  } catch (error) {
    return {
      ...errorResult("gsc", pull.name, pull.priority, error),
      profile: pull.profile,
      window,
      dimensions: [...pull.dimensions],
      search_type: pull.searchType,
      filters: pull.filters,
      cache_key: cacheKey,
      cache_tag: cacheTag,
    };
  }
}

function getExpandedGscPullWindow(
  args: Args,
  pull: (typeof EXPANDED_GSC_PULLS)[number],
) {
  if (pull.cadence === "daily" && !args.fromExplicit && !args.toExplicit) {
    return { from: args.to, to: args.to };
  }
  return { from: args.from, to: args.to };
}

function buildExpandedGscCacheKey(
  args: Args,
  pull: (typeof EXPANDED_GSC_PULLS)[number],
  window: { from: string; to: string },
) {
  const filters = (pull.filters ?? [])
    .map(
      (filter) => `${filter.dimension}:${filter.operator}:${filter.expression}`,
    )
    .join(",");
  const segment = "segment" in pull ? pull.segment : "*";
  const filterKey = filters ? encodeURIComponent(filters) : "*";
  return [
    "profile",
    pull.profile,
    pull.name,
    window.from,
    window.to,
    pull.dimensions.join(","),
    pull.searchType,
    filterKey,
    segment,
    args.locale,
    String(pull.rowLimit),
  ].join("|");
}

function rowsFromPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { rows?: unknown }).rows)
  ) {
    return (payload as { rows: unknown[] }).rows;
  }
  return [];
}

function summarizeRows(
  rows: Array<{ clicks: number; impressions: number; position: number }>,
) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.clicks += row.clicks;
      acc.impressions += row.impressions;
      acc.positionWeighted += row.position * row.impressions;
      return acc;
    },
    { clicks: 0, impressions: 0, positionWeighted: 0 },
  );
  return {
    row_count: rows.length,
    clicks: Number(totals.clicks.toFixed(2)),
    impressions: Number(totals.impressions.toFixed(2)),
    ctr:
      totals.impressions > 0
        ? Number((totals.clicks / totals.impressions).toFixed(6))
        : 0,
    avg_position:
      totals.impressions > 0
        ? Number((totals.positionWeighted / totals.impressions).toFixed(2))
        : 0,
  };
}

async function loadGscIntegration(): Promise<GscIntegrationRow | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("seo_integrations")
    .select(
      "account_id,website_id,refresh_token,access_token,access_token_expires_at,site_url",
    )
    .eq("account_id", ACCOUNT_ID)
    .eq("website_id", WEBSITE_ID)
    .eq("provider", "gsc")
    .maybeSingle();

  if (error)
    throw new Error(`Unable to load GSC integration: ${error.message}`);
  return (data as GscIntegrationRow | null) ?? null;
}

async function ensureFreshAccessToken(
  integration: GscIntegrationRow,
): Promise<string> {
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;
  if (integration.access_token && expiresAt - Date.now() > 60_000)
    return integration.access_token;
  if (!integration.refresh_token)
    throw new Error("GSC refresh token missing for tenant");

  const refreshed = await refreshGoogleToken(integration.refresh_token);
  try {
    const admin = createSupabaseServiceRoleClient();
    await admin
      .from("seo_integrations")
      .update({
        status: "connected",
        access_token: refreshed.access_token,
        access_token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
        last_error: null,
      })
      .eq("account_id", ACCOUNT_ID)
      .eq("website_id", WEBSITE_ID)
      .eq("provider", "gsc");
  } catch {
    // Token rotation is best-effort; the current pull can still proceed.
  }
  return refreshed.access_token;
}

function isFresh(fetchedAtRaw: string | null | undefined): boolean {
  if (!fetchedAtRaw) return false;
  const t = new Date(fetchedAtRaw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= CACHE_TTL_MS;
}

function errorResult(
  provider: "gsc" | "ga4",
  name: string,
  priority: PullResult["priority"],
  error: unknown,
): PullResult {
  const details =
    error &&
    typeof error === "object" &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "string"
      ? `: ${String((error as { details?: unknown }).details).slice(0, 500)}`
      : "";
  return {
    provider,
    name,
    priority,
    status: "error",
    row_count: 0,
    error:
      error instanceof Error ? `${error.message}${details}` : String(error),
  };
}

async function getCacheCounts() {
  const admin = createSupabaseServiceRoleClient();
  const out: Record<string, number | string | null> = {};
  for (const table of ["growth_gsc_cache", "growth_ga4_cache"]) {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("website_id", WEBSITE_ID);
    out[table] = error ? `ERR ${error.message}` : count;
  }
  return out;
}

function toMarkdown(report: {
  generated_at: string;
  mode: string;
  ga4_compatibility_smoke: boolean;
  gsc_expanded?: {
    daily: boolean;
    expanded: boolean;
    locale_profile: boolean;
    locale: string;
    max_pages: number;
  };
  website_id: string;
  window: { from: string; to: string };
  counts: Record<string, number | string | null>;
  pulls: PullResult[];
}) {
  const countRows = Object.entries(report.counts)
    .map(([table, count]) => `| ${table} | ${count} |`)
    .join("\n");
  const pullRows = report.pulls
    .map((pull) => {
      const window = pull.window
        ? `${pull.window.from} -> ${pull.window.to}`
        : "";
      return `| ${pull.provider} | ${pull.profile ?? ""} | ${pull.name} | ${pull.priority} | ${pull.status} | ${pull.row_count} | ${pull.page_count ?? ""} | ${window} | ${pull.smoke ?? ""} | ${pull.error ?? ""} |`;
    })
    .join("\n");
  return `# Growth Google Cache Populate

Generated: ${report.generated_at}
Mode: ${report.mode}
GA4 compatibility smoke: ${report.ga4_compatibility_smoke ? "yes" : "no"}
GSC expanded: ${report.gsc_expanded ? JSON.stringify(report.gsc_expanded) : "n/a"}
Website: ${report.website_id}
Window: ${report.window.from} -> ${report.window.to}

## Counts

| Table | Rows |
|---|---:|
${countRows}

## Pulls

| Provider | Profile | Pull | Priority | Status | Rows | Pages | Window | Smoke | Error |
|---|---|---|---|---:|---:|---|---|---|
${pullRows}
`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
