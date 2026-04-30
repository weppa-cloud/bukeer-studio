#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_ORIGIN = "https://colombiatours.travel";
const DEFAULT_LOCALE = "es-CO";
const DEFAULT_MARKET = "CO";
const DEFAULT_MAX_COUNCIL = 5;
const DEFAULT_INVENTORY_LIMIT = 500;
const DEFAULT_EVALUATION_DAYS = 14;

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const origin = stripTrailingSlash(args.origin ?? DEFAULT_ORIGIN);
const maxCouncil = positiveInt(
  args.maxCouncil ?? args.maxActive,
  DEFAULT_MAX_COUNCIL,
);
const inventoryLimit = positiveInt(
  args.inventoryLimit ?? args.limit,
  DEFAULT_INVENTORY_LIMIT,
);
const evaluationDays = positiveInt(
  args.evaluationDays,
  DEFAULT_EVALUATION_DAYS,
);
const runDate = args.date ?? todayIso();
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${runDate}-growth-joint-normalizers`);

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

  const [inventory, gscCache, ga4Cache, funnelEvents, metaEvents] =
    await Promise.all([
      fetchInventory(),
      fetchOptional(
        "growth_gsc_cache",
        "cache_key,cache_tag,payload,fetched_at,expires_at",
      ),
      fetchOptional(
        "growth_ga4_cache",
        "cache_key,cache_tag,payload,fetched_at,expires_at",
      ),
      fetchOptional(
        "funnel_events",
        "event_name,stage,channel,locale,market,occurred_at,source_url,page_path",
      ),
      fetchOptional(
        "meta_conversion_events",
        "event_name,event_time,event_source_url,status",
      ),
    ]);

  const gscFacts = summarizeGscCache(gscCache.rows);
  const ga4Facts = summarizeGa4Cache(ga4Cache.rows);
  const funnelFacts = summarizeFunnelEvents(funnelEvents.rows);
  const metaFacts = summarizeMetaEvents(metaEvents.rows);
  const candidates = buildCandidates({
    inventory,
    gscFacts,
    ga4Facts,
    funnelFacts,
    metaFacts,
  });
  const backlogRows = candidates.filter(
    (candidate) => !candidate.council_ready,
  );
  const councilRows = candidates
    .filter((candidate) => candidate.council_ready)
    .sort(compareCandidates)
    .slice(0, maxCouncil);

  const applyResult = apply
    ? await promoteCouncilRows(councilRows)
    : { applied: false, updated: [], skipped: [] };

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    account_id: accountId,
    run_date: runDate,
    rules: {
      max_council_rows: maxCouncil,
      evaluation_days: evaluationDays,
      side_effects: apply
        ? "updates selected growth_inventory rows only"
        : "dry-run only; no DB mutations",
      backlog_mass_policy:
        "All eligible backlog rows are scored and reported, but only the top Council-ready rows are promoted.",
    },
    input_counts: {
      growth_inventory: inventory.length,
      growth_gsc_cache: gscCache.rows.length,
      growth_ga4_cache: ga4Cache.rows.length,
      funnel_events: funnelEvents.rows.length,
      meta_conversion_events: metaEvents.rows.length,
    },
    source_health: {
      growth_gsc_cache: gscCache.status,
      growth_ga4_cache: ga4Cache.status,
      funnel_events: funnelEvents.status,
      meta_conversion_events: metaEvents.status,
    },
    counts: {
      candidates: candidates.length,
      council_ready: candidates.filter((row) => row.council_ready).length,
      council_promoted: councilRows.length,
      backlog_rows: backlogRows.length,
      apply_updated: applyResult.updated.length,
      apply_skipped: applyResult.skipped.length,
    },
    council_rows: councilRows.map(toReportRow),
    backlog_summary: summarizeBacklog(backlogRows),
    backlog_top_rows: backlogRows
      .sort(compareCandidates)
      .slice(0, 30)
      .map(toReportRow),
    apply_result: applyResult,
  };

  await fs.writeFile(
    path.join(outDir, "growth-joint-normalizers.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "growth-joint-normalizers.md"),
    renderMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir,
        counts: report.counts,
        source_health: report.source_health,
      },
      null,
      2,
    ),
  );
}

async function fetchInventory() {
  const { data, error } = await sb
    .from("growth_inventory")
    .select("*")
    .eq("website_id", websiteId)
    .neq("status", "archived")
    .order("priority_score", { ascending: false })
    .limit(inventoryLimit);
  if (error) throw new Error(`growth_inventory read failed: ${error.message}`);
  return data ?? [];
}

async function fetchOptional(table, columns) {
  const query = sb
    .from(table)
    .select(columns)
    .eq("website_id", websiteId)
    .limit(5000);
  const { data, error } = await query;
  if (error) {
    return {
      table,
      status: "WARN",
      rows: [],
      error: error.message,
    };
  }
  return {
    table,
    status: "PASS",
    rows: data ?? [],
  };
}

function buildCandidates({
  inventory,
  gscFacts,
  ga4Facts,
  funnelFacts,
  metaFacts,
}) {
  const out = [];
  for (const row of inventory) {
    const url = normalizeUrl(row.source_url || row.canonical_url);
    const canonicalUrl = normalizeUrl(row.canonical_url || row.source_url);
    const gsc =
      gscFacts.byUrl.get(url) ?? gscFacts.byUrl.get(canonicalUrl) ?? emptyGsc();
    const ga4 =
      ga4Facts.byUrl.get(url) ?? ga4Facts.byUrl.get(canonicalUrl) ?? emptyGa4();
    const funnel =
      funnelFacts.byUrl.get(url) ??
      funnelFacts.byUrl.get(canonicalUrl) ??
      emptyFunnel();
    const meta =
      metaFacts.byUrl.get(url) ??
      metaFacts.byUrl.get(canonicalUrl) ??
      emptyMeta();
    const merged = mergeSignals(row, { gsc, ga4, funnel, meta });
    const profiles = jointProfiles(row, merged, metaFacts.global);
    if (profiles.length === 0) continue;

    const score = scoreCandidate(row, merged, profiles);
    const baseline = baselineFor(row, merged);
    const owner = ownerFor(row, profiles);
    const successMetric = successMetricFor(profiles, row);
    const evaluationDate = evaluationDateFor(row);
    const missing = requiredMissing(row, {
      source_row: row.id,
      baseline,
      owner,
      success_metric: successMetric,
      evaluation_date: evaluationDate,
    });

    out.push({
      id: row.id,
      source_url: url,
      canonical_url: canonicalUrl,
      cluster: row.cluster,
      channel: normalizeChannel(row.channel),
      market: row.market ?? inferMarket(canonicalUrl),
      locale: row.locale ?? inferLocale(canonicalUrl),
      status: row.status,
      priority_score: score,
      existing_priority_score: Number(row.priority_score ?? 0),
      profiles,
      baseline,
      owner,
      owner_issue: ownerIssueFor(row, profiles),
      success_metric: successMetric,
      evaluation_date: evaluationDate,
      hypothesis: hypothesisFor(row, profiles, baseline),
      experiment_id: row.experiment_id ?? experimentId(row, profiles),
      source_refs: sourceRefs({ gsc, ga4, funnel, meta }),
      metrics: merged,
      council_ready: missing.length === 0 && baselineHasSignal(merged),
      missing_fields: missing,
      next_action: nextActionFor(row, profiles, merged),
      raw_statuses: {
        technical_status: row.technical_status,
        content_status: row.content_status,
        conversion_status: row.conversion_status,
        attribution_status: row.attribution_status,
      },
    });
  }
  return out.sort(compareCandidates);
}

function jointProfiles(row, metrics, metaGlobal) {
  const profiles = new Set();
  const activationCount =
    metrics.waflow_opens + metrics.waflow_submits + metrics.whatsapp_clicks;
  const leadCount =
    metrics.qualified_leads + metrics.quotes_sent + metrics.bookings_confirmed;
  const paidChannel = ["meta", "google_ads", "tiktok"].includes(
    normalizeChannel(row.channel),
  );

  if (
    metrics.gsc_impressions_28d >= 40 &&
    metrics.ga4_sessions_28d >= 10 &&
    (activationCount === 0 || activationCount / metrics.ga4_sessions_28d < 0.03)
  ) {
    profiles.add("growth_search_to_activation_v1");
  }

  if (
    metrics.gsc_impressions_28d >= 40 &&
    (row.conversion_status === "blocked" ||
      metrics.ga4_engagement < 0.45 ||
      activationCount === 0)
  ) {
    profiles.add("growth_mobile_seo_cro_v1");
  }

  if (
    paidChannel &&
    metrics.ga4_sessions_28d >= 5 &&
    (leadCount === 0 || metrics.meta_total === 0 || metaGlobal.sent === 0)
  ) {
    profiles.add("growth_paid_governance_v1");
  }

  if (
    ["US", "MX", "EU", "CA"].includes(row.market) &&
    (metrics.gsc_impressions_28d >= 25 || metrics.ga4_sessions_28d >= 10)
  ) {
    profiles.add("growth_market_fit_v1");
  }

  if (
    ["blocked", "pass_with_watch"].includes(row.technical_status) &&
    (metrics.gsc_impressions_28d > 0 || metrics.ga4_sessions_28d > 0)
  ) {
    profiles.add("growth_post_fix_validation_v1");
  }

  if (
    ["authority", "content", "organic"].includes(
      normalizeChannel(row.channel),
    ) &&
    (String(row.owner_issue ?? "").includes("334") ||
      String(row.owner_issue ?? "").includes("314") ||
      metrics.gsc_impressions_28d >= 75)
  ) {
    profiles.add("growth_authority_content_fit_v1");
  }

  if (
    normalizeChannel(row.channel) === "ai_search" ||
    String(row.owner_issue ?? "").includes("384") ||
    String(row.next_action ?? "")
      .toLowerCase()
      .includes("ai/geo")
  ) {
    profiles.add("growth_ai_geo_conversion_fit_v1");
  }

  return [...profiles];
}

function mergeSignals(row, { gsc, ga4, funnel, meta }) {
  return {
    gsc_clicks_28d: maxNum(row.gsc_clicks_28d, gsc.clicks),
    gsc_impressions_28d: maxNum(row.gsc_impressions_28d, gsc.impressions),
    gsc_ctr: maxNum(row.gsc_ctr, gsc.ctr),
    gsc_avg_position: maxNum(row.gsc_avg_position, gsc.position),
    ga4_sessions_28d: maxNum(row.ga4_sessions_28d, ga4.sessions),
    ga4_engagement: maxNum(row.ga4_engagement, ga4.engagement),
    waflow_opens: maxNum(row.waflow_opens, funnel.waflow_opens),
    waflow_submits: maxNum(row.waflow_submits, funnel.waflow_submits),
    whatsapp_clicks: maxNum(row.whatsapp_clicks, funnel.whatsapp_clicks),
    qualified_leads: maxNum(row.qualified_leads, funnel.qualified_leads),
    quotes_sent: maxNum(row.quotes_sent, funnel.quotes_sent),
    bookings_confirmed: maxNum(
      row.bookings_confirmed,
      funnel.bookings_confirmed,
    ),
    meta_total: meta.total,
    meta_sent: meta.sent,
    meta_failed: meta.failed,
    source_windows: {
      gsc: gsc.window,
      ga4: ga4.window,
      funnel: funnel.window,
      meta: meta.window,
    },
  };
}

async function promoteCouncilRows(rows) {
  const updated = [];
  const skipped = [];
  for (const row of rows) {
    if (!row.council_ready) {
      skipped.push({ id: row.id, reason: row.missing_fields.join("; ") });
      continue;
    }

    const patch = {
      status: "queued",
      priority_score: row.priority_score,
      owner: row.owner,
      owner_issue: row.owner_issue,
      success_metric: row.success_metric,
      evaluation_date: row.evaluation_date,
      experiment_id: row.experiment_id,
      hypothesis: row.hypothesis,
      next_action: row.next_action,
      baseline_start: baselineStart(row),
      baseline_end: baselineEnd(row),
      gsc_clicks_28d: Math.round(row.metrics.gsc_clicks_28d),
      gsc_impressions_28d: Math.round(row.metrics.gsc_impressions_28d),
      gsc_ctr: clamp01(row.metrics.gsc_ctr),
      gsc_avg_position: Number(row.metrics.gsc_avg_position || 0),
      ga4_sessions_28d: Math.round(row.metrics.ga4_sessions_28d),
      ga4_engagement: clamp01(row.metrics.ga4_engagement),
      waflow_opens: Math.round(row.metrics.waflow_opens),
      waflow_submits: Math.round(row.metrics.waflow_submits),
      whatsapp_clicks: Math.round(row.metrics.whatsapp_clicks),
      qualified_leads: Math.round(row.metrics.qualified_leads),
      quotes_sent: Math.round(row.metrics.quotes_sent),
      bookings_confirmed: Math.round(row.metrics.bookings_confirmed),
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb
      .from("growth_inventory")
      .update(patch)
      .eq("id", row.id)
      .eq("website_id", websiteId);
    if (error) {
      skipped.push({ id: row.id, reason: error.message });
    } else {
      updated.push({ id: row.id, source_url: row.source_url });
    }
  }
  return { applied: true, updated, skipped };
}

function summarizeGscCache(rows) {
  const byUrl = new Map();
  for (const cache of rows) {
    const meta = parseGscCacheKey(cache.cache_key);
    const payloadRows = Array.isArray(cache.payload?.rows)
      ? cache.payload.rows
      : Array.isArray(cache.payload)
        ? cache.payload
        : [];
    for (const payloadRow of payloadRows) {
      const keys = Array.isArray(payloadRow.keys) ? payloadRow.keys : [];
      const pageIndex = meta.dimensions.indexOf("page");
      if (pageIndex < 0 || !keys[pageIndex]) continue;
      const url = normalizeUrl(keys[pageIndex]);
      const current = byUrl.get(url) ?? emptyGsc();
      current.clicks += numberOrZero(payloadRow.clicks);
      current.impressions += numberOrZero(payloadRow.impressions);
      current.position_weight +=
        numberOrZero(payloadRow.position) *
        numberOrZero(payloadRow.impressions);
      current.sources.add(`${meta.dimensions.join(",")}:${cache.cache_key}`);
      current.window = meta.window ?? current.window;
      byUrl.set(url, current);
    }
  }
  for (const item of byUrl.values()) {
    item.ctr = item.impressions > 0 ? item.clicks / item.impressions : 0;
    item.position =
      item.impressions > 0 ? item.position_weight / item.impressions : 0;
  }
  return { byUrl };
}

function summarizeGa4Cache(rows) {
  const byUrl = new Map();
  for (const cache of rows) {
    const payload = cache.payload ?? {};
    const dimensions =
      payload.dimensionHeaders ?? inferCacheKeyPart(cache.cache_key, 3);
    const metrics =
      payload.metricHeaders ?? inferCacheKeyPart(cache.cache_key, 2);
    const pageIndex = firstDimensionIndex(dimensions, [
      "landingPagePlusQueryString",
      "pagePath",
      "pageLocation",
    ]);
    if (pageIndex < 0) continue;
    for (const payloadRow of payload.rows ?? []) {
      const values = normalizeValues(payloadRow.dimensionValues);
      const metricValues = normalizeValues(payloadRow.metricValues).map(
        numberOrZero,
      );
      const url = normalizeUrl(toPublicUrl(values[pageIndex]));
      const metricMap = Object.fromEntries(
        metrics.map((metric, index) => [metric, metricValues[index] ?? 0]),
      );
      const current = byUrl.get(url) ?? emptyGa4();
      current.sessions += intMetric(metricMap.sessions);
      current.users += intMetric(metricMap.totalUsers ?? metricMap.activeUsers);
      current.events += intMetric(metricMap.eventCount);
      current.conversions += numberOrZero(metricMap.conversions);
      current.engagement_weight +=
        rateMetric(metricMap.engagementRate) *
        Math.max(1, intMetric(metricMap.sessions));
      current.engagement_sessions += Math.max(1, intMetric(metricMap.sessions));
      current.sources.add(cache.cache_key);
      current.window = parseWindow(cache.cache_key) ?? current.window;
      byUrl.set(url, current);
    }
  }
  for (const item of byUrl.values()) {
    item.engagement =
      item.engagement_sessions > 0
        ? item.engagement_weight / item.engagement_sessions
        : 0;
  }
  return { byUrl };
}

function summarizeFunnelEvents(rows) {
  const byUrl = new Map();
  for (const event of rows) {
    const url = normalizeUrl(event.source_url || toPublicUrl(event.page_path));
    const current = byUrl.get(url) ?? emptyFunnel();
    if (event.event_name === "waflow_open") current.waflow_opens += 1;
    if (event.event_name === "waflow_submit") current.waflow_submits += 1;
    if (event.event_name === "whatsapp_cta_click") current.whatsapp_clicks += 1;
    if (event.event_name === "qualified_lead") current.qualified_leads += 1;
    if (event.event_name === "quote_sent") current.quotes_sent += 1;
    if (event.event_name === "booking_confirmed")
      current.bookings_confirmed += 1;
    current.sources.add(event.event_name);
    current.window = extendWindow(current.window, event.occurred_at);
    byUrl.set(url, current);
  }
  return { byUrl };
}

function summarizeMetaEvents(rows) {
  const byUrl = new Map();
  const global = emptyMeta();
  for (const event of rows) {
    const url = normalizeUrl(event.event_source_url || origin);
    const current = byUrl.get(url) ?? emptyMeta();
    for (const target of [current, global]) {
      target.total += 1;
      if (event.status === "sent") target.sent += 1;
      if (event.status === "failed") target.failed += 1;
      if (event.status === "skipped") target.skipped += 1;
      if (event.status === "pending") target.pending += 1;
      target.sources.add(event.event_name ?? "meta_event");
      target.window = extendWindow(target.window, event.event_time);
    }
    byUrl.set(url, current);
  }
  return { byUrl, global };
}

function baselineFor(row, metrics) {
  const parts = [
    metrics.source_windows.gsc,
    metrics.source_windows.ga4,
    metrics.source_windows.funnel,
    metrics.source_windows.meta,
  ].filter(Boolean);
  return [
    parts.length > 0 ? `Window ${[...new Set(parts)].join("; ")}` : null,
    metrics.gsc_impressions_28d > 0
      ? `GSC ${Math.round(metrics.gsc_impressions_28d)} impressions / ${Math.round(metrics.gsc_clicks_28d)} clicks / ${(metrics.gsc_ctr * 100).toFixed(1)}% CTR / pos ${Number(metrics.gsc_avg_position).toFixed(1)}`
      : null,
    metrics.ga4_sessions_28d > 0
      ? `GA4 ${Math.round(metrics.ga4_sessions_28d)} sessions / ${(metrics.ga4_engagement * 100).toFixed(1)}% engagement`
      : null,
    metrics.waflow_opens +
      metrics.waflow_submits +
      metrics.whatsapp_clicks +
      metrics.qualified_leads >
    0
      ? `Funnel WA ${metrics.whatsapp_clicks}, open ${metrics.waflow_opens}, submit ${metrics.waflow_submits}, QL ${metrics.qualified_leads}`
      : null,
    metrics.meta_total > 0
      ? `Meta CAPI ${metrics.meta_sent}/${metrics.meta_total} sent`
      : null,
    row.id ? `source row ${row.id}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function scoreCandidate(row, metrics, profiles) {
  const base = Number(row.priority_score ?? 0);
  const demand = Math.min(metrics.gsc_impressions_28d / 12, 220);
  const traffic = Math.min(metrics.ga4_sessions_28d * 4, 220);
  const conversionGap =
    metrics.waflow_submits + metrics.qualified_leads === 0 &&
    metrics.ga4_sessions_28d >= 10
      ? 180
      : 0;
  const ctrGap =
    metrics.gsc_impressions_28d >= 40 && metrics.gsc_ctr < 0.03 ? 90 : 0;
  const profileFit = profiles.length * 45;
  const statusFit =
    row.status === "queued"
      ? 80
      : row.status === "idea"
        ? 35
        : row.status === "in_progress"
          ? 15
          : 0;
  return Math.round(
    base + demand + traffic + conversionGap + ctrGap + profileFit + statusFit,
  );
}

function requiredMissing(row, values) {
  const missing = [];
  if (isBlank(values.source_row)) missing.push("source row");
  if (isBlank(values.baseline)) missing.push("baseline");
  if (isBlank(values.owner)) missing.push("owner");
  if (isBlank(values.success_metric)) missing.push("success metric");
  if (isBlank(values.evaluation_date)) missing.push("evaluation date");
  return missing;
}

function ownerFor(row, profiles) {
  if (!isBlank(row.owner)) return row.owner;
  if (profiles.includes("growth_paid_governance_v1"))
    return "A3 Growth Analytics";
  if (profiles.includes("growth_market_fit_v1")) return "A4 SEO";
  return row.template_type === "blog" ? "A4 SEO" : "A5 Growth Ops";
}

function ownerIssueFor(row, profiles) {
  if (!isBlank(row.owner_issue))
    return String(row.owner_issue).startsWith("#")
      ? row.owner_issue
      : `#${row.owner_issue}`;
  if (profiles.includes("growth_paid_governance_v1")) return "#322";
  if (profiles.includes("growth_ai_geo_conversion_fit_v1")) return "#384";
  if (profiles.includes("growth_authority_content_fit_v1")) return "#334";
  if (profiles.includes("growth_market_fit_v1")) return "#314";
  return "#321";
}

function successMetricFor(profiles, row) {
  if (!isBlank(row.success_metric)) return row.success_metric;
  if (profiles.includes("growth_paid_governance_v1")) {
    return "Campaign sessions with attributed activation or qualified lead";
  }
  if (profiles.includes("growth_search_to_activation_v1")) {
    return "Activation events per organic landing session";
  }
  if (profiles.includes("growth_market_fit_v1")) {
    return "Market-qualified sessions and activation lift on next 28d readout";
  }
  if (profiles.includes("growth_post_fix_validation_v1")) {
    return "Finding stays resolved while GSC/GA4 traffic remains stable";
  }
  if (profiles.includes("growth_authority_content_fit_v1")) {
    return "Authority/content opportunity produces qualified organic visibility lift";
  }
  if (profiles.includes("growth_ai_geo_conversion_fit_v1")) {
    return "AI/GEO visibility row gains citation, mention, or assisted activation evidence";
  }
  return "Council-selected metric improves on next comparable 28d window";
}

function evaluationDateFor(row) {
  if (!isBlank(row.evaluation_date))
    return new Date(row.evaluation_date).toISOString();
  const date = new Date(`${runDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + evaluationDays);
  return date.toISOString();
}

function hypothesisFor(row, profiles, baseline) {
  if (!isBlank(row.hypothesis)) return row.hypothesis;
  return truncate(
    `If we execute ${profiles.join(", ")} on ${row.source_url}, then the selected Council metric should improve from baseline (${baseline}) because the row has cross-provider demand, traffic, or tracking evidence.`,
    900,
  );
}

function experimentId(row, profiles) {
  const prefix =
    profiles[0]?.replace(/^growth_/u, "gm_").replace(/_v\d+$/u, "") ??
    "gm_joint";
  return `${prefix}_${shortId(row.id ?? row.source_url)}`;
}

function nextActionFor(row, profiles, metrics) {
  if (
    !isBlank(row.next_action) &&
    String(row.next_action).includes("Council")
  ) {
    return row.next_action;
  }
  return truncate(
    `Council-ready joint normalizer candidate (${profiles.join(", ")}). Baseline: GSC ${Math.round(metrics.gsc_impressions_28d)} impressions, GA4 ${Math.round(metrics.ga4_sessions_28d)} sessions, funnel activation ${metrics.whatsapp_clicks + metrics.waflow_opens + metrics.waflow_submits}, QL ${metrics.qualified_leads}. Confirm scope, ship one measurable change, and read out on evaluation_date.`,
    1900,
  );
}

function sourceRefs({ gsc, ga4, funnel, meta }) {
  return {
    gsc: [...gsc.sources].slice(0, 8),
    ga4: [...ga4.sources].slice(0, 8),
    funnel: [...funnel.sources].slice(0, 8),
    meta: [...meta.sources].slice(0, 8),
  };
}

function toReportRow(row) {
  return {
    id: row.id,
    source_url: row.source_url,
    status: row.status,
    council_ready: row.council_ready,
    missing_fields: row.missing_fields,
    priority_score: row.priority_score,
    profiles: row.profiles,
    baseline: row.baseline,
    owner: row.owner,
    owner_issue: row.owner_issue,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    experiment_id: row.experiment_id,
    next_action: row.next_action,
    source_refs: row.source_refs,
  };
}

function summarizeBacklog(rows) {
  return {
    count: rows.length,
    by_missing_field: countFlat(rows.flatMap((row) => row.missing_fields)),
    by_profile: countFlat(rows.flatMap((row) => row.profiles)),
    by_status: countFlat(rows.map((row) => row.status ?? "unknown")),
  };
}

function renderMarkdown(report) {
  const councilRows =
    report.council_rows
      .map(
        (row) =>
          `| ${row.priority_score} | ${row.experiment_id} | ${row.owner} | ${row.owner_issue} | ${row.evaluation_date.slice(0, 10)} | ${row.profiles.join(", ")} | ${row.source_url} |`,
      )
      .join("\n") || "|  |  |  |  |  |  |  |";
  const backlogRows =
    report.backlog_top_rows
      .map(
        (row) =>
          `| ${row.priority_score} | ${row.status ?? ""} | ${row.missing_fields.join(", ")} | ${row.profiles.join(", ")} | ${row.source_url} |`,
      )
      .join("\n") || "|  |  |  |  |  |";
  const sourceRows = Object.entries(report.input_counts)
    .map(
      ([key, value]) =>
        `| ${key} | ${report.source_health[key] ?? "PASS"} | ${value} |`,
    )
    .join("\n");

  return `# Growth Joint Normalizers

Generated: ${report.generated_at}
Mode: ${report.mode}
Website: ${report.website_id}
Applied: ${report.apply_result.applied ? "yes" : "no"}

## Source Health

| Source | Status | Rows |
|---|---|---:|
${sourceRows}

## Counts

| Metric | Count |
|---|---:|
| Candidates | ${report.counts.candidates} |
| Council ready | ${report.counts.council_ready} |
| Council promoted | ${report.counts.council_promoted} |
| Backlog rows kept separate | ${report.counts.backlog_rows} |
| Apply updated | ${report.counts.apply_updated} |
| Apply skipped | ${report.counts.apply_skipped} |

## Council Promotion Rows

| Score | Experiment | Owner | Issue | Evaluation | Profiles | Source URL |
|---:|---|---|---|---|---|---|
${councilRows}

## Backlog Mass

Backlog rows are not promoted by this script unless they satisfy source row, baseline, owner, success metric and evaluation date and rank in the top ${report.rules.max_council_rows}.

| Score | Status | Missing | Profiles | Source URL |
|---:|---|---|---|---|
${backlogRows}
`;
}

function baselineHasSignal(metrics) {
  return (
    metrics.gsc_impressions_28d > 0 ||
    metrics.ga4_sessions_28d > 0 ||
    metrics.waflow_opens + metrics.waflow_submits + metrics.whatsapp_clicks >
      0 ||
    metrics.meta_total > 0
  );
}

function baselineStart(row) {
  if (row.metrics.source_windows.gsc)
    return `${row.metrics.source_windows.gsc.split("..")[0]}T00:00:00.000Z`;
  if (row.metrics.source_windows.ga4)
    return `${row.metrics.source_windows.ga4.split("..")[0]}T00:00:00.000Z`;
  return row.raw_baseline_start ?? `${runDate}T00:00:00.000Z`;
}

function baselineEnd(row) {
  if (row.metrics.source_windows.gsc)
    return `${row.metrics.source_windows.gsc.split("..").at(-1)}T23:59:59.999Z`;
  if (row.metrics.source_windows.ga4)
    return `${row.metrics.source_windows.ga4.split("..").at(-1)}T23:59:59.999Z`;
  return row.raw_baseline_end ?? `${runDate}T23:59:59.999Z`;
}

function compareCandidates(left, right) {
  const scoreDelta = right.priority_score - left.priority_score;
  if (scoreDelta !== 0) return scoreDelta;
  return String(left.source_url).localeCompare(String(right.source_url));
}

function parseGscCacheKey(cacheKey) {
  const parts = String(cacheKey ?? "").split("|");
  if (parts[0] === "profile") {
    const start = /^\d{4}-\d{2}-\d{2}$/u.test(parts[3]) ? parts[3] : null;
    const end = /^\d{4}-\d{2}-\d{2}$/u.test(parts[4]) ? parts[4] : null;
    return {
      dimensions: (parts[5] ?? "").split(",").filter(Boolean),
      window: start && end ? `${start}..${end}` : null,
    };
  }
  const start = /^\d{4}-\d{2}-\d{2}$/u.test(parts[0]) ? parts[0] : null;
  const end = /^\d{4}-\d{2}-\d{2}$/u.test(parts[1]) ? parts[1] : null;
  return {
    dimensions: (parts[2] ?? "").split(",").filter(Boolean),
    window: start && end ? `${start}..${end}` : null,
  };
}

function parseWindow(cacheKey) {
  const parts = String(cacheKey ?? "").split("|");
  return /^\d{4}-\d{2}-\d{2}$/u.test(parts[0]) &&
    /^\d{4}-\d{2}-\d{2}$/u.test(parts[1])
    ? `${parts[0]}..${parts[1]}`
    : null;
}

function inferCacheKeyPart(cacheKey, index) {
  return (
    String(cacheKey ?? "")
      .split("|")
      [index]?.split(",")
      .filter(Boolean) ?? []
  );
}

function firstDimensionIndex(dimensions, names) {
  for (const name of names) {
    const index = dimensions.indexOf(name);
    if (index >= 0) return index;
  }
  return -1;
}

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) =>
    value && typeof value === "object" && "value" in value
      ? value.value
      : value,
  );
}

function emptyGsc() {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
    position_weight: 0,
    window: null,
    sources: new Set(),
  };
}

function emptyGa4() {
  return {
    sessions: 0,
    users: 0,
    events: 0,
    conversions: 0,
    engagement: 0,
    engagement_weight: 0,
    engagement_sessions: 0,
    window: null,
    sources: new Set(),
  };
}

function emptyFunnel() {
  return {
    waflow_opens: 0,
    waflow_submits: 0,
    whatsapp_clicks: 0,
    qualified_leads: 0,
    quotes_sent: 0,
    bookings_confirmed: 0,
    window: null,
    sources: new Set(),
  };
}

function emptyMeta() {
  return {
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    window: null,
    sources: new Set(),
  };
}

function extendWindow(current, isoValue) {
  if (!isoValue) return current;
  const day = String(isoValue).slice(0, 10);
  if (!current) return `${day}..${day}`;
  const [start, end] = current.split("..");
  return `${day < start ? day : start}..${day > end ? day : end}`;
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || origin), origin);
    url.hash = "";
    return url.toString().replace(/\/$/u, url.pathname === "/" ? "/" : "");
  } catch {
    return origin;
  }
}

function toPublicUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "(not set)") return origin;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function inferLocale(url) {
  try {
    return new URL(url).pathname.startsWith("/en/") ? "en-US" : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function inferMarket(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes("mexico") || lower.includes("mexicanos")) return "MX";
  if (lower.includes("/en/")) return "US";
  return DEFAULT_MARKET;
}

function normalizeChannel(value) {
  const channel = String(value ?? "unknown").trim();
  return channel || "unknown";
}

function maxNum(...values) {
  return Math.max(...values.map(numberOrZero));
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function intMetric(value) {
  return Math.max(0, Math.round(numberOrZero(value)));
}

function rateMetric(value) {
  const n = numberOrZero(value);
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, numberOrZero(value)));
}

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/$/u, "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shortId(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]/gu, "")
    .slice(0, 10)
    .toLowerCase();
}

function truncate(value, maxLength) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 3)}...`
    : value;
}

function countFlat(values) {
  const out = {};
  for (const value of values) {
    const key = value || "none";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      parsed[toCamelCase(key)] = rest.join("=");
      continue;
    }
    const next = argv[index + 1];
    parsed[toCamelCase(raw)] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
}
