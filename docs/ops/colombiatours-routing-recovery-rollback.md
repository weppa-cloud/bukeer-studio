# ColombiaTours Public Routing Recovery — Rollback Plan

## PR #551 — system fallback pages for contacto/prensa

**Branch:** `feat/colombiatours-public-routing-recovery` → `dev`
**Target:** Merge to `dev`, then `dev` → `main` triggers production deploy

## Before merge

- Ensure CI passes on the commit (quality + e2e-smoke jobs). PR-target CI is not
  configured — verify via a `workflow_dispatch` on the branch or merge to dev first
  and run CI there.
- Confirm code review approval from Yeison or another authorized reviewer.

## Rollback scenarios

### Scenario A: PR merged to dev but not yet in main

```bash
# Revert the merge commit on dev
git checkout dev
git revert -m 1 <merge-commit-sha>
git push origin dev
```

Or create a revert PR targeting dev and merge it.

### Scenario B: Deployed to production (main push)

#### Cloudflare Workers rollback

```bash
npx wrangler rollback
```

This reverts the worker to the previous deployed version (Cloudflare retains
version history). Verify after rollback:

```bash
curl -s -o /dev/null -w "%{http_code}" https://colombiatours.travel/contacto
curl -s -o /dev/null -w "%{http_code}" https://colombiatours.travel/prensa
```

Both should return 404 (pre-fix behavior) after rollback.

#### Git revert (longer-term)

```bash
# Revert the merge commit on main
git checkout main
git revert -m 1 <merge-commit-sha>
git push origin main
```

This triggers a new deploy. Verify the revert deploy succeeds.

## Files to watch

| File | Revert action |
|------|-------------|
| `lib/site/system-fallback-pages.ts` | Delete (new file) |
| `__tests__/lib/site/system-fallback-pages.test.ts` | Delete (new file) |
| `app/site/[subdomain]/[...slug]/page.tsx` | Revert the nullish-coalescing changes |
| `docs/INDEX.md` | Revert the wikilink additions |

## Verification after rollback

```bash
# Critical routes should still return 200
curl https://colombiatours.travel/
curl https://colombiatours.travel/en
curl https://colombiatours.travel/paquetes

# Fallback pages should now 404
curl -o /dev/null -w "%{http_code}" https://colombiatours.travel/contacto  # expect 404
curl -o /dev/null -w "%{http_code}" https://colombiatours.travel/prensa    # expect 404
```
