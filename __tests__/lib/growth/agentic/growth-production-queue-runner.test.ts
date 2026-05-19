import {
  buildRecoveryCandidates,
  buildPublishGatePacket,
  productionWorkerLanes,
  runGrowthProductionQueue,
  scoreRecoveryOpportunity,
  type GrowthSearchConsolePageMetric,
} from "@/lib/growth/agentic/growth-production-queue-runner";

const metric = (
  path: string,
  clicks: number,
  impressions: number,
  ctr: number,
  position: number,
): GrowthSearchConsolePageMetric => ({
  url: `https://colombiatours.travel${path}`,
  clicks,
  impressions,
  ctr,
  position,
});

const input = {
  batch_id: "growth-factory-colombiatours-esco-recovery-batch-002",
  account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  locale: "es-CO",
  market: "CO",
  baseline_window: { start: "2025-01-04", end: "2025-03-31", label: "baseline_2025_q1" },
  current_window: { start: "2026-02-18", end: "2026-05-16", label: "current_last_90d" },
  baseline_pages: [
    metric("/l/plan-eje-cafetero-disfruta/", 1726, 36628, 0.04712242000655236, 14.937889046630993),
    metric("/los-10-mejores-lugares-turisticos-de-colombia/", 1546, 220380, 0.007015155640257737, 10.763744441419366),
    metric("/las-mejores-agencias-de-viaje-en-colombia/", 1179, 72188, 0.016332354407934836, 21.813570122458025),
    metric("/cuanto-cuesta-viajar-a-colombia-desde-mexico/", 1088, 74409, 0.01462188713730866, 12.202475506995121),
    metric("/agencia-de-viajes-es-legal-en-colombia/", 789, 9866, 0.07997161970403406, 9.218122846138252),
  ],
  current_pages: [
    metric("/l/plan-eje-cafetero-disfruta/", 5, 1357, 0.0036845983787767134, 66.09432571849668),
    metric("/los-10-mejores-lugares-turisticos-de-colombia/", 8, 6769, 0.0011818584724479244, 19.30654454129118),
    metric("/las-mejores-agencias-de-viaje-en-colombia/", 11, 8534, 0.001288961799859386, 13.798687602531052),
    metric("/cuanto-cuesta-viajar-a-colombia-desde-mexico/", 0, 0, 0, 100),
    metric("/agencia-de-viajes-es-legal-en-colombia/", 49, 4451, 0.011008762075937992, 4.734666367108515),
  ],
};

describe("growth-production-queue-runner", () => {
  it("scores recovery opportunities by lost clicks, impressions, CTR, and ranking damage", () => {
    const high = scoreRecoveryOpportunity(input.baseline_pages[0], input.current_pages[0]);
    const low = scoreRecoveryOpportunity(input.baseline_pages[4], input.current_pages[4]);

    expect(high).toBeGreaterThan(low);
  });

  it("builds recovery candidates with GSC + operator source-truth refs", () => {
    const candidates = buildRecoveryCandidates({ ...input, max_entities: 3 });

    expect(candidates).toHaveLength(3);
    expect(candidates[0].entity_path).toBe("/los-10-mejores-lugares-turisticos-de-colombia/");
    expect(candidates[0].lost_clicks).toBe(1538);
    expect(candidates[0].evidence.map((row) => row.source)).toEqual([
      "gsc",
      "manual/operator_source_truth_write_gate",
    ]);
  });

  it("runs production queue prepare-only with three worker lanes and blocked publish gate", () => {
    const report = runGrowthProductionQueue({ ...input, max_entities: 4 });

    expect(report.runner_version).toBe("growth-production-queue-runner-v0");
    expect(report.mode).toBe("prepare_only");
    expect(report.locale).toBe("es-CO");
    expect(report.market).toBe("CO");
    expect(report.recovery_candidates).toHaveLength(4);
    expect(report.ready_for_review_count).toBe(4);
    expect(report.blocked_count).toBe(0);
    expect(report.worker_lanes.map((lane) => lane.id)).toEqual([
      "data",
      "brief_refresh_transcreation",
      "review",
    ]);
    expect(report.worker_lanes.reduce((sum, lane) => sum + lane.max_concurrent, 0)).toBe(4);
    expect(report.publish_gate.status).toBe("blocked_until_human_approval");
    expect(report.publish_gate.forbidden_until_gate_passes).toContain("automatic_publish");
    expect(report.factory_entities.every((entity) => entity.simulation.can_publish === false)).toBe(true);
    expect(report.factory_entities.every((entity) => entity.simulation.can_call_provider === false)).toBe(true);
  });

  it("keeps publish gate as dry-run until 30-50 consistent change sets", () => {
    expect(buildPublishGatePacket().required_consistency_window).toEqual({
      min_change_sets: 30,
      max_change_sets_before_canary: 50,
    });
    expect(productionWorkerLanes().every((lane) => lane.blocked_action_classes.includes("content_publish"))).toBe(true);
  });
});
