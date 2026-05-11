import { createHash } from "crypto";

import {
  buildClarityAggregatePlan,
  runClarityAggregateProfile,
} from "@/lib/growth/clarity-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { SupabaseLike } from "@/lib/growth/autonomy/runtime-common";

export interface RunClarityUxFrictionProfileOptions {
  supabase?: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: string;
  numOfDays?: number;
  dimensions?: string[];
  dryRun?: boolean;
  now?: Date;
}

export interface RunClarityUxFrictionProfileResult {
  profileRunId: string | null;
  status: "success" | "failed" | "planned";
  runStatus: "completed" | "failed" | "planned";
  rowCount: number;
  freshnessStatus: "PASS" | "BLOCKED" | "WATCH";
  qualityStatus: "PASS" | "BLOCKED" | "WATCH";
  evidenceFingerprint: string;
  source: "live" | "mock";
  error: string | null;
}

function fingerprint(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function runClarityUxFrictionProfile({
  supabase,
  accountId,
  websiteId,
  locale = "es-CO",
  market = "CO",
  numOfDays = 1,
  dimensions = ["url", "device", "source"],
  dryRun = false,
  now = new Date(),
}: RunClarityUxFrictionProfileOptions): Promise<RunClarityUxFrictionProfileResult> {
  const admin = supabase ?? createSupabaseServiceRoleClient();
  const startedAt = now.toISOString();
  const windowEnd = now.toISOString();
  const windowStart = new Date(now.getTime() - numOfDays * 86_400_000).toISOString();
  const runId = `clarity_ux_friction_v1:${isoDate(now)}`;
  const idempotencyKey = `profile-run:clarity:ux-friction:${isoDate(now)}`;

  try {
    const plan = buildClarityAggregatePlan({
      account_id: accountId,
      website_id: websiteId,
      numOfDays,
      dimensions,
      dryRun,
    });
    const result = await runClarityAggregateProfile(plan);
    const evidenceFingerprint = fingerprint({
      provider: "clarity",
      profile_id: "clarity_ux_friction_v1",
      dimensions,
      rows: result.rows,
      window_start: windowStart,
      window_end: windowEnd,
    });
    const row = {
      account_id: accountId,
      website_id: websiteId,
      locale,
      market,
      provider: "clarity",
      provider_family: "tracking",
      provider_account_id: process.env.CLARITY_PROJECT_ID ?? null,
      profile_id: "clarity_ux_friction_v1",
      run_id: runId,
      cadence: "daily",
      status: result.source === "live" ? "success" : "success",
      run_status: "completed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      window_start: windowStart,
      window_end: windowEnd,
      observed_at: new Date().toISOString(),
      row_count: result.rows.length,
      cost: 0,
      cost_usd: 0,
      currency: "USD",
      freshness_status: "PASS",
      quality_status: "PASS",
      artifact_path: "supabase:growth_profile_runs:clarity_ux_friction_v1",
      source_refs: [
        {
          provider: "clarity",
          endpoint: result.plan.endpoint,
          dimensions: result.plan.query.dimensions,
          source: result.source,
        },
      ],
      evidence: {
        source: result.source,
        row_count: result.rows.length,
        fingerprint: evidenceFingerprint,
      },
      evidence_fingerprint: evidenceFingerprint,
      entity_key: "website:colombiatours:ux_friction",
      action_key: "ux_friction_profile:aggregate:url_device_source",
      approval: {
        mode: "automatic_read_only",
        required: false,
      },
      circuit_breaker: {
        status: "healthy",
        failure_count: 0,
      },
      error: null,
      idempotency_key: idempotencyKey,
    };

    if (dryRun) {
      return {
        profileRunId: null,
        status: "planned",
        runStatus: "planned",
        rowCount: result.rows.length,
        freshnessStatus: "WATCH",
        qualityStatus: "WATCH",
        evidenceFingerprint,
        source: result.source,
        error: null,
      };
    }

    const { data, error } = await admin
      .from("growth_profile_runs")
      .upsert(row, { onConflict: "website_id,idempotency_key" })
      .select("id")
      .limit(1);
    if (error) throw error;
    const inserted = Array.isArray(data) ? data[0] : data;

    return {
      profileRunId: typeof inserted?.id === "string" ? inserted.id : null,
      status: "success",
      runStatus: "completed",
      rowCount: result.rows.length,
      freshnessStatus: "PASS",
      qualityStatus: "PASS",
      evidenceFingerprint,
      source: result.source,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const evidenceFingerprint = fingerprint({
      provider: "clarity",
      profile_id: "clarity_ux_friction_v1",
      error: message,
      window_start: windowStart,
      window_end: windowEnd,
    });
    if (!dryRun) {
      await admin.from("growth_profile_runs").upsert(
        {
          account_id: accountId,
          website_id: websiteId,
          locale,
          market,
          provider: "clarity",
          provider_family: "tracking",
          provider_account_id: process.env.CLARITY_PROJECT_ID ?? null,
          profile_id: "clarity_ux_friction_v1",
          run_id: runId,
          cadence: "daily",
          status: "failed",
          run_status: "failed",
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          window_start: windowStart,
          window_end: windowEnd,
          observed_at: new Date().toISOString(),
          row_count: 0,
          cost: 0,
          cost_usd: 0,
          currency: "USD",
          freshness_status: "BLOCKED",
          quality_status: "BLOCKED",
          source_refs: [{ provider: "clarity", source: "live_failed" }],
          evidence: { source: "live_failed", error: message },
          evidence_fingerprint: evidenceFingerprint,
          entity_key: "website:colombiatours:ux_friction",
          action_key: "ux_friction_profile:aggregate:url_device_source",
          approval: { mode: "automatic_read_only", required: false },
          circuit_breaker: {
            status: "open",
            failure_count: 1,
            last_error_class: "UPSTREAM_ERROR",
          },
          error: message,
          idempotency_key: idempotencyKey,
        },
        { onConflict: "website_id,idempotency_key" },
      );
    }
    return {
      profileRunId: null,
      status: "failed",
      runStatus: "failed",
      rowCount: 0,
      freshnessStatus: "BLOCKED",
      qualityStatus: "BLOCKED",
      evidenceFingerprint,
      source: "mock",
      error: message,
    };
  }
}
