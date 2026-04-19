# ADR-024 — Booking V1 Pilot Scope

- Status: Proposed (pending decision meeting per #217 Phase 1)
- Date: 2026-04-19
- Deciders: PM, tech lead, ColombiaTours partner rep, QA
- Supersedes: n/a
- Related: #166 (Booking V1), #169 (Phase B deposit hold), #170 (Phase C cancellation), #217 (this spec), [[ADR-018]] (webhook idempotency)

## Context

WordPress → Bukeer Studio pilot requires a decision on Online Booking V1 scope for ColombiaTours. Components (`BookingTrigger`, `DatePicker`, `CalBookingCTA`) exist in the repo but are not wired into `components/pages/product-landing-page.tsx`. `/api/leads` currently returns 410 Deprecated.

## Decision

**TBD — populated at W3 decision meeting.** Candidate options:

### Option A (recommended default): GO Phase A only
- Un-deprecate `/api/leads` with `source: 'booking-trigger'` discriminator
- Wire `BookingTrigger` for packages + activities (hotels return null, documented)
- WhatsApp deeplink with i18n keys (es-CO + en-US)
- Analytics union extended
- 7 E2E specs under `e2e/tests/pilot/booking/`
- Phase B (Wompi deposit) post-pilot

### Option B: DEFER all booking to post-pilot
- Detail page CTAs remain WhatsApp + phone only
- Matrix section M marked 🚫 "deferred post-pilot"
- W7 training doc clarifies partner flow

### Option C: GO Phase A + Phase B (deposit hold)
- Expands scope significantly; bumps W3 sizing to XL
- Phase B DB layer already migrated ([[ADR-018]]); needs `/api/bookings`, `/api/webhooks/wompi`, `lib/wompi/*`

## Consequences

TBD. Section stays skeletal until meeting populates decision.

## Alternatives considered

Documented in options A/B/C above.

## Follow-ups

- Final decision logged as first comment on #217.
- ADR status transitions Proposed → Accepted (or Rejected) after meeting.
- If GO: additional ADR-024-impl comment at PR time with migration list.
