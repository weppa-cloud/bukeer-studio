"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
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
