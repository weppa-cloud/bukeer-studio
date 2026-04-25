# web-public — Bukeer Multi-Tenant Websites

Next.js 15 application serving agency websites, visual editor, and AI copilot. Deployed to **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare).

## URLs

| Environment | URL |
|-------------|-----|
| Studio production | `https://studio.bukeer.com` |
| Public websites | `https://*.bukeer.com`, custom tenant domains |
| Staging | `https://bukeer-web-public-staging.<account>.workers.dev` |
| Local dev | `http://localhost:3000` |

## Getting Started

```bash
# 0. Use the project Node version
nvm use

# 1. Install dependencies
npm ci

# 2. Copy env file
cp .dev.vars.example .dev.vars
# Fill in real values from Supabase Dashboard → Settings → API

# 3. Run dev server (standard Next.js)
npm run dev

# 4. Or run with Cloudflare Workers runtime (matches production)
npm run dev:worker
```

Open [http://localhost:3000/?subdomain=demo-travel](http://localhost:3000/?subdomain=demo-travel) to preview a tenant site.

## Deployment

### Automatic (CI/CD)

Push to `main` with changes in `web-public/` triggers `.github/workflows/deploy-web-public.yml`:

1. Builds `@bukeer/website-contract` (shared types)
2. Runs `opennextjs-cloudflare build` (Next.js → Worker bundle)
3. Enforces 10 MB compressed size gate
4. Deploys via `wrangler deploy`

### Manual

```bash
# Build + deploy to production
npm run deploy:worker

# Build + deploy to staging
npm run build:worker && npx wrangler deploy --env staging
```

### Rollback

```bash
npx wrangler rollback                          # Instant: previous version
npx wrangler versions list                     # List versions
npx wrangler versions deploy <version-id>      # Deploy specific version
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Checks Node version + runs `dev:node` |
| `npm run dev:node` | Next.js dev server (standard Node.js runtime) |
| `npm run dev:worker` | OpenNext build + local Cloudflare Worker preview |
| `npm run clean` | Removes local build/test artifacts |
| `npm run build` | Standard Next.js build |
| `npm run build:worker` | OpenNext build for Cloudflare Workers |
| `npm run deploy:worker` | Build + deploy to production |
| `npm run cf-typegen` | Generate TypeScript types from `wrangler.toml` bindings |

## Infrastructure

| Resource | Purpose |
|----------|---------|
| Cloudflare Workers | Edge compute (SSR, API routes, middleware) |
| Cloudflare R2 (`bukeer-web-public-cache`) | ISR incremental cache |
| Durable Objects (`DOQueueHandler`) | Time-based revalidation queue |
| Supabase | Database, Auth, Storage |
| OpenRouter | LLM provider for AI copilot/chat |

## Key Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Worker bindings, R2, DO, environments |
| `open-next.config.ts` | OpenNext adapter config (R2 cache + DO queue) |
| `.dev.vars.example` | Template for local secrets |
| `middleware.ts` | Multi-tenant routing (subdomain → `/site/[subdomain]`) |

## Specs & Docs

- **Deployment spec**: `docs/specs/SPEC_DEPLOY_WEB_PUBLIC_CLOUDFLARE_WORKERS.md`
- **Architecture**: `docs/02-architecture/decisions/ADR-033-website-platform-evolution.md`
- **AI Copilot spec**: `docs/specs/SPEC_WEBSITE_COPILOT.md`

## Studio Theme System V1 (Admin/Editor)

### Scope

- Applies only to Studio surfaces (`/dashboard/*` and editor workspaces).
- Public website render theme (`ThemeV3`, `website_theme_vN`) is intentionally out of scope in V1.

### Single Source Of Truth

- Tokens: `lib/studio/theme.ts`
- Base primitives: `components/studio/ui/primitives.tsx`
- Runtime CSS variables/classes: `app/globals.css` (`--studio-*` and `.studio-*`)

### Rules

- Use `studio-*` tokens/classes or Studio primitives for all base controls.
- Do not introduce new raw HEX values in Studio components.
- Do not use ad-hoc control styling (`<button className="...">`, `<input className="...">`) when `StudioButton`, `StudioInput`, `StudioSelect`, `StudioTabs`, `StudioListRow`, or `StudioBadgeStatus` fit.
- Keep light/dark parity by relying on semantic variables (`--studio-*`) only.

### PR Checklist (Studio)

- [ ] New/updated Studio views use `components/studio/ui/primitives.tsx`.
- [ ] No raw classes for critical controls (buttons, inputs, tabs, select, textarea, list rows, status badges).
- [ ] Focus-visible state is preserved for keyboard navigation.
- [ ] Text and status contrast meet WCAG AA in light and dark modes.
- [ ] Editor topbar + panel tabs (Edit/AI/SEO) remain visually consistent with dashboard tabs.
