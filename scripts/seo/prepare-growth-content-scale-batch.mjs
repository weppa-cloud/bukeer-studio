#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_OUT_DIR = `artifacts/seo/${todayIso()}-growth-content-scale-batch`;

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const enLimit = positiveInt(args.enLimit, 5);
const mxLimit = positiveInt(args.mxLimit, 5);
const esLimit = positiveInt(args.esLimit, 10);

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

  const [enKeywords, mxKeywords, esInventory, serp] = await Promise.all([
    keywordFacts({ locale: "en-US", market: "US", limit: enLimit * 4 }),
    keywordFacts({ locale: "es-CO", market: "MX", limit: mxLimit * 4 }),
    esOptimizationRows(esLimit * 3),
    serpFacts(100),
  ]);

  const enBatch = selectMarketContentBatch(enKeywords, serp, enLimit, {
    lane: "create",
    locale: "en-US",
    market: "US",
    owner: "A4 SEO + EN reviewer",
    ownerIssue: "#315",
    languageCode: "en",
    locationCode: 2840,
    fallbackTopics: [
      "is colombia safe to travel",
      "best time to visit colombia",
      "colombia tour packages",
      "cartagena colombia travel",
      "coffee triangle colombia",
    ],
  });
  const mxBatch = selectMarketContentBatch(mxKeywords, serp, mxLimit, {
    lane: "create",
    locale: "es-MX",
    market: "MX",
    owner: "A4 SEO + MX reviewer",
    ownerIssue: "#314",
    languageCode: "es",
    locationCode: 2484,
    fallbackTopics: [
      "viajes a colombia desde mexico",
      "paquetes a colombia desde mexico",
      "cartagena colombia desde mexico",
      "requisitos para viajar a colombia desde mexico",
      "tour eje cafetero colombia",
    ],
  });
  const esBatch = selectOptimizationBatch(esInventory, esLimit);

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    status: "READY-WITH-GATES",
    policy: {
      side_effects:
        "No content was published. This artifact prepares briefs and optimization work items only.",
      publish_gate:
        "A row can publish only after brief, draft, SEO QA, language QA, canonical/hreflang, tracking source row, baseline, owner, success metric and evaluation date are complete.",
      council_gate:
        "This is backlog/cohort work. Only Council-approved rows become active experiments.",
    },
    counts: {
      en_us_candidates: enKeywords.length,
      mx_candidates: mxKeywords.length,
      es_optimization_candidates: esInventory.length,
      en_us_selected: enBatch.length,
      mx_selected: mxBatch.length,
      es_selected: esBatch.length,
      serp_facts: serp.length,
    },
    batches: {
      en_us_create: enBatch,
      mx_create: mxBatch,
      es_optimize: esBatch,
    },
    serp_context: serp.slice(0, 20).map(serpSummary),
  };

  await fs.writeFile(
    path.join(outDir, "growth-content-scale-batch.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "growth-content-scale-batch.md"),
    toMarkdown(report),
  );
  console.log(
    JSON.stringify(
      { outDir, status: report.status, counts: report.counts },
      null,
      2,
    ),
  );
}

async function keywordFacts({ locale, market, limit }) {
  const { data, error } = await sb
    .from("seo_keyword_opportunities")
    .select(
      "id,keyword,locale,market,cluster,intent,search_volume,cpc,competition,difficulty,current_rank,priority_score,source_cache_key,evidence,updated_at",
    )
    .eq("website_id", websiteId)
    .eq("locale", locale)
    .eq("market", market)
    .order("priority_score", { ascending: false })
    .limit(limit);
  if (error)
    throw new Error(`seo_keyword_opportunities read failed: ${error.message}`);
  return data ?? [];
}

async function esOptimizationRows(limit) {
  const { data, error } = await sb
    .from("growth_inventory")
    .select(
      "id,source_url,canonical_url,locale,market,cluster,intent,gsc_clicks_28d,gsc_impressions_28d,gsc_ctr,gsc_avg_position,ga4_sessions_28d,ga4_engagement,priority_score,owner_issue,next_action,success_metric,baseline_start,baseline_end,status",
    )
    .eq("website_id", websiteId)
    .eq("locale", "es-CO")
    .in("status", ["idea", "queued", "watch", "blocked"])
    .order("priority_score", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`growth_inventory read failed: ${error.message}`);
  return data ?? [];
}

async function serpFacts(limit) {
  const { data, error } = await sb
    .from("seo_serp_snapshots")
    .select(
      "id,keyword,location_code,language_code,own_rank,own_url,serp_features,competitor_domains,opportunity_type,priority_score,source_cache_key,observed_at",
    )
    .eq("website_id", websiteId)
    .order("priority_score", { ascending: false })
    .limit(limit);
  if (error)
    throw new Error(`seo_serp_snapshots read failed: ${error.message}`);
  return data ?? [];
}

function selectMarketContentBatch(keywordRows, serpRows, limit, meta) {
  const seen = new Set();
  const selected = [];
  const relevantRows = keywordRows
    .map((row) => ({ row, score: keywordRelevanceScore(row.keyword, meta) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.row.priority_score ?? 0) - Number(a.row.priority_score ?? 0),
    );

  for (const { row } of relevantRows) {
    if (selected.length >= limit) break;
    const topic = normalizeTopic(row.keyword);
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    selected.push(keywordWorkItem(row, meta));
    if (selected.length >= limit) break;
  }

  const serpCandidates = serpRows
    .filter(
      (row) =>
        row.language_code === meta.languageCode &&
        Number(row.location_code) === meta.locationCode,
    )
    .map((row) => ({ row, score: keywordRelevanceScore(row.keyword, meta) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.row.priority_score ?? 0) - Number(a.row.priority_score ?? 0),
    );

  for (const { row } of serpCandidates) {
    if (selected.length >= limit) break;
    const topic = normalizeTopic(row.keyword);
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    selected.push(serpWorkItem(row, meta));
    if (selected.length >= limit) break;
  }

  for (const keyword of meta.fallbackTopics ?? []) {
    if (selected.length >= limit) break;
    const topic = normalizeTopic(keyword);
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    selected.push(fallbackWorkItem(keyword, meta));
    if (selected.length >= limit) break;
  }

  return selected;
}

function selectOptimizationBatch(rows, limit) {
  const seen = new Set();
  const selected = [];
  const relevantRows = rows
    .filter((row) => isRelevantOptimizationRow(row))
    .sort(
      (a, b) => Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0),
    );
  for (const row of relevantRows) {
    const key = row.canonical_url ?? row.source_url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push({
      lane: "optimize",
      work_type: "existing_page_optimization",
      source_row: `growth_inventory:${row.id}`,
      source_url: row.source_url,
      canonical_url: row.canonical_url,
      locale: row.locale,
      market: row.market,
      cluster: row.cluster,
      intent: row.intent,
      baseline: baselineFromInventory(row),
      owner: "A4 SEO",
      owner_issue: row.owner_issue ?? "#321",
      success_metric:
        row.success_metric ??
        "Improve CTR/clicks or activation on the next comparable window",
      evaluation_date: daysFromNow(28),
      priority_score: Number(row.priority_score ?? 0),
      next_action:
        row.next_action ??
        "Review title/meta/H1/internal links and ship one measurable SEO improvement.",
      quality_gate: optimizationQualityGate(),
      status: "queued_for_brief",
    });
    if (selected.length >= limit) break;
  }
  return selected;
}

function keywordWorkItem(row, meta) {
  return {
    lane: meta.lane,
    work_type: "new_content_brief",
    source_row: `seo_keyword_opportunities:${row.id}`,
    keyword: row.keyword,
    locale: meta.locale,
    market: meta.market,
    cluster: row.cluster,
    intent: row.intent,
    baseline: [
      `volume ${row.search_volume ?? 0}`,
      `difficulty ${row.difficulty ?? 0}`,
      `cpc ${row.cpc ?? 0}`,
      `competition ${row.competition ?? 0}`,
      `priority ${row.priority_score ?? 0}`,
    ].join("; "),
    owner: meta.owner,
    owner_issue: meta.ownerIssue,
    success_metric:
      "Indexed page gains impressions/clicks on first 45d GSC read",
    evaluation_date: daysFromNow(45),
    priority_score: Number(row.priority_score ?? 0),
    next_action: `Create SEO brief for "${row.keyword}" and route through language/SEO quality gate before publish.`,
    quality_gate: contentQualityGate(meta.locale),
    status: "queued_for_brief",
  };
}

function serpWorkItem(row, meta) {
  return {
    lane: meta.lane,
    work_type: "new_content_brief",
    source_row: `seo_serp_snapshots:${row.id}`,
    keyword: row.keyword,
    locale: meta.locale,
    market: meta.market,
    cluster: "destination_demand",
    intent: row.opportunity_type ?? "travel_planning",
    baseline: [
      `SERP own_rank ${row.own_rank ?? "not visible"}`,
      `features ${Array.isArray(row.serp_features) ? row.serp_features.slice(0, 4).join(", ") : "unknown"}`,
      `competitors ${Array.isArray(row.competitor_domains) ? row.competitor_domains.slice(0, 4).join(", ") : "unknown"}`,
      `priority ${row.priority_score ?? 0}`,
    ].join("; "),
    owner: meta.owner,
    owner_issue: meta.ownerIssue,
    success_metric:
      "Indexed page gains impressions/clicks on first 45d GSC read",
    evaluation_date: daysFromNow(45),
    priority_score: Number(row.priority_score ?? 0),
    next_action: `Create SEO brief for "${row.keyword}" using SERP competitors/features as baseline before publish.`,
    quality_gate: contentQualityGate(meta.locale),
    status: "queued_for_brief",
  };
}

function fallbackWorkItem(keyword, meta) {
  return {
    lane: meta.lane,
    work_type: "new_content_brief",
    source_row: "manual_market_seed:epic310_content_scale",
    keyword,
    locale: meta.locale,
    market: meta.market,
    cluster: "destination_demand",
    intent: "travel_planning",
    baseline:
      "manual seed pending GSC/SERP baseline; publish blocked until provider baseline is attached",
    owner: meta.owner,
    owner_issue: meta.ownerIssue,
    success_metric:
      "Indexed page gains impressions/clicks on first 45d GSC read",
    evaluation_date: daysFromNow(45),
    priority_score: 0,
    next_action: `Attach SERP/GSC baseline, then create SEO brief for "${keyword}".`,
    quality_gate: contentQualityGate(meta.locale),
    status: "blocked_missing_baseline",
  };
}

function keywordRelevanceScore(keyword, meta) {
  const topic = normalizeTopic(keyword);
  if (!topic || isBlockedTopic(topic)) return 0;

  let score = 0;
  const hasColombia = /\bcolombia\b/.test(topic);
  const hasColombiaDestination =
    /\bcartagena\b|\bmedellin\b|\bmedellín\b|\bbogota\b|\bbogotá\b|\bsan andres\b|\bsan andrés\b|\beje cafetero\b|\bcoffee triangle\b|\bcafe colombiano\b|\bcafé colombiano\b/.test(
      topic,
    );
  if (!hasColombia && !hasColombiaDestination) return 0;

  if (hasColombia) score += 50;
  if (hasColombiaDestination) {
    score += 25;
  }
  if (
    /\btour\b|\btours\b|\bpaquete\b|\bpaquetes\b|\btravel\b|\bviaje\b|\bviajes\b|\bitinerary\b|\bitinerario\b|\bsafe\b|\bseguro\b|\brequisitos\b/.test(
      topic,
    )
  ) {
    score += 15;
  }
  if (
    meta.locale === "es-MX" &&
    /\bmexico\b|\bméxico\b|\bdesde mexico\b|\bdesde méxico\b/.test(topic)
  ) {
    score += 20;
  }
  if (
    meta.locale === "en-US" &&
    /\bfrom us\b|\bfrom usa\b|\bunited states\b|\bvacation\b|\btrip\b/.test(
      topic,
    )
  ) {
    score += 10;
  }
  return score;
}

function isBlockedTopic(topic) {
  return /\bchase\b|\bcapital one\b|\bnew zealand\b|\bcancun\b|\bbrasil\b|\bbrazil\b|\bpuente de noviembre\b|\bhotel todo incluido\b|\bhoteles todo incluido\b|\bcheap flights\b/.test(
    topic,
  );
}

function isRelevantOptimizationRow(row) {
  const url = String(row.canonical_url ?? row.source_url ?? "").toLowerCase();
  const haystack = normalizeTopic(
    `${url} ${row.cluster ?? ""} ${row.intent ?? ""} ${row.next_action ?? ""}`,
  );
  if (!url || url.includes("en.colombiatours.travel") || url.includes("/en/"))
    return false;
  if (haystack.includes("lada")) return false;
  if (isBlockedTopic(haystack)) return false;
  return (
    url.includes("colombiatours.travel") ||
    url.startsWith("/") ||
    /\bcolombia\b|\bcartagena\b|\bmedellin\b|\bbogota\b|\bsan andres\b|\beje cafetero\b/.test(
      haystack,
    )
  );
}

function serpSummary(row) {
  return {
    keyword: row.keyword,
    location_code: row.location_code,
    language_code: row.language_code,
    own_rank: row.own_rank,
    own_url: row.own_url,
    opportunity_type: row.opportunity_type,
    competitor_domains: Array.isArray(row.competitor_domains)
      ? row.competitor_domains.slice(0, 5)
      : [],
  };
}

function contentQualityGate(locale) {
  return [
    "source row and baseline present",
    "brief approved by SEO owner",
    "draft reviewed for factual accuracy",
    locale === "en-US"
      ? "EN-US reviewer approves idiom and localization"
      : "market reviewer approves localization",
    "title/meta/H1/canonical present",
    "hreflang only if locale counterpart is published",
    "tracking source URL and evaluation date set",
    "publish decision recorded as publish/noindex/defer",
  ];
}

function optimizationQualityGate() {
  return [
    "source row and baseline present",
    "one measurable change only unless grouped as non-experiment remediation",
    "title/meta/H1/canonical validated",
    "no sitemap/hreflang regression",
    "tracking and evaluation date set",
  ];
}

function baselineFromInventory(row) {
  const parts = [
    row.baseline_start && row.baseline_end
      ? `${row.baseline_start}..${row.baseline_end}`
      : null,
    Number(row.gsc_impressions_28d ?? 0) > 0
      ? `GSC ${row.gsc_impressions_28d} impressions / ${row.gsc_clicks_28d ?? 0} clicks / CTR ${row.gsc_ctr ?? 0} / pos ${row.gsc_avg_position ?? 0}`
      : null,
    Number(row.ga4_sessions_28d ?? 0) > 0
      ? `GA4 ${row.ga4_sessions_28d} sessions / engagement ${row.ga4_engagement ?? 0}`
      : null,
  ].filter(Boolean);
  return parts.join("; ") || `priority ${row.priority_score ?? 0}`;
}

function normalizeTopic(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toMarkdown(report) {
  return `# Growth Content Scale Batch

Generated: ${report.generated_at}
Status: ${report.status}

## Policy

- ${report.policy.side_effects}
- ${report.policy.publish_gate}
- ${report.policy.council_gate}

## Counts

| Area | Count |
| --- | ---: |
| EN-US candidates | ${report.counts.en_us_candidates} |
| MX candidates | ${report.counts.mx_candidates} |
| ES optimization candidates | ${report.counts.es_optimization_candidates} |
| EN-US selected | ${report.counts.en_us_selected} |
| MX selected | ${report.counts.mx_selected} |
| ES selected | ${report.counts.es_selected} |
| SERP facts | ${report.counts.serp_facts} |

${batchTable("EN-US New Content", report.batches.en_us_create)}

${batchTable("MX New Content", report.batches.mx_create)}

${batchTable("ES Optimizations", report.batches.es_optimize)}

## SERP Context

| Keyword | Lang | Location | Own rank | Opportunity | Competitors |
| --- | --- | --- | ---: | --- | --- |
${report.serp_context
  .map(
    (row) =>
      `| ${cell(row.keyword)} | ${cell(row.language_code)} | ${cell(row.location_code)} | ${row.own_rank ?? ""} | ${cell(row.opportunity_type)} | ${cell(row.competitor_domains.join(", "))} |`,
  )
  .join("\n")}
`;
}

function batchTable(title, rows) {
  return `## ${title}

| Work | Source | Market | Baseline | Owner | Metric | Eval | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows
  .map(
    (row) =>
      `| ${cell(row.keyword ?? row.source_url)} | ${cell(row.source_row)} | ${cell(`${row.locale}/${row.market}`)} | ${cell(row.baseline)} | ${cell(row.owner)} | ${cell(row.success_metric)} | ${cell(row.evaluation_date)} | ${cell(row.next_action)} |`,
  )
  .join("\n")}`;
}

function cell(value) {
  return String(value ?? "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ");
}

function daysFromNow(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) i += 1;
  }
  return parsed;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
