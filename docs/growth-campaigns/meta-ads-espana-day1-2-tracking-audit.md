# Meta Ads España — Día 1-2 Tracking Audit

Issue: #401  
Date: 2026-05-02  
Scope: ColombiaTours high-ticket campaign for Madrid and Barcelona

## Result

Status: WATCH, with code improvements shipped locally.

The site already had a strong foundation for WAFlow lead tracking:

- Browser `waflow_submit` maps to Meta `Lead`.
- `/api/waflow/lead` persists the lead and sends Meta CAPI `Lead`.
- WhatsApp CTA clicks persist first-party `funnel_events`.

This pass closes two Day 1 tracking gaps:

- Product/package detail views now emit `product_view`, mapped to Meta `ViewContent`.
- Generic WhatsApp CTA clicks now carry a `contact_event_id` for Pixel/CAPI dedupe and the server beacon sends Meta CAPI `Contact` when that id is present.

## Code Changes

- `lib/analytics/track.ts`
  - Added `product_view` -> Meta `ViewContent`.
  - Adds `reference_code` and `contact_event_id` to generic `whatsapp_cta_click` events when missing.

- `lib/analytics/whatsapp-beacon.ts`
  - Sends `contact_event_id`, `_fbp`, and `_fbc`/`fbclid` context to the first-party beacon.

- `app/api/growth/events/whatsapp-cta/route.ts`
  - Accepts `contact_event_id`, `fbp`, and `fbc`.
  - Sends Meta CAPI `Contact` through `sendMetaConversionEvent`.

- Product detail clients
  - Generic product landing and editorial package detail emit `product_view` on page view.

- Meta config
  - Added `META_CONVERSIONS_API_ENABLED` as the general CAPI flag.
  - Kept `META_CHATWOOT_CONVERSIONS_ENABLED` as a legacy fallback.

## Remaining Day 1-2 Checklist

- Confirm production/staging env:
  - `META_CONVERSIONS_API_ENABLED=true`
  - `META_PIXEL_ID`
  - `META_ACCESS_TOKEN`
  - `META_API_VERSION`
  - `META_TEST_EVENT_CODE` for staging QA

- Verify in Meta Events Manager:
  - `PageView`
  - `ViewContent`
  - `Contact`
  - `Lead`

- Check Event Match Quality:
  - `Lead` should be strongest because WAFlow includes phone/name context.
  - `Contact` should improve with `_fbp`, `_fbc`, IP, user agent, and external id.
  - `ViewContent` is browser-side only in this pass.

- CRM / audiences still manual or external:
  - First-party customer sync to Meta Custom Audiences.
  - Value-Based Lookalikes 1%, 2%, 3% for Spain.
  - Exclusions for recent customers/bookings.

## Validation Notes

Local TypeScript transpile syntax check passed for touched files.

Full Jest/typecheck did not complete in this worktree: Jest and `tsc --noEmit` hung before producing results. No test failure output was emitted, and leftover processes were killed.
