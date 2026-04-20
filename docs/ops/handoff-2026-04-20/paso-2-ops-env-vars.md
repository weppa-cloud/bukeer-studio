# Paso 2 — Ops env vars (pilot session)

**Owner**: ops / infra
**Ticket**: #63 (env vars pilot session)
**Estimated**: 30 min

## Goal

Inject `REVALIDATE_SECRET` + verify `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Worker `bukeer-web-public` (pilot) so ISR revalidate hook + Studio server-role actions work end-to-end.

Unblocks: 2 justified skips on `e2e/tests/pilot/transcreate/isr-revalidate.spec.ts` + live-data post-apply fan-out.

## Generated secret (one-time use)

```
REVALIDATE_SECRET=F125AB8D-D0C0-41E9-8625-4937FC2F24E8
```

> Rotate if leaked. Value is secret-tier; treat as password.

## Steps

### 1. Cloudflare Worker prod env

```bash
# From repo root
npx wrangler secret put REVALIDATE_SECRET --name bukeer-web-public
# Paste: F125AB8D-D0C0-41E9-8625-4937FC2F24E8

# Verify SUPABASE_SERVICE_ROLE_KEY exists
npx wrangler secret list --name bukeer-web-public | grep SERVICE_ROLE
# If missing, add it from Supabase dashboard:
#   Settings → API → service_role key → copy → wrangler secret put
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name bukeer-web-public
```

### 2. GitHub Actions env (CI pilot E2E runs)

Repo → Settings → Secrets and variables → Actions → New repository secret:
- Name: `E2E_REVALIDATE_SECRET`
- Value: `F125AB8D-D0C0-41E9-8625-4937FC2F24E8` (same value as prod; E2E hits dev server)

Also set:
- `E2E_SUPABASE_SERVICE_ROLE_KEY` (same as prod service role)

### 3. Local dev `.env.local`

For local reproducibility, add to `.env.local`:
```
REVALIDATE_SECRET=F125AB8D-D0C0-41E9-8625-4937FC2F24E8
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
```

Do NOT commit `.env.local`.

### 4. Update `.env.local.example`

Verify lines present (docs-only, no secret values):
```
REVALIDATE_SECRET=<uuid>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
E2E_REVALIDATE_SECRET=<same as REVALIDATE_SECRET for local E2E>
```

## Verification

### A. Cloudflare Worker prod

```bash
# Deploy latest main (includes Cluster E middleware fix)
git push origin main  # triggers GH Actions → wrangler deploy

# Wait for deploy complete, then:
curl -s "https://colombiatours.bukeer.co/api/revalidate?secret=F125AB8D-D0C0-41E9-8625-4937FC2F24E8&path=/" \
  -H "content-type: application/json" | jq .
# Expected: {"revalidated":true,"path":"/"}
```

### B. E2E suite re-run

```bash
npm run session:list  # pick free slot
eval "$(bash scripts/session-acquire.sh)"
SESSION_NAME=$SESSION_NAME PORT=$PORT \
  E2E_REVALIDATE_SECRET=F125AB8D-D0C0-41E9-8625-4937FC2F24E8 \
  npx playwright test --project=pilot \
  --grep "isr-revalidate" \
  --reporter=list
# Expected: 2 passes (was: 2 skips)
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

## Close ticket

```bash
gh issue close 63 --comment "REVALIDATE_SECRET + SUPABASE_SERVICE_ROLE_KEY injected into bukeer-web-public + E2E_REVALIDATE_SECRET in GH Actions. Verified via curl (see paso-2 handoff doc). 2 isr-revalidate skips now pass."
```

## Rollback

If `wrangler secret put` breaks the Worker:
```bash
npx wrangler secret delete REVALIDATE_SECRET --name bukeer-web-public
# Worker falls back to legacy behavior (revalidate 401 — Studio SSR still serves stale, not broken)
```
