jest.mock("server-only", () => ({}), { virtual: true });

import {
  createGrowthAgentArtifact,
  validateGrowthAgentArtifact,
} from "@/lib/growth/chief-of-staff/artifacts";
import type { SupabaseLike } from "@/lib/growth/autonomy/runtime-common";
import {
  buildContentArticleArtifact,
  buildSafeApplyPatchArtifact,
  buildTranscreationPayloadArtifact,
  type LaneArtifactDraft,
} from "@/lib/growth/hermes-sidecar/lane-artifacts";

const accountId = "9fc24733-b127-4184-aa22-12f03b98927a";
const websiteId = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const providerEvidenceReads = [
  { table: "growth_profile_runs", id: "profile-run-1", provider: "dataforseo" },
] as [{ table: string; id: string; provider: string }];

function createSupabaseSink(): {
  supabase: SupabaseLike;
  inserted: () => Record<string, unknown>;
} {
  let inserted: Record<string, unknown> | null = null;
  return {
    supabase: {
      from: () => ({
        upsert: (row: Record<string, unknown>) => {
          inserted = row;
          return {
            select: () => ({
              limit: () => ({
                data: [
                  {
                    ...row,
                    id: "00000000-0000-4000-8000-000000000001",
                    created_at: "2026-05-11T00:00:00.000Z",
                    updated_at: "2026-05-11T00:00:00.000Z",
                  },
                ],
                error: null,
              }),
            }),
          };
        },
      }),
    },
    inserted: () => {
      if (!inserted) throw new Error("No row inserted");
      return inserted;
    },
  };
}

async function expectCreateGrowthAgentArtifactReady(draft: LaneArtifactDraft) {
  const validation = validateGrowthAgentArtifact(draft);
  expect(validation).toEqual({ valid: true, errors: [] });

  const sink = createSupabaseSink();
  const artifact = await createGrowthAgentArtifact({
    ...draft,
    supabase: sink.supabase,
    accountId,
    websiteId,
  });
  const inserted = sink.inserted();

  expect(artifact.status).toBe("validated");
  expect(inserted.validation_errors).toEqual([]);
  expect(inserted.provider_evidence_reads).toHaveLength(1);
  expect(inserted.quality_review).toEqual(expect.objectContaining({ pass: true }));
  expect(inserted.risk_assessment).toEqual(
    expect.objectContaining({ executor_boundary: expect.any(String) }),
  );
  return inserted;
}

describe("Hermes sidecar lane artifact builders", () => {
  it("builds content_article artifacts with rollback, smoke, metric and window", async () => {
    const draft = buildContentArticleArtifact({
      title: "Best Luxury Trips in Colombia",
      locale: "en-US",
      markdown: "# Best Luxury Trips in Colombia\n\nPrivate tours with local experts.",
      summary: "Luxury Colombia itinerary ideas.",
      providerEvidenceReads,
    });

    const inserted = await expectCreateGrowthAgentArtifactReady(draft);
    expect(inserted.artifact_type).toBe("content_article");
    expect(inserted.payload).toEqual(
      expect.objectContaining({
        slug: "best-luxury-trips-in-colombia",
        success_metric: "organic_clicks_21d",
        evaluation_window: "day_21",
        rollback_expectation: expect.objectContaining({
          strategy: "delete_created_post",
        }),
        rollback_payload: expect.objectContaining({
          operation: "delete_created_post",
        }),
        smoke_plan: expect.objectContaining({
          route: "/blog/best-luxury-trips-in-colombia",
        }),
      }),
    );
  });

  it("builds deterministic safe_apply_patch artifacts for executor handoff", async () => {
    const input = {
      target: { table: "website_pages", id: "page-1", path: "/about" },
      fieldAllowlist: ["seo_title"],
      patch: { seo_title: "Colombia Private Travel Experts" },
      rollbackPayload: { seo_title: "About ColombiaTours" },
      beforeRow: { seo_title: "About ColombiaTours" },
      providerEvidenceReads,
    };
    const draft = buildSafeApplyPatchArtifact(input);
    const secondDraft = buildSafeApplyPatchArtifact(input);

    expect(draft.idempotencyKey).toBe(secondDraft.idempotencyKey);
    const inserted = await expectCreateGrowthAgentArtifactReady(draft);
    expect(inserted.artifact_type).toBe("safe_apply_patch");
    expect(inserted.payload).toEqual(
      expect.objectContaining({
        success_metric: "technical_smoke_pass",
        evaluation_window: "immediate",
        field_allowlist: ["seo_title"],
        rollback_payload: { seo_title: "About ColombiaTours" },
        smoke_plan: expect.objectContaining({
          checks: ["target_readable", "patched_fields_match", "route_2xx"],
        }),
      }),
    );
  });

  it("builds transcreation_payload artifacts with locale quality guardrails", async () => {
    const draft = buildTranscreationPayloadArtifact({
      sourceLocale: "es-CO",
      targetLocale: "en-US",
      target: { table: "website_pages", id: "page-1", path: "/en/about" },
      payload: {
        title: "Colombia private tours",
        seo_description: "Plan a custom private trip in Colombia.",
      },
      rollbackPayload: {
        title: "Colombia tours",
        seo_description: "Old English description.",
      },
      glossaryTerms: ["private tour", "custom itinerary"],
      providerEvidenceReads,
    });

    const inserted = await expectCreateGrowthAgentArtifactReady(draft);
    expect(inserted.artifact_type).toBe("transcreation_payload");
    expect(inserted.payload).toEqual(
      expect.objectContaining({
        source_locale: "es-CO",
        target_locale: "en-US",
        success_metric: "locale_indexability_7d",
        evaluation_window: "day_7",
        rollback_expectation: expect.objectContaining({
          strategy: "restore_source_locale_snapshot",
        }),
        rollback_payload: expect.objectContaining({
          title: "Colombia tours",
        }),
        smoke_plan: expect.objectContaining({
          target_locale: "en-US",
        }),
      }),
    );
  });

  it("refuses to build transcreation artifacts for identical locales", () => {
    expect(() =>
      buildTranscreationPayloadArtifact({
        sourceLocale: "en-US",
        targetLocale: "en-US",
        target: { table: "website_pages", id: "page-1" },
        payload: { title: "Colombia tours" },
        rollbackPayload: { title: "Old title" },
        providerEvidenceReads,
      }),
    ).toThrow(/targetLocale must differ/);
  });
});
