import {
  buildGscReadonlyAdapterDryRun,
  buildGscReadonlyEvidenceRows,
} from "@/lib/growth/agentic/gsc-readonly-adapter";

const rows = [
  {
    keys: [
      "https://colombiatours.travel/l/tour-colombia-10-dias-colombiatours/",
      "ruta colombia 10 dias",
    ],
    clicks: 0,
    impressions: 3,
    ctr: 0,
    position: 81.6666666667,
  },
  {
    keys: [
      "https://colombiatours.travel/tour-colombia-10-dias",
      "colombia en 10 dias",
    ],
    clicks: 0,
    impressions: 2,
    ctr: 0,
    position: 81,
  },
  {
    keys: [
      "https://colombiatours.travel/l/bogota-cartagena-6-dias-colombiatours/",
      "bogota cartagena 6 dias",
    ],
    clicks: 1,
    impressions: 4,
    ctr: 0.25,
    position: 17,
  },
];

const policy = {
  provider: "gsc",
  provider_profile_type: "search_console_page_query",
  locale: "pt-BR",
  market: "BR",
  consent_granted: true,
  data_usage_policy: "store_normalized",
  enabled: true,
  rate_limit_daily: 10,
};

const input = {
  tenant: "ColombiaTours",
  account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  site_url: "https://colombiatours.travel/",
  source_locale: "es-CO",
  source_market: "CO",
  target_locale: "pt-BR",
  target_market: "BR",
  policy,
  rows,
  start_date: "2026-04-18",
  end_date: "2026-05-17",
  observed_at: "2026-05-19T00:00:00.000Z",
};

describe("buildGscReadonlyEvidenceRows", () => {
  it("normalizes GSC page/query rows into entity-level evidence", () => {
    const evidence = buildGscReadonlyEvidenceRows(input);

    expect(evidence).toHaveLength(2);
    const byPath = Object.fromEntries(evidence.map((row) => [row.entity_path, row]));
    expect(byPath["/bogota-cartagena-6-dias"]).toMatchObject({
      entity_path: "/bogota-cartagena-6-dias",
      page_url: "https://colombiatours.travel/l/bogota-cartagena-6-dias-colombiatours/",
      totals: { clicks: 1, impressions: 4, query_count: 1 },
    });
    expect(byPath["/tour-colombia-10-dias"]?.queries.map((q) => q.query)).toEqual([
      "ruta colombia 10 dias",
      "colombia en 10 dias",
    ]);
  });

  it("respects page path allowlist and max entity cap", () => {
    const evidence = buildGscReadonlyEvidenceRows({
      ...input,
      page_path_allowlist: ["/tour-colombia-10-dias"],
      max_entities: 1,
    });

    expect(evidence).toHaveLength(1);
    expect(evidence[0].entity_path).toBe("/tour-colombia-10-dias");
  });
});

describe("buildGscReadonlyAdapterDryRun", () => {
  it("passes GSC evidence through the governed provider-runner", () => {
    const report = buildGscReadonlyAdapterDryRun(input);

    expect(report.provider).toBe("gsc");
    expect(report.can_call_provider).toBe(false);
    expect(report.can_write_database).toBe(false);
    expect(report.can_publish).toBe(false);
    expect(report.runner_report.verdict).toBe("READY_FOR_NORMALIZATION_WRITE_GATE");
    expect(report.runner_report.normalized_fact_candidates).toHaveLength(2);
    expect(report.runner_report.normalized_fact_candidates[0]).toMatchObject({
      source: "gsc",
      signal_type: "search_console_normalized_signal",
      locale: "pt-BR",
      market: "BR",
    });
  });

  it("blocks when GSC policy has not been explicitly enabled", () => {
    const report = buildGscReadonlyAdapterDryRun({
      ...input,
      policy: null,
    });

    expect(report.evidence_rows).toHaveLength(2);
    expect(report.runner_report.verdict).toBe("BLOCKED_BY_POLICY");
    expect(report.runner_report.normalized_fact_candidates).toHaveLength(0);
  });

  it("blocks implicit fallback away from pt-BR/BR", () => {
    const report = buildGscReadonlyAdapterDryRun({
      ...input,
      target_locale: "es-CO",
      target_market: "CO",
      policy: { ...policy, locale: "es-CO", market: "CO" },
    });

    expect(report.runner_report.verdict).toBe("BLOCKED_BY_LOCALE_MARKET");
  });
});
