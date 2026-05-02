# SPEC: Growth OS Control Plane UX

Status: Accepted implementation layer for EPIC #310 / SPEC #337  
Tenant baseline: ColombiaTours (`colombiatours.travel`)  
Audience v1: internal operators for ColombiaTours beta partner  
Created: 2026-05-02  
Owner: Growth OS Orchestrator + Studio Product  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related SPECs: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](./SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md), [SPEC_GROWTH_OS_SSOT_MODEL](./SPEC_GROWTH_OS_SSOT_MODEL.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER](./SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md)

## Purpose

Define the human-facing control plane for Growth OS in Bukeer Studio. The
runtime, ledgers and provider caches are already technical infrastructure; this
SPEC defines how internal operators understand and act on them without reading
raw tables, JSON payloads or GitHub threads.

Official rule:

```text
GitHub / #310 = implementation SSOT
Supabase / Bukeer Studio = operational Growth SSOT
VPS runtime = agent execution plane
Bukeer Studio UI = human control plane
Council = experiment approval
```

The UX is inspired by Paperclip-style agent control planes: agents behave like a
visible team with goals, heartbeats, tickets, budget awareness, approval gates
and audit trail. Bukeer does not copy the "zero-human company" model; Growth OS
remains human-gated for content, transcreation, paid mutation and experiments.

## Human Vocabulary

The UI must translate implementation nouns into operator language.

| Technical object             | UI label                 | Human meaning                                      |
| ---------------------------- | ------------------------ | -------------------------------------------------- |
| `growth_profile_runs`        | Fuentes de datos         | Provider/profile refreshes that produced evidence. |
| provider/fact tables         | Evidencia                | Signals supporting a decision.                     |
| `growth_backlog_candidates`  | Oportunidades detectadas | Raw opportunities found by automation.             |
| `growth_backlog_items`       | Backlog priorizado       | Reviewed work ready for routing or blocking.       |
| `growth_agent_runs`          | Trabajo del agente       | A claimed agent task with artifact and timeline.   |
| `review_required`            | Requiere revision        | Human/Curator decision needed before applying.     |
| `growth_experiments`         | Experimentos activos     | Council-approved measured readouts.                |
| `seo_provider_cache` / usage | Salud de datos y costo   | Freshness, provider status and spend context.      |

The default operator question is:

```text
What needs attention now, why does it matter, what evidence supports it,
who owns the next decision, and what is safe to do?
```

## UX Principles

| Principle                   | Requirement                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| Task-manager first          | Show work, decisions, blockers and owners before technical rows.         |
| Agent team visibility       | Show each lane as a team member with mission, mode, heartbeat and queue. |
| Review queue default        | Runs requiring review must be more prominent than historical logs.       |
| Evidence without overload   | Summaries first; raw JSON only collapsed under advanced details.         |
| Governance by design        | Creator cannot approve its own content; Council approves experiments.    |
| Cost and freshness visible  | Provider health and paid calls must be inspectable before decisions.     |
| Tenant-safe                 | Every read is scoped by `account_id + website_id`; no cross-tenant rows. |
| No provider calls in render | UI reads Supabase/cache/artifacts only.                                  |

## Information Architecture

Route root:

```text
/dashboard/[websiteId]/growth
```

Operational tabs:

| Tab            | Primary user question             | Reads                                     |
| -------------- | --------------------------------- | ----------------------------------------- |
| Command Center | What needs attention now?         | agents, runs, backlog, provider freshness |
| Agent Team     | What is each agent allowed to do? | agent definitions, run counts, heartbeats |
| Opportunities  | What should we work on?           | backlog items, content tasks              |
| Review Queue   | What must a human decide?         | agent runs, events, AI/human reviews      |
| Experiments    | What is being measured?           | experiments, Council-ready backlog        |
| Data Health    | Can we trust the data?            | provider cache, profile usage, run health |

The legacy Growth Inventory remains reachable for #311 compatibility, but daily
operation should route users through Opportunities and Experiments.

## Operational Flow

```text
fuentes de datos
  -> evidencia
  -> oportunidades detectadas
  -> backlog priorizado
  -> trabajo del agente
  -> requiere revision
  -> Council
  -> experimentos activos
  -> resultados y aprendizaje
```

UI state mapping:

| State                               | Operator copy          | Default action                        |
| ----------------------------------- | ---------------------- | ------------------------------------- |
| `queued` / `approved_for_execution` | Listo para agente      | Wait for claim or assign.             |
| `claimed` / `running`               | En progreso por agente | Observe heartbeat.                    |
| `review_required`                   | Requiere revision      | Approve, reject or request evidence.  |
| `blocked`                           | Bloqueado              | Resolve blocker or route to lane.     |
| `watch`                             | En observacion         | Wait for more evidence or next cycle. |
| `completed` / `done`                | Completado             | Verify measurement/readout.           |

## Screen Contracts

### Command Center

Must show:

- Growth OS implementation state for #310 (`PASS-WITH-WATCH operativo` until
  gates prove otherwise).
- "Needs attention now" list: review-required runs, blocked backlog, stale
  provider data and active experiment warnings.
- Agent activity summary with enabled agents and last heartbeat.
- Data freshness summary without provider calls.
- Experiment count and Council cap status.

### Agent Team

Must show one card or row per canonical lane:

- mission and owner issue;
- mode: `observe_only`, `prepare_only`, `auto_apply_safe`;
- agreement threshold;
- enabled/disabled state;
- pending work and latest heartbeat if available;
- safety rule for the lane.

### Opportunities

Must show reviewed backlog in human terms:

- opportunity title;
- impact/priority when available;
- evidence/source refs summary;
- lane owner;
- status;
- blocker;
- next action;
- Council readiness.

Operational batches can be large. Experiments remain capped and independent.

### Review Queue

Must default to runs needing human action:

- run status and lane;
- agent name;
- what the agent produced;
- evidence summary;
- confidence/agreement when present;
- risk and required action;
- approve/reject/request-more-evidence controls, role-gated.

Timeline/events remain append-only. Artifact paths are never exposed raw.

### Experiments

Must separate:

- active/planned experiments;
- Council-ready proposals;
- rejected or blocked proposals;
- operational work that should not be measured as an experiment.

No experiment may activate without source row, baseline, owner, success metric
and evaluation date.

### Data Health

Must show:

- provider status for GSC, GA4, DataForSEO, tracking and LLM where available;
- freshness timestamps;
- latest successful profile/run;
- cost or usage when available;
- blockers requiring access, config or paid approval.

## Safety Rules

- Content publish, transcreation merge, paid/campaign mutation and experiment
  activation always require human/Curator/Council approval.
- Technical auto-apply remains limited to reversible, smoke-verifiable work
  and requires lane agreement `>= 0.90`.
- No raw provider payload, PII, secrets or raw artifact paths in GitHub or UI.
- Bukeer Studio may summarize operational evidence; GitHub receives aggregated
  cycle summaries and gate decisions only.

## Acceptance Criteria

- Internal operator can identify in under 30 seconds:
  - what needs review;
  - which agent produced it;
  - what evidence exists;
  - what is blocked;
  - what experiment is active;
  - which data source is stale or failing.
- E2E verifies navigation, tenant scope, 5 agent lanes, review-required runs and
  no event mutation affordances.
- UI remains useful when tables are empty or partially provisioned.
- Production exposure remains gated by `GROWTH_OS_UI_ENABLED`.
