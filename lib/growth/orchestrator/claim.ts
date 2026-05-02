/**
 * Claim-next-eligible-row primitive for the Symphony Orchestrator.
 *
 * Each invocation tries to lease a single eligible source row for the given
 * `(account_id, website_id, lane)` triple, insert a `growth_agent_runs` row
 * in `claimed` state, and emit the matching `claimed` event.
 *
 * The authoritative claim happens via a Postgres RPC that runs
 * `SELECT … FOR UPDATE SKIP LOCKED` against the lane-specific source table
 * inside a transaction, then inserts into `growth_agent_runs` with
 * `claim_id` as the idempotency key (ADR-018). The RPC migration ships with
 * #403; until it lands locally this scaffold calls the RPC by name and
 * tolerates a `function does not exist` error on the dev DB.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Orchestration Flow"
 *   - ADR-003 / ADR-009 (tenant scoping)
 *   - ADR-018 (idempotent claims)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentLane, GrowthAgentRun } from "@bukeer/website-contract";

import { asTyped } from "@/lib/supabase/typed-client";
import { checkConcurrency } from "./concurrency";
import { assertTenantScope } from "./tenant-guard";
import type { ConcurrencyCaps } from "./types";

export interface ClaimNextEligibleRowOptions {
  supabase: SupabaseClient;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  /** Idempotency key — same value across retries of the same logical claim. */
  claimId: string;
  workspacePath: string;
  /**
   * Concurrency caps. Optional — if omitted, the pre-check is skipped and the
   * RPC's `for update skip locked` becomes the only protection.
   */
  caps?: ConcurrencyCaps;
}

export type ClaimNextEligibleRowResult =
  | { run: GrowthAgentRun }
  | { reason: "no_eligible_rows" | "concurrency_full"; detail?: string };

/**
 * Try to claim one eligible row for `lane` within the given tenant.
 *
 * Returns either the freshly inserted `growth_agent_runs` row, or a reason
 * object explaining why we did not claim. The orchestrator's main loop is
 * expected to handle both branches without throwing.
 */
export async function claimNextEligibleRow(
  opts: ClaimNextEligibleRowOptions,
): Promise<ClaimNextEligibleRowResult> {
  const { supabase, accountId, websiteId, lane, claimId, workspacePath, caps } =
    opts;

  // 1. Pre-check three-layer concurrency. The RPC will re-validate inside the
  // transaction; this just avoids the round-trip when we know we are full.
  if (caps) {
    const cc = await checkConcurrency({
      supabase,
      account_id: accountId,
      website_id: websiteId,
      lane,
      caps,
    });
    if (!cc.allowed) {
      return {
        reason: "concurrency_full",
        detail: `level=${cc.level} counts=${JSON.stringify(cc.counts)}`,
      };
    }
  }

  // 2. Call the claim RPC. Contract (defined in #403 migration):
  //   claim_growth_agent_run(
  //     p_account_id uuid,
  //     p_website_id uuid,
  //     p_lane text,
  //     p_claim_id uuid,
  //     p_workspace_path text
  //   ) returns growth_agent_runs (one row, or zero rows when no eligible source row)
  //
  // The function is responsible for the `SELECT … FOR UPDATE SKIP LOCKED`
  // against the per-lane source table and for inserting into
  // `growth_agent_runs` with `claim_id` as a unique key (idempotency).
  const { data, error } = await asTyped(supabase).rpc(
    "claim_growth_agent_run",
    {
      p_account_id: accountId,
      p_website_id: websiteId,
      p_lane: lane,
      p_claim_id: claimId,
      p_workspace_path: workspacePath,
    },
  );

  if (error) {
    throw new Error(
      `[orchestrator] claim RPC failed (lane=${lane}, claim_id=${claimId}): ${error.message}`,
    );
  }

  // RPC returns either a single row, an array with one row, or null/[] when
  // there's nothing to claim. Normalize.
  const claimedRow = Array.isArray(data) ? data[0] : data;
  if (!claimedRow) {
    return { reason: "no_eligible_rows" };
  }

  const run = claimedRow as GrowthAgentRun;

  // 3. Defence-in-depth: re-assert tenant scope before any further work.
  assertTenantScope(
    { account_id: accountId, website_id: websiteId },
    { account_id: run.account_id, website_id: run.website_id },
  );

  return { run };
}
