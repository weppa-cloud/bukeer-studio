#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  fetchRows,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 15);
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-seo-content-briefs`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const items = await fetchRows(sb, "growth_backlog_items", "*", {
    websiteId,
    limit: 500,
    orderBy: "priority_score",
  });
  if (items.error) throw new Error(items.error);

  const sourceRows = items.rows
    .filter((row) => row.status === "ready_for_brief")
    .filter((row) =>
      [
        "seo_demand",
        "content_opportunity",
        "serp_competitor_opportunity",
      ].includes(row.work_type),
    )
    .slice(0, limit);
  const briefs = sourceRows.map(toBrief);
  const applyResult = apply
    ? await applyBriefStatus(sb, briefs)
    : { mode: "dry-run", rows: briefs.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    counts: {
      source_rows: sourceRows.length,
      briefs: briefs.length,
      locale_gate_required: briefs.filter((row) => row.locale_gate_required)
        .length,
      target_locale_quality_or_translation: briefs.filter(
        (row) => row.brief_type === "locale_quality_or_translation",
      ).length,
      target_create_or_expand: briefs.filter(
        (row) => row.brief_type === "create_or_expand",
      ).length,
      target_refresh: briefs.filter((row) => row.brief_type === "refresh")
        .length,
      target_cro_support: briefs.filter(
        (row) => row.brief_type === "cro_support",
      ).length,
    },
    apply_result: applyResult,
    briefs,
  };

  await writeArtifacts(
    outDir,
    "seo-content-briefs",
    report,
    renderMarkdown(report),
  );
  await writeBriefFiles(outDir, briefs);
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir,
        counts: report.counts,
        apply_result: applyResult,
      },
      null,
      2,
    ),
  );
}

function toBrief(row) {
  const url = row.entity_key;
  const slug = slugFromUrl(url);
  const baseline = parseBaseline(row.baseline);
  const isEnUrl = /^https:\/\/en\.|\/en\//i.test(url);
  const inferredLocale = isEnUrl ? "en-US" : row.locale || "es-CO";
  const localeGateRequired = isEnUrl || inferredLocale !== row.locale;
  const briefType = inferBriefType({ row, baseline, isEnUrl });
  const intent = inferIntent(url);
  const primaryMetric =
    baseline.sessions > 0 && baseline.impressions === 0
      ? "Improve organic discoverability for a page with existing GA4 sessions"
      : baseline.impressions > 1000 && baseline.clicks <= 12
        ? "Improve CTR and qualified organic clicks"
        : "Improve qualified organic demand and engagement";
  const title = titleFromUrl(url);
  const targetAudience = audienceFor(row.market, inferredLocale, url);
  const sections = sectionPlan({ title, intent, briefType, isEnUrl });

  return {
    id: row.id,
    item_key: row.item_key,
    url,
    slug,
    title: row.title,
    brief_title: title,
    brief_type: briefType,
    work_type: row.work_type,
    market: row.market,
    source_locale: row.locale,
    target_locale: inferredLocale,
    locale_gate_required: localeGateRequired,
    channel: row.channel,
    priority_score: Number(row.priority_score ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    baseline: row.baseline,
    baseline_metrics: baseline,
    owner_issue: row.owner_issue,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    independence_key: row.independence_key,
    intent,
    target_audience: targetAudience,
    primary_metric: primaryMetric,
    hypothesis: row.hypothesis,
    brief_objective: objectiveFor({ title, briefType, baseline, isEnUrl }),
    required_checks: requiredChecks({ isEnUrl, briefType }),
    recommended_sections: sections,
    non_goals: [
      "Do not publish from this artifact alone.",
      "Do not change URL/canonical without SEO owner approval.",
      "Do not enter active experiments unless Council approves the row.",
    ],
  };
}

async function applyBriefStatus(sb, briefs) {
  const result = {
    mode: "apply",
    requested_updates: briefs.length,
    updated: 0,
    errors: [],
  };
  for (const brief of briefs) {
    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        status: "brief_in_progress",
        evidence: {
          content_brief: {
            generated_at: new Date().toISOString(),
            artifact: `${outDir}/briefs/${brief.slug}.md`,
            brief_type: brief.brief_type,
            target_locale: brief.target_locale,
            locale_gate_required: brief.locale_gate_required,
            required_checks: brief.required_checks,
            note: "Brief generated only; publishing requires quality, locale, SEO and tracking gates.",
          },
        },
      })
      .eq("id", brief.id);
    if (error) result.errors.push({ id: brief.id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

async function writeBriefFiles(rootDir, briefs) {
  const briefsDir = path.join(rootDir, "briefs");
  await fs.mkdir(briefsDir, { recursive: true });
  for (const brief of briefs) {
    await fs.writeFile(
      path.join(briefsDir, `${brief.slug}.md`),
      renderBrief(brief),
    );
  }
}

function renderMarkdown(report) {
  return `# SEO Content Brief Batch

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Briefs

${renderTable(report.briefs, [
  { label: "Score", value: (row) => row.priority_score },
  { label: "Type", value: (row) => row.brief_type },
  { label: "Locale gate", value: (row) => row.locale_gate_required },
  { label: "URL", value: (row) => row.url },
  { label: "Baseline", value: (row) => row.baseline },
  { label: "Metric", value: (row) => row.primary_metric },
])}
`;
}

function renderBrief(brief) {
  return `# ${brief.brief_title}

Source item: \`${brief.id}\`  
URL: ${brief.url}  
Market: ${brief.market ?? "unknown"}  
Target locale: ${brief.target_locale}  
Brief type: \`${brief.brief_type}\`  
Priority score: ${brief.priority_score}  
Baseline: ${brief.baseline ?? "missing"}  
Evaluation date: ${brief.evaluation_date ?? "TBD"}  

## Objective

${brief.brief_objective}

## Hypothesis

${brief.hypothesis ?? "If we improve content fit, search intent coverage and conversion continuity, qualified organic demand should improve against the baseline."}

## Audience And Intent

- Audience: ${brief.target_audience}
- Intent: ${brief.intent}
- Primary metric: ${brief.primary_metric}

## Recommended Structure

${brief.recommended_sections.map((section, index) => `${index + 1}. ${section}`).join("\n")}

## Required Checks

${brief.required_checks.map((check) => `- ${check}`).join("\n")}

## Non-Goals

${brief.non_goals.map((item) => `- ${item}`).join("\n")}
`;
}

function parseBaseline(text) {
  const baseline = String(text ?? "");
  return {
    clicks: numberBefore(baseline, /(\d+(?:\.\d+)?)\s+click/i),
    impressions: numberBefore(baseline, /(\d+(?:\.\d+)?)\s+impression/i),
    sessions: numberBefore(baseline, /(\d+(?:\.\d+)?)\s+session/i),
  };
}

function numberBefore(text, regex) {
  return Number(text.match(regex)?.[1] ?? 0);
}

function inferBriefType({ baseline, isEnUrl }) {
  if (isEnUrl) return "locale_quality_or_translation";
  if (baseline.sessions > 0 && baseline.impressions === 0) return "cro_support";
  if (baseline.impressions > 1000 && baseline.clicks <= 12) return "refresh";
  return "create_or_expand";
}

function inferIntent(url) {
  const text = slugFromUrl(url).replaceAll("-", " ");
  if (/cuanto|precio|cuesta|sale|requisitos|comprar/i.test(text))
    return "commercial research";
  if (/hoteles|paquetes|tours|actividades|lugares|destinos/i.test(text))
    return "trip planning";
  if (/mejores|guia|completa|descubriendo/i.test(text))
    return "informational comparison";
  return "destination inspiration";
}

function objectiveFor({ title, briefType, baseline, isEnUrl }) {
  if (isEnUrl || briefType === "locale_quality_or_translation")
    return `Audit and prepare a locale-safe brief for "${title}". Do not publish until EN quality, canonical and hreflang gates pass.`;
  if (briefType === "refresh")
    return `Refresh "${title}" to improve CTR from ${baseline.impressions} impressions and ${baseline.clicks} clicks, preserving canonical URL and conversion path.`;
  if (briefType === "cro_support")
    return `Improve the page content and CTA continuity for "${title}" because GA4 shows sessions without enough search demand baseline.`;
  return `Create or expand "${title}" as a decision-grade SEO content update with clear intent, internal links and conversion path.`;
}

function requiredChecks({ isEnUrl, briefType }) {
  const checks = [
    "SEO owner reviews title, meta description, H1 and canonical.",
    "Baseline row remains linked in Growth OS.",
    "Internal links and CTA/WAFlow path are verified.",
    "Council approval is required before treating this as an active experiment.",
  ];
  if (isEnUrl || briefType === "locale_quality_or_translation") {
    checks.unshift("EN quality gate passes before sitemap/hreflang exposure.");
    checks.unshift("Locale/canonical mapping is reviewed before publishing.");
  }
  return checks;
}

function sectionPlan({ title, intent, briefType, isEnUrl }) {
  const base = [
    `Open with direct answer for "${title}" and match ${intent} intent.`,
    "Add practical trip-planning details: when to go, how long, budget/effort, who it fits.",
    "Add ColombiaTours-specific value: guided options, itinerary fit and local support.",
    "Add FAQ block based on search intent and objections.",
    "Add internal links to relevant destinations, packages or WAFlow conversion path.",
  ];
  if (briefType === "refresh")
    base.splice(
      1,
      0,
      "Rewrite title/meta for CTR while preserving factual accuracy.",
    );
  if (isEnUrl)
    base.splice(
      1,
      0,
      "Rewrite for native English, not literal ES translation.",
    );
  return base;
}

function audienceFor(market, locale, url) {
  if (locale === "en-US" || /^https:\/\/en\./i.test(url))
    return "English-speaking traveler considering Colombia";
  if (market === "MX") return "Mexico-origin traveler planning Colombia";
  if (market === "CO") return "Spanish-speaking traveler planning Colombia";
  return "Qualified organic traveler";
}

function titleFromUrl(url) {
  return slugFromUrl(url)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const host = parsed.hostname.replaceAll(".", "-");
  return `${host}-${parts.at(-1) || "homepage"}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
