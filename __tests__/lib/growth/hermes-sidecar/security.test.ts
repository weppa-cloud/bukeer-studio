jest.mock("server-only", () => ({}), { virtual: true });

const mockEnqueueGrowthAgentWakeup = jest.fn();

jest.mock("@/lib/growth/agentic/wakeup-queue", () => ({
  enqueueGrowthAgentWakeup: mockEnqueueGrowthAgentWakeup,
}));

import type { GrowthAgentArtifact } from "@bukeer/website-contract";

import {
  routeChiefOfStaffAction,
} from "@/lib/growth/chief-of-staff/action-router";
import {
  createGrowthAgentArtifact,
} from "@/lib/growth/chief-of-staff/artifacts";
import {
  materializeGrowthAgentArtifactToCandidate,
} from "@/lib/growth/chief-of-staff/artifact-materializer";
import {
  assertTenantScope,
  TenantScopeViolationError,
} from "@/lib/growth/orchestrator/tenant-guard";

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";
const WEBSITE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WEBSITE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "99999999-9999-4999-8999-999999999999";
const ARTIFACT_ID = "33333333-3333-4333-8333-333333333333";

const DIRECT_MUTATION_TABLES = [
  "website_pages",
  "website_sections",
  "website_blog_posts",
  "website_page_sections",
  "product_seo_overrides",
  "products",
  "growth_publication_jobs",
];

type SupabaseCall = {
  table: string;
  op: string;
  payload?: unknown;
  column?: string;
  value?: unknown;
};

type SupabaseChain = {
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  limit: jest.Mock;
};

function fakeSupabase(
  responses: Array<{ data: unknown; error: null | { message: string } }> = [],
) {
  const calls: SupabaseCall[] = [];

  function chainFor(table: string): SupabaseChain {
    let chain: SupabaseChain;
    chain = {
      insert: jest.fn((payload: unknown) => {
        calls.push({ table, op: "insert", payload });
        return chain;
      }),
      upsert: jest.fn((payload: unknown) => {
        calls.push({ table, op: "upsert", payload });
        return chain;
      }),
      update: jest.fn((payload: unknown) => {
        calls.push({ table, op: "update", payload });
        return chain;
      }),
      select: jest.fn(() => {
        calls.push({ table, op: "select" });
        return chain;
      }),
      eq: jest.fn((column: string, value: unknown) => {
        calls.push({ table, op: "eq", column, value });
        return chain;
      }),
      limit: jest.fn(() =>
        Promise.resolve(
          responses.shift() ?? {
            data: [{ id: `${table}-row` }],
            error: null,
          },
        ),
      ),
    };
    return chain;
  }

  return {
    calls,
    tablesTouched: () => Array.from(new Set(calls.map((call) => call.table))),
    supabase: {
      from: jest.fn((table: string) => {
        calls.push({ table, op: "from" });
        return chainFor(table);
      }),
    },
  };
}

function validSafeApplyArtifact(
  overrides: Partial<GrowthAgentArtifact> = {},
): GrowthAgentArtifact {
  return {
    id: ARTIFACT_ID,
    account_id: ACCOUNT_A,
    website_id: WEBSITE_A,
    agent_instance_id: null,
    task_session_id: null,
    decision_id: null,
    artifact_type: "safe_apply_patch",
    artifact_version: "v1",
    status: "validated",
    payload: {
      title: "Hermes safe apply guard",
      target: {
        table: "website_pages",
        id: "44444444-4444-4444-8444-444444444444",
      },
      field_allowlist: ["seo_title"],
      patch: { seo_title: "Colombia Tours" },
      rollback_payload: { restore: { seo_title: "Old title" } },
      smoke_plan: { checks: ["route_resolves"] },
      success_metric: "technical_smoke_pass",
      evaluation_window: "immediate",
    },
    quality_review: {},
    provider_evidence_reads: [{ table: "growth_profile_runs", id: "run-1" }],
    memory_reads: [],
    skill_reads: [],
    risk_assessment: { risk: "low" },
    validation_errors: [],
    idempotency_key: "hermes-sidecar:safe-apply:guard",
    created_work_item_id: null,
    created_change_set_id: null,
    created_at: "2026-05-11T10:00:00.000Z",
    updated_at: "2026-05-11T10:00:00.000Z",
    ...overrides,
  };
}

function expectNoDirectMutationTables(tables: string[]) {
  for (const table of DIRECT_MUTATION_TABLES) {
    expect(tables).not.toContain(table);
  }
}

describe("Hermes sidecar security contract", () => {
  beforeEach(() => {
    mockEnqueueGrowthAgentWakeup.mockReset();
  });

  it("blocks cross-tenant rows with the runtime tenant-scope guard", () => {
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: WEBSITE_A },
        { account_id: ACCOUNT_A, website_id: WEBSITE_A },
      ),
    ).not.toThrow();

    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: WEBSITE_A },
        { account_id: ACCOUNT_B, website_id: WEBSITE_A },
      ),
    ).toThrow(TenantScopeViolationError);

    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: WEBSITE_A },
        { account_id: ACCOUNT_A, website_id: WEBSITE_B },
      ),
    ).toThrow(TenantScopeViolationError);
  });

  it("records forbidden production intents as blocked actions without wakeups", async () => {
    const fake = fakeSupabase([
      {
        data: [{ id: "action-1" }],
        error: null,
      },
    ]);

    const result = await routeChiefOfStaffAction({
      supabase: fake.supabase as never,
      accountId: ACCOUNT_A,
      websiteId: WEBSITE_A,
      userId: USER_ID,
      intent: "Activa paid ads, cambia pricing y manda outreach masivo",
      now: new Date("2026-05-11T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      actionClass: "forbidden",
      status: "blocked",
      policyVerdict: {
        allowed: false,
        reason: "sensitive_surface_hard_blocked",
        mutation_boundary: "growth_os_executor",
      },
    });
    expect(mockEnqueueGrowthAgentWakeup).not.toHaveBeenCalled();
    expect(fake.tablesTouched()).toEqual(["growth_chief_of_staff_actions"]);
    expect(fake.calls).toContainEqual(
      expect.objectContaining({
        table: "growth_chief_of_staff_actions",
        op: "insert",
        payload: expect.objectContaining({
          account_id: ACCOUNT_A,
          website_id: WEBSITE_A,
          action_class: "forbidden",
          status: "blocked",
          completed_at: "2026-05-11T12:00:00.000Z",
        }),
      }),
    );
  });

  it("lets the sidecar bridge create artifacts only in the artifact ledger", async () => {
    const artifact = validSafeApplyArtifact();
    const fake = fakeSupabase([
      {
        data: [artifact],
        error: null,
      },
    ]);

    const result = await createGrowthAgentArtifact({
      supabase: fake.supabase as never,
      accountId: ACCOUNT_A,
      websiteId: WEBSITE_A,
      artifactType: "safe_apply_patch",
      payload: artifact.payload as Record<string, unknown>,
      providerEvidenceReads: artifact.provider_evidence_reads as Record<string, unknown>[],
      riskAssessment: artifact.risk_assessment as Record<string, unknown>,
      idempotencyKey: artifact.idempotency_key,
    });

    expect(result.id).toBe(ARTIFACT_ID);
    expect(fake.tablesTouched()).toEqual(["growth_agent_artifacts"]);
    expectNoDirectMutationTables(fake.tablesTouched());
  });

  it("materializes artifacts only to candidates, leaving public mutation to Growth OS executor", async () => {
    const fake = fakeSupabase([
      {
        data: [validSafeApplyArtifact()],
        error: null,
      },
      {
        data: [{ id: "candidate-1" }],
        error: null,
      },
    ]);

    const result = await materializeGrowthAgentArtifactToCandidate({
      supabase: fake.supabase as never,
      accountId: ACCOUNT_A,
      websiteId: WEBSITE_A,
      artifactId: ARTIFACT_ID,
      now: new Date("2026-05-11T12:05:00.000Z"),
    });

    expect(result).toMatchObject({
      artifactId: ARTIFACT_ID,
      candidateId: "candidate-1",
      status: "materialized",
      blockingReasons: [],
    });
    expect(fake.tablesTouched().sort()).toEqual(
      ["growth_agent_artifacts", "growth_opportunity_candidates"].sort(),
    );
    expectNoDirectMutationTables(fake.tablesTouched());
  });
});
