jest.mock("server-only", () => ({}), { virtual: true });

import { composeChiefOfStaffAnswer } from "@/lib/growth/chief-of-staff/service";

describe("Growth Chief of Staff answer composition", () => {
  it("answers from factual Growth OS ledgers and returns cited refs", () => {
    const result = composeChiefOfStaffAnswer({
      prompt: "Que aprendimos de la corrida tecnica?",
      actionMessage: "Solicitud registrada como lectura/briefing.",
      facts: {
        cycles: [
          {
            id: "cycle-1",
            status: "completed",
            trigger: "timer",
            updated_at: "2026-05-11T10:00:00.000Z",
          },
        ],
        decisions: [
          {
            id: "decision-1",
            decision_type: "technical_batch",
            confidence: 0.82,
            created_at: "2026-05-11T10:00:00.000Z",
          },
        ],
        workItems: [
          {
            id: "work-1",
            status: "blocked",
            title: "Duplicate title",
          },
        ],
        jobs: [
          {
            id: "job-1",
            status: "smoke_passed",
            action_class: "safe_apply",
          },
        ],
        outcomes: [
          {
            id: "outcome-1",
            status: "measuring",
            success_metric: "technical_smoke",
          },
        ],
        profileRuns: [
          {
            id: "profile-1",
            provider: "dataforseo",
            profile_id: "dataforseo_onpage",
            freshness_status: "PASS",
          },
        ],
        taskSessions: [
          {
            id: "task-session-1",
            status: "completed",
            assigned_agent_lane: "technical_remediation",
          },
        ],
        memories: [{ id: "memory-1", status: "active" }],
        skills: [{ id: "skill-1", status: "active" }],
        actions: [],
      },
    });

    expect(result.answer).toContain("Resumen operativo Growth OS");
    expect(result.answer).toContain("Aprendizaje:");
    expect(result.answer).toContain("1 memorias activas y 1 skills activas");
    expect(result.citedRefs).toEqual(
      expect.arrayContaining([
        "growth_runtime_cycles:cycle-1",
        "growth_orchestrator_decisions:decision-1",
        "growth_publication_jobs:job-1",
        "growth_work_item_outcomes:outcome-1",
        "growth_profile_runs:profile-1",
        "growth_agent_task_sessions:task-session-1",
      ]),
    );
  });
});
