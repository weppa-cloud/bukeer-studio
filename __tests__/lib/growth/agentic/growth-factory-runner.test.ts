import { runGrowthFactoryBatch, scoreGrowthFactoryCandidate, type GrowthFactoryCandidate } from "@/lib/growth/agentic/growth-factory-runner";

const baseCandidate = (entity_path: string, impressions: number, position: number): GrowthFactoryCandidate => ({
  entity_path,
  locale: "pt-BR",
  market: "BR",
  evidence: [
    {
      entity_path,
      source: "gsc",
      signal_type: "gsc_page_query_performance",
      fact_id: `${entity_path}:gsc-fact`,
      source_ref_id: `${entity_path}:gsc-ref`,
      freshness_status: "fresh",
      payload: {
        impressions,
        weighted_position: position,
        top_queries: ["colombiatours"],
      },
    },
    {
      entity_path,
      source: "manual/operator_source_truth_write_gate",
      signal_type: "operator_normalized_page_source_truth",
      fact_id: `${entity_path}:manual-fact`,
      source_ref_id: `${entity_path}:manual-ref`,
      freshness_status: "fresh",
      payload: {
        normalization_mode: "operator_controlled_seed",
        publish_allowed: false,
      },
    },
  ],
});

describe("growth-factory-runner", () => {
  it("scores candidates using governed demand and source-truth evidence", () => {
    const high = scoreGrowthFactoryCandidate(baseCandidate("/a", 62, 19));
    const low = scoreGrowthFactoryCandidate(baseCandidate("/b", 3, 70));

    expect(high).toBeGreaterThan(low);
  });

  it("creates a prepare-only batch with ContextPacket-backed review artifacts", () => {
    const report = runGrowthFactoryBatch({
      batch_id: "growth-factory-test-batch",
      account_id: "account-id",
      website_id: "website-id",
      locale: "pt-BR",
      market: "BR",
      max_entities: 2,
      candidates: [
        baseCandidate("/los-mejores-paquetes-de-viajes-a-colombia", 62, 19.08),
        baseCandidate("/tour-colombia-15-dias", 14, 37.85),
        baseCandidate("/cartagena-4-dias", 3, 70.66),
      ],
    });

    expect(report.mode).toBe("prepare_only");
    expect(report.selected_count).toBe(2);
    expect(report.ready_for_review_count).toBe(2);
    expect(report.blocked_count).toBe(0);
    expect(report.forbidden_actions).toEqual(["publish", "provider_api_call", "mass_transcreation"]);
    expect(report.entities[0].entity_path).toBe("/los-mejores-paquetes-de-viajes-a-colombia");
    expect(report.entities[0].simulation.can_publish).toBe(false);
    expect(report.entities[0].simulation.can_call_provider).toBe(false);
    expect(report.entities[0].review_artifact.source_refs).toEqual(
      expect.arrayContaining([
        expect.stringContaining("gsc:"),
        expect.stringContaining("manual/operator_source_truth_write_gate:"),
      ]),
    );
  });

  it("blocks entities without required GSC + manual source refs", () => {
    const candidate: GrowthFactoryCandidate = {
      entity_path: "/missing-gsc",
      locale: "pt-BR",
      market: "BR",
      evidence: [
        {
          entity_path: "/missing-gsc",
          source: "manual/operator_source_truth_write_gate",
          signal_type: "operator_normalized_page_source_truth",
          fact_id: "manual-fact",
          source_ref_id: "manual-ref",
          freshness_status: "fresh",
          payload: {},
        },
      ],
    };

    const report = runGrowthFactoryBatch({
      batch_id: "growth-factory-test-blocked",
      account_id: "account-id",
      website_id: "website-id",
      locale: "pt-BR",
      market: "BR",
      candidates: [candidate],
    });

    expect(report.blocked_count).toBe(1);
    expect(report.entities[0].simulation.worker_contract_status.blockers).toContain("source_refs_below_min:1/2");
    expect(report.entities[0].simulation.worker_contract_status.blockers).toContain("missing_required_source_ref:gsc");
    expect(report.entities[0].review_artifact.status).toBe("blocked");
  });
});
