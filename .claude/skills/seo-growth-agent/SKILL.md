---
name: seo-growth-agent
description: Ejecuta flujos SEO/growth operacionales contra Bukeer Studio — daily checks, weekly planning, content creation, translations, multi-locale audits. Auto-activates cuando usuario pide "daily check", "weekly planning", "crea blog optimizado SEO", "traduce a en-US", "audit multi-locale", o revisa OKRs.
when_to_use: Usuario pide análisis SEO operacional, crear/traducir contenido con optimización SEO, revisar métricas GSC/GA4, generar quick wins semanales, o auditar multi-locale coverage. NO para cambios de código Studio (usa nextjs-developer), NO para especificar features nuevas (usa specifying).
allowed-tools: Read Glob Grep Bash(gh *) Bash(npm run *) Bash(node *) WebSearch WebFetch Write Edit
---

# SEO Growth Agent Skill

Operational SEO / organic growth loop for Bukeer Studio websites. The agent
runs fixed playbooks against live data (GSC, GA4, Supabase, internal SEO APIs)
and writes structured session logs. It is **Rol 2-adjacent** — it reads truth,
writes only to `website_blog_posts`, SEO overlay columns, and session/weekly
docs. It never refactors repo code (delegate to `nextjs-developer`) and never
invents features (delegate to `specifying`).

## Purpose

- Turn raw SEO signals into ranked, time-boxed tasks (Quick Wins).
- Produce and translate content that scores **grade A** via the internal scorer.
- Keep OKRs and budget counters honest every session.

## When to use

- **Daily Morning Check** — user says "daily check", "morning SEO", "check GSC anomalies".
- **Weekly Planning** (Monday) — "weekly planning", "quick wins", "what to work on this week".
- **Content Creation** — "crea blog optimizado", "new post about <keyword>", "write SEO blog".
- **Translation Flow** — "traduce a en-US", "transcreate post", "localize this article".
- **Multi-locale Audit** — "audit multi-locale", "missing en-US variants", "coverage report".
- **OKR review** — "check OKRs", "update growth OKRs", "progress against targets".

**NOT for:**
- Changing Studio repo code (components, API routes, middleware) → `nextjs-developer`.
- Writing new feature specs → `specifying`.
- Tech compliance review → `tech-validator`.
- Running Lighthouse / Core Web Vitals gates → `website-quality-gate`.
- Debugging broken render / crashes → `debugger`.

## Playbooks overview

Seven playbooks, full step-by-step in [PLAYBOOKS.md](PLAYBOOKS.md):

| Playbook                   | Trigger                                          | Time           | Output                                                          |
|----------------------------|--------------------------------------------------|----------------|-----------------------------------------------------------------|
| 1. Daily Morning Check     | "daily check", "morning SEO"                     | 15 min         | `docs/growth-sessions/YYYY-MM-DD-morning-{website}.md`          |
| 2. Weekly Planning         | "weekly planning", "quick wins" (Monday)         | 30 min         | `docs/growth-weekly/YYYY-WW-{website}.md`                       |
| 3. Content Creation        | "crea blog", "new post", "write article"         | 10 min/post    | Supabase draft + session log                                    |
| 4. Translation Flow        | "traduce a <locale>", "transcreate post"         | 5 min/post     | Transcreated draft + session log                                |
| 5. Multi-locale Audit      | "audit multi-locale", "missing en-US"            | 5 min          | `docs/growth-sessions/YYYY-MM-DD-audit-{website}.md`            |
| 6. Bulk Product Transcreation | "traduce paquetes", "transcreate all", "bulk transcreate", "traduce todo" | per volume | updated `translations` JSONB + session log |
| 7. OKR Progress Update     | "update OKRs", "check OKRs", "OKR progress", "how are we doing" | 10 min | updated `active.md` + summary |

## Safety rules

Hard rules in [SAFETY.md](SAFETY.md). Summary:

- NEVER mutate truth tables (`hotels`, `activities`, `destinations`).
  `package_kits.translations` and `contacts.translations` JSONB columns ARE writable
  by transcreation scripts. `website_product_pages` SEO overlay columns are writable.
- NEVER delete rows without explicit user confirmation.
- Every mutation MUST be logged in the session file under `## Mutations`.
- DataForSEO + OpenRouter AI calls: **no budget gate** — use freely for growth work.
  Log costs in session for visibility only. No abort on cost.
- Confirm with user before bulk mutations to `website_blog_posts` (>10 rows published).
  Bulk `package_kits.translations` + `contacts.translations` via scripts: always OK.
- Never log or commit secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_AUTH_TOKEN`,
  `DATAFORSEO_PASSWORD`). Redact in session logs.

## APIs inventory

Full list in [APIS.md](APIS.md). Top-level groups:

- **SEO Content Intelligence** — audit, research, optimize, transcreate, score
- **Analytics** — striking-distance, health, sync, integrations/status
- **AI** — generate-blog
- **Direct Supabase** — `websites`, `website_blog_posts`, `website_pages`,
  `seo_keywords`, `seo_keyword_snapshots`, `seo_page_metrics_daily`,
  `seo_audit_results`, `seo_clusters`, `seo_transcreation_jobs`, `seo_localized_variants`
- **MCPs** — `supabase`, `search-console` (GSC), `google-analytics` (GA4),
  `dataforseo` (SERP + keyword metrics — **Tier 1, use freely**),
  `chrome-devtools`, `playwright`. Pending: `mcp-bukeer-studio` (#158).

## Session start ritual (MANDATORY)

At the start of every invocation the agent must do, in order:

1. **Load active OKRs** — `Read docs/growth-okrs/active.md`.
   Extract current cycle targets (7D / 30D / 90D) for the website in scope.
2. **Check budget** — `Read docs/growth-okrs/budget.md`. If any provider is
   ≥80% of cap, flag in session intro; if 100%, refuse paid calls.
3. **Verify MCP availability** — tell the user which of the following are
   reachable this session: `supabase`, `search-console`, `google-analytics`,
   `chrome-devtools`, `playwright`. If a required MCP is missing, fall back
   to HTTP API or stop and ask.
4. **Confirm website slug** — if not given, ask. Never guess.
5. **Report session ready** — short message with: website slug, playbook
   selected, OKR snapshot, budget %, MCPs available.

If any step fails, stop and report rather than improvising.

## Output conventions

| Scope                  | Path                                                          | Template                                      |
|------------------------|---------------------------------------------------------------|-----------------------------------------------|
| Daily / ad-hoc session | `docs/growth-sessions/YYYY-MM-DD-HHMM-{scope}.md`             | `docs/growth-sessions/TEMPLATE.md`            |
| Daily morning          | `docs/growth-sessions/YYYY-MM-DD-morning-{website}.md`        | same template, `scope: daily-check`           |
| Weekly planning        | `docs/growth-weekly/YYYY-WW-{website}.md`                     | `docs/growth-weekly/TEMPLATE.md`              |
| Multi-locale audit     | `docs/growth-sessions/YYYY-MM-DD-audit-{website}.md`          | session template, `scope: audit`              |
| OKR updates            | Edit `docs/growth-okrs/active.md` in place                    | keep table shape                              |
| Budget row             | Append row to `docs/growth-okrs/budget.md` **before** the call | see budget.md rules                          |

Where:
- `YYYY-MM-DD` = ISO date (today).
- `HHMM` = 24h local (only on ad-hoc sessions; fixed slots skip).
- `YYYY-WW` = ISO week (e.g. `2026-W16`).
- `{website}` = subdomain slug with dots → dashes (e.g. `colombiatours-travel`).
- `{scope}` = one of `daily-check | weekly-planning | content-create | translate | audit | bulk`.

Every session file must be self-contained: plan, executed actions, mutations
table, external-cost table, decisions, outputs, next steps, self-review.
The frontmatter fields in the template are all mandatory.

## Prompt templates

Reusable prompts (daily digest, weekly plan, content brief, transcreate, audit)
live in [PROMPTS.md](PROMPTS.md). They are parameterized with `{{VARIABLES}}`
so each playbook can fill and submit them without retyping.

## Examples

Three end-to-end sessions (Monday planning, new post, translation) in
[EXAMPLES.md](EXAMPLES.md).

## Cross-refs

- Session / weekly / OKR / budget templates: `docs/growth-sessions/TEMPLATE.md`,
  `docs/growth-weekly/TEMPLATE.md`, `docs/growth-okrs/TEMPLATE-active.md`,
  `docs/growth-okrs/budget.md`.
- SEO backend service: `lib/seo/backend-service.ts`.
- Content Intelligence routes: `app/api/seo/content-intelligence/*`.
- Blog generator: `app/api/ai/editor/generate-blog/route.ts`.
- Flutter cross-repo context: `.claude/rules/cross-repo-flutter.md`.
- Epic: `#154` (agent enablement). Bootstrap OKRs in `docs/growth-okrs/active.md`.
- Slug-locale helper (planned, pre-#129 ship): `lib/seo/slug-locale.ts` → see #160.

## Escalation

| Situation                                    | Action                                              |
|----------------------------------------------|-----------------------------------------------------|
| All MCPs down and HTTP APIs unreachable      | Stop, report to user, do not fabricate data        |
| Budget ≥100% cap mid-session                 | Abort paid step, finish free steps, flag in output |
| User asks for code change mid-playbook       | Stop playbook, hand off to `nextjs-developer`      |
| Mutation >10 rows or touches published data  | Require explicit "yes proceed" before running      |
| Transcreate review flags accuracy issues     | Do NOT apply; write findings and escalate to user  |
| OKR KPIs all regressing week-over-week       | Write plan, flag as systemic, suggest retrospective|
