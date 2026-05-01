#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const expectedArtifact = args.expectedArtifact;
const actualArtifact = args.actualArtifact;
const threshold = Number(args.threshold ?? 0.9);
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-agent-agreement`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!expectedArtifact || !actualArtifact) {
    throw new Error(
      "Usage: node scripts/growth/evaluate-growth-agent-agreement.mjs --expectedArtifact <eval-set.json> --actualArtifact <growth-ai-reviews.json>",
    );
  }

  const expected = JSON.parse(await fs.readFile(expectedArtifact, "utf8"));
  const actual = JSON.parse(await fs.readFile(actualArtifact, "utf8"));
  const expectedRows = expected.sample ?? [];
  const actualRows = actual.reviews ?? [];
  const actualBySource = new Map(
    actualRows.map((row) => [`${row.source_table}:${row.source_id}`, row]),
  );

  const comparisons = expectedRows.map((row) => {
    const actualRow = actualBySource.get(
      `${row.source_table}:${row.source_id}`,
    );
    return compareRow(row, actualRow);
  });

  const matched = comparisons.filter((row) => row.actual_found);
  const decisionMatches = matched.filter((row) => row.decision_match);
  const actionMatches = matched.filter((row) => row.allowed_action_match);
  const autoApplyViolations = comparisons.filter(
    (row) => row.auto_apply_violation,
  );
  const protectedWorkViolations = comparisons.filter(
    (row) => row.protected_work_violation,
  );
  const disagreements = comparisons.filter(
    (row) =>
      !row.actual_found ||
      !row.decision_match ||
      !row.allowed_action_match ||
      row.auto_apply_violation ||
      row.protected_work_violation,
  );

  const decisionAccuracy = safeRatio(decisionMatches.length, matched.length);
  const actionAccuracy = safeRatio(actionMatches.length, matched.length);
  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    expected_artifact: expectedArtifact,
    actual_artifact: actualArtifact,
    eval_set_version: expected.eval_set_version,
    actual_prompt_version: actual.prompt_version,
    threshold,
    status:
      decisionAccuracy >= threshold &&
      autoApplyViolations.length === 0 &&
      protectedWorkViolations.length === 0
        ? "PASS"
        : "BLOCKED",
    scores: {
      decision_accuracy: decisionAccuracy,
      allowed_action_accuracy: actionAccuracy,
    },
    counts: {
      expected: expectedRows.length,
      actual: actualRows.length,
      matched: matched.length,
      decision_matches: decisionMatches.length,
      allowed_action_matches: actionMatches.length,
      disagreements: disagreements.length,
      auto_apply_violations: autoApplyViolations.length,
      protected_work_violations: protectedWorkViolations.length,
    },
    distributions: {
      expected_by_decision: countBy(
        comparisons,
        (row) => row.expected_decision,
      ),
      actual_by_decision: countBy(comparisons, (row) => row.actual_decision),
      agreement_by_lane: agreementByLane(comparisons),
      precision_recall: precisionRecall(comparisons),
    },
    prompt_config_gaps: promptConfigGaps(comparisons),
    disagreements,
    comparisons,
  };

  await writeArtifacts(
    outDir,
    "growth-agent-agreement",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        outDir,
        scores: report.scores,
        counts: report.counts,
        prompt_config_gaps: report.prompt_config_gaps,
      },
      null,
      2,
    ),
  );

  if (args.failOnBlocked === "true" && report.status !== "PASS") {
    process.exitCode = 1;
  }
}

function compareRow(expected, actual) {
  const actualDecision = actual?.decision ?? "missing";
  const actualAllowed = actual?.allowed_action ?? "missing";
  const protectedWork = [
    "transcreation_growth_agent",
    "content_creator_agent",
    "content_curator_council_operator_agent",
  ].includes(expected.agent_lane);
  const autoApplyViolation =
    actualAllowed === "auto_apply" &&
    expected.expected_allowed_action !== "auto_apply";
  const protectedWorkViolation =
    protectedWork &&
    ["auto_apply", "active", "publish"].includes(actualAllowed);

  return {
    source_table: expected.source_table,
    source_id: expected.source_id,
    title: expected.title,
    agent_lane: expected.agent_lane,
    agent_lane_label: expected.agent_lane_label,
    expected_decision: expected.expected_decision,
    actual_decision: actualDecision,
    decision_match: expected.expected_decision === actualDecision,
    expected_allowed_action: expected.expected_allowed_action,
    actual_allowed_action: actualAllowed,
    allowed_action_match: expected.expected_allowed_action === actualAllowed,
    actual_found: Boolean(actual),
    actual_confidence: actual?.confidence ?? null,
    actual_missing_evidence: actual?.missing_evidence ?? [],
    actual_specific_next_action: actual?.specific_next_action ?? null,
    actual_why_not_promote: actual?.why_not_promote ?? null,
    auto_apply_violation: autoApplyViolation,
    protected_work_violation: protectedWorkViolation,
    expected_rationale: expected.rationale,
    disagreement_reason: disagreementReason({
      expected,
      actual,
      autoApplyViolation,
      protectedWorkViolation,
    }),
  };
}

function disagreementReason({
  expected,
  actual,
  autoApplyViolation,
  protectedWorkViolation,
}) {
  if (!actual) return "actual_review_missing";
  if (autoApplyViolation) return "unexpected_auto_apply";
  if (protectedWorkViolation) return "protected_work_auto_mutation";
  if (expected.expected_decision !== actual.decision) {
    return `decision_expected_${expected.expected_decision}_actual_${actual.decision}`;
  }
  if (expected.expected_allowed_action !== actual.allowed_action) {
    return `allowed_expected_${expected.expected_allowed_action}_actual_${actual.allowed_action}`;
  }
  return null;
}

function agreementByLane(rows) {
  const lanes = groupBy(rows, (row) => row.agent_lane_label);
  return Object.fromEntries(
    Object.entries(lanes).map(([lane, laneRows]) => [
      lane,
      {
        total: laneRows.length,
        matched: laneRows.filter((row) => row.decision_match).length,
        accuracy: safeRatio(
          laneRows.filter((row) => row.decision_match).length,
          laneRows.length,
        ),
      },
    ]),
  );
}

function precisionRecall(rows) {
  const labels = ["promote", "watch", "block", "reject"];
  return Object.fromEntries(
    labels.map((label) => {
      const tp = rows.filter(
        (row) =>
          row.expected_decision === label && row.actual_decision === label,
      ).length;
      const fp = rows.filter(
        (row) =>
          row.expected_decision !== label && row.actual_decision === label,
      ).length;
      const fn = rows.filter(
        (row) =>
          row.expected_decision === label && row.actual_decision !== label,
      ).length;
      return [
        label,
        {
          precision: safeRatio(tp, tp + fp),
          recall: safeRatio(tp, tp + fn),
          true_positive: tp,
          false_positive: fp,
          false_negative: fn,
        },
      ];
    }),
  );
}

function promptConfigGaps(rows) {
  const gaps = [];
  const disagreementReasons = countBy(
    rows.filter((row) => row.disagreement_reason),
    (row) => row.disagreement_reason,
  );
  for (const [reason, count] of Object.entries(disagreementReasons)) {
    gaps.push({ reason, count, recommendation: recommendationFor(reason) });
  }
  return gaps;
}

function recommendationFor(reason) {
  if (reason.includes("expected_promote_actual_watch")) {
    return "Add stronger positive examples and source evidence for promote-ready rows.";
  }
  if (reason.includes("expected_watch_actual_block")) {
    return "Clarify difference between WATCH and BLOCK when evidence is incomplete but not invalid.";
  }
  if (reason.includes("expected_block_actual_watch")) {
    return "Strengthen mandatory gates and missing-evidence rubric.";
  }
  if (reason.includes("unexpected_auto_apply")) {
    return "Tighten automation policy gate; auto-apply must remain disabled until agreement passes.";
  }
  return "Inspect source evidence and add lane-specific examples.";
}

function groupBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row) ?? "unknown";
    acc[key] ??= [];
    acc[key].push(row);
    return acc;
  }, {});
}

function countBy(rows, keyFn) {
  return Object.fromEntries(
    [
      ...rows.reduce((map, row) => {
        const key = keyFn(row) ?? "unknown";
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map()),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

function safeRatio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function renderMarkdown(report) {
  return `# Growth Agent Agreement

Status: \`${report.status}\`  
Decision accuracy: \`${report.scores.decision_accuracy}\`  
Allowed-action accuracy: \`${report.scores.allowed_action_accuracy}\`  
Threshold: \`${report.threshold}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Agreement By Lane

${renderTable(
  Object.entries(report.distributions.agreement_by_lane).map(
    ([lane, stats]) => ({ lane, ...stats }),
  ),
  [
    { label: "Lane", value: (row) => row.lane },
    { label: "Total", value: (row) => row.total },
    { label: "Matched", value: (row) => row.matched },
    { label: "Accuracy", value: (row) => row.accuracy },
  ],
)}

## Prompt / Config Gaps

${renderTable(report.prompt_config_gaps, [
  { label: "Reason", value: (row) => row.reason },
  { label: "Count", value: (row) => row.count },
  { label: "Recommendation", value: (row) => row.recommendation },
])}

## Disagreements

${renderTable(report.disagreements.slice(0, 50), [
  { label: "Expected", value: (row) => row.expected_decision },
  { label: "Actual", value: (row) => row.actual_decision },
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Reason", value: (row) => row.disagreement_reason },
  { label: "Title", value: (row) => row.title },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
