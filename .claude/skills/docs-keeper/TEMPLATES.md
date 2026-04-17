# Documentation Templates — Bukeer Studio

Copy-paste templates. Each includes required frontmatter-style header so
AUDIT mode passes on day one. All templates use TypeScript / Next.js 15
syntax (repo reality).

---

## ADR template

```markdown
# ADR-NNN — <Title>

**Status:** Proposed
**Date:** YYYY-MM-DD
**Principles:** P2 (Validate at Boundaries), ...
**Supersedes:** (optional) [[ADR-XXX]]

## Context

Two to five sentences describing the forces at play: what changed, what
constraint appeared, why an ad-hoc decision is no longer acceptable.

## Decision

Lead with the decision in one sentence. Then list the rules / contracts the
decision enforces.

- Rule 1.
- Rule 2.
- Rule 3.

## Consequences

### Positive
- <benefit>

### Negative
- <drawback>

### Neutral
- <observation>

## Alternatives considered

1. <Alternative A> — rejected because <reason>.
2. <Alternative B> — rejected because <reason>.

## Implementation notes

- Key files: `path/to/file.ts`
- Validation: `npm run <script>` / `tech-validator` rule.
- Edge cases: <list>.

## Known gaps

- <gap> — tracked in [[SPEC_X]] / issue #NNN.

## Related

- [[ADR-XXX]] — <relation>
- [[SPEC_X]] — <relation>
```

---

## SPEC stub template

SPECs live in `docs/specs/` as stubs. The GitHub Issue is the source of truth.

```markdown
# SPEC: <Title>

**Status:** Draft | Approved | Ready for execution | Shipped
**Date:** YYYY-MM-DD
**Issue:** #NNN (source of truth)
**Owner:** @handle
**Related:** [[ADR-XXX]], [[SPEC_Y]]

## Problem

One paragraph. User-facing pain or business driver. No solution here.

## Goal

Measurable target. Conversion +N%, latency < N ms, coverage N→M.

## Non-goals

Explicit exclusions to prevent scope creep.

## Scope

### In scope
- <item>

### Out of scope
- <item>

## Decision guide

Non-obvious choices made upfront so implementers don't need to re-decide.

## Acceptance criteria

- [ ] AC1 — <statement>
- [ ] AC2 — <statement>

## Edge cases

| Case | Behavior |
|------|----------|

## ADR compliance

| ADR | Status | Notes |
|-----|--------|-------|
| [[ADR-001]] | ✅ / ⚠️ / ❌ | <note> |

## Analytics

| Event | Props | When |
|-------|-------|------|

## References

- Issue #NNN
- Related PR #NNN
```

---

## Runbook template

```markdown
# <Feature> Rollout Runbook

**Status:** Active
**Date:** YYYY-MM-DD
**Owner:** @handle
**Triggers:** <when to use this runbook>

## Pre-flight

- [ ] <check 1>
- [ ] <check 2>

## Deploy

### 1. Build
```bash
npm run build:worker
```

### 2. Preview
```bash
npm run preview:worker
```

### 3. Ship
Describe the promotion path (GitHub Actions workflow, wrangler, etc).

## Monitoring

| Signal | Where | Threshold |
|--------|-------|-----------|
| <metric> | <dashboard / log> | <value> |

## Rollback

```bash
npx wrangler rollback
```

Describe any data / migration rollback steps separately.

## Postmortem template (for failed rollouts)

- Timeline.
- Root cause.
- Mitigations.
- Follow-ups.

## Related

- [[ADR-XXX]]
- [[SPEC_X]]
```

---

## API route doc template

Used for new `app/api/**/route.ts` routes when a full SPEC would be overkill.

```markdown
# <Method> <Path>

**Status:** Shipped
**Date:** YYYY-MM-DD
**Implementation:** `app/api/<path>/route.ts`
**Runtime:** `edge` / `nodejs`
**Compliance:** [[ADR-003]] (Zod), [[ADR-012]] (envelope), [[ADR-005]] (auth)

## Purpose

One-line description of what this endpoint does.

## Request

### Headers
| Header | Required | Value |
|--------|----------|-------|

### Body (Zod schema)
```typescript
import { z } from 'zod'

export const RequestSchema = z.object({
  field: z.string(),
})
```

## Response

### Success (200)
Uses standard envelope (`apiSuccess`):

```json
{
  "ok": true,
  "data": { "...": "..." }
}
```

### Error (4xx / 5xx)
Uses standard envelope (`apiError`):

```json
{
  "ok": false,
  "error": { "code": "ERROR_CODE", "message": "..." }
}
```

## Auth

Describe role/permission checks. Reference [[ADR-005]].

## Observability

| Log prefix | When |
|------------|------|
| `[<namespace>]` | <event> |

## Examples

### cURL
```bash
curl -X POST https://<host>/api/<path> \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"field": "value"}'
```

### TypeScript (internal caller)
```typescript
const res = await fetch('/api/<path>', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ field: 'value' }),
})
```
```

---

## Feature / section doc template

```markdown
# <Feature name>

**Status:** Shipped
**Date:** YYYY-MM-DD
**Owning skill:** nextjs-developer / backend-dev
**Touches:** [[concept-a]] [[concept-b]]

## Overview

One to two sentences. What the user sees / experiences.

## Architecture

- Entry: `app/<route>/page.tsx` (or `components/...`)
- Server data: `lib/<module>/queries.ts`
- Client UI: `components/<module>/<component>.tsx`
- Contract: `packages/website-contract/src/<file>.ts`

## Data flow

```
Server page → query → Zod parse → component → render
```

## Public API

- Server function: `getX(...)` — returns `XResult`.
- Client component: `<Feature />` — props `...`.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|

## Edge cases

| Case | Behavior |
|------|----------|

## Analytics

| Event | Props | When |
|-------|-------|------|

## Related

- [[ADR-XXX]]
- [[SPEC_X]]
```

---

## Research note template

```markdown
# <Topic> — Research YYYY-MM-DD

**Status:** Archive (historical)
**Author:** @handle
**Related:** [[SPEC_X]]

## Objective

What question this note answers.

## Method

How data / evidence was gathered.

## Findings

- Finding 1.
- Finding 2.

## Recommendations

- Action 1.
- Action 2.

## Artifacts

- Screenshots / logs / etc: `path/to/artifact/`.
```

---

## Quick-reference / cheat sheet template

```markdown
# <Topic> Quick Reference

**Status:** Living doc
**Date:** YYYY-MM-DD

## Common tasks

### <Task 1>
```typescript
// snippet
```

### <Task 2>
```typescript
// snippet
```

## Cheat sheet

| Action | Code |
|--------|------|
| <action> | `<code>` |

## Common errors

### `<error message>`
- **Cause:** <cause>
- **Fix:** <fix>

## See also
- [[ADR-XXX]]
- [Detailed guide](../guides/TOPIC-WORKFLOW.md)
```

---

## Checklist template

```markdown
# <Process> Checklist

**Status:** Active
**Date:** YYYY-MM-DD

## Pre
- [ ] <step>

## During
- [ ] <step>

## Post
- [ ] <step>

## Validation
- [ ] <check>
```

---

## Required headers summary

Every doc produced by this skill MUST include, within the first 10 lines:

- `# <Title>` (single H1 at line 1)
- `**Status:**` — one of `Proposed | Draft | Accepted | Approved | Ready for execution | Shipped | Active | Archive | Deprecated | Superseded`
- `**Date:**` — absolute `YYYY-MM-DD`

Optional but recommended:
- `**Issue:** #NNN` (for SPEC / runbook tied to GitHub issue)
- `**Owner:** @handle`
- `**Related:** [[ADR-XXX]]` (wikilinks, comma-separated)
