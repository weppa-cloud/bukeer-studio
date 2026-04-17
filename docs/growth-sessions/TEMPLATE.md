---
session_id: ""            # UUID or YYYY-MM-DD-HHMM-{initials}
started_at: ""            # ISO timestamp
ended_at: ""
agent: ""                 # claude-code-s1 | manual-operator | etc
scope: ""                 # daily-check | weekly-planning | content-create | translate | audit | bulk | debug
website_id: ""
website_slug: ""
initiator: ""             # user request verbatim (1 line)
outcome: ""               # completed | partial | blocked | aborted
linked_weekly: ""         # docs/growth-weekly/... file if applicable
related_issues: []        # GitHub issue numbers affected
---

# Session {scope} — {website_slug} — YYYY-MM-DD HH:MM

## Intent

_What the user asked. Verbatim if possible._

## Plan

_High-level steps agent planned._

1. ...
2. ...

## Executed actions

_Chronological log of actions. Each entry must include: what, why, result._

### 1. [timestamp] {action type}

- **Tool:** `mcp__...` or `Bash` or `WebFetch`
- **Input:** (args or query summary)
- **Output:** (result summary)
- **Reasoning:** (why this action)

### 2. ...

## Mutations

_Write-side changes to Supabase / APIs. MANDATORY per SAFETY rules._

| Entity | Action | Before | After | Source |
|--------|--------|--------|-------|--------|
|        |        |        |       |        |

## External costs

| Provider | Operation | Cost USD | Notes |
|----------|-----------|----------|-------|
| dataforseo | serp_advanced | 0.30 | ... |
| nvidia_nim | transcreate | 0.01 | 800 tokens |

## Decisions / trade-offs

_Where agent chose one path; rationale._

## Outputs delivered

- Written file: `path/...`
- GitHub issue: `#N`
- Report: (inline or linked)

## Next steps / handoff

- ...

## Self-review

_Agent reflects: what worked, what would do differently next time._
