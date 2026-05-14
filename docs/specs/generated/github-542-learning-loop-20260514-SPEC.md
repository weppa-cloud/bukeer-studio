# Add learning loop to Bukeer Studio development pipeline — Executable SPEC

Pipeline: `github-542-learning-loop-20260514`
GitHub issue: [#542](https://github.com/weppa-cloud/bukeer-studio/issues/542)
Source of truth: GitHub issue #542
Base branch: `dev`
Feature branch: `feat/542-dev-pipeline-learning-loop`
Role: T0 SPECIFIER
Status: Ready for `tech-validator` MODE:PLAN

## 1. Problem statement

Bukeer Studio has a Hermes/Kanban development pipeline:

```txt
T0 specifier
T1 tech-validator [PLAN GATE]
T2 developer-runner/Codex
T3 tech-validator [CODE GATE]
T4 QA gate
T5 ops/deploy handoff
```

The pipeline creates useful operational trace in Kanban and GitHub, but it does not yet close the learning loop. Runs can discover durable lessons — preflight pitfalls, reusable implementation patterns, ADR gaps, QA failure modes, profile-specific facts, follow-up issues — yet those lessons are not consistently captured, filtered, routed, reviewed, or reused in future runs.

This work adds `T6 learning-curator` after T5 and defines the docs, templates, metadata contracts, memory boundaries, and generator updates required for every development DAG to learn safely without replacing GitHub as source of truth or polluting profile-private memory.

## 2. Relevant architecture decisions and repo conventions

- [[ADR-003]] Contract-First Validation with Zod: task metadata and learning-run indexes must have schemas/contracts, not ad hoc blobs.
- [[ADR-005]] Defense-in-Depth Security: learning artifacts must not persist secrets, credentials, raw tokens, or unredacted logs.
- [[ADR-010]] Observability Strategy: learning records should summarize evidence and link to trace artifacts rather than duplicate full logs.
- [[ADR-013]] Automated Tech Validator Quality Gate: T1/T3 remain mandatory gates and must emit machine-readable PASS/FAIL/WARN evidence.
- [[ADR-014]] Delta TypeScript Quality Gate: gate evidence must distinguish scoped regressions from legacy debt when relevant.
- [[ADR-023]] QA Tooling: QA/E2E results must become structured evidence for learning, especially flaky or repeated failure modes.
- [[SPEC_GROWTH_OS_HERMES_AGENT_CONTEXT_ISOLATION_9]] and [[SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0]]: Hermes-inspired agents need scoped skills, memory boundaries, traceability, and learning-impact certification.
- `AGENTS.md` / `CLAUDE.md`: docs additions must update `docs/INDEX.md`; E2E/dev server work must use the session pool, never raw port 3000.

## 3. Scope

Implement and document the learning loop architecture for development DAGs:

1. Update `docs/ops/development-kanban-pipeline.md` from T0→T5 to T0→T6.
2. Add an ADR for pipeline self-learning and memory boundaries.
3. Add docs structure and templates:
   - `docs/ai/learning-runs/`
   - `docs/ai/patterns/`
   - `docs/ai/templates/learning-run-template.md`
   - `docs/ai/learning-runs/index.schema.json`
   - `docs/ai/learning-runs/README.md` and `docs/ai/patterns/README.md` if useful.
4. Update `scripts/ai/create-dev-pipeline.mjs` so generated DAGs include T6 `learning-curator` after T5.
5. Define structured task metadata contracts each T0–T6 task should emit.
6. Define safe routing from learning candidates to:
   - skill patch,
   - profile prompt update proposal,
   - ADR or pattern doc,
   - profile-private Holographic fact/fact_store entry,
   - GitHub follow-up issue.
7. Ensure tech-validator, QA, and ops contracts require `learning_candidates` output.
8. Include Villa de Leyva run `villa-leyva-dev-20260514b` as the first manual learning-run example or create an explicit follow-up issue/task for backfill.

## 4. Non-goals

- Do not replace GitHub as implementation source of truth.
- Do not make profile-private memory globally shared by default.
- Do not dump raw logs into docs.
- Do not persist secrets, credentials, tokens, cookie values, raw env values, or raw PII.
- Do not auto-apply profile prompt changes without review.
- Do not auto-apply skill changes except narrow validated operational pitfall patches that already meet Hermes skill maintenance rules.
- Do not build a UI for learning approval in this issue.
- Do not rewrite the Hermes Kanban runtime.

## 5. Target DAG

```txt
T0 specifier
  ↓
T1 tech-validator PLAN gate
  ↓
T2 developer-runner/Codex implementation
  ↓
T3 tech-validator CODE gate
  ↓
T4 QA gate
  ↓
T5 ops/deploy handoff
  ↓
T6 learning-curator
```

T6 runs after T5 because it needs the final branch/commit/PR/deploy outcome, gate evidence, QA evidence, blocked/retry history, and follow-up state. If T5 is skipped for a docs-only or no-deploy task, T5 must still emit a PASS/WARN handoff explaining why deploy/PR was not applicable; T6 still runs.

## 6. Memory model and boundaries

The docs must explain three memory layers and their boundaries.

### Layer 1 — Profile-private Holographic memory/facts

Purpose: durable facts that help a specific profile behave better in future runs.

Examples:
- `specifier` learns a stable repo convention.
- `developer` learns that Codex auth is profile-HOME scoped and preflight must set `HERMES_HOME=/opt/data`.
- `qa-engineer` learns a recurring session-pool pitfall.

Rules:
- Private by default to the profile where the fact is useful.
- Use only compact, durable facts.
- Never store task progress, raw logs, credentials, or one-off TODOs.
- If the fact is cross-profile institutional knowledge, prefer pattern doc, ADR, or GitHub issue over private memory.

### Layer 2 — Kanban operational trace

Purpose: immutable operational history for the current DAG and its tasks.

Examples:
- task bodies,
- parent/child edges,
- comments,
- PASS/FAIL/WARN gate handoffs,
- retry/block events,
- structured metadata.

Rules:
- Treat Kanban as the audit trail, not a curated knowledge base.
- T6 should link/summarize Kanban evidence but not duplicate full logs into docs.
- Retries that resolve blocked gates MUST NOT use `parents=[blocked_gate]`; this remains a pipeline invariant.

### Layer 3 — GitHub/repo institutional knowledge

Purpose: shared source of truth and reusable knowledge for all agents and humans.

Examples:
- GitHub issue/PR/commit links,
- ADRs,
- specs,
- docs/ops runbooks,
- `docs/ai/patterns/*`,
- `docs/ai/learning-runs/*`,
- follow-up issues.

Rules:
- GitHub remains source of truth for feature scope and closure.
- Repo docs are for reviewed, reusable knowledge.
- Learning docs should cite issue, pipeline, task IDs, branch, commit, PR, ADRs, tests, and outcomes.

## 7. Task metadata contract

Every task T0–T6 must emit a structured handoff in Kanban metadata. The exact schema is lightweight JSON-compatible metadata, not a new runtime dependency.

Common fields:

```json
{
  "pipeline_id": "github-542-learning-loop-20260514",
  "github_issue": 542,
  "github_url": "https://github.com/weppa-cloud/bukeer-studio/issues/542",
  "task_id": "t_xxxxxxxx",
  "role": "T0_SPECIFIER | T1_PLAN_GATE | T2_DEVELOPER_RUNNER | T3_CODE_GATE | T4_QA_GATE | T5_OPS_HANDOFF | T6_LEARNING_CURATOR",
  "status": "PASS | FAIL | WARN | BLOCKED | NOT_APPLICABLE",
  "branch": "feat/542-dev-pipeline-learning-loop",
  "commit_sha": null,
  "pr_url": null,
  "adr_refs": ["ADR-003", "ADR-005", "ADR-013", "ADR-014"],
  "changed_files": [],
  "commands": [
    {"cmd": "npm run typecheck", "result": "PASS | FAIL | WARN | SKIPPED", "evidence": "summary only"}
  ],
  "gate_evidence": [
    {"gate": "PLAN | CODE | QA | OPS | LEARNING", "result": "PASS | FAIL | WARN", "evidence": "summary/link"}
  ],
  "failures": [
    {"kind": "test | build | auth | infra | spec | qa | deploy", "summary": "redacted summary", "resolution": "fixed | follow-up | unresolved"}
  ],
  "learning_candidates": [
    {
      "kind": "skill_patch | profile_fact | pattern_doc | adr_update | github_issue | prompt_update",
      "audience": "specifier | developer | tech-validator | qa-engineer | ops | all",
      "summary": "compact reusable lesson",
      "evidence": "task id, commit, doc path, or gate summary",
      "recommended_action": "apply | propose | follow_up | reject",
      "risk": "low | medium | high",
      "redaction_checked": true
    }
  ],
  "follow_up_issues": []
}
```

Role-specific requirements:

- T0: `spec_path`, `adr_refs`, `acceptance_criteria_count`, `non_goals`, `validation_plan`.
- T1: `plan_gate_result`, `blocking_findings`, `watch_items`, `adr_alignment`.
- T2: `branch`, `commit_sha`, `changed_files`, `commands`, `test_results`, `implementation_risks`.
- T3: `code_gate_result`, `security_result`, `typecheck_result`, `regression_result`, `secret_scan_result`.
- T4: `qa_gate_result`, `routes_or_surfaces_checked`, `browser_matrix`, `accessibility_result`, `console_result`.
- T5: `ops_result`, `pr_url`, `merge_target`, `deploy_target`, `rollback_plan`, `monitoring_notes`.
- T6: `learning_run_path`, `patterns_created`, `skill_patches_proposed`, `facts_proposed`, `follow_up_issues`, `rejected_candidates`.

## 8. Learning candidate routing rules

T6 must classify each candidate before writing anything durable.

| Candidate type | Save as | Apply rules |
|---|---|---|
| Repeated operational pitfall with exact fix | Skill patch | Apply only if narrow, validated, non-secret, and profile/tool-specific. Otherwise propose. |
| Stable profile-local preference or environment fact | Holographic fact/fact_store | Save only for the profile that needs it. Keep compact. No task progress. |
| Cross-profile implementation or QA pattern | `docs/ai/patterns/*.md` | Requires repo-doc PR/commit review. Include ADR refs and example evidence. |
| Architecture decision or boundary | ADR | Add new ADR or update existing ADR only when it changes decision-level guidance. |
| Product/engineering follow-up | GitHub issue | Use GitHub when work remains open, owned, or needs prioritization. |
| Prompt/profile behavior change | Prompt update proposal | Do not auto-apply by default. Document proposed diff and reviewer. |
| One-off failure/noise | Reject | Record in T6 rejected candidates with reason; do not persist elsewhere. |

All candidates must pass redaction review:

- replace tokens/secrets with `[REDACTED]`,
- summarize logs instead of copying logs,
- avoid raw PII,
- include evidence links/IDs instead of sensitive payloads,
- reject candidates whose value depends on secret values.

## 9. Required docs/artifacts

### 9.1 ADR

Create the next available Studio ADR, expected path:

- `docs/architecture/ADR-030-dev-pipeline-self-learning.md`

Required ADR contents:

- status/date/principles,
- context: T0→T5 lacks durable learning closure,
- decision: add T6 learning-curator and memory boundaries,
- consequences,
- memory layer rules,
- security/redaction rules,
- relation to ADR-003, ADR-005, ADR-010, ADR-013, ADR-014, ADR-023.

If `ADR-030` is already used at implementation time, choose the next available number and update all references.

### 9.2 Pipeline docs

Modify:

- `docs/ops/development-kanban-pipeline.md`

Required updates:

- DAG diagram includes T6.
- T6 role contract explains learning curation after T5.
- Gate contracts require PASS/FAIL/WARN evidence.
- T2/T3/T4/T5 contracts require `learning_candidates` metadata.
- Retry invariant remains explicit: retries resolving blocked gates MUST NOT use `parents=[blocked_gate]`.
- Document that `T6` can create a GitHub follow-up or repo pattern but does not silently share profile-private memory.

### 9.3 Learning docs structure

Create:

- `docs/ai/learning-runs/README.md`
- `docs/ai/learning-runs/index.schema.json`
- `docs/ai/templates/learning-run-template.md`
- `docs/ai/patterns/README.md`

Recommended optional first example:

- `docs/ai/learning-runs/2026-05-14-villa-leyva-dev-20260514b.md`

If the Villa de Leyva backfill is not included in this implementation, create or document a follow-up with enough context to backfill it later.

### 9.4 Learning-run template minimum sections

`docs/ai/templates/learning-run-template.md` must include:

```md
# Learning run — <title>

- GitHub issue:
- Pipeline ID:
- Date:
- Branch:
- PR:
- Commits:
- Task IDs:
- ADR refs:
- Spec refs:

## Outcome
PASS/FAIL/WARN summary.

## Evidence links
Kanban tasks, PR, commits, docs, test reports.

## Commands and gates
Summaries only; no raw secrets or full logs.

## Failures and retries
What failed, why, and how it was resolved.

## Reusable patterns
What should future runs reuse?

## Learning candidates
Table with type, audience, recommendation, evidence, decision.

## Applied learning
Skill patches, facts, ADRs, pattern docs, follow-up issues.

## Rejected learning
Noise/transient findings intentionally not persisted.

## Redaction checklist
No secrets, no raw logs, no raw PII, evidence summarized.
```

### 9.5 `index.schema.json`

The schema must validate a learning-run index entry or learning-run frontmatter/object with at least:

- `id`,
- `title`,
- `date`,
- `pipeline_id`,
- `github_issue`,
- `task_ids`,
- `branch`,
- `commits`,
- `pr_url`,
- `adr_refs`,
- `spec_refs`,
- `outcome`,
- `learning_candidates`,
- `applied_learning`,
- `follow_up_issues`,
- `redaction_checked`.

Use JSON Schema draft 2020-12 or document equivalent if the repo prefers schema docs over machine validation. Prefer machine-readable JSON Schema to satisfy ADR-003.

### 9.6 Pattern docs

`docs/ai/patterns/README.md` must explain:

- pattern docs are reviewed institutional knowledge,
- patterns are not raw task logs,
- each pattern needs source evidence and ADR refs,
- examples: auth/preflight pitfalls, session-pool usage, retry DAG invariant, feature-branch setup.

## 10. `create-dev-pipeline.mjs` implementation requirements

Modify `scripts/ai/create-dev-pipeline.mjs`:

1. Header comment and output graph describe T0→T6.
2. `common.acceptanceContract` includes:
   - GitHub issue/source-of-truth when provided,
   - every gate returns PASS/FAIL/WARN with evidence,
   - retries resolving blocked gates MUST NOT use `parents=[blocked_gate]`,
   - structured `learning_candidates` emitted by T1–T5,
   - no secrets/raw logs in learning artifacts.
3. Add optional CLI args if not already available:
   - `--github-issue <number>`
   - `--github-url <url>`
   - `--source-of-truth github`
   These can be lightweight fields in task bodies; no GitHub API dependency required.
4. Add T6 task creation after T5:

```js
const t6Body = JSON.stringify({
  ...common,
  role: "T6_LEARNING_CURATOR",
  input: "Curate learning after T5 ops handoff. Read all parent task handoffs and Kanban trace.",
  instructions: [
    "Create or update docs/ai/learning-runs/<date>-<pipelineId>.md using docs/ai/templates/learning-run-template.md.",
    "Classify learning_candidates into skill_patch, profile_fact, pattern_doc, adr_update, github_issue, prompt_update, or rejected_noise.",
    "Do not persist secrets, raw logs, credentials, tokens, cookie values, or raw PII.",
    "Prefer GitHub/repo docs for shared institutional knowledge; keep profile-private facts scoped.",
    "If Villa de Leyva backfill applies and no example exists, create it or open/document a follow-up.",
    "Return PASS/FAIL/WARN with learning_run_path, applied/proposed learning, rejected candidates, and follow_up_issues."
  ]
}, null, 2);

const t6 = createTask({
  key: "T6-learning-curator",
  taskTitle: `[${pipelineId}] T6 LEARNING CURATOR — ${title}`,
  assignee: "learning-curator",
  body: t6Body,
  parents: [t5.id],
  skills: [],
  maxRuntime: "90m",
});
```

5. Include `t6` in `tasks` graph output.
6. Keep dry-run mode working.
7. Keep idempotency keys stable: `${pipelineId}:T6-learning-curator`.
8. Do not require `gh` CLI for generation; this environment may not have `gh` installed.

## 11. Suggested implementation plan

### Task A — Docs skeleton and template

Files:
- Create `docs/ai/learning-runs/README.md`
- Create `docs/ai/templates/learning-run-template.md`
- Create `docs/ai/learning-runs/index.schema.json`
- Create `docs/ai/patterns/README.md`

Steps:
1. Create directories and docs.
2. Include redaction and memory-layer rules.
3. Include the learning-run template sections from this SPEC.
4. Run a JSON parser/schema sanity check on `index.schema.json`.

Verification:

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/ai/learning-runs/index.schema.json','utf8')); console.log('schema json ok')"
```

Expected: `schema json ok`.

### Task B — ADR

Files:
- Create `docs/architecture/ADR-030-dev-pipeline-self-learning.md` or next available ADR.

Steps:
1. Check next available ADR number.
2. Write ADR with decision and boundaries.
3. Reference ADR-003/005/010/013/014/023.

Verification:

```bash
test -f docs/architecture/ADR-030-dev-pipeline-self-learning.md
```

Expected: exit 0, or equivalent next-number file exists.

### Task C — Pipeline docs

Files:
- Modify `docs/ops/development-kanban-pipeline.md`

Steps:
1. Update DAG to T0→T6.
2. Add T6 role contract.
3. Add metadata contract and learning candidate routing section.
4. Preserve session-pool and retry invariant guidance.

Verification:

```bash
grep -n "T6 learning-curator" docs/ops/development-kanban-pipeline.md
grep -n "learning_candidates" docs/ops/development-kanban-pipeline.md
```

Expected: both commands find entries.

### Task D — Pipeline generator

Files:
- Modify `scripts/ai/create-dev-pipeline.mjs`

Steps:
1. Add optional GitHub/source args.
2. Add learning candidate contract to common/task bodies.
3. Add T6 body and task after T5.
4. Include T6 in graph.
5. Keep dry-run and apply modes intact.

Verification:

```bash
node scripts/ai/create-dev-pipeline.mjs \
  --title "Test learning loop" \
  --scope "Dry-run check" \
  --pipeline-id test-learning-loop \
  --github-issue 542 \
  --github-url https://github.com/weppa-cloud/bukeer-studio/issues/542 \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.graph.some(t=>/T6 LEARNING CURATOR/.test(t.title))) process.exit(1); console.log('T6 dry-run ok')})"
```

Expected: `T6 dry-run ok`.

### Task E — Villa de Leyva backfill decision

Files:
- Prefer create `docs/ai/learning-runs/2026-05-14-villa-leyva-dev-20260514b.md`
- Or create a GitHub follow-up / Kanban follow-up if implementation wants a separate run.

Minimum content if backfilled now:
- GitHub/source context if known.
- Pipeline ID `villa-leyva-dev-20260514b`.
- Spec path `docs/specs/generated/villa-leyva-dev-20260514b-SPEC.md`.
- Branch `feat/fix-villa-de-leyva-destination-bug`.
- Known outcome/evidence from Kanban handoffs.
- Lessons:
  - destination source of truth was dynamic RPC from `websites.featured_products`, not a standalone destinations table,
  - canonical typo alias `Villa de Leiva` must map to `Villa de Leyva`,
  - data-first remediation before code path where possible,
  - no raw Supabase credentials/logs persisted.

Verification:

```bash
test -f docs/ai/learning-runs/2026-05-14-villa-leyva-dev-20260514b.md || grep -n "Villa de Leyva" docs/ai/learning-runs/README.md
```

Expected: example exists or explicit follow-up is documented.

### Task F — Index update

Files:
- Modify `docs/INDEX.md`

Steps:
1. Add ADR row.
2. Add ops row for development pipeline if missing.
3. Add AI learning docs rows or a short `AI development learning` section.
4. Add concept graph entry for `[[dev-pipeline-learning-loop]]` / `[[learning-loop]]` if needed.

Verification:

```bash
grep -n "dev-pipeline-learning" docs/INDEX.md
grep -n "development-kanban-pipeline" docs/INDEX.md
```

Expected: both references found.

## 12. Acceptance criteria

AC1 — T6 exists in generated DAG
- PASS if `scripts/ai/create-dev-pipeline.mjs` dry-run graph includes a T6 task titled `T6 LEARNING CURATOR`.
- PASS if T6 depends on T5 and not earlier gates.
- FAIL if the generated graph stops at T5.

AC2 — Learning docs explain three memory layers
- PASS if docs explain profile-private memory/facts, Kanban operational trace, and GitHub/repo institutional knowledge.
- FAIL if docs imply all profile memories are globally shared by default.

AC3 — Template and schema exist
- PASS if `docs/ai/templates/learning-run-template.md` exists and includes issue, pipeline ID, tasks, branch, commit, PR, ADRs, tests, outcome, failures, reusable patterns, skill patch candidates, follow-ups, and redaction checklist.
- PASS if `docs/ai/learning-runs/index.schema.json` is valid JSON and captures core fields.

AC4 — Routing rules are documented
- PASS if docs define when to save to skill vs fact_store/Holographic fact vs ADR vs pattern doc vs GitHub issue vs prompt update proposal.
- PASS if rejected/noisy candidates have an explicit path.

AC5 — T1/T3/T4/T5 require learning candidates
- PASS if pipeline docs and generated task bodies require structured `learning_candidates` output for tech-validator, QA, and ops contracts.
- WARN acceptable if T0/T2 candidate emission is optional, but T1/T3/T4/T5 must be required.

AC6 — Villa de Leyva first example or follow-up
- PASS if `docs/ai/learning-runs/2026-05-14-villa-leyva-dev-20260514b.md` exists and is redacted.
- WARN acceptable if a clear follow-up issue/task is created or documented with the required backfill context.
- FAIL if Villa de Leyva is omitted entirely.

AC7 — Security/redaction
- PASS if docs and generator instructions forbid secrets, credentials, raw logs, raw env values, tokens, cookies, and raw PII in learning artifacts.
- PASS if templates include a redaction checklist.

AC8 — ADR and index
- PASS if a self-learning ADR exists and `docs/INDEX.md` links the ADR, pipeline docs, and learning docs.

AC9 — Existing pipeline invariants preserved
- PASS if retry invariant remains: retries resolving blocked gates MUST NOT use `parents=[blocked_gate]`.
- PASS if session-pool rule remains for E2E/dev server work.
- PASS if GitHub remains source of truth.

## 13. Validation plan

Run these after implementation:

```bash
# JSON schema sanity
node -e "JSON.parse(require('fs').readFileSync('docs/ai/learning-runs/index.schema.json','utf8')); console.log('schema json ok')"

# Generator dry-run includes T6
node scripts/ai/create-dev-pipeline.mjs \
  --title "Test learning loop" \
  --scope "Dry-run check" \
  --pipeline-id test-learning-loop \
  --github-issue 542 \
  --github-url https://github.com/weppa-cloud/bukeer-studio/issues/542 \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); const t6=j.graph.find(t=>/T6 LEARNING CURATOR/.test(t.title)); if(!t6 || !t6.parents?.length) process.exit(1); console.log('T6 dry-run ok')})"

# Required docs references
grep -n "T6 learning-curator" docs/ops/development-kanban-pipeline.md
grep -n "learning_candidates" docs/ops/development-kanban-pipeline.md
grep -n "dev-pipeline-learning" docs/INDEX.md

# Existing local quality gates where applicable
npm run typecheck
npm run lint
```

Notes:
- If full `npm run typecheck` or `npm run lint` fails due unrelated legacy/dirty repo state, T3 must classify evidence per ADR-014 and report new vs legacy blockers.
- Do not run raw `npm run dev`, raw `npm run test:e2e`, or raw Playwright on port 3000.

## 14. Rollout plan

1. Implement docs/schema/ADR first.
2. Update generator in dry-run mode only.
3. Run generator dry-run validation for issue #542.
4. Run JSON/doc grep validations.
5. Run typecheck/lint if implementation touches JS beyond docs.
6. Pass T3 CODE gate.
7. Pass T4 QA/docs verification gate.
8. Use T5 for PR/merge handoff.
9. T6 creates the first learning run and curates candidates.

## 15. Rollback plan

For docs-only pieces:
- Revert added docs/ADR/template/schema files and `docs/INDEX.md` links.

For generator change:
- Revert `scripts/ai/create-dev-pipeline.mjs` to T0→T5 graph.
- Existing already-created T6 tasks can be archived manually if needed; do not mutate historical Kanban trace.

For learning-run docs:
- Remove or amend only via a follow-up commit; do not rewrite already-published GitHub/PR history without review.

## 16. Touched files / artifacts

Expected files:

- `docs/specs/generated/github-542-learning-loop-20260514-SPEC.md` (this SPEC)
- `docs/architecture/ADR-030-dev-pipeline-self-learning.md` or next available ADR
- `docs/ops/development-kanban-pipeline.md`
- `docs/ai/learning-runs/README.md`
- `docs/ai/learning-runs/index.schema.json`
- `docs/ai/templates/learning-run-template.md`
- `docs/ai/patterns/README.md`
- Optional: `docs/ai/learning-runs/2026-05-14-villa-leyva-dev-20260514b.md`
- `scripts/ai/create-dev-pipeline.mjs`
- `docs/INDEX.md`

No database migrations are expected.
No runtime Next.js UI changes are expected.
No secrets should be added to any artifact.

## 17. Implementation handoff checklist

- [ ] Start from `dev` and create/use `feat/542-dev-pipeline-learning-loop` when repo state allows; do not overwrite unrelated dirty files.
- [ ] Preserve current dirty work from other active pipelines.
- [ ] Create docs/schema/template/ADR before generator change.
- [ ] Update generator dry-run graph to include T6.
- [ ] Require `learning_candidates` in T1/T3/T4/T5 task bodies.
- [ ] Include or explicitly follow up Villa de Leyva backfill.
- [ ] Update `docs/INDEX.md`.
- [ ] Run validation plan and record PASS/FAIL/WARN evidence.
- [ ] Pass tech-validator MODE:PLAN before implementation.
- [ ] Pass tech-validator MODE:CODE before merge.
