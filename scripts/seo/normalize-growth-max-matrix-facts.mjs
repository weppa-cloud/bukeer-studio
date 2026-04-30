#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_ORIGIN = "https://colombiatours.travel";
const DEFAULT_RUN_ID = "epic310-max-matrix-facts-close-20260430";
const DEFAULT_OUT_DIR =
  "artifacts/seo/2026-04-30-growth-max-matrix-fact-normalization";
const TARGET_DOMAIN = "colombiatours.travel";
const FACT_TABLES = [
  "seo_gsc_daily_facts",
  "seo_gsc_segment_facts",
  "seo_ga4_landing_facts",
  "seo_ga4_event_facts",
  "seo_ga4_geo_facts",
  "seo_keyword_opportunities",
  "seo_serp_snapshots",
  "seo_content_sentiment_facts",
  "seo_domain_competitive_facts",
  "seo_joint_growth_facts",
];

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const origin = stripTrailingSlash(args.origin ?? DEFAULT_ORIGIN);
const runId = args.runId ?? DEFAULT_RUN_ID;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const limit = positiveInt(args.limit, 500);
const nowIso = new Date().toISOString();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const beforeCounts = await countFactTables();
  const [gscCache, ga4Cache, dataforseoCache, inventory] = await Promise.all([
    fetchRows(
      "growth_gsc_cache",
      "cache_key,cache_tag,payload,fetched_at,expires_at",
    ),
    fetchRows(
      "growth_ga4_cache",
      "cache_key,cache_tag,payload,fetched_at,expires_at",
    ),
    fetchRows(
      "growth_dataforseo_cache",
      "endpoint,cache_key,cache_tag,payload,fetched_at,expires_at",
    ),
    fetchRows("growth_inventory", "*", { orderBy: "priority_score", limit }),
  ]);

  const facts = Object.fromEntries(
    Object.entries({
      seo_gsc_daily_facts: normalizeGscDaily(gscCache),
      seo_gsc_segment_facts: normalizeGscSegments(gscCache),
      seo_ga4_landing_facts: normalizeGa4Landing(ga4Cache),
      seo_ga4_event_facts: normalizeGa4Events(ga4Cache),
      seo_ga4_geo_facts: normalizeGa4Geo(ga4Cache),
      seo_keyword_opportunities: normalizeKeywordOpportunities(dataforseoCache),
      seo_serp_snapshots: normalizeSerpSnapshots(dataforseoCache),
      seo_content_sentiment_facts: normalizeContentSentiment(dataforseoCache),
      seo_domain_competitive_facts: normalizeDomainCompetitive(dataforseoCache),
      seo_joint_growth_facts: normalizeJointGrowthFacts(inventory),
    }).map(([table, rows]) => [table, dedupeFacts(rows)]),
  );

  const preparedCounts = Object.fromEntries(
    FACT_TABLES.map((table) => [table, facts[table].length]),
  );
  const applyResult = {};

  if (apply) {
    for (const table of FACT_TABLES) {
      applyResult[table] = await upsertFacts(table, facts[table]);
    }
  }

  const afterCounts = await countFactTables();
  const report = {
    generated_at: nowIso,
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    account_id: accountId,
    run_id: runId,
    policy: {
      llm_mentions: "WATCH; not executed in this sprint close.",
      backlinks:
        "BLOCKED by DataForSEO subscription; facts remain empty until access is enabled or fallback is approved.",
      business_reviews:
        "WATCH; Business Data smoke needs valid CID/place id before decision-grade normalization.",
      raw_to_facts:
        "Provider cache remains raw. This script only creates normalized decision facts and joint facts.",
    },
    input_counts: {
      growth_gsc_cache: gscCache.length,
      growth_ga4_cache: ga4Cache.length,
      growth_dataforseo_cache: dataforseoCache.length,
      growth_inventory: inventory.length,
    },
    before_counts: beforeCounts,
    prepared_counts: preparedCounts,
    after_counts: afterCounts,
    apply_result: applyResult,
    samples: Object.fromEntries(
      FACT_TABLES.map((table) => [table, facts[table].slice(0, 5)]),
    ),
  };

  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-fact-normalization.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-fact-normalization.md"),
    renderMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir,
        prepared_counts: preparedCounts,
        after_counts: afterCounts,
      },
      null,
      2,
    ),
  );
}

async function fetchRows(table, columns, options = {}) {
  let query = sb.from(table).select(columns).eq("website_id", websiteId);
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: false });
  } else if (columns.includes("fetched_at")) {
    query = query.order("fetched_at", { ascending: false });
  }
  query = query.limit(options.limit ?? 5000);
  const { data, error } = await query;
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return data ?? [];
}

async function countFactTables() {
  const out = {};
  for (const table of FACT_TABLES) {
    const { count, error } = await sb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("website_id", websiteId);
    out[table] = error ? `ERROR: ${error.message}` : (count ?? 0);
  }
  return out;
}

async function upsertFacts(table, rows) {
  const result = { rows: rows.length, chunks: 0, errors: [] };
  if (rows.length === 0) return result;
  for (const chunk of chunks(rows, 100)) {
    const { error } = await sb.from(table).upsert(chunk, {
      onConflict: "website_id,source_profile,fact_fingerprint",
    });
    result.chunks += 1;
    if (error) {
      result.errors.push(error.message);
      throw new Error(`${table} upsert failed: ${error.message}`);
    }
  }
  return result;
}

function normalizeGscDaily(cacheRows) {
  return latestGscReports(cacheRows)
    .filter((report) => sameDims(report.dimensions, ["date", "page"]))
    .flatMap((report) =>
      report.rows
        .map((row) => parseGscRow(row, report.dimensions))
        .filter((row) => row?.date && row?.page)
        .slice(0, limit)
        .map((row) => {
          const pageUrl = normalizePublicUrl(row.page);
          return baseFact("seo_gsc_daily_facts", {
            source_profile: "gsc_daily_complete_web_v1",
            source_cache_key: report.cache_key,
            fact_fingerprint: fingerprint(
              "gsc_daily",
              report.cache_key,
              row.date,
              pageUrl,
              row.query ?? "",
            ),
            fact_date: row.date,
            search_type: "web",
            page_url: pageUrl,
            query: row.query ?? null,
            country: row.country ?? null,
            device: row.device ?? null,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            avg_position: row.position,
            priority_score: scoreGsc(row),
            dimensions: { dimensions: report.dimensions },
            evidence: evidence(report, { row }),
          });
        }),
    );
}

function normalizeGscSegments(cacheRows) {
  return latestGscReports(cacheRows)
    .filter((report) => !sameDims(report.dimensions, ["date", "page"]))
    .flatMap((report) =>
      report.rows
        .map((row) => parseGscRow(row, report.dimensions))
        .filter(Boolean)
        .slice(0, limit)
        .map((row) => {
          const pageUrl = normalizePublicUrl(row.page);
          const segmentType = inferGscSegmentType(report.dimensions);
          const segmentValue = inferGscSegmentValue(segmentType, row);
          return baseFact("seo_gsc_segment_facts", {
            source_profile: sourceProfileFromGscDims(report.dimensions),
            source_cache_key: report.cache_key,
            fact_fingerprint: fingerprint(
              "gsc_segment",
              report.cache_key,
              segmentType,
              segmentValue,
              pageUrl,
              row.query ?? "",
            ),
            segment_type: segmentType,
            segment_value: segmentValue,
            window_start: windowStart(report),
            window_end: windowEnd(report),
            page_url: pageUrl,
            query: row.query ?? null,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            avg_position: row.position,
            priority_score: scoreGsc(row),
            dimensions: { dimensions: report.dimensions },
            evidence: evidence(report, { row }),
          });
        }),
    );
}

function latestGscReports(cacheRows) {
  const reports = cacheRows
    .map((row) => {
      const meta = parseGscCacheKey(row.cache_key);
      return {
        ...row,
        ...meta,
        rows: normalizeProviderRows(row.payload),
      };
    })
    .filter((report) => report.rows.length > 0 && report.dimensions.length > 0);
  return latestByKey(reports, (report) => report.cache_key);
}

function normalizeGa4Landing(cacheRows) {
  return latestGa4Reports(cacheRows)
    .filter((report) =>
      report.dimensions.some((dim) =>
        ["landingPagePlusQueryString", "pagePath"].includes(dim),
      ),
    )
    .flatMap((report) =>
      report.rows
        .map((row) => ga4RowToObject(report, row))
        .filter((row) => row.landingPagePlusQueryString || row.pagePath)
        .slice(0, limit)
        .map((row) => {
          const landingPage = normalizePagePath(
            row.landingPagePlusQueryString ?? row.pagePath,
          );
          const channelGroup = cleanText(row.sessionDefaultChannelGroup);
          const sourceMedium = cleanText(row.sessionSourceMedium);
          const campaign = cleanText(row.sessionCampaignName);
          return baseFact("seo_ga4_landing_facts", {
            source_profile: sourceProfileFromGa4Dims(row._dimensions),
            source_cache_key: report.cache_key,
            fact_fingerprint: fingerprint(
              "ga4_landing",
              report.cache_key,
              landingPage,
              channelGroup,
              sourceMedium,
              campaign,
            ),
            window_start: windowStart(report),
            window_end: windowEnd(report),
            landing_page: landingPage,
            channel_group: channelGroup,
            source_medium: sourceMedium,
            campaign,
            sessions: intMetric(row.sessions),
            total_users: intMetric(row.totalUsers),
            screen_page_views: intMetric(row.screenPageViews),
            engagement_rate: rateMetric(row.engagementRate),
            bounce_rate: rateMetric(row.bounceRate),
            avg_session_duration: numberOrZero(row.averageSessionDuration),
            conversions: numberOrZero(row.conversions),
            key_events: numberOrZero(row.keyEvents),
            priority_score: scoreGa4Landing(row),
            dimensions: pickDimensionValues(row),
            evidence: evidence(report, { row }),
          });
        }),
    );
}

function normalizeGa4Events(cacheRows) {
  return latestGa4Reports(cacheRows)
    .filter((report) => report.dimensions.includes("eventName"))
    .flatMap((report) =>
      report.rows
        .map((row) => ga4RowToObject(report, row))
        .filter((row) => row.eventName)
        .slice(0, limit)
        .map((row) => {
          const pagePath = normalizePagePath(row.pagePath);
          return baseFact("seo_ga4_event_facts", {
            source_profile: "ga4_event_page_v1",
            source_cache_key: report.cache_key,
            fact_fingerprint: fingerprint(
              "ga4_event",
              report.cache_key,
              row.eventName,
              pagePath,
            ),
            window_start: windowStart(report),
            window_end: windowEnd(report),
            event_name: row.eventName,
            page_path: pagePath,
            event_count: intMetric(row.eventCount),
            total_users: intMetric(row.totalUsers),
            conversions: numberOrZero(row.conversions),
            key_events: numberOrZero(row.keyEvents),
            priority_score: 100 + intMetric(row.eventCount) * 2,
            dimensions: pickDimensionValues(row),
            evidence: evidence(report, { row }),
          });
        }),
    );
}

function normalizeGa4Geo(cacheRows) {
  return latestGa4Reports(cacheRows)
    .filter((report) =>
      report.dimensions.some((dim) =>
        ["country", "city", "deviceCategory"].includes(dim),
      ),
    )
    .flatMap((report) =>
      report.rows
        .map((row) => ga4RowToObject(report, row))
        .slice(0, limit)
        .map((row) =>
          baseFact("seo_ga4_geo_facts", {
            source_profile: sourceProfileFromGa4Dims(row._dimensions),
            source_cache_key: report.cache_key,
            fact_fingerprint: fingerprint(
              "ga4_geo",
              report.cache_key,
              row.country,
              row.city,
              row.deviceCategory,
              row.landingPagePlusQueryString ?? row.pagePath,
            ),
            window_start: windowStart(report),
            window_end: windowEnd(report),
            country: cleanText(row.country),
            city: cleanText(row.city),
            device_category: cleanText(row.deviceCategory),
            landing_page: normalizePagePath(
              row.landingPagePlusQueryString ?? row.pagePath,
            ),
            sessions: intMetric(row.sessions),
            total_users: intMetric(row.totalUsers),
            engagement_rate: rateMetric(row.engagementRate),
            conversions: numberOrZero(row.conversions),
            key_events: numberOrZero(row.keyEvents),
            priority_score: scoreGa4Landing(row),
            dimensions: pickDimensionValues(row),
            evidence: evidence(report, { row }),
          }),
        ),
    );
}

function latestGa4Reports(cacheRows) {
  const reports = cacheRows
    .map((row) => {
      const payload = row.payload ?? {};
      const dimensions = normalizeHeaders(payload.dimensionHeaders).length
        ? normalizeHeaders(payload.dimensionHeaders)
        : inferHeadersFromGa4CacheKey(row.cache_key, "dimensions");
      const metrics = normalizeHeaders(payload.metricHeaders).length
        ? normalizeHeaders(payload.metricHeaders)
        : inferHeadersFromGa4CacheKey(row.cache_key, "metrics");
      return {
        ...row,
        ...parseGa4Window(row.cache_key),
        dimensions,
        metrics,
        rows: Array.isArray(payload.rows) ? payload.rows : [],
      };
    })
    .filter((report) => report.rows.length > 0 && report.dimensions.length > 0);
  return latestByKey(reports, (report) => report.cache_key);
}

function normalizeKeywordOpportunities(cacheRows) {
  return cacheRows
    .filter((row) => isEndpoint(row, ["dataforseo_labs", "keywords_data"]))
    .flatMap((cache) =>
      extractDataForSeoItems(cache.payload).map((item) => ({ cache, item })),
    )
    .filter(({ item }) => item.keyword)
    .slice(0, limit)
    .map(({ cache, item }) =>
      baseFact("seo_keyword_opportunities", {
        source_profile: inferDataForSeoProfile(cache),
        source_cache_key: cache.cache_key,
        fact_fingerprint: fingerprint(
          "keyword",
          cache.cache_key,
          item.keyword,
          item.location_code,
          item.language_code,
        ),
        keyword: String(item.keyword),
        locale: localeFromLanguage(item.language_code),
        market: marketFromLocation(item.location_code),
        cluster: inferKeywordCluster(item.keyword),
        intent:
          item.search_intent_info?.main_intent ??
          inferKeywordIntent(item.keyword),
        relevant_page: normalizePublicUrl(
          item.url ?? item.relevant_url ?? item.page,
        ),
        search_volume: intMetric(
          item.keyword_info?.search_volume ?? item.search_volume,
        ),
        cpc: numberOrZero(item.keyword_info?.cpc ?? item.cpc),
        competition: numberOrZero(
          item.keyword_info?.competition ?? item.competition,
        ),
        difficulty: numberOrZero(
          item.keyword_properties?.keyword_difficulty ??
            item.keyword_difficulty,
        ),
        current_rank: intMetric(item.rank_absolute ?? item.rank_group),
        priority_score: scoreKeyword(item),
        evidence: evidence(cache, { item: compactItem(item) }),
      }),
    );
}

function normalizeSerpSnapshots(cacheRows) {
  return cacheRows
    .filter((row) => isEndpoint(row, ["serp"]))
    .flatMap((cache) =>
      extractSerpResults(cache).map((result) => ({ cache, result })),
    )
    .filter(({ result }) => result.keyword)
    .slice(0, limit)
    .map(({ cache, result }) =>
      baseFact("seo_serp_snapshots", {
        source_profile: inferDataForSeoProfile(cache),
        source_cache_key: cache.cache_key,
        fact_fingerprint: fingerprint(
          "serp",
          cache.cache_key,
          result.keyword,
          result.location_code,
          result.language_code,
          result.device,
        ),
        keyword: result.keyword,
        location_code: String(result.location_code ?? ""),
        language_code: String(result.language_code ?? ""),
        device: result.device ?? "desktop",
        observed_at: cache.fetched_at ?? nowIso,
        own_rank: result.own_rank,
        own_url: result.own_url,
        serp_features: result.serp_features,
        competitor_domains: result.competitor_domains,
        opportunity_type: result.own_rank
          ? "improve_owned_result"
          : "competitor_gap",
        priority_score: result.own_rank
          ? Math.max(100, 500 - result.own_rank * 10)
          : 450,
        evidence: evidence(cache, { result }),
      }),
    );
}

function normalizeContentSentiment(cacheRows) {
  return cacheRows
    .filter((row) => isEndpoint(row, ["content_analysis"]))
    .flatMap((cache) =>
      extractContentAnalysisFacts(cache).map((fact) => ({ cache, fact })),
    )
    .slice(0, limit)
    .map(({ cache, fact }) =>
      baseFact("seo_content_sentiment_facts", {
        source_profile: "dfs_content_brand_sentiment_v1",
        source_cache_key: cache.cache_key,
        fact_fingerprint: fingerprint(
          "content_sentiment",
          cache.cache_key,
          fact.topic,
          fact.brand,
        ),
        topic: fact.topic,
        brand: fact.brand,
        sentiment_score: fact.sentiment_score,
        mention_count: fact.mention_count,
        source_domains: fact.source_domains,
        themes: fact.themes,
        priority_score: fact.priority_score,
        evidence: evidence(cache, { fact }),
      }),
    );
}

function normalizeDomainCompetitive(cacheRows) {
  return cacheRows
    .filter((row) => isEndpoint(row, ["domain_analytics"]))
    .flatMap((cache) =>
      extractDomainFacts(cache).map((fact) => ({ cache, fact })),
    )
    .slice(0, limit)
    .map(({ cache, fact }) =>
      baseFact("seo_domain_competitive_facts", {
        source_profile: "dfs_domain_competitive_baseline_v1",
        source_cache_key: cache.cache_key,
        fact_fingerprint: fingerprint(
          "domain_competitive",
          cache.cache_key,
          fact.target_domain,
          fact.competitor_domain,
          fact.fact_type,
        ),
        target_domain: fact.target_domain,
        competitor_domain: fact.competitor_domain,
        fact_type: fact.fact_type,
        observed_at: cache.fetched_at ?? nowIso,
        metrics: fact.metrics,
        technologies: fact.technologies ?? [],
        priority_score: fact.priority_score,
        evidence: evidence(cache, { fact }),
      }),
    );
}

function normalizeJointGrowthFacts(inventoryRows) {
  return inventoryRows
    .filter((row) => row.source_url || row.canonical_url)
    .slice(0, limit)
    .map((row) => {
      const url = normalizePublicUrl(row.source_url ?? row.canonical_url);
      const baseline = baselineFromInventory(row);
      const councilReady =
        hasBaseline(baseline) &&
        Boolean(row.owner_issue) &&
        Boolean(row.success_metric) &&
        Boolean(row.evaluation_date);
      return baseFact("seo_joint_growth_facts", {
        source_profile: "growth_joint_fact_closure_v1",
        fact_fingerprint: fingerprint(
          "joint",
          row.id ?? url,
          row.updated_at ?? "",
        ),
        joint_profile: inferJointProfile(row),
        source_rows: [`growth_inventory:${row.id ?? url}`],
        source_url: url,
        market: row.market,
        locale: row.locale,
        baseline,
        metrics: {
          gsc_clicks_28d: intMetric(row.gsc_clicks_28d),
          gsc_impressions_28d: intMetric(row.gsc_impressions_28d),
          gsc_ctr: numberOrZero(row.gsc_ctr),
          gsc_avg_position: numberOrZero(row.gsc_avg_position),
          ga4_sessions_28d: intMetric(row.ga4_sessions_28d),
          ga4_engagement: numberOrZero(row.ga4_engagement),
          waflow_opens: intMetric(row.waflow_opens),
          waflow_submits: intMetric(row.waflow_submits),
          whatsapp_clicks: intMetric(row.whatsapp_clicks),
          bookings_confirmed: intMetric(row.bookings_confirmed),
        },
        recommendation: {
          next_action: row.next_action,
          owner: row.owner,
          owner_issue: row.owner_issue,
          status: row.status,
          success_metric: row.success_metric,
          evaluation_date: row.evaluation_date,
          technical_status: row.technical_status,
          content_status: row.content_status,
          conversion_status: row.conversion_status,
          attribution_status: row.attribution_status,
        },
        priority_score: intMetric(row.priority_score),
        council_ready: councilReady,
        evidence: {
          source: "growth_inventory",
          row_id: row.id ?? null,
          blocked_reason: councilReady
            ? null
            : "Missing baseline, owner issue, success metric, or evaluation date.",
        },
      });
    });
}

function baseFact(table, fields) {
  return {
    account_id: accountId,
    website_id: websiteId,
    run_id: runId,
    ...fields,
    updated_at: nowIso,
  };
}

function parseGscRow(row, dimensions) {
  const keys = Array.isArray(row.keys) ? row.keys : [];
  const out = {
    clicks: numberOrZero(row.clicks),
    impressions: numberOrZero(row.impressions),
    ctr: numberOrZero(row.ctr),
    position: numberOrZero(row.position),
  };
  dimensions.forEach((dimension, index) => {
    out[dimension] = keys[index];
  });
  return out;
}

function parseGscCacheKey(cacheKey) {
  const parts = String(cacheKey ?? "").split("|");
  return {
    windowStart: isDate(parts[0]) ? parts[0] : null,
    windowEnd: isDate(parts[1]) ? parts[1] : null,
    dimensions: (parts[2] ?? "").split(",").filter(Boolean),
  };
}

function ga4RowToObject(report, row) {
  const dimensions = normalizeValues(row.dimensionValues);
  const metrics = normalizeValues(row.metricValues);
  const out = { _dimensions: report.dimensions, _metrics: report.metrics };
  report.dimensions.forEach((name, index) => {
    out[name] = dimensions[index] ?? "";
  });
  report.metrics.forEach((name, index) => {
    out[name] = numberOrZero(metrics[index]);
  });
  return out;
}

function parseGa4Window(cacheKey) {
  const parts = String(cacheKey ?? "").split("|");
  return {
    windowStart: isDate(parts[0]) ? parts[0] : null,
    windowEnd: isDate(parts[1]) ? parts[1] : null,
  };
}

function inferHeadersFromGa4CacheKey(cacheKey, kind) {
  const parts = String(cacheKey ?? "").split("|");
  const raw = kind === "metrics" ? parts[2] : parts[3];
  return String(raw ?? "")
    .split(",")
    .filter(Boolean);
}

function normalizeHeaders(headers) {
  if (!Array.isArray(headers)) return [];
  return headers
    .map((header) => {
      if (typeof header === "string") return header;
      return header?.name ?? "";
    })
    .filter(Boolean);
}

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => {
    if (value && typeof value === "object" && "value" in value) {
      return value.value ?? "";
    }
    return value ?? "";
  });
}

function normalizeProviderRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function extractDataForSeoItems(payload) {
  const out = [];
  for (const result of extractDataForSeoResults(payload)) {
    if (Array.isArray(result.items)) out.push(...result.items);
    if (result.keyword) out.push(result);
  }
  return out;
}

function extractDataForSeoResults(payload) {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  return tasks.flatMap((task) =>
    Array.isArray(task.result) ? task.result : [],
  );
}

function extractSerpResults(cache) {
  const tasks = Array.isArray(cache.payload?.tasks) ? cache.payload.tasks : [];
  const out = [];
  for (const task of tasks) {
    const taskData = Array.isArray(task.data)
      ? task.data[0]
      : (task.data ?? {});
    const keyword =
      taskData.keyword ??
      taskData.keywords?.[0] ??
      keywordFromCacheKey(cache.cache_key);
    for (const result of Array.isArray(task.result) ? task.result : []) {
      const serpItems = Array.isArray(result.items) ? result.items : [];
      const own = serpItems.find((item) =>
        String(item.domain ?? item.url ?? "").includes(TARGET_DOMAIN),
      );
      const competitorDomains = [
        ...new Set(
          serpItems
            .map((item) => cleanDomain(item.domain ?? item.url))
            .filter((domain) => domain && !domain.includes(TARGET_DOMAIN))
            .slice(0, 10),
        ),
      ];
      out.push({
        keyword: result.keyword ?? keyword,
        location_code: result.location_code ?? taskData.location_code,
        language_code: result.language_code ?? taskData.language_code,
        device: taskData.device ?? "desktop",
        own_rank: own ? intMetric(own.rank_absolute ?? own.rank_group) : null,
        own_url: own?.url ?? null,
        competitor_domains: competitorDomains,
        serp_features: [
          ...new Set(
            serpItems
              .map((item) => item.type)
              .filter(Boolean)
              .slice(0, 20),
          ),
        ],
      });
    }
  }
  return out;
}

function extractContentAnalysisFacts(cache) {
  const facts = [];
  const tasks = Array.isArray(cache.payload?.tasks) ? cache.payload.tasks : [];
  for (const task of tasks) {
    const taskData = Array.isArray(task.data)
      ? task.data[0]
      : (task.data ?? {});
    const topic = taskData.keyword ?? taskData.tag ?? "colombiatours";
    for (const result of Array.isArray(task.result) ? task.result : []) {
      const items = Array.isArray(result.items) ? result.items : [];
      const domains = [
        ...new Set(
          items
            .map((item) => cleanDomain(item.url ?? item.domain))
            .filter(Boolean),
        ),
      ].slice(0, 20);
      facts.push({
        topic,
        brand: "ColombiaTours",
        sentiment_score:
          numberOrZero(result.sentiment_connotations?.positive) -
          numberOrZero(result.sentiment_connotations?.negative),
        mention_count: intMetric(
          result.total_count ?? result.items_count ?? items.length,
        ),
        source_domains: domains,
        themes: {
          cache_tag: cache.cache_tag,
          endpoint: cache.endpoint,
          categories:
            result.category_intersections ?? result.categories ?? null,
        },
        priority_score:
          150 +
          Math.min(intMetric(result.total_count ?? items.length), 100) * 2,
      });
    }
  }
  return facts;
}

function extractDomainFacts(cache) {
  const facts = [];
  const cacheTarget = targetFromCacheKey(cache.cache_key);
  for (const result of extractDataForSeoResults(cache.payload)) {
    const items = Array.isArray(result.items) ? result.items : [];
    if (items.length === 0) {
      facts.push(domainFact(cache, cacheTarget, result));
    } else {
      for (const item of items.slice(0, 50)) {
        facts.push(domainFact(cache, cacheTarget, item));
      }
    }
  }
  return facts.filter((fact) => fact.target_domain);
}

function domainFact(cache, cacheTarget, item) {
  const domain = cleanDomain(
    item.domain ?? item.target ?? item.url ?? cacheTarget,
  );
  return {
    target_domain: cacheTarget || TARGET_DOMAIN,
    competitor_domain: domain && domain !== cacheTarget ? domain : null,
    fact_type: cache.endpoint?.includes("/technologies/")
      ? "technology_stack"
      : cache.endpoint?.includes("/whois/")
        ? "whois_overview"
        : "domain_context",
    metrics: stripLarge({
      domain,
      rank: item.rank,
      total_count: item.total_count,
      backlinks_info: item.backlinks_info,
      organic_etv: item.metrics?.organic?.etv ?? item.etv,
      raw_summary: item.summary,
    }),
    technologies: item.technologies ?? item.technology_stack ?? null,
    priority_score: domain?.includes(TARGET_DOMAIN) ? 200 : 120,
  };
}

function inferGscSegmentType(dimensions) {
  if (sameDims(dimensions, ["query", "page"])) return "query_page";
  if (dimensions.includes("country")) return "country";
  if (dimensions.includes("device")) return "device";
  if (dimensions.includes("searchAppearance")) return "search_appearance";
  return dimensions.join("_") || "unknown";
}

function inferGscSegmentValue(type, row) {
  if (type === "query_page") return row.query ?? "";
  if (type === "country") return row.country ?? "";
  if (type === "device") return row.device ?? "";
  if (type === "search_appearance") return row.searchAppearance ?? "";
  return row.query ?? row.page ?? "";
}

function sourceProfileFromGscDims(dimensions) {
  if (sameDims(dimensions, ["query", "page"])) return "gsc_query_page_28d_v1";
  if (sameDims(dimensions, ["page", "country"]))
    return "gsc_market_page_28d_v1";
  if (sameDims(dimensions, ["page", "device"])) return "gsc_device_page_28d_v1";
  if (sameDims(dimensions, ["date", "page"]))
    return "gsc_daily_complete_web_v1";
  if (dimensions.includes("searchAppearance"))
    return "gsc_search_appearance_v1";
  return `gsc_${dimensions.join("_")}_v1`;
}

function sourceProfileFromGa4Dims(dimensions) {
  if (dimensions.includes("eventName")) return "ga4_event_page_v1";
  if (dimensions.includes("country") || dimensions.includes("city"))
    return "ga4_geo_landing_28d_v1";
  if (dimensions.includes("deviceCategory")) return "ga4_device_landing_28d_v1";
  if (dimensions.includes("hostName")) return "ga4_hostname_locale_28d_v1";
  if (dimensions.includes("sessionCampaignName"))
    return "ga4_campaign_source_medium_v1";
  if (dimensions.includes("sessionSourceMedium"))
    return "ga4_page_source_medium_v1";
  return "ga4_landing_channel_v1";
}

function inferDataForSeoProfile(cache) {
  const key = `${cache.cache_key ?? ""} ${cache.cache_tag ?? ""} ${cache.endpoint ?? ""}`;
  if (key.includes("competitor_visibility"))
    return "dfs_labs_competitor_visibility_v1";
  if (key.includes("gap_intersections")) return "dfs_labs_gap_intersections_v1";
  if (key.includes("labs")) return "dfs_labs_demand_cluster_v1";
  if (key.includes("/serp/google/maps")) return "dfs_serp_local_pack_v1";
  if (key.includes("/serp/")) return "dfs_serp_priority_keywords_v1";
  if (key.includes("content_analysis")) return "dfs_content_brand_sentiment_v1";
  if (key.includes("domain_analytics"))
    return "dfs_domain_competitive_baseline_v1";
  return "dfs_max_matrix_unknown_v1";
}

function isEndpoint(row, needles) {
  const haystack =
    `${row.endpoint ?? ""} ${row.cache_key ?? ""} ${row.cache_tag ?? ""}`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function evidence(cache, extra = {}) {
  return {
    cache_key: cache.cache_key,
    cache_tag: cache.cache_tag,
    endpoint: cache.endpoint ?? null,
    fetched_at: cache.fetched_at,
    expires_at: cache.expires_at,
    ...extra,
  };
}

function scoreGsc(row) {
  const impressions = numberOrZero(row.impressions);
  const ctrGap = Math.max(0, 0.04 - numberOrZero(row.ctr));
  const position = numberOrZero(row.position);
  return Math.round(
    Math.min(
      900,
      impressions * 0.4 + ctrGap * 2000 + Math.max(0, position - 8) * 15,
    ),
  );
}

function scoreGa4Landing(row) {
  const sessions = intMetric(row.sessions);
  const engagement = rateMetric(row.engagementRate);
  const conversions = numberOrZero(row.conversions);
  return Math.round(
    150 +
      Math.min(sessions, 250) * 2 +
      Math.max(0, 0.5 - engagement) * 500 +
      (conversions === 0 ? 100 : 0),
  );
}

function scoreKeyword(item) {
  const volume = intMetric(
    item.keyword_info?.search_volume ?? item.search_volume,
  );
  const cpc = numberOrZero(item.keyword_info?.cpc ?? item.cpc);
  const difficulty = numberOrZero(
    item.keyword_properties?.keyword_difficulty ?? item.keyword_difficulty,
  );
  return Math.round(
    Math.min(
      900,
      120 + volume * 0.08 + cpc * 20 + Math.max(0, 60 - difficulty) * 2,
    ),
  );
}

function baselineFromInventory(row) {
  return {
    window_start: row.baseline_start ?? null,
    window_end: row.baseline_end ?? null,
    gsc_impressions_28d: intMetric(row.gsc_impressions_28d),
    gsc_clicks_28d: intMetric(row.gsc_clicks_28d),
    ga4_sessions_28d: intMetric(row.ga4_sessions_28d),
    waflow_opens: intMetric(row.waflow_opens),
    waflow_submits: intMetric(row.waflow_submits),
    whatsapp_clicks: intMetric(row.whatsapp_clicks),
  };
}

function hasBaseline(baseline) {
  return [
    baseline.gsc_impressions_28d,
    baseline.gsc_clicks_28d,
    baseline.ga4_sessions_28d,
    baseline.waflow_opens,
    baseline.waflow_submits,
    baseline.whatsapp_clicks,
  ].some((value) => Number(value) > 0);
}

function inferJointProfile(row) {
  if (row.channel === "ai_search") return "growth_ai_geo_conversion_fit_v1";
  if (row.channel === "paid") return "growth_paid_governance_v1";
  if (row.conversion_status === "blocked")
    return "growth_search_to_activation_v1";
  if (row.market && row.market !== "CO") return "growth_market_fit_v1";
  if (row.content_status === "content_blocked")
    return "growth_locale_launch_readiness_v1";
  if (row.technical_status && row.technical_status !== "pass")
    return "growth_post_fix_validation_v1";
  return "growth_search_to_activation_v1";
}

function pickDimensionValues(row) {
  const out = {};
  for (const key of row._dimensions ?? []) out[key] = row[key] ?? "";
  return out;
}

function compactItem(item) {
  return stripLarge({
    keyword: item.keyword,
    language_code: item.language_code,
    location_code: item.location_code,
    keyword_info: item.keyword_info,
    keyword_properties: item.keyword_properties,
    search_intent_info: item.search_intent_info,
    rank_absolute: item.rank_absolute,
    url: item.url,
  });
}

function stripLarge(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function sameDims(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function latestByKey(rows, keyFn) {
  const out = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!out.has(key)) out.set(key, row);
  }
  return [...out.values()];
}

function dedupeFacts(rows) {
  const out = new Map();
  for (const row of rows) {
    const key = `${row.website_id}|${row.source_profile}|${row.fact_fingerprint}`;
    if (!out.has(key)) out.set(key, row);
  }
  return [...out.values()];
}

function normalizePublicUrl(value) {
  if (!value) return null;
  try {
    if (String(value).startsWith("http"))
      return stripTrailingSlash(String(value));
    return `${origin}${normalizePagePath(value)}`;
  } catch {
    return null;
  }
}

function normalizePagePath(value) {
  const raw = cleanText(value);
  if (!raw || raw === "(not set)") return "/";
  if (raw.startsWith("http")) {
    try {
      const parsed = new URL(raw);
      return `${parsed.pathname}${parsed.search}` || "/";
    } catch {
      return "/";
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function cleanDomain(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^www\./, "").split("/")[0] || null;
  }
}

function targetFromCacheKey(cacheKey) {
  const match = String(cacheKey ?? "").match(
    /(?:whois|technologies)\|?([a-z0-9.-]+\.[a-z]{2,})/i,
  );
  return match ? cleanDomain(match[1]) : TARGET_DOMAIN;
}

function keywordFromCacheKey(cacheKey) {
  const parts = String(cacheKey ?? "").split("|");
  return parts.find((part) => part.includes("colombia")) ?? "colombia tours";
}

function localeFromLanguage(languageCode) {
  if (String(languageCode).startsWith("en")) return "en-US";
  return "es-CO";
}

function marketFromLocation(locationCode) {
  const value = String(locationCode ?? "");
  if (value === "2840") return "US";
  if (value === "2484") return "MX";
  return "CO";
}

function inferKeywordCluster(keyword) {
  const lower = String(keyword ?? "").toLowerCase();
  if (lower.includes("amazonas")) return "amazonas";
  if (lower.includes("cartagena")) return "cartagena";
  if (lower.includes("medellin")) return "medellin";
  if (lower.includes("bogota")) return "bogota";
  if (lower.includes("tour")) return "tours";
  return "seo_demand";
}

function inferKeywordIntent(keyword) {
  const lower = String(keyword ?? "").toLowerCase();
  if (
    lower.includes("precio") ||
    lower.includes("package") ||
    lower.includes("paquete")
  ) {
    return "commercial";
  }
  if (
    lower.includes("qué") ||
    lower.includes("what") ||
    lower.includes("how")
  ) {
    return "informational";
  }
  return "mixed";
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function intMetric(value) {
  return Math.round(numberOrZero(value));
}

function rateMetric(value) {
  const number = numberOrZero(value);
  if (number > 1) return number / 100;
  return number;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fingerprint(...parts) {
  return crypto
    .createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex");
}

function chunks(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

function windowEnd(report) {
  if (isDate(report.windowEnd)) return report.windowEnd;
  if (report.fetched_at) return String(report.fetched_at).slice(0, 10);
  return nowIso.slice(0, 10);
}

function windowStart(report) {
  if (isDate(report.windowStart)) return report.windowStart;
  const end = new Date(`${windowEnd(report)}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - 27);
  return end.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = {};
  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [key, value = "true"] = item.slice(2).split("=");
    out[key] = value;
  }
  return out;
}

function renderMarkdown(report) {
  const rows = FACT_TABLES.map((table) => {
    const before = report.before_counts[table] ?? 0;
    const prepared = report.prepared_counts[table] ?? 0;
    const after = report.after_counts[table] ?? before;
    return `| ${table} | ${before} | ${prepared} | ${after} |`;
  }).join("\n");

  return `# Growth Max Matrix Fact Normalization

Generated: ${report.generated_at}
Mode: ${report.mode}
Run: \`${report.run_id}\`
Website: ${report.website_id}

## Policy Decisions

- LLM Mentions: ${report.policy.llm_mentions}
- Backlinks: ${report.policy.backlinks}
- Business/Reviews: ${report.policy.business_reviews}
- Flow: ${report.policy.raw_to_facts}

## Counts

| Table | Before | Prepared | After |
|---|---:|---:|---:|
${rows}

## Inputs

| Source | Rows |
|---|---:|
| growth_gsc_cache | ${report.input_counts.growth_gsc_cache} |
| growth_ga4_cache | ${report.input_counts.growth_ga4_cache} |
| growth_dataforseo_cache | ${report.input_counts.growth_dataforseo_cache} |
| growth_inventory | ${report.input_counts.growth_inventory} |
`;
}
