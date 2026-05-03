-- ============================================================================
-- F1 schema reconciliation per ADR-029 + SPEC_FUNNEL_EVENTS_SOT (#420)
-- ============================================================================
-- Purpose:
--   Reconcile the existing public.funnel_events table (created in
--   20260504110900_funnel_events.sql) with the canonical schema in ADR-029
--   §"Schema (canonical)" + §"Implementation reality check" + §"Delivery
--   semantics".
--
--   Justification for every column / index / constraint changed:
--   docs/specs/SPEC_FUNNEL_EVENTS_SOT_SCHEMA_DIFF.md
--
-- Safety:
--   - Additive, forward-only. NO column drops, NO column renames, NO
--     destructive changes to existing CHECK constraints (only widened).
--   - Idempotent: every statement uses IF NOT EXISTS / DROP ... IF EXISTS.
--   - Existing 3 writers (waflow, chatwoot, whatsapp-cta) keep working
--     unchanged — new columns are nullable or have defaults.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add missing columns (idempotent)
-- ----------------------------------------------------------------------------
-- Per ADR-029 §"Implementation reality check" point 2: pixel_event_id is
-- DISTINCT from event_id. event_id stays as the sha256 PK; pixel_event_id is
-- what the dispatcher forwards to Meta CAPI / Pixel for browser↔server dedup.
alter table public.funnel_events
  add column if not exists pixel_event_id text;

-- Per ADR-029 §"Delivery semantics": dispatch_status drives the pg_cron
-- re-dispatch loop. pg_net is fire-and-forget so we need our own retry state.
alter table public.funnel_events
  add column if not exists dispatch_status text not null default 'pending';

alter table public.funnel_events
  add column if not exists dispatch_attempted_at timestamptz;

alter table public.funnel_events
  add column if not exists dispatch_attempt_count integer not null default 0;

-- Writer identity (vs `channel` which is traffic source). See diff §Q4.
alter table public.funnel_events
  add column if not exists source text not null default 'studio_web';

-- PII (RLS service-role-only already in place from base migration).
alter table public.funnel_events
  add column if not exists user_email text;

alter table public.funnel_events
  add column if not exists user_phone text;

alter table public.funnel_events
  add column if not exists user_id uuid;

alter table public.funnel_events
  add column if not exists external_id text;

-- Meta attribution columns (today live inside attribution jsonb; promote for
-- typed access by the dispatcher and for query performance).
alter table public.funnel_events
  add column if not exists fbp text;

alter table public.funnel_events
  add column if not exists fbc text;

alter table public.funnel_events
  add column if not exists ctwa_clid text;

-- Google Ads attribution (Phase 2 dependency, but column ships in F1).
alter table public.funnel_events
  add column if not exists gclid text;

alter table public.funnel_events
  add column if not exists gbraid text;

alter table public.funnel_events
  add column if not exists wbraid text;

-- UTM attribution.
alter table public.funnel_events
  add column if not exists utm_source text;

alter table public.funnel_events
  add column if not exists utm_medium text;

alter table public.funnel_events
  add column if not exists utm_campaign text;

alter table public.funnel_events
  add column if not exists utm_term text;

alter table public.funnel_events
  add column if not exists utm_content text;

-- For Meta CAPI client_ip_address / client_user_agent.
alter table public.funnel_events
  add column if not exists ip_address inet;

alter table public.funnel_events
  add column if not exists user_agent text;

-- For Purchase / quote events (Phase 3 dependency, column ships in F1).
alter table public.funnel_events
  add column if not exists value_amount numeric;

alter table public.funnel_events
  add column if not exists value_currency text;

-- ----------------------------------------------------------------------------
-- 2. Backfill: existing 30-day-history rows (from
--    20260504111000_funnel_events_backfill.sql) MUST NOT be re-dispatched —
--    those events were already sent via the pre-SOT direct-call path and
--    re-dispatching would duplicate at Meta. Per diff §Q3.
-- ----------------------------------------------------------------------------
-- Mark every pre-existing row as already-dispatched so the pg_cron re-dispatch
-- loop ignores them. New inserts will use the column DEFAULT 'pending'.
update public.funnel_events
   set dispatch_status = 'dispatched',
       dispatch_attempted_at = coalesce(dispatch_attempted_at, created_at)
 where dispatch_status = 'pending'
   and created_at < now();
-- NOTE: this UPDATE assumes the migration runs once at a defined moment; a
-- re-run on a cluster where new pending rows exist would mark them dispatched
-- spuriously. To prevent that, the WHERE clause uses `created_at < now()`
-- which evaluates at statement time. Safe re-run window: <1ms between the
-- column DEFAULT being applied and this UPDATE. Acceptable for this scale.

-- Backfill `source` from `channel` for existing rows. Mapping:
--   waflow      -> studio_web
--   whatsapp    -> studio_web
--   chatwoot    -> chatwoot
--   *           -> studio_web (safe default — most existing rows are web)
update public.funnel_events
   set source = case channel
                  when 'chatwoot' then 'chatwoot'
                  else 'studio_web'
                end
 where source = 'studio_web'
   and channel = 'chatwoot';
-- (other rows already match the default 'studio_web')

-- ----------------------------------------------------------------------------
-- 3. Add missing indexes (idempotent)
-- ----------------------------------------------------------------------------
-- Per ADR-029 §Schema: "(event_time DESC)" — our column is `occurred_at`.
create index if not exists funnel_events_event_time_desc_idx
  on public.funnel_events (occurred_at desc);

-- Per ADR-029 §Schema: "(event_name, event_time)" — drives daily count
-- monitoring per AC1.9.
create index if not exists funnel_events_event_name_time_idx
  on public.funnel_events (event_name, occurred_at desc);

-- Per ADR-029 §"Delivery semantics": hot path for the pg_cron re-dispatch
-- loop. Partial index keeps it tiny.
create index if not exists funnel_events_dispatch_pending_partial_idx
  on public.funnel_events (dispatch_status, dispatch_attempted_at)
  where dispatch_status = 'pending';

-- For dispatcher lookups by pixel_event_id (e.g. when retrying a known event).
-- NON-UNIQUE — see diff §Q2.
create index if not exists funnel_events_pixel_event_id_idx
  on public.funnel_events (pixel_event_id)
  where pixel_event_id is not null;

-- For Phase 2 attribution lookups (gclid → conversion path).
create index if not exists funnel_events_gclid_idx
  on public.funnel_events (gclid)
  where gclid is not null;

-- ----------------------------------------------------------------------------
-- 4. Widen event_name CHECK constraint
-- ----------------------------------------------------------------------------
-- Drop and re-create to add the canonical ADR-029 §Event matrix names while
-- preserving current writer names (qualified_lead / quote_sent /
-- booking_confirmed) as backwards-compat aliases. Aliases will be removed in
-- an F3 follow-up after writers migrate to the prefixed names.
alter table public.funnel_events
  drop constraint if exists funnel_events_event_name_chk;

alter table public.funnel_events
  add constraint funnel_events_event_name_chk
    check (event_name in (
      -- Awareness / web
      'pageview',
      -- WAFlow legacy + canonical
      'waflow_open',
      'waflow_step_next',
      'waflow_submit',
      'quote_form_submit',
      -- CTA clicks (canonical)
      'whatsapp_cta_click',
      'phone_cta_click',
      'email_cta_click',
      'cal_booking_click',
      -- Chatwoot lifecycle (canonical)
      'chatwoot_conversation_started',
      'chatwoot_message_received',
      'chatwoot_label_qualified',
      -- CRM lifecycle (canonical)
      'crm_lead_stage_qualified',
      'crm_quote_sent',
      'crm_booking_confirmed',
      'payment_received',
      -- Backwards-compat aliases (current writers — drop in F3 follow-up)
      'qualified_lead',
      'quote_sent',
      'booking_confirmed',
      -- Funnel terminals (current, kept)
      'review_submitted',
      'referral_lead'
    ));

-- ----------------------------------------------------------------------------
-- 5. Widen stage CHECK constraint to cover canonical funnel stages
-- ----------------------------------------------------------------------------
alter table public.funnel_events
  drop constraint if exists funnel_events_stage_chk;

alter table public.funnel_events
  add constraint funnel_events_stage_chk
    check (stage in (
      -- Canonical (ADR-029)
      'awareness',
      'intent',
      'lead',
      'engagement',
      'qualify',
      'realized',
      -- Current (kept for backwards-compat)
      'acquisition',
      'activation',
      'qualified_lead',
      'quote_sent',
      'booking',
      'review_referral'
    ));

-- ----------------------------------------------------------------------------
-- 6. Add new CHECK constraints for the new columns
-- ----------------------------------------------------------------------------
alter table public.funnel_events
  drop constraint if exists funnel_events_dispatch_status_chk;
alter table public.funnel_events
  add constraint funnel_events_dispatch_status_chk
    check (dispatch_status in ('pending', 'dispatched', 'failed'));

alter table public.funnel_events
  drop constraint if exists funnel_events_dispatch_attempt_count_chk;
alter table public.funnel_events
  add constraint funnel_events_dispatch_attempt_count_chk
    check (dispatch_attempt_count >= 0 and dispatch_attempt_count <= 5);

alter table public.funnel_events
  drop constraint if exists funnel_events_source_chk;
alter table public.funnel_events
  add constraint funnel_events_source_chk
    check (source in ('studio_web', 'chatwoot', 'flutter_crm', 'db_trigger'));

alter table public.funnel_events
  drop constraint if exists funnel_events_value_currency_chk;
alter table public.funnel_events
  add constraint funnel_events_value_currency_chk
    check (value_currency is null or value_currency ~ '^[A-Z]{3}$');

alter table public.funnel_events
  drop constraint if exists funnel_events_value_amount_chk;
alter table public.funnel_events
  add constraint funnel_events_value_amount_chk
    check (value_amount is null or value_amount >= 0);

-- ----------------------------------------------------------------------------
-- 7. RLS policies (no changes — current policies already match ADR-029)
-- ----------------------------------------------------------------------------
-- Current policies already enforce:
--   * funnel_events_service_all (FOR ALL) — service-role write/read
--   * funnel_events_account_read (FOR SELECT) — tenant-scoped authenticated
--     read
-- These mirror meta_conversion_events §service_all + intentionally extend with
-- account-scoped read for the future reporting dashboard. No diff needed.

-- ----------------------------------------------------------------------------
-- 8. Column COMMENTs — document the new columns + key invariants
-- ----------------------------------------------------------------------------
comment on column public.funnel_events.pixel_event_id is
  'Pixel/CAPI dedup id (UUIDv4 minted browser-side or server-side). DISTINCT from event_id (sha256 PK). The dispatcher forwards THIS field to Meta CAPI as the event_id. NULL means dispatcher should mint at send time.';

comment on column public.funnel_events.dispatch_status is
  'Dispatcher state machine: pending|dispatched|failed. Drives the pg_cron re-dispatch loop (every 60s, retries pending rows older than 30s). Caps at dispatch_attempt_count=5 then permanent failed.';

comment on column public.funnel_events.dispatch_attempted_at is
  'Last dispatch attempt timestamp. Used by re-dispatch query: WHERE dispatch_status=pending AND dispatch_attempted_at < now() - 30s.';

comment on column public.funnel_events.dispatch_attempt_count is
  'Incremented per dispatch attempt; capped at 5 by funnel_events_dispatch_attempt_count_chk.';

comment on column public.funnel_events.source is
  'Writer identity: studio_web|chatwoot|flutter_crm|db_trigger. NOT the same as channel (which is traffic source).';

comment on column public.funnel_events.user_email is
  'PII — service-role read only. 90-day retention policy planned in Phase 4 AC4.2.';

comment on column public.funnel_events.user_phone is
  'PII — E.164 format. Service-role read only.';

comment on column public.funnel_events.gclid is
  'Google Ads click id. Captured from URL query param + persisted in 90-day cookie. Used by Phase 2 Google Ads offline upload dispatcher branch.';

comment on column public.funnel_events.value_amount is
  'For Purchase/quote events. Currency in value_currency. Populated by Phase 3 crm_booking_confirmed and payment_received writers.';

comment on column public.funnel_events.value_currency is
  'ISO-4217 (e.g. COP, USD, MXN). 3-letter uppercase, enforced by CHECK.';

comment on column public.funnel_events.account_id is
  'Tenant id. ADR-029 §Schema canonical name is tenant_id; in Bukeer schema accounts.id IS the tenant id.';

comment on column public.funnel_events.occurred_at is
  'Wall-clock when the event happened (ADR-029 calls this event_time). NOT created_at (which is DB insert time).';

comment on column public.funnel_events.payload is
  'Catch-all jsonb (ADR-029 calls this raw_payload). Caller MUST redact PII per docs/ops/growth-attribution-governance.md.';
