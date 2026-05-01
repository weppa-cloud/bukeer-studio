#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  chunks,
  fetchRows,
  fingerprint,
  getSupabase,
  parseArgs,
  renderTable,
  upsertRows,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const DEFAULT_CONFIG = "configs/growth-backlog/scoring-v2-council-gated.json";
const DEFAULT_OUT_DIR = `artifacts/seo/${today()}-growth-backlog-ranking`;
const PAGE_SIZE = 1000;

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const configPath = args.config ?? DEFAULT_CONFIG;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const candidateLimit = Number(args.limit ?? 15000);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const [candidates, experiments] = await Promise.all([
    fetchAllCandidates(),
    fetchRows(sb, "growth_experiments", "*", { websiteId, limit: 1000 }),
  ]);

  const activeExperimentKeys = new Set(
    experiments.rows
      .filter((row) => ["approved", "active"].includes(row.status))
      .map((row) => row.independence_key)
      .filter(Boolean),
  );
  const groups = groupCandidates(candidates);
  const ranked = groups
    .map((group) => scoreGroup(group, config, activeExperimentKeys))
    .sort((a, b) => b.final_score - a.final_score);
  const selected = selectBacklogItems(ranked, config);
  const itemRows = selected.map((row) => toBacklogItem(row, config));

  const applyResult = apply
    ? await upsertRows(
        sb,
        "growth_backlog_items",
        itemRows,
        "website_id,item_key",
      )
    : { mode: "dry-run", rows: itemRows.length };
  if (apply) {
    applyResult.candidate_promotion_trace =
      await markPromotedCandidates(selected);
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    config: {
      path: configPath,
      version: config.version,
      thresholds: config.thresholds,
      caps: config.caps,
    },
    counts: {
      candidates_read: candidates.length,
      grouped_entities: groups.length,
      ranked_entities: ranked.length,
      selected_backlog_items: selected.length,
      ready_for_council: selected.filter(
        (row) => row.recommended_status === "ready_for_council",
      ).length,
      queued: selected.filter((row) => row.recommended_status === "queued")
        .length,
      watch: ranked.filter((row) => row.recommended_status === "watch").length,
      blocked: ranked.filter((row) => row.recommended_status === "blocked")
        .length,
      active_experiments: activeExperimentKeys.size,
    },
    distributions: {
      selected_by_work_type: countBy(selected, (row) => row.work_type),
      selected_by_status: countBy(selected, (row) => row.recommended_status),
      top_reject_reasons: topReasons(
        ranked.filter((row) => !selected.includes(row)),
      ),
    },
    apply_result: applyResult,
    top_100: selected.slice(0, 100),
    ready_for_council: selected
      .filter((row) => row.recommended_status === "ready_for_council")
      .slice(0, 20),
    top_5_proposals: selected
      .filter((row) => row.recommended_status === "ready_for_council")
      .slice(0, 5),
    watch_samples: ranked
      .filter((row) => row.recommended_status === "watch")
      .slice(0, 25),
    blocked_samples: ranked
      .filter((row) => row.recommended_status === "blocked")
      .slice(0, 25),
  };

  await writeArtifacts(
    outDir,
    "growth-backlog-ranking",
    report,
    renderMarkdown(report),
  );
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

async function fetchAllCandidates() {
  const rows = [];
  for (let from = 0; from < candidateLimit; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, candidateLimit - 1);
    const { data, error } = await sb
      .from("growth_backlog_candidates")
      .select("*")
      .eq("website_id", websiteId)
      .range(from, to);
    if (error)
      throw new Error(
        `growth_backlog_candidates read failed: ${error.message}`,
      );
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function groupCandidates(candidates) {
  const map = new Map();
  for (const candidate of candidates) {
    const key = independenceKey(candidate);
    const current = map.get(key) ?? {
      independence_key: key,
      entity_type: candidate.entity_type,
      entity_key: candidate.entity_key,
      candidates: [],
      source_profiles: new Set(),
      source_tables: new Set(),
      work_types: new Map(),
      source_fact_refs: [],
    };
    current.candidates.push(candidate);
    for (const profile of candidate.source_profiles ?? [])
      current.source_profiles.add(profile);
    for (const ref of candidate.source_fact_refs ?? []) {
      if (ref?.table) current.source_tables.add(ref.table);
      current.source_fact_refs.push(ref);
    }
    current.work_types.set(
      candidate.work_type,
      (current.work_types.get(candidate.work_type) ?? 0) + 1,
    );
    map.set(key, current);
  }
  return [...map.values()].map((group) => ({
    ...group,
    source_profiles: [...group.source_profiles],
    source_tables: [...group.source_tables],
    work_type: modeMap(group.work_types),
    primary_candidate: group.candidates.toSorted(
      (a, b) => Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0),
    )[0],
  }));
}

function scoreGroup(group, config, activeExperimentKeys) {
  const candidates = group.candidates;
  const primary = group.primary_candidate;
  const component_scores = {
    business_impact: businessImpactScore(group),
    source_diversity: sourceDiversityScore(group),
    freshness: freshnessScore(group),
    baseline_strength: baselineStrengthScore(group),
    confidence: confidenceScore(group),
  };
  const penalties = {
    effort_penalty: effortPenalty(group, config),
    dependency_penalty: dependencyPenalty(group, config, activeExperimentKeys),
  };
  const weightedPositive =
    component_scores.business_impact * config.weights.business_impact +
    component_scores.source_diversity * config.weights.source_diversity +
    component_scores.freshness * config.weights.freshness +
    component_scores.baseline_strength * config.weights.baseline_strength +
    component_scores.confidence * config.weights.confidence;
  const weightedPenalty =
    penalties.effort_penalty * config.weights.effort_penalty +
    penalties.dependency_penalty * config.weights.dependency_penalty;
  const finalScore = clamp(
    Math.round(weightedPositive - weightedPenalty),
    0,
    100,
  );
  const reasons = reasonCodes(
    group,
    component_scores,
    penalties,
    activeExperimentKeys,
  );
  const recommendedStatus = recommendedStatusFor(finalScore, reasons, config);

  return {
    candidate_ids: candidates.map((row) => row.id),
    item_key: fingerprint(
      "ranked-item",
      group.independence_key,
      group.work_type,
    ),
    entity_type: group.entity_type,
    entity_key: group.entity_key,
    work_type: normalizeWorkType(group.work_type),
    title: rankedTitle(group),
    market: primary.market ?? inferMarket(group),
    locale: primary.locale ?? inferLocale(group),
    channel: primary.channel ?? inferChannel(group),
    source_profiles: group.source_profiles,
    source_tables: group.source_tables,
    source_fact_refs: dedupeRefs(group.source_fact_refs).slice(0, 50),
    baseline: strongestBaseline(group),
    hypothesis: hypothesisFor(group),
    priority_score: finalScore,
    confidence_score: clamp(component_scores.confidence / 100, 0, 1),
    final_score: finalScore,
    component_scores,
    penalties,
    independence_key: group.independence_key,
    owner_role: ownerDefaults(group.work_type, config).owner_role,
    owner_issue: ownerDefaults(group.work_type, config).owner_issue,
    next_action: specificNextAction(group),
    success_metric: ownerDefaults(group.work_type, config).success_metric,
    evaluation_date: evaluationDate(14),
    recommended_status: recommendedStatus,
    reason_codes: reasons,
    evidence: {
      scoring_config: config.version,
      candidate_count: candidates.length,
      source_tables: group.source_tables,
      source_profiles: group.source_profiles,
      component_scores,
      penalties,
      reason_codes: reasons,
      top_candidates: candidates.slice(0, 10).map((row) => ({
        id: row.id,
        work_type: row.work_type,
        status: row.status,
        priority_score: row.priority_score,
        confidence_score: row.confidence_score,
        baseline: row.baseline,
      })),
    },
  };
}

function selectBacklogItems(ranked, config) {
  const selected = [];
  const perType = new Map();
  const seenKeys = new Set();
  const maxItems = Number(config.caps.max_backlog_items ?? 100);
  const maxReady = Number(config.caps.max_ready_for_council ?? 20);
  const maxPerType = Number(config.caps.max_per_work_type ?? 20);

  for (const row of ranked) {
    if (!["ready_for_council", "queued"].includes(row.recommended_status))
      continue;
    if (seenKeys.has(row.independence_key)) continue;
    const typeCount = perType.get(row.work_type) ?? 0;
    if (typeCount >= maxPerType) continue;
    let selectedRow = row;
    if (row.recommended_status === "ready_for_council") {
      const readyCount = selected.filter(
        (item) => item.recommended_status === "ready_for_council",
      ).length;
      if (readyCount >= maxReady)
        selectedRow = { ...row, recommended_status: "queued" };
    }
    selected.push(selectedRow);
    seenKeys.add(row.independence_key);
    perType.set(row.work_type, typeCount + 1);
    if (selected.length >= maxItems) break;
  }
  return selected;
}

function toBacklogItem(row) {
  return {
    website_id: websiteId,
    account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
    candidate_id: row.candidate_ids[0] ?? null,
    item_key: row.item_key,
    entity_type: allowedEntityType(row.entity_type),
    entity_key: row.entity_key,
    work_type: row.work_type,
    title: row.title,
    market: row.market,
    locale: row.locale,
    channel: row.channel,
    source_profiles: row.source_profiles,
    source_fact_refs: row.source_fact_refs,
    baseline: row.baseline,
    hypothesis: row.hypothesis,
    priority_score: row.priority_score,
    confidence_score: row.confidence_score,
    independence_key: row.independence_key,
    owner_role: row.owner_role,
    owner_issue: row.owner_issue,
    next_action: row.next_action,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    status: row.recommended_status,
    blocked_reason: null,
    evidence: {
      ...row.evidence,
      source_candidate_ids: row.candidate_ids,
      promotion_trace: {
        generated_at: new Date().toISOString(),
        mode: "rank-growth-backlog-candidates",
        scoring_config: row.evidence?.scoring_config,
        selected_status: row.recommended_status,
        source_candidate_count: row.candidate_ids.length,
      },
    },
  };
}

async function markPromotedCandidates(selected) {
  const itemKeys = selected.map((row) => row.item_key);
  const itemsByKey = new Map();
  for (const keys of chunks(itemKeys, 100)) {
    const { data, error } = await sb
      .from("growth_backlog_items")
      .select("id,item_key,status")
      .eq("website_id", websiteId)
      .in("item_key", keys);
    if (error)
      throw new Error(
        `growth_backlog_items trace read failed: ${error.message}`,
      );
    for (const row of data ?? []) itemsByKey.set(row.item_key, row);
  }

  const candidateIds = [
    ...new Set(selected.flatMap((row) => row.candidate_ids).filter(Boolean)),
  ];
  const candidatesById = new Map();
  for (const ids of chunks(candidateIds, 100)) {
    const { data, error } = await sb
      .from("growth_backlog_candidates")
      .select("id,evidence,status")
      .eq("website_id", websiteId)
      .in("id", ids);
    if (error)
      throw new Error(
        `growth_backlog_candidates trace read failed: ${error.message}`,
      );
    for (const row of data ?? []) candidatesById.set(row.id, row);
  }

  const rowsByCandidateId = new Map();
  for (const row of selected) {
    const item = itemsByKey.get(row.item_key);
    for (const candidateId of row.candidate_ids) {
      rowsByCandidateId.set(candidateId, { row, item });
    }
  }

  const result = {
    requested_updates: rowsByCandidateId.size,
    updated: 0,
    errors: [],
  };
  for (const [candidateId, { row, item }] of rowsByCandidateId) {
    const candidate = candidatesById.get(candidateId);
    const nextEvidence = {
      ...(candidate?.evidence ?? {}),
      promotion_trace: {
        generated_at: new Date().toISOString(),
        mode: "rank-growth-backlog-candidates",
        backlog_item_id: item?.id ?? null,
        backlog_item_key: row.item_key,
        backlog_item_status: item?.status ?? row.recommended_status,
        selected_status: row.recommended_status,
        scoring_config: row.evidence?.scoring_config,
        final_score: row.final_score,
        reason_codes: row.reason_codes,
      },
    };
    const { error } = await sb
      .from("growth_backlog_candidates")
      .update({
        status: "promoted",
        evidence: nextEvidence,
      })
      .eq("id", candidateId);
    if (error) {
      result.errors.push({ candidate_id: candidateId, message: error.message });
    } else {
      result.updated += 1;
    }
  }
  return result;
}

function businessImpactScore(group) {
  const maxPriority = Math.max(
    ...group.candidates.map((row) => Number(row.priority_score ?? 0)),
    0,
  );
  const metricMax = Math.max(
    ...group.candidates.map((row) => positiveMetricFromBaseline(row.baseline)),
    0,
  );
  const score = Math.max(logScore(maxPriority), logScore(metricMax));
  return clamp(score, 0, 100);
}

function sourceDiversityScore(group) {
  const tables = group.source_tables.length;
  const profiles = group.source_profiles.length;
  const count = Math.max(tables, profiles);
  if (count >= 4) return 100;
  if (count === 3) return 85;
  if (count === 2) return 70;
  if (count === 1) return 40;
  return 0;
}

function freshnessScore(group) {
  const values = group.candidates.map((row) => row.freshness_status);
  if (values.includes("BLOCKED")) return 0;
  if (values.includes("WATCH")) return 55;
  return 100;
}

function baselineStrengthScore(group) {
  const baselines = group.candidates.map((row) => row.baseline).filter(Boolean);
  if (!baselines.length) return 0;
  const hasPositive = baselines.some(
    (baseline) => positiveMetricFromBaseline(baseline) > 0,
  );
  const hasConversion = baselines.some((baseline) =>
    /(lead|booking|submit|conversion|qualified|WAFlow)/i.test(baseline),
  );
  if (hasConversion && hasPositive) return 100;
  if (hasPositive && group.source_tables.length >= 2) return 85;
  if (hasPositive) return 70;
  return 25;
}

function confidenceScore(group) {
  const max = Math.max(
    ...group.candidates.map((row) => Number(row.confidence_score ?? 0)),
    0,
  );
  const diversityBoost = Math.min(
    0.15,
    Math.max(0, group.source_tables.length - 1) * 0.05,
  );
  return clamp(Math.round((max + diversityBoost) * 100), 0, 100);
}

function effortPenalty(group, config) {
  let penalty = 0;
  if (
    group.source_profiles.length === 1 &&
    group.source_profiles[0] === "legacy_growth_inventory"
  ) {
    penalty += config.penalties.legacy_only;
  }
  if (group.candidates.some((row) => isGenericAction(row.next_action))) {
    penalty += config.penalties.generic_next_action;
  }
  if (
    group.work_type === "technical_remediation" &&
    positiveMetricFromGroup(group) === 0
  ) {
    penalty += config.penalties.technical_no_traffic;
  }
  return clamp(penalty, 0, 100);
}

function dependencyPenalty(group, config, activeExperimentKeys) {
  let penalty = 0;
  const text = JSON.stringify(group.candidates).toLowerCase();
  if (/translation|quality|en quality|locale|hreflang/.test(text))
    penalty += config.penalties.en_quality_or_translation;
  if (/tracking|utm|click_id|waflow|paid|meta|google_ads/.test(text))
    penalty += config.penalties.tracking_or_paid_gate;
  if (activeExperimentKeys.has(group.independence_key)) penalty += 100;
  if (group.candidates.some((row) => row.freshness_status === "WATCH"))
    penalty += config.penalties.watch_freshness;
  if (group.candidates.some((row) => row.quality_status === "BLOCKED"))
    penalty += config.penalties.blocked_quality;
  if (group.candidates.some((row) => row.correlation_status === "WATCH"))
    penalty += config.penalties.watch_correlation;
  return clamp(penalty, 0, 100);
}

function reasonCodes(group, scores, penalties, activeExperimentKeys) {
  const reasons = [];
  if (scores.business_impact >= 80) reasons.push("high_business_impact");
  if (scores.source_diversity >= 70) reasons.push("multi_source_evidence");
  if (scores.baseline_strength >= 70) reasons.push("baseline_present");
  if (scores.confidence >= 75) reasons.push("high_confidence");
  if (scores.baseline_strength < 40) reasons.push("weak_or_zero_baseline");
  if (scores.source_diversity < 70) reasons.push("single_source");
  if (penalties.dependency_penalty >= 40) reasons.push("dependency_risk");
  if (penalties.effort_penalty >= 30) reasons.push("effort_or_noise_risk");
  if (activeExperimentKeys.has(group.independence_key))
    reasons.push("active_experiment_collision");
  return reasons;
}

function recommendedStatusFor(score, reasons, config) {
  if (reasons.includes("active_experiment_collision")) return "blocked";
  if (
    reasons.includes("weak_or_zero_baseline") &&
    score < config.thresholds.queued
  )
    return "watch";
  if (
    score >= config.thresholds.ready_for_council &&
    reasons.includes("multi_source_evidence") &&
    reasons.includes("baseline_present") &&
    reasons.includes("high_confidence")
  )
    return "ready_for_council";
  if (score >= config.thresholds.queued) return "queued";
  if (score >= config.thresholds.watch) return "watch";
  return "blocked";
}

function rankedTitle(group) {
  const label =
    group.entity_key.length > 96
      ? `${group.entity_key.slice(0, 93)}...`
      : group.entity_key;
  return `${humanWorkType(group.work_type)}: ${label}`;
}

function strongestBaseline(group) {
  return group.candidates
    .map((row) => row.baseline)
    .filter(Boolean)
    .toSorted(
      (a, b) => positiveMetricFromBaseline(b) - positiveMetricFromBaseline(a),
    )[0];
}

function hypothesisFor(group) {
  if (group.work_type === "seo_demand") {
    return `If we improve the search snippet/content path for ${group.entity_key}, organic CTR or clicks should improve from the current baseline.`;
  }
  if (group.work_type === "cro_activation") {
    return `If we improve activation and CTA flow for ${group.entity_key}, qualified lead rate should improve from the current baseline.`;
  }
  if (group.work_type === "technical_remediation") {
    return `If we resolve technical blockers for ${group.entity_key}, crawl/indexability risk should decrease without hurting demand.`;
  }
  if (group.work_type === "content_opportunity") {
    return `If we create or improve content for ${group.entity_key}, qualified organic demand should increase.`;
  }
  return `If we address ${humanWorkType(group.work_type).toLowerCase()} for ${group.entity_key}, the selected Growth OS metric should improve.`;
}

function specificNextAction(group) {
  const top = group.primary_candidate;
  if (top.next_action && !isGenericAction(top.next_action))
    return top.next_action;
  if (group.work_type === "seo_demand")
    return `Audit title/meta, SERP intent and internal links for ${group.entity_key}; propose one snippet/content change with 28d GSC baseline.`;
  if (group.work_type === "cro_activation")
    return `Audit CTA, WAFlow submit path and page intent for ${group.entity_key}; propose one activation fix with GA4/funnel baseline.`;
  if (group.work_type === "technical_remediation")
    return `Verify the technical finding for ${group.entity_key}; fix, redirect, remove, 404/410, or keep WATCH with evidence.`;
  if (group.work_type === "content_opportunity")
    return `Create or update a content brief for ${group.entity_key}; require keyword/SERP baseline and target page.`;
  if (group.work_type === "serp_competitor_opportunity")
    return `Compare SERP competitors/features for ${group.entity_key}; define snippet/schema/content response.`;
  return `Review evidence for ${group.entity_key}; promote only with owner, metric, baseline and evaluation date.`;
}

function ownerDefaults(workType, config) {
  return (
    config.work_type_defaults[workType] ??
    config.work_type_defaults.growth_opportunity
  );
}

function independenceKey(row) {
  const entityKey = String(row.entity_key ?? "unknown").replace(/\/$/, "");
  if (row.entity_type === "url" || entityKey.startsWith("http"))
    return `url:${entityKey}`;
  if (row.entity_type === "keyword" || row.entity_type === "query")
    return `cluster:${row.market ?? "GLOBAL"}:${entityKey.toLowerCase()}`;
  if (row.entity_type === "campaign" || row.entity_type === "ad")
    return `${row.entity_type}:${entityKey}`;
  return `${row.entity_type}:${entityKey}`;
}

function normalizeWorkType(workType) {
  const map = {
    seo_demand: "seo_demand",
    cro_activation: "cro_activation",
    content_opportunity: "content_opportunity",
    serp_competitor_opportunity: "serp_competitor_opportunity",
    tracking_attribution: "tracking_attribution",
    technical_remediation: "technical_remediation",
    legacy_growth_inventory: "legacy_growth_inventory",
  };
  return map[workType] ?? "growth_opportunity";
}

function allowedEntityType(entityType) {
  return [
    "url",
    "query",
    "keyword",
    "campaign",
    "ad",
    "landing",
    "cluster",
    "reference_code",
    "profile",
    "artifact",
  ].includes(entityType)
    ? entityType
    : "artifact";
}

function modeMap(map) {
  return (
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "growth_opportunity"
  );
}

function dedupeRefs(refs) {
  return [...new Map(refs.map((ref) => [JSON.stringify(ref), ref])).values()];
}

function countBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function topReasons(rows) {
  return Object.entries(
    rows
      .flatMap((row) => row.reason_codes)
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

function positiveMetricFromGroup(group) {
  return Math.max(
    ...group.candidates.map((row) => positiveMetricFromBaseline(row.baseline)),
    0,
  );
}

function positiveMetricFromBaseline(baseline) {
  if (!baseline) return 0;
  const nums = String(baseline)
    .match(/-?\d+(\.\d+)?/g)
    ?.map(Number)
    .filter((num) => num > 0);
  return nums?.length ? Math.max(...nums) : 0;
}

function logScore(value) {
  if (!value || value <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(value + 1) * 32));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isGenericAction(action) {
  return /review candidate|promote only|review evidence/i.test(action ?? "");
}

function humanWorkType(workType) {
  return String(workType ?? "growth_opportunity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferMarket(group) {
  const text = group.entity_key.toLowerCase();
  if (text.includes(".mx") || text.includes("mexico")) return "MX";
  if (text.includes("/en/") || text.includes("en.")) return "US";
  return "CO";
}

function inferLocale(group) {
  const text = group.entity_key.toLowerCase();
  if (text.includes("/en/") || text.includes("en.")) return "en-US";
  return "es-CO";
}

function inferChannel(group) {
  if (
    group.work_type.startsWith("seo") ||
    group.work_type.includes("content") ||
    group.work_type.includes("serp")
  )
    return "seo";
  if (group.work_type.includes("cro") || group.work_type.includes("tracking"))
    return "waflow";
  return "unknown";
}

function evaluationDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderMarkdown(report) {
  return `# Growth Backlog Ranking

Mode: \`${report.mode}\`  
Config: \`${report.config.version}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([name, count]) => ({ name, count })),
  [
    { label: "Metric", value: (row) => row.name },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Selected By Work Type

${renderTable(
  Object.entries(report.distributions.selected_by_work_type).map(
    ([name, count]) => ({ name, count }),
  ),
  [
    { label: "Work type", value: (row) => row.name },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Top 20

${renderTable(report.top_100.slice(0, 20), [
  { label: "Score", value: (row) => row.final_score },
  { label: "Status", value: (row) => row.recommended_status },
  { label: "Type", value: (row) => row.work_type },
  { label: "Title", value: (row) => row.title },
  { label: "Reasons", value: (row) => row.reason_codes.join(", ") },
])}

## Council Proposals

${renderTable(report.top_5_proposals, [
  { label: "Score", value: (row) => row.final_score },
  { label: "Owner", value: (row) => row.owner_issue },
  { label: "Metric", value: (row) => row.success_metric },
  { label: "Independence", value: (row) => row.independence_key },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
