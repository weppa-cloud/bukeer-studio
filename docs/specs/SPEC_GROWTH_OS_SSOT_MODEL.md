# SPEC: Growth OS SSOT Model

Status: Accepted governance layer for EPIC #310 / SPEC #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Created: 2026-05-01  
Owner: Growth OS A5 + Council  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related SPECs: [#337](https://github.com/weppa-cloud/bukeer-studio/issues/337), [SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER](./SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md), [SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX](./SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md)

## Purpose

Define the source-of-truth boundaries for Growth OS so implementation tracking
does not get mixed with day-to-day Growth operation.

Official rule:

```text
GitHub / EPIC #310 = implementation SSOT
Supabase / Bukeer Studio = operational Growth SSOT
Docs/specs = design contract
Artifacts = reproducible evidence
Council = prioritization and experiment approval
```

GitHub answers:

```text
Is Growth OS built, governed, validated and ready to advance gates?
```

Supabase / Bukeer Studio answers:

```text
What should Growth do, what was done, what is blocked and what did we learn?
```

## SSOT Responsibilities

| Layer                    | Owns                                                                                                                                    | Does not own                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GitHub / #310            | Implementation state, child issues, scope, gates, migrations, implemented profiles, validation evidence, `PASS/WATCH/BLOCKED` decisions | Full operational backlog, raw provider payloads, PII, every candidate row or every content task |
| Supabase / Bukeer Studio | Profile runs, normalized facts, backlog candidates, backlog items, briefs, tasks, experiments, reviews, results and learning loop       | Product/spec decisions, implementation gate history, issue closure state                        |
| Docs/specs               | Durable contract, architecture, accepted operating rules and interfaces                                                                 | Live execution status or mutable operational queue                                              |
| Artifacts                | Reproducible run evidence, exports, dry-runs, Council packets and validation summaries                                                  | Canonical operational state                                                                     |
| Growth Council           | Priority, experiment approval, independence rules, active experiment cap and exceptions                                                 | Automatic candidate generation or raw data extraction                                           |

## Operational Data Model Boundary

Supabase / Bukeer Studio is the durable operational system for:

| Entity                      | Operational responsibility                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `growth_profile_runs`       | Provider run ledger: profile, window, status, freshness, cost, row counts and artifact references.  |
| Provider facts              | Normalized evidence from GSC, GA4, DataForSEO, tracking and paid media.                             |
| `growth_backlog_candidates` | Automatic or agent-generated opportunity pool. Not directly executable.                             |
| `growth_backlog_items`      | Reviewed backlog with owner, issue, source refs, baseline, next action, status and evaluation date. |
| `growth_content_briefs`     | AI or human generated content briefs linked to backlog items and source facts.                      |
| `growth_content_tasks`      | Editorial or technical execution tasks with publish/review state.                                   |
| `growth_experiments`        | Council-approved measurable experiments or readouts.                                                |
| `growth_ai_reviews`         | Model, prompt/config version, confidence, risks, recommendation and evidence.                       |
| `growth_human_reviews`      | Council or reviewer decisions, rationale, overrides and accountable owner.                          |

The implementation may keep compatibility views such as `growth_inventory`, but
the operational SSOT is the reviewed backlog and experiment model, not GitHub
comments.

## Flow

```text
providers
  -> growth_profile_runs
  -> normalized facts
  -> growth_backlog_candidates
  -> validator / agent / human review
  -> growth_backlog_items
  -> growth_content_tasks / technical tasks / Council experiments
  -> measured results
  -> learning loop
```

Rules:

- Scripts can create candidates and artifacts.
- Agents or validators can recommend promotion when evidence is complete.
- Council approves active experiments and grouped-batch exceptions.
- Bukeer Studio shows the live operational queue, blockers and learning state.
- GitHub receives cycle summaries, gate decisions, counts and links to artifacts.

## Issue Hygiene

#310 must not become the operational backlog. It should receive:

- cycle summaries;
- gate status changes;
- implementation scope changes;
- migration and profile coverage evidence;
- links to artifacts, commits and child issues;
- Council decisions that affect implementation readiness.

#310 should not receive:

- raw provider JSON;
- raw PII;
- every generated candidate;
- every content or technical task row;
- long backlog dumps that belong in Supabase / Bukeer Studio.

## Acceptance Criteria

- #310 states that GitHub is implementation SSOT and Supabase / Bukeer Studio is
  operational Growth SSOT.
- Operational backlog rows are managed in Supabase tables or approved artifacts
  until migrations/UI are complete.
- GitHub evidence is aggregated and redacted.
- Council packets are generated from reviewed backlog and experiment state, not
  from free-form issue comments.
- Any future Growth OS UI in Bukeer Studio reads Supabase operational state
  rather than scraping GitHub issues.
