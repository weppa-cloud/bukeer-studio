# CLAUDE.md — bukeer-studio

This file provides guidance to Claude Code when working in this repository.

## What this repo is

Bukeer Website Studio — the Next.js 15 public website renderer and design token packages for Bukeer travel agency websites. Deployed as a Cloudflare Worker via OpenNext.

**Related repo:** `weppa-cloud/bukeer-flutter` — Flutter app + Supabase backend (shared DB).

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

### Sesiones paralelas (testing / agentes en paralelo)

Cada sesión tiene su propio puerto, caché de Next y reportes de Playwright.
Ver doc completa: [`docs/development/local-sessions.md`](docs/development/local-sessions.md)

```bash
# Sesión A
PORT=3001 NEXT_DIST_DIR=.next-s1 npm run dev:session

# Sesión B
PORT=3002 NEXT_DIST_DIR=.next-s2 npm run dev:session

# E2E aislado por sesión
SESSION_NAME=s1 PORT=3001 npm run test:e2e:session
SESSION_NAME=s2 PORT=3002 npm run test:e2e:session
```

Los scripts `scripts/start-dev-node.sh` y `scripts/run-e2e-session.sh` usan `command -v node` — funcionan con cualquier Node ≥ 22 del PATH, sin depender de rutas Homebrew hardcodeadas.

### Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Dev con Turbopack en :3000 |
| `npm run dev:session` | Dev aislado (PORT + NEXT_DIST_DIR configurables) |
| `npm run test:e2e` | Playwright completo |
| `npm run test:e2e:session` | Playwright aislado por SESSION_NAME + PORT |
| `npm run start:prod:clean` | Limpia cache, build producción y arranca |

## Building for Cloudflare Workers

```bash
npm run build:worker   # → .open-next/worker.js
```

## Local Cloudflare preview

```bash
cp .dev.vars.example .dev.vars   # fill real values
npm run preview:worker
```

---

## Package dependency graph

```
@bukeer/theme-sdk (v3.0.0)
    ↓ imported by
@bukeer/website-contract (v0.1.0)
    ↓ imported by
Next.js app (web root)
```

Both packages are consumed via `transpilePackages` in `next.config.ts` — Next.js transpiles them directly from `src/`. No `dist/` build is needed for the app to work. The `npm run build` on each package is only needed for standalone TypeScript consumers.

---

## Path aliases

```json
"@bukeer/website-contract": ["./packages/website-contract/src"],
"@bukeer/theme-sdk":         ["./packages/theme-sdk/src"]
```

Set in `tsconfig.json`. The `next.config.ts` has matching `transpilePackages`.

---

## Deploy

Push to `main` → GitHub Actions runs `build` + `deploy-staging` automatically.

Cloudflare Worker name: `bukeer-web-public` (staging: `bukeer-web-public-staging`).

Production deploy is commented out in `.github/workflows/deploy.yml` — uncomment `deploy-production` when ready.

### Rollback

```bash
npx wrangler rollback           # instant rollback to previous version
npx wrangler versions list      # see version history
```

---

## Architecture

Full architecture docs, principles (P1-P10), and ADRs: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
Onboarding guide for new developers: [`docs/architecture/ONBOARDING-ARCHITECTURE.md`](docs/architecture/ONBOARDING-ARCHITECTURE.md)

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

## Key patterns

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

**Related repo path**: `/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter`
**GitHub**: `weppa-cloud/bukeer-flutter`
**Purpose**: Flutter Web app (PWA) + Supabase backend. Admin panel, CRM, itinerary management. Shares the same Supabase project as this repo.

### Shared DB tables (same Supabase project)
- `websites` — written by Flutter admin, read here for rendering
- `package_kits` + `package_kit_versions` — Flutter manages catalog; studio displays on public site
- `itineraries`, `itinerary_items`, `contacts`, `products` — shared data model

### Key decisions taken in bukeer-flutter (2026-04-10)

#### Package Kits
- **Currency rule**: Packages are ALWAYS displayed in the account's primary (base) currency. `resolveDisplayCurrency()` uses `fallbackBaseCurrency` (from `appServices.account.primaryCurrency`) as the only source. The `base_currency` field on the package itself is ignored for display.
- **Item editability**: Items applied to an itinerary from a package are freely editable. The package catalog stays immutable; the itinerary copy is a template. `is_from_package=true` is a badge/origin marker, NOT a lock.
- **product_type values in DB**: `itinerary_items.product_type` uses Spanish capitalized values: `'Hoteles'`, `'Servicios'`, `'Transporte'`, `'Vuelos'`. The `services_snapshot` JSONB inside `package_kit_versions` stores lowercase (`hotels`, `activities`, etc.) — normalized at insert time by the RPC.

#### Theme v3
- DB shape: `websites.theme = { tokens: DesignTokens, profile: ThemeProfile }` — CHECK constraint enforces v3. **NEVER** write flat shape (`seedColor` at root).
- Flutter reads via `WebsiteThemeModel.fromJson()`. Studio reads via `@bukeer/theme-sdk` `compileTheme()`.
- 8 system presets: adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic.

#### Auth
- Auth token boundary (ADR-022): UI must not access JWT tokens directly. API calls go through service methods.
- Same Supabase auth project — SSR cookies flow through Next.js middleware for studio.

### SEO gaps to fix in this repo (2026-04-10)
1. **`inLanguage`** hardcoded to `'es'` in JSON-LD generators — should read `website.locale` or `website.language` from DB
2. **`/packages/[slug]` page** missing — no public detail page for Package Kits
3. **`slug` field** missing in `package_kits` DB table (needs migration in bukeer-flutter)

### Flutter ↔ Studio data flow
```
Flutter admin creates/edits website content
        ↓  (Supabase DB, shared project)
Studio reads via createClient() SSR
        ↓  (ISR revalidation via REVALIDATE_SECRET)
Public website serves cached pages
```

### Issue cross-references
- Package Kit distribution: `weppa-cloud/bukeer-flutter#544` (audit), `#545` (epic)
- Website UX redesign: `weppa-cloud/bukeer-flutter#548`
- Theme Platform v3: `weppa-cloud/bukeer-flutter#550`
