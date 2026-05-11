import { writeFile, mkdir } from "fs/promises";
import path from "path";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";

export const GROWTH_BACKLOG_CLEANUP_CONFIRM = "cleanup-growth-backlog-471";

export interface CleanupGrowthBacklogNoiseInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  apply?: boolean;
  confirm?: string;
  now?: Date;
  reportPath?: string;
}

export interface CleanupDecision {
  table: "growth_opportunity_candidates" | "growth_work_items";
  id: string;
  currentStatus: string;
  nextStatus: string;
  reason: string;
  correlationKey: string | null;
  evidenceFingerprint: string | null;
}

export interface CleanupGrowthBacklogNoiseResult {
  dryRun: boolean;
  decisions: CleanupDecision[];
  applied: number;
  reportPath: string;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function correlation(row: JsonRecord): JsonRecord {
  return asRecord(asRecord(row.evidence).correlation);
}

function correlationKey(row: JsonRecord): string | null {
  return stringValue(correlation(row).correlation_key);
}

function evidenceFingerprint(row: JsonRecord): string | null {
  return stringValue(correlation(row).evidence_fingerprint);
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function target(row: JsonRecord): JsonRecord {
  return asRecord(asRecord(row.evidence).target);
}

function adapterInput(row: JsonRecord): JsonRecord {
  return asRecord(asRecord(row.evidence).adapter_input);
}

function hasTarget(row: JsonRecord): boolean {
  const t = target(row);
  const input = adapterInput(row);
  return Boolean(
    t.target_id ||
      t.target_path ||
      t.target_key ||
      input.target_id ||
      input.target_path ||
      input.target_key,
  );
}

function hasRollback(row: JsonRecord): boolean {
  const adapterInput = asRecord(asRecord(row.evidence).adapter_input);
  return Object.keys(asRecord(asRecord(row.evidence).rollback_expectation)).length > 0 ||
    Object.keys(asRecord(asRecord(row.evidence).rollback_payload)).length > 0 ||
    Object.keys(asRecord(adapterInput.rollback_payload)).length > 0;
}

function hasBaseline(row: JsonRecord): boolean {
  const adapterInput = asRecord(asRecord(row.evidence).adapter_input);
  return Object.keys(asRecord(asRecord(row.evidence).baseline)).length > 0 ||
    Object.keys(asRecord(adapterInput.baseline)).length > 0;
}

function hasMetric(row: JsonRecord): boolean {
  return Boolean(
    row.success_metric ||
      asRecord(row.evidence).success_metric ||
      asRecord(asRecord(row.evidence).adapter_input).success_metric,
  );
}

function hasEvaluationWindow(row: JsonRecord): boolean {
  return Boolean(row.evaluation_window || asRecord(row.evidence).evaluation_window);
}

function missingContractReason(row: JsonRecord): string | null {
  const missing = [
    !hasTarget(row) ? "target" : null,
    !hasRollback(row) ? "rollback" : null,
    !hasBaseline(row) ? "baseline" : null,
    !hasMetric(row) ? "success_metric" : null,
    !hasEvaluationWindow(row) ? "evaluation_window" : null,
  ].filter(Boolean);
  return missing.length ? `missing_contract:${missing.join("|")}` : null;
}

function groupKey(row: JsonRecord): string | null {
  const key = correlationKey(row);
  const fingerprint = evidenceFingerprint(row);
  if (key && fingerprint) return `${key}:${fingerprint}`;
  if (key) return key;

  const evidence = asRecord(row.evidence);
  const input = adapterInput(row);
  const actionKey =
    stringValue(evidence.action_key) ||
    stringValue(evidence.allowed_action_class) ||
    stringValue(row.allowed_action_class);
  const entityKey =
    stringValue(evidence.entity_key) ||
    stringValue(evidence.target_key) ||
    stringValue(target(row).target_key) ||
    stringValue(target(row).target_id) ||
    stringValue(target(row).target_path) ||
    stringValue(input.target_key) ||
    stringValue(input.target_id) ||
    stringValue(input.target_path);
  if (actionKey && entityKey) {
    const patch = JSON.stringify(asRecord(input.patch));
    return `${normalizeKeyPart(actionKey)}:${normalizeKeyPart(entityKey)}:${patch}`;
  }

  const title = stringValue(row.title);
  if (title) return `title:${normalizeKeyPart(title)}`;
  return null;
}

function sortByCreated(rows: JsonRecord[]): JsonRecord[] {
  return [...rows].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
}

function rowId(row: JsonRecord): string | null {
  return stringValue(row.id);
}

function buildDecisions({
  candidates,
  workItems,
  outcomes,
}: {
  candidates: JsonRecord[];
  workItems: JsonRecord[];
  outcomes: JsonRecord[];
}): CleanupDecision[] {
  const decisions: CleanupDecision[] = [];
  const measuringWorkIds = new Set(
    outcomes
      .filter((row) => ["measuring", "scheduled"].includes(String(row.status ?? "")))
      .map((row) => row.work_item_id)
      .filter(Boolean),
  );
  const workItemsByGroup = new Map<string, JsonRecord[]>();
  for (const row of workItems) {
    const key = groupKey(row);
    if (!key) continue;
    workItemsByGroup.set(key, [...(workItemsByGroup.get(key) ?? []), row]);
  }

  const candidateGroups = new Map<string, JsonRecord[]>();
  for (const row of candidates) {
    const key = groupKey(row);
    if (!key) continue;
    candidateGroups.set(key, [...(candidateGroups.get(key) ?? []), row]);
  }

  for (const row of candidates) {
    const id = rowId(row);
    if (!id || String(row.status ?? "") === "blocked") continue;
    const missing = missingContractReason(row);
    if (missing) {
      decisions.push({
        table: "growth_opportunity_candidates",
        id,
        currentStatus: String(row.status ?? ""),
        nextStatus: "blocked",
        reason: missing,
        correlationKey: correlationKey(row),
        evidenceFingerprint: evidenceFingerprint(row),
      });
    }
  }

  for (const [key, rows] of candidateGroups) {
    const ordered = sortByCreated(rows).filter((row) =>
      ["candidate", "ready_for_backlog"].includes(String(row.status ?? "")),
    );
    for (const duplicate of ordered.slice(1)) {
      const id = rowId(duplicate);
      if (!id) continue;
      decisions.push({
        table: "growth_opportunity_candidates",
        id,
        currentStatus: String(duplicate.status ?? ""),
        nextStatus: "blocked",
        reason: "correlation:same_evidence_same_action",
        correlationKey: correlationKey(duplicate),
        evidenceFingerprint: evidenceFingerprint(duplicate),
      });
    }
    const relatedWork = workItemsByGroup.get(key) ?? [];
    if (relatedWork.some((row) => measuringWorkIds.has(row.id))) {
      for (const duplicate of ordered) {
        const id = rowId(duplicate);
        if (!id) continue;
        decisions.push({
          table: "growth_opportunity_candidates",
          id,
          currentStatus: String(duplicate.status ?? ""),
          nextStatus: "blocked",
          reason: "correlation:measurement_window_open",
          correlationKey: correlationKey(duplicate),
          evidenceFingerprint: evidenceFingerprint(duplicate),
        });
      }
    }
  }

  for (const row of workItems) {
    const id = rowId(row);
    const status = String(row.status ?? "");
    if (!id || ["blocked", "published_applied", "archived", "auto_completed"].includes(status)) {
      continue;
    }
    const missing = missingContractReason(row);
    if (missing) {
      decisions.push({
        table: "growth_work_items",
        id,
        currentStatus: status,
        nextStatus: "blocked",
        reason: missing,
        correlationKey: correlationKey(row),
        evidenceFingerprint: evidenceFingerprint(row),
      });
    }
  }

  for (const [key, rows] of workItemsByGroup) {
    const ordered = sortByCreated(rows).filter((row) =>
      ["ready", "running", "review_needed"].includes(String(row.status ?? "")),
    );
    const hasMeasuring = rows.some((row) => measuringWorkIds.has(row.id));
    const duplicates = hasMeasuring ? ordered : ordered.slice(1);
    for (const duplicate of duplicates) {
      const id = rowId(duplicate);
      if (!id) continue;
      decisions.push({
        table: "growth_work_items",
        id,
        currentStatus: String(duplicate.status ?? ""),
        nextStatus: "blocked",
        reason: hasMeasuring
          ? "correlation:measurement_window_open"
          : "correlation:same_evidence_same_action",
        correlationKey: key,
        evidenceFingerprint: evidenceFingerprint(duplicate),
      });
    }
  }

  const byRow = new Map<string, CleanupDecision>();
  for (const decision of decisions) {
    const key = `${decision.table}:${decision.id}`;
    if (!byRow.has(key)) byRow.set(key, decision);
  }
  return Array.from(byRow.values());
}

async function writeReport(result: CleanupGrowthBacklogNoiseResult, now: Date) {
  const reportPath =
    result.reportPath ||
    path.join(
      "docs",
      "growth-sessions",
      `${now.toISOString().slice(0, 10)}-epic471-backlog-cleanup.md`,
    );
  const lines = [
    `# Epic #471 Backlog Cleanup — ${now.toISOString()}`,
    "",
    `- Mode: ${result.dryRun ? "dry-run" : "apply"}`,
    `- Decisions: ${result.decisions.length}`,
    `- Applied: ${result.applied}`,
    "",
    "| Table | ID | From | To | Reason |",
    "|---|---|---|---|---|",
    ...result.decisions.map(
      (decision) =>
        `| ${decision.table} | \`${decision.id}\` | ${decision.currentStatus} | ${decision.nextStatus} | ${decision.reason} |`,
    ),
    "",
  ];
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  return reportPath;
}

export async function cleanupGrowthBacklogNoise({
  supabase,
  accountId,
  websiteId,
  apply = false,
  confirm,
  now = new Date(),
  reportPath,
}: CleanupGrowthBacklogNoiseInput): Promise<CleanupGrowthBacklogNoiseResult> {
  if (apply && confirm !== GROWTH_BACKLOG_CLEANUP_CONFIRM) {
    throw new Error(`Refusing apply without --confirm ${GROWTH_BACKLOG_CLEANUP_CONFIRM}`);
  }

  const [
    { data: candidates, error: candidateError },
    { data: workItems, error: workItemError },
    { data: outcomes, error: outcomeError },
  ] = await Promise.all([
    supabase
      .from("growth_opportunity_candidates")
      .select("*")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .in("status", ["candidate", "ready_for_backlog"])
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("growth_work_items")
      .select("*")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .in("status", ["ready", "running", "review_needed", "approved_for_execution"])
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("growth_work_item_outcomes")
      .select("id,work_item_id,status,evaluation_date")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .limit(1000),
  ]);

  if (candidateError) throw new Error(candidateError.message);
  if (workItemError) throw new Error(workItemError.message);
  if (outcomeError) throw new Error(outcomeError.message);

  const decisions = buildDecisions({
    candidates: (candidates ?? []) as JsonRecord[],
    workItems: (workItems ?? []) as JsonRecord[],
    outcomes: (outcomes ?? []) as JsonRecord[],
  });

  let applied = 0;
  if (apply) {
    for (const decision of decisions) {
      const payload =
        decision.table === "growth_work_items"
          ? {
              status: decision.nextStatus,
              progress_label: "Blocked by Epic #471 backlog cleanup",
              next_action: decision.reason,
              updated_at: now.toISOString(),
            }
          : {
              status: decision.nextStatus,
              blocking_reason: decision.reason,
              updated_at: now.toISOString(),
            };
      const { error } = await supabase
        .from(decision.table)
        .update(payload)
        .eq("id", decision.id)
        .eq("website_id", websiteId);
      if (error) throw new Error(`${decision.table}:${decision.id}: ${error.message}`);
      applied += 1;
    }
  }

  const result: CleanupGrowthBacklogNoiseResult = {
    dryRun: !apply,
    decisions,
    applied,
    reportPath: reportPath ?? "",
  };
  result.reportPath = await writeReport(result, now);
  return result;
}
