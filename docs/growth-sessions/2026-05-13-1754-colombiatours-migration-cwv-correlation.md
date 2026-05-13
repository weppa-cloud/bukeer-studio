---
session_id: "2026-05-13-1754-codex"
started_at: "2026-05-13T17:54:00-05:00"
ended_at: "2026-05-13T17:54:00-05:00"
agent: "codex"
scope: "audit"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
domain: "colombiatours.travel"
initiator: "diagnostiquemos y correlacionemos con la migracion del sitio ColombiaTours"
outcome: "completed"
linked_weekly: ""
related_issues: []
---

# Session audit - ColombiaTours migration / CWV correlation - 2026-05-13 17:54

## Intent

Correlate the Google Search Console Core Web Vitals issue and organic traffic movement with the ColombiaTours migration/cutover timeline.

## Evidence reviewed

- OKR/budget context for `colombiatours-travel`.
- GSC domain property `sc-domain:colombiatours.travel`.
- GSC Core Web Vitals UI, updated `2026-05-11`.
- GSC analytics windows:
  - Pre/post: `2026-04-15..2026-04-28` vs `2026-04-29..2026-05-12`.
  - URL families: home, legacy root slugs, `/blog/*`, `en.colombiatours.travel`.
- Supabase `website_legacy_redirects`, `websites`, `website_pages`, `website_sections`.
- Existing growth session logs for cutover and follow-up work.
- Live HTTP redirect/canonical/header checks on representative URLs.
- Mobile lab checks with Playwright for home and representative blog/EN pages.
- Code references for image optimization, hero preload, and cache behavior.

## Timeline

| Date | Event | Relevance |
|---|---|---|
| 2026-04-04 | 531 legacy redirects created | Initial migration mapping already existed before cutover. |
| 2026-04-17 | 85 additional `/l/*` redirects created | Landing/product migration mapping continued. |
| 2026-04-24 | Post-cutover deploy recorded for `colombiatours.travel`, `www`, and `en` routes | Main public migration milestone; smoke tests passed but CWV/Lighthouse mobile was explicitly pending. |
| 2026-04-25 | Lighthouse mobile baseline showed home LCP residual around 3.6s | LCP was already a known residual issue immediately after cutover. |
| 2026-04-29/30 | SEO remediation commits and docs around redirects, canonicals, soft 404s, and locale mismatches | Organic visibility movement starts matching migration/reindexing, not only CWV. |
| 2026-05-10/11 | English routing polish, locale sitemap routes, translated blog canonical work, 139 redirects added | EN/localized migration cleanup happened after visibility had already dropped. |
| 2026-05-11 | GSC CWV report updated | Mobile group: 135 poor URLs, `LCP > 4s`, example home, group LCP 4.6s. |

## Findings

### 1. CWV issue is real, but not newly created by the migration

GSC mobile reports:

- 135 poor mobile URLs.
- 6 mobile URLs need improvement.
- 0 fast mobile URLs.
- Issue: `LCP > 4s (mobile)`.
- Example URL: `https://colombiatours.travel/`.
- Group LCP: 4.6s.
- First detection shown in GSC predates this migration history, so the issue was not created from zero by the April 2026 cutover.

Migration relevance: the migration did not solve the old mobile LCP problem, and it exposed many migrated pages into the same slow-field-data group.

### 2. Organic visibility drop correlates more strongly with URL migration/reindexing than with home CWV

GSC 14-day comparison:

| Segment | 2026-04-15..04-28 | 2026-04-29..05-12 | Read |
|---|---:|---:|---|
| Mobile total | 145 clicks / 31,260 impressions | 72 clicks / 10,094 impressions | Large drop. |
| Desktop total | 72 clicks / 27,247 impressions | 50 clicks / 10,770 impressions | Large impression drop too. |
| Home exact | 62 clicks / 2,477 impressions | 62 clicks / 1,910 impressions | Home clicks stable. |
| Legacy root one-segment URLs | 83 clicks / 32,461 impressions | 10 clicks / 2,581 impressions | Main collapse. |
| `en.colombiatours.travel` | 61 clicks / 24,466 impressions | 20 clicks / 3,029 impressions | Main collapse. |
| `/blog/*` | about 3 clicks / 2,231 impressions | about 24 clicks / 12,828 impressions | New family gained, but did not offset legacy/EN loss. |

Read: the biggest loss is legacy root slugs and EN host exposure collapsing while `/blog/*` ramps up. Home clicks did not collapse. This points to migration/reindexing/canonical/locale transition as the primary SEO visibility driver.

### 3. Redirects are mostly technically correct now, but were completed in waves

Representative live checks are single-hop 301s to canonical destinations:

- `/agencia-de-viajes-es-legal-en-colombia/` -> `/blog/agencia-de-viajes-es-legal-en-colombia`.
- `/estaciones-del-ano-en-colombia-un-pais/` -> `/blog/estaciones-del-ano-en-colombia-un-pais`.
- `https://en.colombiatours.travel/los-10-mejores-lugares-turisticos-de-colombia/` -> `https://colombiatours.travel/en/blog/los-10-mejores-lugares-turisticos-de-colombia`.

But redirect creation was spread across `2026-04-04`, `2026-04-17`, `2026-04-24`, `2026-05-10`, `2026-05-11`, and `2026-05-13`. The `2026-05-11` batch included 139 redirects, many for EN/blog paths, after the post-migration GSC drop had already started.

### 4. Field CWV risk remains in cache and image delivery

Live HTTP/header checks showed public HTML returning:

- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`

Code confirms:

- `next.config.ts` disables Next image optimization with `images.unoptimized: true` because Cloudflare Workers cannot use the native optimizer yet.
- `next.config.ts` only adds long cache headers for fonts, `_next/static`, and `_next/image`, not public HTML or tenant assets.
- Hero rendering does use preload/fetch priority for the first editorial hero image.
- `supabaseImageUrl()` can transform Supabase public object URLs through `/storage/v1/render/image/public/`, but direct uploaded assets and external storage headers can still be a bottleneck.

Representative assets:

- Home LCP asset is same-origin WebP and Cloudflare HIT, but header still has `max-age=0, must-revalidate` rather than immutable long cache.
- Blog LCP images are Supabase storage JPGs with `cache-control: no-cache` and observed Cloudflare MISS.

Lab mobile checks did not reproduce the 4.6s field LCP; sampled LCP was about 0.8s to 1.7s. That means the GSC issue is field/CrUX population behavior and/or slow connection/device geography, not an always-reproducible local lab regression.

## Conclusion

There are two separate but related problems:

1. **Core Web Vitals:** old mobile LCP debt persisted through migration. The migration likely amplified its surface area across new canonical page families, but the GSC issue was not born from this cutover.
2. **SEO visibility:** the larger post-cutover drop is primarily a URL family and locale migration/reindexing issue. Legacy root slugs and `en.colombiatours.travel` lost exposure faster than `/blog/*` and `/en/blog/*` regained it.

## Recommended next actions

1. Refresh internal `seo_gsc_daily_facts` beyond `2026-04-28` and store daily metrics by page family: home, legacy root, `/blog`, EN host, `/en/blog`, product/listing.
2. Build a top-50 dropped URL reconciliation table: old URL, new destination, redirect status, live canonical, GSC indexed canonical, clicks/impressions delta.
3. Prioritize mobile LCP fixes on public pages:
   - add safe edge caching for public HTML where possible;
   - make home/tenant LCP assets immutable long-cache;
   - avoid Supabase `no-cache` LCP images on migrated blogs by using transformed/cached renditions or same-origin optimized assets.
4. Treat EN as a migration cleanup lane: keep redirects, but fix weak translated titles/content and only expose sitemap URLs that meet quality thresholds.
5. Re-run field/lab validation after deploy: GSC validation for CWV group, Lighthouse mobile templates, and live header checks.

## Mutations

| Entity | Action | Before | After | Source |
|---|---|---|---|---|
| Supabase data | none | unchanged | unchanged | read-only review |
| GSC | none | unchanged | unchanged | read-only review |
| Repo docs | add session log | absent | this file | Codex |

## External costs

| Provider | Operation | Cost USD | Notes |
|---|---:|---:|---|
| Google Search Console | analytics + URL inspection | 0.00 | connector reads |
| Supabase | read queries | 0.00 | internal DB reads |
| DataForSEO | none | 0.00 | not used |

