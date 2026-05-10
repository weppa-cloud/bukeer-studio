import { runGrowthOsProductionCycle } from "@/lib/growth/autonomy/production-cycle";

type Row = Record<string, unknown>;

type Operation = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
};

const ids = {
  accountId: "11111111-1111-4111-8111-111111111111",
  websiteId: "22222222-2222-4222-8222-222222222222",
  workItemId: "33333333-3333-4333-8333-333333333333",
  agentRunId: "44444444-4444-4444-8444-444444444444",
  changeSetId: "55555555-5555-4555-8555-555555555555",
  publicationJobId: "66666666-6666-4666-8666-666666666666",
  targetId: "77777777-7777-4777-8777-777777777777",
  transcreationJobId: "88888888-8888-4888-8888-888888888888",
  localizedVariantId: "99999999-9999-4999-8999-999999999999",
  policyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  cycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  agentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

let nextId = 0;

function generatedId(table: string): string {
  nextId += 1;
  if (table === "growth_runtime_cycles") return ids.cycleId;
  if (table === "growth_agent_runs") return ids.agentRunId;
  if (table === "growth_agent_change_sets") return ids.changeSetId;
  if (table === "growth_publication_jobs") return ids.publicationJobId;
  return `dddddddd-dddd-4ddd-8ddd-${String(nextId).padStart(12, "0")}`;
}

class QueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private inFilters: Array<[string, unknown[]]> = [];
  private lowerBounds: Array<[string, string]> = [];
  private upperBounds: Array<[string, string]> = [];
  private limitCount: number | null = null;
  private countRequested = false;

  constructor(
    private readonly tables: Record<string, Row[]>,
    private readonly ops: Operation[],
    private readonly table: string,
    private readonly action: string,
    private readonly payload?: unknown,
    options?: { count?: string; head?: boolean },
  ) {
    this.countRequested = Boolean(options?.count || options?.head);
  }

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.countRequested ||= Boolean(options?.count || options?.head);
    return this;
  }

  order() {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  gte(column: string, value: string) {
    this.lowerBounds.push([column, value]);
    return this;
  }

  lte(column: string, value: string) {
    this.upperBounds.push([column, value]);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.inFilters.push([column, values]);
    return this;
  }

  private rows() {
    return this.tables[this.table] ?? [];
  }

  private matches(row: Row): boolean {
    return (
      this.filters.every(([column, value]) => row[column] === value) &&
      this.inFilters.every(([column, values]) => values.includes(row[column])) &&
      this.lowerBounds.every(
        ([column, value]) => String(row[column] ?? "") >= value,
      ) &&
      this.upperBounds.every(
        ([column, value]) => String(row[column] ?? "") <= value,
      )
    );
  }

  private selectedRows() {
    const rows = this.rows().filter((row) => this.matches(row));
    return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
  }

  private insertRows(payload: unknown) {
    const rows = Array.isArray(payload) ? payload : [payload];
    const inserted = rows.map((row) => ({
      ...(row as Row),
      id: (row as Row).id ?? generatedId(this.table),
      run_id:
        this.table === "growth_agent_runs"
          ? ((row as Row).run_id ?? ids.agentRunId)
          : (row as Row).run_id,
      created_at: (row as Row).created_at ?? "2026-05-08T12:00:00.000Z",
      updated_at: (row as Row).updated_at ?? "2026-05-08T12:00:00.000Z",
    }));
    this.tables[this.table] ??= [];
    this.tables[this.table].push(...inserted);
    return inserted;
  }

  private updateRows(payload: unknown) {
    const patch = payload as Row;
    const matched = this.rows().filter((row) => this.matches(row));
    for (const row of matched) Object.assign(row, patch);
    return matched;
  }

  then(
    resolve: (value: { data: unknown; error: null; count?: number }) => void,
    reject: (reason?: unknown) => void,
  ) {
    this.ops.push({
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: this.filters,
    });

    let data: unknown = [];
    if (this.action === "select") {
      const rows = this.selectedRows();
      data = this.countRequested ? null : rows;
      return Promise.resolve({ data, error: null, count: rows.length }).then(
        resolve,
        reject,
      );
    }
    if (this.action === "insert" || this.action === "upsert") {
      data = this.insertRows(this.payload);
    }
    if (this.action === "update") {
      data = this.updateRows(this.payload);
    }
    if (this.action === "delete") {
      const keep = this.rows().filter((row) => !this.matches(row));
      const deleted = this.rows().filter((row) => this.matches(row));
      this.tables[this.table] = keep;
      data = deleted;
    }
    return Promise.resolve({ data, error: null }).then(resolve, reject);
  }
}

function fakeSupabase(tables: Record<string, Row[]>, ops: Operation[]) {
  return {
    from(table: string) {
      return {
        select(columns?: string, options?: { count?: string; head?: boolean }) {
          return new QueryBuilder(tables, ops, table, "select", undefined, options);
        },
        insert(payload: unknown) {
          return new QueryBuilder(tables, ops, table, "insert", payload);
        },
        upsert(payload: unknown) {
          return new QueryBuilder(tables, ops, table, "upsert", payload);
        },
        update(payload: unknown) {
          return new QueryBuilder(tables, ops, table, "update", payload);
        },
        delete() {
          return new QueryBuilder(tables, ops, table, "delete");
        },
      };
    },
  };
}

function baseTables(workItem: Row, policy: Row): Record<string, Row[]> {
  return {
    websites: [
      {
        id: ids.websiteId,
        account_id: ids.accountId,
        subdomain: "colombiatours",
        status: "active",
      },
    ],
    growth_signal_facts: [],
    growth_autonomy_policies: [policy],
    growth_work_items: [workItem],
    growth_agent_definitions: [
      {
        account_id: ids.accountId,
        website_id: ids.websiteId,
        lane: workItem.lane,
        agent_id: ids.agentId,
      },
    ],
    growth_runtime_cycles: [],
    growth_profiles: [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        account_id: ids.accountId,
        website_id: ids.websiteId,
        locale: "es-CO",
        market: "CO",
        profile_type: "competitor",
        subject_table: null,
        subject_id: null,
        subject_key: null,
        confidence: 0.72,
        valid_from: "2026-05-08T00:00:00.000Z",
        valid_until: "2026-05-15T00:00:00.000Z",
        payload: {},
      },
    ],
    growth_opportunity_candidates: [],
    growth_agent_runs: [],
    growth_agent_change_sets: [],
    growth_publication_jobs: [],
    growth_work_item_outcomes: [],
    growth_agent_run_metrics: [],
    growth_agent_tool_calls: [],
    growth_agent_skills: [],
    growth_agent_replay_cases: [],
    website_pages: [
      {
        id: ids.targetId,
        website_id: ids.websiteId,
        seo_title: "Old Colombia custom travel page",
        seo_description: "Old description with enough content for rollback.",
      },
    ],
    seo_localized_variants: [
      {
        id: ids.localizedVariantId,
        website_id: ids.websiteId,
        status: "draft",
        meta_title: "Old title",
      },
    ],
  };
}

function policy(lane: string, actionClass: string): Row {
  return {
    id: ids.policyId,
    account_id: ids.accountId,
    website_id: ids.websiteId,
    lane,
    action_class: actionClass,
    enabled: true,
    dry_run_only: false,
    kill_switch_enabled: false,
    max_risk_level: "medium",
    max_risk_score: 60,
    daily_cap: 10,
    weekly_cap: 20,
    required_checks: [
      "before_snapshot",
      "rollback_payload",
      "smoke_check",
      "baseline",
      "success_metric",
      "evaluation_date",
      "no_paid_mutation",
      "technical_reversibility",
    ],
  };
}

function dataForSeoEvidence(featureProfile = "serp"): Row {
  return {
    required: true,
    status: "available",
    feature_profile: featureProfile,
    snapshot: {
      provider: "dataforseo",
      feature_profile: featureProfile,
      access_status: "available",
      endpoint_family: "test/dataforseo",
      row_count: 3,
      evidence_count: 3,
      cache_ids: ["dataforseo-cache-test"],
      fetched_at: "2026-05-08T00:00:00.000Z",
      expires_at: "2026-05-15T00:00:00.000Z",
    },
    evidence_fingerprint: `sha256:test-${featureProfile}`,
  };
}

async function runCycle(
  tables: Record<string, Row[]>,
  ops: Operation[],
  options: { certificationFixtureMode?: boolean } = {},
) {
  nextId = 0;
  return runGrowthOsProductionCycle(ids.accountId, ids.websiteId, {
    supabase: fakeSupabase(tables, ops),
    candidateLimit: 0,
    promotionLimit: 0,
    claimLimitPerLane: 1,
    allowLiveMutation: true,
    certificationFixtureMode: options.certificationFixtureMode,
    triggerSource: "test",
    now: new Date("2026-05-08T12:00:00.000Z"),
  });
}

describe("runGrowthOsProductionCycle adapter bridge", () => {
  it("executes safe_apply through the technical remediation adapter and records the outcome chain", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "technical_remediation",
      status: "ready",
      title: "Fix page metadata",
      allowed_action_class: "safe_apply",
      risk_level: "low",
      risk_score: 20,
      source_id: ids.targetId,
      evidence: {
        dataforseo_evidence: dataForSeoEvidence("onpage"),
        success_metric: "technical_smoke_pass:website_pages:seo_title",
        adapter_input: {
          target_table: "website_pages",
          target_id: ids.targetId,
          before_row: {
            seo_title: "Old Colombia custom travel page",
          },
          patch: {
            seo_title: "Colombia custom travel planned by local experts",
          },
          baseline: {
            changed_fields: ["seo_title"],
            prior_values: { seo_title: "Old Colombia custom travel page" },
          },
        },
      },
    };
    const tables = baseTables(workItem, policy("technical_remediation", "safe_apply"));

    const result = await runCycle(tables, ops);

    expect(result.status).toBe("completed");
    expect(tables.website_pages[0].seo_title).toBe(
      "Colombia custom travel planned by local experts",
    );
    expect(tables.growth_agent_change_sets[0]).toMatchObject({
      id: ids.changeSetId,
      source_id: ids.workItemId,
      status: "applied",
    });
    expect(tables.growth_publication_jobs[0]).toMatchObject({
      id: ids.publicationJobId,
      work_item_id: ids.workItemId,
      change_set_id: ids.changeSetId,
      action_class: "safe_apply",
      status: "smoke_passed",
    });
    expect(tables.growth_work_item_outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          work_item_id: ids.workItemId,
          publication_job_id: ids.publicationJobId,
          change_set_id: ids.changeSetId,
          outcome_type: "technical_seo",
        }),
      ]),
    );
  });

  it("executes transcreation_merge through the transcreation adapter", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "transcreation",
      status: "ready",
      title: "Merge English localized variant",
      allowed_action_class: "transcreation_merge",
      risk_level: "low",
      risk_score: 25,
      evidence: {
        dataforseo_evidence: dataForSeoEvidence("serp"),
        success_metric: "localized_organic_clicks:blog:en-US:guide",
        adapter_input: {
          source_locale: "es-CO",
          target_locale: "en-US",
          transcreation_job_id: ids.transcreationJobId,
          localized_variant_id: ids.localizedVariantId,
          page_type: "blog",
          source_entity_id: ids.targetId,
          before_variant: { meta_title: "Old title", status: "draft" },
          glossary_terms: ["custom trips", "local experts"],
          baseline: {
            source_locale: "es-CO",
            target_locale: "en-US",
            organic_clicks: 0,
          },
          payload: {
            title: "Colombia travel guide for custom trips",
            slug: "colombia-travel-guide-custom-trips",
            meta_title: "Colombia Travel Guide for Custom Trips",
            meta_desc:
              "Explore a Colombia travel guide written for custom trips, local context, and practical route planning across regions.",
            body_overlay_v2: {
              summary: "Localized body overlay for the English market.",
            },
          },
          quality: { score: 0.92, passed: true },
        },
      },
    };
    const tables = baseTables(
      workItem,
      policy("transcreation", "transcreation_merge"),
    );

    const result = await runCycle(tables, ops);

    expect(result.status).toBe("completed");
    expect(tables.seo_localized_variants[0]).toMatchObject({
      id: ids.localizedVariantId,
      status: "applied",
      target_locale: "en-US",
    });
    expect(tables.growth_publication_jobs[0]).toMatchObject({
      work_item_id: ids.workItemId,
      change_set_id: ids.changeSetId,
      action_class: "transcreation_merge",
      target_table: "seo_localized_variants",
      status: "smoke_passed",
    });
    expect(tables.growth_work_item_outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publication_job_id: ids.publicationJobId,
          outcome_type: "seo_content",
          evaluation_window: "day_21",
        }),
      ]),
    );
  });

  it("blocks provider-dependent legacy work items that lack DataForSEO evidence", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "technical_remediation",
      status: "ready",
      title: "Legacy technical fix without provider evidence",
      allowed_action_class: "safe_apply",
      risk_level: "low",
      risk_score: 20,
      source_id: ids.targetId,
      evidence: {
        success_metric: "technical_smoke_pass:website_pages:seo_title",
        adapter_input: {
          target_table: "website_pages",
          target_id: ids.targetId,
          before_row: {
            seo_title: "Old Colombia custom travel page",
          },
          patch: {
            seo_title: "Colombia custom travel planned by local experts",
          },
          baseline: {
            changed_fields: ["seo_title"],
            prior_values: { seo_title: "Old Colombia custom travel page" },
          },
        },
      },
    };
    const tables = baseTables(workItem, policy("technical_remediation", "safe_apply"));

    await runCycle(tables, ops);

    expect(tables.website_pages[0].seo_title).toBe(
      "Old Colombia custom travel page",
    );
    expect(tables.growth_publication_jobs).toHaveLength(0);
    expect(tables.growth_agent_change_sets[0]).toMatchObject({
      status: "blocked",
      requires_human_review: true,
    });
    expect(
      JSON.stringify(tables.growth_agent_change_sets[0].after_snapshot),
    ).toContain("provider_evidence:dataforseo_evidence_missing");
  });

  it("keeps pricing and CRM surfaces hard-blocked before publication jobs execute", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "technical_remediation",
      status: "ready",
      title: "Unsafe pricing mutation",
      allowed_action_class: "safe_apply",
      risk_level: "low",
      risk_score: 20,
      evidence: {
        dataforseo_evidence: dataForSeoEvidence("onpage"),
        adapter_input: {
          target_table: "website_pages",
          target_id: ids.targetId,
          before_row: { seo_title: "Old title", pricing: "100" },
          patch: {
            seo_title: "Colombia travel metadata update",
            pricing: "80",
            crm_owner_id: ids.agentId,
          },
          baseline: {
            changed_fields: ["seo_title", "pricing", "crm_owner_id"],
            prior_values: { seo_title: "Old title", pricing: "100" },
          },
        },
      },
    };
    const tables = baseTables(workItem, policy("technical_remediation", "safe_apply"));

    await runCycle(tables, ops);

    expect(tables.website_pages[0].seo_title).toBe(
      "Old Colombia custom travel page",
    );
    expect(tables.growth_publication_jobs).toHaveLength(0);
    expect(tables.growth_agent_change_sets[0]).toMatchObject({
      status: "blocked",
      requires_human_review: true,
    });
    expect(tables.growth_work_items[0]).toMatchObject({
      status: "blocked",
      progress_label: "Runtime quality gate blocked",
    });
  });

  it("blocks generic content fallback unless certification fixture mode is explicit", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "content_creator",
      status: "ready",
      title: "Publish Colombia guide",
      allowed_action_class: "content_publish",
      risk_level: "low",
      risk_score: 20,
      evidence: {
        dataforseo_evidence: dataForSeoEvidence("labs_keywords"),
        success_metric: "organic_clicks:blog:colombia-cultural-guide",
        baseline: { organic_clicks: 0, impressions: 0 },
        article_slug: "colombia-cultural-guide",
        article: {
          title: "Colombia cultural travel guide for custom trips",
          slug: "colombia-cultural-guide",
          seo_title: "Colombia Cultural Travel Guide for Custom Trips",
          seo_description:
            "Plan a Colombia cultural travel route with local context, practical pacing, and custom trip ideas across regions.",
        },
      },
    };
    const tables = baseTables(workItem, policy("content_creator", "content_publish"));

    await runCycle(tables, ops);

    expect(tables.growth_publication_jobs).toHaveLength(0);
    expect(tables.growth_agent_change_sets[0]).toMatchObject({
      status: "blocked",
      requires_human_review: true,
    });
    expect(tables.growth_agent_change_sets[0].summary).toContain(
      "missing_full_article_payload",
    );
  });

  it("allows generic content fallback only in certification fixture mode", async () => {
    const ops: Operation[] = [];
    const workItem = {
      id: ids.workItemId,
      account_id: ids.accountId,
      website_id: ids.websiteId,
      lane: "content_creator",
      status: "ready",
      title: "Publish certification guide",
      allowed_action_class: "content_publish",
      risk_level: "low",
      risk_score: 20,
      evidence: {
        dataforseo_evidence: dataForSeoEvidence("labs_keywords"),
        success_metric: "organic_clicks:blog:certification-guide",
        baseline: { organic_clicks: 0, impressions: 0 },
        article_slug: "certification-guide",
        article: {
          title: "Certification Colombia cultural travel guide",
          slug: "certification-guide",
          seo_title: "Certification Colombia Cultural Travel Guide",
          seo_description:
            "Plan a Colombia cultural travel route with local context, practical pacing, and custom trip ideas across regions.",
        },
      },
    };
    const tables = baseTables(workItem, policy("content_creator", "content_publish"));

    await runCycle(tables, ops, { certificationFixtureMode: true });

    expect(tables.growth_publication_jobs[0]).toMatchObject({
      action_class: "content_publish",
      status: "smoke_passed",
    });
    expect(tables.website_blog_posts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "certification-guide",
          word_count: expect.any(Number),
        }),
      ]),
    );
  });
});
