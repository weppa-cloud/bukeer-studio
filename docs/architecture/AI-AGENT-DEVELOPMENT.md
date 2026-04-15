# AI Agent Development Guide — bukeer-studio

> Principles, patterns, and lifecycle for AI-assisted development with Claude Code skills.

Last updated: 2026-04-15

---

## AI Development Principles (AP1–AP8)

These principles extend the core architectural principles (P1–P10) to AI agent behavior.

### AP1 — Skill Scope Isolation

Each skill owns a bounded context. Skills delegate outside their scope explicitly via "Delegate To" sections. This prevents conflicting modifications when multiple skills operate on the same codebase.

**Pattern:** Every SKILL.md must have "You Handle" and "Delegate To" sections.

**Example:** `nextjs-developer` handles pages/components/hooks. Database work delegates to `backend-dev`.

### AP2 — Contract-First Skill Boundaries

Skills reference `@bukeer/website-contract` types, never raw DB shapes. Input/output schemas are Zod-validated at skill boundaries. Same principle as P2 (Validate at Boundaries), applied to AI agent inputs.

### AP3 — Single Source of Truth for Counts

Skills NEVER hardcode component, section, or route counts. Instead, reference the registry or use dynamic discovery.

**Why:** Audit (2026-04-15) found 38 section types vs 34 documented, 23/33 Zod routes vs 18/20 claimed. Hardcoded counts go stale within weeks.

**Rule:** Write "See `SECTION_TYPES` in `@bukeer/website-contract`" instead of "We have 38 section types."

### AP4 — Deterministic Before Generative

Prefer algorithmic solutions over LLM calls. LLM only for: content generation, design decisions, code synthesis.

**Example:** SEO content scoring (`/api/ai/editor/score-content`) is zero-cost algorithmic — no LLM needed.

**Why:** Cost control, predictability, testability.

### AP5 — Escalation Over Assumption

When a skill encounters ambiguity, escalate to the user. Don't guess scope.

**Model:** `tech-validator`'s three modes (PLAN/TASK/CODE) — user explicitly chooses context.

**Why:** Wrong assumptions in AI agents compound silently across files.

### AP6 — Skill Documentation as Code

Skill docs must be verifiable against the codebase. Counts, paths, and patterns must match reality.

**Mechanism:** `npm run ai:sync` validates CLAUDE.md → AGENTS.md. `npm run ai:audit` validates skill docs vs codebase.

**Why:** Stale docs → wrong AI behavior → bugs.

### AP7 — Progressive Skill Activation

Skills activate based on file/context matching, not user memory. SKILL.md examples with "USE WHEN" / "NOT FOR" guards control activation.

**Why:** Reduces false activations and scope overlap between skills.

### AP8 — Observability of AI Actions

AI-generated code gets tagged (`Co-Authored-By`). AI API calls get request IDs. Cost tracking per-user with daily caps exists in `lib/ai/rate-limit.ts`.

**Why:** Debugging AI-assisted changes requires attribution and auditability.

---

## Skill Architecture

### Directory Structure

Each skill lives in `.agents/skills/{skill-name}/`:

```
.agents/skills/{skill-name}/
├── SKILL.md           ← REQUIRED: scope, examples, rules, delegation
├── PATTERNS.md        ← RECOMMENDED: reusable code patterns
├── CHECKLIST.md       ← OPTIONAL: pre-commit validation
├── templates/         ← OPTIONAL: boilerplate generators
└── *.md               ← Domain-specific (SCHEMA.md, RLS_GUIDE.md, etc.)
```

### SKILL.md Required Sections

1. **YAML frontmatter** — `name`, `description` with `<example>` blocks (min 3: 2 USE WHEN + 1 NOT FOR)
2. **You Handle** — explicit responsibilities
3. **Delegate To** — out-of-scope items with target skill
4. **Critical Rules** — non-negotiable constraints
5. **Reference Files** — paths to supporting docs
6. **MCP Tools** — if skill uses MCP integrations

### Current Skills (10 active)

| Skill | Domain | Key References |
|-------|--------|---------------|
| `nextjs-developer` | Pages, components, API routes, hooks | PATTERNS.md, SECTIONS.md, AI.md, CHECKLIST.md |
| `backend-dev` | Supabase DB, RLS, Edge Functions, migrations | SCHEMA.md, RLS_GUIDE.md, EDGE_FUNCTIONS.md |
| `website-section-generator` | Production section components | PATTERNS.md, COMPONENTS.md |
| `website-designer` | Brand → design specs, theme presets | PRESETS.md, TOKENS.md |
| `website-quality-gate` | Lighthouse, WCAG AA, Core Web Vitals | CHECKLIST.md |
| `tech-validator` | Architecture compliance (3 modes) | PLAN_MODE.md, TASK_MODE.md, CODE_MODE.md |
| `specifying` | Feature → executable specs | TEMPLATE.md, EXAMPLES.md |
| `docs-keeper` | Documentation maintenance | STRUCTURE.md |
| `prompt-optimiser` | Prompt analysis and optimization | TECHNIQUES.md |
| `playwright-skill` | E2E testing patterns | cli/, POM/, CI/, migration/ |

---

## Creating a New Skill

### Step-by-Step

1. **Define scope** — Write "You Handle" and "Delegate To" first. If overlap with existing skill exists, refine boundaries in BOTH skills.
2. **Create directory** — `.agents/skills/{skill-name}/SKILL.md` using the template at `.agents/skills/_TEMPLATE/SKILL.md`
3. **Write examples** — Minimum 3: two "USE WHEN" + one "NOT FOR" with delegation
4. **Add to CLAUDE.md** — Register in Skills section with activation trigger description
5. **Run sync** — `npm run ai:sync` to propagate to AGENTS.md
6. **Validate** — Run `npm run ai:audit` to check for drift

### Naming Conventions

- Skill directory: `kebab-case` (e.g., `backend-dev`, `website-quality-gate`)
- Reference files: `UPPER_CASE.md` (e.g., `SCHEMA.md`, `PATTERNS.md`)
- Templates: lowercase in `templates/` subdirectory

---

## Skill Lifecycle

| State | Location | Action |
|-------|----------|--------|
| **Active** | `.agents/skills/` + registered in CLAUDE.md | Normal operation |
| **Deprecated** | Marked `⚠️ DEPRECATED` in SKILL.md header | Remove from CLAUDE.md activation, keep docs 1 release cycle |
| **Retired** | Deleted from `.agents/skills/` | Full removal after deprecation period |

### Deprecation Process

1. Add `⚠️ DEPRECATED — Use {replacement-skill} instead` to SKILL.md header
2. Remove from CLAUDE.md Skills section (stops activation)
3. Keep `.agents/skills/{name}/` for one release cycle (reference)
4. Delete directory after migration confirmed

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Hardcoded counts | Stale in weeks (38 types documented as 34) | Reference registry dynamically |
| Overlapping scope | Two skills modify same files → conflicts | Refine "Delegate To" in both |
| Missing delegation | Skill tries everything → quality drops | Add explicit "NOT FOR" examples |
| Stale references | Deprecated features in docs (e.g., Puck editor) | Run `npm run ai:audit` regularly |
| No examples | Wrong activation context | Minimum 3 examples per skill |
| Scope creep | Skill grows beyond original boundary | Split into two skills |

---

## Skill Audit

Run `npm run ai:audit` to validate:

1. Section type count in skill docs vs `@bukeer/website-contract`
2. Component count vs `components/ui/` directory
3. API route count vs `app/api/` directory
4. References to deprecated features
5. All skills in `.agents/skills/` registered in CLAUDE.md

---

## Sync Mechanism

```bash
npm run ai:sync       # CLAUDE.md → AGENTS.md (for Codex/other agents)
npm run ai:audit      # Validate skill docs vs codebase reality
```

Scripts: `scripts/ai/sync-from-claude.mjs`, `scripts/ai/audit-skills.mjs`

---

## Cross-References

- Core principles: [ARCHITECTURE.md](ARCHITECTURE.md) (P1–P10)
- ADRs: [docs/architecture/](.) (ADR-001 through ADR-012)
- Onboarding: [ONBOARDING-ARCHITECTURE.md](ONBOARDING-ARCHITECTURE.md)
