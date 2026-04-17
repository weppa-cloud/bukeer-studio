# GitHub Issue Templates

Use these when opening Epic + child issues in Phase 6 and 7 of the specifying workflow.

---

## Epic Issue Template

**Title format:** `[Epic] <Feature Name>`

```markdown
## Goal
<1 sentence — business outcome>

## Why
<constraint / deadline / stakeholder — the motivation>

## Spec
docs/specs/SPEC_<name>.md

## ADRs
- docs/architecture/ADR-NNN-<slug>.md
- docs/architecture/ADR-NNN-<slug>.md

## Cross-repo impact
<none | bukeer-flutter: tables X, Y | shared: package_kits>

## Scope (child issues)
- [ ] #<n> — <child 1 title>
- [ ] #<n> — <child 2 title>
- [ ] #<n> — <child 3 title>

## Out of scope
- <explicitly excluded item>
- See separate epic: #<n>

## Acceptance (epic-level)
- [ ] <measurable outcome 1>
- [ ] <measurable outcome 2 — e.g. Lighthouse ≥ 90 in staging>
- [ ] Feature flag ON in pilot sites
- [ ] Runbook published (if rollout needed)

## Definition of Done
All child issues merged + rollout completed per runbook.

## Rollout
- Feature flag: <name | none>
- Revalidation paths: <list | none>
- Runbook: docs/ops/<name>-runbook.md
```

**Labels (required):**
`epic`, `type:feat`, `area:<pkg>`, `priority:p0|p1|p2`, `size:s|m|l`, `needs-tvb`

**Milestone:** current quarter/release.

---

## Child Issue Template

**Title format:** `<type>: <short imperative>` (e.g. `feat: add product-landing hero schema`)

```markdown
## Context
Part of #<epic-number> (Epic: <epic title>)
Spec section: §<section number>
<link to SPEC_<name>.md anchor if possible>

## Task
<1 sentence imperative — what this issue delivers>

## Acceptance
- [ ] Typecheck passes
- [ ] <E2E test covers flow X>
- [ ] tech-validator MODE:CODE clean (no blockers)
- [ ] <specific AC from spec>

## Affected files (estimated)
- <path 1>
- <path 2>

## Dependencies
- Blocked by: #<n> (optional)
- Blocks: #<n> (optional)

## Estimate
<S (<1 day) | M (2-3 days) | L (4-5 days)>

## Notes
<anything non-obvious — edge cases, caveats>
```

**Labels (required):**
`type:feat|fix|chore|docs`, `area:<pkg>`, `size:s|m|l`, `rol:1|rol:2`, `needs-tvb` (if non-trivial)

**Milestone:** same as parent epic.

---

## Bug Issue Template (skips specifying)

**Title format:** `fix: <symptom>` (e.g. `fix: theme preset tropical breaks dark mode`)

```markdown
## Symptom
<observed behavior>

## Expected
<intended behavior>

## Repro
1. ...
2. ...
3. ...

## Evidence
- Screenshot / log / URL
- Related PR: #<n>

## Root cause (fill after debugger)
<to be filled>

## Fix approach (fill after debugger)
<to be filled>

## Acceptance
- [ ] Regression test added
- [ ] tech-validator MODE:CODE clean
```

**Labels:** `type:fix`, `area:<pkg>`, `priority:<pN>`, `size:<s|m|l>`

---

## gh CLI shortcuts

```bash
# Create epic
gh issue create \
  --title "[Epic] Product Landing v1" \
  --label "epic,type:feat,area:studio,priority:p1,size:l,needs-tvb" \
  --milestone "Q2-2026" \
  --body-file /tmp/epic-body.md

# Create child
gh issue create \
  --title "feat: add product-landing hero schema" \
  --label "type:feat,area:contract,size:s,rol:1" \
  --milestone "Q2-2026" \
  --body-file /tmp/child-body.md

# List epic status
gh issue list --label epic --state open

# Orphan PRs (no milestone)
gh pr list --search "no:milestone"
```

---

## Label bootstrap (one-time)

If repo missing labels, run:

```bash
gh label create epic --color "8B5CF6" --description "Epic issue (parent of child issues)"
gh label create type:feat --color "10B981"
gh label create type:fix --color "EF4444"
gh label create type:chore --color "6B7280"
gh label create type:docs --color "3B82F6"
gh label create area:studio --color "F59E0B"
gh label create area:editor --color "F59E0B"
gh label create area:theme-sdk --color "F59E0B"
gh label create area:contract --color "F59E0B"
gh label create area:seo --color "F59E0B"
gh label create priority:p0 --color "DC2626"
gh label create priority:p1 --color "F97316"
gh label create priority:p2 --color "FBBF24"
gh label create size:s --color "D1D5DB"
gh label create size:m --color "9CA3AF"
gh label create size:l --color "4B5563"
gh label create needs-tvb --color "EC4899" --description "Needs tech-validator MODE:TASK brief"
gh label create needs-spec --color "EC4899"
gh label create rol:1 --color "0EA5E9" --description "Studio developer (repo code)"
gh label create rol:2 --color "0EA5E9" --description "Website creator (Supabase data)"
```
