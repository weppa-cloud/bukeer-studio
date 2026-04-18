# GitHub Actions — Billing Incident Runbook

**Status:** Active incident (2026-04-17)
**Symptom:** CI workflow runs fail in 3-4s with annotation:
> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings

## Impact

All `Deploy bukeer-studio to Cloudflare Workers` runs triggered by push to `main` fail before `quality` / `e2e-smoke` / `deploy-staging` start. Staging **does not receive new code** until billing is resolved.

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

Expected: `quality` → `e2e-smoke` → `deploy-staging` all green.

## Preventive monitoring

- Set up GitHub billing alert at 80% of spending limit
- Add org admin notification email for failed payments
- Monthly review of Actions minutes consumption

## Rollback during outage

If a critical fix is needed while billing is blocked:

1. Deploy manually via local `wrangler`:
   ```bash
   npm run build:worker
   npx wrangler deploy --env staging
   ```
2. Document manual deploy in `#ops` channel with commit hash + deployer
3. Remember to re-run CI after billing fix to sync Actions history

## References

- CI workflow: `.github/workflows/deploy.yml`
- Cloudflare Worker: `bukeer-web-public`
- Rollback command: `npx wrangler rollback`
