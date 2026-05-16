import { buildGrowthAgentContext } from "@/lib/growth/agentic/context-builder";

const accountId = "11111111-1111-4111-8111-111111111111";
const websiteId = "22222222-2222-4222-8222-222222222222";

function supabaseContextMock() {
  const calls: Array<{
    table: string;
    columns: string | null;
    filters: Array<[string, unknown]>;
  }> = [];

  return {
    calls,
    from(table: string) {
      const call = { table, columns: null as string | null, filters: [] as Array<[string, unknown]> };
      calls.push(call);
      const query = {
        select(columns: string) {
          call.columns = columns;
          return query;
        },
        eq(key: string, value: unknown) {
          call.filters.push([key, value]);
          return query;
        },
        order() {
          return query;
        },
        limit() {
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
          return Promise.resolve({
            data: table === "growth_profiles" ? [profileRow] : [],
            error: null,
          });
        },
      };
      return query;
    },
  };
}

describe("buildGrowthAgentContext locale targeting", () => {
  it("filters growth_profiles by target locale and market", async () => {
    const supabase = supabaseContextMock();

    const bundle = await buildGrowthAgentContext({
      supabase: supabase as never,
      accountId,
      websiteId,
      locale: "pt-BR",
      persist: false,
      now: new Date("2026-05-16T00:00:00.000Z"),
    });

    const profileCall = supabase.calls.find((call) => call.table === "growth_profiles");
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
});
