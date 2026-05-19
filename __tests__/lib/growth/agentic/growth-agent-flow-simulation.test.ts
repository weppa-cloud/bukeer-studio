import {
  defaultSeoContentWorkerContract,
  validateGrowthWorkerContextPacketContract,
} from "@/lib/growth/agentic/worker-contextpacket-contract";
import { simulateSeoContentAgentWithContextPacket } from "@/lib/growth/agentic/growth-agent-flow-simulation";

const packet = {
  packet_version: "growth-provider-context-packet-v1",
  status: "watch",
  generated_at: "2026-05-19T00:00:00.000Z",
  account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  locale: "pt-BR",
  market: "BR",
  worker_lane: "content_creator",
  work_type: "seo_content_recommendation",
  entity: { type: "website_pages", path: "/tour-colombia-10-dias", locale: "pt-BR", market: "BR" },
  freshness_map: {
    manual: { status: "fresh", required: true },
    gsc: { status: "fresh", required: true },
  },
  source_refs: [
    "manual:growth_source_refs:026f743c-0297-4436-8902-55f7f9449c4e",
    "gsc:growth_source_refs:6729d4b3-5e83-44c6-a2c4-079c29626906",
  ],
  facts: {
    search_demand: {
      items: [{ source: "gsc", impressions: 17, query_count: 10 }],
      source_profile_ids: ["gsc/search_console_page_query"],
      no_go_reasons: [],
    },
    market_terms: {
      items: [{ source: "manual", summary: "operator source truth" }],
      source_profile_ids: ["manual/operator"],
      no_go_reasons: [],
    },
  },
  allowed_actions: ["prepare_recommendation", "create_review_artifact"],
  blocked_actions: [
    { action: "call_provider_api_directly", reason: "Provider API access is restricted." },
    { action: "content_publish", reason: "Publish is blocked in watch mode." },
    { action: "mass_transcreation", reason: "Mass transcreation is blocked." },
  ],
};

describe("growth worker ContextPacket contract", () => {
  it("passes a governed pt-BR/BR packet with manual and GSC source refs", () => {
    const result = validateGrowthWorkerContextPacketContract(packet, defaultSeoContentWorkerContract());

    expect(result.status).toBe("PASS");
    expect(result.usable_source_refs).toHaveLength(2);
    expect(result.can_call_provider).toBe(false);
    expect(result.can_publish).toBe(false);
  });

  it("blocks locale fallback and missing source refs", () => {
    const result = validateGrowthWorkerContextPacketContract(
      { ...packet, locale: "es-CO", market: "CO", source_refs: [] },
      defaultSeoContentWorkerContract(),
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("locale_market_mismatch:es-CO/CO");
    expect(result.blockers).toContain("source_refs_below_min:0/2");
  });
});

describe("growth agent flow simulation", () => {
  it("prepares recommendations and reviewer passes only citable claims", () => {
    const report = simulateSeoContentAgentWithContextPacket({
      task_id: "growth-agent-flow-simulation-colombiatours-ptbr",
      entity_path: "/tour-colombia-10-dias",
      objective: "Prepare SEO recommendation without publish.",
      context_packet: packet,
    });

    expect(report.worker_contract_status.status).toBe("PASS");
    expect(report.agent_output.status).toBe("prepared");
    expect(report.agent_output.claims.every((claim) => claim.source_ref)).toBe(true);
    expect(report.reviewer.verdict).toBe("PASS_WITH_WATCH");
    expect(report.can_call_provider).toBe(false);
    expect(report.can_publish).toBe(false);
  });
});
