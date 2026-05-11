import { materializeBrainDecision } from "@/lib/growth/agentic/decision-materializer";

const decisionBase = {
  id: "55555555-5555-4555-8555-555555555555",
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
  cycle_id: null,
  wakeup_request_id: null,
  context_snapshot_id: "33333333-3333-4333-8333-333333333333",
  objective: "Grow qualified trip requests.",
  north_star_alignment: "Organic work only.",
  decision_type: "create_work",
  observed_signals: [],
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
  created_at: "2026-05-09T00:00:00.000Z",
};

function candidate(evidence: Record<string, unknown>) {
  return {
    candidate_type: "keyword_gap",
    lane: "content_creator",
    allowed_action_class: "content_publish",
    title: "Create DataForSEO-backed article",
    summary: "SERP and Labs evidence supports content.",
    confidence: 0.8,
    impact_score: 70,
    urgency_score: 60,
    cost_score: 40,
    risk_score: 40,
    total_score: 70,
    required_profile_types: ["business", "buyer", "seo_market"],
    source_signal_fact_ids: [],
    success_metric: "organic_clicks",
    evaluation_window: "day_21",
    profile_snapshot: {},
    evidence: {
      target: { target_table: "website_blog_posts", target_path: "/blog/test" },
      rollback_expectation: { strategy: "delete_created_content" },
      baseline: { organic_clicks: 0 },
      ...evidence,
    },
    idempotency_key: "brain-provider:content:test",
  };
}

function blockedSupabase() {
  return {
    updates: [] as unknown[],
    from() {
      return {
        update: (payload: unknown) => {
          this.updates.push(payload);
          return {
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        },
      };
    },
  };
}

function correlationSupabase() {
  const updates: unknown[] = [];
  const workItemId = "44444444-4444-4444-8444-444444444444";
  const selectRows = (data: unknown[]) => {
    const query = {
      eq: () => query,
      in: () => query,
      order: () => query,
      limit: () => Promise.resolve({ data, error: null }),
    };
    return query;
  };
  return {
    updates,
    from(table: string) {
      if (table === "growth_work_items") {
        return {
          select: () =>
            selectRows([
              {
                id: workItemId,
                status: "published_applied",
                allowed_action_class: "content_publish",
                evidence: {
                  target: {
                    target_table: "website_blog_posts",
                    target_path: "/blog/test",
                  },
                  correlation: {
                    entity_key: "website_blog_posts:/blog/test",
                    action_key:
                      "content_publish:website_blog_posts:/blog/test",
                    correlation_key:
                      `${decisionBase.website_id}:keyword_gap:content_publish:website_blog_posts:/blog/test`,
                    evidence_fingerprint: "sha256:test",
                  },
                },
              },
            ]),
        };
      }
      if (table === "growth_work_item_outcomes") {
        return {
          select: () =>
            selectRows([
              {
                id: "66666666-6666-4666-8666-666666666666",
                work_item_id: workItemId,
                status: "lost",
              },
            ]),
        };
      }
      return {
        update: (payload: unknown) => {
          updates.push(payload);
          return {
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        },
      };
    },
  };
}

describe("materializeBrainDecision provider evidence gate", () => {
  it("blocks provider-dependent candidates without DataForSEO evidence", async () => {
    const supabase = blockedSupabase();
    const result = await materializeBrainDecision({
      supabase: supabase as never,
      decision: {
        ...decisionBase,
        proposed_candidates: [candidate({})],
      } as never,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain(
      "provider_candidate:content_publish:dataforseo_evidence_missing",
    );
    expect(supabase.updates[0]).toMatchObject({
      materialization_status: "blocked",
    });
  });

  it("blocks stale DataForSEO evidence before candidate insert", async () => {
    const supabase = blockedSupabase();
    const result = await materializeBrainDecision({
      supabase: supabase as never,
      decision: {
        ...decisionBase,
        proposed_candidates: [
          candidate({
            dataforseo_evidence: {
              required: true,
              feature_profile: "serp",
              status: "stale",
            },
          }),
        ],
      } as never,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain(
      "provider_candidate:content_publish:dataforseo_stale",
    );
  });

  it("blocks repeated candidates when the same action and target are already active", async () => {
    const supabase = correlationSupabase();
    const result = await materializeBrainDecision({
      supabase: supabase as never,
      decision: {
        ...decisionBase,
        proposed_candidates: [
          candidate({
            dataforseo_evidence: {
              required: true,
              feature_profile: "serp",
              status: "available",
              evidence_fingerprint: "sha256:test",
            },
          }),
        ],
      } as never,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.some((reason) =>
      reason.includes("prior_active_same_entity_action"),
    )).toBe(true);
  });
});
