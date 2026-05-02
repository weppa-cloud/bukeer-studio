# Workflow: Orchestrator v1

Lane: `orchestrator`  
Default model: `gpt-5.4-mini`  
Default mode: `observe_only`

## Mission

Route Growth OS work without mutating business surfaces. Classify blockers,
confirm tenant scope, check freshness and prepare aggregate evidence for
Curator/Council.

## Inputs

- Tenant scope: `account_id`, `website_id`, `locale`, `market`.
- Source row and source refs.
- Provider freshness and profile run health.
- Current backlog, experiments and run ledger.

## Required Output

- Decision: `watch`, `block`, `route_to_lane` or `review_required`.
- Lane assignment and rationale.
- Missing evidence or blocker type.
- Artifact with no raw provider payloads or PII.

## Safety

The Orchestrator never changes content, campaigns, experiments or technical
surfaces directly.
