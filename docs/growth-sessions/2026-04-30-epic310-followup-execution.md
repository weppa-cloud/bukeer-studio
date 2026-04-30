---
session_id: "2026-04-30-epic310-followup-execution"
started_at: "2026-04-30T09:30:00-05:00"
ended_at: "2026-04-30T10:05:00-05:00"
scope: "epic310-followup-execution"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
epic: 310
related_issues: [310, 311, 312, 313, 314, 315, 321, 322, 330, 332, 333]
outcome: "completed"
---

# EPIC #310 Follow-up Execution - 2026-04-30

## Objective

Execute the six follow-up points after the Council accepted #312/#313 as
`PASS-WITH-WATCH`: WhatsApp CTA, GSC/GA4 refresh, EN quality guard, Panaca
watch, Council experiments and #310 status.

## Actions

| Point                      | Result                                                                                                                                                                                                   | Evidence                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| WhatsApp CTA durable event | Fixed custom-domain tenant resolution in `/api/growth/events/whatsapp-cta`; local smoke produced a durable `funnel_events.whatsapp_cta_click` row for ColombiaTours with Meta attribution from `fbclid`. | `app/api/growth/events/whatsapp-cta/route.ts`; `__tests__/api/whatsapp-cta-route.test.ts`; reference `SMOKE-CTA-3004` |
| GSC/GA4 refresh            | PASS. Weekly intake applied with live GSC/GA4 refresh, normalizers, DataForSEO triage/diff and health report.                                                                                            | `artifacts/seo/2026-04-30-growth-weekly-intake-final-apply/growth-weekly-intake.md`                                   |
| EN Quality Batch           | Added EN quality noindex guard for the 12 non-publishable audited EN blog slugs. The publishable URL remains indexable.                                                                                  | `lib/seo/en-quality-gate.ts`; `__tests__/lib/seo/en-quality-gate.test.ts`                                             |
| Panaca watch               | Kept as watch. Earlier local checks did not reproduce persistent high TTFB; root remains public HTML cache/payload investigation, not a scoped product-page bug.                                         | `docs/growth-sessions/2026-04-30-panaca-performance-watch.md`                                                         |
| Council experiments        | Council has five active slots with source/baseline/owner/metric/date and rejects rows without baseline.                                                                                                  | `docs/growth-weekly/2026-05-04-council.md`                                                                            |
| #310 decision              | Keep #310 as `PASS-WITH-WATCH operativo`, not closed.                                                                                                                                                    | GitHub SSOT comments and updated docs                                                                                 |

## Intake Readout

Weekly intake apply:

- Window: `2026-04-02 -> 2026-04-29`.
- GSC live pulls:
  - `query_page`: 14,789 rows.
  - `page_country`: 5,186 rows.
  - `page_device`: 1,765 rows.
  - `date_page`: 12,022 rows.
  - `search_appearance_discovery`: 2 rows.
  - `page_search_appearance`: WATCH, API error.
- GA4 live pulls:
  - `landing_channel`: 5,114 rows.
  - `page_source_medium`: 1,934 rows.
  - `event_page`: 6,827 rows.
  - `campaign_source_medium`: 65 rows.
- Normalization:
  - GSC inventory rows applied: 100.
  - GA4 inventory rows applied: 100.
  - DataForSEO diff: 91 current, 577 previous, 519 resolved, 0 regressed, 51 watch.
- Cache health: PASS.

## Tracking Smoke

Local session pool smoke on `s3` / port `3003`:

```bash
curl -X POST http://localhost:3003/api/growth/events/whatsapp-cta \
  -H 'content-type: application/json' \
  --data '{"reference_code":"SMOKE-CTA-3004","source_url":"https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=SMOKECTA","page_path":"/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=SMOKECTA","location_context":"codex_smoke","occurred_at":"2026-04-30T15:10:00.000Z"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "event_id": "dc251bd97c3932a50c27c00def6739dd023c1a9385985888c455d01ccdcd17bb",
    "deduped": false
  }
}
```

Read-only Supabase verification since `2026-04-28T00:00:00Z`:

| Event                | Count |
| -------------------- | ----: |
| `whatsapp_cta_click` |     1 |
| `waflow_submit`      |     6 |
| `qualified_lead`     |     1 |
| `quote_sent`         |     1 |
| `booking_confirmed`  |     2 |

## EN Smoke

Local custom-domain smoke via `Host: colombiatours.travel`:

| URL                                    | Status | Robots            | Canonical                                                          |
| -------------------------------------- | -----: | ----------------- | ------------------------------------------------------------------ |
| `/en/blog/boleto-de-avion-a-colombia`  |    200 | `noindex, follow` | `https://colombiatours.travel/en/blog/boleto-de-avion-a-colombia`  |
| `/en/blog/asegura-tu-viaje-a-colombia` |    200 | `index, follow`   | `https://colombiatours.travel/en/blog/asegura-tu-viaje-a-colombia` |

## Verification

- `npm test -- --runTestsByPath __tests__/api/whatsapp-cta-route.test.ts __tests__/lib/seo/en-quality-gate.test.ts`: PASS.
- `npx tsc --noEmit --pretty false`: PASS.
- `node --check scripts/seo/archive-stale-growth-inventory-rows.mjs`: PASS.
- `node scripts/seo/archive-stale-growth-inventory-rows.mjs`: PASS, `0` stale candidates.

## Remaining Watch

- WhatsApp CTA is fixed locally and smoke-proven in Supabase, but production
  needs deploy verification after merge.
- `page_search_appearance` remains WATCH because GSC rejected the combined
  page/searchAppearance query; standalone discovery works.
- Panaca remains a cache/payload watch.
- EN quality still requires content restoration/retranslation before broad
  sitemap/hreflang promotion.

## GitHub SSOT Comments

| Issue |      Comment |
| ----- | -----------: |
| #310  | `4353491408` |
| #311  | `4353491577` |
| #312  | `4353494857` |
| #313  | `4353494663` |
| #314  | `4353492267` |
| #315  | `4353492502` |
| #321  | `4353491766` |
| #322  | `4353492051` |
| #330  | `4353494429` |
| #332  | `4353496392` |
| #333  | `4353496587` |
