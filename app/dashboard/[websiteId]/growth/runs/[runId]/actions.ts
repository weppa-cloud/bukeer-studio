"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { hasGrowthRole, requireGrowthRole } from "@/lib/growth/console/auth";

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
    .select("run_id")
    .eq("account_id", accountId)
    .eq("website_id", opts.websiteId)
    .eq("run_id", opts.runId)
    .maybeSingle();
  if (runErr || !runRow) {
    return { ok: false, message: "Run not found in this tenant." };
  }

  const { error: insertErr } = await supabase
    .from("growth_human_reviews")
    .insert({
      account_id: accountId,
      website_id: opts.websiteId,
      review_key: `agent-run:${opts.runId}:${opts.decision}`,
      reviewer_role: role,
      decision: opts.decision,
      rationale: opts.notes ?? null,
      evidence: {
        run_id: opts.runId,
        reviewer_id: userId,
      },
    });

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

  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs/${opts.runId}`);
  revalidatePath(`/dashboard/${opts.websiteId}/growth/runs`);
  return { ok: true, message: `Run ${opts.decision}.` };
}

type CandidateKind = "memory" | "skill" | "replay";
type CandidateDecision = "approve" | "reject";

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
