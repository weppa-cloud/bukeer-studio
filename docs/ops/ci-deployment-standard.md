# CI and Deployment Standard

> Cross-repository standard for Bukeer Flutter and Bukeer Studio CI/CD automation. The goal is to preserve production safety while reducing unnecessary deploy and hosted-runner cost.

## Standard Branch Model

| Branch/Event | Purpose | Allowed automation |
|--------------|---------|--------------------|
| Pull request | Review and quality validation | CI checks only, no deployment previews by default |
| `dev` | Integration branch | CI checks only, no deployment |
| `main` | Production release branch | CI checks, build, production deployment |
| `workflow_dispatch` | Manual operator action | Allowed for exceptional deploys, audits, and recovery |
| `schedule` | Operational maintenance | Allowed only for backups and explicitly approved monitors |

## CI Provider Failover Flag

Use a shared provider flag to switch quality gates without changing workflow files:

```text
CI_QUALITY_PROVIDER=circleci
CI_QUALITY_PROVIDER=github
CI_QUALITY_PROVIDER=both
CI_DEPLOY_PROVIDER=circleci
CI_DEPLOY_PROVIDER=github
```

Provider modes:

| Value | Meaning | Use case |
|-------|---------|----------|
| `circleci` | CircleCI is the primary quality gate | Default while GitHub Actions billing is constrained |
| `github` | GitHub Actions is the primary quality gate; CircleCI still runs `main` quality as standby | Default for GitHub-primary with CircleCI fallback |
| `both` | Run both providers | Temporary migration, audit, or confidence window |

Set the same value in:

- CircleCI project environment variable: `CI_QUALITY_PROVIDER`
- GitHub repository variable: `CI_QUALITY_PROVIDER`

CircleCI is configured to halt early on non-`main` branches when `CI_QUALITY_PROVIDER=github`, while still running `main` quality as standby for deployment failover. Expensive GitHub quality workflows can be configured to skip when `CI_QUALITY_PROVIDER=circleci`, while GitHub deployment workflows remain available for `main`.

Deploy provider modes:

| Value | Meaning | Use case |
|-------|---------|----------|
| `circleci` | CircleCI deploys production from `main` | Default while GitHub Actions billing is constrained |
| `github` | GitHub Actions deploys production from `main`; CircleCI waits and takes over only if GitHub does not deploy the SHA | Default for GitHub-primary with CircleCI fallback |

CircleCI deploy jobs wait for the GitHub `deploy-production` check when `CI_DEPLOY_PROVIDER=github`. If GitHub succeeds, CircleCI halts before deployment. If GitHub fails, is cancelled, is skipped, or never starts before the wait window, CircleCI deploys the same SHA. GitHub deployment jobs run only when `CI_DEPLOY_PROVIDER=github` is set explicitly.

## Failover Procedure

### CircleCI Primary

1. Set `CI_QUALITY_PROVIDER=circleci` in CircleCI and GitHub repository variables.
2. Set `CI_DEPLOY_PROVIDER=circleci` in CircleCI and GitHub repository variables.
3. Make CircleCI `quality` required in branch protection.
4. Unrequire expensive GitHub quality checks while GitHub billing is constrained.
5. Let CircleCI deploy production from `main`.

### GitHub Primary With CircleCI Fallback

1. Set `CI_QUALITY_PROVIDER=github` in CircleCI and GitHub repository variables.
2. Set `CI_DEPLOY_PROVIDER=github` in CircleCI and GitHub repository variables.
3. Set `CI_DEPLOY_FALLBACK_PROVIDER=circleci` in GitHub repository variables.
4. Store `CIRCLE_TOKEN` as a GitHub secret so GitHub can trigger CircleCI when its deploy job fails after starting.
5. Confirm CircleCI receives push webhooks for `main`; this covers the case where GitHub Actions cannot start because of billing or hosted-runner limits.
6. Make the GitHub quality checks required in branch protection.
7. Let GitHub Actions deploy production from `main`, with CircleCI waiting as the takeover path.

### Both Providers

1. Set `CI_QUALITY_PROVIDER=both`.
2. Keep both CircleCI and GitHub checks visible.
3. Use this temporarily during migration or after CI changes.
4. Return to exactly one required provider after confidence is restored.

## Bukeer Studio Inventory

| Workflow | Current role | Deployment target | Standard |
|----------|--------------|-------------------|----------|
| `.circleci/config.yml` | Off-GitHub fallback quality and production deploy runtime | Cloudflare Worker via OpenNext on `studio.bukeer.com` when GitHub does not deploy the SHA | Run quality on `main`; deploy only on `main` after GitHub wait/takeover |
| `.github/workflows/deploy.yml` | Primary quality, smoke, and production deployment | Cloudflare Worker via OpenNext on `studio.bukeer.com` when `CI_DEPLOY_PROVIDER=github` | Run on `main`; no `dev` Worker deploy; unit tests are non-fatal until the baseline is cleaned |
| `.github/workflows/nightly-worker-preview.yml` | Worker preview + `@p0-seo` validation | Local Worker preview only | Manual only while conserving resources |
| `.github/workflows/ct-visual.yml` | Playwright component/visual tests | None | Skips when `CI_QUALITY_PROVIDER=circleci`; fallback when `CI_QUALITY_PROVIDER=github` or `both` |
| `.github/workflows/ai-sync-autofix.yml` | AI artifact sync commit | Repository files | Main-only maintenance automation |

## Bukeer Flutter Inventory

| Workflow | Current role | Deployment target | Standard |
|----------|--------------|-------------------|----------|
| `.circleci/config.yml` | Primary off-GitHub quality gate | None | Run on PR/dev/main as CI only |
| `.github/workflows/deploy-cloudflare.yml` | Flutter Web production deployment | Cloudflare Pages project `bukeer`, production URL `https://app.bukeer.com` | Run only on `main` or manual `main`; no `dev` deploy and no PR preview |
| `.github/workflows/deploy-agent.yml` | Agent server deployment | CapRover app `bukeer-agent` | Run only on `main` path changes or manual |
| `.github/workflows/deploy-docs.yml` | Documentation site deployment | Cloudflare Pages project `bukeer-docs` | Production on `main`; preview deploys may be disabled if cost pressure increases |
| `.github/workflows/deploy-caprover.yml` | Legacy/manual Flutter CapRover deployment | CapRover | Manual only |
| `.github/workflows/backup.yml` | Database backup | Cloudflare R2 | Scheduled/manual operational backup |
| `.github/workflows/backup-chatwoot.yml` | Chatwoot backup | Cloudflare R2 | Scheduled/manual operational backup |

## Required Flow

### Pull Request

1. GitHub runs the default quality gate when `CI_QUALITY_PROVIDER=github`.
2. CircleCI halts early on non-`main` branches when GitHub is primary.
3. GitHub deployment workflows do not publish previews by default.
4. Heavy E2E, visual regression, Lighthouse, or Worker preview jobs are manual unless explicitly needed.

### Dev

1. Merging to `dev` validates integration.
2. GitHub quality checks run when GitHub is primary; CircleCI halts early unless configured as primary.
3. No Flutter Web deploy.
4. No Studio Worker deploy.

### Main

1. Merging to `main` is a production release decision.
2. CI gates must pass.
3. Bukeer Flutter deploys to Cloudflare Pages production through the active deploy provider.
4. Bukeer Studio deploys to Cloudflare Workers production on `studio.bukeer.com` through the active deploy provider.
5. Post-deploy verification runs against production URLs.

## Production Targets

| System | Repository | Production target |
|--------|------------|-------------------|
| Bukeer Flutter Web | `bukeer_flutter` | Cloudflare Pages `bukeer` / `https://app.bukeer.com` |
| Bukeer Studio | `bukeer-studio` | Cloudflare Worker / `https://studio.bukeer.com` and tenant domains |
| Bukeer public website | external/current web property | `https://bukeer.com` |
| Bukeer Docs | `bukeer_flutter` | Cloudflare Pages `bukeer-docs` |
| Agent Server | `bukeer_flutter` | CapRover `bukeer-agent` |

## Change Policy

Any workflow that deploys from a non-`main` branch must be treated as an exception and documented before enabling. The default posture is:

```text
PR/dev = validate only
main = validate + deploy production
manual = exceptional operations
```
