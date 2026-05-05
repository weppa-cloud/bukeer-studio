"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  type GrowthRole,
  hasGrowthRole,
  requireGrowthRole,
} from "@/lib/growth/console/auth";
import { getGrowthWorkboard } from "@/lib/growth/console/queries-workboard";

/**
 * Server Actions for the Run detail page (#407).
 *
 * Tenant guard MUST run on every action: derive (account_id, role) from the
 * SSR Supabase session — never trust the form payload as authority.
 *
 * Append-only: these actions only INSERT into `growth_human_reviews`. They
 * never UPDATE / DELETE `growth_agent_run_events`.
 *
 * Artifact paths are NEVER raw-exposed — `getArtifactSignedUrl` returns a
 * short-lived signed URL when the artifact lives in Supabase Storage; for
 * orchestrator-workspace paths it returns a TODO message instead of the
 * raw path.
 */

async function getTenantAndRole(websiteId: string) {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGrowthRole(websiteId, "viewer");
  return {
    supabase,
    accountId: ctx.accountId,
    userId: ctx.userId,
    role: ctx.role,
  };
}

export interface ArtifactSignedUrlResult {
  ok: boolean;
  url: string | null;
  message: string | null;
}

export async function getArtifactSignedUrl(
  websiteId: string,
  runId: string,
): Promise<ArtifactSignedUrlResult> {
  const { supabase, accountId } = await getTenantAndRole(websiteId);

  const { data: row, error } = await supabase
    .from("growth_agent_runs")
    .select("artifact_path")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .maybeSingle();

  if (error || !row?.artifact_path) {
    return {
      ok: false,
      url: null,
      message: "No artifact recorded for this run.",
    };
  }
  const path = row.artifact_path as string;

  // Convention: Storage paths look like "<bucket>/<key>". Anything else (a
  // local filesystem path, an absolute URL on a remote runner) gets a TODO
  // — we do NOT raw-expose the path.
  const storageMatch = path.match(/^([a-z0-9_-]+)\/(.+)$/i);
  if (!storageMatch) {
    return {
      ok: false,
      url: null,
      message:
        "TODO: artifact is not in Supabase Storage (likely orchestrator workspace). Signed-URL transport TBD in #404.",
    };
  }
  const [, bucket, key] = storageMatch;
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, 60 * 5);
  if (signErr || !signed?.signedUrl) {
    return { ok: false, url: null, message: "Could not sign artifact URL." };
  }
  return { ok: true, url: signed.signedUrl, message: null };
}

interface ReviewActionResult {
  ok: boolean;
  message: string;
}

async function writeHumanReview(opts: {
  websiteId: string;
  runId: string;
  decision: "approve" | "reject";
  notes?: string;
}): Promise<ReviewActionResult> {
  const { supabase, accountId, userId, role } = await getTenantAndRole(
    opts.websiteId,
  );

  if (!hasGrowthRole(role, "curator")) {
    return {
      ok: false,
      message: "Forbidden: curator role required.",
    };
  }

  // Re-verify the run is in this tenant before recording a review.
  const { data: runRow, error: runErr } = await supabase
    .from("growth_agent_runs")
    .select(
      "account_id, website_id, locale, market, run_id, lane, source_table, source_id, status, evidence",
    )
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .maybeSingle();
  if (runErr || !runRow) {
    return { ok: false, message: "Run not found in this tenant." };
  }

  const run = runRow as {
    account_id: string;
    website_id: string;
    locale: string;
    market: string;
    run_id: string;
    lane: string;
    source_table: string | null;
    source_id: string | null;
    status: string;
    evidence: Record<string, unknown> | null;
  };

  if (run.status !== "review_required") {
    return {
      ok: false,
      message: "Run is not pending human review.",
    };
  }

  const now = new Date().toISOString();
  const sourceForeignKeys = {
    backlog_item_id:
      run.source_table === "growth_backlog_items" ? run.source_id : null,
    task_id: run.source_table === "growth_content_tasks" ? run.source_id : null,
  };

  const admin = createSupabaseServiceRoleClient();
  const { data: reviewRow, error: insertErr } = await admin
    .from("growth_human_reviews")
    .insert({
      account_id: accountId,
      website_id: opts.websiteId,
      ...sourceForeignKeys,
      review_key: `agent-run:${opts.runId}:${opts.decision}:${Date.now()}`,
      reviewer_role: role,
      decision: opts.decision,
      rationale: opts.notes ?? null,
      evidence: {
        run_id: opts.runId,
        reviewer_id: userId,
        lane: run.lane,
        source_table: run.source_table,
        source_id: run.source_id,
        applied_to_runtime: true,
        business_mutation_applied: false,
        business_mutation_reason:
          "Growth OS v1 closes the run and records governance evidence; content publish, paid mutation, transcreation merge and experiment activation remain separately gated.",
      },
    })
    .select("id, created_at")
    .single();

  if (insertErr) {
    const msg = (insertErr.message ?? "").toLowerCase();
    const missing =
      insertErr.code === "42P01" ||
      msg.includes("does not exist") ||
      msg.includes("schema cache");
    if (missing) {
      // TODO(#405 / #408): table not yet provisioned. Log + surface message
      // so the UI can flag the gap without crashing.
      // eslint-disable-next-line no-console
      console.warn(
        "[growth/console] growth_human_reviews missing — TODO #405 / #408",
        { runId: opts.runId, decision: opts.decision },
      );
      return {
        ok: false,
        message:
          "TODO: growth_human_reviews table not yet provisioned (#405 / #408).",
      };
    }
    return { ok: false, message: "Could not record review." };
  }

  const existingEvidence =
    run.evidence &&
    typeof run.evidence === "object" &&
    !Array.isArray(run.evidence)
      ? run.evidence
      : {};
  const finalEvidence = {
    ...existingEvidence,
    human_review: {
      decision: opts.decision,
      reviewed_by: userId,
      reviewer_role: role,
      reviewed_at: now,
      review_id: reviewRow?.id ?? null,
      rationale: opts.notes ?? null,
    },
    applied_reality: {
      runtime_status_applied: true,
      run_status: "completed",
      business_mutation_applied: false,
      requires_separate_apply_gate: [
        "content_publish",
        "transcreation_merge",
        "paid_mutation",
        "experiment_activation",
      ],
    },
  };

  const { error: updateErr } = await admin
    .from("growth_agent_runs")
    .update({
      status: "completed",
      finished_at: now,
      heartbeat_at: now,
      evidence: finalEvidence,
      updated_at: now,
    })
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .eq("status", "review_required");

  if (updateErr) {
    return {
      ok: false,
      message: "Human review recorded, but run closeout failed.",
    };
  }

  const { error: eventErr } = await admin
    .from("growth_agent_run_events")
    .insert({
      account_id: accountId,
      website_id: opts.websiteId,
      locale: run.locale,
      market: run.market,
      run_id: opts.runId,
      event_type: "completed",
      severity: opts.decision === "approve" ? "info" : "warn",
      message:
        opts.decision === "approve"
          ? "Human approved the agent run; runtime closeout applied."
          : "Human rejected the agent run; runtime closeout applied without business mutation.",
      payload: {
        decision: opts.decision,
        reviewer_id: userId,
        reviewer_role: role,
        review_id: reviewRow?.id ?? null,
        business_mutation_applied: false,
      },
      occurred_at: now,
    });

  if (eventErr) {
    return {
      ok: false,
      message: "Run closed, but event trace could not be recorded.",
    };
  }

  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs/${opts.runId}`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/overview`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/backlog`);
  return {
    ok: true,
    message: `Run ${opts.decision}; runtime closeout applied.`,
  };
}

type CandidateKind = "memory" | "skill" | "replay";
type CandidateDecision = "approve" | "reject";
type ChangeSetDecision = "approve" | "reject";
type ChangeSetApplyMode = "applied" | "published";

interface FollowUpBacklogTask {
  title: string;
  lane: string | null;
  instructions: string;
  workType: string;
  requiresHumanReview: boolean;
  source: Record<string, unknown>;
}

const CANDIDATE_TABLE: Record<CandidateKind, string> = {
  memory: "growth_agent_memories",
  skill: "growth_agent_skills",
  replay: "growth_agent_replay_cases",
};

function candidateStatus(kind: CandidateKind, decision: CandidateDecision) {
  if (decision === "reject") return "rejected";
  if (kind === "replay") return "active";
  return "active";
}

async function reviewRuntimeCandidate(opts: {
  websiteId: string;
  runId: string;
  candidateId: string;
  kind: CandidateKind;
  decision: CandidateDecision;
}): Promise<ReviewActionResult> {
  const { accountId, userId, role } = await getTenantAndRole(opts.websiteId);
  if (!hasGrowthRole(role, "curator")) {
    return { ok: false, message: "Forbidden: curator role required." };
  }

  const admin = createSupabaseServiceRoleClient();
  const table = CANDIDATE_TABLE[opts.kind];
  const status = candidateStatus(opts.kind, opts.decision);
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (opts.decision === "approve" && opts.kind !== "replay") {
    updatePayload.approved_by = userId;
    updatePayload.approved_at = now;
  }

  let query = (
    admin.from as unknown as (
      tableName: string,
    ) => ReturnType<typeof admin.from>
  )(table)
    .update(updatePayload)
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("id", opts.candidateId);

  query =
    opts.kind === "replay"
      ? query.eq("run_id", opts.runId)
      : query.eq("source_run_id", opts.runId);

  const { error: updateErr } = await query;
  if (updateErr) {
    return {
      ok: false,
      message: `Could not ${opts.decision} ${opts.kind} candidate.`,
    };
  }

  const { error: reviewErr } = await admin.from("growth_human_reviews").insert({
    account_id: accountId,
    website_id: opts.websiteId,
    review_key: `runtime-candidate:${opts.kind}:${opts.candidateId}:${opts.decision}`,
    reviewer_role: role,
    decision: opts.decision,
    status: "recorded",
    evidence: {
      run_id: opts.runId,
      reviewer_id: userId,
      candidate_kind: opts.kind,
      candidate_id: opts.candidateId,
      candidate_status: status,
    },
  });

  if (reviewErr) {
    return {
      ok: false,
      message: "Candidate updated, but could not record human review.",
    };
  }

  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs/${opts.runId}`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/agents`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/data-health`);
  return {
    ok: true,
    message: `${opts.kind} candidate ${opts.decision}d.`,
  };
}

async function candidateAction(
  formData: FormData,
  kind: CandidateKind,
  decision: CandidateDecision,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!websiteId || !runId || !candidateId) return;
  await reviewRuntimeCandidate({
    websiteId,
    runId,
    candidateId,
    kind,
    decision,
  });
}

function requiredGrowthRoleForChangeSet(
  requiredRole: string | null | undefined,
): GrowthRole {
  switch (requiredRole) {
    case "growth_operator":
      return "growth_operator";
    case "council_admin":
      return "council_admin";
    case "technical_owner":
      return "curator";
    case "curator":
    default:
      return "curator";
  }
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stableString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  return JSON.stringify(
    value,
    Object.keys(value as Record<string, unknown>).sort(),
  );
}

function fingerprint(...parts: unknown[]): string {
  const input = parts.map(stableString).join("|");
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function workTypeForFollowUp(task: Record<string, unknown>): string {
  const explicit = optionalString(task.work_type);
  if (explicit) return explicit;

  const lane = optionalString(task.target_lane) ?? optionalString(task.lane);
  if (lane === "technical_remediation") return "technical_remediation";
  if (lane === "transcreation") return "transcreation";
  if (lane === "content_creator") return "seo_content";
  if (lane === "content_curator") return "cro_activation";
  return "growth_opportunity";
}

function ownerRoleForWorkType(workType: string): string {
  if (workType.includes("technical")) return "A4";
  if (workType.includes("cro") || workType.includes("tracking")) return "A3";
  return "A5";
}

function ownerIssueForWorkType(workType: string): string {
  if (workType.includes("technical")) return "#313";
  if (workType.includes("transcreation") || workType.includes("locale")) {
    return "#315";
  }
  if (workType.includes("content")) return "#314";
  if (workType.includes("serp") || workType.includes("seo")) return "#321";
  return "#310";
}

function successMetricForWorkType(workType: string): string {
  if (workType.includes("technical")) {
    return "El hallazgo técnico queda resuelto en el siguiente smoke/crawl comparable.";
  }
  if (workType.includes("cro")) {
    return "La activación o conversión mejora en la siguiente ventana comparable de GA4/funnel.";
  }
  if (workType.includes("transcreation") || workType.includes("locale")) {
    return "La versión localizada pasa revisión humana y mantiene intención, tono y SEO por mercado.";
  }
  return "Clicks, CTR, impresiones o calidad editorial mejoran en la siguiente revisión comparable.";
}

function normalizeFollowUpBacklogTasks(
  previewPayload: Record<string, unknown>,
): FollowUpBacklogTask[] {
  const value = previewPayload.follow_up_tasks;
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 10)
    .map((item, index) => {
      if (typeof item === "string") {
        const title = item.trim();
        if (!title) return null;
        return {
          title,
          lane: null,
          instructions: title,
          workType: "growth_opportunity",
          requiresHumanReview: true,
          source: { raw: title },
        };
      }

      const task = safeRecord(item);
      const title =
        optionalString(task.title) ??
        optionalString(task.name) ??
        optionalString(task.summary) ??
        `Tarea de seguimiento ${index + 1}`;
      const instructions =
        optionalString(task.instructions) ??
        optionalString(task.description) ??
        optionalString(task.next_action) ??
        title;
      return {
        title,
        lane:
          optionalString(task.target_lane) ??
          optionalString(task.lane) ??
          optionalString(task.owner_lane),
        instructions,
        workType: workTypeForFollowUp(task),
        requiresHumanReview:
          typeof task.requires_human_review === "boolean"
            ? task.requires_human_review
            : true,
        source: task,
      };
    })
    .filter((task): task is FollowUpBacklogTask => Boolean(task));
}

async function createFollowUpBacklogItems(opts: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  accountId: string;
  websiteId: string;
  runId: string;
  changeSet: {
    id: string;
    locale: string;
    market: string;
    agent_lane: string;
    change_type: string;
    title: string;
    summary: string;
    source_table: string | null;
    source_id: string | null;
    preview_payload: Record<string, unknown>;
    evidence: Record<string, unknown>;
  };
  userId: string;
  reviewedAt: string;
}) {
  const tasks = normalizeFollowUpBacklogTasks(opts.changeSet.preview_payload);
  if (tasks.length === 0) {
    return { ids: [] as string[], rows: [] as Array<Record<string, unknown>> };
  }

  const rows = tasks.map((task, index) => {
    const itemKey = fingerprint(
      "change-set-follow-up",
      opts.websiteId,
      opts.changeSet.id,
      index,
      task.title,
      task.workType,
    );
    const entityKey =
      optionalString(task.source.entity_key) ??
      optionalString(task.source.url) ??
      optionalString(task.source.page_url) ??
      `change-set:${opts.changeSet.id}:${index + 1}`;
    const sourceRefs = Array.isArray(opts.changeSet.evidence.source_refs)
      ? opts.changeSet.evidence.source_refs
      : Array.isArray(opts.changeSet.preview_payload.source_refs)
        ? opts.changeSet.preview_payload.source_refs
        : [];

    return {
      account_id: opts.accountId,
      website_id: opts.websiteId,
      candidate_id: null,
      item_key: itemKey,
      entity_type: optionalString(task.source.entity_type) ?? "agent_follow_up",
      entity_key: entityKey,
      work_type: task.workType,
      title: task.title,
      market: opts.changeSet.market,
      locale: opts.changeSet.locale,
      channel: optionalString(task.source.channel) ?? "growth_os",
      source_profiles: ["codex_runtime_change_set"],
      source_fact_refs: [
        `growth_agent_runs:${opts.runId}`,
        `growth_agent_change_sets:${opts.changeSet.id}`,
        ...sourceRefs.map((ref) => String(ref)),
      ],
      baseline:
        optionalString(task.source.baseline) ??
        `Propuesta creada por el agente a partir de: ${opts.changeSet.title}`,
      hypothesis:
        optionalString(task.source.hypothesis) ??
        `Si el equipo ejecuta "${task.title}", el ciclo Growth OS avanza con evidencia y control humano.`,
      priority_score: Number(task.source.priority_score ?? 55),
      confidence_score: Number(task.source.confidence_score ?? 0.7),
      independence_key: `agent_follow_up:${opts.changeSet.id}:${task.workType}:${entityKey}`,
      owner_role:
        optionalString(task.source.owner_role) ??
        ownerRoleForWorkType(task.workType),
      owner_issue:
        optionalString(task.source.owner_issue) ??
        ownerIssueForWorkType(task.workType),
      next_action: task.instructions,
      success_metric:
        optionalString(task.source.success_metric) ??
        successMetricForWorkType(task.workType),
      evaluation_date: null,
      status: task.requiresHumanReview ? "ready_for_brief" : "queued",
      blocked_reason: null,
      evidence: {
        source: "growth_agent_change_set_approval",
        created_by_user_id: opts.userId,
        created_at: opts.reviewedAt,
        run_id: opts.runId,
        change_set_id: opts.changeSet.id,
        change_set_type: opts.changeSet.change_type,
        parent_source_table: opts.changeSet.source_table,
        parent_source_id: opts.changeSet.source_id,
        agent_lane: opts.changeSet.agent_lane,
        human_governance:
          "Created as follow-up backlog after Curator approval. Publishing, paid mutation, transcreation merge and experiment activation remain separately gated.",
        follow_up_task: task.source,
      },
    };
  });

  const { data, error } = await opts.admin
    .from("growth_backlog_items")
    .upsert(rows, { onConflict: "website_id,item_key" })
    .select("id, item_key, title, status, work_type");

  if (error) {
    throw new Error(error.message);
  }

  return {
    ids: (data ?? []).map((row) => String(row.id)),
    rows: (data ?? []) as Array<Record<string, unknown>>,
  };
}

async function reviewChangeSet(opts: {
  websiteId: string;
  runId: string;
  changeSetId: string;
  decision: ChangeSetDecision;
  notes?: string;
}): Promise<ReviewActionResult> {
  const { accountId, userId, role } = await getTenantAndRole(opts.websiteId);

  const admin = createSupabaseServiceRoleClient();
  const { data: row, error: loadErr } = await admin
    .from("growth_agent_change_sets")
    .select(
      "id, account_id, website_id, locale, market, run_id, source_table, source_id, agent_lane, change_type, status, title, summary, preview_payload, evidence, required_approval_role",
    )
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .eq("id", opts.changeSetId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, message: "Change set not found in this tenant." };
  }

  const changeSet = row as {
    id: string;
    account_id: string;
    website_id: string;
    locale: string;
    market: string;
    run_id: string;
    source_table: string | null;
    source_id: string | null;
    agent_lane: string;
    change_type: string;
    status: string;
    title: string;
    summary: string;
    preview_payload: Record<string, unknown> | null;
    evidence: Record<string, unknown> | null;
    required_approval_role: string | null;
  };
  const requiredRole = requiredGrowthRoleForChangeSet(
    changeSet.required_approval_role,
  );

  if (!hasGrowthRole(role, requiredRole)) {
    return {
      ok: false,
      message: `Forbidden: ${requiredRole} role required.`,
    };
  }

  if (
    changeSet.status === "applied" ||
    changeSet.status === "published" ||
    changeSet.status === "rejected" ||
    changeSet.status === "blocked"
  ) {
    return {
      ok: false,
      message: "Change set is already closed.",
    };
  }

  const now = new Date().toISOString();
  const nextStatus = opts.decision === "approve" ? "approved" : "rejected";
  const existingEvidence =
    changeSet.evidence &&
    typeof changeSet.evidence === "object" &&
    !Array.isArray(changeSet.evidence)
      ? changeSet.evidence
      : {};
  const previewPayload = safeRecord(changeSet.preview_payload);

  let createdFollowUps: {
    ids: string[];
    rows: Array<Record<string, unknown>>;
  } = { ids: [], rows: [] };
  let followUpError: string | null = null;

  if (opts.decision === "approve") {
    try {
      createdFollowUps = await createFollowUpBacklogItems({
        admin,
        accountId,
        websiteId: opts.websiteId,
        runId: opts.runId,
        userId,
        reviewedAt: now,
        changeSet: {
          ...changeSet,
          preview_payload: previewPayload,
          evidence: existingEvidence,
        },
      });
    } catch (error) {
      followUpError =
        error instanceof Error
          ? error.message
          : "Could not create follow-up backlog items.";
    }
  }

  const { error: updateErr } = await admin
    .from("growth_agent_change_sets")
    .update({
      status:
        opts.decision === "approve" && followUpError
          ? "changes_requested"
          : nextStatus,
      created_backlog_item_id: createdFollowUps.ids[0] ?? null,
      approved_by: opts.decision === "approve" ? userId : null,
      approved_at: opts.decision === "approve" ? now : null,
      evidence: {
        ...existingEvidence,
        human_review: {
          decision: opts.decision,
          reviewed_by: userId,
          reviewer_role: role,
          reviewed_at: now,
          notes: opts.notes ?? null,
        },
        business_mutation_applied: false,
        publish_applied: false,
        follow_up_backlog_materialization:
          opts.decision === "approve"
            ? {
                attempted: true,
                created_count: createdFollowUps.rows.length,
                created_items: createdFollowUps.rows,
                error: followUpError,
              }
            : {
                attempted: false,
                created_count: 0,
                created_items: [],
                error: null,
              },
      },
      updated_at: now,
    })
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .eq("id", opts.changeSetId);

  if (updateErr) {
    return {
      ok: false,
      message: `Could not ${opts.decision} change set.`,
    };
  }

  const sourceForeignKeys = {
    backlog_item_id:
      changeSet.source_table === "growth_backlog_items"
        ? changeSet.source_id
        : null,
    task_id:
      changeSet.source_table === "growth_content_tasks"
        ? changeSet.source_id
        : null,
  };

  const { error: reviewErr } = await admin.from("growth_human_reviews").insert({
    account_id: accountId,
    website_id: opts.websiteId,
    ...sourceForeignKeys,
    review_key: `change-set:${opts.changeSetId}:${opts.decision}:${Date.now()}`,
    reviewer_role: role,
    decision: opts.decision,
    status: "recorded",
    rationale: opts.notes ?? null,
    evidence: {
      run_id: opts.runId,
      reviewer_id: userId,
      change_set_id: opts.changeSetId,
      change_type: changeSet.change_type,
      agent_lane: changeSet.agent_lane,
      title: changeSet.title,
      status: nextStatus,
      business_mutation_applied: false,
      requires_separate_apply_gate: true,
      follow_up_backlog_items_created: createdFollowUps.rows,
      follow_up_backlog_error: followUpError,
    },
  });

  if (reviewErr) {
    return {
      ok: false,
      message: "Change set updated, but could not record human review.",
    };
  }

  const { error: eventErr } = await admin
    .from("growth_agent_run_events")
    .insert({
      account_id: accountId,
      website_id: opts.websiteId,
      locale: changeSet.locale,
      market: changeSet.market,
      run_id: opts.runId,
      event_type: "review_required",
      severity: opts.decision === "approve" ? "info" : "warn",
      message:
        opts.decision === "approve" && createdFollowUps.rows.length > 0
          ? "Human approved a change set; follow-up backlog items were created without publishing or paid mutation."
          : opts.decision === "approve"
            ? "Human approved a change set; no business mutation applied."
            : "Human rejected a change set; no business mutation applied.",
      payload: {
        decision: opts.decision,
        reviewer_id: userId,
        reviewer_role: role,
        change_set_id: opts.changeSetId,
        change_type: changeSet.change_type,
        next_status: nextStatus,
        follow_up_backlog_items_created: createdFollowUps.rows,
        follow_up_backlog_error: followUpError,
      },
      occurred_at: now,
    });

  if (eventErr) {
    return {
      ok: false,
      message: "Change set reviewed, but event trace could not be recorded.",
    };
  }

  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs/${opts.runId}`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/agents`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/data-health`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/overview`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/backlog`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/workboard`);
  return {
    ok: true,
    message:
      opts.decision === "approve" && createdFollowUps.rows.length > 0
        ? `Change set approved; ${createdFollowUps.rows.length} follow-up backlog item(s) created.`
        : `Change set ${opts.decision}d.`,
  };
}

function roleForApplyMode(mode: ChangeSetApplyMode): GrowthRole {
  return mode === "published" ? "council_admin" : "curator";
}

async function applyOrPublishChangeSet(opts: {
  websiteId: string;
  runId: string;
  changeSetId: string;
  mode: ChangeSetApplyMode;
  notes?: string;
}): Promise<ReviewActionResult> {
  const { accountId, userId, role } = await getTenantAndRole(opts.websiteId);
  const requiredRole = roleForApplyMode(opts.mode);
  if (!hasGrowthRole(role, requiredRole)) {
    return {
      ok: false,
      message: `Forbidden: ${requiredRole} role required.`,
    };
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: row, error: loadErr } = await admin
    .from("growth_agent_change_sets")
    .select(
      "id, account_id, website_id, locale, market, run_id, source_table, source_id, agent_lane, change_type, status, title, evidence, risk_level",
    )
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .eq("id", opts.changeSetId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, message: "Change set not found in this tenant." };
  }

  const changeSet = row as {
    id: string;
    locale: string;
    market: string;
    run_id: string;
    source_table: string | null;
    source_id: string | null;
    agent_lane: string;
    change_type: string;
    status: string;
    title: string;
    evidence: Record<string, unknown> | null;
    risk_level: string;
  };

  if (changeSet.status !== "approved" && changeSet.status !== "applied") {
    return {
      ok: false,
      message: "Change set must be approved before apply/publish.",
    };
  }
  if (opts.mode === "published" && changeSet.status !== "applied") {
    return {
      ok: false,
      message: "Change set must be applied before publish.",
    };
  }
  if (
    opts.mode === "published" &&
    ["content_publish", "transcreation_merge", "paid_mutation"].includes(
      changeSet.change_type,
    )
  ) {
    return {
      ok: false,
      message:
        "This change type needs its dedicated publish/merge/paid workflow, not the Workboard closeout button.",
    };
  }

  const now = new Date().toISOString();
  const existingEvidence =
    changeSet.evidence &&
    typeof changeSet.evidence === "object" &&
    !Array.isArray(changeSet.evidence)
      ? changeSet.evidence
      : {};
  const updatePayload =
    opts.mode === "published"
      ? {
          status: "published",
          published_by: userId,
          published_at: now,
        }
      : {
          status: "applied",
          applied_by: userId,
          applied_at: now,
        };

  const { error: updateErr } = await admin
    .from("growth_agent_change_sets")
    .update({
      ...updatePayload,
      evidence: {
        ...existingEvidence,
        human_apply: {
          mode: opts.mode,
          applied_by: userId,
          role,
          applied_at: now,
          notes: opts.notes ?? null,
          ui_closeout_only: true,
          real_surface_mutation:
            opts.mode === "published"
              ? "Recorded as published after external human confirmation."
              : "Recorded as applied after external human confirmation.",
        },
      },
      updated_at: now,
    })
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .eq("id", opts.changeSetId);

  if (updateErr) {
    return { ok: false, message: `Could not mark change set ${opts.mode}.` };
  }

  const sourceForeignKeys = {
    backlog_item_id:
      changeSet.source_table === "growth_backlog_items"
        ? changeSet.source_id
        : null,
    task_id:
      changeSet.source_table === "growth_content_tasks"
        ? changeSet.source_id
        : null,
  };

  await admin.from("growth_human_reviews").insert({
    account_id: accountId,
    website_id: opts.websiteId,
    ...sourceForeignKeys,
    review_key: `change-set:${opts.changeSetId}:${opts.mode}:${Date.now()}`,
    reviewer_role: role,
    decision: opts.mode === "published" ? "approve" : "approve",
    status: "recorded",
    rationale: opts.notes ?? null,
    evidence: {
      run_id: opts.runId,
      reviewer_id: userId,
      change_set_id: opts.changeSetId,
      change_type: changeSet.change_type,
      agent_lane: changeSet.agent_lane,
      apply_mode: opts.mode,
      title: changeSet.title,
      ui_closeout_only: true,
    },
  });

  await admin.from("growth_agent_run_events").insert({
    account_id: accountId,
    website_id: opts.websiteId,
    locale: changeSet.locale,
    market: changeSet.market,
    run_id: opts.runId,
    event_type: "completed",
    severity: "info",
    message:
      opts.mode === "published"
        ? "Human marked an approved change set as published."
        : "Human marked an approved change set as applied.",
    payload: {
      change_set_id: opts.changeSetId,
      change_type: changeSet.change_type,
      apply_mode: opts.mode,
      reviewer_id: userId,
      reviewer_role: role,
      notes: opts.notes ?? null,
    },
    occurred_at: now,
  });

  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs/${opts.runId}`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/workboard`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/backlog`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/overview`);
  return {
    ok: true,
    message: `Change set marked ${opts.mode}.`,
  };
}

async function changeSetAction(
  formData: FormData,
  decision: ChangeSetDecision,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const changeSetId = String(formData.get("changeSetId") ?? "");
  const notes = formData.get("notes");
  if (!websiteId || !runId || !changeSetId) return;
  await reviewChangeSet({
    websiteId,
    runId,
    changeSetId,
    decision,
    notes: typeof notes === "string" && notes.length > 0 ? notes : undefined,
  });
}

async function changeSetApplyAction(
  formData: FormData,
  mode: ChangeSetApplyMode,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const changeSetId = String(formData.get("changeSetId") ?? "");
  const notes = formData.get("notes");
  if (!websiteId || !runId || !changeSetId) return;
  await applyOrPublishChangeSet({
    websiteId,
    runId,
    changeSetId,
    mode,
    notes: typeof notes === "string" && notes.length > 0 ? notes : undefined,
  });
}

function isLowRiskWorkboardApproval(card: {
  column: string;
  risk: string | null;
  runId: string | null;
  changeSetId: string | null;
  autonomyLabel: string;
  toolCallSummary: { blocked: number };
}) {
  return (
    card.column === "review_needed" &&
    card.risk === "low" &&
    Boolean(card.runId) &&
    Boolean(card.changeSetId) &&
    card.autonomyLabel !== "bloqueado" &&
    card.toolCallSummary.blocked === 0
  );
}

export async function approveLowRiskWorkboardItems(
  formData: FormData,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!websiteId) return;

  const { accountId, role } = await getTenantAndRole(websiteId);
  if (!hasGrowthRole(role, "curator")) return;

  const workboard = await getGrowthWorkboard({
    accountId,
    websiteId,
    limit: 90,
  });

  const eligible = workboard.cards
    .filter(isLowRiskWorkboardApproval)
    .slice(0, 25);

  for (const card of eligible) {
    if (!card.runId || !card.changeSetId) continue;
    await reviewChangeSet({
      websiteId,
      runId: card.runId,
      changeSetId: card.changeSetId,
      decision: "approve",
      notes:
        "Aprobación en lote desde Workboard: riesgo bajo, sin herramientas bloqueadas y sin mutación pública.",
    });
  }

  revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
  revalidatePath(`/dashboard/${websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${websiteId}/growth/backlog`);
}

export async function markStaleWorkboardRunsStalled(
  formData: FormData,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!websiteId) return;

  const { accountId, role } = await getTenantAndRole(websiteId);
  if (!hasGrowthRole(role, "curator")) return;

  const admin = createSupabaseServiceRoleClient();
  const staleBefore = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("growth_agent_runs")
    .select("run_id, locale, market, status")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .in("status", ["running", "claimed"])
    .lt("updated_at", staleBefore)
    .limit(50);

  if (error || !rows?.length) {
    revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
    return;
  }

  const now = new Date().toISOString();
  const runIds = rows.map((row) => String(row.run_id));
  await admin
    .from("growth_agent_runs")
    .update({
      status: "stalled",
      finished_at: now,
      heartbeat_at: now,
      error_class: "runtime_stalled",
      error_message:
        "Marked stalled from Workboard after no update for more than 1 hour.",
      updated_at: now,
    })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .in("run_id", runIds);

  await admin.from("growth_agent_run_events").insert(
    rows.map((row) => ({
      account_id: accountId,
      website_id: websiteId,
      locale: String(row.locale ?? "es-CO"),
      market: String(row.market ?? "CO"),
      run_id: String(row.run_id),
      event_type: "stalled",
      severity: "warn",
      message:
        "Workboard marked this run as stalled after stale running/claimed status.",
      payload: {
        previous_status: row.status,
        stale_before: staleBefore,
        source: "growth_workboard_debug",
      },
      occurred_at: now,
    })),
  );

  revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
  revalidatePath(`/dashboard/${websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${websiteId}/growth/data-health`);
}

export async function approveRun(formData: FormData): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  if (!websiteId || !runId) return;
  await writeHumanReview({ websiteId, runId, decision: "approve" });
}

export async function rejectRun(formData: FormData): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const notes = formData.get("notes");
  if (!websiteId || !runId) return;
  await writeHumanReview({
    websiteId,
    runId,
    decision: "reject",
    notes: typeof notes === "string" && notes.length > 0 ? notes : undefined,
  });
}

export async function approveMemoryCandidate(
  formData: FormData,
): Promise<void> {
  await candidateAction(formData, "memory", "approve");
}

export async function rejectMemoryCandidate(formData: FormData): Promise<void> {
  await candidateAction(formData, "memory", "reject");
}

export async function approveSkillCandidate(formData: FormData): Promise<void> {
  await candidateAction(formData, "skill", "approve");
}

export async function rejectSkillCandidate(formData: FormData): Promise<void> {
  await candidateAction(formData, "skill", "reject");
}

export async function activateReplayCandidate(
  formData: FormData,
): Promise<void> {
  await candidateAction(formData, "replay", "approve");
}

export async function rejectReplayCandidate(formData: FormData): Promise<void> {
  await candidateAction(formData, "replay", "reject");
}

export async function approveChangeSet(formData: FormData): Promise<void> {
  await changeSetAction(formData, "approve");
}

export async function rejectChangeSet(formData: FormData): Promise<void> {
  await changeSetAction(formData, "reject");
}

export async function markChangeSetApplied(formData: FormData): Promise<void> {
  await changeSetApplyAction(formData, "applied");
}

export async function markChangeSetPublished(
  formData: FormData,
): Promise<void> {
  await changeSetApplyAction(formData, "published");
}

export async function downloadArtifactAction(
  formData: FormData,
): Promise<void> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  if (!websiteId || !runId) return;
  const result = await getArtifactSignedUrl(websiteId, runId);
  if (result.ok && result.url) {
    // next/navigation redirect inside a server action triggers a 303 to the
    // signed URL — browser download starts there. Import lazily to avoid
    // circular module load.
    const { redirect } = await import("next/navigation");
    redirect(result.url);
  }
}
