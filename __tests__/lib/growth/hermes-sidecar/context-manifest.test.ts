jest.mock("server-only", () => ({}), { virtual: true });

import { validateManifestCitations } from "@/lib/growth/hermes-sidecar/context-manifest";

function manifestSupabase() {
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
          if (table === "growth_agent_context_manifests") {
            return Promise.resolve({
              data: [
                {
                  id: "00000000-0000-4000-8000-000000000001",
                  website_id: "site-1",
                  memory_ids_injected: [
                    "00000000-0000-4000-8000-000000000002",
                  ],
                  global_memory_ids_injected: [],
                  skill_ids_injected: [
                    "00000000-0000-4000-8000-000000000003",
                  ],
                  toolset_allowed: ["safe_apply_artifacts"],
                  autonomy_level: "A2",
                },
              ],
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

describe("Hermes context manifest citation enforcement", () => {
  it("allows only memory and skill citations injected in the manifest", async () => {
    const allowed = await validateManifestCitations(
      manifestSupabase() as never,
      "site-1",
      "00000000-0000-4000-8000-000000000001",
      [{ id: "00000000-0000-4000-8000-000000000002" }],
      [{ id: "00000000-0000-4000-8000-000000000003" }],
    );
    expect(allowed).toMatchObject({
      allowed: true,
      missingMemoryIds: [],
      missingSkillIds: [],
    });

    const blocked = await validateManifestCitations(
      manifestSupabase() as never,
      "site-1",
      "00000000-0000-4000-8000-000000000001",
      [{ id: "00000000-0000-4000-8000-000000000009" }],
      [{ id: "00000000-0000-4000-8000-000000000003" }],
    );
    expect(blocked).toMatchObject({
      allowed: false,
      missingMemoryIds: ["00000000-0000-4000-8000-000000000009"],
      missingSkillIds: [],
    });
  });

  it("blocks requested tools and live execution above the manifest autonomy level", async () => {
    const verdict = await validateManifestCitations(
      manifestSupabase() as never,
      "site-1",
      "00000000-0000-4000-8000-000000000001",
      [],
      [],
      ["paid_ads_mutation"],
      "safe_apply",
      true,
    );
    expect(verdict).toMatchObject({
      allowed: false,
      missingToolNames: ["paid_ads_mutation"],
      autonomyViolation: "autonomy_A2_cannot_request_live_execution",
    });
  });
});
