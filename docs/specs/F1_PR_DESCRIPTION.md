# F1 — `funnel_events` SOT + dispatcher (PR description draft)

> Draft body for the F1 PR. Paste verbatim into `gh pr create --body` (or
> the GitHub UI) when opening the PR. Update the unchecked items as work
> progresses; tick boxes as ACs land.

## Summary

Implements **F1** of [Epic #419](https://github.com/weppa-cloud/bukeer-studio/issues/419) — the
schema reconciliation + dispatcher extraction for the canonical `funnel_events`
source of truth defined in [[ADR-029]] and [[SPEC_FUNNEL_EVENTS_SOT]].

**Scope of this PR**:

1. **Schema reconciliation** (`supabase/migrations/20260503120000_funnel_events_reconcile_adr029.sql`) —
   adds `pixel_event_id`, `dispatch_status`, `dispatch_attempted_at`,
   `dispatch_attempt_count`, `source`, the full Meta/Google Ads/UTM attribution
   column set, and `value_amount`/`value_currency`. Widens
   `funnel_events_event_name_chk` to cover the full ADR-029 14-event matrix
   (with backwards-compat aliases for the current 9 names). Adds the partial
   index that powers the `pg_cron` re-dispatch loop. Idempotent, additive,
   zero-downtime.
2. **Mapping table** (`supabase/migrations/20260503120100_event_destination_mapping.sql`) —
   creates `event_destination_mapping` and seeds it with all 14 events × N
   platforms per ADR-029. Read-public, write service-role only.
3. **Writer migration** — `app/api/waflow/lead/route.ts`,
   `app/api/webhooks/chatwoot/route.ts`,
   `app/api/growth/events/whatsapp-cta/route.ts` now populate
   `pixel_event_id` (distinct from the sha256 `event_id` PK), `source`, and
   the typed attribution columns. Existing direct calls to
   `lib/meta/conversions-api.ts` are gated by feature flag
   `funnel_events_dispatcher_v1`.
4. **Dispatcher Edge Function** (`supabase/functions/dispatch-funnel-event/index.ts`) —
   reads `event_destination_mapping`, fans events out, writes outcome to
   `meta_conversion_events`, updates `funnel_events.dispatch_status`. Invoked
   via DB trigger AFTER INSERT through `pg_net.http_post`.
5. **`pg_cron` re-dispatch loop** (in the same migration as the trigger) —
   every 60s scans `funnel_events WHERE dispatch_status='pending' AND
   dispatch_attempted_at < now() - 30s LIMIT 100` and re-invokes the
   dispatcher. Caps at `dispatch_attempt_count=5`.
6. **Feature flag** for instant rollback and **monitoring dashboard** wiring
   for AC1.9 (daily counts per `event_name` + per `source`, alert on 50% drop
   day-over-day; alert on `dispatch_status='failed'` count > 10/hour).

**Out of scope** (deferred to F2/F3/F4):
- Google Ads dispatcher branch + offline upload (F2 / #332).
- Flutter CRM writer + Purchase value (F3 / #327).
- Replay CLI, identity merge, per-tenant overrides, PII retention (F4).

## Acceptance Criteria checklist

Mapped to [[SPEC_FUNNEL_EVENTS_SOT]] §"Phase 1 — funnel_events SOT + dispatcher
skeleton (Sprint 1)".

- [ ] **AC1.1** `funnel_events` schema reconciled to canonical ADR-029 spec.
  Migration `20260503120000_funnel_events_reconcile_adr029.sql` applied
  dev/staging/prod. Diff justification: `docs/specs/SPEC_FUNNEL_EVENTS_SOT_SCHEMA_DIFF.md`.
- [ ] **AC1.2** `event_destination_mapping` table created and seeded with
  all 14 canonical events × N platforms.
- [ ] **AC1.3** Supabase RPC `record_funnel_event(payload jsonb)` exists,
  validates `event_name` against the schema-level CHECK, idempotent on
  `event_id` (returns existing row if duplicate). RLS: service-role write,
  tenant-scoped read.
- [ ] **AC1.4** `app/api/waflow/lead/route.ts` migrated. The existing
  Pixel-paired id (`${referenceCode}:lead`) populates `pixel_event_id`, NOT
  `event_id` (which stays the sha256 PK). Verified the dispatcher reads
  `pixel_event_id` when forwarding to Meta CAPI.
- [ ] **AC1.5** `app/api/webhooks/chatwoot/route.ts` migrated; `pixel_event_id`
  minted server-side (UUIDv4) since browser doesn't supply one.
- [ ] **AC1.6** `app/api/growth/events/whatsapp-cta/route.ts` migrated.
- [ ] **AC1.7** Dispatcher Edge Function `dispatch-funnel-event` deployed;
  invoked via DB trigger AFTER INSERT on `funnel_events` calling
  `pg_net.http_post`. For Meta destination, invokes existing
  `lib/meta/conversions-api.ts` logic with `pixel_event_id` as the `event_id`
  field. Writes outcome to `meta_conversion_events`. Updates
  `funnel_events.dispatch_status` to `dispatched` or `failed`.
- [ ] **AC1.7b** `pg_cron` re-dispatch job: every 60s, selects
  `funnel_events WHERE dispatch_status='pending' AND dispatch_attempted_at < now()-30s LIMIT 100`,
  re-invokes dispatcher. Caps at `dispatch_attempt_count=5` then marks
  `failed`.
- [ ] **AC1.8** Volume parity verified: count of Meta CAPI events sent in 24h
  post-cutover ≥ 95% of count in 24h pre-cutover. Feature flag
  `funnel_events_dispatcher_v1` allows quick rollback.
- [ ] **AC1.9** Monitoring dashboard shows daily event counts per `event_name`
  and per `source`. Alert on >50% drop day-over-day. Additional alert on
  `dispatch_status='failed'` count > 10/hour.
- [ ] **AC1.10** Existing direct-call code path in `lib/meta/conversions-api.ts`
  removed (or stubbed to no-op) once feature flag is permanently on. No two
  writers to Meta from any code path.

## Test plan

### Automated

- [ ] **Unit**: `lib/funnel/dispatch.ts` — mock fetch; assert payload shape,
  `pixel_event_id` (NOT `event_id`) is sent to Meta as `event_id`, dedup keys
  correct.
- [ ] **Unit**: `event_destination_mapping` query helper — given event name,
  returns expected destination list with `enabled=true` filter.
- [ ] **Integration (Vitest + Supabase test client)**: insert
  `funnel_events` row with `dispatch_status='pending'` → assert mapping
  query returns expected destinations → assert `meta_conversion_events`
  log row written exactly once (idempotency on retry).
- [ ] **Integration**: insert duplicate `event_id` → assert `ON CONFLICT DO
  NOTHING` returns deduped result; no second `meta_conversion_events` row
  created.
- [ ] **Integration**: `pg_cron` simulation — manually insert
  `dispatch_status='pending', dispatch_attempted_at=now()-1min` → run the
  re-dispatch SQL → assert dispatcher invoked, `dispatch_attempt_count`
  incremented, `dispatch_status` flipped.
- [ ] **Integration**: feature flag off — writers fall back to direct
  `sendMetaConversionEvent`; no `funnel_events` dispatcher invocation.
- [ ] **E2E (Playwright, session pool)**: visit a public ColombiaTours page
  with `gclid=TEST_F1_<timestamp>` → click WhatsApp CTA → assert
  `funnel_events` row with `event_name='whatsapp_cta_click'`,
  `pixel_event_id` non-null, `gclid` populated, `dispatch_status` flipping
  to `dispatched` within 5s.

### Manual

- [ ] **Stage volume parity check** (AC1.8): pre-cutover, capture 24h count
  of Meta CAPI sends from `meta_conversion_events`. Flip flag on. After 24h,
  re-query. Confirm ≥ 95% parity (allowing for natural day-over-day variance).
  Document result in PR comment.
- [ ] **Rollback drill**: in staging, intentionally break the dispatcher
  (e.g. set Edge Function env to invalid Meta token). Verify
  `dispatch_status='failed'` after 5 retries. Flip feature flag off. Verify
  writers resume direct CAPI. Flip flag on, fix env, run replay query, verify
  events recover.
- [ ] **Dashboard sanity**: open monitoring dashboard, confirm counts per
  `event_name` + `source` render. Trigger a synthetic 50% drop (pause
  staging traffic for 12h with cron disabled) → verify alert fires.
- [ ] **CHECK constraint validation**: attempt insert with
  `event_name='made_up_event'` → expect 23514 violation. Attempt with
  `dispatch_status='cooked'` → expect violation.
- [ ] **RLS validation**: as anon role, `SELECT * FROM funnel_events` → expect
  0 rows. As authenticated user with `auth.uid()=<account_id>`, expect own
  rows only.

### Observability

- [ ] Log attribute checklist on every dispatcher invocation: `event_id`,
  `pixel_event_id`, `event_name`, `source`, `destination`, `attempt`,
  `outcome`, `latency_ms`.
- [ ] Sentry/Logflare alert on `dispatcher.error` rate > 1% over 1h.

## Rollback procedure

The feature flag `funnel_events_dispatcher_v1` is the primary rollback
mechanism. **Do not roll the migration back** — the schema is additive and
backwards-compatible; rolling it back forfeits the diagnostic trail.

### Step 1 — Flip the flag (instant, ~10s effect)

```bash
# Either via the admin UI or directly in DB:
update public.feature_flags
   set enabled = false
 where flag = 'funnel_events_dispatcher_v1';
```

Effect: writers stop populating `pixel_event_id` from the new path and
resume direct calls to `sendMetaConversionEvent`. The DB trigger still
fires (idempotent), but with the flag off the dispatcher Edge Function
no-ops on incoming events. New `funnel_events` rows continue to be written
(useful for diagnosis); only the *fan-out* is suspended.

### Step 2 — Pause the cron re-dispatch loop (if needed)

If the cron itself is the cause of the issue (e.g. it's hammering Meta with
retries on a malformed payload):

```sql
select cron.unschedule('funnel_events_redispatch');
```

To restore later:
```sql
select cron.schedule(
  'funnel_events_redispatch',
  '* * * * *',  -- every 60s
  $$ select net.http_post(...) /* see migration */ $$
);
```

### Step 3 — Verify rollback

- `meta_conversion_events` continues to receive new rows (writer direct path).
- `dispatch_status` for new `funnel_events` rows stays `pending` (expected —
  dispatcher is no-op).
- No customer-facing impact (writers respond synchronously as they did
  pre-F1).

### Step 4 — Decision tree

| Symptom | Action |
|---------|--------|
| Volume parity fails (AC1.8 < 95%) | Flip flag off. File a follow-up issue with diff between `funnel_events` count and `meta_conversion_events` count. |
| Dispatcher latency causes timeouts in writer routes | Should not happen — dispatcher is fire-and-forget via `pg_net`. If it does, root-cause the synchronous code path; flip flag while debugging. |
| `dispatch_status='failed'` rate > 10/hour with no platform outage | Flip flag off. Inspect `meta_conversion_events.error` for failed rows. Likely a payload-shape regression — fix forward. |
| Meta CAPI rate limit hit by re-dispatch loop | Pause cron (Step 2). Reduce `LIMIT` in the cron query. Re-enable. |
| Cannot identify root cause in <30 min | Flip flag off. Open a P0 issue. |

### Step 5 — Re-enabling after fix

After a forward-fix is merged and deployed:
1. Flip flag back on in staging. Smoke-test E2E flow. Verify
   `dispatch_status='dispatched'` for new events.
2. Replay the gap (events written during rollback): query
   `funnel_events WHERE created_at BETWEEN <flag_off_at> AND <flag_on_at> AND dispatch_status='pending'`,
   manually invoke dispatcher (or wait for cron — they will be picked up
   automatically once flag is back on, since dispatcher is gated by flag
   internally).
3. Production rollout follows staged % flag rollout (10% → 50% → 100%
   over 24h).

---

Closes #420
