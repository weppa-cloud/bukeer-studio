#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const TRIAGE_PATH =
  "artifacts/seo/2026-04-29-dataforseo-v2-triage/dataforseo-v2-triage.json";
const EN_AUDIT_PATH =
  "artifacts/seo/2026-04-29-en-blog-findings-audit/en-blog-findings-audit.json";
const DEFAULT_OUT_DIR = "artifacts/seo/2026-04-29-epic310-remediation-sprint";

function parseArgs(argv) {
  const args = {
    triage: TRIAGE_PATH,
    enAudit: EN_AUDIT_PATH,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--triage" && next) {
      args.triage = next;
      i += 1;
    } else if (token === "--en-audit" && next) {
      args.enAudit = next;
      i += 1;
    } else if (token === "--out-dir" && next) {
      args.outDir = next;
      i += 1;
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(","),
    ),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function classifyTriageCohorts(rootPatterns) {
  const order = [
    "status_or_soft_404",
    "metadata_template_or_content",
    "canonical",
    "internal_linking",
    "media_assets",
    "performance",
    "technical_watch",
  ];
  const ownerByPattern = {
    status_or_soft_404: "A1 Backend + A4 SEO",
    metadata_template_or_content: "A1 Backend + A4 SEO",
    canonical: "A1 Backend + A4 SEO",
    internal_linking: "A4 SEO",
    media_assets: "A1 Backend + A4 SEO",
    performance: "A1 Backend",
    technical_watch: "A4 SEO",
  };
  const nextActionByPattern = {
    status_or_soft_404:
      "Classify URLs as restore, 301, remove links/sitemap, 404/410, or watch; invalid EN stays hidden.",
    metadata_template_or_content:
      "Fix template causes for title/meta/H1; route missing editorial copy to #314/#315.",
    canonical:
      "Fix missing/broken/canonical-to-redirect cases and validate locale canonical policy.",
    internal_linking:
      "Link, merge, redirect, or remove orphan/internal-linking URLs according to GSC/GA4 value.",
    media_assets:
      "Repair broken images/resources or apply valid fallbacks for priority URLs.",
    performance:
      "Sample URLs, identify repeatable template/resource causes, and fix only reusable patterns.",
    technical_watch:
      "Revalidate after P0/P1 fixes; promote only if persistent and traffic-bearing.",
  };

  return [...rootPatterns]
    .sort((a, b) => {
      const ai = order.indexOf(a.root_pattern);
      const bi = order.indexOf(b.root_pattern);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return b.decision_score - a.decision_score;
    })
    .map((pattern) => ({
      issue: "#313",
      root_pattern: pattern.root_pattern,
      severity: pattern.operational_severity,
      findings: pattern.findings,
      urls: pattern.urls,
      owner: ownerByPattern[pattern.root_pattern] ?? "A4 SEO",
      gate: Array.isArray(pattern.gates) ? pattern.gates.join("|") : "",
      next_action:
        nextActionByPattern[pattern.root_pattern] ??
        "Review cohort, assign owner, and revalidate in next comparable crawl.",
      sample_url: pattern.top_urls?.[0]?.url ?? "",
    }));
}

function summarizeRows(rows, predicate) {
  const matching = rows.filter(predicate);
  return {
    urls: matching.length,
    p0: matching.filter((row) => row.operational_severity === "P0").length,
    p1: matching.filter((row) => row.operational_severity === "P1").length,
    watch: matching.filter((row) => row.operational_severity === "WATCH")
      .length,
    top: matching
      .slice()
      .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
      .slice(0, 15)
      .map((row) => ({
        action: row.action,
        severity: row.operational_severity,
        slug: row.slug,
        url: row.url,
        findings: row.findings,
        priority_score: row.priority_score,
        rationale: row.rationale,
      })),
  };
}

function buildSprintPlan({ triage, enAudit }) {
  const technicalCohorts = classifyTriageCohorts(triage.root_patterns ?? []);
  const enRows = enAudit.rows ?? [];
  const enBacklog = [
    {
      issue: "#314/#315",
      action: "translate_later_hide_now",
      owner: "A4 SEO + A5 Growth Ops",
      ...summarizeRows(
        enRows,
        (row) => row.action === "translate_later_hide_now",
      ),
      next_action:
        "Keep hidden from sitemap/hreflang; translate from ES only after quality gate and demand priority.",
    },
    {
      issue: "#314/#315",
      action: "en_only_hide_now",
      owner: "A4 SEO + A5 Growth Ops",
      ...summarizeRows(enRows, (row) => row.action === "en_only_hide_now"),
      next_action:
        "Keep hidden; decide restore, regroup with ES/default, do-not-publish, or remove/404.",
    },
    {
      issue: "#314/#315",
      action: "ready",
      owner: "A4 SEO",
      ...summarizeRows(enRows, (row) => row.action === "ready"),
      next_action:
        "Run manual EN QA for title/meta/H1/canonical/content quality before publishing or scaling.",
    },
  ];

  const milestones = [
    {
      day: "D1",
      owner: "A1/A4",
      deliverable:
        "Merge PR #372, branch from dev, confirm direct EN invalid URLs are non-indexable.",
      exit_criteria:
        "Base merged; remediation branch open; smoke route status evidence attached.",
    },
    {
      day: "D2-D4",
      owner: "A1/A4",
      deliverable: "P0 status/soft-404 remediation cohort treated.",
      exit_criteria:
        "Each P0 has action fixed/redirected/removed/404/watch/content_blocked.",
    },
    {
      day: "D5-D7",
      owner: "A1/A4",
      deliverable: "P1 metadata/H1 and canonical batch fixes.",
      exit_criteria:
        "Template causes fixed; editorial gaps moved to EN/content backlog.",
    },
    {
      day: "D8-D9",
      owner: "A4/A5",
      deliverable: "EN backlog #314/#315 prioritized.",
      exit_criteria:
        "215 EN URLs split into restore/translate/review/do-not-publish/remove_or_404.",
    },
    {
      day: "D10",
      owner: "A3/A5",
      deliverable: "Weekly intake and Growth Council artifact refreshed.",
      exit_criteria:
        "growth_inventory post-fix rows ready; Council has <=5 active experiments.",
    },
    {
      day: "D10+ approval",
      owner: "A5",
      deliverable: "DataForSEO post-fix comparable crawl.",
      exit_criteria:
        "Only after explicit cost approval; normalize, diff, publish evidence.",
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    current_run: triage.current_run,
    previous_run: triage.previous_run,
    counts: {
      current_findings: triage.counts?.current_findings ?? 0,
      p0: triage.classification_counts?.operational_severity?.P0 ?? 0,
      p1: triage.classification_counts?.operational_severity?.P1 ?? 0,
      watch: triage.classification_counts?.operational_severity?.WATCH ?? 0,
      en_urls_total: enAudit.issue_owner_counts?.["#314/#315"] ?? 0,
      technical_blog_urls: enAudit.issue_owner_counts?.["#313"] ?? 0,
    },
    technical_cohorts: technicalCohorts,
    en_backlog: enBacklog,
    milestones,
    recrawl_policy:
      "Do not launch DataForSEO recrawl until P0/P1 fixes are complete and cost is explicitly approved.",
  };
}

function renderMarkdown(plan) {
  const lines = [
    "# EPIC #310 Remediation Sprint Plan",
    "",
    `Generated: ${plan.generated_at}`,
    `Current run: ${plan.current_run}`,
    `Previous run: ${plan.previous_run}`,
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Current findings | ${plan.counts.current_findings} |`,
    `| P0 | ${plan.counts.p0} |`,
    `| P1 | ${plan.counts.p1} |`,
    `| WATCH | ${plan.counts.watch} |`,
    `| #313 technical blog URLs | ${plan.counts.technical_blog_urls} |`,
    `| #314/#315 EN URLs | ${plan.counts.en_urls_total} |`,
    "",
    "## #313 Technical Cohorts",
    "",
    "| Severity | Root pattern | Findings | URLs | Owner | Next action | Sample |",
    "|---|---|---:|---:|---|---|---|",
    ...plan.technical_cohorts.map(
      (row) =>
        `| ${row.severity} | ${row.root_pattern} | ${row.findings} | ${row.urls} | ${row.owner} | ${row.next_action} | ${row.sample_url} |`,
    ),
    "",
    "## #314/#315 EN Backlog",
    "",
    "| Action | URLs | P0 | P1 | WATCH | Owner | Next action |",
    "|---|---:|---:|---:|---:|---|---|",
    ...plan.en_backlog.map(
      (row) =>
        `| ${row.action} | ${row.urls} | ${row.p0} | ${row.p1} | ${row.watch} | ${row.owner} | ${row.next_action} |`,
    ),
    "",
    "## Milestones",
    "",
    "| Day | Owner | Deliverable | Exit criteria |",
    "|---|---|---|---|",
    ...plan.milestones.map(
      (row) =>
        `| ${row.day} | ${row.owner} | ${row.deliverable} | ${row.exit_criteria} |`,
    ),
    "",
    "## Recrawl Policy",
    "",
    plan.recrawl_policy,
    "",
  ];
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const triage = readJson(args.triage);
  const enAudit = readJson(args.enAudit);
  const plan = buildSprintPlan({ triage, enAudit });

  ensureDir(args.outDir);
  fs.writeFileSync(
    path.join(args.outDir, "epic310-remediation-sprint.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(args.outDir, "epic310-remediation-sprint.md"),
    renderMarkdown(plan),
  );
  writeCsv(
    path.join(args.outDir, "technical-cohorts.csv"),
    plan.technical_cohorts,
    [
      "issue",
      "root_pattern",
      "severity",
      "findings",
      "urls",
      "owner",
      "gate",
      "next_action",
      "sample_url",
    ],
  );
  writeCsv(path.join(args.outDir, "en-backlog.csv"), plan.en_backlog, [
    "issue",
    "action",
    "owner",
    "urls",
    "p0",
    "p1",
    "watch",
    "next_action",
  ]);

  console.log(
    JSON.stringify(
      {
        outDir: args.outDir,
        counts: plan.counts,
        technical_cohorts: plan.technical_cohorts.length,
        en_backlog: plan.en_backlog.length,
      },
      null,
      2,
    ),
  );
}

main();
