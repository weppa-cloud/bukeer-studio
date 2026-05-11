# ColombiaTours Post-Migration Audit — 2026-05-11

## Verdict

The core WordPress -> Bukeer Studio migration is operationally complete. The live apex domain is served by the Cloudflare/OpenNext worker, critical public routes render, and legacy redirects are present.

The remaining work is not a cutover blocker. It is post-migration cleanup, SEO preservation, translation/content completion, analytics governance, and Growth OS hardening.

## Evidence Checked

- GitHub issues and commits for migration, pilot readiness, content, SEO and Growth OS.
- Live production HTTP checks for `colombiatours.travel`, `www`, `en`, sitemap, robots, critical routes and legacy redirects.
- GA4 property `properties/294486074` (`ColombiaTours - GA4`) for pre/post cutover traffic and event behavior.
- Supabase production data for website, sections, pages, blog posts, product pages, media, redirects, transcreation jobs and funnel events.
- Light crawl of sitemap/critical URLs on `https://colombiatours.travel`.

## What Is Migrated

### Production Routing

- `https://colombiatours.travel/` returns `200`, `server=cloudflare`, `x-opennext=1`.
- `https://www.colombiatours.travel/` redirects `301` to apex.
- `https://en.colombiatours.travel/` redirects `301` to `https://colombiatours.travel/en`.
- `/en`, `/paquetes`, `/actividades`, `/blog`, package detail, activity detail and blog detail all return `200` from the worker.
- `/sitemap.xml` and `/robots.txt` return `200`.

### Database Snapshot

- Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`.
- Account id: `9fc24733-b127-4184-aa22-12f03b98927a`.
- Website status: `published`.
- Custom domain: `colombiatours.travel`.
- Legacy redirects: `677`, all sampled as `301`.
- Blog posts: `657`, with `592` published.
- Website pages: `29`, with `28` published.
- Website product pages: `241`; `142` published.
- Product-page split: `147` activity, `23` package, `71` hotel.
- Packages in account: `14`.
- Activities in account: `702`.
- Media assets linked to website: `659`.
- Transcreation jobs: `439`, all `applied`.
- Funnel events persisted for website: latest sample contained `244` rows.

### Live Crawl

Light crawl result:

- Sitemap URLs found: `595`.
- Crawled: `294`.
- `200 OK`: `285`.
- Redirects: `4`.
- Errors: `5`, all fetch timeout/termination on large duplicated blog URLs. Re-fetching those URLs individually returned `200` in roughly 1.8-3.1s.

## Post-Migration Behavior

### GA4

Property: `ColombiaTours - GA4`, timezone `America/Bogota`.

Window compared:

- Pre-cutover: 2026-04-10 to 2026-04-23.
- Post-cutover: 2026-04-24 to 2026-05-10.

Post-cutover channel highlights:

- Direct: `1,799` sessions.
- Organic Search: `913` sessions.
- Paid Social: `477` sessions.
- Paid Search: `290` sessions.
- Organic Search still receives traffic and blog landings are active.

Post-cutover commercial events in GA4:

- `waflow_open`: `21`.
- `whatsapp_cta_click`: `11`.
- `waflow_submit`: `10`.
- `package_card_click`: `26`.

Important gap: GA4 `conversions` is `0` for all post-cutover rows checked, despite commercial events existing. This looks like GA4 key-event/conversion configuration debt, not a broken site.

### Funnel Events

Supabase `funnel_events` shows stronger business behavior than GA4 conversions:

- `waflow_submit`: `83`.
- `whatsapp_cta_click`: `69`.
- `quote_sent`: `46`.
- `crm_quote_sent`: `20`.
- `booking_confirmed`: `6`.
- `crm_booking_confirmed`: `5`.
- `qualified_lead`: `5`.
- `crm_lead_stage_qualified`: `4`.

Recent events include Google CPC landing pages with `gclid`, `gbraid`, `utm_source=google`, `utm_medium=cpc`, and dispatch status `dispatched`.

## What Still Needs Closure

### P0/P1: Content Quality Cleanup

The database contains `122` posts whose slug starts with `brain-content-publish-viajes-personalizados-por-colombia`; `60` are published, all with the same title:

`Viajes personalizados por Colombia: como elegir una ruta con sentido`

This is the highest-risk finding. These pages are currently crawlable enough to appear in sitemap samples, and they look like accidental Growth OS publication duplicates. They should be canonicalized, noindexed, unpublished, or consolidated into one approved article.

### P1: English Section/Entity Translation

Open epic: `#273`.

Current Supabase state:

- Enabled website sections: `12`.
- Sections with EN translation overlay: `0`.
- Packages with translations: `10`.
- Activities with translations: `0`.
- Contacts with translations: `4`.
- Product pages with `en-US`: `30`.
- Blog locale mix still includes legacy `es`/`en` plus normalized `es-CO`/`en-US`.

Implication: `/en` exists and product/blog translations partially exist, but homepage sections and activity entity strings still need EN overlays or fallback policy.

### P1: Activity Gallery/Program Coverage

Open epic: `#262`, children `#264`, `#265`, `#266`, `#268`.

Current state:

- Activity gallery non-empty: `2 / 702`.
- Activity translations non-empty: `0 / 702`.
- Package gallery non-empty: `9 / 14`.
- Published blogs missing featured image: `87`.
- Media assets with bad HTTP status in inventory: `11`.
- Media assets missing alt text: `6`.

### P1: Analytics Conversion Governance

GA4 shows commercial events, but conversions remain `0`.

Close gap by marking/validating key events for:

- `waflow_submit`.
- `whatsapp_cta_click`.
- `crm_quote_sent` / server-side lead stage events where appropriate.
- `booking_confirmed` / `crm_booking_confirmed`.

This aligns with open Growth/Funnel work such as `#419`, `#453`, `#455`, `#456`.

### P1: Legacy EN SEO Preservation

Open issue: `#359`.

`en.colombiatours.travel/` redirects to `/en`, but page-level legacy EN path consolidation still needs explicit verification so authority is not split between old host and canonical `/en/*`.

### P2: Issue Hygiene

The migration epic `#22` is closed. Remaining open issues that are not migration blockers should be reclassified:

- `#214` Pilot Readiness: likely close after superseding `#217` Booking V1 as deferred.
- `#217` Booking V1: close as deferred/post-pilot if the product decision still stands.
- `#250`, `#279`: visual/mobile hardening, not migration blockers.
- `#293`, `#310`: growth work, not migration blockers.

## Close / Keep Open Recommendation

Close or supersede:

- `#214` after closing/superseding `#217`.
- `#217` as deferred post-pilot.

Keep open and execute:

- `#273` for EN section/entity translation completion.
- `#262` children `#264`, `#265`, `#266`, `#268`.
- `#359` for EN host consolidation.
- `#451` for production QA/E2E certification with real ColombiaTours data.
- Growth/funnel epics only as post-migration growth backlog, not as migration blockers.

Create or attach to existing issue:

- Cleanup duplicate `brain-content-publish-viajes-personalizados-por-colombia*` published posts.
- GA4 key-event/conversion validation from real post-cutover commercial events.
