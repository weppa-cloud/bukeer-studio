# Bukeer Studio Development Kanban Pipeline

Workflow operacional para features/fixes de código en `bukeer-studio`.

## DAG

```txt
T0 specifier (Codex) → SPEC
  ↓
T1 tech-validator (DeepSeek) → PLAN GATE
  ↓
T2 developer-runner (terminal) → Codex CLI implementa
  ↓
T3 tech-validator (DeepSeek) → CODE GATE
  ↓
T4 qa-engineer (DeepSeek) → QA/E2E/WCAG GATE
  ↓
T5 ops (DeepSeek) → PR/merge/deploy handoff
  ↓
T6 learning-curator → learning-run / patterns / follow-ups
```

T6 runs after T5 because it needs the final branch, commit, PR, deploy/no-deploy outcome, gate evidence, QA evidence, blocked/retry history, and follow-up state. If deploy is not applicable, T5 still emits PASS/WARN evidence explaining why; T6 still runs.

## Principio clave

T2 **no depende** de que el worker kanban sea el modelo que codea. El worker debe tener terminal/git y ejecutar:

```bash
PATH=/opt/data/.npm-global/bin:$PATH codex exec --full-auto --ephemeral "<implementation prompt>"
```

Codex CLI es el motor de implementación. Hermes/Kanban es el runtime de orquestación, logs, gates, retries y learning loop.

## Scripts

### Preflight

```bash
npm run dev-pipeline:preflight
npm run dev-pipeline:preflight -- --allow-main
node scripts/ai/dev-pipeline-preflight.mjs --json --allow-main
```

Valida:
- gateway/dispatcher corriendo
- perfiles `specifier`, `tech-validator`, `developer`, `qa-engineer`, `ops`
- `kanban.db` alcanzable
- Node >= 22
- branch `dev` para runs reales
- Codex CLI en PATH o `/opt/data/.npm-global/bin/codex`
- `codex login status`
- watchdog disponible en `/opt/data/scripts/kanban-watchdog.py`

### Crear pipeline

Dry-run por defecto:

```bash
npm run dev-pipeline:create --   --title "Fix Villa de Leyva destination bug"   --scope "Diagnose and fix destination rendering/search/SEO issue for Villa de Leyva"
```

Crear tareas reales:

```bash
npm run dev-pipeline:create --   --apply   --title "Fix Villa de Leyva destination bug"   --scope "Diagnose and fix destination rendering/search/SEO issue for Villa de Leyva"   --priority high

hermes kanban dispatch --max 3
```

## Contratos de gates

- Todo gate devuelve `PASS`, `WARN` o `FAIL` con evidencia.
- T1/T3/T4/T5 deben emitir `learning_candidates` estructurados en metadata.
- Si un gate falla y crea retry, el retry **NO** debe tener `parents=[blocked_gate]`.
- El retry debe recibir contexto completo en body/comments.
- El watchdog/orquestador desbloquea el gate cuando el retry termina.
- GitHub issue/PR siguen siendo source of truth para alcance y cierre.

### Common metadata contract

Cada tarea T0–T6 debe devolver metadata JSON-compatible con campos comunes cuando apliquen:

```json
{
  "pipeline_id": "dev-...",
  "github_issue": null,
  "github_url": null,
  "task_id": "t_xxxxxxxx",
  "role": "T0_SPECIFIER | T1_PLAN_GATE | T2_DEVELOPER_RUNNER | T3_CODE_GATE | T4_QA_GATE | T5_OPS_HANDOFF | T6_LEARNING_CURATOR",
  "status": "PASS | FAIL | WARN | BLOCKED | NOT_APPLICABLE",
  "branch": "feat/...",
  "commit_sha": null,
  "pr_url": null,
  "adr_refs": [],
  "changed_files": [],
  "commands": [{"cmd": "npm run typecheck", "result": "PASS", "evidence": "summary only"}],
  "gate_evidence": [{"gate": "PLAN | CODE | QA | OPS | LEARNING", "result": "PASS", "evidence": "summary/link"}],
  "failures": [],
  "learning_candidates": [],
  "follow_up_issues": []
}
```

Role-specific additions:
- T0: `spec_path`, `adr_refs`, `acceptance_criteria_count`, `non_goals`, `validation_plan`.
- T1: `plan_gate_result`, `blocking_findings`, `watch_items`, `adr_alignment`, `learning_candidates`.
- T2: `branch`, `commit_sha`, `changed_files`, `commands`, `test_results`, `implementation_risks`, `learning_candidates` when implementation discovers durable lessons.
- T3: `code_gate_result`, `security_result`, `typecheck_result`, `regression_result`, `secret_scan_result`, `learning_candidates`.
- T4: `qa_gate_result`, `routes_or_surfaces_checked`, `browser_matrix`, `accessibility_result`, `console_result`, `learning_candidates`.
- T5: `ops_result`, `pr_url`, `merge_target`, `deploy_target`, `rollback_plan`, `monitoring_notes`, `learning_candidates`.
- T6: `learning_run_path`, `patterns_created`, `skill_patches_proposed`, `facts_proposed`, `follow_up_issues`, `rejected_candidates`, `redaction_checked`.

## Validaciones obligatorias para T2

T2 debe devolver:
- branch
- commit SHA
- PR URL si aplica
- archivos modificados
- comandos ejecutados
- resultado de `npm run typecheck`
- resultado de `npm run lint`
- tests relevantes
- riesgos/TODOs
- learning_candidates si descubre lecciones reutilizables

Para E2E/dev server usar session pool:

```bash
npm run session:list
npm run session:run -- --grep "<area>"
```

Nunca usar puerto 3000 desde agentes.

## T6 learning-curator

T6 clasifica candidatos y decide dónde persisten:

| Candidate type | Save as | Apply rules |
| --- | --- | --- |
| `skill_patch` | Hermes skill patch | Apply only if narrow, validated, non-secret, and profile/tool-specific; otherwise propose. |
| `profile_fact` | Profile-private Holographic fact/fact_store | Save only for the profile that needs it. Keep compact. No task progress or raw logs. |
| `pattern_doc` | `docs/ai/patterns/*.md` | Reviewed institutional knowledge with source evidence and ADR refs. |
| `adr_update` | ADR add/update | Use only for decision-level guidance or memory boundary changes. |
| `github_issue` | GitHub follow-up | Use when work remains open, owned, or needs prioritization. |
| `prompt_update` | Prompt update proposal | Do not auto-apply. Document proposed diff/reviewer. |
| `rejected_noise` | T6 rejected candidates | Record reason; do not persist elsewhere. |

T6 can create a GitHub follow-up or repo pattern, but it must not silently share profile-private memory across profiles.

## Memory boundaries

- Profile-private memory/facts: profile-scoped durable facts only.
- Kanban trace: immutable operational audit trail, summarized/linked by T6.
- GitHub/repo knowledge: reviewed shared source of truth for ADRs, specs, patterns, and learning runs.

No learning artifact may persist secrets, credentials, tokens, cookie values, raw env values, raw PII, or full raw logs. Use `[REDACTED]` and summarize evidence.

## Self-healing

El pipeline asume que `kanban-watchdog` está activo como cron. El preflight solo verifica que el script exista; el orquestador debe revisar cron si hay síntomas de crash-loop.

Known failure modes:
- perfil faltante → crash-loop infinito si watchdog no corre
- Codex no está en PATH → T2 bloquea temprano
- Node v20 → Next.js build/dev falla; usar Node >= 22
- repo en `main` → preflight falla para runs reales; setup-only puede usar `--allow-main`
- learning-curator profile faltante → T6 no dispatcha; crear perfil o documentar follow-up antes de aplicar pipelines reales
