import { buildGrowthAgentContext } from "@/lib/growth/agentic/context-builder";

const accountId = "11111111-1111-4111-8111-111111111111";
const websiteId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-05-16T00:00:00.000Z");

function supabaseContextMock(tableData: Record<string, unknown[]> = {}) {
  const calls: Array<{
    table: string;
    columns: string | null;
    filters: Array<[string, unknown]>;
  }> = [];

  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

  return {
    calls,
    inserts,
    from(table: string) {
      const call = {
        table,
        columns: null as string | null,
        filters: [] as Array<[string, unknown]>,
      };
      calls.push(call);

      const respond = (): Promise<{ data: unknown[] | null; error: null }> => {
        if (table in tableData) {
          return Promise.resolve({ data: tableData[table], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      };

      const chain = {
        select(columns: string) {
          call.columns = columns;
          return chain;
        },
        eq(key: string, value: unknown) {
          call.filters.push([key, value]);
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return respond();
        },
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          return {
            select() {
              return {
                limit() {
                  return Promise.resolve({ data: [{ id: "log-uuid" }], error: null });
                },
              };
            },
          };
        },
      };

      return chain;
    },
  };
}

// ===================== Locale validation gates =====================

describe("buildGrowthAgentContext locale validation gates", () => {
  it("BLOCKED when source_locale is missing from wakeup payload", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        locale: "pt-BR",
        persist: false,
        now,
      }),
    ).rejects.toThrow("missing explicit source_locale");
  });

  it("BLOCKED when source_locale is empty string", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        locale: "pt-BR",
        persist: false,
        now,
        wakeup: {
          id: "00000000-0000-4000-8000-000000000002",
          source: "timer" as any,
          priority: 5,
          payload: { source_locale: "", target_locale: "pt-BR", target_market: "BR", source: "" },
        } as any,
      }),
    ).rejects.toThrow("missing explicit source_locale");
  });

  it("BLOCKED when target locale is missing from wakeup payload", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        persist: false,
        now,
        wakeup: {
          id: "00000000-0000-4000-8000-000000000003",
          source: "timer" as any,
          priority: 5,
          payload: { source_locale: "es-CO", source: "timer" },
        } as any,
      }),
    ).rejects.toThrow("missing explicit target locale");
  });

  it("BLOCKED when target market is missing from wakeup payload", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        persist: false,
        now,
        wakeup: {
          id: "00000000-0000-4000-8000-000000000004",
          source: "timer" as any,
          priority: 5,
          payload: { source_locale: "es-CO", target_locale: "pt-BR", source: "timer" },
        } as any,
      }),
    ).rejects.toThrow("missing explicit target market");
  });

  it("BLOCKED on locale/market mismatch (pt-BR/CO)", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        persist: false,
        now,
        wakeup: {
          id: "00000000-0000-4000-8000-000000000005",
          source: "timer" as any,
          priority: 5,
          payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "CO", source: "timer" },
        } as any,
      }),
    ).rejects.toThrow("locale/market mismatch (pt-BR/CO)");
  });

  it("BLOCKED on locale/market mismatch (es-CO/BR)", async () => {
    const supabase = supabaseContextMock();
    await expect(
      buildGrowthAgentContext({
        supabase: supabase as never,
        accountId,
        websiteId,
        persist: false,
        now,
        wakeup: {
          id: "00000000-0000-4000-8000-000000000006",
          source: "timer" as any,
          priority: 5,
          payload: { source_locale: "es-CO", target_locale: "es-CO", target_market: "BR", source: "timer" },
        } as any,
      }),
    ).rejects.toThrow("locale/market mismatch (es-CO/BR)");
  });

  it("ALLOWS OTHER market for any locale (cross-market alignment)", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000009",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "OTHER", source: "timer" },
      } as any,
    });
    expect(bundle.context.market).toBe("OTHER");
    expect(bundle.context.locale).toBe("pt-BR");
  });
});

// ===================== Plan objective resolution =====================

describe("resolvePlanObjective (via buildGrowthAgentContext)", () => {
  it("falls back to DEFAULT_OBJECTIVE when growth_account_plans has no active rows", async () => {
    const supabase = supabaseContextMock({ growth_account_plans: [] });
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context.objective).toBe(
      "Increase qualified_trip_requests/month and confirmed bookings attributed to organic and funnel Growth OS channels for ColombiaTours.",
    );
  });

  it("falls back to DEFAULT_OBJECTIVE when growth_account_plans returns DB error", async () => {
    const planErrorMock = {
      calls: [] as Array<{ table: string }>,
      from(table: string) {
        this.calls.push({ table });
        const chain = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: () => {
            if (table === "growth_account_plans") {
              return Promise.resolve({ data: null, error: { message: "permission denied" } });
            }
            return Promise.resolve({ data: [], error: null });
          },
        };
        return chain;
      },
    };
    const bundle = await buildGrowthAgentContext({
      supabase: planErrorMock as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context.objective).toContain("qualified_trip_requests");
  });

  it("reads objective from growth_account_plans", async () => {
    const tableData = {
      growth_account_plans: [
        { objective: "Book 500 new trips this quarter via organic channels", id: "plan-1" },
      ],
    };
    const supabase = supabaseContextMock(tableData);
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context.objective).toBe("Book 500 new trips this quarter via organic channels");
  });

  it("queries growth_account_plans with account_id and active filter", async () => {
    const supabase = supabaseContextMock();
    await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    const planCall = supabase.calls.find((c: { table: string }) => c.table === "growth_account_plans");
    expect(planCall).toBeDefined();
    expect(planCall?.filters).toEqual(
      expect.arrayContaining([
        ["account_id", accountId],
        ["status", "active"],
      ]),
    );
  });
});

// ===================== Source refs resolution =====================

describe("resolveSourceRefs (via buildGrowthAgentContext)", () => {
  it("returns empty source_refs when growth_source_refs table is empty", async () => {
    const supabase = supabaseContextMock({ growth_source_refs: [] });
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context).not.toHaveProperty("source_refs");
  });

  it("does not throw on DB error (non-blocking)", async () => {
    const sourceRefErrorMock = {
      calls: [] as Array<{ table: string }>,
      from(table: string) {
        this.calls.push({ table });
        const chain = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: () => {
            if (table === "growth_source_refs") {
              return Promise.resolve({ data: null, error: { message: "permission denied" } });
            }
            return Promise.resolve({ data: [], error: null });
          },
        };
        return chain;
      },
    };
    const bundle = await buildGrowthAgentContext({
      supabase: sourceRefErrorMock as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context).toBeDefined();
  });

  it("queries growth_source_refs with website_id, locale, and market", async () => {
    const supabase = supabaseContextMock({ growth_source_refs: [] });
    await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    const refsCall = supabase.calls.find((c: { table: string }) => c.table === "growth_source_refs");
    expect(refsCall).toBeDefined();
    expect(refsCall?.columns).toContain("source");
    expect(refsCall?.columns).toContain("id");
    expect(refsCall?.columns).toContain("run_id");
    expect(refsCall?.filters).toContainEqual(["website_id", websiteId]);
    expect(refsCall?.filters).toContainEqual(["locale", "pt-BR"]);
    expect(refsCall?.filters).toContainEqual(["market", "BR"]);
  });
});

// ===================== Gate chain integration =====================

describe("buildGrowthAgentContext gate chain verdict", () => {
  it("returns snapshot even when no source refs are available", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.snapshot).toBeDefined();
    expect(bundle.snapshot.source_refs).toEqual([]);
  });

  it("includes source_refs in snapshot when tables have data", async () => {
    const profileRow = {
      id: "profile-pt-br",
      locale: "pt-BR",
      market: "BR",
      profile_type: "business",
      confidence: 0.9,
      valid_until: "2026-05-31T00:00:00.000Z",
      payload: { summary: "Brazil target market profile" },
      source_signal_fact_ids: [],
    };

    const tableData = {
      growth_profiles: [profileRow],
      growth_source_refs: [{ id: "sr-001", source: "growth_profiles", run_id: "run-001" }],
    };

    const supabase = supabaseContextMock(tableData);
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });

    expect(bundle.snapshot.source_refs).toEqual(
      expect.arrayContaining([
        expect.stringContaining("growth_profiles:"),
      ]),
    );
  });

  it("locale_pair is es-CO->pt-BR for cross-locale context", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });
    expect(bundle.context.locale_pair).toBe("es-CO->pt-BR");
    expect(bundle.context.source_locale).toBe("es-CO");
    expect(bundle.context.target_locale).toBe("pt-BR");
  });

  it("locale_pair is null when source == target", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "es-CO",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000010",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "es-CO", target_market: "CO", source: "timer" },
      } as any,
    });
    expect(bundle.context.locale_pair).toBeNull();
  });

  it("context has es-CO locale and CO market for same locale", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "es-CO",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000007",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "es-CO", target_market: "CO", source: "timer" },
      } as any,
    });
    expect(bundle.context.locale).toBe("es-CO");
    expect(bundle.context.market).toBe("CO");
  });
});

// ===================== Full integration (locale filtering) =====================

describe("buildGrowthAgentContext locale and market filtering", () => {
  it("filters growth_profiles by target locale and market", async () => {
    const profileRow = {
      id: "profile-pt-br",
      locale: "pt-BR",
      market: "BR",
      profile_type: "business",
      confidence: 0.9,
      valid_until: "2026-05-31T00:00:00.000Z",
      payload: { summary: "Brazil target market profile" },
      source_signal_fact_ids: [],
    };

    const tableData = {
      growth_profiles: [profileRow],
      growth_source_refs: [],
    };

    const supabase = supabaseContextMock(tableData);
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });

    const profileCall = supabase.calls.find((call: { table: string }) => call.table === "growth_profiles");
    expect(profileCall?.columns).toContain("locale,market");
    expect(profileCall?.filters).toEqual(
      expect.arrayContaining([
        ["locale", "pt-BR"],
        ["market", "BR"],
      ]),
    );
    expect(bundle.context).toMatchObject({
      locale: "pt-BR",
      market: "BR",
      target_locale: "pt-BR",
      locale_pair: "es-CO->pt-BR",
    });
    expect(bundle.context.profiles).toEqual([
      expect.objectContaining({ locale: "pt-BR", market: "BR" }),
    ]);
  });

  it("applies all hard constraints in context", async () => {
    const supabase = supabaseContextMock();
    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now,
      wakeup: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "timer" as any,
        priority: 5,
        payload: { source_locale: "es-CO", target_locale: "pt-BR", target_market: "BR", source: "timer" },
      } as any,
    });

    const ctx = bundle.context as any;
    expect(ctx.hard_constraints).toMatchObject({
      brain_can_mutate_public_surfaces: false,
      executor_only_mutation_boundary: true,
    });
    expect(ctx.hard_constraints.blocked_action_classes).toContain("call_provider_api_directly");
    expect(ctx.hard_constraints.blocked_surfaces).toContain("pricing");
    expect(ctx.hard_constraints.blocked_surfaces).toContain("payments");
  });
});
