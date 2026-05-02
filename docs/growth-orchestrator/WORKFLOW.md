---
name: growth-os-symphony-orchestrator
version: growth-workflow-2026-05-v1
control_plane: supabase_bukeer_studio
runtime: vps_docker
epic: https://github.com/weppa-cloud/bukeer-studio/issues/310
spec: ../specs/SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md
---

# Growth OS Symphony Workflow

This workflow defines how the Growth OS orchestrator claims work, runs agents
and returns evidence. It is intentionally tenant-scoped.

## Tracker

```yaml
kind: supabase_growth
required_scope:
  - account_id
  - website_id
eligible_sources:
  - growth_backlog_items
  - growth_content_tasks
  - growth_experiments
active_statuses:
  - queued
  - ready_for_brief
  - brief_in_progress
  - ready_for_council
  - approved_for_execution
  - blocked
terminal_statuses:
  - done
  - rejected
  - closed
```

## Runtime

```yaml
polling:
  interval_ms: 30000
workspace:
  root: /workspaces
artifacts:
  root: /artifacts
agent:
  max_concurrent_agents: 3
  max_concurrent_agents_per_tenant: 1
  max_turns: 12
  stall_timeout_ms: 300000
  heartbeat_interval_ms: 30000
```

## Lane Limits

```yaml
lanes:
  technical_remediation_agent:
    max_concurrent: 1
    allowed_modes: [observe_only, prepare_only, auto_apply_safe]
  transcreation_growth_agent:
    max_concurrent: 1
    allowed_modes: [observe_only, prepare_only]
  content_creator_agent:
    max_concurrent: 1
    allowed_modes: [observe_only, prepare_only]
  content_curator_council_operator_agent:
    max_concurrent: 1
    allowed_modes: [observe_only, prepare_only]
  growth_orchestrator_blocked_router:
    max_concurrent: 1
    allowed_modes: [observe_only, prepare_only]
```

## Safety Policy

```yaml
automation:
  default_mode: prepare_only
  auto_apply_enabled_default: false
  agreement_threshold: 0.90
  content_publish_requires_human: true
  transcreation_publish_requires_human: true
  paid_mutation_requires_human: true
  experiment_activation_requires_council: true
```

## Prompt Contract

Each agent prompt must include:

- tenant scope: `account_id`, `website_id`;
- source row: table, id, status, title, entity key;
- lane contract from `SPEC_GROWTH_OS_AGENT_LANES`;
- allowed actions for the agent definition;
- source facts and freshness;
- prior AI/human reviews;
- expected artifact path;
- required final state.

## Final Output Contract

Each run must write:

- `growth_agent_runs` status update;
- append-only `growth_agent_run_events`;
- artifact JSON/MD;
- `growth_ai_reviews` when model judgment is used;
- `growth_human_reviews` handoff when approval is required;
- aggregate GitHub evidence only when implementation gate changes.
