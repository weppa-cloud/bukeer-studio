# ADR-024 — Booking V1 Pilot Scope

- Status: Accepted (DEFER) — 2026-04-19
- Date: 2026-04-19
- Deciders: PM, tech lead, ColombiaTours partner rep, QA
- Supersedes: n/a
- Related: #166 (Booking V1), #169 (Phase B deposit hold), #170 (Phase C cancellation), #217 (this spec), [[ADR-018]] (webhook idempotency)

## Context

WordPress → Bukeer Studio pilot requires a decision on Online Booking V1 scope for ColombiaTours. Components (`BookingTrigger`, `DatePicker`, `CalBookingCTA`) exist in the repo but are not wired into `components/pages/product-landing-page.tsx`. `/api/leads` currently returns 410 Deprecated.

Client meeting 2026-04-19 confirmed cutover priorities:
1. **Translation** (blog + activities/experiences + packages) — top priority.
2. **Editing capabilities** (Rol 2 Studio editors for packages + activities) — second priority.
3. **Booking V1** — complementary, not pilot-critical. Can follow post-cutover.

## Decision

**Option B — DEFER all booking to post-pilot.**

Rationale (per client priority statement 2026-04-19):

- Client explicitly ranked translation (priority 1) and editing (priority 2) as the cutover gates. Booking was called "complementary" — nice-to-have, not pilot-critical.
- ColombiaTours conversion flow during pilot is acceptable via **WhatsApp + phone CTAs only**. Existing detail-page CTAs already cover the partner's minimum viable reservation loop.
- Deferring avoids scope creep on W3 (un-deprecate `/api/leads`, wire `BookingTrigger`, 7 E2E specs, i18n extraction, analytics union extension, sticky-bar contract change) — total ~10-12h that competes directly with higher-priority W2 editor parity expansion and W5 transcreate blog+activity expansion.
- Phase A/B artifacts already drafted in this ADR (Options A and C) remain documented for post-pilot revisit. DB layer for Phase B (`bookings` FSM, `webhook_events` idempotency ledger per [[ADR-018]]) already landed in migrations, so re-activation stays additive.
- Partner briefed in the meeting; no objection raised. Pilot cutover goes live with WhatsApp-first funnel.

### Options considered

#### Option A — GO Phase A only (NOT selected)
- Un-deprecate `/api/leads` with `source: 'booking-trigger'` discriminator
- Wire `BookingTrigger` for packages + activities (hotels return null, documented)
- WhatsApp deeplink with i18n keys (es-CO + en-US)
- Analytics union extended
- 7 E2E specs under `e2e/tests/pilot/booking/`
- Phase B (Wompi deposit) post-pilot

#### Option B — DEFER all booking to post-pilot (SELECTED)
- Detail page CTAs remain WhatsApp + phone only
- Matrix Section M marked 🚫 "deferred post-pilot"
- W7 training doc clarifies partner flow (WhatsApp-only Flow 2)
- `smoke.spec.ts` DEFER regression ensures no accidental `BookingTrigger` wire

#### Option C — GO Phase A + Phase B (NOT selected)
- Expands scope significantly; bumps W3 sizing to XL
- Phase B DB layer already migrated ([[ADR-018]]); needs `/api/bookings`, `/api/webhooks/wompi`, `lib/wompi/*`

## Consequences

- **Matrix Section M**: all rows marked 🚫 "deferred post-pilot" in `docs/product/product-detail-matrix.md`, with follow-up issue link for post-pilot revisit.
- **W7 Flow 2 (Booking)**: training deck + `docs/ops/product-landing-v1-runbook.md` documented as **WhatsApp-only** for pilot. Partner briefed 2026-04-19.
- **`/api/leads`**: stays **410 Deprecated** (`app/api/leads/route.ts:11-19`). No un-deprecate during pilot. Option A remains the documented default if the follow-up post-pilot issue chooses GO.
- **Lead funnel tracking deferred**: no Phase A `booking_trigger_click` / `booking_date_selected` / `booking_intent` analytics events during pilot. Existing WhatsApp/phone CTA conversion tracked via current (pre-pilot) analytics baseline. BI handoff for the pilot window uses WhatsApp click events only.
- **`BookingTrigger` / `DatePicker` / `CalBookingCTA` components**: remain in repo unwired. No import in `components/pages/product-landing-page.tsx`. Regression smoke asserts no `[aria-label*="Reservar"]` on detail pages (AC-W3-D5).
- **Partner briefed**: sign-off captured during meeting. Training copy (W7) and runbook explicitly state reservas fluyen por WhatsApp en pilot.
- **Phase B DB layer** (FSM, idempotency ledger) stays migrated and inert — additive re-activation post-pilot, no rollback required.
- **W3 sizing**: S (4h docs-only) — matrix row + W7 copy + smoke regression + follow-up issue. Down from M (6h decision) and L (10-12h impl).
- **Out of scope for pilot** (captured here to prevent re-scoping drift): Phase A wire, Phase B Wompi, Phase C cancellation, `/api/leads` un-deprecate, WhatsApp deeplink i18n extraction, analytics event union extension, sticky-bar `bookingHref` contract update.

## Alternatives considered

Documented in options A/B/C above. Client priority statement 2026-04-19 broke the tie toward B.

## Follow-ups

- Decision logged on #217 as [priority change v2 comment](https://github.com/weppa-cloud/bukeer-studio/issues/217#issuecomment-4276233308) + DEFER changelog comment at ADR PR merge time.
- Post-pilot scope: revisit Options A or C once pilot success metrics land. File new follow-up issue under EPIC #214 successor milestone (post-pilot M+1) — link captured on #217 DEFER changelog comment.
- `#217` body updated: GO-path AC collapsed under "Out of scope for pilot", DEFER-path AC (AC-W3-D1..D5) is the active path, size relabeled `size-M` → `size-S`.
- ADR status: Proposed → Accepted (DEFER) — this PR.
