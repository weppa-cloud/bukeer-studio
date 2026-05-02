# SPEC: Growth OS Agent Model And Workflow Registry

Status: Accepted implementation layer for EPIC #310 / #404  
Tenant baseline: ColombiaTours (`colombiatours.travel`)  
Created: 2026-05-02  
Owner: Growth OS Orchestrator + Studio Platform  
Related: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](./SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md)

## Purpose

Define how Growth OS chooses models, prompts and workflows for the Symphony
runtime. The runtime must not hardcode agent behavior. It resolves the active
agent definition from Supabase, loads a versioned workflow from git, composes a
tenant context pack and writes a review artifact.

Official rule:

```text
growth_agent_definitions -> workflow version -> context pack
  -> source row/facts -> runtime artifact -> review_required
```

## Provider Decision

The v1 runtime standardizes on OpenAI model IDs in `growth_agent_definitions`.
OpenRouter-compatible endpoints may remain as fallback transport, but the
agent registry stores provider-neutral OpenAI model IDs so Studio and Council
can reason about lane capability consistently.

Default model map:

| Lane                    | Model          | Mode           | Why                                                   |
| ----------------------- | -------------- | -------------- | ----------------------------------------------------- |
| `orchestrator`          | `gpt-5.4-mini` | `observe_only` | Routing, gates and summaries need speed and low cost. |
| `technical_remediation` | `gpt-5-codex`  | `prepare_only` | Technical SEO/code reasoning and smoke handoff.       |
| `transcreation`         | `gpt-5.5`      | `prepare_only` | Market adaptation, quality and E-E-A-T judgment.      |
| `content_creator`       | `gpt-5.5`      | `prepare_only` | Competitive briefs and people-first content strategy. |
| `content_curator`       | `gpt-5.5`      | `prepare_only` | Curator/Council judgment and experiment readiness.    |

Safety remains unchanged:

- content publish, transcreation merge, paid mutation and experiment activation
  are never automatic;
- technical `auto_apply_safe` requires lane agreement `>= 0.90` and smoke
  verification;
- Orchestrator never mutates business surfaces directly.

## Workflow Files

Workflows are versioned markdown files under:

```text
docs/growth-orchestrator/workflows/
  orchestrator.v1.md
  technical-remediation.v1.md
  transcreation.v1.md
  content-creator.v1.md
  content-curator.v1.md
```

`growth_agent_definitions.workflow_version` stores the filename stem. The VPS
runtime loads the matching file on each run and records the workflow path in
the artifact. If a workflow file is missing, the run must fail closed into
`review_required`/artifact evidence rather than applying a mutation.

## Runtime Environment

Preferred direct OpenAI transport:

```text
OPENAI_API_KEY=<secret>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-5.4-mini
```

Fallback OpenAI-compatible transport remains supported while subscription
credentials are rolled out:

```text
OPENROUTER_AUTH_TOKEN=<secret>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=<fallback model>
```

The runtime may run without an LLM call in `observe_only`; it must still write
the selected `model`, `prompt_version`, `workflow_version`, context pack and
transport readiness into the artifact.

## Acceptance Criteria

- ColombiaTours has one enabled `growth_agent_definitions` row per lane,
  locale and market with the OpenAI model map above.
- A single active context pack exists for ColombiaTours `es-CO` / `CO`.
- Runtime artifacts include selected model, prompt version, workflow version,
  workflow path, context pack version and LLM transport readiness.
- Bukeer Studio Agent Team displays model, prompt and workflow version from
  the registry.
- VPS runtime can restart with the new code and continue claiming only eligible
  work.
