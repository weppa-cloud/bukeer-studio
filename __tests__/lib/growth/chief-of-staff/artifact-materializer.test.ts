jest.mock("server-only", () => ({}), { virtual: true });

import type { GrowthAgentArtifact } from "@bukeer/website-contract";

import { buildGrowthArtifactCandidate } from "@/lib/growth/chief-of-staff/artifact-materializer";

const accountId = "9fc24733-b127-4184-aa22-12f03b98927a";
const websiteId = "894545b7-73ca-4dae-b76a-da5b6a3f8441";

function artifact(
  overrides: Partial<GrowthAgentArtifact>,
): GrowthAgentArtifact {
  return {
    id: "00000000-0000-4000-8000-000000000111",
    account_id: accountId,
    website_id: websiteId,
    agent_instance_id: null,
    task_session_id: null,
    context_manifest_id: null,
    decision_id: null,
    artifact_type: "safe_apply_patch",
    artifact_version: "v1",
    status: "validated",
    payload: {},
    quality_review: {},
    provider_evidence_reads: [{ table: "growth_profile_runs", id: "run-1" }],
    memory_reads: [],
    skill_reads: [],
    risk_assessment: { risk: "low" },
    manifest_citation_verdict: {},
    validation_errors: [],
    idempotency_key: "test:artifact:1",
    created_work_item_id: null,
    created_change_set_id: null,
    created_at: "2026-05-11T10:00:00.000Z",
    updated_at: "2026-05-11T10:00:00.000Z",
    ...overrides,
  };
}

describe("Growth Hermes artifact materializer", () => {
  it("maps safe_apply artifacts into evidence-backed technical candidates", () => {
    const { candidate, actionClass, lane } = buildGrowthArtifactCandidate({
      artifact: artifact({
        payload: {
          title: "Fix missing title",
          target: {
            table: "website_pages",
            id: "11111111-1111-4111-8111-111111111111",
          },
          patch: { seo_title: "Colombia Tours" },
          before_row: { seo_title: "" },
          rollback_payload: { restore: { seo_title: "" } },
          smoke_plan: { checks: ["route_resolves"] },
          success_metric: "technical_smoke_pass",
          evaluation_window: "immediate",
        },
      }),
    });

    expect(actionClass).toBe("safe_apply");
    expect(lane).toBe("technical_remediation");
    expect(candidate.status).toBe("ready_for_backlog");
    expect(candidate.evidence).toMatchObject({
      source: "growth_agent_artifact",
      target: {
        target_table: "website_pages",
        target_id: "11111111-1111-4111-8111-111111111111",
      },
      source_refs: ["growth_profile_runs:run-1"],
      supported_facts: [
        {
          ref: "growth_profile_runs:run-1",
        },
      ],
      adapter_input: {
        target_table: "website_pages",
        target_id: "11111111-1111-4111-8111-111111111111",
        patch: { seo_title: "Colombia Tours" },
      },
      rollback_expectation: {
        strategy: "executor_validates_artifact_rollback_before_apply",
      },
    });
    expect(candidate.success_metric).toBe("technical_smoke_pass");
    expect(candidate.evaluation_window).toBe("immediate");
  });

  it("maps content artifacts to content_publish candidates with article payload", () => {
    const { candidate } = buildGrowthArtifactCandidate({
      artifact: artifact({
        artifact_type: "content_article",
        payload: {
          title: "Best Colombia Trips",
          slug: "best-colombia-trips",
          locale: "en",
          seo_title: "Best Colombia Trips",
          seo_description: "Plan the best Colombia trip.",
          markdown: "# Best Colombia Trips",
          rollback_expectation: { delete_created_post: true },
          success_metric: "organic_clicks_21d",
          evaluation_window: "day_21",
        },
      }),
      locale: "en-US",
      market: "US",
    });

    expect(candidate.allowed_action_class).toBe("content_publish");
    expect(candidate.lane).toBe("content_creator");
    expect(candidate.evidence).toMatchObject({
      target: {
        target_table: "website_blog_posts",
        target_path: "/blog/best-colombia-trips",
      },
      adapter_input: {
        article: {
          title: "Best Colombia Trips",
          slug: "best-colombia-trips",
          supported_facts: [
            {
              ref: "growth_profile_runs:run-1",
            },
          ],
        },
      },
    });
  });

  it("normalizes transcreation quality to the promotion gate contract", () => {
    const { candidate } = buildGrowthArtifactCandidate({
      artifact: artifact({
        artifact_type: "transcreation_payload",
        quality_review: { pass: true, score: 0.92 },
        payload: {
          source_locale: "es-CO",
          target_locale: "en-US",
          target: {
            table: "seo_transcreation_jobs",
            id: "22222222-2222-4222-8222-222222222222",
            target_key: "page:en-US:home",
          },
          payload: {
            meta_title: "Colombia trips",
            meta_desc: "Plan Colombia trips with local experts.",
            body_content: "English body content.",
          },
          rollback_payload: { restore: { status: "pending" } },
          glossary_terms: ["ColombiaTours"],
          transcreation_job_id: "22222222-2222-4222-8222-222222222222",
          source_entity_id: "home",
          page_type: "page",
        },
      }),
      locale: "en-US",
      market: "US",
    });

    expect(candidate.allowed_action_class).toBe("transcreation_merge");
    expect(candidate.evidence).toMatchObject({
      source_refs: ["growth_profile_runs:run-1"],
      adapter_input: {
        quality: {
          pass: true,
          passed: true,
        },
      },
    });
  });
});
