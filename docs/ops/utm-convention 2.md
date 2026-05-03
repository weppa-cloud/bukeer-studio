---
tenant: colombiatours-travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 331
last_updated: 2026-04-27
status: active
---

# UTM Convention & Campaign Naming — Bukeer Growth OS

> Authoritative naming rules for all paid + email + social outbound traffic to Bukeer public sites. Pairs with [`growth-attribution-governance.md`](./growth-attribution-governance.md) (redaction + storage rules) and [`active OKRs`](../growth-okrs/active.md). Mandatory for any URL submitted to Google Ads, Meta, TikTok, Mailchimp, Chatwoot broadcasts, partner placements.

## TL;DR

- All UTM values are **lowercase, snake_case-or-hyphen-only, ASCII**. No spaces, accents, caps, emojis, PII.
- `utm_campaign` always starts with `[market]_` — `co`, `mx`, `us`, `int`. Never aggregate markets.
- Campaign names follow `[market]_[channel]_[intent]_[asset]_[YYYYMM]`.
- Validation regex: `^[a-z0-9]+(?:[_-][a-z0-9]+)*$` per UTM value.
- Every URL going to a paid platform passes through the validator before launch (manual checklist below until automated linter ships).

---

## 1. Taxonomy

### `utm_source`

The platform / site that delivered the click.

| Value | When to use |
|---|---|
| `google` | Google Ads (search, display, demand-gen, performance-max). |
| `meta` | Facebook + Instagram Ads. (Never `facebook` or `instagram` separately for ads — IG/FB are channels inside Meta.) |
| `tiktok` | TikTok Ads. |
| `youtube` | YouTube ad campaigns (still `meta`-style billing? no — keep distinct). |
| `bing` | Microsoft Ads. |
| `whatsapp` | Outbound WA broadcast or click-to-WA campaigns originating from Bukeer (not inbound replies). |
| `email` | Mailchimp / Chatwoot broadcast / lifecycle email. |
| `partner_<slug>` | Specific partner site (e.g., `partner_anato`, `partner_iata`). Slug must be registered in the directory below. |
| `chatwoot` | Outbound Chatwoot campaigns. |
| `direct_qr` | Offline → online (QR codes at events, print media). |

> Any new `utm_source` requires PR to this file.

### `utm_medium`

The channel category, distinct from source so we can roll up.

| Value | When to use |
|---|---|
| `cpc` | Paid search clicks (Google, Bing). |
| `paid_social` | Paid social (Meta, TikTok). |
| `display` | Display / GDN / Performance Max display surfaces. |
| `video` | YouTube + in-stream video. |
| `email` | Lifecycle / transactional / broadcast email. |
| `affiliate` | Revenue-share partner links. |
| `referral_paid` | Paid placements that aren't ads (sponsored articles). |
| `organic_social` | Unpaid social posts (rare — usually leave UTM-less, but allowed for tracked posts). |
| `qr` | QR-coded offline assets. |
| `sms` | SMS broadcast. |

### `utm_campaign`

**Must follow:** `[market]_[channel]_[intent]_[asset]_[YYYYMM]`

| Slot | Allowed values | Notes |
|---|---|---|
| `market` | `co`, `mx`, `us`, `int` | `int` = international/multi-market only when truly necessary. Default to per-market. |
| `channel` | `gads`, `meta`, `ttok`, `bing`, `email`, `wa`, `partner` | Mirrors source family. |
| `intent` | `brand`, `nonbrand`, `retgt`, `prospect`, `lifecycle`, `seasonal`, `launch` | Drives audience strategy. |
| `asset` | `packages`, `destinos`, `cartagena`, `amazonas`, `eje-cafetero`, `pacifico`, `caribe`, `general`, `wedding`, `family`, `luxury`, etc. | Must match a registered asset in the directory below. |
| `YYYYMM` | e.g. `202604` | Launch month, not duration. |

**Examples:**

- `co_gads_nonbrand_cartagena_202605`
- `mx_meta_prospect_packages_202604`
- `us_gads_nonbrand_eje-cafetero_202606`
- `co_email_lifecycle_general_202604`
- `int_partner_brand_general_202605`

### `utm_content`

Variant identifier within the campaign — ad creative, copy variant, audience.

Format: `[creative_type]-[variant_id]` or `[audience]-[variant_id]`.

Examples: `video15s-a`, `carousel-b`, `lookalike-co-1pct`, `retgt-7d-cart`, `headline-v3`.

### `utm_term`

Used **only** for paid search keywords and specific email links. Lowercased, hyphen-separated.

- Paid search dynamic insertion: `{keyword}` (Google) → resolves at click-time.
- Manual: `tour-cartagena-3-dias`, `paquete-amazonas-familia`.
- Forbidden in non-search mediums (leave empty).

---

## 2. Per-platform rules

### Google Ads

- Auto-tagging (`gclid`) **stays ON** for parallel signal.
- Manual tagging mandatory **per ad** (not per campaign) so creative-level UTMs are populated.
- Use ValueTrack `{keyword}`, `{network}`, `{matchtype}` only inside `utm_term` — never in `utm_campaign`.
- Final URL suffix recommended pattern:
  ```
  utm_source=google&utm_medium=cpc&utm_campaign=co_gads_nonbrand_cartagena_202605&utm_content={creative}&utm_term={keyword}
  ```
- Campaign **internal name in Google Ads UI** must equal `utm_campaign` exactly. No drift between platform name and tag.

### Meta Ads (Facebook + Instagram)

- URL Parameters field per ad set:
  ```
  utm_source=meta&utm_medium=paid_social&utm_campaign=mx_meta_prospect_packages_202604&utm_content={{ad.name|lower}}
  ```
- Avoid Meta dynamic params that include caps — apply `|lower` filter or hardcode.
- `fbclid` arrives automatically; do not strip.

### TikTok Ads

- TikTok appends `ttclid` automatically.
- Manual UTMs in URL suffix:
  ```
  utm_source=tiktok&utm_medium=paid_social&utm_campaign=co_ttok_prospect_destinos_202605&utm_content=video15s-a
  ```
- Do not use TikTok dynamic macros that capitalize.

### Email (Mailchimp / Chatwoot broadcast)

- Always include `utm_source=email&utm_medium=email`.
- `utm_content` = template id + variant. e.g., `welcome-v2-a`.

---

## 3. Forbidden patterns

These cause auto-reject in the validator (and silently break attribution downstream).

- ❌ Spaces (`?utm_campaign=co gads…`).
- ❌ Uppercase (`utm_source=Google`).
- ❌ Accents / diacritics (`cartagéna`, `méxico`).
- ❌ Emoji or non-ASCII.
- ❌ PII in any UTM value (no email, name, phone, contact id).
- ❌ Trailing/leading separators (`_co_gads_…`, `co_gads_…_`).
- ❌ Double separators (`co__gads`, `co--gads`).
- ❌ Date as `YYYY-MM-DD` (use `YYYYMM`).
- ❌ Brand/sub-brand in `utm_source` (use `meta`, not `bukeer_meta`).
- ❌ Aggregating markets (`latam_gads_…`) — use `co`, `mx`, `us`, `int` separately.

---

## 4. Validation regex

### Per-value (every UTM key)

```regex
^[a-z0-9]+(?:[_-][a-z0-9]+)*$
```

### `utm_campaign` full-string (slot enforcement)

```regex
^(co|mx|us|int)_(gads|meta|ttok|bing|email|wa|partner)_(brand|nonbrand|retgt|prospect|lifecycle|seasonal|launch)_[a-z0-9-]+_(20[0-9]{4})$
```

### Reference snippet (Node, for future linter / CI gate)

```ts
const VALUE_RE = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const CAMPAIGN_RE =
  /^(co|mx|us|int)_(gads|meta|ttok|bing|email|wa|partner)_(brand|nonbrand|retgt|prospect|lifecycle|seasonal|launch)_[a-z0-9-]+_(20[0-9]{4})$/;

export function validateUtm(utm: Record<string, string>) {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(utm)) {
    if (!VALUE_RE.test(v)) errors.push(`${k}=${v} fails value regex`);
  }
  if (utm.utm_campaign && !CAMPAIGN_RE.test(utm.utm_campaign)) {
    errors.push(`utm_campaign=${utm.utm_campaign} fails campaign-slot regex`);
  }
  return errors;
}
```

> Owner (A1 future ticket): wire this into a CI step or a runtime guard inside `lib/growth/attribution-parser.ts` so malformed UTMs are flagged at ingestion (not silently stored).

---

## 5. Mapping to `GrowthAttribution` schema

Pending A1 publication of `packages/website-contract/src/schemas/growth-attribution.ts` (16 keys per SPEC #337). Expected mapping once shipped:

| URL param / cookie | `GrowthAttribution` field | Notes |
|---|---|---|
| `utm_source` | `source` | Lowercased on parse. |
| `utm_medium` | `medium` | Lowercased. |
| `utm_campaign` | `campaign` | Validated against campaign regex. Parsed slots into `campaign_market`, `campaign_channel`, `campaign_intent`, `campaign_asset`, `campaign_yyyymm` (derived). |
| `utm_content` | `content` |  |
| `utm_term` | `term` | Empty for non-search. |
| `gclid` | `gclid` | Stored as `gclid:present(len=N)` in logs per governance. |
| `gbraid` | `gbraid` |  |
| `wbraid` | `wbraid` |  |
| `fbclid` | `fbclid` |  |
| `ttclid` | `ttclid` |  |
| referrer | `referrer` | Origin only when host is third-party. |
| Document.URL | `landing_url` | Path + query, host normalized. |
| `_ga` cookie | `ga_client_id` | Hashed before storage. |
| WAFlow lead id | `lead_reference_code` | Joined post-submit. |
| Page locale (Next.js) | `locale` | `es-CO`, `en-US`, `es-MX`. |
| Tenant inference | `account_id` + `website_id` | From host → tenant resolver. |

> See [`growth-attribution-governance.md`](./growth-attribution-governance.md) for redaction in logs/reports/screenshots.

---

## 6. Asset directory (registered values for `utm_campaign[asset]` slot)

| Asset slug | Description |
|---|---|
| `general` | Catch-all when no specific asset (avoid when possible). |
| `packages` | Generic packages landing. |
| `destinos` | Generic destinos landing. |
| `cartagena` | Cartagena destination. |
| `amazonas` | Amazonas destination. |
| `eje-cafetero` | Coffee triangle. |
| `pacifico` | Pacific coast. |
| `caribe` | Caribbean (multi-destination). |
| `wedding` | Weddings vertical. |
| `family` | Family travel vertical. |
| `luxury` | Luxury / boutique vertical. |

> Adding an asset requires PR to this file + matching landing page or campaign URL alive.

---

## 7. Partner directory (registered values for `utm_source=partner_<slug>`)

| Slug | Partner |
|---|---|
| `anato` | ANATO |
| `iata` | IATA placement |
| `procolombia` | ProColombia |

> Adding a partner requires PR + signed agreement reference.

---

## 8. Operational checklist (until linter ships)

Before any campaign launch:

- [ ] All UTM values pass per-value regex.
- [ ] `utm_campaign` passes slot regex.
- [ ] `[market]` matches the audience's market — never aggregated.
- [ ] Asset slug exists in directory above.
- [ ] No PII in any UTM (email/phone/name).
- [ ] Final URL tested in staging with full param string preserved through redirects.
- [ ] Campaign internal name in platform UI matches `utm_campaign` byte-for-byte.
- [ ] Budget approved per cadence rule (<USD 500/wk inline, ≥ Founder approval).
- [ ] A3 dedupe smoke PASS within last 7 days for that channel (Meta/Google/TikTok).
- [ ] Logged in council doc with experiment ID.
