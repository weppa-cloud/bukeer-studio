# Documentation Structure — Bukeer Studio (Next.js)

Actual repo layout (reality as of 2026-04-17). REORGANIZE mode uses this as
the canonical placement reference.

---

## Top-level

```
/
├── AGENTS.md                    ← agent entry point (required)
├── AGENTS.md                    ← optional Codex/Opencode mirror
├── README.md                    ← repo overview
├── CONTRIBUTING.md              ← (if present) contribution guide
├── LICENSE
├── .agents/                     ← agent configuration
├── docs/                        ← project documentation
└── packages/*/README.md         ← per-package docs
```

---

## `.agents/` layout

```
.agents/
├── skills/<name>/
│   ├── SKILL.md                 ← required, frontmatter + dispatcher
│   ├── MODES.md                 ← optional, detailed per-mode workflow
│   ├── <REFERENCE>.md           ← topic reference files
│   └── templates/               ← optional sub-templates
├── commands/<name>.md           ← /command-name definitions
├── rules/<name>.md              ← enforcement rules (loaded into context)
└── settings.local.json          ← local config (gitignored)
```

---

## `docs/` layout

```
docs/
├── INDEX.md                     ← LLM Wiki entry point (REQUIRED)
│
├── architecture/
│   ├── ARCHITECTURE.md          ← narrative + ADR index
│   ├── ONBOARDING-ARCHITECTURE.md
│   ├── AI-AGENT-DEVELOPMENT.md
│   └── ADR-NNN-<slug>.md        ← one file per decision
│
├── specs/
│   ├── SPEC_<TITLE>.md          ← stubs (source of truth = GitHub Issue)
│   ├── EPIC_<TITLE>.md          ← optional epic bodies
│   ├── ROADMAP_<TITLE>.md
│   └── ISSUE_MAP_<TITLE>.md
│
├── ops/                         ← CI gates, operational runbooks
│   └── <topic>.md
│
├── runbooks/                    ← release / rollout procedures
│   └── <feature>-rollout-runbook.md
│
├── seo/
│   ├── SEO-IMPLEMENTATION.md
│   ├── SEO-PLAYBOOK.md
│   ├── SEO-FLUJOS-STUDIO.md
│   └── jsonld-fixtures.md
│
├── theming/
│   └── <topic>.md
│
├── qa/
│   ├── <feature>-qa-matrix.md
│   └── <topic>.md
│
├── evidence/
│   └── epic<N>/walkthrough.md
│
├── growth-okrs/
├── growth-sessions/
├── growth-weekly/
│
├── research/
│   └── <topic>-YYYY-MM-DD.md
│
├── development/
│   └── local-sessions.md
│
├── guides/
│   └── <topic>-WORKFLOW.md
│
└── archive/
    └── <YYYY>/                  ← deprecated, never deleted
```

---

## File placement rules

| Content type | Location | Naming |
|--------------|----------|--------|
| Architecture decision | `docs/architecture/ADR-NNN-<slug>.md` | `ADR-017-feature-name.md` |
| Feature spec stub | `docs/specs/SPEC_<TITLE>.md` | `SPEC_FEATURE_NAME.md` (SCREAMING_SNAKE) |
| EPIC body | `docs/specs/EPIC_<TITLE>.md` | — |
| CI / gate setup | `docs/ops/<topic>.md` | kebab-case |
| Release runbook | `docs/runbooks/<feature>-rollout-runbook.md` | kebab-case |
| SEO reference | `docs/seo/<TOPIC>.md` | UPPER-KEBAB for refs, kebab for fixtures |
| Theme reference | `docs/theming/<topic>.md` | kebab-case |
| QA matrix | `docs/qa/<feature>-qa-matrix.md` | kebab-case |
| Per-EPIC evidence | `docs/evidence/epic<N>/walkthrough.md` | numeric epic |
| OKR / weekly / session | `docs/growth-*/` | per-file README sets convention |
| Research notes | `docs/research/<topic>-YYYY-MM-DD.md` | dated |
| Local dev / tooling | `docs/development/<topic>.md` | kebab-case |
| How-to / workflow | `docs/guides/<TOPIC>-WORKFLOW.md` | UPPER-KEBAB |
| Deprecated doc | `docs/archive/<YYYY>/<original-name>.md` | preserve original |
| Agent skill | `.agents/skills/<name>/SKILL.md` | kebab skill name |
| Agent command | `.agents/commands/<name>.md` | kebab |
| Enforcement rule | `.agents/rules/<name>.md` | kebab |
| Package README | `packages/<name>/README.md` | — |

---

## Root allow-list

ONLY these `.md` files may live at repo root:

- `README.md`
- `AGENTS.md`
- `AGENTS.md` (if Codex/Opencode support enabled)
- `CONTRIBUTING.md`
- `LICENSE`
- `CODE_OF_CONDUCT.md` (if present)
- `SECURITY.md` (if present)

Anything else in root = MODE:REORGANIZE target.

---

## Naming conventions

| Artifact | Convention | Example |
|----------|------------|---------|
| ADR | `ADR-NNN-<slug>.md` | `ADR-017-event-bus.md` |
| SPEC | `SPEC_<TITLE>.md` | `SPEC_MULTI_LOCALE.md` |
| EPIC | `EPIC_<TITLE>.md` | `EPIC_SEO_CONTENT.md` |
| Roadmap | `ROADMAP_<TITLE>.md` | — |
| Issue map | `ISSUE_MAP_<TITLE>.md` | — |
| Runbook | `<feature>-rollout-runbook.md` | `product-landing-rollout-runbook.md` |
| Ops gate | `<topic>.md` | `lighthouse-ci.md` |
| Guide | `<TOPIC>-WORKFLOW.md` | `WEBSITE-CREATION-WORKFLOW.md` |
| Index | `INDEX.md` | — |
| Skills | `SKILL.md` + uppercase refs | `PATTERNS.md` |

---

## Cross-reference rules

| Target | Use | Example |
|--------|-----|---------|
| ADR in prose | wikilink | `respetando [[ADR-015]]` |
| ADR click target | markdown link | `[ADR-015](./architecture/ADR-015-*.md)` |
| Spec in prose | wikilink | `blocks [[SPEC_MULTI_LOCALE]]` |
| Concept cluster | wikilink | `[[auth]] + [[RLS]]` |
| Code path | inline code | `` `app/api/foo/route.ts` `` |
| Component class | inline code or `[[Component]]` | `` `<PackageCircuitMap>` `` |
| Issue / PR | `#NNN` with `gh issue view` assumed | `see #122` |
| External URL | markdown link | `[OpenRouter](https://openrouter.ai)` |

---

## Archive policy

- Deprecated docs go to `docs/archive/<YYYY>/` with ORIGINAL filename.
- Add a replacement pointer at top: `> SUPERSEDED by [[new-artifact]] on YYYY-MM-DD.`
- Keep in `git mv` (preserve history). Never `rm`.
- Archived docs are exempt from freshness audits but still checked for link integrity.

---

## Gaps in current repo (2026-04-17 snapshot)

AUDIT mode should flag these on next run:

- `docs/GLOSSARY.md` — does not exist. Useful for agent term disambiguation.
- `docs/api/` — no per-API-route doc directory; API routes scattered across specs.
- `AGENTS.md` — not present (optional, useful for Codex/Opencode parity).
- No `.github/scripts/check-orphan-docs.sh` or wikilink validator (automation pending).
