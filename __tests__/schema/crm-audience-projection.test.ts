import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260520120000_crm_audience_projection.sql'),
  'utf8'
)
const edgeFunction = readFileSync(
  join(process.cwd(), 'supabase/functions/sync-crm-audiences/index.ts'),
  'utf8'
)

describe('crm audience projection migration', () => {
  it('creates the required CRM audience projection tables', () => {
    for (const table of [
      'crm_audience_definitions',
      'crm_audience_memberships',
      'crm_audience_member_identities',
      'crm_audience_destination_bindings',
      'crm_audience_sync_runs',
      'crm_audience_sync_events',
      'crm_audience_suppressions',
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`)
      expect(migration).toContain(`alter table public.${table} enable row level security`)
      expect(migration).toContain(`${table}_service_all`)
    }
  })

  it('keeps hashed member identities service-role only', () => {
    expect(migration).toContain('crm_audience_member_identities_service_all')
    expect(migration).not.toContain('crm_audience_member_identities_tenant_read')
    expect(migration).not.toContain('crm_audience_sync_events_tenant_read')
    expect(migration).not.toContain('crm_audience_suppressions_tenant_read')
    expect(migration).toContain('No raw PII')
  })

  it('seeds platform channels and ColombiaTours audience definitions idempotently', () => {
    expect(migration).toContain('insert into public.service_channels (')
    expect(migration).toContain('display_name')
    expect(migration).toContain('service_type')
    expect(migration).toContain('account_channel_contracts.credentials_encrypted')
    expect(migration).toContain('no production env fallback')
    expect(migration).toContain('google_ads_customer_match')
    expect(migration).toContain('meta_custom_audiences')
    for (const code of [
      'CT_confirmed_itinerary_buyers_all_24m',
      'CT_confirmed_buyers_high_value',
      'CT_quote_sent_no_purchase_180d',
      'CT_waflow_submit_no_quote_90d',
      'CT_recent_buyers_180d',
      'CT_bad_fit_low_quality_leads',
    ]) {
      expect(migration).toContain(code)
    }
    expect(migration).toContain('on conflict (account_id, code) do update')
  })

  it('provides service-role RPCs for refresh and gated queueing', () => {
    expect(migration).toContain('create or replace function public.refresh_crm_audience_memberships')
    expect(migration).toContain('create or replace function public.queue_crm_audience_sync')
    expect(migration).toContain('CRM audience apply requires explicit approval_token')
    expect(migration).toContain('grant execute on function public.refresh_crm_audience_memberships')
    expect(migration).toContain('grant execute on function public.queue_crm_audience_sync')
  })
})

describe('sync-crm-audiences Edge Function', () => {
  it('requires service authorization and blocks apply without approval token', () => {
    expect(edgeFunction).toContain('unauthorized')
    expect(edgeFunction).toContain('approval_token_required_for_apply')
    expect(edgeFunction).toContain('queue_crm_audience_sync')
    expect(edgeFunction).toContain('refresh_crm_audience_memberships')
  })

  it('does not attach CRM audiences to campaigns or ad sets', () => {
    expect(edgeFunction).not.toMatch(/campaignCriterion|adsets|ad_sets|attach/i)
  })
})
