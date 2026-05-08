# CLAUDE.md — bukeer-studio

This file provides guidance to Claude Code when working in this repository.

## What this repo is

Bukeer Website Studio — the Next.js 15 public website renderer and design token packages for Bukeer travel agency websites. Deployed as a Cloudflare Worker via OpenNext.

**Related repo:** `weppa-cloud/bukeer-flutter` — Flutter app + Supabase backend (shared DB).

## Knowledge graph (LLM Wiki)

**Entry point:** [`docs/INDEX.md`](./docs/INDEX.md) — Obsidian-style index of all ADRs, SPECs, ops docs, and cross-cutting concepts. Use it to navigate the repo's knowledge graph via `[[ADR-XXX]]` / `[[SPEC_NAME]]` / `[[concept]]` wikilinks. When adding a new ADR/SPEC/runbook, update `docs/INDEX.md` (table row + concept section + resolution map).

---

## Repo layout

```
/                          ← Next.js 15 app (Cloudflare Worker)
├── app/                   ← App Router (pages, API routes)
│   ├── (auth)/
│   ├── api/               ← API routes (AI, auth, webhooks)
│   ├── dashboard/         ← Website builder dashboard
│   ├── editor/            ← Visual section editor
│   └── site/[subdomain]/  ← Public website rendering
├── components/            ← React components
│   ├── admin/             ← Dashboard editors (theme, content, SEO)
│   ├── editor/            ← Section editor UI
│   ├── site/              ← Public site (header, footer)
│   ├── studio/            ← Website Studio UI
│   └── ui/                ← shadcn/ui base components
├── lib/                   ← Business logic & utilities
│   ├── ai/                ← LLM integration (OpenRouter)
│   │   └── prompts/       ← Centralized AI prompt templates
│   ├── env.ts             ← Zod-validated environment variables
│   ├── sections/          ← Section type definitions & schema
│   ├── studio/            ← Studio-specific utilities
│   ├── supabase/          ← DB queries & client setup
│   └── theme/             ← M3ThemeProvider
├── packages/
│   ├── theme-sdk/         ← @bukeer/theme-sdk v3 (design tokens, compiler)
│   └── website-contract/  ← @bukeer/website-contract (Zod schemas, types)
└── .github/workflows/
    └── deploy.yml         ← Build → staging → (prod when enabled)
```

---

## Tech stack

- **Next.js 15** / React 19 / TypeScript strict
- **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Tailwind CSS v4** + shadcn/ui + Aceternity UI + Magic UI
- **Supabase** (SSR client — same project as bukeer-flutter)
- **Zod v4** for schema validation
- **Framer Motion** for animations

---

## Local development

### Requisitos
- **Node ≥ 22** (22.x y 24.x validados). El check de versión bloquea si es < 22.
- **Turbopack** activo por defecto en `dev:node` (`next dev --turbo`).

```bash
# 1. Build packages first (required before npm run dev)
cd packages/theme-sdk && npm ci && npm run build && cd ../..
cd packages/website-contract && npm ci && npm run build && cd ../..

# 2. Install app dependencies
npm ci

# 3. Copy env template and fill values
cp .env.local.example .env.local

# 4. Run dev server (Turbopack, puerto 3000)
npm run dev        # → http://localhost:3000
```

### Sesiones paralelas

Each session uses its own port + cache + Playwright reports. See [`docs/development/local-sessions.md`](docs/development/local-sessions.md).
```bash
PORT=3001 NEXT_DIST_DIR=.next-s1 npm run dev:session          # dev
SESSION_NAME=s1 PORT=3001 npm run test:e2e:session             # e2e
```

### Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Dev con Turbopack en :3000 |
| `npm run dev:session` | Dev aislado (PORT + NEXT_DIST_DIR configurables) |
| `npm run test:e2e` | Playwright completo |
| `npm run test:e2e:session` | Playwright aislado por SESSION_NAME + PORT |
| `npm run start:prod:clean` | Limpia cache, build producción y arranca |
| `bash scripts/lighthouse-ci.sh` | Lighthouse CI gate (perf/a11y/SEO/best-practices) via session pool — ver [`docs/ops/lighthouse-ci.md`](docs/ops/lighthouse-ci.md) |

## Build & Deploy

```bash
npm run build:worker                    # → .open-next/worker.js (Cloudflare)
cp .dev.vars.example .dev.vars && npm run preview:worker   # local CF preview
```

## Packages

`@bukeer/theme-sdk` → `@bukeer/website-contract` → Next.js app. Both consumed via `transpilePackages` in `next.config.ts` (transpiled from `src/`, no `dist/` needed).

Path aliases in `tsconfig.json`: `@bukeer/website-contract` → `./packages/website-contract/src`, `@bukeer/theme-sdk` → `./packages/theme-sdk/src`.

---

## Deploy

Push to `main` → GitHub Actions → `build` + `deploy-staging`. Worker: `bukeer-web-public`. Prod deploy commented out in `.github/workflows/deploy.yml`.
Rollback: `npx wrangler rollback`. Architecture: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
Product Landing v1 rollout runbook: [`docs/ops/product-landing-v1-runbook.md`](docs/ops/product-landing-v1-runbook.md)

---

## Skills & Commands

**Skills** (auto-activate based on context):
- `nextjs-developer` — Pages, components, API routes, hooks, AI integration
- `website-section-generator` — Next.js tourism sections (shadcn, Aceternity, Magic UI)
- `website-designer` — Brand briefs → design specifications + theme presets
- `website-quality-gate` — Lighthouse, WCAG AA, Core Web Vitals validation
- `backend-dev` — Supabase DB, RLS, Edge Functions, migrations
- `tech-validator` — Plan/task/code validation against ADRs
- `specifying` — Feature requests → executable specs
- `docs-keeper` — Documentation organization and maintenance
- `prompt-optimiser` — Optimize prompts before execution
- `debugger` — Structured bug diagnosis and resolution with visual feedback loop

**Commands** (invoke with `/command-name`):
- `/qa-nextjs` — Studio editor QA with UX analysis and screenshots
- `/website-creator` — Data-only website operations (Rol 2: themes, sections, content via Supabase)
- `/design-session` — Flexible website design improvement (Rol 2: analyze, redesign, validate visually)

### Workflows by Role

**Studio Developer (Rol 1)** — modifies repo code:
- Bug: `debugger` → fix → `tech-validator` MODE:CODE → commit
- Feature: `specifying` → `tech-validator` MODE:PLAN → `nextjs-developer` → commit
- QA: `/qa-nextjs` → issues → `debugger`

**Website Creator (Rol 2)** — modifies Supabase data only:
- Command: `/website-creator`
- New site: brief → theme preset → sections → visual QA
- Edit theme: screenshot before → redesign tokens → screenshot after
- Add section: check registry → insert DB → verify visual
- Bug found in component → STOP → switch to Rol 1 with `debugger`

---

## E2E Testing — Session Pool (MANDATORY for all agents)

**Never** run `npm run test:e2e`, `npm run dev`, or `playwright test` directly from any agent.
Port 3000 is reserved for manual dev only. Agents must use the session pool.

### Pool: 4 slots — claim before any test or dev server

| Slot | Port | Build cache | Reports               |
|------|------|-------------|-----------------------|
| s1   | 3001 | `.next-s1`  | `playwright-report/s1` |
| s2   | 3002 | `.next-s2`  | `playwright-report/s2` |
| s3   | 3003 | `.next-s3`  | `playwright-report/s3` |
| s4   | 3004 | `.next-s4`  | `playwright-report/s4` |

### Commands

```bash
npm run session:list                        # check free slots before starting
npm run session:run                         # auto-claim + run all tests + auto-release
npm run session:run -- --grep "checkout"    # pass Playwright args after --
npm run session:release s2                  # release stuck slot
```

### Interactive (Playwright MCP) pattern

```bash
eval "$(bash scripts/session-acquire.sh)"   # claim slot → sets SESSION_NAME, PORT, _ACQUIRED_SESSION
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"
# ... run MCP tests on http://localhost:$PORT ...
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

### If all 4 slots busy
Report to user. Do NOT spin a 5th server. `session:run` auto-clears stale locks (dead PIDs).

Full docs: `docs/development/local-sessions.md`

---

## Key patterns

### Funnel Events SOT + multi-tenant platform config

`funnel_events` is the source of truth for growth tracking. New writers should call `record_funnel_event(payload jsonb)` server-side instead of writing destination logs directly. Platform dispatch is multi-tenant: public browser Pixel IDs live in `websites.analytics`, while Meta CAPI/Ads credentials live in `account_channel_contracts` via `service_channels`. Do not add production fan-out that depends on global `META_PIXEL_ID`, `META_ACCESS_TOKEN`, Google conversion action IDs, or equivalent env credentials except local/test fallback.

### Supabase client
```typescript
// Server component / Server Action
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client component
import { createClient } from '@/lib/supabase/client'
```

### Theme SDK usage
```typescript
import { compileTheme } from '@bukeer/theme-sdk'
import type { ThemeInput } from '@bukeer/theme-sdk'
```

### Website contract types
```typescript
import type { WebsiteData, WebsiteSection } from '@bukeer/website-contract'
import { SECTION_TYPES } from '@bukeer/website-contract'
```

### Never hardcode section types — use `SECTION_TYPES` from `@bukeer/website-contract`.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same project as bukeer-flutter |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Edge API calls |
| `OPENROUTER_AUTH_TOKEN` | Yes | AI section generation |
| `OPENROUTER_BASE_URL` | Yes | e.g. `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | Yes | e.g. `anthropic/claude-sonnet-4-5` |
| `REVALIDATE_SECRET` | Yes | ISR revalidation endpoint |
| `NEXT_PUBLIC_GA_ID` | Optional | Google Analytics |

---

## Cross-Repo Context: bukeer-flutter

See `.claude/rules/cross-repo-flutter.md` for full details on shared DB tables, key decisions, and data flow.

Key facts: Same Supabase project. Theme shape: `{ tokens, profile }` (never flat). 8 presets. Flutter admin writes data, Studio reads it via SSR.
