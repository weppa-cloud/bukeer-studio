import {
  GrowthAgentWakeupRequestSchema,
  GrowthContextSnapshotSchema,
  GrowthOrchestratorDecisionSchema,
} from "@/packages/website-contract/src/schemas/growth-agentic-orchestrator";

const scope = {
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
};

describe("Growth agentic orchestrator contracts", () => {
  it("validates context snapshots and decision ledgers", () => {
    const context = GrowthContextSnapshotSchema.parse({
      id: "33333333-3333-4333-8333-333333333333",
      ...scope,
      lane: "all",
      wakeup_request_id: null,
      cycle_id: "44444444-4444-4444-8444-444444444444",
      context_version: "agentic-context-v1",
      objective: "Grow qualified trip requests.",
      sanitized_context: { profiles: [], signals: [] },
      source_refs: [],
      injection_scan: { blocked: false, findings: [] },
      token_estimate: 10,
      created_at: "2026-05-08T12:00:00.000Z",
    });

    const decision = GrowthOrchestratorDecisionSchema.parse({
      id: "55555555-5555-4555-8555-555555555555",
      ...scope,
      cycle_id: "44444444-4444-4444-8444-444444444444",
      wakeup_request_id: null,
      context_snapshot_id: context.id,
      objective: "Grow qualified trip requests.",
      north_star_alignment: "Organic content and technical health.",
      decision_type: "create_work",
      observed_signals: [],
      proposed_candidates: [
        {
          candidate_type: "keyword_gap",
          lane: "content_creator",
          allowed_action_class: "content_publish",
          title: "Create autonomous article",
          summary: "Fresh GSC signal supports a new article.",
          confidence: 0.8,
          total_score: 70,
          success_metric: "organic_clicks",
          evaluation_window: "day_21",
          evidence: {
            target: { target_table: "website_blog_posts", target_path: "/blog/test" },
            rollback_expectation: { strategy: "delete_created_content" },
            baseline: { organic_clicks: 0 },
          },
        },
      ],
      proposed_work_items: [],
      delegated_tasks: [],
      blocked_decisions: [],
      memory_reads: [],
      skill_reads: [],
      outcome_references: [],
      policy_recommendations: [],
      risk_assessment: { brain_mutates_public_surface: false },
      confidence: 0.8,
      no_go_reasons: [],
      created_signal_fact_ids: [],
      created_candidate_ids: [],
      created_work_item_ids: [],
      materialization_status: "pending",
      evidence: {},
      created_at: "2026-05-08T12:00:00.000Z",
    });

    expect(decision.context_snapshot_id).toBe(context.id);
  });

  it("rejects create_work decisions without proposed work", () => {
    const parsed = GrowthOrchestratorDecisionSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      ...scope,
      cycle_id: null,
      wakeup_request_id: null,
      context_snapshot_id: "33333333-3333-4333-8333-333333333333",
      objective: "Grow qualified trip requests.",
      north_star_alignment: "Organic content.",
      decision_type: "create_work",
      observed_signals: [],
      proposed_candidates: [],
      proposed_work_items: [],
      delegated_tasks: [],
      blocked_decisions: [],
      memory_reads: [],
      skill_reads: [],
      outcome_references: [],
      policy_recommendations: [],
      risk_assessment: {},
      confidence: 0.8,
      no_go_reasons: [],
      created_signal_fact_ids: [],
      created_candidate_ids: [],
      created_work_item_ids: [],
      materialization_status: "pending",
      evidence: {},
      created_at: "2026-05-08T12:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates wakeup queue rows", () => {
    const wakeup = GrowthAgentWakeupRequestSchema.parse({
      id: "66666666-6666-4666-8666-666666666666",
      ...scope,
      lane: "orchestrator",
      source: "user_on_demand",
      status: "queued",
      priority: 80,
      idempotency_key: "manual-invoke-1",
      coalesced_count: 0,
      payload: { reason: "qa" },
      claimed_at: null,
      completed_at: null,
      run_id: null,
      last_error: null,
      created_at: "2026-05-08T12:00:00.000Z",
      updated_at: "2026-05-08T12:00:00.000Z",
    });

    expect(wakeup.source).toBe("user_on_demand");
  });
});
