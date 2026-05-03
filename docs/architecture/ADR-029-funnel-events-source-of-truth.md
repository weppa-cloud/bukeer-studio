# ADR-029 — Funnel Events as Source of Truth

- Status: **Proposed — 2026-05-03**
- Date: 2026-05-03
- Deciders: Growth lead, Tech lead, Studio dev, Flutter dev
- Tracking: Epic [#419](https://github.com/weppa-cloud/bukeer-studio/issues/419) · F1 [#420](https://github.com/weppa-cloud/bukeer-studio/issues/420) · F2 [#421](https://github.com/weppa-cloud/bukeer-studio/issues/421) · F3 [#422](https://github.com/weppa-cloud/bukeer-studio/issues/422) · F4 [#423](https://github.com/weppa-cloud/bukeer-studio/issues/423) · F3-flutter [`bukeer-flutter#797`](https://github.com/weppa-cloud/bukeer-flutter/issues/797)
- Related: [[ADR-003]] (contract-first), [[ADR-005]] (security boundaries), [[ADR-018]] (webhook idempotency), [[ADR-025]] (studio/flutter field ownership), [[ADR-027]] (designer reference theme), [[SPEC_GROWTH_OS_SSOT_MODEL]], [[SPEC_META_CHATWOOT_CONVERSIONS]] (#322), #310 Growth OS, #327 Purchase event, #332 Google Ads enhanced conversions, #338 GA4 loading policy

## Context

ColombiaTours (and any future Bukeer tenant) emits funnel events from three independent surfaces:

1. **Public site** (`bukeer-studio` Next.js worker) — pageviews, CTA clicks, form submits.
2. **Conversational layer** (Chatwoot via webhook) — conversation lifecycle, label changes.
3. **CRM** (`bukeer-flutter` admin) — manual stage changes, quotes sent, bookings confirmed, payments.

Today these surfaces report to ad platforms inconsistently:

- **Studio web** writes to Meta Pixel + Meta CAPI (deduped via `event_id`) and indirectly to Google Ads via the GA4↔Ads import link. Implemented Sprint 3 (April 2026, commits `6117dd6a`…`e0188c7d`).
- **Chatwoot lifecycle** writes to Meta CAPI (messaging events). Implemented same sprint.
- **Flutter CRM** writes to nothing. Stage changes (`qualified_lead`, `quote_sent`, `booking_confirmed`) never reach Meta or Google Ads.
- **Google Ads** receives only what GA4 imports — opaque, with 24–72h delay. The `lead_calificado_form` conversion action (id `7421927172`) silently stopped registering on 2026-01-13 because the upstream WordPress GTM tag changed and nobody noticed. The drop was discovered four months later in the May 2026 Google Ads audit.

This is symptomatic. The same failure mode will recur every time GA4, GTM, or any platform’s ingestion logic changes upstream and we have no end-to-end view.

Three forcing functions push a decision now:

1. **#332 (Google Ads enhanced conversions + offline upload)** is queued P1. Implementing it without a canonical event source means the third copy of "lead happened" lives in another bespoke pipeline.
2. **#327 (Purchase / booking_confirmed event)** is a stub. The `value` (booking revenue) lives in Flutter CRM. Without a shared writer pattern, Studio cannot fire `Purchase` with a real value, blocking ROAS measurement.
3. **#322 child issues #324–#326** are merged but unclosed; the spec leaves the writer-vs-destination boundary ambiguous, which is why the team keeps re-debating "should this be in GTM?" / "should the CRM call Meta directly?".

Four candidate sources of truth were evaluated:

| Option | Why rejected |
|--------|--------------|
| **GA4 as SOT** | Browser-first; CRM events do not fit Measurement Protocol cleanly. Link to Ads is opaque, has 24–72h delay, and silently broke once already (the 2026-01-13 drop). GA4 cannot dispatch to Meta CAPI or Google Ads offline upload. |
| **GTM (server or browser) as SOT** | Browser-only by default. Server-GTM Container adds another runtime to operate. Encourages marketers to encode logic in tags (fragility, no review, no tests). Does not cover Flutter CRM. |
| **Per-platform direct integration** (status quo) | Each new channel (TikTok, LinkedIn, etc.) requires re-implementing identity, dedup, retry, RBAC. Already produced 5 coexisting `SUBMIT_LEAD_FORM` conversion actions in the Google Ads account, of which only one is the goal. Does not scale. |
| **Third-party CDP (Segment, RudderStack)** | Cost + vendor lock-in for a 2-tenant scale. Hash/PII handling adds compliance risk. Re-evaluate at 10+ tenants. |

## Decision

The **canonical source of truth for funnel events is the Supabase table `funnel_events`**, written by every surface in Bukeer (Studio worker, Chatwoot webhook handler, Flutter CRM). A single **dispatcher** (Edge Function) fans events out to ad platforms.

Mandatory rules:

1. **One event row per funnel transition.** Identified globally by `event_id` (UUIDv4). Same `event_id` is sent to every destination platform to enable platform-side deduplication (Meta CAPI deduplicates by `event_id`; Google Ads offline upload deduplicates by `gclid + conversion_action + occurred_at`).

2. **Three writers, one schema.** Studio worker writes web/chat events. Flutter CRM writes lifecycle stage changes (via Supabase RPC, not direct Meta/Ads SDKs). Postgres `AFTER INSERT/UPDATE` triggers on `bookings`, `payments`, `leads.stage` MAY auto-emit events when manual instrumentation is impractical.

3. **Zero direct platform calls outside the dispatcher.** No code path in Studio, Flutter, or Chatwoot handler calls `graph.facebook.com`, `googleads.googleapis.com`, or analogous endpoints directly. Existing direct-call code in `lib/meta/conversions-api.ts` and the `/api/waflow/lead/route.ts` handler is **migrated** behind the dispatcher (Phase 1 of rollout, see consequences).

4. **Mapping is declarative.** A configuration table `event_destination_mapping` (or a versioned YAML in `config/funnel-events/`) declares: for each `funnel_event_name`, which platforms receive it, under which platform-specific event name, with which value/currency rules. Adding a new platform = add a column. Adding a new event = add a row. Changing a mapping = git diff + review, not code.

5. **Each destination has its own log table** for idempotency and replay:
   - `meta_conversion_events` (exists)
   - `google_ads_offline_uploads` (new, ships with #332)
   - `ga4_measurement_protocol_events` (new, optional; Phase 2)
   - Future: `tiktok_events_api`, `linkedin_conversions`

6. **GA4 link to Ads stays operational** as a redundancy + reporting channel, but ceases to be the **primary** conversion source for Smart Bidding once #332 ships. Conversion actions imported from GA4 are reclassified to "secondary, observation only" in the Google Ads UI.

7. **Cross-repo writes use Supabase RPCs** (not raw INSERTs) so the schema can evolve without breaking Flutter clients. RPCs: `record_funnel_event(payload jsonb)` (idempotent on `event_id`), `record_lead_stage_change(...)`, `record_booking_confirmed(...)`.

## Implementation reality check (added 2026-05-03 post-TVB)

**The `funnel_events` table already exists** as of migration `supabase/migrations/20260504110900_funnel_events.sql`, and the three target routes (waflow, chatwoot, whatsapp-cta) **already write to it** via `lib/growth/funnel-events.ts`. `meta_conversion_events` is already the dedup ledger.

This means **F1 (#420) is schema reconciliation + dispatcher extraction**, not greenfield. Concretely:

1. The current schema diverges from the canonical schema below — F1 must reconcile (add missing columns, indexes, constraints).
2. Two distinct `event_id` schemes coexist today: a sha256-hashed PK for `funnel_events.event_id`, and a Pixel-paired id (`${referenceCode}:lead`, `contact_event_id`, etc.) used for Meta CAPI dedup. **The dispatcher MUST forward the Pixel-paired id to platforms**, not the sha256 PK, or Pixel↔CAPI dedup breaks silently. Recommendation: add a `pixel_event_id` column distinct from the PK `event_id`, and have the dispatcher use `pixel_event_id` when writing to destinations.
3. The CHECK constraint `funnel_events_event_name_chk` does NOT include the full ADR-029 event matrix (`payment_received`, `crm_booking_cancelled`, etc.). F1 must widen it.

## Delivery semantics — `pg_net` is fire-and-forget

The earlier proposal to use `AFTER INSERT → pg_net → Edge Function` does not handle failures: `pg_net` does not retry, and an Edge Function blip silently drops the event. To meet AC1.8 (≥95% volume parity), F1 must add:

- A `dispatch_status` column on `funnel_events` (`pending` | `dispatched` | `failed`)
- A `dispatch_attempted_at` timestamp
- A `pg_cron` job that periodically re-dispatches rows where `dispatch_status='pending'` after N seconds (recommended 30s threshold, run every 60s)

Both extensions (`pg_net`, `pg_cron`) are confirmed enabled on the Bukeer Supabase project.

## Schema (canonical)

`funnel_events` table — single immutable log:

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | `text` PRIMARY KEY | Internal dedup key (sha256 hash of submit context). **No surrogate `id uuid`** — `event_id` is the canonical row identifier. Decision recorded 2026-05-03 (D1 of F1 kickoff). Mirrors the keying pattern of `meta_conversion_events` (which uses `(provider, event_name, event_id)` as logical key, no surrogate). |
| `pixel_event_id` | `text` | The id sent to browser Pixel via `fbq` `eventID` AND to Meta CAPI for dedup. Browser-originated events: minted client-side (UUIDv4) and forwarded server-side. Server-originated events (chatwoot lifecycle): minted server-side. The dispatcher uses THIS field when writing to platform destinations, NOT `event_id`. |
| `event_name` | `text` NOT NULL | Enum-checked against mapping table |
| `event_time` | `timestamptz` NOT NULL | Wall-clock when event happened (not insert time) |
| `tenant_id` / `website_id` | `uuid` | Multi-tenant scope |
| `source` | `text` NOT NULL | `studio_web` \| `chatwoot` \| `flutter_crm` \| `db_trigger` |
| `user_email` | `text` | Optional |
| `user_phone` | `text` | Optional, E.164 format |
| `user_id` | `uuid` | Bukeer user.id if known |
| `external_id` | `text` | Chatwoot contact id, etc. |
| `fbp` | `text` | Meta browser cookie |
| `fbc` | `text` | Meta click cookie |
| `ctwa_clid` | `text` | Click-to-WhatsApp ad id |
| `gclid` | `text` | Google Ads click id |
| `gbraid` | `text` | iOS app campaigns |
| `wbraid` | `text` | iOS app campaigns |
| `utm_source/medium/campaign/term/content` | `text` | UTM context |
| `ip_address` | `inet` | For CAPI client_ip_address |
| `user_agent` | `text` | For CAPI client_user_agent |
| `page_url` | `text` | For browser-originated events |
| `value_amount` | `numeric` | For Purchase / quote events |
| `value_currency` | `text` | ISO-4217 |
| `raw_payload` | `jsonb` | Catch-all for future fields |
| `created_at` | `timestamptz` DEFAULT `now()` | DB insert time |
| `dispatch_status` | `text` DEFAULT `'pending'` | `pending` \| `dispatched` \| `failed` — drives `pg_cron` re-dispatch loop |
| `dispatch_attempted_at` | `timestamptz` | Last dispatch attempt timestamp (for backoff calculation) |
| `dispatch_attempt_count` | `integer` DEFAULT `0` | Increment per attempt; cap at 5 then mark `failed` permanently |

Constraints:
- `event_id` is PRIMARY KEY (no separate UNIQUE needed)
- `event_name CHECK` against the canonical event-name set (NOT the mapping table — mapping is config, names are schema-level invariant). During F1→F3 transition the CHECK accepts both ADR-029 names AND legacy aliases (`qualified_lead`, `quote_sent`, `booking_confirmed`); aliases are dropped post-F3 per follow-up issue D3.
- RLS service-role-only for mutation
- Read RLS by tenant for reporting
- Indexes: `event_id` (UNIQUE, implicit from constraint), `(event_time DESC)`, `(tenant_id)`, `(event_name, event_time)` for monitoring queries, `(dispatch_status, dispatch_attempted_at)` partial index `WHERE dispatch_status='pending'` for the re-dispatch job hot path
- Optional GIN on `raw_payload` (defer until query patterns prove need)

## Event matrix (initial)

Canonical funnel event names + platform mapping. Defined exhaustively in [[SPEC_FUNNEL_EVENTS_SOT]].

| funnel_event_name | Stage | Meta StandardEvent | Google Ads conv action | GA4 event | TikTok event |
|-------------------|-------|---------------------|------------------------|-----------|--------------|
| `pageview` | Awareness | – | – | `page_view` | – |
| `whatsapp_cta_click` | Intent | `Contact` | – | `cta_whatsapp` | `Contact` |
| `phone_cta_click` | Intent | `Contact` | – | `cta_phone` | – |
| `email_cta_click` | Intent | `Contact` | – | `cta_email` | – |
| `cal_booking_click` | Intent | `Schedule` | – | `cta_calendar` | – |
| `waflow_submit` | Lead | `Lead` | `waflow_submit` (NEW) | `generate_lead` | `SubmitForm` |
| `quote_form_submit` | Lead | `Lead` | `quote_form_submit` (NEW) | `generate_lead` | `SubmitForm` |
| `chatwoot_conversation_started` | Lead | `Contact` (messaging) | – | – | – |
| `chatwoot_message_received` | Engagement | `Subscribe` (messaging) | – | – | – |
| `chatwoot_label_qualified` | Qualify | `Lead` (messaging) | `qualified_lead` (NEW) | `qualify_lead` | – |
| `crm_lead_stage_qualified` | Qualify | `Lead` (custom) | `qualified_lead` (NEW) | `qualify_lead` | – |
| `crm_quote_sent` | Quote | `InitiateCheckout` (custom) | `quote_sent` (NEW) | `begin_checkout` | – |
| `crm_booking_confirmed` | Booking | `Purchase` | `booking_confirmed` (NEW, with value) | `purchase` | `CompletePayment` |
| `payment_received` | Realized | – | `payment_received` (NEW, with value) | `payment` | – |

Conversion actions marked **(NEW)** are created in Google Ads as part of #332 rollout. Existing actions (`Cliente potencial calificado`, `Venta`) are re-purposed or deprecated per migration plan in spec.

## Consequences

### Positive

- **One audit query** answers "what happened to lead X across all platforms": `SELECT * FROM funnel_events WHERE user_email = 'x' ORDER BY event_time`.
- **End-to-end ROAS** becomes computable: join `funnel_events` (booking_confirmed with value) ← back to (waflow_submit) ← back to (gclid) → cost from Google Ads spend.
- **Adding a new channel** (TikTok, LinkedIn) is add-only: new mapping row + new dispatcher branch. Zero change to writers.
- **Silent breakage** is detectable: a monitor on `count(funnel_events WHERE event_name='waflow_submit') / day` triggers on drop. The 2026-01-13 outage would have been caught within hours, not months.
- **GTM and GA4 fragility decouple from paid optimization.** They become reporting/redundancy layers, not the optimization brain.
- **Cross-repo discipline aligns with [[ADR-025]]**: Studio owns web events, Flutter owns CRM events, neither writes to the other’s domain. The dispatcher is the only cross-cutting consumer.

### Negative / costs

- **Migration effort.** Existing direct-call code in `lib/meta/conversions-api.ts` and `app/api/waflow/lead/route.ts` must be refactored behind the dispatcher. Estimated 2–3 day spike, low risk because event volume is bounded and replay is supported.
- **Latency budget.** Dispatcher introduces ~50–200ms additional hop vs. direct calls. Acceptable because all dispatch is async (writer returns 200 as soon as `funnel_events` insert succeeds; dispatch is fire-and-forget with retry).
- **Schema discipline.** Writers cannot improvise event names. Adding a new event requires a mapping row + an ADR-light note. This is intentional.
- **PII in DB.** Email/phone/IP live in `funnel_events`. Mitigation: existing RLS service-role policy (matches `meta_conversion_events`); add 90-day retention policy for raw PII columns; hashed copies persist in destination logs.
- **Single point of contention** for the dispatcher. Mitigation: dispatcher is stateless, horizontally scalable as a Supabase Edge Function or Cloudflare Worker; failure mode is "events queued, retry on next tick", never "lost".

### Migration path

1. **Phase 0 (this ADR + SPEC)** — Approve. No code changes.
2. **Phase 1 (1 sprint)** — Ship `funnel_events` canonical schema + mapping table + dispatcher skeleton. Migrate existing waflow + chatwoot + whatsapp-cta paths to write `funnel_events` first, then dispatcher invokes Meta CAPI (same logic, different trigger). Acceptance: zero loss of Meta CAPI events vs current implementation.
3. **Phase 2 (1 sprint)** — Implement #332 (Google Ads dispatcher branch + offline upload + gclid capture). Deprecate GA4-imported `envio_formulario` / `form_submit` conversion actions in Google Ads UI.
4. **Phase 3 (1 sprint)** — Implement #327 (booking_confirmed Purchase event with real value) + Flutter CRM writer for stage changes (`qualified_lead`, `quote_sent`).
5. **Phase 4 (ongoing)** — Add new channels (TikTok, LinkedIn) by mapping + dispatcher branch.

### Reversibility

This decision is **moderately reversible**. The `funnel_events` table itself is a passive log; if the dispatcher is removed the writers continue to work and the table accumulates data. Reverting to per-platform direct calls would require restoring the deleted CAPI direct-call code (recoverable from git). Estimated reversal cost: 1 sprint.

## Open questions resolved by [[SPEC_FUNNEL_EVENTS_SOT]]

- Exhaustive event mapping with platform-specific value/currency rules.
- Dispatcher implementation (Edge Function vs DB trigger + `pg_net`).
- Retry/backoff semantics per destination.
- Identity merging (when same human appears with different `user_email` over time).
- Tenant isolation in mapping (per-tenant overrides for Pixel ID, conversion action ids, etc.).
- Replay tooling (CLI to re-emit a date range to a specific destination).

## L10N

No user-visible strings introduced. Spec doc is English (consistent with existing ADRs and SPECs).
