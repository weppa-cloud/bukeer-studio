# ADR-030: Development pipeline self-learning and memory boundaries

Status: Accepted
Date: 2026-05-14

## Context

Bukeer Studio development work is orchestrated through a Hermes/Kanban DAG that previously ended at T5 ops/deploy handoff. The pipeline produced useful operational trace in Kanban and GitHub, but durable lessons were not consistently captured, filtered, routed, reviewed, or reused. Runs can reveal preflight pitfalls, implementation patterns, ADR gaps, QA failure modes, profile-specific facts, and follow-up issues.

The learning loop must respect existing architecture decisions: ADR-003 contract-first validation, ADR-005 defense-in-depth security, ADR-010 observability, ADR-013 automated tech-validator gates, ADR-014 delta TypeScript quality gates, and ADR-023 QA tooling.

## Decision

Add T6 learning-curator after T5 for development DAGs. T6 reads final branch/commit/PR/deploy state, gate evidence, QA evidence, retry/block history, and learning_candidates emitted by earlier tasks. It curates redacted reusable knowledge into the correct storage layer and returns PASS/FAIL/WARN with machine-readable evidence.

Bukeer Studio recognizes three memory layers:

1. Profile-private Holographic memory/facts for compact durable facts useful to a specific profile.
2. Kanban operational trace for immutable per-DAG audit evidence.
3. GitHub/repo institutional knowledge for reviewed cross-profile source of truth: issues, PRs, commits, ADRs, specs, docs/ai/patterns, and docs/ai/learning-runs.

T6 must classify candidates before writing durable knowledge: skill_patch, profile_fact, pattern_doc, adr_update, github_issue, prompt_update, or rejected_noise. Shared institutional knowledge belongs in GitHub/repo docs or issues. Profile-private memory must not be silently treated as globally shared.

## Security and redaction

Learning artifacts must not persist credentials, raw tokens, cookies, raw env values, raw PII, or full raw logs. Evidence should be summarized and linked by task ID, commit, PR, doc path, or test report. Candidates whose value depends on secret values are rejected.

## Consequences

- Development DAGs become T0→T6 instead of T0→T5.
- T1/T3/T4/T5 gates must emit structured `learning_candidates` metadata in addition to PASS/FAIL/WARN evidence.
- Learning-run docs and schema provide ADR-003-compatible contracts without adding a new runtime dependency.
- The retry invariant remains unchanged: retries resolving blocked gates MUST NOT use `parents=[blocked_gate]`.
- GitHub remains the implementation source of truth; T6 curates learning but does not replace issues, PRs, or CODE/QA/OPS gates.

## Related documents

- ADR-003: Contract-First Validation with Zod
- ADR-005: Defense-in-Depth Security
- ADR-010: Observability Strategy
- ADR-013: Automated Tech Validator Quality Gate
- ADR-014: Delta TypeScript Quality Gate
- ADR-023: QA Tooling: Playwright Component Testing + Visual Regression
- docs/ops/development-kanban-pipeline.md
- docs/ai/learning-runs/README.md
- docs/ai/patterns/README.md
