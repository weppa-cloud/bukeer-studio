# docs-keeper — WIKI mode reference

Protocol for maintaining `docs/INDEX.md` and wikilink hygiene. The LLM Wiki
pattern (Karpathy) depends on this file staying current. A stale INDEX =
agents waste tokens re-deriving the graph on every run.

---

## Wikilink conventions

| Syntax | When | Example |
|--------|------|---------|
| `[[ADR-XXX]]` | ADR reference in prose | "respetando [[ADR-015]]" |
| `[[SPEC_NAME]]` | Spec reference (filename stem) | "blocked by [[SPEC_MULTI_LOCALE_REMEDIATION]]" |
| `[[concept]]` | Cross-cutting concept | "[[auth]] + [[RLS]]" |
| `[[runbook-name]]` | Ops runbook | "[[product-landing-v1-runbook]]" |
| `[text](path.md)` | Concrete file click target | `[ADR-015](./architecture/ADR-015-....md)` |

**Rules**
1. Wikilinks are case-sensitive. Stick to the canonical form (e.g., `[[ADR-005]]`, not `[[adr-005]]`).
2. Both wikilink + markdown link may coexist. Example: `See [[ADR-015]] ([ADR-015](./architecture/ADR-015-....md))`.
3. Never wikilink the self-title H1 of an artifact.
4. Never wikilink inside a fenced code block (literal text).
5. In table rows that already use markdown links, adding wikilinks is optional and only if prose value is high.
6. Resolve ambiguity via `docs/INDEX.md` resolution table — add a row whenever a new wikilink token is introduced.

---

## INDEX.md — required sections

Order MUST be preserved so agents can locate sections by header.

```
# Knowledge Graph — Bukeer Studio
> one-line purpose + wikilink convention note
Last updated: YYYY-MM-DD

## How to read this index
## Agent entry points               (AGENTS.md, AGENTS.md, rules, skills, memory)
## Architecture — ADRs              (table: wikilink | file | topic | concepts)
### Companion architecture docs
## Specs                            (table: wikilink | file | concepts)
## Ops, runbooks, CI
## SEO
## Theming
## QA & evidence
## Growth ops
## Research
## Development
## Guides
## Cross-repo bridge — bukeer-flutter
## Concept graph — cross-cutting relations   (one subsection per concept cluster)
## Wikilink resolution table
## Agent update protocol
```

If adding a new domain (e.g. `docs/i18n/`), add both a domain section AND a concept-graph subsection.

---

## Adding a new artifact (step-by-step)

### 1. ADR

```markdown
<!-- In Architecture — ADRs table -->
| [[ADR-017]] | [ADR-017](./architecture/ADR-017-<slug>.md) | <Title> | [[concept-a]] [[concept-b]] |
```

- Add to concept-graph: for each touched concept, append `[[ADR-017]]` to its bullet list.
- Add to resolution table.
- Wikilink pass: `grep -n "ADR-017" docs/ .agents/` — convert prose refs to `[[ADR-017]]`.

### 2. SPEC

```markdown
<!-- In Specs table -->
| [[SPEC_NEW_FEATURE]] | [file](./specs/SPEC_NEW_FEATURE.md) | [[concept-x]] |
```

- Concept-graph + resolution row.
- Ensure the SPEC body references its GitHub Issue (source of truth).

### 3. Runbook / ops

```markdown
<!-- In Ops table -->
| [[new-runbook]] | [file](./runbooks/new-runbook.md) | <purpose> |
```

### 4. New cross-cutting concept

- Add a concept-graph subsection:
  ```markdown
  ### [[concept-name]]
  - [[ADR-XXX]] — <role>
  - [[SPEC_Y]] — <role>
  - Touched by: <runbooks / ops>
  ```
- Add to resolution table (if it maps to a canonical file).

---

## Wikilink pass — algorithm

Given a new artifact `X` (e.g., `ADR-017`):

1. `grep -rn "\bX\b" docs/ .agents/ AGENTS.md` (exclude archive/).
2. For each hit, determine context:
   - Inside fenced code block → skip.
   - Inside existing markdown link `[X](...)` → skip.
   - Inside self-H1 `# X ...` of the artifact itself → skip.
   - In a table cell that already links markdown → optional, skip by default.
   - In prose (paragraph text, bullet) → replace bare `X` with `[[X]]`.
3. Preserve surrounding punctuation: `(X §4)` → `([[X]] §4)`.
4. For multi-token mentions like `ADR-015 Resilient Map`, prefer `[[ADR-015]] Resilient Map`.
5. After pass, verify with `grep -n "[^\[]X[^]]" docs/` to confirm no bare tokens remain in prose.

---

## Full-refresh workflow

When the graph drifts enough that incremental updates are insufficient:

1. Generate fresh INDEX.md candidate by scanning `docs/`, `.agents/rules/`, and `.agents/skills/*/SKILL.md`.
2. Diff against current `docs/INDEX.md`.
3. Show diff to human. Require approval.
4. Archive old: `git mv docs/INDEX.md docs/archive/INDEX-YYYY-MM-DD.md`.
5. Write new INDEX.md.
6. Repo-wide wikilink pass for any newly-indexed artifact.
7. Update `memory/project_knowledge_graph.md` with the refresh date + any new conventions.

---

## Memory sync

Changes that MUST propagate to `~/.agents/projects/.../memory/project_knowledge_graph.md`:

- New wikilink convention (e.g., introducing `[[RUNBOOK-X]]` prefix).
- INDEX.md full-refresh date.
- New concept cluster added to graph.
- Deprecation of a concept (mark in memory as deprecated, do not delete).

---

## Verification commands

After any WIKI mode run, emit these for the caller:

```bash
# Count wikilinks (baseline ~116 pre-refresh 2026-04-17)
grep -rEc "\[\[(ADR-|SPEC_|[a-z-]+)\]\]" docs/ | awk -F: '{s+=$2} END {print s}'

# Find orphan docs (in docs/ but not listed in INDEX.md)
comm -23 \
  <(find docs -name "*.md" ! -path "docs/archive/*" | sed 's|^docs/||' | sort) \
  <(grep -oE '\./[a-z0-9/_.-]+\.md' docs/INDEX.md | sed 's|^\./||' | sort -u)

# Find broken wikilinks (tokens not in resolution table)
grep -rhoE '\[\[[^]]+\]\]' docs/ | sort -u > /tmp/used-wikilinks.txt
grep -oE '\[\[[^]]+\]\]' docs/INDEX.md | sort -u > /tmp/defined-wikilinks.txt
comm -23 /tmp/used-wikilinks.txt /tmp/defined-wikilinks.txt
```
