jest.mock("server-only", () => ({}), { virtual: true });

import {
  HERMES_BRIDGE_ALLOWED_WRITE_TABLES,
  createAgentArtifactFromHermes,
} from "@/lib/growth/hermes-sidecar/bridge";

const PUBLIC_MUTATION_TABLES = [
  "website_pages",
  "website_sections",
  "website_blog_posts",
  "product_seo_overrides",
  "products",
  "bookings",
  "payments",
  "reservations",
];

function scopedSupabase() {
  return {
    from: jest.fn((table: string) => {
      type Chain = {
        select: jest.Mock;
        eq: jest.Mock;
        limit: jest.Mock;
      };
      let chain: Chain;
      chain = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        limit: jest.fn(() => {
          if (table === "websites") {
            return Promise.resolve({
              data: [{ id: "site-1", account_id: "account-1" }],
              error: null,
            });
          }
          if (table === "user_roles") {
            return Promise.resolve({
              data: [{ account_id: "account-1", is_active: true, roles: { role_name: "admin" } }],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };
      return chain;
    }),
  };
}

describe("Hermes sidecar bridge", () => {
  it("does not expose direct public mutation tables as writable bridge targets", () => {
    for (const table of PUBLIC_MUTATION_TABLES) {
      expect(HERMES_BRIDGE_ALLOWED_WRITE_TABLES).not.toContain(table);
    }
  });

  it("hard-blocks sensitive action classes before artifact persistence", async () => {
    await expect(
      createAgentArtifactFromHermes({
        supabase: scopedSupabase() as never,
        accountId: "account-1",
        websiteId: "site-1",
        userId: "user-1",
        artifactType: "policy_recommendation",
        payload: {
          action_class: "paid_mutation",
          recommendation: "Increase paid spend.",
        },
        providerEvidenceReads: [{ table: "growth_profile_runs", id: "run-1" }],
        qualityReview: { pass: true },
        riskAssessment: { risk: "high" },
        idempotencyKey: "hermes-sidecar:blocked-paid-mutation-test",
      }),
    ).rejects.toMatchObject({
      code: "hermes_sensitive_action_blocked",
    });
  });

  it("requires agent and context manifest before non-sensitive sidecar artifacts", async () => {
    await expect(
      createAgentArtifactFromHermes({
        supabase: scopedSupabase() as never,
        accountId: "account-1",
        websiteId: "site-1",
        userId: "user-1",
        artifactType: "policy_recommendation",
        payload: {
          recommendation: "Review technical lane.",
        },
        providerEvidenceReads: [{ table: "growth_profile_runs", id: "run-1" }],
        qualityReview: { pass: true },
        riskAssessment: { risk: "low" },
        idempotencyKey: "hermes-sidecar:missing-context-manifest-test",
      }),
    ).rejects.toMatchObject({
      code: "hermes_context_manifest_required",
    });
  });
});
