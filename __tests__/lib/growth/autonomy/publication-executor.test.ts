import {
  executeGrowthPublicationJob,
  type PublicationExecutionPlan,
} from "@/lib/growth/autonomy/publication-executor";

type Operation = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
};

class QueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private selectedId = crypto.randomUUID();

  constructor(
    private readonly ops: Operation[],
    private readonly table: string,
    private readonly action: string,
    private readonly payload?: unknown,
  ) {}

  select() {
    return this;
  }

  limit() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  then(
    resolve: (value: { data: unknown[]; error: null }) => void,
    reject: (reason?: unknown) => void,
  ) {
    this.ops.push({
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: this.filters,
    });
    return Promise.resolve({
      data: [{ id: this.selectedId, target_id: "44444444-4444-4444-8444-444444444444" }],
      error: null,
    }).then(resolve, reject);
  }
}

function fakeSupabase(ops: Operation[]) {
  return {
    from(table: string) {
      return {
        upsert(payload: unknown) {
          return new QueryBuilder(ops, table, "upsert", payload);
        },
        insert(payload: unknown) {
          return new QueryBuilder(ops, table, "insert", payload);
        },
        update(payload: unknown) {
          return new QueryBuilder(ops, table, "update", payload);
        },
        delete() {
          return new QueryBuilder(ops, table, "delete");
        },
      };
    },
  };
}

function livePlan(smokePass: boolean): PublicationExecutionPlan {
  return {
    job: {
      account_id: "11111111-1111-4111-8111-111111111111",
      website_id: "22222222-2222-4222-8222-222222222222",
      locale: "es-CO",
      market: "CO",
      work_item_id: "33333333-3333-4333-8333-333333333333",
      change_set_id: "55555555-5555-4555-8555-555555555555",
      policy_id: "66666666-6666-4666-8666-666666666666",
      lane: "content_creator",
      action_class: "content_publish",
      job_mode: "live",
      status: "queued",
      target_table: "website_blog_posts",
      target_id: null,
      target_path: "/blog/colombia-guide",
      idempotency_key: "publication-job-colombia-guide-v1",
      before_snapshot: { existed: false },
      after_payload: {
        insert_or_update: {
          slug: "colombia-guide",
          title: "Colombia guide",
          ai_generated: true,
        },
      },
      smoke_result: {},
      rollback_payload: {
        table: "website_blog_posts",
        delete_created_slug: "colombia-guide",
      },
      baseline: { organic_clicks: 0 },
      success_metric: "organic_clicks:/blog/colombia-guide",
      evaluation_date: "2026-05-29",
      evidence: { source: "test" },
      created_by: "growth_runtime",
      applied_at: null,
      smoke_checked_at: null,
      rolled_back_at: null,
    },
    outcomes: [
      {
        account_id: "11111111-1111-4111-8111-111111111111",
        website_id: "22222222-2222-4222-8222-222222222222",
        locale: "es-CO",
        market: "CO",
        work_item_id: "33333333-3333-4333-8333-333333333333",
        change_set_id: "55555555-5555-4555-8555-555555555555",
        outcome_type: "seo_content",
        status: "scheduled",
        success_metric: "organic_clicks:/blog/colombia-guide",
        baseline: { organic_clicks: 0 },
        current_result: {},
        evaluation_window: "day_21",
        evaluation_date: "2026-05-29",
        funnel_attribution_status: "pending",
        attribution_evidence: {},
        evaluated_at: null,
      },
    ],
    smoke: {
      pass: smokePass,
      checks: ["route_revalidates"],
      failures: smokePass ? [] : ["route_500"],
    },
  };
}

describe("executeGrowthPublicationJob", () => {
  it("applies live content, records outcomes and marks the work item measuring", async () => {
    const ops: Operation[] = [];
    const result = await executeGrowthPublicationJob({
      supabase: fakeSupabase(ops),
      plan: livePlan(true),
    });

    expect(result.status).toBe("smoke_passed");
    expect(result.applied).toBe(true);
    expect(ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "website_blog_posts", action: "insert" }),
        expect.objectContaining({
          table: "growth_work_item_outcomes",
          action: "upsert",
        }),
        expect.objectContaining({
          table: "growth_work_items",
          action: "update",
          payload: expect.objectContaining({ status: "published_applied" }),
        }),
      ]),
    );
  });

  it("rolls back immediately when smoke fails", async () => {
    const ops: Operation[] = [];
    const result = await executeGrowthPublicationJob({
      supabase: fakeSupabase(ops),
      plan: livePlan(false),
    });

    expect(result.status).toBe("rolled_back");
    expect(result.rolledBack).toBe(true);
    expect(ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "website_blog_posts", action: "delete" }),
        expect.objectContaining({
          table: "growth_work_items",
          action: "update",
          payload: expect.objectContaining({ status: "blocked" }),
        }),
      ]),
    );
  });
});
