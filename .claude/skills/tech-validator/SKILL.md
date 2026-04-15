---
name: tech-validator
description: |
  Technical validation for plans, tasks, and code against Bukeer Studio architecture.
  THREE MODES:
  (1) PLAN — Validates a PRD/plan/proposal against ADRs, design tokens, reusability.
  (2) TASK — Generates a pre-implementation Technical Validation Brief (TVB).
  (3) CODE — Reviews written code for architectural compliance post-implementation.
  ACTIVATION: MANDATORY before any feature, bugfix, enhancement, or refactor.
  NOT FOR: Pure research, documentation-only tasks, or trivial single-line fixes.

  Examples:
  <example>
  Context: User shares a plan/PRD for validation.
  user: "Validate this plan for the section editor feature"
  assistant: "I'll run tech-validator in PLAN mode to check ADR/token/contract compliance."
  <commentary>Plan validation uses MODE: PLAN.</commentary>
  </example>
  <example>
  Context: User requests a new feature.
  user: "Add a new testimonials section type to the site builder"
  assistant: "Before implementing, I'll generate the Technical Validation Brief (TVB)."
  <commentary>Pre-implementation uses MODE: TASK.</commentary>
  </example>
  <example>
  Context: User wants to review code already written.
  user: "Review the new theme compiler for architecture compliance"
  assistant: "I'll run tech-validator in CODE mode to check the implementation."
  <commentary>Post-implementation review uses MODE: CODE.</commentary>
  </example>
  <example>
  Context: Trivial change that skips validation.
  user: "Fix typo in the login button text"
  assistant: "This is a trivial fix — tech-validator not required."
  <commentary>Single-line, non-architectural changes skip validation.</commentary>
  </example>
---

# Tech Validator Skill

Technical validation engine with **three operational modes** that ensures all development artifacts — plans, tasks, and code — align with Bukeer Studio's architecture, ADRs, design token system, and reusability principles.

## Mode Selection

| Mode | Trigger | Output | Guide |
|------|---------|--------|-------|
| **PLAN** | PRD/plan/proposal shared | Plan Compliance Report (PCR) | [PLAN_MODE.md](PLAN_MODE.md) |
| **TASK** | Feature/bugfix requested | Technical Validation Brief (TVB) | [TASK_MODE.md](TASK_MODE.md) |
| **CODE** | Code review requested | Code Review Report (CRR) | [CODE_MODE.md](CODE_MODE.md) |

## Mode Selection Logic

```
IF input contains PRD/plan/proposal document or "validate plan/PRD"
  → MODE: PLAN

ELSE IF input is a task description (feature/bugfix/enhancement)
  AND no code has been written yet
  → MODE: TASK

ELSE IF input references existing files/code or "review code"
  OR implementation is complete and requesting validation
  → MODE: CODE

ELSE IF task is trivial (typo, single-line, documentation)
  → SKIP (no validation needed)
```

The developer can also explicitly request a mode:
- "Validate this plan" → PLAN
- "Generate TVB for this task" → TASK
- "Review this code" → CODE

## ADRs Relevantes

| ADR | Topic | Check |
|-----|-------|-------|
| ADR-001 | Server-First Rendering | Does it use RSC by default? Is `'use client'` only where needed? |
| ADR-002 | Error Handling Strategy | Does it include proper error boundaries and try/catch? |
| ADR-003 | Contract-First Validation | Does it validate data with Zod schemas before use? |
| ADR-004 | State Management | Does it use appropriate state (server vs client, URL params, React state)? |
| ADR-005 | Security Defense-in-Depth | Are service role keys server-only? RLS policies considered? |
| ADR-006 | AI Streaming Architecture | Does AI integration use streaming (Vercel AI SDK patterns)? |
| ADR-007 | Edge-First Delivery | Is it compatible with Cloudflare Workers? No Node-only APIs? |
| ADR-008 | Monorepo Packages | Does it respect package boundaries (theme-sdk, website-contract)? |
| ADR-009 | Multi-Tenant Subdomain Routing | Does it handle subdomain routing correctly via middleware? |
| ADR-010 | Observability Strategy | Does it include logging/monitoring where appropriate? |
| ADR-011 | Middleware Cache | Does it respect middleware caching strategy? |
| ADR-012 | API Response Envelope | Do API routes use standard response envelope format? |

## Validation Tools

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build (catches RSC boundary issues, import errors)
npm run build

# E2E tests
npm run test:e2e
```

## Reference Files

See [REFERENCE_FILES.md](REFERENCE_FILES.md) for documentation pointers.

## L10N Check (CODE mode)

When reviewing code, check:
- Dashboard UI: English only (no i18n required)
- Public site: `website.locale` or `website.language` should drive `inLanguage` in JSON-LD
- Hardcoded `'es'` in JSON-LD generators is a known bug (see CLAUDE.md SEO gaps)

## Delegate To

After validation, the work is handed to the appropriate skill:
- `nextjs-developer`: Pages, components, API routes, hooks
- `website-section-generator`: Tourism section components (shadcn, Aceternity, Magic UI)
- `backend-dev`: Database, migrations, Edge Functions, RLS
- `website-designer`: Theme presets, design specifications
- `website-quality-gate`: Lighthouse, WCAG AA, Core Web Vitals

## Git Context Commands

```bash
# Recent commits for domain context
git log --oneline -20 --grep="[domain]"

# Files changed in recent related work
git log --oneline -10 --name-only --grep="[domain]"

# Unstaged changes that might conflict
git status -s

# Changed files for CODE mode
git diff --cached --name-only
git diff main...HEAD --name-only
```

## Escalation

| Situation | Action |
|-----------|--------|
| PLAN fails multiple ADRs | Return to plan author with specific violations |
| No applicable ADRs found | Review if task is truly new territory → may need new ADR |
| Conflicting ADRs | Flag to developer, suggest resolution |
| Missing Zod schema | Flag as blocker → schema must be added to `@bukeer/website-contract` first |
| CODE has critical violations | Block commit until fixed |
| CODE has only warnings | Allow commit with documented debt |
| Unclear integration points | Research mode → explore before generating report |
| After 2 research attempts | Ask developer for clarification |
