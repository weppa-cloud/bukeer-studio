# Paso 7 — DNS cutover (Stage 7)

**Owner**: ops-lead (primary) + QA-lead (watch) + partner (standby)
**Prereq**: Paso 6 sign-offs complete
**Estimated**: 30min cutover + 1h watch + 1h buffer
**Reference runbook**: `docs/ops/pilot-runbook-colombiatours.md`

## Goal

Flip DNS A/CNAME de `colombiatours.travel` de WordPress legacy a Cloudflare Worker `bukeer-web-public`. Monitor + rollback si degradation.

## Rollback SLA

- **Decision**: 10s max (oncall sees alert, calls rollback)
- **DNS revert**: 5min (re-point A/CNAME to WP IP)
- **TTL flush global propagation**: 60s (pre-lowered TTL 300s)

## Pre-cutover (24h antes)

### T-24h

- [ ] Backup WP full (DB dump + wp-content/ tarball) → S3 / Drive
- [ ] Verify latest main deployed en Cloudflare Worker:
  ```bash
  npx wrangler deployments list --name bukeer-web-public | head -5
  # Expected: most recent commit SHA matches origin/main HEAD (ec381ae+ with cluster F)
  ```
- [ ] Lower DNS TTL 3600 → 300s en DNS provider (Cloudflare / Route53 / whoever hosts `colombiatours.travel`)
  - Cambio no invasivo; prepara for fast flip
- [ ] Smoke test staging/preview Worker URL (ej. `https://bukeer-web-public.<org>.workers.dev`):
  - Homepage render
  - Pkg 15D detail
  - Act Guatape detail
  - Hotel detail
  - Blog detail
  - `/en/...` paths
- [ ] Lighthouse preview Worker → all 4 scores ≥ pilot thresholds
- [ ] Confirm rollback script ready:
  ```bash
  # dns-rollback.sh
  #!/bin/bash
  # Revert colombiatours.travel A record to WP legacy IP
  set -euo pipefail
  OLD_IP="<WP IP>"
  CF_ZONE_ID="<zone>"
  CF_RECORD_ID="<record>"
  curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$CF_RECORD_ID" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"content\":\"$OLD_IP\"}"
  echo "Rollback executed — TTL 300s, propagation ~60s"
  ```

### T-1h

- [ ] Partner + ops + QA online on Slack/call
- [ ] Grafana dashboard open (Worker requests/errors/latency)
- [ ] Sentry live monitor open
- [ ] Final sanity: `curl -I https://colombiatours.travel` → shows legacy WP (baseline)

## Cutover (T-0)

### Step 1 — DNS flip (2 min)

Cloudflare DNS provider (or wherever `colombiatours.travel` apex lives):

```
BEFORE:
colombiatours.travel.    A     <WP legacy IP>

AFTER:
colombiatours.travel.    CNAME <tenant>.bukeer-web-public.workers.dev
# OR use Cloudflare Workers route matcher:
#   Worker: bukeer-web-public
#   Route: colombiatours.travel/*
```

Save. TTL 300s.

### Step 2 — Propagation watch (5-10 min)

```bash
# From multiple locations
dig colombiatours.travel +short                    # local
dig @8.8.8.8 colombiatours.travel +short            # Google DNS
dig @1.1.1.1 colombiatours.travel +short            # Cloudflare DNS

# Expected: within 5-10 min, all resolve to Worker IP / CNAME
```

### Step 3 — Smoke test live (10 min)

Por cada URL critical:
```bash
for url in \
  "https://colombiatours.travel" \
  "https://colombiatours.travel/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as" \
  "https://colombiatours.travel/actividades/tour-a-guatape-y-pe-ol" \
  "https://colombiatours.travel/hoteles/<hotel-slug>" \
  "https://colombiatours.travel/blog/<post-slug>" \
  "https://colombiatours.travel/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as" \
  "https://colombiatours.travel/privacy" \
  "https://colombiatours.travel/terms" \
; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  echo "$status  $url"
done
# Expected: all 200 (or 301 legacy redirect → 200)
```

### Step 4 — Lighthouse live + screenshot

```bash
# Quick Lighthouse live (no session pool needed, prod URL)
npx lighthouse https://colombiatours.travel --only-categories=performance,accessibility,seo,best-practices --preset=desktop --output=html --output-path=artifacts/qa/pilot/2026-MM-DD/cutover/live-home.html
```

Threshold: SEO ≥ 0.95, a11y ≥ 0.95, perf ≥ 0.85 (acceptable degrade vs preview).

### Step 5 — Hour-1 watch

Stay online. Monitor:
- Cloudflare Worker logs — error rate <1%
- Sentry — zero new 500 events
- Partner reports from team browsing live site
- Google Search Console (si configurado) — crawl errors

## Rollback triggers

Ejecutar `dns-rollback.sh` si:
- [ ] Error rate > 1% continuous 5min
- [ ] Homepage 5xx
- [ ] Lighthouse SEO drops below 0.90 on live
- [ ] Partner reports critical visual/content regression
- [ ] Key pkg/act detail returns 404 (RPC mismatch)

Post-rollback:
```bash
gh issue comment 214 --body "Cutover rolled back $(date -u). Reason: <reason>. WP restored. Re-assess blockers before next attempt."
```

## Post-cutover

### T+1h (rollback window closed)

- [ ] Raise DNS TTL back 300 → 3600s (stabilize)
- [ ] Update `docs/ops/pilot-runbook-colombiatours.md` — mark "pilot live 2026-MM-DD"
- [ ] Close #213 si no cerrado ya
- [ ] Close #214 EPIC

### T+24h

- [ ] Full Lighthouse re-run live URLs → archive baseline for post-launch tracking
- [ ] GSC / GA4 crawl + traffic check
- [ ] Announce internally: "Pilot ColombiaTours cutover successful"
- [ ] Archive pilot branch (this handoff doc moves to `docs/ops/completed/pilot-colombiatours-2026-MM-DD/`)

### T+7d

- [ ] First weekly health check: Core Web Vitals, crawl stats, error logs
- [ ] Open post-mortem issue + lessons learned
- [ ] Flutter cross-repo #234 RPC JOIN status check — enable VideoObject once shipped

## Rollback window exit

After T+2h clean (zero rollback triggers hit), pilot is production. Partner assumes operational responsibility. Ops shifts to standard monitoring.

## On-call contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Ops primary | <lead> | <phone> | <slack> |
| Ops backup | <2nd> | <phone> | <slack> |
| QA-lead | <name> | <phone> | <slack> |
| Partner | <ColombiaTours lead> | <phone> | <slack> |
| Flutter owner | <cross-repo lead> | <phone> | <slack> |
