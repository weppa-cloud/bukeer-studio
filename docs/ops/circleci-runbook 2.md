# CircleCI Runbook

> Operational guide for running Bukeer Studio quality gates on CircleCI when GitHub Actions is blocked by billing, spending limits, or hosted-runner minute exhaustion.

## Purpose

CircleCI is the off-GitHub CI/CD runtime for `bukeer-studio`. GitHub remains the source repository, while CircleCI runs the Node/Next.js quality gate and can deploy production from `.circleci/config.yml`.

Use CircleCI when:

- GitHub Actions fails immediately because of billing or spending limits.
- The team needs to keep pull request validation running without consuming GitHub-hosted runner minutes.
- GitHub deployment workflows must remain paused, but code quality checks and production deploys still need to run.

## Configuration File

CircleCI is configured at:

```text
.circleci/config.yml
```

The default executor uses:

```text
cimg/node:22.13-browsers
```

This matches the repository requirement of Node 22+ and includes browser dependencies for the optional Playwright component-test job.

## Default Quality Gate

The default `ci` workflow runs only the `quality` job to preserve CircleCI free-tier credits.

| Step | Command | Blocking |
|------|---------|----------|
| Node version check | `npm run check:node` | Yes |
| Build `theme-sdk` | `npm run build --prefix packages/theme-sdk` | Yes |
| Build `website-contract` | `npm run build --prefix packages/website-contract` | Yes |
| Install app dependencies | `npm ci` | Yes |
| AI sync check | `npm run ai:check` when `.mcp.json` exists | No when `.mcp.json` is absent |
| Lint | `npm run lint` | Yes |
| Type check | `npm run typecheck` | Yes |
| Unit tests | `npm test -- --ci --passWithNoTests` | Yes |
| Tech validator | `npm run tech-validator:code` | Yes |

The tech-validator report is stored as a CircleCI artifact:

```text
tech-validator
```

CircleCI skips `npm run ai:check` when `.mcp.json` is absent because that file can be local-environment specific. GitHub Actions may continue enforcing AI sync separately when the repository provides the required MCP config.

## Production Deploy Job

The `deploy_production` job runs only on `main` and requires `quality` to pass first.

It runs:

```bash
npm run build:worker
npx opennextjs-cloudflare deploy --env ""
curl https://studio.bukeer.com
```

Required CircleCI environment variables:

```text
CI_QUALITY_PROVIDER=circleci
CI_DEPLOY_PROVIDER=circleci
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_API_KEY=...
CLOUDFLARE_EMAIL=...
CLOUDFLARE_ACCOUNT_ID=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
REVALIDATE_SECRET=...
```

Bootstrap from a local shell after creating a CircleCI personal API token:

```bash
export CIRCLE_TOKEN=...
export CLOUDFLARE_API_TOKEN=...
# Or, when using a Cloudflare Global API Key:
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_EMAIL=...
export CLOUDFLARE_ACCOUNT_ID=...
./scripts/bootstrap-circleci.sh
```

The script creates or verifies the CircleCI project, loads `.env.local`/`.dev.vars`, maps `NEXT_PUBLIC_SUPABASE_URL` to `SUPABASE_URL`, sets `CI_QUALITY_PROVIDER=circleci` and `CI_DEPLOY_PROVIDER=circleci` by default, accepts either `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`, and writes project environment variables without printing secret values.

Set `CI_DEPLOY_PROVIDER=github` to make CircleCI halt the deploy job and let GitHub Actions be the deployment provider instead.

## Optional Component Test Job

The config defines a `component_tests` job, but the default workflow does not run it. This avoids burning credits on Playwright visual regression for every branch event.

Enable `component_tests` only when CircleCI credits allow it or when GitHub Actions component tests are unavailable for an extended period.

To enable it, add the job under the `ci` workflow:

```yaml
workflows:
  ci:
    jobs:
      - quality
      - component_tests:
          requires:
            - quality
```

The job runs:

```bash
npm run test:ct
```

It stores:

```text
playwright-report
test-results
```

## Activation Steps

1. Open CircleCI and authenticate with GitHub.
2. Add the `bukeer-studio` project.
3. Choose the existing configuration option.
4. Confirm CircleCI detects `.circleci/config.yml`.
5. Trigger the first pipeline on the working branch.
6. Confirm the `quality` job is green.
7. Only after stable green runs, make the CircleCI `quality` status required in GitHub branch protection.

## GitHub Actions Coexistence

CircleCI does not replace deployment workflows by default. Keep deploys in GitHub Actions unless the deployment workflow itself must be migrated.

Recommended modes:

| Mode | Use Case | Action |
|------|----------|--------|
| Coexistence | GitHub billing is healthy | Keep GitHub Actions and CircleCI enabled temporarily |
| CircleCI primary | GitHub billing blocks hosted checks or deploys | Require CircleCI `quality`, set `CI_DEPLOY_PROVIDER=circleci` |
| GitHub primary | CircleCI credits are exhausted | Set `CI_QUALITY_PROVIDER=github` and `CI_DEPLOY_PROVIDER=github` |

Do not delete GitHub workflows until CircleCI has produced stable green runs for `dev` and `main`.

## Branch Protection Update

After CircleCI is stable:

1. Open GitHub repository settings.
2. Go to branch protection rules for `dev` and `main`.
3. Add CircleCI `quality` as a required status check.
4. Remove or temporarily unrequire GitHub checks blocked by billing.
5. Open a pull request and verify CircleCI appears as required.

## Cost Controls

The current config preserves credits by:

- Running only the `quality` job by default.
- Caching `~/.npm`, root `node_modules`, internal package `node_modules`, and `.next/cache`.
- Keeping Playwright component tests out of the default workflow.
- Avoiding Worker preview and deploy jobs in CircleCI.

If credits are still tight:

1. Keep only `lint`, `typecheck`, and `tech-validator:code` as the default gate.
2. Move `npm test` to scheduled/manual execution.
3. Keep Playwright tests on GitHub when billing is restored or run them manually.

## Troubleshooting

### CircleCI Does Not Start

Check:

- CircleCI GitHub app has access to `bukeer-studio`.
- The project is enabled in CircleCI.
- `.circleci/config.yml` exists on the pushed branch.
- CircleCI project settings are not ignoring the branch.

### Dependency Install Fails

Run locally:

```bash
npm ci
npm ci --prefix packages/theme-sdk
npm ci --prefix packages/website-contract
```

If a package lock changed, commit the matching `package-lock.json`.

### Node Version Fails

The repo requires Node 22+:

```bash
npm run check:node
```

CircleCI uses `cimg/node:22.13-browsers`. If the repo raises the Node requirement, update `.circleci/config.yml`.

### Lint Fails

Run locally:

```bash
npm run lint
```

This includes `next lint` and the hardcoded public UI lint.

### Type Check Fails

Run locally:

```bash
npm run typecheck
```

Fix TypeScript errors before retrying the pipeline.

### Tech Validator Fails

Run locally:

```bash
npm run tech-validator:code
```

Check `reports/tech-validator/` for the generated report.

### Component Tests Need To Run

Use the local session-pool rules from `AGENTS.md` for agent-run E2E work. CircleCI component tests are isolated CI jobs and do not use the local session pool.

To run component tests locally:

```bash
npm run test:ct
```

## Local Verification

Before pushing CircleCI config changes:

```bash
ruby -e "require 'yaml'; YAML.load_file('.circleci/config.yml'); puts 'YAML OK'"
docker manifest inspect cimg/node:22.13-browsers
```

If the CircleCI CLI is installed:

```bash
circleci config validate .circleci/config.yml
```

## Ownership

CircleCI ownership belongs to the Studio engineering workflow owner. Changes to `.circleci/config.yml` should be reviewed as CI infrastructure changes because failures can block delivery on `dev` and `main`.
