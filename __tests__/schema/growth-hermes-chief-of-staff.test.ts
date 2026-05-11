import {
  GrowthAgentContextManifestInsertSchema,
  GrowthAgentArtifactInsertSchema,
  GrowthAgentInstanceInsertSchema,
  GrowthChiefOfStaffActionInsertSchema,
  GrowthChiefOfStaffMessageInsertSchema,
  GrowthChiefOfStaffSessionInsertSchema,
} from "@bukeer/website-contract";

const accountId = "9fc24733-b127-4184-aa22-12f03b98927a";
const websiteId = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const userId = "00000000-0000-4000-8000-000000000001";

describe("Growth OS Hermes Chief of Staff contracts", () => {
  it("validates the conversation session/message/action insert chain", () => {
    const session = GrowthChiefOfStaffSessionInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      user_id: userId,
      title: "Growth Chief of Staff",
      metadata: { source: "test" },
    });
    expect(session.session_mode).toBe("chief_of_staff");
    expect(session.status).toBe("active");

    const message = GrowthChiefOfStaffMessageInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      session_id: "00000000-0000-4000-8000-000000000002",
      role: "assistant",
      content: "Resumen con citas.",
      cited_refs: ["growth_runtime_cycles:cycle-1"],
      metadata: {},
    });
    expect(message.token_estimate).toBe(0);

    const action = GrowthChiefOfStaffActionInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      session_id: "00000000-0000-4000-8000-000000000002",
      requested_by: userId,
      intent: "Invoke brain now",
      action_class: "enqueue_wakeup",
      policy_verdict: { allowed: true },
      request_payload: {},
      result_payload: {},
      created_refs: [],
    });
    expect(action.status).toBe("proposed");
  });

  it("keeps agent instances editable while enforcing sane budgets", () => {
    expect(() =>
      GrowthAgentInstanceInsertSchema.parse({
        account_id: accountId,
        website_id: websiteId,
        agent_type: "technical_remediation",
        lane: "technical_remediation",
        display_name: "Technical Remediation Agent",
        model_provider: "openrouter",
        model_name: "openai/gpt-5",
        max_cost_daily_usd: 50,
        max_cost_weekly_usd: 10,
        wakeup_policy: {},
        active_skill_ids: [],
        active_memory_ids: [],
        toolset_allowlist: ["supabase_read", "safe_apply_request"],
        notification_preferences: {},
        editable_config: {},
        immutable_safety_bounds: { mutation_boundary: "executor_only" },
      }),
    ).toThrow(/Weekly budget/);
  });

  it("validates artifact lineage and idempotency", () => {
    const artifact = GrowthAgentArtifactInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      artifact_type: "safe_apply_patch",
      payload: { patch: { seo_title: "New title" } },
      quality_review: {},
      provider_evidence_reads: [{ table: "growth_profile_runs", id: "profile-1" }],
      memory_reads: [],
      skill_reads: [],
      risk_assessment: { risk: "low" },
      manifest_citation_verdict: { allowed: true },
      validation_errors: [],
      idempotency_key: "test:safe-apply:artifact-1",
    });
    expect(artifact.status).toBe("draft");
    expect(artifact.provider_evidence_reads).toHaveLength(1);
  });

  it("validates strict per-agent context manifests", () => {
    const manifest = GrowthAgentContextManifestInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      agent_instance_id: "00000000-0000-4000-8000-000000000011",
      task_session_id: "00000000-0000-4000-8000-000000000012",
      context_snapshot_id: "00000000-0000-4000-8000-000000000013",
      lane: "technical_remediation",
      autonomy_level: "A2",
      context_hash: "fnv1a32:12345678",
      model_provider: "openrouter",
      model_name: "openai/gpt-5",
      toolset_allowed: ["provider_profiles", "safe_apply_artifacts"],
      skill_ids_injected: ["00000000-0000-4000-8000-000000000014"],
      memory_ids_injected: ["00000000-0000-4000-8000-000000000015"],
      global_memory_ids_injected: [],
      excluded_skill_ids: ["00000000-0000-4000-8000-000000000016"],
      excluded_memory_ids: [],
      provider_source_refs: ["growth_profile_runs:run-1"],
      outcome_refs: ["growth_work_item_outcomes:outcome-1"],
      policy_refs: ["growth_autonomy_policies:policy-1"],
      budget_snapshot: { max_cost_daily_usd: 10 },
      injection_scan: { blocked: false },
      isolation_verdict: {
        allowed: true,
        tenant_scoped: true,
        lane_scoped: true,
      },
      manifest_payload: {
        context_version: "hermes-agent-context-isolation-v1",
      },
    });
    expect(manifest.status).toBe("active");
    expect(manifest.autonomy_level).toBe("A2");
    expect(manifest.skill_ids_injected).toHaveLength(1);
  });
});
