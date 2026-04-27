# Public Analytics Standard

**Status:** Active for ColombiaTours; reusable for Bukeer public sites.
**Owner:** Studio platform + Growth OS.
**Related:** [[growth-os]], [[analytics]], [[ci-seo-i18n-gate]], #321, #336, #338.

## Goal

Public sites need reliable organic measurement without putting heavy marketing tags in the first render path.

The standard is:

- Measure the site-wide GA4 `page_view` early.
- Keep GTM, Meta Pixel, Ads destinations and custom scripts behind consent or a real user-intent event.
- Preserve landing URL, query string, title and referrer on every first `page_view`.
- Keep SEO reporting honest: GSC is the primary source for organic volume until GA4 attribution has been stable for 24-48h after a tracking change.

## Tenant Analytics Contract

`websites.analytics` is the tenant-owned JSON contract.

```json
{
  "ga4_id": "G-XXXXXXXXXX",
  "gtm_id": "GTM-XXXXXXX",
  "google_ads_id": "AW-XXXXXXXXX",
  "facebook_pixel_id": "000000000000000",
  "loading": "deferred-consent-or-first-important-action"
}
```

### Required Fields

| Field | Required | First render behavior | Purpose |
|---|---:|---|---|
| `ga4_id` | Yes for growth sites | Load `gtag.js` after interactive and send one manual `page_view` | Baseline traffic, landing attribution, engagement |
| `gtm_id` | Optional | Register loader only; `gtm.js` waits for `BukeerAnalytics.load()` | Advanced/legacy container and intent events |
| `google_ads_id` | Optional | Must not be activated by the initial organic pageview | Paid conversion tags and enhanced conversions |
| `facebook_pixel_id` | Optional | Must wait for consent/intent; prefer Meta CAPI for leads | Paid social optimization |
| `custom_head_scripts` / `custom_body_scripts` | Optional | Must wait for consent/intent | Tenant-specific scripts |

## Runtime Policy

### GA4 Lightweight Pageview

`components/analytics/google-tag-manager.tsx` owns public analytics injection.

The early GA4 pageview must:

- Run when `analytics.ga4_id` exists, even if `gtm_id` also exists.
- Use `send_page_view: false`.
- Send exactly one manual `page_view`.
- Include `page_location`, `page_path`, `page_title` and `page_referrer`.
- Set `window.__bukeerGa4PageviewSent` before sending to avoid duplicates.
- Push `bukeer_ga4_pageview_sent` into `dataLayer` so GTM containers can exclude duplicate pageview triggers.

### Consent Defaults

For the lightweight pageview:

- `analytics_storage`: `granted`.
- `ad_storage`: `denied`.
- `ad_user_data`: `denied`.
- `ad_personalization`: `denied`.
- `ads_data_redaction`: `true`.
- `allow_google_signals`: `false`.
- `allow_ad_personalization_signals`: `false`.

This is a measurement-first posture. It is not a full cookie-consent platform.

### Deferred Marketing Load

`BukeerAnalytics.load()` is the only approved public entry point for heavy marketing scripts.

It can be triggered by:

- `bukeer:analytics-consent`.
- WAFlow open/submit.
- WhatsApp CTA click.
- Phone CTA click.
- Booking/payment intent.

It must not be triggered by passive page load.

## ColombiaTours Current State

Production tenant config:

```json
{
  "ga4_id": "G-6ET7YRM7NS",
  "gtm_id": "GTM-KM6HDBN",
  "google_ads_id": "AW-852643280",
  "facebook_pixel_id": "361881980826384"
}
```

Validated on 2026-04-27:

| Route | GA4 page_view | `dl`/`dp` URL+UTM | `gtm.js` before interaction | Meta before interaction | Clarity before interaction | Ads pings before interaction |
|---|---:|---:|---:|---:|---:|---:|
| `/` | PASS | PASS | 0 | 0 | 0 | 2 |
| `/paquetes` | PASS | PASS | 0 | 0 | 0 | 2 |
| `/actividades` | PASS | PASS | 0 | 0 | 0 | 2 |

Residual governance caveat:

- The early GA4 tag is connected to Google Ads destination `AW-852643280`.
- Even with Ads consent denied, production emits two consent-denied/cookieless Ads `ccm` pings before interaction.
- This is tracked under #336. The target standard is `ads_before_interaction = 0`.
- GA4 Admin API shows the property is linked to multiple Google Ads accounts; the linked accounts with Ads personalization enabled are the first configuration suspects:
  - `1261189646` (`ads_personalization_enabled: true`)
  - `9732379777` (`ads_personalization_enabled: true`)
  - `5983579164` (`ads_personalization_enabled: true`)
  - `3001104549` (`ads_personalization_enabled: true`)
  - Other linked accounts currently report Ads personalization disabled: `2511163613`, `6805130000`, `9378795199`.

## Google Ads Destination Cleanup

To reach `ads_before_interaction = 0`, clean up configuration outside the Worker:

1. In GA4 Admin for property `294486074`, review Product links -> Google Ads links.
2. Disable Ads personalization for all non-required links, or unlink accounts that should not receive ColombiaTours data.
3. In Google tag settings, review destinations connected to `G-6ET7YRM7NS` and remove/disable `AW-852643280` from the initial pageview path if possible.
4. Re-run the strict production smoke:

```bash
PROD_ANALYTICS_SMOKE=1 STRICT_ADS_ZERO=1 npm run session:run -- e2e/tests/public-analytics-production.spec.ts --project=chromium
```

Do not move paid media scale out of `WATCH` while the strict smoke fails.

## Production QA

Use the opt-in Playwright spec:

```bash
PROD_ANALYTICS_SMOKE=1 npm run session:run -- e2e/tests/public-analytics-production.spec.ts --project=chromium
```

Strict future gate after Google Ads destination cleanup:

```bash
PROD_ANALYTICS_SMOKE=1 STRICT_ADS_ZERO=1 npm run session:run -- e2e/tests/public-analytics-production.spec.ts --project=chromium
```

Expected current result:

- GA4 pageview exists on `/`, `/paquetes`, `/actividades`.
- `gtag.js` loads once per page.
- `gtm.js`, Meta and Clarity do not load before interaction.
- Ads pings are reported as known residual unless `STRICT_ADS_ZERO=1`.

## GA4/GSC Reporting Rule

After a tracking change:

1. For 24-48h, report organic volume from GSC.
2. Use GA4 only for engagement and conversion diagnostics.
3. Re-enable GA4 as a volume source only when:
   - Organic Search sessions return to a range consistent with GSC clicks.
   - `landingPagePlusQueryString = (not set)` drops materially.
   - `page_view`, `session_start` and `first_visit` are aligned by day.
