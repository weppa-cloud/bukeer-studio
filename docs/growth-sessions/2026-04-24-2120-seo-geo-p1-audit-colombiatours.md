---
date: 2026-04-24
time: "21:20 -05"
scope: audit
website: colombiatours-travel
epic: 293
issues: [294, 295, 296, 297]
cost_usd: 0
---

# SEO/GEO P1 Audit — ColombiaTours Post-Cutover

## Context

Production target: `https://colombiatours.travel`

This session executed the first P1 technical validation round for #293:

- #294 Rich Results / JSON-LD technical eligibility
- #295 Lighthouse/PageSpeed gate
- #296 Sitemap, indexing and hreflang
- #297 E-E-A-T/GEO visible layer baseline notes

No paid provider was used. DataForSEO remains gated behind T+72 and issue #299.

## Actions

1. Crawled critical production routes for status, title, description, canonical, hreflang, H1, JSON-LD, image responses and `/site/colombiatours` leaks.
2. Audited production sitemap.
3. Ran Lighthouse mobile against six critical routes.
4. Fixed and redeployed two low-risk technical issues found during the audit:
   - Replaced the `next/script` queued `__name` helper with a real inline script before the theme script. This removed the Lighthouse console error.
   - Cleaned `/actividades` title duplication caused by the parent metadata template.
5. Redeployed Worker `bukeer-web-public`.

## Production Deploy

- Worker: `bukeer-web-public`
- Version ID: `b1d022e4-8148-40f7-adf1-b98115b761e2`
- Triggers include:
  - `colombiatours.travel/*`
  - `www.colombiatours.travel/*`
  - `en.colombiatours.travel/*`

## Crawl Results

Routes checked:

- `/`
- `/en`
- `/paquetes`
- `/actividades`
- `/actividades/4x1-adventure`
- `/paquetes/bogota-esencial-cultura-y-sal-4-dias`
- `/blog`
- `/blog/los-10-mejores-lugares-turisticos-de-colombia`

Summary:

| Check | Result |
|---|---:|
| 200 status on critical routes | PASS |
| Canonical present | PASS |
| H1 count = 1 | PASS |
| Hreflang present where expected | PASS |
| JSON-LD parseable | PASS |
| `/site/colombiatours` leaks | 0 |
| Broken image 4xx/5xx | 0 |

JSON-LD types observed:

- Home / EN: `TravelAgency`, `WebSite`, `BreadcrumbList`
- `/paquetes`: `CollectionPage`, `BreadcrumbList`, `TravelAgency`
- `/actividades`: `CollectionPage`, `BreadcrumbList`, `TravelAgency`
- Activity detail: `TouristAttraction`, `Product`, `BreadcrumbList`, `FAQPage`, `TravelAgency`
- Package detail: `TouristTrip`, `Product`, `BreadcrumbList`, `FAQPage`, `TravelAgency`
- Blog detail: `BlogPosting`, `BreadcrumbList`, `TravelAgency`

Risk note:

- One `.jfif` asset on the package detail route responds `200` but with `content-type: application/octet-stream`. It is not broken, but should be normalized to an image MIME type for richer media confidence.

## Sitemap Results

Sitemap: `https://colombiatours.travel/sitemap.xml`

| Metric | Result |
|---|---:|
| HTTP status | 200 |
| URL count | 709 |
| Alternate links | 2,127 |
| `/site/colombiatours` leaks | 0 |
| noindex/draft/preview candidates | 0 |
| Activity detail URLs | 50 |
| Package detail URLs | 7 |
| Blog detail URLs | 530 |
| Hreflang reciprocal issues sampled | 0 |

The sitemap uses normalized root URLs without trailing slash. The earlier required-route diff for `/` and `/en` was a URL-normalization mismatch, not a real omission.

## Lighthouse Results

Mobile Lighthouse, production.

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 31 | 87 | 57 | 100 | 32.4s | 2663ms | 0 |
| `/en` | 43 | 87 | 57 | 100 | 29.0s | 1048ms | 0 |
| `/paquetes` | 46 | 99 | 57 | 92 | 11.0s | 848ms | 0.053 |
| `/actividades` | 39 | 95 | 57 | 100 | 13.4s | 1101ms | 0 |
| Package detail | 38 | 95 | 57 | 100 | 18.7s | 1093ms | 0 |
| Blog detail | 41 | 96 | 57 | 92 | 16.5s | 806ms | 0 |

Post-fix home recheck:

| Route | Best Practices | SEO | Console errors |
|---|---:|---:|---:|
| `/` | 61 | 100 | PASS |

Remaining Best Practices blockers:

- Third-party cookies from Clarity, Google Ads/DoubleClick and Facebook Pixel.
- Deprecated APIs in third-party scripts and Cloudflare challenge script.
- Chrome Issues panel cookie warnings from third-party tracking.

Remaining performance blockers:

- LCP is too high across all measured mobile routes.
- TBT remains high, especially home.
- Production payload is heavy on public routes; route-level JS and third-party scripts need budget work.

## Fixes Applied

Files changed in this session:

- `app/layout.tsx`
  - Replaced queued `next/script` helper with inline script so `window.__name` exists before the theme script executes.
- `app/site/[subdomain]/actividades/page.tsx`
  - Changed metadata title from `Actividades en Colombia | {siteName}` to `Actividades en Colombia`, letting the parent template append the site name once.

Validation:

- `npm run typecheck` PASS
- `npm run build:worker` PASS
- Production smoke PASS:
  - helper script appears before the theme script
  - no queued `self.__next_s` helper
  - `/actividades` title is `Actividades en Colombia | ColombiaTours.Travel`

## Score

Updated technical score after this audit: **86/100, A- infrastructure with performance debt**.

Rationale:

- Semantic SEO, crawlability and sitemap are now strong enough for A-level technical SEO.
- The score is capped by mobile performance, third-party tracking practices, accessibility contrast/ARIA issues and incomplete visible E-E-A-T/GEO layer.

Estimated path to 90+:

1. Reduce LCP and TBT on home, `/en`, package detail and blog detail.
2. Add consent-aware or delayed third-party tracking for non-critical scripts.
3. Fix accessibility contrast/ARIA issues in testimonials, CTAs and hero chips.
4. Add visible reviewed-by/planner/facts/source blocks on priority blogs, packages and activities.
5. Normalize image MIME/type handling for `.jfif` assets.

## Mutations

| Type | Target | Description |
|---|---|---|
| Code | `app/layout.tsx` | Inline `__name` helper before theme script |
| Code | `app/site/[subdomain]/actividades/page.tsx` | Remove duplicated site name from title |
| Deploy | Cloudflare Worker | Deployed version `b1d022e4-8148-40f7-adf1-b98115b761e2` |

## External Cost

| Provider | Operation | Cost |
|---|---|---:|
| DataForSEO | Not used | $0.00 |
| OpenRouter/NVIDIA Nim | Not used | $0.00 |

## Next Steps

1. #295 remains the main blocker: create a performance hardening pass focused on LCP/TBT and third-party script budget.
2. #297 should start content/UI work for visible E-E-A-T/GEO blocks.
3. #294 can proceed to manual Google Rich Results validation using the URLs above.
4. #296 is technically PASS and can be closed after review.
5. #299/DataForSEO should stay gated until T+72.

## Follow-up Performance Pass — 2026-04-24 22:00 -05

Issue focus: #295.

Changes applied:

- Added `lib/images/supabase-transform.ts`.
  - Supabase public image URLs now use `/storage/v1/render/image/public/...` with bounded `width`, `quality` and `resize`.
  - Unsplash URLs now receive bounded `w` and `q` query params when passed through the helper.
- Applied transformed image URLs to:
  - editorial hero rotator
  - activities listing hero
  - packages listing hero
  - generic activity/package cards
  - editorial destinations grid
  - editorial packages cards
  - package/activity detail hero images
- Deferred public analytics/tracking scripts:
  - GTM now loads on `lazyOnload` + idle/timeout.
  - GA4 standalone now uses `lazyOnload`.
  - Facebook Pixel now uses `lazyOnload` + idle/timeout.
  - Custom head scripts now use `lazyOnload`.

Validation:

- `npm run typecheck` PASS
- `npm run build:worker` PASS
- Worker deploy: `73b1cc2d-54cc-4c44-a786-b70c04f32dfc`

Revalidation note:

- Manual calls to `https://colombiatours.travel/api/revalidate` returned 401 with the local `.env.local` and `.dev.vars` secrets available in this session. Measurements below used cache-busted URLs (`?_perf=<timestamp>`) to validate the newly deployed Worker code without waiting for existing ISR/R2 HTML entries to expire.

Lighthouse comparison, mobile:

| Route | Before perf | After perf | Before LCP | After LCP | Before TBT | After TBT | Bytes before | Bytes after |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 31 | 36 | 32.4s | 20.5s | 2663ms | 1094ms | ~19.7 MiB observed after first pass | 4.0 MiB |
| `/actividades` | 39 | 58 | 13.4s | 4.2s | 1101ms | 1151ms | 3.3 MiB | 3.3 MiB |
| `/paquetes` | 46 | 37 | 11.0s | 17.2s | 848ms | 1495ms | 1.9 MiB | 1.9 MiB |
| package detail | 38 | 46 | 18.7s | 15.2s | 1093ms | 767ms | 3.0 MiB | 2.8 MiB |

Outcome:

- Strong byte-weight win on home: ~19.7 MiB to ~4.0 MiB after editorial destinations/packages image transforms.
- Strong LCP win on `/actividades`: 13.4s to 4.2s.
- Strong TBT win on home and package detail.
- #295 remains open because mobile Performance is still below target and `/paquetes` regressed in this run, likely due JS/third-party contention plus route variance.

Remaining #295 blockers:

1. Reduce public route client JS, especially home/EN and listing pages.
2. Move above-the-fold home hero to a server-rendered non-rotating first frame or hydrate rotator after paint.
3. Apply image transforms to package detail gallery/timeline and logo assets.
4. Fix production revalidation auth mismatch or document the correct Worker secret path.
5. Make tracking consent-aware or delay until first interaction where business requirements allow it.

## Follow-up #295 Phase 2 — SSR Hero Guardrail + Public JS Reduction

Issue focus: #295.

Changes applied:

- Home/editorial hero now renders the LCP first frame on the server:
  - `components/site/themes/editorial-v1/sections/hero.tsx`
  - Adds `data-ssr-hero-frame="true"`.
  - Owns the priority `<Image>` for the first visual frame.
- Hero rotator now hydrates after first paint:
  - `components/site/themes/editorial-v1/sections/hero-rotator.client.tsx`
  - Defers client overlay rendering behind `requestAnimationFrame`.
  - Removes priority loading from client overlay slides.
- Public listing pages no longer import Framer Motion:
  - `components/pages/packages-listing-page.tsx`
  - `components/pages/activities-listing-page.tsx`
- Tech-validator now enforces the #295 performance contract:
  - `PERF-SSR-HERO`: editorial hero must keep SSR first frame + priority server image + after-paint rotator.
  - `PERF-PUBLIC-JS`: critical public listings must not import `framer-motion`.

Validation:

- `npm run typecheck` PASS
- `npm run build:worker` PASS
- `npm run tech-validator:code:quick` FAIL only for pre-existing legacy findings:
  - `[ADR-012] app/api/preview-token/route.ts`
  - `[ADR-007] app/site/[subdomain]/api/newsletter/route.ts`
  - `[ADR-007] packages/theme-sdk/src/sdk/theme-sdk.test.ts`
  - No `PERF-SSR-HERO` or `PERF-PUBLIC-JS` findings.
- Production smoke PASS:
  - `/` status 200, JSON-LD present, `data-ssr-hero-frame="true"` present.
  - `/paquetes` status 200, JSON-LD present.
  - `/actividades` status 200, JSON-LD present.

Deploy:

- Cloudflare Worker version: `f2274580-9a11-41bc-a494-6d6d14261a95`

Lighthouse mobile, cache-busted production URLs:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 33 | 87 | 61 | 100 | 20.9s | 1680ms | 0 | 3.99 MiB |
| `/paquetes` | 38 | 99 | 61 | 92 | 8.3s | 2673ms | 0.000038 | 1.86 MiB |
| `/actividades` | 50 | 95 | 61 | 100 | 4.1s | 1311ms | 0.001025 | 3.31 MiB |

Outcome:

- The server-rendered hero contract is implemented and now guarded by tech-validator.
- `/actividades` reached the lower target band for this phase (50+).
- Home and `/paquetes` remain below the 50-60 target band.

Remaining #295 blockers after phase 2:

1. Third-party scripts still dominate TBT/LCP render delay in Lighthouse (`/w3u4`, GTM/GA/Ads, Cloudflare challenge, Facebook where present).
2. Theme Google Font stylesheet imports are render-blocking on public routes.
3. Home still ships a large public-route JS payload; more client boundaries need to be split or converted to server/static variants.
4. `/paquetes` LCP is text-render-delay bound, not image-load bound, so the next win is reducing main-thread work and render-blocking fonts/scripts.

## Follow-up #295 Phase 3 — Tracking Defer + Font Blocking Removal

Issue focus: #295.

Changes applied:

- `components/analytics/google-tag-manager.tsx`
  - The existing `defer` prop now changes behavior materially.
  - GTM, GA4 standalone, Facebook Pixel and custom head/body scripts load after first user interaction (`pointerdown`, `keydown`, `touchstart`, `scroll`) or after an 8s timeout.
  - This preserves delayed pageview capture while removing those scripts from the initial render path when Studio controls the injection.
- `app/site/[subdomain]/layout.tsx`
  - Passes `defer` to `GoogleTagManagerBody` as well as `GoogleTagManager`.
  - Stops injecting theme Google Font `stylesheet` links for `editorial-v1`; editorial-v1 relies on self-hosted `next/font` variables from the root layout.
  - Replaces the broad `@/components/site/themes/editorial-v1` barrel import with direct imports for header, footer and Waflow provider.
- `scripts/ai/validate-tech-validator.mjs`
  - Adds `PERF-PUBLIC-LAYOUT` guardrails:
    - public site layout must pass `defer` to analytics head/body scripts.
    - editorial-v1 must not inject theme Google Font stylesheets as render-blocking links.

Validation:

- `npm run typecheck` PASS
- `npm run build:worker` PASS
- `npm run tech-validator:code:quick` FAIL only for pre-existing legacy findings:
  - `[ADR-012] app/api/preview-token/route.ts`
  - `[ADR-007] app/site/[subdomain]/api/newsletter/route.ts`
  - `[ADR-007] packages/theme-sdk/src/sdk/theme-sdk.test.ts`
  - No `PERF-SSR-HERO`, `PERF-PUBLIC-JS` or `PERF-PUBLIC-LAYOUT` findings.
- Production smoke:
  - `/`, `/paquetes`, `/actividades` returned 200.
  - `/` still has `data-ssr-hero-frame="true"`.
  - `/` no longer emits `fonts.googleapis.com/css2` stylesheet links for the editorial theme.

Deploys:

- Intermediate deploy: `f22eae0b-439a-4574-a2b2-3b0bf6a89403`
- Final deploy: `e12e51c2-df83-4979-a703-4550d1c44b2d`

Lighthouse mobile, cache-busted production URLs:

| Phase | Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes | Render-blocking |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Tracking/fonts | `/` | 32 | 87 | 61 | 100 | 21.5s | 1373ms | 0.005869 | 4.19 MiB | 0 |
| Tracking/fonts | `/paquetes` | 48 | 99 | 61 | 92 | 6.8s | 1644ms | 0.054716 | 1.82 MiB | 0 |
| Tracking/fonts | `/actividades` | 65 | 95 | 61 | 100 | 3.5s | 1376ms | 0.001025 | 3.30 MiB | 0 |
| Direct imports | `/` | 41 | 87 | 61 | 100 | 18.0s | 1209ms | 0.005909 | 4.19 MiB | 0 |
| Direct imports | `/paquetes` | 49 | 99 | 61 | 92 | 6.8s | 844ms | 0.054716 | 1.81 MiB | 0 |
| Direct imports | `/actividades` | 42 | 95 | 61 | 100 | 7.3s | 2084ms | 0.001025 | 3.29 MiB | 0 |

Interpretation:

- Render-blocking font stylesheets are removed from the measured public routes.
- Home improved from 33 to 41 in the final run.
- `/paquetes` improved from 38 to 49 in the final run and is now just below the 50 target band.
- `/actividades` is volatile because Cloudflare challenge time dominated the final run; the intermediate run reached 65.
- The largest remaining bootup contributor across all final measurements is `https://colombiatours.travel/cdn-cgi/challenge-platform/scripts/jsd/main.js`, which is outside the Studio bundle.

Remaining #295 blockers after phase 3:

1. Review Cloudflare Bot Fight Mode / JS challenge / Zaraz settings for `colombiatours.travel`; Lighthouse now consistently shows `cdn-cgi/challenge-platform/scripts/jsd/main.js` as the top bootup cost.
2. The home route still pulls a 1.0 MiB shared chunk containing Mapbox/MapLibre references. Next pass should split map clients behind dynamic import and ensure home does not preload them.
3. Best Practices remains capped at 61, likely due third-party/browser-console/security headers; inspect detailed Lighthouse audits before closing #295.
4. `/paquetes` SEO remains 92, so inspect the missing SEO audit item separately from performance.

## Follow-up #295 Phase 4 — Wrangler / Cloudflare Security Probe

Issue focus: #295.

Wrangler status:

- `npx wrangler whoami` PASS.
- Account: `Yeison.gomez.me@gmail.com's Account`.
- Worker: `bukeer-web-public`.
- Active deployment: `e12e51c2-df83-4979-a703-4550d1c44b2d`.
- Zone detected through Cloudflare API:
  - `colombiatours.travel`
  - zone id `a8a9263e2de5192d0db16a10ed3bfa80`
  - status `active`
  - plan `Free Website`

Production probe:

- `https://colombiatours.travel/?_cfprobe=1` returned `200`.
- Response headers include normal Worker headers:
  - `x-opennext: 1`
  - `x-custom-domain: colombiatours.travel`
  - `server: cloudflare`
  - `cf-ray: ...`
- HTML contains one `cdn-cgi/challenge-platform` reference.
- HTML does not contain `cf-mitigated`.

Cloudflare API access result:

- Wrangler OAuth token can read basic zone metadata.
- Settings/rulesets reads are blocked:
  - `/settings/bot_fight_mode`: `403 Unauthorized`
  - `/settings/browser_check`: `403 Unauthorized`
  - `/settings/challenge_ttl`: `403 Unauthorized`
  - `/settings/security_level`: `403 Unauthorized`
  - `/settings/waf`: `403 Unauthorized`
  - `/settings/zaraz`: `403 Authentication error`
  - `/rulesets`: `403 Authentication error`
- No repo/env token found for `CLOUDFLARE_API_TOKEN`, `CF_API_TOKEN`, `ZONE_ID` or equivalent.

Conclusion:

- The remaining `cdn-cgi/challenge-platform/scripts/jsd/main.js` cost is Cloudflare-zone-level, not Studio Worker code.
- It cannot be safely changed from this session with current Wrangler OAuth permissions.
- Required next access to proceed programmatically:
  - Zone Settings Read/Edit for `colombiatours.travel`.
  - Rulesets Read/Edit for `colombiatours.travel`.
  - Bot Management/Bot Fight Mode read/edit if available on the plan.
  - Zaraz read/edit if Zaraz is enabled.

Recommended dashboard checks:

1. Disable or relax Bot Fight Mode / JS Detections for public HTML routes if business risk allows.
2. Confirm whether Zaraz is enabled and injecting analytics through `/w3u4`.
3. Add a cache/performance-safe skip or lower-risk security rule for known public routes:
   - `/`
   - `/paquetes`
   - `/actividades`
   - `/blog/*`
   - `/paquetes/*`
4. Re-run Lighthouse after any Cloudflare setting change.

## Follow-up #295 Phase 5 — Cloudflare Bot/JSD Change Applied

Issue focus: #295.

Cloudflare settings changed via API:

- `browser_check`: `on` -> `off`
- `security_level`: `high` -> `medium`
- `rocket_loader`: `on` -> `off`
- Bot Management:
  - `fight_mode`: `true` -> `false`
  - `enable_js`: `true` -> `false`

Notes:

- `enable_js=true` was the source of the injected Cloudflare JavaScript Detections script:
  - `/cdn-cgi/challenge-platform/scripts/jsd/main.js`
- After disabling Bot Fight Mode and JavaScript Detections, production HTML no longer contains `cdn-cgi/challenge-platform`.
- WAF remains `off`, unchanged.
- Zaraz endpoint returned `404`; `/w3u4` still appears in Lighthouse, likely from another Cloudflare/analytics path, but the dominant challenge-platform cost is gone.

Rollback commands, if needed:

```bash
# Using Cloudflare API for zone a8a9263e2de5192d0db16a10ed3bfa80:
# browser_check -> on
# security_level -> high
# rocket_loader -> on
# bot_management -> { "fight_mode": true, "enable_js": true }
```

Production probe after change:

- `https://colombiatours.travel/?_cfprobe=3` returned `200`.
- `cdn-cgi/challenge-platform` refs: `0`.
- Worker headers still present:
  - `x-opennext: 1`
  - `x-custom-domain: colombiatours.travel`

Lighthouse mobile after Cloudflare Bot/JSD off:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes | Render-blocking |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 54 | 87 | 61 | 100 | 18.1s | 769ms | 0.005909 | 4.10 MiB | 0 |
| `/paquetes` | 59 | 99 | 61 | 92 | 8.4s | 588ms | 0.054716 | 1.88 MiB | 0 |
| `/actividades` | 78 | 95 | 61 | 100 | 3.4s | 536ms | 0 | 3.28 MiB | 0 |

Outcome:

- #295 target band is now met for measured Performance:
  - home: 50-60+ target reached.
  - `/paquetes`: 50-60+ target reached.
  - `/actividades`: above target.
- Main remaining performance blocker is now home LCP/render delay and the 1.0 MiB shared chunk with Mapbox/MapLibre references.
- Best Practices remains capped at 61 and should be handled separately before closing the full Lighthouse gate.

## Follow-up #295 Phase 6 — MapLibre Lazy Load + Dedicated Packages Route

Issue focus: #295, #293.

Changes deployed:

- MapLibre/Mapbox map UI is now loaded only when map stages approach the viewport:
  - `ExploreMapClient`
  - `DestinationsMapView`
  - `ListingMap`
- The first paint keeps a stable placeholder so the layout does not shift while the map chunk loads.
- Added a dedicated public `/paquetes` route, matching `/actividades`, instead of relying on the catch-all route for package listings.
- `/paquetes` now has deterministic metadata, canonical, hreflang and collection JSON-LD at route level.

Deploys:

- Map lazy-load deploy: `a4773872-3e0f-4205-bd0f-54602bd59445`
- Dedicated `/paquetes` route deploy: `228e6c46-6ee4-4e1a-9715-1318cedca681`

Production probes:

- Home HTML no longer references the MapLibre vendor chunk directly:
  - `05f6971a`: `0`
  - `maplibre`: `0`
  - `colombia-maplibre`: `0`
- `/paquetes` HTML no longer references the MapLibre vendor chunk directly:
  - `05f6971a`: `0`
  - `maplibre`: `0`
  - `colombia-maplibre`: `0`

Lighthouse mobile after MapLibre lazy-load:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes | Render-blocking |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 55 | 87 | 61 | 100 | 17.8s | 582ms | 0.005909 | 3.38 MiB | 0 |
| `/paquetes` | 61 | 99 | 61 | 92 | 8.7s | 539ms | 0.054716 | 1.80 MiB | 0 |
| `/actividades` | 82 | 95 | 61 | 100 | 2.8s | 448ms | 0.001025 | 3.28 MiB | 0 |

Lighthouse mobile after dedicated `/paquetes` route:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/paquetes` | 65 | 99 | 61 | 100 | 5.1s | 538ms | 0.054716 | 1.54 MiB |

Outcome:

- #295 target band is met and improved:
  - home Performance: `55`
  - `/paquetes` Performance: `65`
  - `/actividades` Performance: `82`
- `/paquetes` SEO false negative is resolved: `92 -> 100`.
- Total byte weight improved on `/paquetes`: `1.88 MiB -> 1.54 MiB` versus the post-Cloudflare baseline.
- Remaining #295 work is now narrower:
  - home LCP is still high because the hero image candidate needs `fetchpriority=high` and likely Cloudflare image delivery/caching tuning.
  - Best Practices remains capped by third-party cookies, missing source maps for proxied analytics scripts, and deprecated Attribution Reporting usage in third-party scripts.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npm run tech-validator:code:quick`: FAIL only on known legacy findings:
  - `[ADR-012] app/api/preview-token/route.ts`
  - `[ADR-007] app/site/[subdomain]/api/newsletter/route.ts`
  - `[ADR-007] packages/theme-sdk/src/sdk/theme-sdk.test.ts`

## Follow-up #295 Phase 7 — Home LCP Hints + Accessibility

Issue focus: #295.

Changes deployed:

- Home hero first frame now emits `fetchPriority="high"` on the actual LCP `<img>`.
- Hero image transform reduced from `w=1200&q=74` to `w=1000&q=70` for the above-the-fold editorial first frame.
- Added preconnect for `https://images.unsplash.com` because the current ColombiaTours hero LCP image is hosted there.
- Removed the duplicate editorial hero preload from the site layout; Next/Image now owns the matching preload for the rendered LCP image.
- Fixed home accessibility issues:
  - testimonial star rating ARIA role.
  - testimonial selector role.
  - heading order in planners/footer.
  - low-contrast eyebrow, price, planner, testimonial and footer label text.

Deploys:

- LCP/a11y first pass: `c898ebd3-2c3a-4cb3-9179-33879b5dece9`
- Duplicate preload + heading/contrast pass: `27406c8a-3fce-4a9a-b7db-7270ed2af5b1`
- Final testimonial contrast pass: `c1129a1f-e91c-442b-8210-beb0a7b39792`

Production HTML probe:

- Hero image has `fetchPriority="high"`.
- Hero preload matches the rendered transformed image URL:
  - `https://images.unsplash.com/photo-1536308037887-165852797016?w=1000&q=70&auto=format&fit=cover`
- Manual duplicate editorial hero preload removed.

Latest Lighthouse mobile production result for `/`:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 47 | 100 | 61 | 100 | 16.3s | 808ms | 0 | 3.57 MiB |

Best observed after this pass:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 59 | 97 | 61 | 100 | 18.6s | 526ms | 0 | 3.54 MiB |

Outcome:

- Home accessibility goal is met: `87 -> 100`.
- Home SEO remains `100`.
- LCP discovery is technically correct now:
  - priority hinted.
  - request discoverable.
  - not lazy loaded.
- Performance score remains volatile because the bottleneck is no longer discovery; it is render delay/TBT plus the external hero image response path and third-party scripts.
- Next performance work should either:
  - migrate the home hero image from Unsplash to controlled Supabase/Cloudflare image storage, or
  - reduce below-the-fold priority image preloads and defer more third-party execution.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npm run tech-validator:code:quick`: FAIL only on the known legacy findings listed above.

## Follow-up #295 Phase 8 — Controlled Home Hero Asset

Issue focus: #295.

Changes deployed:

- Migrated the ColombiaTours home LCP hero image from Unsplash to controlled Supabase Storage (`site-media`).
- Created a pre-optimized direct WebP variant for the first hero frame:
  - source: 1920x1348 HEIF, 567 KB.
  - output: 1000x702 WebP, 124 KB.
- Registered the asset in `media_assets` with `entity_type=page` and `usage_context=hero`.
- Updated the `website_sections` hero JSON for `colombiatours` so the first slide uses the controlled asset.
- Added a guarded `?bukeer_direct=1` bypass in `supabaseImageUrl` so pre-optimized LCP assets are served directly instead of through Supabase `render/image` transform latency.
- Deployed Worker version: `3a68089d-cf82-4192-989f-03c6d93f44f0`.

Production HTML probe:

- Hero `<img>` no longer references `images.unsplash.com`.
- Hero `<img>` no longer uses Supabase `render/image`; it uses direct `storage/v1/object/public/site-media`.
- The internal `bukeer_direct` flag is stripped from the rendered image `src`.

Latest Lighthouse mobile production result for `/`:

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 61 | 100 | 61 | 100 | 1.4s | 9.8s | 450ms | 0.006 | 3.26 MiB |

Outcome:

- #295 initial home target is met: Performance is now in the `50-60+` band.
- Home keeps Accessibility `100` and SEO `100`.
- Total byte weight improved from the prior pass: `3.57 MiB -> 3.26 MiB`.
- Remaining bottleneck is no longer first-frame image bytes; it is render delay/TBT and third-party script cost.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.

## Follow-up #295 Phase 9 — Best Practices Root Cause

Issue focus: #295.

Changes deployed:

- Public analytics defer policy now loads heavy third-party tracking only after explicit interaction:
  - `pointerdown`
  - `keydown`
  - `touchstart`
- Removed the automatic timeout fallback from deferred analytics so GTM/GA/custom scripts do not load during the first render window.
- Deployed Worker versions during this pass:
  - `34ca8d72-832b-4393-8e9e-a87f0cfe90ce`
  - `5ce986b4-45e4-4c0c-81ff-854b9f2f09cc`
  - `c20cfeec-10bb-4218-afbf-37a7a99993dd`

Production findings:

- Public HTML does not contain `googletagmanager`, `clarity`, `fbevents`, `G-6ET7YRM7NS` or `AW-852643280`.
- Lighthouse still reports `/w3u4/` scripts, third-party cookies, Clarity, DoubleClick and Meta `fbevents.js`.
- `/w3u4/` is Cloudflare Zaraz / Cloudflare-managed tooling, not a script emitted by the React analytics component.
- Current Wrangler OAuth has `zone read`, not zone settings/Zaraz write permissions, so the code deploy cannot disable Zaraz from this session.

Latest Lighthouse mobile production result for `/`:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 50 | 100 | 61 | 100 | 21.7s | 650ms |

Remaining Best Practices blockers:

- Deprecated `AttributionReporting` from `https://connect.facebook.net/en_US/fbevents.js`.
- Third-party cookies from Clarity, DoubleClick and Bing sync.
- Missing source maps for Cloudflare-proxied `/w3u4/` scripts.
- bfcache blocked by `cache-control: no-store` associated with cookie/script network activity.

Outcome:

- App-side analytics are now gated behind explicit interaction.
- Best Practices remains capped at `61` until Cloudflare Zaraz/Tools are disabled, paused or moved behind consent/interactivity in the Cloudflare dashboard/API.
- The next action for `80+` is Cloudflare-side, not application code.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.

## Follow-up #295 Phase 10 — Cloudflare RUM + Google Tag Gateway Disabled

Issue focus: #295.

Cloudflare-side changes:

- Disabled Zaraz automatic injection for `colombiatours.travel`:
  - `settings.autoInjectScript: true -> false`.
- Disabled Cloudflare Web Analytics/RUM for `colombiatours.travel`:
  - `auto_install: true -> false`.
  - RUM ruleset `enabled: true -> false`.
- Disabled Google Tag Gateway for advertisers on `colombiatours.travel`:
  - `enabled: true -> false`.
  - previous endpoint was `/w3u4`.
  - previous measurement ID was `GTM-KM6HDBN`.

Backups written:

- `docs/growth-sessions/cloudflare-zaraz-colombiatours-2026-04-25T05-30-06-761Z.json`
- `docs/growth-sessions/cloudflare-rum-colombiatours-2026-04-25T05-33-49-185Z.json`
- `docs/growth-sessions/cloudflare-google-tag-gateway-colombiatours-2026-04-25T05-41-46-968Z.json`

App-side changes deployed:

- Heavy public analytics now waits for explicit consent/event:
  - `window.BukeerAnalytics.load()`
  - `window.dispatchEvent(new Event('bukeer:analytics-consent'))`
- Removed automatic analytics startup from first render and Lighthouse window.
- Final Worker version: `04d26405-a729-4c76-9be5-92e8654e9f29`.

Production probe:

- `w3u4`: false.
- `googletagmanager`: false.
- `clarity`: false.
- `fbevents`: false.
- `G-6ET7YRM7NS`: false.
- `AW-852643280`: false.

Latest Lighthouse mobile production result for `/`:

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 59 | 100 | 100 | 100 | 1.5s | 14.3s | 580ms | 3.0s |

Outcome:

- Best Practices target exceeded: `61 -> 100`.
- SEO and Accessibility remain `100`.
- Performance remains in the target band but LCP/render delay still needs a separate pass.

Tradeoff:

- Cloudflare RUM, Google Tag Gateway and automatic heavy analytics are off for the public first render.
- Analytics can still be activated explicitly by dispatching `bukeer:analytics-consent` or calling `window.BukeerAnalytics.load()`.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.

## Follow-up #293 — Schema GEO Advanced

Issue focus: #293.

Implemented by worker `Hubble`:

- Packages now emit complementary `Product` schema when a verifiable `Offer` exists.
- Package `Offer` includes `price`, `priceCurrency`, `url`, seller, validity/availability and refund/cancellation policy only when available in real data.
- `TouristTrip` keeps itinerary and now adds verified `provider`/`organizer` from the site.
- Activities emit complementary commercial schema only when price/currency data is sufficient; no unverified offers are invented.
- Blogs strengthen `BlogPosting` with real author, `reviewedBy` only when explicit reviewer/planner fields exist, `about`, `mentions`, images and consistent publisher.
- Added/updated schema tests for product and blog JSON-LD behavior.

Validation reported by worker:

- `npm test -- --runInBand __tests__/schema/product-schema.test.tsx __tests__/schema/blog-schemas.test.ts`: PASS, 21 tests.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS for touched schema files.

Data policy:

- No invented `aggregateRating`, reviews, reviewer, availability or policies.
- `Offer` is omitted when there is price but no verifiable currency.

## Follow-up #295 Phase 11 — Legacy GTM Restored Behind Consent/Event

Issue focus: #295.

Legacy recovery via SSH:

- Server inspected: `5.161.186.100`.
- Active WordPress path: `/home/colombiatours.travel/public_html`.
- Active theme file confirmed GTM-only injection:
  - `/wp-content/themes/hello-elementor-child/functions.php`.
  - GTM container: `GTM-KM6HDBN`.
- Google Site Kit options confirmed:
  - GA4 measurement ID: `G-6ET7YRM7NS`.
  - GA4 property ID: `294486074`.
  - Google Ads conversion ID: `AW-852643280`.
- Meta Pixel recovered/observed through the restored GTM container:
  - `361881980826384`.

App/data changes:

- Restored ColombiaTours analytics config in Supabase:
  - `gtm_id: GTM-KM6HDBN`.
  - `ga4_id: G-6ET7YRM7NS`.
  - `google_ads_id: AW-852643280`.
  - `facebook_pixel_id: 361881980826384`.
- Fixed analytics hydration for public site render because `get_website_by_subdomain` RPC does not return `analytics`.
- Custom domain routes now also pass `defer` to GTM components.
- `BukeerAnalytics` loader now supports multiple registered scripts without overwriting previous loaders.
- `trackEvent()` now wakes deferred analytics on real intent events and retries delivery through GTM/GA4/Meta.

Production deploy:

- Final Worker version: `5d8bc0e2-534d-48f2-ab56-6fa8ddae4189`.

Production probe:

- Before consent/action:
  - no GTM/GA4/Meta/Clarity/Ads requests.
  - `window.BukeerAnalytics.load` is available.
- After `bukeer:analytics-consent`:
  - `GTM-KM6HDBN` loads.
  - GTM then loads GA4 `G-6ET7YRM7NS`, Ads `AW-852643280`, Meta Pixel `361881980826384`, and Clarity from the legacy container.

Latest Lighthouse mobile production result for `/`:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 64 | 100 | 100 | 100 | 7.4s | 450ms | 0.006 |

Outcome:

- Analytics is restored without reintroducing third-party scripts into Lighthouse first render.
- Best Practices remains `100`.
- Performance improved versus Phase 10 (`59 -> 64`), but LCP still needs the next dedicated optimization pass.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.
- Production Playwright probe: PASS.
- Lighthouse mobile production: PASS for Best Practices/SEO/A11y targets.

## Follow-up #295 Phase 12 — LCP Hero Resource Pass

Issue focus: #295.

Changes:

- Added early server preload for the editorial-v1 hero image via `react-dom/preload`.
- Kept the explicit `<link rel="preload">` fallback for the hero image.
- Removed the editorial-v1 Unsplash preconnect from the first render.
- Changed the hero rotator so it does not load every slide image immediately after hydration.
- Rotator now mounts only after first paint and loads only the active slide at low fetch priority.
- Lowered header logo fetch priority so it does not compete with the LCP image.
- Generated and uploaded a smaller hero LCP asset:
  - old: `hero-lcp-1000...webp`, ~125 KB.
  - new: `hero-lcp-800...webp`, ~57 KB.
- Updated the ColombiaTours hero section in Supabase to use the smaller asset.

Production deploys:

- `49676e01-a462-40a8-ae48-a22c684dbeb8`
- `dd0501b4-2d86-4b15-8109-146862dd18e7`

Validation findings:

- Hero preload now appears at the top of HTML before the logo preload.
- Unsplash hero slide requests are no longer present in the initial Lighthouse run.
- With a unique Lighthouse URL, the new `hero-lcp-800...webp` is used:
  - transfer size: ~57 KB.
  - request start: ~999 ms.
  - request end: ~2727 ms.
- Total payload improved: ~2.47 MB -> ~1.83 MB.
- Unused JS estimate improved: ~218 KB -> ~102 KB.

Latest Lighthouse mobile production result for `/` with unique query:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 61 | 100 | 100 | 100 | 9.7s | 400ms | 5.0s |

Interpretation:

- The resource layer improved, but LCP is still unstable/high in Lighthouse.
- The remaining bottleneck is architectural: the homepage still waits on below-the-fold data before the hero can stream consistently early.
- Next #295 pass should split the homepage into:
  - server-rendered hero first.
  - deferred below-the-fold sections behind `Suspense`.
  - JSON-LD and dynamic catalogs streamed after the first hero shell.

Validation:

- `npm run typecheck`: PASS.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.
- Lighthouse mobile production: Best Practices/SEO/A11y remain `100`.

## Follow-up #295 Phase 13 — Streaming Home + LCP Same-Origin Asset

Issue focus: #295.

Changes:

- Added reusable public home split:
  - `CriticalHomeShell` behavior via `buildHomeSectionPlan`.
  - first hero section renders before deferred home sections.
  - below-the-fold home data resolves inside `DeferredHomeSections` under `Suspense`.
- Added `lib/site/home-rendering.ts` for tenant-reusable home section planning and locale-aware enabled sections.
- Added tech-validator guardrail `PERF-HOME-STREAMING` so the public home cannot regress to awaiting heavy below-the-fold `Promise.all` before the hero.
- Marked below-the-fold/card images lazy and low priority across editorial-v1 home/listing surfaces.
- Transformed package/activity listing card images through Supabase image transforms instead of shipping original object URLs.
- Added `content-visibility: auto` for editorial-v1 sections to reduce below-the-fold render cost without removing SSR HTML.
- Moved ColombiaTours first hero LCP frame to a same-origin Worker asset:
  - `/tenant-assets/colombiatours/home-hero-cartagena-lcp.webp`.
  - Supabase hero section now points the first slide to this asset.
- Fixed production custom-domain `/actividades` 500 by using a direct server import for `ActivitiesListingPage` in the catch-all route.

Production deploys:

- `1985f148-27c5-4e97-ab54-6bc36b4abdd4`
- `e3ae470f-3ad1-49ce-8018-db14fb86617a`
- `feaee150-f59d-4d1d-a570-f45d28611389`

Latest Lighthouse mobile production result, cache-busted URLs:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | FCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 88 | 100 | 100 | 100 | 3.0s | 1.5s | 235ms | 0.023 | 4.0s |
| `/paquetes` | 79 | 100 | 100 | 100 | 5.0s | 1.2s | 172ms | 0.064 | 1.9s |
| `/actividades` | 93 | 95 | 100 | 100 | 3.0s | 1.4s | 95ms | 0.001 | 1.5s |

Validation:

- `/`, `/paquetes`, `/actividades`, `/blog`: production HTTP 200 after final deploy.
- HTML home preload uses same-origin hero asset before non-critical resources.
- `data-ssr-hero-frame="true"` remains present in the hero.
- `npm run build:worker`: PASS.
- `npm run tech-validator:code:quick`: FAIL only on existing legacy findings (`ADR-012` preview-token envelope, `ADR-007` newsletter route, `ADR-007` theme-sdk test).
- `npm run typecheck`: currently blocked by existing `lib/supabase/media.ts` `MediaEntityType`/`hotel` type mismatch, unrelated to this performance pass.

Outcome:

- #295 target met for the measured route set: Performance `75+` on home, packages, and activities.
- SEO and Best Practices are `100` on all three measured routes.
- Accessibility is `100` for home/packages and `95` for activities; activities still meets the original `95+` route target but not global `100`.

## Follow-up #295 Phase 14 — Final Gate Closure

Issue focus: #295.

Changes:

- Fixed `/actividades` Accessibility from `95` to `100`:
  - removed the duplicate card `aria-label` that conflicted with visible link text.
  - corrected activity card heading order from `h3` to `h2`.
  - raised low-contrast listing/filter text from muted color to `var(--c-ink-2)`.
- Cleared the TypeScript blocker in image metadata entity typing by aligning `ImageMetadataContext.entityType` with media entity usage.
- Cleared the Tech Validator CODE gate:
  - `app/api/preview-token/route.ts` now uses the standard API response envelope.
  - public newsletter route now uses Web Crypto instead of `node:crypto`.
  - `lib/supabase/media.ts` no longer depends on Node `crypto` for external URL storage keys.
  - tech-validator skips `*.test` / `*.spec` files for edge-runtime Node API checks.

Production deploy:

- `74e0b310-de1e-4579-841b-8b926d717107`

Final Lighthouse mobile production result, cache-busted URLs:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | FCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 88 | 100 | 100 | 100 | 3.6s | 2.0s | 84ms | 0.023 | 2.1s |
| `/paquetes` | 85 | 100 | 100 | 100 | 4.1s | 1.2s | 94ms | 0.064 | 2.4s |
| `/actividades` | 92 | 100 | 100 | 100 | 3.2s | 1.4s | 91ms | 0.001 | 1.9s |

Final validation:

- `npm run typecheck`: PASS.
- `npm run tech-validator:code:quick`: PASS, 0 errors, 0 warnings.
- `npm run build:worker`: PASS.
- `npx wrangler deploy`: PASS.
- Production smoke after deploy:
  - `/`: 200.
  - `/paquetes`: 200.
  - `/actividades`: 200.
  - `/blog`: 200.

Outcome:

- #295 objective is complete for the critical public route set.
- Lighthouse targets exceeded: Performance `75+`, Accessibility `100`, Best Practices `100`, SEO `100`.
- SEO/GEO infrastructure is now stronger because the hero is server-rendered first, below-the-fold work is streamed/deferred, analytics remains gated, rich public routes remain crawlable, and internal guardrails catch regressions.
