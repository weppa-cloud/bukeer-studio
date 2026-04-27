# Growth Attribution Governance

Status: active gate for ColombiaTours Growth OS (#336).

This runbook defines the privacy and data-governance rules for paid and organic attribution in Bukeer public sites. It applies to WAFlow leads, Chatwoot lifecycle events, Meta Conversions API, Google Ads enhanced conversions, TikTok Events API, GA4 reporting, GitHub issue evidence, and weekly growth reports.

## Data Classification

| Data | Classification | Storage rule | Reporting rule |
| --- | --- | --- | --- |
| `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid` | Advertising identifier | Store only with lead/conversion context and tenant scope. | Aggregate in reports; do not paste raw values into GitHub. |
| UTMs, `source_url`, `page_path`, referrer | Attribution metadata | Store with lead/conversion context. | Safe to report in aggregate or as normalized route/source names. |
| Name, email, phone, WhatsApp profile data | Contact data | Store only in CRM/lead tables protected by service-role writes and RLS/account access. | Redact in logs, GitHub, screenshots and weekly reports. |
| Booking value, currency, order/reference id | Commercial data | Store only when required for conversion reporting or CRM reconciliation. | Report aggregated value; redact raw order/customer linkage unless debugging with authorized users. |
| Provider responses from Meta/Google/TikTok/Chatwoot | Provider operational data | Store sanitized status, ids and error class. Raw payloads require explicit redaction. | Never paste tokens, full payloads, request headers or user contact fields. |
| Server logs and debugging payloads | Operational data | Log trace id, provider, event name, status and redacted identifiers. | GitHub comments must include evidence summaries, not raw payloads. |

## Redaction Rules

- Replace emails with `u***@domain.tld`.
- Replace phone numbers with last two digits only, for example `***42`.
- Replace click identifiers with prefix plus length, for example `gclid:present(len=96)`.
- Replace provider tokens, signatures, cookies and authorization headers with `[redacted]`.
- For screenshots, crop or blur customer contact fields before attaching to GitHub or reports.
- For provider errors, keep provider code, message class and trace id; remove submitted user payload.

## Access Boundaries

WAFlow and Chatwoot lifecycle data must be written by server routes using service-role credentials. Public clients must never write directly to conversion event tables or read raw lead/contact rows.

Expected boundaries:

| Surface | Write access | Read access |
| --- | --- | --- |
| `waflow_leads` | Server route/service-role only for attribution/contact mutations. | Account-scoped CRM surfaces; no public read. |
| `webhook_events` | Server webhook route/service-role only. | Ops/debugging by authorized maintainers; not public. |
| `meta_conversion_events` | Server conversion service/service-role only. | Ops/debugging by authorized maintainers; aggregated reporting only. |
| Chatwoot webhook route | Signed POST only with replay protection and idempotency. | No public read endpoint. |

RLS must preserve account-level isolation when a dashboard surface later exposes summarized performance data. Until then, conversion and webhook rows are operational records, not public analytics.

## Platform Payload Rules

Meta, Google Ads and TikTok payloads must use the minimum useful fields for measurement and optimization:

- Send hashed user-provided data only when collected through a lead/contact action and allowed by the channel policy.
- Use SHA-256 normalization/hashing for user data sent to conversion APIs.
- Include event name, event id, timestamp, source URL, user agent and click id only when available and relevant.
- Include value/currency/order id only for confirmed commercial stages.
- Do not invent purchase values, ratings, availability, contacts or consent.
- If a tenant has no platform configuration, mark the event as `skipped`; do not fail the user flow.
- Browser and server events that represent the same action must share `event_id` for deduplication.

## Consent And Loading Posture

Public pages may send a lightweight GA4 pageview for site-wide organic measurement when configured, but GTM, Meta Pixel, Google Ads destinations, Clarity and custom third-party scripts stay deferred behind consent or a real intent event through `BukeerAnalytics.load()`.

ColombiaTours production gate for paid scale:

- `STRICT_ADS_ZERO=1` smoke must pass for first-load public routes.
- GA4 Organic Search volume must be treated as watch for 24-48h after analytics loader changes.
- GSC remains the primary SEO volume source while GA4 `(not set)` is being remediated.

## Issue Gate

Paid media scale for ColombiaTours remains blocked until #336 is complete or explicitly waived in #310. Related execution issues must reference this gate:

- #322 Meta + Chatwoot conversion tracking.
- #332 Google Ads enhanced conversions and offline lead stages.
- #333 TikTok Events API and event deduplication.
- #331 paid media governance and budget decisions.

