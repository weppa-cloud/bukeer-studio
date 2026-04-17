# Product Landing v1 — Rollout & Monitoring Runbook

**EPIC 7 — Product Landing Redesign rollout.**
**Tracking issue:** [#121](https://github.com/weppa-cloud/bukeer-studio/issues/121)
**Parent epic:** [#105](https://github.com/weppa-cloud/bukeer-studio/issues/105)
**Validation tenant:** `colombiatours`

Related:
- Generic release runbook: [`docs/runbooks/product-landing-rollout-runbook.md`](../runbooks/product-landing-rollout-runbook.md)
- JSON-LD fixtures (SEO validation reference): [`docs/seo/jsonld-fixtures.md`](../seo/jsonld-fixtures.md)
- Deploy workflow: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- QA matrix: issue [#120](https://github.com/weppa-cloud/bukeer-studio/issues/120)

---

## 1. Overview

Product Landing v1 redesigns the public product pages for all four product types:

| EPIC | Scope |
|------|-------|
| EPIC 1 | Hero/gallery redesign for `/actividades/[slug]` and `/paquetes/[slug]` |
| EPIC 2 | Pricing card + WhatsApp CTA deep-links |
| EPIC 3 | `/hoteles/[slug]` and `/traslados/[slug]` landing layouts |
| EPIC 4 | V2 catalog fields (schedule, inclusions, itinerary) in SSR |
| EPIC 5 | JSON-LD schemas (`TouristAttraction`, `Product`, `Hotel`, `Service`) + BreadcrumbList + FAQPage |
| EPIC 6 | Breadcrumbs, related products, internal linking |
| EPIC 7 | **This rollout + monitoring (current).** |

**Rollout mode:** direct (no feature flag). ColombiaTours is the validation tenant — failures there gate production for all tenants.

---

## 2. Pre-flight checklist

Run before pushing to `main`:

- [ ] `npx tsc --noEmit` — clean (no TS errors).
- [ ] `npm run build:worker` — succeeds locally; reported bundle < 8 MiB.
- [ ] `npm test -- --ci --passWithNoTests` — unit tests green.
- [ ] QA matrix report (issue [#120](https://github.com/weppa-cloud/bukeer-studio/issues/120)) reviewed — **no P0 bugs open**.
- [ ] Rich Results Test passed for all 4 product types using the fixtures in [`docs/seo/jsonld-fixtures.md`](../seo/jsonld-fixtures.md):
  - [ ] Activity (`TouristAttraction`) — representative URL returns valid schema.
  - [ ] Hotel (`Hotel`) — valid schema + `aggregateRating` when applicable.
  - [ ] Transfer (`Service`) — valid schema.
  - [ ] Package (`Product`) — valid schema + `Offer`.
- [ ] Flutter migrations applied in shared Supabase project:
  - [ ] `weppa-cloud/bukeer-flutter#752`
  - [ ] `weppa-cloud/bukeer-flutter#753`
  - [ ] `weppa-cloud/bukeer-flutter#754`
- [ ] ColombiaTours payload includes V2 fields — verify via direct RPC:

```bash
# Replace <SERVICE_ROLE_KEY> and <SUPABASE_URL> with values from .env.local
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/websites?subdomain=eq.colombiatours&select=id,subdomain,theme" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.[0] | {id, subdomain, themeShape: (.theme | keys)}'

# Spot-check a product row has V2 fields populated
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/products?select=id,slug,schedule,inclusions,itinerary&limit=3" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq
```

- [ ] Rollback owner and ops contact assigned in the release thread.
- [ ] Team notified via Pre-deploy communication template (section 6).

---

## 3. Deploy procedure

### 3.1 Staging (automatic)

Push to `main` triggers `.github/workflows/deploy.yml`:

1. `quality` job — lint, typecheck, unit tests.
2. `e2e-smoke` job — `public-runtime.smoke.spec.ts` against a fresh build.
3. `deploy-staging` job — `npx opennextjs-cloudflare deploy` → Worker `bukeer-web-public-staging`.

Health check: the workflow curls `https://bukeer.com` after 15 s; non-2xx does **not** currently fail the job — verify manually.

### 3.2 48-hour soak on staging

Monitor KPIs from section 5 at T+5 min, T+1 h, T+4 h, T+24 h, T+48 h. Staging must remain green for 48 h with real ColombiaTours traffic before production promotion.

### 3.3 Production (manual)

Prod deploy is intentionally gated — `CLAUDE.md` documents it as commented out in the workflow. To enable:

1. Edit `.github/workflows/deploy.yml` → uncomment the `deploy-production` job (or duplicate `deploy-staging` pointing at the non-staging Worker in `wrangler.toml`).
2. Open a PR titled `chore(rollout): enable prod deploy for product landing v1`.
3. Merge to `main` → GH Actions runs prod deploy.
4. Immediately run the post-deploy actions in section 4.

> **DO NOT** run `npx wrangler deploy` locally for production. All prod deploys must go through CI for auditability.

---

## 4. Post-deploy actions (first hour)

Execute these in order, starting at T+0 (moment prod deploy completes):

### 4.1 Revalidate ISR for all tenants (T+0 to T+5 min)

Run the bundled script. This loops every active `websites.subdomain` and POSTs to `/api/revalidate`:

```bash
REVALIDATE_URL="https://bukeer.com/api/revalidate" \
REVALIDATE_SECRET="<from-1password>" \
SUPABASE_URL="<NEXT_PUBLIC_SUPABASE_URL>" \
SUPABASE_SERVICE_ROLE_KEY="<SUPABASE_SERVICE_ROLE_KEY>" \
bash scripts/revalidate-all-tenants.sh
```

The script is idempotent — re-run it if any tenant reports a non-2xx response.

### 4.2 Worker error monitoring (T+0 to T+60 min)

```bash
# Live tail (keep open during first hour)
npx wrangler tail bukeer-web-public --format=pretty

# Filter errors only
npx wrangler tail bukeer-web-public --status=error
```

Also check the Cloudflare dashboard → `bukeer-web-public` → Logs & Observability. See section 7.

### 4.3 Bounce-rate monitoring (T+15, T+30, T+60 min)

In analytics (GA4 / whichever is wired via `NEXT_PUBLIC_GA_ID`), check bounce rate for:

- `/actividades/*`
- `/paquetes/*`
- `/hoteles/*`
- `/traslados/*`

Baseline: prior 7-day average. Threshold: **bounce rate > baseline + 10 pts sustained 15 min = flag**.

### 4.4 WhatsApp click-through (T+15, T+30, T+60 min)

If the `whatsapp_cta_click` analytics event is wired, compare CTR vs. prior 7-day baseline. Threshold: **CTR drops > 30% sustained 15 min = flag**.

If the event is not yet wired, note it in the rollout thread and track a follow-up issue — do not block the rollout.

### 4.5 Verify JSON-LD server-side (T+5 min)

```bash
# Activity
curl -s https://colombiatours.bukeer.com/actividades/cascada-salto-del-tequendama \
  | grep -oE '<script type="application/ld\+json">[^<]+' | head -3

# Hotel
curl -s https://colombiatours.bukeer.com/hoteles/hotel-boutique-cartagena \
  | grep -oE '<script type="application/ld\+json">[^<]+' | head -3

# Transfer
curl -s https://colombiatours.bukeer.com/traslados/aeropuerto-bogota-centro \
  | grep -oE '<script type="application/ld\+json">[^<]+' | head -3

# Package
curl -s https://colombiatours.bukeer.com/paquetes/colombia-magica-10-dias \
  | grep -oE '<script type="application/ld\+json">[^<]+' | head -3
```

Each should return `@type` of `TouristAttraction`, `Hotel`, `Service`, `Product` respectively, plus `BreadcrumbList`.

Feed the live URLs into the [Rich Results Test](https://search.google.com/test/rich-results) using the links in [`docs/seo/jsonld-fixtures.md`](../seo/jsonld-fixtures.md).

---

## 5. Monitoring KPIs

| KPI | Source | Trigger |
|---|---|---|
| Worker 5xx rate | `wrangler tail` / CF Observability | > 5% sustained 15 min → **post-mortem + rollback** |
| Worker p95 latency | CF Observability | > 1500 ms sustained 15 min → investigate |
| ISR revalidation success | `revalidation_logs` table | Any tenant with zero entries post-deploy → re-run script |
| Bounce rate `/actividades/*` etc. | GA4 | +10 pts vs. baseline, 15 min → flag |
| WhatsApp CTR | GA4 custom event | −30% vs. baseline, 15 min → flag |
| Lighthouse SEO score | manual on 1 page per product type | Drop > 10 pts vs. pre-deploy snapshot → **post-mortem** |
| JSON-LD presence | curl probe (section 4.5) | Missing on any tenant → **post-mortem + rollback** |
| WhatsApp deep-link format | manual click on each product type | Broken link on any product type → **rollback** |

---

## 6. Communication templates

Post all of these in the ops channel. Replace bracketed placeholders.

### 6.1 Pre-deploy notice (T−60 min)

```
[Product Landing v1] Scheduled deploy at [HH:MM TZ].
Scope: EPIC 1–6 — product landing redesign + V2 fields + JSON-LD, all tenants.
Rollout: direct (no feature flag). ColombiaTours is validation tenant.
Owner: [name] · Rollback owner: [name]
Runbook: docs/ops/product-landing-v1-runbook.md
```

### 6.2 Deploy started (T+0)

```
[Product Landing v1] Deploy started at [HH:MM TZ].
GH Actions run: [url]
Monitoring channel: #ops-rollout
Next update: T+15 min.
```

### 6.3 Deploy success (T+60 min if no issues)

```
[Product Landing v1] Deploy healthy after 60 min.
- Worker errors: [rate]
- Bounce rate: [delta vs baseline]
- WhatsApp CTR: [delta]
- JSON-LD validated: TouristAttraction / Hotel / Service / Product
Monitoring continues for 24 h; runbook stays open.
```

### 6.4 Issue detected / rollback

```
[Product Landing v1] ROLLBACK IN PROGRESS.
Trigger: [e.g. 5xx rate 7% sustained 18 min / missing JSON-LD on X tenant]
Action: `npx wrangler rollback` executed at [HH:MM].
Owner: [name]
Current status: [rolling back | rolled back | verifying]
Next update: 15 min.
Post-mortem thread will be opened.
```

### 6.5 Post-incident summary

```
[Product Landing v1] Incident resolved at [HH:MM TZ].
Timeline:
- [HH:MM] Deploy completed
- [HH:MM] First signal: [metric/observation]
- [HH:MM] Rollback executed
- [HH:MM] Service restored
Root cause: [1-line summary]
Customer impact: [tenants, duration, blast radius]
Follow-ups: [issue links]
Full post-mortem: [link]
```

---

## 7. Post-mortem triggers

Open a post-mortem (GitHub issue with `post-mortem` label, link to this runbook) if **any** of these are true:

- Error rate > 5% sustained 15 min on production Worker.
- Lighthouse SEO score drops > 10 pts on any monitored product page vs. pre-deploy snapshot.
- Missing JSON-LD schemas on any tenant (validated via section 4.5 probe).
- Broken WhatsApp CTA deep-links on any product type.
- Rollback executed for any reason.
- Customer-reported SEO regression confirmed.
- Data mismatch between Supabase content and rendered product page affecting > 1 tenant.

---

## 8. Rollback procedure

### 8.1 Studio Worker rollback (single command)

```bash
npx wrangler rollback --name bukeer-web-public
# follow prompts to select the prior deployment
```

Takes < 60 s to propagate. Cloudflare keeps the last ~10 deployments.

### 8.2 Studio Worker rollback via git revert (if Wrangler rollback is unavailable)

```bash
git revert <bad-commit-sha>
git push origin main
# GH Actions will redeploy the reverted state
```

### 8.3 DB-dependent changes — Flutter migrations are forward-only

**DO NOT run `supabase migration down`** for Flutter migrations (`#752`, `#753`, `#754`). They add columns/indexes consumed by Studio; dropping them while Flutter admin is running will break writes.

Rollback strategy when Studio depends on a Flutter migration:

1. Roll back **Studio only** via Wrangler (Studio degrades gracefully on missing V2 fields).
2. Leave Flutter DB schema intact.
3. Open a patch issue to fix the Studio consumer.
4. Re-deploy Studio when fixed.

### 8.4 Post-rollback checklist

- [ ] Verify production via `curl -I https://colombiatours.bukeer.com/actividades/<known-slug>` → 200.
- [ ] Run `scripts/revalidate-all-tenants.sh` to refresh ISR with the rolled-back build.
- [ ] Post rollback template (section 6.4) in ops channel.
- [ ] Open post-mortem issue and link this runbook.

---

## 9. Monitoring commands cheat-sheet

```bash
# Live Worker logs
npx wrangler tail bukeer-web-public --format=pretty

# Errors only
npx wrangler tail bukeer-web-public --status=error

# Deployment history (for rollback target selection)
npx wrangler deployments list --name bukeer-web-public

# Revalidate a single tenant (manual)
curl -X POST https://bukeer.com/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"colombiatours"}'

# Revalidate all tenants (uses script in repo)
bash scripts/revalidate-all-tenants.sh

# JSON-LD probe (all 4 product types)
for url in \
  "https://colombiatours.bukeer.com/actividades/cascada-salto-del-tequendama" \
  "https://colombiatours.bukeer.com/hoteles/hotel-boutique-cartagena" \
  "https://colombiatours.bukeer.com/traslados/aeropuerto-bogota-centro" \
  "https://colombiatours.bukeer.com/paquetes/colombia-magica-10-dias"; do
  echo "=== $url ==="
  curl -s "$url" | grep -c 'application/ld+json' || true
done

# Rich Results Test links — open in browser
# See docs/seo/jsonld-fixtures.md
```

---

## 10. Closeout (T+24 h)

- [ ] All KPIs within baseline.
- [ ] No open P0/P1 issues linked to this rollout.
- [ ] Follow-up issues filed for any non-blocking observations.
- [ ] Post summary in ops channel: "Product Landing v1 rollout closed — 24 h stable."
- [ ] Link this runbook execution in [#121](https://github.com/weppa-cloud/bukeer-studio/issues/121) and close.
