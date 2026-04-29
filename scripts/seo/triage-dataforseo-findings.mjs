#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const CURRENT_RUN = "04291924-1574-0216-0000-e2085593ce67";
const PREVIOUS_RUN = "04290125-1574-0216-0000-00a1195b1ba0";
const OUT_DIR = "artifacts/seo/2026-04-29-dataforseo-v2-triage";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const currentRun = args.current ?? CURRENT_RUN;
const previousRun = args.previous ?? PREVIOUS_RUN;
const limit = Number(args.limit ?? 200);
const outDir = args.outDir ?? OUT_DIR;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const [current, previous, inventory] = await Promise.all([
    fetchFindings(currentRun),
    fetchFindings(previousRun),
    fetchInventory(),
  ]);

  const previousFingerprints = new Set(
    previous.map((finding) => finding.finding_fingerprint),
  );
  const inventoryByUrl = new Map(
    inventory.map((row) => [normalizeUrl(row.source_url), row]),
  );
  const classified = current.map((finding) =>
    classifyFinding(finding, previousFingerprints, inventoryByUrl),
  );
  const grouped = groupByRootPattern(classified, inventoryByUrl);
  const topUrlRows = buildInventoryUpdates(grouped).slice(0, limit);
  const experiments = buildExperimentCandidates(grouped).slice(0, 5);
  const rejected = buildRejectedExperiments(grouped, experiments).slice(0, 10);

  if (apply) {
    await updateInventory(topUrlRows);
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: WEBSITE_ID,
    current_run: currentRun,
    previous_run: previousRun,
    counts: {
      current_findings: current.length,
      previous_findings: previous.length,
      classified_findings: classified.length,
      root_patterns: grouped.length,
      inventory_updates: topUrlRows.length,
      experiments: experiments.length,
      rejected_experiments: rejected.length,
    },
    classification_counts: {
      validity: countBy(classified, (item) => item.validity),
      operational_severity: countBy(
        classified,
        (item) => item.operational_severity,
      ),
      root_pattern: countBy(classified, (item) => item.root_pattern),
      gate: countBy(classified, (item) => item.gate),
    },
    root_patterns: grouped.map(toPatternReport),
    top_inventory_rows: topUrlRows.map(toInventoryReport),
    council_experiments: experiments,
    rejected_experiments: rejected,
  };

  await fs.writeFile(
    path.join(outDir, "dataforseo-v2-triage.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "dataforseo-v2-triage.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        counts: report.counts,
        classification_counts: report.classification_counts,
        top_artifact: path.join(outDir, "dataforseo-v2-triage.md"),
        applied: apply,
      },
      null,
      2,
    ),
  );
}

async function fetchFindings(runId) {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from("seo_audit_findings")
      .select(
        "public_url,finding_type,severity,status,priority_score,evidence,crawl_task_id,finding_fingerprint",
      )
      .eq("website_id", WEBSITE_ID)
      .eq("source", "dataforseo:on_page")
      .eq("crawl_task_id", runId)
      .range(from, from + pageSize - 1);
    if (error)
      throw new Error(`seo_audit_findings read failed: ${error.message}`);
    out.push(...(data ?? []).map(normalizeFinding));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function fetchInventory() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from("growth_inventory")
      .select("*")
      .eq("website_id", WEBSITE_ID)
      .range(from, from + pageSize - 1);
    if (error)
      throw new Error(`growth_inventory read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

function normalizeFinding(row) {
  const evidence = row.evidence ?? {};
  const url = normalizeUrl(row.public_url);
  return {
    ...row,
    public_url: url,
    finding_fingerprint:
      row.finding_fingerprint ??
      evidence.finding_fingerprint ??
      `${url}|${row.finding_type}`,
    status_code: Number(evidence.status_code ?? 0),
    title: evidence.title ?? "",
    canonical: evidence.canonical ?? "",
    checks: evidence.checks ?? {},
  };
}

function classifyFinding(finding, previousFingerprints, inventoryByUrl) {
  const inventory = inventoryByUrl.get(finding.public_url) ?? {};
  const root = rootPattern(finding);
  const persisted = previousFingerprints.has(finding.finding_fingerprint);
  const validity = validityFor(finding, persisted);
  const operationalSeverity = operationalSeverityFor(finding, inventory);
  const businessImpact = businessImpactFor(finding.public_url, inventory);
  const effort = effortFor(root);
  const gate = gateFor(operationalSeverity, businessImpact, root);

  return {
    ...finding,
    validity,
    operational_severity: operationalSeverity,
    root_pattern: root,
    effort,
    gate,
    business_impact_score: businessImpact,
    was_present_in_v1: persisted,
    decision_score: decisionScore(
      operationalSeverity,
      businessImpact,
      effort,
      persisted,
    ),
    recommended_action: recommendedAction(root, operationalSeverity, gate),
  };
}

function rootPattern(finding) {
  const type = finding.finding_type;
  if (["visual_404_200", "http_4xx", "http_5xx", "broken_fetch"].includes(type))
    return "status_or_soft_404";
  if (
    [
      "missing_canonical",
      "canonical_to_redirect",
      "canonical_to_broken",
    ].includes(type)
  )
    return "canonical";
  if (
    [
      "missing_h1",
      "missing_title",
      "missing_description",
      "title_too_long",
    ].includes(type)
  )
    return "metadata_template_or_content";
  if (["image_alt_missing", "resource_error"].includes(type))
    return "media_assets";
  if (["orphan_page", "redirect_chain", "redirect_watch"].includes(type))
    return "internal_linking";
  if (["slow_page"].includes(type)) return "performance";
  if (["schema_error", "schema_missing_or_invalid"].includes(type))
    return "structured_data";
  return "technical_watch";
}

function validityFor(finding, persisted) {
  if (persisted) return "real_persistent";
  if (
    ["image_alt_missing", "slow_page", "broken_fetch", "http_4xx"].includes(
      finding.finding_type,
    )
  )
    return "v2_profile_discovery";
  if (finding.finding_type === "visual_404_200")
    return "needs_manual_validation";
  if (finding.finding_type === "title_too_long") return "real_likely_batch";
  return "new_needs_validation";
}

function operationalSeverityFor(finding, inventory) {
  const type = finding.finding_type;
  const commercial = isCommercialUrl(finding.public_url);
  const hasTraffic =
    Number(inventory.gsc_impressions_28d ?? 0) >= 40 ||
    Number(inventory.ga4_sessions_28d ?? 0) >= 10;

  if (
    [
      "visual_404_200",
      "http_4xx",
      "http_5xx",
      "broken_fetch",
      "canonical_to_broken",
    ].includes(type)
  )
    return "P0";
  if (type === "missing_canonical" && (commercial || hasTraffic)) return "P1";
  if (type === "missing_h1" && (commercial || hasTraffic)) return "P1";
  if (
    ["missing_title", "missing_description", "canonical_to_redirect"].includes(
      type,
    )
  )
    return "P1";
  if (
    [
      "slow_page",
      "image_alt_missing",
      "orphan_page",
      "title_too_long",
    ].includes(type)
  )
    return commercial || hasTraffic ? "P1" : "WATCH";
  return finding.severity === "critical" ? "P1" : "WATCH";
}

function businessImpactFor(url, inventory) {
  let score = 0;
  score += Math.min(Number(inventory.gsc_impressions_28d ?? 0), 1000) * 0.2;
  score += Math.min(Number(inventory.gsc_clicks_28d ?? 0), 200) * 2;
  score += Math.min(Number(inventory.ga4_sessions_28d ?? 0), 500) * 0.8;
  score += isCommercialUrl(url) ? 250 : 0;
  score += isLocalizedScaleUrl(url) ? 100 : 0;
  score +=
    Number(inventory.whatsapp_clicks ?? 0) > 0 ||
    Number(inventory.waflow_submits ?? 0) > 0
      ? 150
      : 0;
  return Math.round(score);
}

function effortFor(root) {
  if (["canonical", "metadata_template_or_content"].includes(root))
    return "template_or_batch";
  if (root === "status_or_soft_404") return "data_or_redirect_batch";
  if (root === "media_assets") return "content_batch";
  if (root === "internal_linking") return "content_or_sitemap_batch";
  if (root === "performance") return "validation_then_template";
  return "manual_validation";
}

function gateFor(severity, impact, root) {
  if (severity === "P0") return "blocks_scale";
  if (severity === "P1" && impact >= 250) return "blocks_targeted_scale";
  if (["canonical", "status_or_soft_404"].includes(root) && severity === "P1")
    return "blocks_content_scale";
  return "watch";
}

function decisionScore(severity, impact, effort, persisted) {
  const severityScore =
    { P0: 1000, P1: 650, WATCH: 250, P2: 100 }[severity] ?? 100;
  const effortBonus =
    effort.includes("batch") || effort.includes("template") ? 150 : 0;
  return Math.round(
    severityScore + impact + effortBonus + (persisted ? 125 : 0),
  );
}

function recommendedAction(root, severity, gate) {
  if (root === "status_or_soft_404")
    return "Repair/remove invalid URLs from sitemap/internal links or return correct 404/redirect.";
  if (root === "canonical")
    return "Fix canonical generation and hreflang alignment for affected template/URL cohort.";
  if (root === "metadata_template_or_content")
    return "Patch template defaults or batch update page metadata/H1/title rules.";
  if (root === "media_assets")
    return "Repair media source or alt metadata in batch, prioritizing commercial URLs.";
  if (root === "internal_linking")
    return "Add internal links or remove orphan/redirect references from sitemap/navigation.";
  if (root === "performance")
    return "Validate resource waterfall and isolate template/resource regression before content scale.";
  if (gate !== "watch" || severity === "P1")
    return "Validate manually, then assign to #313 remediation batch.";
  return "Keep as WATCH until next comparable crawl.";
}

function groupByRootPattern(findings, inventoryByUrl) {
  const groups = new Map();
  for (const finding of findings) {
    const key = `${finding.root_pattern}|${finding.operational_severity}`;
    const current = groups.get(key) ?? {
      root_pattern: finding.root_pattern,
      operational_severity: finding.operational_severity,
      findings: [],
      urls: new Map(),
      decision_score: 0,
      gates: new Set(),
      validity: new Map(),
    };
    current.findings.push(finding);
    current.decision_score += finding.decision_score;
    current.gates.add(finding.gate);
    current.validity.set(
      finding.validity,
      (current.validity.get(finding.validity) ?? 0) + 1,
    );
    const url = current.urls.get(finding.public_url) ?? {
      url: finding.public_url,
      findings: [],
      inventory: inventoryByUrl.get(finding.public_url) ?? {},
      score: 0,
    };
    url.findings.push(finding);
    url.score += finding.decision_score;
    current.urls.set(finding.public_url, url);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      url_count: group.urls.size,
      finding_count: group.findings.length,
      gates: [...group.gates],
      validity_counts: Object.fromEntries(group.validity.entries()),
      top_urls: [...group.urls.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 25),
    }))
    .sort((a, b) => b.decision_score - a.decision_score);
}

function buildInventoryUpdates(groups) {
  const rows = groups
    .flatMap((group) =>
      group.top_urls.map((urlItem) => {
        const row = urlItem.inventory ?? {};
        const severity = group.operational_severity;
        const status =
          severity === "P0" ? "queued" : severity === "P1" ? "queued" : "idea";
        const technicalStatus =
          severity === "P0"
            ? "blocked"
            : severity === "P1"
              ? "pass_with_watch"
              : "pass_with_watch";
        return {
          source_url: urlItem.url,
          update: {
            account_id: row.account_id ?? ACCOUNT_ID,
            website_id: WEBSITE_ID,
            locale: row.locale ?? inferLocale(urlItem.url),
            market: row.market ?? inferMarket(urlItem.url),
            source_url: urlItem.url,
            canonical_url: row.canonical_url ?? urlItem.url,
            template_type: row.template_type ?? inferTemplateType(urlItem.url),
            cluster: row.cluster ?? group.root_pattern,
            intent: row.intent ?? inferIntent(urlItem.url),
            funnel_stage: row.funnel_stage ?? "acquisition",
            channel: row.channel ?? "seo",
            gsc_clicks_28d: row.gsc_clicks_28d ?? 0,
            gsc_impressions_28d: row.gsc_impressions_28d ?? 0,
            gsc_ctr: row.gsc_ctr ?? 0,
            gsc_avg_position: row.gsc_avg_position ?? 0,
            ga4_sessions_28d: row.ga4_sessions_28d ?? 0,
            ga4_engagement: row.ga4_engagement ?? 0,
            waflow_opens: row.waflow_opens ?? 0,
            waflow_submits: row.waflow_submits ?? 0,
            whatsapp_clicks: row.whatsapp_clicks ?? 0,
            qualified_leads: row.qualified_leads ?? 0,
            quotes_sent: row.quotes_sent ?? 0,
            bookings_confirmed: row.bookings_confirmed ?? 0,
            booking_value: row.booking_value ?? 0,
            gross_margin: row.gross_margin ?? 0,
            hypothesis: row.hypothesis ?? null,
            experiment_id: row.experiment_id ?? null,
            ICE_score: row.ICE_score ?? null,
            RICE_score: row.RICE_score ?? null,
            success_metric:
              row.success_metric ?? successMetricFor(group.root_pattern),
            baseline_start: row.baseline_start ?? null,
            baseline_end: row.baseline_end ?? null,
            owner: ownerFor(group.root_pattern),
            owner_issue: "#313",
            change_shipped_at: row.change_shipped_at ?? null,
            evaluation_date: row.evaluation_date ?? null,
            result: row.result ?? "pending",
            learning: row.learning ?? null,
            next_action: truncate(
              `${severity} ${group.root_pattern}: ${recommendedAction(group.root_pattern, severity, group.gates[0])} Findings on URL: ${urlItem.findings
                .map((f) => f.finding_type)
                .slice(0, 8)
                .join(", ")}. Run ${currentRun}.`,
              1800,
            ),
            technical_status: technicalStatus,
            content_status: row.content_status ?? "unknown",
            conversion_status: row.conversion_status ?? "unknown",
            attribution_status: row.attribution_status ?? "unknown",
            status,
            priority_score: Math.max(
              Number(row.priority_score ?? 0),
              Math.round(urlItem.score),
            ),
            updated_at: new Date().toISOString(),
          },
          score: urlItem.score,
          root_pattern: group.root_pattern,
          operational_severity: severity,
          finding_count: urlItem.findings.length,
        };
      }),
    )
    .sort((a, b) => b.score - a.score);

  const byUrl = new Map();
  for (const row of rows) {
    if (!byUrl.has(row.source_url)) byUrl.set(row.source_url, row);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score);
}

async function updateInventory(rows) {
  for (const chunk of chunks(
    rows.map((row) => row.update),
    100,
  )) {
    const { error } = await sb
      .from("growth_inventory")
      .upsert(chunk, { onConflict: "website_id,source_url" });
    if (error)
      throw new Error(`growth_inventory upsert failed: ${error.message}`);
  }
}

function buildExperimentCandidates(groups) {
  return groups
    .filter(
      (group) =>
        group.operational_severity === "P0" ||
        group.operational_severity === "P1",
    )
    .map((group, index) => {
      const sample = group.top_urls[0];
      return {
        id: `W19-E${index + 1}`,
        decision_status: "READY",
        source_run: currentRun,
        source_issue: "#313",
        root_pattern: group.root_pattern,
        affected_urls: group.url_count,
        findings: group.finding_count,
        baseline: `${group.finding_count} ${group.operational_severity} findings across ${group.url_count} URLs`,
        hypothesis: hypothesisFor(group),
        owner: ownerFor(group.root_pattern),
        owner_issue: "#313",
        success_metric: successMetricFor(group.root_pattern),
        evaluation_date: "2026-05-12",
        sample_url: sample?.url ?? null,
        ice_score: iceScoreFor(group),
      };
    })
    .sort((a, b) => b.ice_score - a.ice_score);
}

function buildRejectedExperiments(groups, approved) {
  const approvedPatterns = new Set(
    approved.map((item) => `${item.root_pattern}|${item.root_pattern}`),
  );
  return groups
    .filter(
      (group) =>
        group.operational_severity === "WATCH" ||
        !approvedPatterns.has(`${group.root_pattern}|${group.root_pattern}`),
    )
    .map((group) => ({
      root_pattern: group.root_pattern,
      findings: group.finding_count,
      reason:
        group.operational_severity === "WATCH"
          ? "WATCH only: no launch until P0/P1 backlog is cleared or source baseline shows business impact."
          : "Not selected: Council limit is 5 active experiments; keep in queued remediation backlog.",
    }));
}

function hypothesisFor(group) {
  if (group.root_pattern === "status_or_soft_404")
    return "If invalid URLs are repaired, redirected, or removed from sitemap/internal links, then P0 status/soft-404 findings drop materially on the next comparable crawl.";
  if (group.root_pattern === "canonical")
    return "If canonical generation is fixed for the affected cohort, then duplicate/ambiguous acquisition signals decrease and crawl findings clear on the next comparable run.";
  if (group.root_pattern === "metadata_template_or_content")
    return "If template/content metadata is batch-corrected, then crawl quality improves and GSC CTR/position experiments can be evaluated without technical noise.";
  if (group.root_pattern === "media_assets")
    return "If media asset metadata/resources are repaired on commercial pages, then accessibility/watch findings decrease and conversion pages become safer to scale.";
  if (group.root_pattern === "performance")
    return "If slow-resource causes are isolated and fixed, then slow-page findings decrease on the next comparable crawl.";
  return "If this technical pattern is remediated in batch, then the next comparable crawl will show fewer open findings.";
}

function successMetricFor(root) {
  if (root === "status_or_soft_404")
    return "P0 status/soft-404 findings reduced by >=80% on next dfs_onpage_full_v2 crawl";
  if (root === "canonical")
    return "Canonical findings reduced by >=70% on next dfs_onpage_full_v2 crawl";
  if (root === "metadata_template_or_content")
    return "Metadata/H1 findings reduced by >=50% on next dfs_onpage_full_v2 crawl";
  if (root === "media_assets")
    return "Media asset findings reduced by >=50% on priority URLs";
  if (root === "performance")
    return "Slow-page critical findings reduced by >=50% on priority URLs";
  return "Open findings for this root pattern reduced on next comparable crawl";
}

function iceScoreFor(group) {
  const impact = group.operational_severity === "P0" ? 9 : 7;
  const confidence = group.finding_count >= 25 ? 8 : 6;
  const ease =
    group.root_pattern.includes("metadata") ||
    group.root_pattern === "canonical"
      ? 7
      : 5;
  return impact * confidence * ease;
}

function ownerFor(root) {
  if (
    [
      "canonical",
      "metadata_template_or_content",
      "status_or_soft_404",
    ].includes(root)
  )
    return "A1 Backend + A4 SEO";
  if (root === "media_assets") return "A4 SEO + Content Ops";
  if (root === "performance") return "A1 Backend";
  return "A4 SEO";
}

function toPatternReport(group) {
  return {
    root_pattern: group.root_pattern,
    operational_severity: group.operational_severity,
    findings: group.finding_count,
    urls: group.url_count,
    gates: group.gates,
    validity_counts: group.validity_counts,
    decision_score: Math.round(group.decision_score),
    top_urls: group.top_urls.slice(0, 10).map((item) => ({
      url: item.url,
      score: Math.round(item.score),
      findings: item.findings.length,
      types: [...new Set(item.findings.map((finding) => finding.finding_type))],
      gsc_impressions_28d: item.inventory.gsc_impressions_28d ?? 0,
      ga4_sessions_28d: item.inventory.ga4_sessions_28d ?? 0,
    })),
  };
}

function toInventoryReport(row) {
  return {
    source_url: row.source_url,
    score: Math.round(row.score),
    root_pattern: row.root_pattern,
    severity: row.operational_severity,
    findings: row.finding_count,
    status: row.update.status,
    technical_status: row.update.technical_status,
    owner_issue: row.update.owner_issue,
    next_action: row.update.next_action,
  };
}

function toMarkdown(report) {
  const classRows = Object.entries(
    report.classification_counts.operational_severity,
  )
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  const patternRows = report.root_patterns
    .map(
      (row) =>
        `| ${row.decision_score} | ${row.operational_severity} | ${row.root_pattern} | ${row.findings} | ${row.urls} | ${row.gates.join(", ")} | ${row.top_urls[0]?.url ?? ""} |`,
    )
    .join("\n");
  const experimentRows = report.council_experiments
    .map(
      (row) =>
        `| ${row.id} | ${row.ice_score} | ${row.root_pattern} | ${row.baseline} | ${row.owner} | ${row.evaluation_date} |`,
    )
    .join("\n");
  const inventoryRows = report.top_inventory_rows
    .slice(0, 50)
    .map(
      (row) =>
        `| ${Math.round(row.score)} | ${row.severity} | ${row.root_pattern} | ${row.findings} | ${row.status} | ${row.source_url} |`,
    )
    .join("\n");

  return `# DataForSEO V2 Massive Triage

Generated: ${report.generated_at}
Mode: ${report.mode}
Current run: ${report.current_run}
Previous run: ${report.previous_run}

## Counts

| Metric | Value |
|---|---:|
| Current findings | ${report.counts.current_findings} |
| Previous findings | ${report.counts.previous_findings} |
| Classified findings | ${report.counts.classified_findings} |
| Root patterns | ${report.counts.root_patterns} |
| Inventory updates | ${report.counts.inventory_updates} |
| Council experiments | ${report.counts.experiments} |

## Operational Severity

| Severity | Findings |
|---|---:|
${classRows}

## Root Pattern Backlog

| Score | Severity | Root pattern | Findings | URLs | Gate | Top URL |
|---:|---|---|---:|---:|---|---|
${patternRows}

## Top Inventory Rows

| Score | Severity | Root pattern | Findings | Status | URL |
|---:|---|---|---:|---|---|
${inventoryRows}

## Five Council Experiments

| ID | ICE | Root pattern | Baseline | Owner | Evaluation |
|---|---:|---|---|---|---|
${experimentRows}
`;
}

function isCommercialUrl(url) {
  const value = String(url).toLowerCase();
  return (
    value.includes("/paquetes") ||
    value.includes("/actividades") ||
    value.includes("/hoteles") ||
    value.includes("mexico") ||
    value.includes("contact") ||
    value.includes("cotiza")
  );
}

function isLocalizedScaleUrl(url) {
  const value = String(url).toLowerCase();
  return (
    value.includes("/en/") ||
    value.includes("mexico") ||
    value.includes("mexicanos")
  );
}

function inferLocale(url) {
  return String(url).includes("/en/") ? "en-US" : "es-CO";
}

function inferMarket(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes("mexico") || lower.includes("mexicanos")) return "MX";
  if (lower.includes("/en/")) return "US";
  return "CO";
}

function inferTemplateType(url) {
  const pathName = safePath(url);
  if (pathName === "/") return "home";
  if (pathName.includes("/blog/")) return "blog";
  if (pathName.includes("/paquetes") || pathName.includes("/l/"))
    return "package";
  if (pathName.includes("/actividades")) return "activity";
  if (pathName.includes("/hoteles")) return "hotel";
  if (pathName.includes("/destin")) return "destination";
  return "other";
}

function inferIntent(url) {
  if (isCommercialUrl(url)) return "commercial";
  if (String(url).includes("/blog/")) return "informational";
  return "mixed";
}

function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}

function normalizeUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(String(url));
    parsed.hash = "";
    if (parsed.pathname !== "/")
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return String(url);
  }
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) ?? "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function chunks(rows, size) {
  const out = [];
  for (let index = 0; index < rows.length; index += size)
    out.push(rows.slice(index, index + size));
  return out;
}

function truncate(value, length) {
  const text = String(value ?? "");
  return text.length <= length ? text : `${text.slice(0, length - 3)}...`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}
