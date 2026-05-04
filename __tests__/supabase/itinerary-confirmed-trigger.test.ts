/**
 * F3 (#422) -- itinerary AFTER UPDATE trigger contract test.
 *
 * Bukeer Studio does not run a Postgres test harness in jest (the Supabase
 * project is shared with bukeer-flutter and its real DB runs in Supabase
 * cloud). Per CLAUDE.md "Never apply migrations to live DB" we cannot exercise
 * the trigger end-to-end here.
 *
 * This test instead pins the migration SQL contract so a regression in the
 * payload shape, deterministic event_id, value source, or trigger predicate
 * surfaces in CI before deploy. The assertions below are derived from the F3
 * sign-off (2026-05-03 Option A) and ADR-029 §"Schema (canonical)".
 *
 * Coverage gaps acknowledged (require live DB or staging branch to verify):
 *  - That fn_payment_confirms_request actually flips itineraries.status to
 *    Confirmado on first deposit (lives in bukeer-flutter migrations).
 *  - That record_funnel_event idempotency on PK works under concurrent
 *    trigger + RPC writes (covered by F1's RPC unit test).
 *  - That the warning RAISE on NULL total_markup actually surfaces in
 *    Supabase logs (manual validation step in PR description).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260503150000_itinerary_confirmed_emits_funnel_event.sql',
);

const RPC_MIGRATION_PATH = resolve(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260503150100_record_booking_confirmed_rpc.sql',
);

describe('F3 itinerary trigger migration (20260503150000)', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(MIGRATION_PATH, 'utf8');
  });

  it('drops the legacy trg_itinerary_booking_confirmed_funnel_event trigger to avoid two writers', () => {
    expect(sql).toMatch(
      /drop\s+trigger\s+if\s+exists\s+trg_itinerary_booking_confirmed_funnel_event\s+on\s+public\.itineraries/i,
    );
  });

  it('creates the new trg_itinerary_emit_crm_booking_confirmed trigger as AFTER UPDATE OF status', () => {
    expect(sql).toMatch(
      /create\s+trigger\s+trg_itinerary_emit_crm_booking_confirmed\s+after\s+update\s+of\s+status\s+on\s+public\.itineraries/i,
    );
  });

  it('only fires on Presupuesto/* -> Confirmado transitions (WHEN predicate)', () => {
    expect(sql).toMatch(/OLD\.status\s+is\s+distinct\s+from\s+NEW\.status/i);
    expect(sql).toMatch(/NEW\.status\s*=\s*'Confirmado'/i);
  });

  it('emits the canonical event_name crm_booking_confirmed (NOT the legacy booking_confirmed alias)', () => {
    expect(sql).toContain("'crm_booking_confirmed'");
    const payloadBlock = sql.match(/jsonb_build_object\([^;]*'event_name'[^,]*,\s*'([a-z_]+)'/);
    expect(payloadBlock).not.toBeNull();
    expect(payloadBlock?.[1]).toBe('crm_booking_confirmed');
  });

  it('uses NEW.total_markup as value_amount (sign-off 2026-05-03 -- NOT total_amount)', () => {
    expect(sql).toMatch(/v_value_amount\s*:=\s*NEW\.total_markup/i);
    expect(sql).not.toMatch(/v_value_amount\s*:=\s*NEW\.total_amount/i);
  });

  it('handles NULL total_markup with a RAISE NOTICE + value_amount=0 + total_markup_missing flag', () => {
    expect(sql).toMatch(/if\s+NEW\.total_markup\s+is\s+null/i);
    expect(sql).toMatch(/raise\s+notice/i);
    expect(sql).toMatch(/total_markup_missing/);
    expect(sql).toMatch(/v_value_amount\s*:=\s*0/);
  });

  it('builds a deterministic sha256 event_id from itinerary_id + event_name + epoch_seconds', () => {
    expect(sql).toMatch(/digest\s*\(\s*NEW\.id::text/i);
    expect(sql).toMatch(/':crm_booking_confirmed:'/);
    expect(sql).toMatch(/extract\s*\(\s*epoch\s+from\s+v_event_time\s*\)/i);
    expect(sql).toMatch(/'sha256'/);
    expect(sql).toMatch(/'hex'/);
  });

  it('mints a fresh UUIDv4 pixel_event_id server-side (no browser pairing)', () => {
    expect(sql).toMatch(/v_pixel_event_id\s*:=\s*gen_random_uuid\(\)::text/i);
  });

  it('passes source=db_trigger (not flutter_crm) so monitoring can attribute the writer', () => {
    expect(sql).toMatch(/'source'\s*,\s*'db_trigger'/);
  });

  it('includes raw_payload with itinerary_id, total_amount, total_cost, total_markup, status_was', () => {
    expect(sql).toMatch(/'itinerary_id'\s*,\s*NEW\.id/);
    expect(sql).toMatch(/'total_amount'\s*,\s*NEW\.total_amount/);
    expect(sql).toMatch(/'total_cost'\s*,\s*NEW\.total_cost/);
    expect(sql).toMatch(/'total_markup'\s*,\s*NEW\.total_markup/);
    expect(sql).toMatch(/'status_was'\s*,\s*OLD\.status/);
  });

  it('calls record_funnel_event (the F1 RPC) instead of inserting directly into funnel_events', () => {
    expect(sql).toMatch(/perform\s+public\.record_funnel_event\s*\(\s*v_payload\s*\)/i);
    expect(sql).not.toMatch(/insert\s+into\s+public\.funnel_events/i);
  });

  it('never blocks the user UPDATE on emission failure (exception handler returns NEW)', () => {
    expect(sql).toMatch(/exception\s+when\s+others\s+then/i);
    expect(sql).toMatch(/raise\s+warning/i);
    expect(sql).toMatch(/return\s+NEW/i);
  });

  it('uses SECURITY DEFINER + sets search_path to avoid hijack vectors', () => {
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*public,\s*extensions,\s*pg_temp/i);
  });
});

describe('F3 RPC wrappers migration (20260503150100)', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(RPC_MIGRATION_PATH, 'utf8');
  });

  it('declares record_booking_confirmed(uuid) and record_lead_stage_change(uuid, text, uuid)', () => {
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.record_booking_confirmed\s*\(\s*p_itinerary_id\s+uuid\s*\)/i,
    );
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.record_lead_stage_change\s*\(\s*p_lead_id\s+uuid,\s*p_new_stage\s+text,\s*p_agent_id\s+uuid\s*\)/i,
    );
  });

  it('record_booking_confirmed shares the deterministic event_id formula with the trigger', () => {
    expect(sql).toMatch(/v_itinerary\.id::text\s*\|\|\s*':crm_booking_confirmed:'/);
  });

  it('record_lead_stage_change maps qualified -> crm_lead_stage_qualified, quote_sent -> crm_quote_sent', () => {
    expect(sql).toMatch(/when\s+'qualified'\s+then\s+'crm_lead_stage_qualified'/i);
    expect(sql).toMatch(/when\s+'quote_sent'\s+then\s+'crm_quote_sent'/i);
    expect(sql).toMatch(/when\s+'lead_dropped'\s+then\s+null/i);
  });

  it('grants EXECUTE to service_role + authenticated for both wrappers', () => {
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.record_booking_confirmed\(uuid\)\s+to\s+service_role/i,
    );
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.record_booking_confirmed\(uuid\)\s+to\s+authenticated/i,
    );
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.record_lead_stage_change\(uuid,\s*text,\s*uuid\)\s+to\s+service_role/i,
    );
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.record_lead_stage_change\(uuid,\s*text,\s*uuid\)\s+to\s+authenticated/i,
    );
  });

  it('never grants EXECUTE to anon (writers must auth first)', () => {
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+public\.record_booking_confirmed\(uuid\)\s+from\s+anon/i);
    expect(sql).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.record_lead_stage_change\(uuid,\s*text,\s*uuid\)\s+from\s+anon/i,
    );
  });

  it('returns structured skipped/reason envelope when preconditions fail (not exceptions)', () => {
    expect(sql).toMatch(/'skipped'\s*,\s*true/);
    expect(sql).toMatch(/'reason'\s*,\s*'no_published_website_for_account'/);
    expect(sql).toMatch(/'reason'\s*,\s*'itinerary_not_confirmed'/);
  });

  it('record_booking_confirmed builds value_amount from total_markup and falls back to 0 on null', () => {
    expect(sql).toMatch(/v_itinerary\.total_markup\s+is\s+null/i);
    expect(sql).toMatch(/v_value_amount\s*:=\s*v_itinerary\.total_markup/i);
  });
});
