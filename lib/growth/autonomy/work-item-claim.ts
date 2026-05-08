import { randomUUID } from "crypto";

import type { AgentLane } from "@bukeer/website-contract";

interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export async function claimGrowthWorkItem({
  supabase,
  accountId,
  websiteId,
  lane,
  workspacePath,
  claimId = randomUUID(),
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  workspacePath: string;
  claimId?: string;
  now?: Date;
}) {
  const timestamp = now.toISOString();
  const { data: workItems, error: selectError } = await supabase
    .from("growth_work_items")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .eq("status", "ready")
    .order("updated_at", { ascending: true })
    .limit(1);

  if (selectError) throw new Error(selectError.message);
  const workItem = Array.isArray(workItems) ? workItems[0] : workItems;
  if (!workItem?.id) return { claimed: false as const, reason: "no_ready_work_items" };

  const { data: runs, error: runError } = await supabase
    .from("growth_agent_runs")
    .insert({
      account_id: accountId,
      website_id: websiteId,
      locale: workItem.evidence?.locale ?? "es-CO",
      market: workItem.evidence?.market ?? "CO",
      agent_id: workItem.evidence?.agent_id ?? null,
      lane,
      source_table: "growth_work_items",
      source_id: workItem.id,
      claim_id: claimId,
      workspace_path: workspacePath,
      status: "claimed",
      heartbeat_at: timestamp,
      attempts: 0,
      evidence: {
        claim_source: "growth_work_items",
        work_item_id: workItem.id,
        candidate_id: workItem.evidence?.candidate_id ?? null,
      },
    })
    .select("*")
    .limit(1);

  if (runError) throw new Error(runError.message);
  const run = Array.isArray(runs) ? runs[0] : runs;
  if (!run?.run_id) throw new Error("claim inserted no run row");

  const { error: updateError } = await supabase
    .from("growth_work_items")
    .update({
      status: "running",
      run_id: run.run_id,
      claimed_at: timestamp,
      progress_label: "Runtime claimed",
      updated_at: timestamp,
    })
    .eq("id", workItem.id)
    .eq("status", "ready");
  if (updateError) throw new Error(updateError.message);

  return { claimed: true as const, workItem, run };
}
