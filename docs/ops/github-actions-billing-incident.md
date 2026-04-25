# GitHub Actions — Billing Incident Runbook

**Status:** Active incident (2026-04-17)
**Symptom:** CI workflow runs fail in 3-4s with annotation:
> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings

## Impact

All `Deploy bukeer-studio to Cloudflare Workers` runs triggered by push to `main` or `dev` fail before jobs start. CI deploy paths are blocked until billing is resolved.

## Affected runs (2026-04-17)

| Run ID | Commit | Status |
|--------|--------|--------|
| 24595872640 | `beb1f8e` P1 pivot package_kits | ❌ billing block |
| 24589245606 | `7762b37` locale switch fix | ❌ billing block |
| 24588292789 | `f800254` booking Phase B foundation | ❌ billing block |

## Resolution steps

### 1. Verify root cause

```bash
gh run view <RUN_ID> --repo weppa-cloud/bukeer-studio
```

Look for annotation mentioning "payments have failed" or "spending limit". If present → billing issue, NOT code issue.

### 2. Fix billing (owner: GitHub org admin)

1. Navigate to: `https://github.com/organizations/weppa-cloud/settings/billing`
2. Check **Payment method** — update card if declined
3. Check **Spending limits** — Actions may have hit the configured cap
4. Options:
   - Update payment method
   - Raise Actions spending limit (Organization → Billing → Spending limits → Actions)
   - Switch to monthly invoicing if eligible

### 3. Re-trigger failed workflows

After billing is resolved:

```bash
# Re-run the most recent failed workflow
gh run rerun 24595872640 --repo weppa-cloud/bukeer-studio

# Or trigger a new deploy via empty commit
git commit --allow-empty -m "ci: trigger deploy after billing resolution"
git push origin main
```

### 4. Confirm deploy success

```bash
gh run list --repo weppa-cloud/bukeer-studio --limit 3
gh run watch <RUN_ID> --repo weppa-cloud/bukeer-studio
```

Expected:
- On `main`: `quality` → `e2e-smoke` → `deploy-staging` green.
- On `dev`: `quality` → `e2e-smoke` → `deploy-dev` green.

## Preventive monitoring

- Set up GitHub billing alert at 80% of spending limit
- Add org admin notification email for failed payments
- Monthly review of Actions minutes consumption

## Manual deploy fallback during outage

When Actions are blocked by billing, deploy directly from a local machine with Wrangler access.

### 1. Deploy `dev` directly (recommended)

```bash
# Ensure you are on the target commit/branch
git checkout dev
git pull --ff-only origin dev

# Build + deploy using Wrangler env.dev
NEXT_PUBLIC_URL=https://dev.studio.bukeer.com NEXT_PUBLIC_MAIN_DOMAIN=bukeer.com npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy --env dev
```

If deploy fails with `The specified bucket does not exist`:

```bash
npx wrangler r2 bucket create bukeer-web-public-cache-dev
npx opennextjs-cloudflare deploy --env dev
```

Verification:

```bash
npx wrangler deployments list --name bukeer-web-public-dev
curl -I http://dev.studio.bukeer.com
```

Note: HTTPS can return TLS handshake failures for a short period while Cloudflare finishes certificate provisioning for `dev.studio.bukeer.com`.

### 2. Emergency deploy to staging (legacy fallback)

If a critical fix is needed while billing is blocked:

1. Deploy manually via local `wrangler`:
   ```bash
   npm run build:worker
   npx wrangler deploy --env staging
   ```
2. Document manual deploy in `#ops` channel with commit hash + deployer
3. Remember to re-run CI after billing fix to sync Actions history

## Rollback during manual fallback

```bash
# Dev worker rollback
npx wrangler rollback --name bukeer-web-public-dev --env dev

# Staging worker rollback
npx wrangler rollback --name bukeer-web-public-staging --env staging
```

## References

- CI workflow: `.github/workflows/deploy.yml`
- Cloudflare Workers: `bukeer-web-public-dev`, `bukeer-web-public-staging`, `bukeer-web-public`
- Rollback command: `npx wrangler rollback`
