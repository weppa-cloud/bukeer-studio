# Core Web Vitals — Paid Landings (ColombiaTours)

Operational runbook to monitor Core Web Vitals and paid landing integrity by URL.

## Scope

- Tenant: `colombiatours`
- Priority pages: paid campaign landings (MX/ES/CL/PT)
- KPI guardrails:
  - `LCP <= 2.5s`
  - `INP <= 200ms`
  - `CLS <= 0.1`

## Daily checks

1. Validate landing HTTP behavior:
   - Run `node scripts/growth/check-paid-landings-http.mjs`
   - Expected: all campaign URLs return direct `200` (no intermediate `301/302/308`).
2. Review CWV by URL (not global average):
   - Focus on mobile p75 per landing.
3. Review funnel event health:
   - `whatsapp_cta_click`
   - `waflow_open`
   - `waflow_submit`
4. Review Clarity session quality for top paid landings:
   - dead clicks, rage clicks, and fast bounces.

## Alerts (recommended)

- Trigger alert if any of:
  - `LCP > 2.5s` for 2 consecutive periods.
  - `INP > 200ms` for 2 consecutive periods.
  - `CLS > 0.1` for 2 consecutive periods.
  - funnel event volume drops `>20%` day-over-day on a paid landing.

## Incident response

1. If URL stops returning direct `200`:
   - Check `website_redirect_policies` first.
   - Confirm bypass rows are still active for paid paths.
2. If LCP regresses:
   - Audit hero media weight and preload behavior.
3. If INP regresses:
   - Audit third-party script load timing and long tasks.
4. If funnel events drop:
   - Validate beacon endpoint health and presence of `gclid/utm/reference_code`.

