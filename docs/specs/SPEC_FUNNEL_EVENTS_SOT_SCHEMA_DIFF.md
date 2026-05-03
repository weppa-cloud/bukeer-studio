# SPEC FUNNEL_EVENTS_SOT — Schema Diff (F1 #420 precursor)

- **Status**: Draft (kickoff artifact for F1 assignee) — 2026-05-03
- **Source of truth (target)**: [[ADR-029]] §"Schema (canonical)" + §"Implementation reality check" + §"Delivery semantics"
- **Source of truth (current)**: `supabase/migrations/20260504110900_funnel_events.sql` + `20260504111000_funnel_events_backfill.sql`
- **Companion migration**: `supabase/migrations/20260503120000_funnel_events_reconcile_adr029.sql` (this diff justifies that migration)

## 1. Columns: current vs canonical

Legend: **ADD** = column missing today, must be added. **KEEP** = column already exists and matches. **RENAME** = same intent, different name; needs alias or rewrite. **DROP** = exists today, not in canonical (decision needed). **CHANGE_TYPE** = exists, type/default differs.

| # | Current column | Current type | Canonical column | Canonical type | Action | Notes |
|---|----------------|--------------|------------------|----------------|--------|-------|
| 1 | `event_id` | `text` PRIMARY KEY (sha256 64-hex) | `event_id` | `text` UNIQUE NOT NULL | KEEP | Today PK, canonical also says PK *or* UNIQUE — keep PK. Format CHECK `^[0-9a-f]{64}$` is intentional (sha256 of `reference_code:event_name:occurred_at_s`). Do NOT relax. |
| 2 | – | – | `id` | `uuid` PK `gen_random_uuid()` | **OPEN QUESTION** | ADR-029 §Schema lists `id uuid PK` AND `event_id text UNIQUE`. Current table uses `event_id text` AS the PK with no surrogate. See §"Open questions" Q1 — proposal: keep `event_id` as the only PK, drop the `id uuid` requirement (it's redundant and would force a forward-only migration that adds a UNIQUE on `event_id` plus a backfilled UUID). |
| 3 | `event_name` | `text` NOT NULL CHECK enum | `event_name` | `text` NOT NULL | KEEP + WIDEN CHECK | Enum needs to expand — see §3 below. |
| 4 | `stage` | `text` NOT NULL CHECK enum | – | – | KEEP | Not in canonical schema, but useful denormalization. Keep + extend enum (see §3). |
| 5 | `channel` | `text` NOT NULL DEFAULT `'unknown'` CHECK enum | – | – | KEEP | Not explicitly in canonical, but already populated by 3 writers. Keep. |
| 6 | `reference_code` | `text` NOT NULL CHECK length 8..64 | – | – | KEEP | Not in canonical, but it's the WAFlow correlation id — load-bearing for backfill + dedup. Keep as NOT NULL. |
| 7 | `account_id` | `uuid` NOT NULL | `tenant_id` | `uuid` | KEEP (alias semantically) | Canonical says `tenant_id`. In Bukeer, `account_id` IS the tenant id. Keep current name; document equivalence in column COMMENT. |
| 8 | `website_id` | `uuid` NOT NULL | `website_id` | `uuid` | KEEP | Match. |
| 9 | `locale` | `text` NOT NULL CHECK | – | – | KEEP | Not in canonical, but already used. Keep. |
| 10 | `market` | `text` NOT NULL CHECK | – | – | KEEP | Same. |
| 11 | `occurred_at` | `timestamptz` NOT NULL | `event_time` | `timestamptz` NOT NULL | KEEP (alias) | Same semantic. Keep `occurred_at` (writers already use it); document mapping. F2 dispatcher MUST read this column when building `event_time` for Meta CAPI. |
| 12 | `attribution` | `jsonb` NULL | – | – | KEEP | Holds UTM/click ids today. Once dedicated columns are added (gclid etc.), keep `attribution` for backwards-compat + raw catch. |
| 13 | `payload` | `jsonb` NOT NULL DEFAULT `{}` | `raw_payload` | `jsonb` | KEEP (alias) | Same semantic, different name. Keep `payload`. |
| 14 | `provider_status` | `jsonb` NOT NULL DEFAULT `[]` | – | – | KEEP | Today: array of FunnelEventProviderRecord. Will be partially superseded by destination log tables, but keep for backwards-compat. Stop writing new entries once dispatcher owns destination logs. |
| 15 | `source_url` | `text` NULL | – | – | KEEP | Match for `page_url` semantics in canonical. |
| 16 | `page_path` | `text` NULL | – | – | KEEP | Useful complement to `source_url`. |
| 17 | `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | `created_at` | `timestamptz` DEFAULT `now()` | KEEP | Match. |
| 18 | – | – | `pixel_event_id` | `text` | **ADD** | Per ADR-029 §"Implementation reality check" point 2. Distinct from PK `event_id` (sha256). The dispatcher uses THIS field when forwarding to Meta destinations. NULL = mint server-side at dispatch time (UUIDv4); non-NULL = use as-is (browser-supplied or reference-paired). |
| 19 | – | – | `dispatch_status` | `text` DEFAULT `'pending'` CHECK | **ADD** | Drives `pg_cron` re-dispatch loop (AC1.7b). Allowed: `pending`/`dispatched`/`failed`. |
| 20 | – | – | `dispatch_attempted_at` | `timestamptz` NULL | **ADD** | Last dispatch attempt timestamp. Used by re-dispatch query `WHERE dispatch_status='pending' AND dispatch_attempted_at < now() - 30s`. |
| 21 | – | – | `dispatch_attempt_count` | `integer` DEFAULT `0` | **ADD** | Cap at 5 then mark `failed` permanently. |
| 22 | – | – | `source` | `text` NOT NULL | **ADD** | `studio_web`/`chatwoot`/`flutter_crm`/`db_trigger`. Today inferable from `channel` but ADR-029 wants it explicit. Default `'studio_web'` then backfill per-row from existing `channel`. |
| 23 | – | – | `user_email` | `text` | **ADD** | Optional. PII — covered by RLS service-role-only. |
| 24 | – | – | `user_phone` | `text` | **ADD** | Optional, E.164. |
| 25 | – | – | `user_id` | `uuid` | **ADD** | Bukeer auth user id if known. |
| 26 | – | – | `external_id` | `text` | **ADD** | Chatwoot contact id, etc. |
| 27 | – | – | `fbp` | `text` | **ADD** | Today lives inside `attribution` jsonb. Promote to typed column for query performance + Meta CAPI mapping. |
| 28 | – | – | `fbc` | `text` | **ADD** | Same. |
| 29 | – | – | `ctwa_clid` | `text` | **ADD** | Click-to-WhatsApp ad id. |
| 30 | – | – | `gclid` | `text` | **ADD** | Google Ads click id (Phase 2 dependency). |
| 31 | – | – | `gbraid` | `text` | **ADD** | iOS app campaigns. |
| 32 | – | – | `wbraid` | `text` | **ADD** | iOS app campaigns. |
| 33 | – | – | `utm_source` | `text` | **ADD** | Promote from `attribution` jsonb. |
| 34 | – | – | `utm_medium` | `text` | **ADD** | Same. |
| 35 | – | – | `utm_campaign` | `text` | **ADD** | Same. |
| 36 | – | – | `utm_term` | `text` | **ADD** | Same. |
| 37 | – | – | `utm_content` | `text` | **ADD** | Same. |
| 38 | – | – | `ip_address` | `inet` | **ADD** | For CAPI `client_ip_address`. PII — service-role read only. |
| 39 | – | – | `user_agent` | `text` | **ADD** | For CAPI `client_user_agent`. |
| 40 | – | – | `value_amount` | `numeric` | **ADD** | For Purchase / quote events (Phase 3 dependency, but column ships in F1). |
| 41 | – | – | `value_currency` | `text` | **ADD** | ISO-4217. Recommend CHECK `^[A-Z]{3}$`. |

**No DROP actions**: every existing column has a forward-compatible role. The migration is purely additive.

## 2. Indexes: current vs canonical

| # | Current index | Canonical recommendation | Action |
|---|---------------|--------------------------|--------|
| 1 | `funnel_events_pkey` (PK on `event_id`) | UNIQUE on `event_id` | KEEP (PK satisfies UNIQUE) |
| 2 | `funnel_events_tenant_time_idx (account_id, website_id, occurred_at desc)` | `(tenant_id)` | KEEP (existing is strictly stronger) |
| 3 | `funnel_events_reference_event_idx (reference_code, event_name)` | – | KEEP (used by dispatcher to look up "did we already emit X for this ref") |
| 4 | `funnel_events_stage_time_idx (stage, occurred_at desc)` | – | KEEP (monitoring) |
| 5 | `funnel_events_channel_time_idx (channel, occurred_at desc)` | – | KEEP |
| 6 | `funnel_events_attribution_gin_idx (attribution USING gin)` | "Optional GIN on raw_payload (defer)" | KEEP (already paid the cost) |
| 7 | – | `(event_time DESC)` | **ADD** as `funnel_events_event_time_desc_idx (occurred_at desc)` (note: canonical name is `event_time`, our column is `occurred_at`). Used by reporting queries that scan most recent across all tenants. |
| 8 | – | `(event_name, event_time)` | **ADD** as `funnel_events_event_name_time_idx (event_name, occurred_at desc)`. Drives daily-count monitoring per AC1.9. |
| 9 | – | `(dispatch_status, dispatch_attempted_at) WHERE dispatch_status='pending'` partial | **ADD** as `funnel_events_dispatch_pending_partial_idx`. Hot path for `pg_cron` re-dispatch loop (AC1.7b). |
| 10 | – | `(pixel_event_id)` UNIQUE WHERE NOT NULL (optional) | **ADD** as `funnel_events_pixel_event_id_idx (pixel_event_id) WHERE pixel_event_id IS NOT NULL` — non-unique. UNIQUE is risky because Chatwoot lifecycle path mints multiple `pixel_event_id`s for the same conversation. |

## 3. CHECK constraints: current vs canonical

### `event_name` enum

**Current accepted values** (from migration line 47-57):
```
waflow_open
waflow_step_next
waflow_submit
whatsapp_cta_click
qualified_lead
quote_sent
booking_confirmed
review_submitted
referral_lead
```
9 values.

**Canonical (ADR-029 §"Event matrix")** — 14 values:
```
pageview
whatsapp_cta_click
phone_cta_click
email_cta_click
cal_booking_click
waflow_submit
quote_form_submit
chatwoot_conversation_started
chatwoot_message_received
chatwoot_label_qualified
crm_lead_stage_qualified
crm_quote_sent
crm_booking_confirmed
payment_received
```

**Reconciled enum** (union, preserving current values for backwards-compat):
```
-- Web (browser/server) — KEEP existing + ADD canonical web events
pageview                          -- ADD
waflow_open                       -- KEEP (current, not in canonical matrix; document as internal-only)
waflow_step_next                  -- KEEP (same)
waflow_submit                     -- KEEP (in canonical)
quote_form_submit                 -- ADD
whatsapp_cta_click                -- KEEP (in canonical)
phone_cta_click                   -- ADD
email_cta_click                   -- ADD
cal_booking_click                 -- ADD

-- Chatwoot lifecycle
chatwoot_conversation_started     -- ADD
chatwoot_message_received         -- ADD
chatwoot_label_qualified          -- ADD

-- CRM (Flutter) lifecycle
crm_lead_stage_qualified          -- ADD
crm_quote_sent                    -- ADD
crm_booking_confirmed             -- ADD

-- Aliases for backwards-compat with current writers
qualified_lead                    -- KEEP (current writer name; alias of chatwoot_label_qualified)
quote_sent                        -- KEEP (current writer name; alias of crm_quote_sent)
booking_confirmed                 -- KEEP (current writer name; alias of crm_booking_confirmed)

-- Realized
payment_received                  -- ADD

-- Funnel terminals (current, kept)
review_submitted                  -- KEEP
referral_lead                     -- KEEP
```
Total: 20 values during transition. After F3 ships and writers migrate to the prefixed names, drop the unprefixed aliases (`qualified_lead`, `quote_sent`, `booking_confirmed`) — tracked as F3 follow-up.

> **Rationale for keeping aliases**: the 3 routes today emit `qualified_lead`/`quote_sent`/`booking_confirmed` (per `LIFECYCLE_TO_FUNNEL_EVENT` mapping in `app/api/webhooks/chatwoot/route.ts`). Renaming them in the same migration breaks the writer. Add the new names; deprecate the aliases in a F3 follow-up after writer migration.

### `stage` enum

Current: `acquisition`, `activation`, `qualified_lead`, `quote_sent`, `booking`, `review_referral`. 6 values.

Canonical (ADR-029 §"Event matrix" implies): `awareness`, `intent`, `lead`, `engagement`, `qualify`, `quote`, `booking`, `realized`. 8 values.

**Action**: ADD `awareness`, `intent`, `lead`, `engagement`, `qualify`, `realized` to current enum. Keep current values for backwards-compat. Map in writer code (or via a derived view) when reporting on the canonical funnel. Total: 12 values during transition.

### Other CHECKs (unchanged)

- `funnel_events_event_id_format_chk` (sha256 hex) — KEEP. Format is intentional and protects against a writer drifting to UUIDs in the PK column (which would land in `pixel_event_id` instead).
- `funnel_events_channel_chk` — KEEP. ADR-029 doesn't constrain channel.
- `funnel_events_locale_chk` — KEEP.
- `funnel_events_market_chk` — KEEP.
- `funnel_events_reference_code_len_chk` — KEEP.
- **NEW** `funnel_events_dispatch_status_chk` — ADD: `dispatch_status IN ('pending','dispatched','failed')`.
- **NEW** `funnel_events_dispatch_attempt_count_chk` — ADD: `dispatch_attempt_count >= 0 AND dispatch_attempt_count <= 5`.
- **NEW** `funnel_events_value_currency_chk` — ADD: `value_currency IS NULL OR value_currency ~ '^[A-Z]{3}$'`.
- **NEW** `funnel_events_value_amount_chk` — ADD: `value_amount IS NULL OR value_amount >= 0`.

## 4. RLS policies: current vs canonical

### Current (`funnel_events`)
1. `funnel_events_service_all` — `FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')`.
2. `funnel_events_account_read` — `FOR SELECT TO authenticated USING (account_id = auth.uid())`.

### Canonical (mirroring `meta_conversion_events`)
1. `meta_conversion_events_service_all` — `FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')`.
   - Equivalent to current `funnel_events_service_all`. **No change**.

ADR-029 §"Schema (canonical)" says: "RLS service-role-only for mutation. Read RLS by tenant for reporting." Current table already satisfies both. **No policy changes required in F1**.

**Optional hardening (defer to F4)**: split `funnel_events_account_read` from a single-policy ALL into explicit `FOR SELECT` only (currently only SELECT — already correct). No diff.

## 5. Migration ordering recommendation (zero-downtime)

Goal: writers keep working through cutover. Reconciliation must NOT drop or rename any existing column or constraint that current writers depend on.

| Step | Action | Risk | Rollback |
|------|--------|------|----------|
| 1 | Apply `20260503120000_funnel_events_reconcile_adr029.sql` (additive: new columns nullable or with defaults; widened CHECK enum). | Low — additive, idempotent. | Drop new columns / restore old CHECK enum. |
| 2 | Apply `20260503120100_event_destination_mapping.sql` (new table + seed). | Low — new table. | `DROP TABLE event_destination_mapping`. |
| 3 | Deploy current writer code unchanged. Verify: existing inserts still succeed, new columns default to NULL/0/'pending'. | Low. | – |
| 4 | Ship F1 dispatcher PR (separate, blocked by this kickoff): writer changes to populate `pixel_event_id`, `source`, attribution columns. Behind feature flag `funnel_events_dispatcher_v1`. | Medium — touches 3 routes. | Flip flag off; writers fall back to existing path. |
| 5 | Ship `pg_cron` re-dispatch job + dispatcher Edge Function. | Medium — new runtime. | Drop cron job; revert Edge Function deploy. |
| 6 | Verify AC1.8 (volume parity ≥ 95%). | – | If parity fails: flip feature flag off; events keep landing in `funnel_events`, only dispatch reverts. |
| 7 | After 7 days clean: drop alias enum values (`qualified_lead` → `chatwoot_label_qualified` etc.) in a follow-up F3 migration. | Low. | Re-add to enum. |

**Critical invariant during cutover**: `event_id` (sha256 PK) MUST NOT change for already-written rows. The dispatcher's Pixel↔CAPI dedup uses `pixel_event_id`, NOT `event_id`. Any code that reads from `funnel_events` and forwards to Meta must read `pixel_event_id` first, then fall back to `event_id` only when `pixel_event_id IS NULL` (which will be true for backfilled historical rows — those will likely never be re-dispatched anyway).

## 6. Open questions for F1 assignee

### Q1 — Surrogate `id uuid` PK or keep `event_id text` PK?

ADR-029 §Schema lists `id uuid PK gen_random_uuid()` AND `event_id text UNIQUE`. Current table uses `event_id text` as the sole PK.

**Proposal**: keep `event_id` as the sole PK. The surrogate `id uuid` adds nothing useful (no FK from another table points to it), and adding it would require either:
- A backfill UPDATE setting `id = gen_random_uuid()` for every existing row (acceptable — fast, no concurrency risk on this tenant scale), OR
- Making `id` nullable initially (violates "PK") then constraining later.

Recommendation: ask Tech Lead to amend ADR-029 §Schema to say `event_id text PRIMARY KEY` (drops the surrogate). The reconciliation migration as drafted does NOT add `id uuid` — assignee should resolve this before merging.

### Q2 — `pixel_event_id` UNIQUE or non-unique?

The Chatwoot lifecycle path (`app/api/webhooks/chatwoot/route.ts`) emits multiple events per conversation (e.g. `qualified_lead` + `quote_sent` for the same `chatwoot_conversation_id`). Each gets its own sha256 `event_id`. Should each get its own `pixel_event_id` (UUIDv4 minted at insert time), and should that be UNIQUE?

**Proposal**: NON-UNIQUE. The UNIQUE constraint on `pixel_event_id` only matters for Meta CAPI dedup (Meta dedups internally on `event_id` field; we send `pixel_event_id` AS that field). If the same `pixel_event_id` is sent twice to Meta, Meta dedups — no DB constraint needed. UNIQUE in our DB only catches programmer errors (same `pixel_event_id` reused across distinct `funnel_events` rows), which is unlikely if minted via UUIDv4.

The migration adds a non-unique partial index `WHERE pixel_event_id IS NOT NULL`.

### Q3 — `dispatch_status` for existing 30-day-backfilled rows?

The backfill migration (`20260504111000_funnel_events_backfill.sql`) inserted ~30 days of historical events. Should those rows be `dispatch_status='dispatched'` (assume already sent via direct Meta CAPI before SOT existed) or `dispatch_status='failed'` (skip — never re-dispatch) or `'pending'` (will be picked up by `pg_cron` and replayed to Meta, causing duplicates)?

**Proposal**: backfill UPDATE in the reconcile migration sets `dispatch_status='dispatched'` for all rows with `created_at < (this migration's timestamp)`. Documents the assumption in a column COMMENT. Assignee to confirm with Growth before merging.

### Q4 — `source` enum values vs current `channel`

ADR-029 says `source IN ('studio_web','chatwoot','flutter_crm','db_trigger')`. Current `channel` has 11 values including `seo`, `google_ads`, `meta`, etc. — `channel` is the *traffic* source, `source` is the *writer* identity.

**Proposal**: add `source` as a new column (default `'studio_web'`), backfill from `channel` mapping (`waflow`→`studio_web`, `chatwoot`→`chatwoot`, `whatsapp`→`studio_web`, …). Keep `channel` untouched. Both columns coexist permanently — they encode different things.

### Q5 — Should `source_url`/`page_path` move into the canonical `page_url` column?

ADR-029 §Schema lists `page_url text` only. Current table has both `source_url` and `page_path`. Proposal: keep both (additive); document that `source_url` is the canonical "full URL" used by Meta CAPI's `event_source_url` field, and `page_path` is the relative path for analytics aggregation.

### Q6 — Alias enum values: timeline to drop?

`qualified_lead`/`quote_sent`/`booking_confirmed` are kept in the enum during transition. After F3 ships and writers emit the prefixed names, these aliases should be removed. Suggested: track as a F3 follow-up issue, not a F1 blocker.

## 7. Estimated impact summary

- **23 columns added** (mostly nullable text or timestamptz).
- **3 new partial/composite indexes**.
- **1 widened enum CHECK** (event_name: 9 → 20 transitional, 14 final).
- **1 widened enum CHECK** (stage: 6 → 12 transitional).
- **4 new CHECK constraints** (dispatch_status, dispatch_attempt_count, value_currency, value_amount).
- **0 dropped columns**, **0 RLS policy changes**, **0 writer code changes** (writer changes are in F1 main PR, NOT in this kickoff).

This migration unblocks F1 by letting the assignee work on dispatcher logic against a schema that already matches ADR-029, instead of negotiating column additions in PR review.
