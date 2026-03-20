# web-public — Bukeer Multi-Tenant Websites

Next.js 15 application serving agency websites, visual editor, and AI copilot. Deployed to **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare).

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://bukeer.com`, `https://*.bukeer.com` |
| Staging | `https://bukeer-web-public-staging.<account>.workers.dev` |
| Local dev | `http://localhost:3000` |

## Getting Started

```bash
# 1. Install dependencies
npm ci

# 2. Copy env file
cp .dev.vars.example .dev.vars
# Fill in real values from Supabase Dashboard → Settings → API

# 3. Run dev server (standard Next.js)
npm run dev

# 4. Or run with Cloudflare Workers runtime (matches production)
npm run preview:worker
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
| `npm run dev` | Next.js dev server (standard Node.js runtime) |
| `npm run build` | Standard Next.js build |
| `npm run build:worker` | OpenNext build for Cloudflare Workers |
| `npm run preview:worker` | Build + preview in local Workers runtime |
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
