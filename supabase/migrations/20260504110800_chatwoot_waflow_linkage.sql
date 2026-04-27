-- ============================================================================
-- Chatwoot ↔ WAFlow linkage fields (#326)
-- ============================================================================
-- Purpose:
--   Preserve the provider conversation id and latest lifecycle metadata on the
--   WAFlow lead row that originated the WhatsApp conversation.
--
-- Safety:
--   - Additive, nullable columns only.
--   - Existing RLS on waflow_leads remains unchanged.
--   - Provider webhook idempotency stays in public.webhook_events (ADR-018).
-- ============================================================================

alter table public.waflow_leads
  add column if not exists chatwoot_conversation_id text,
  add column if not exists chatwoot_last_event text,
  add column if not exists chatwoot_last_event_at timestamptz,
  add column if not exists chatwoot_custom_attributes jsonb not null default '{}'::jsonb;

create unique index if not exists waflow_leads_chatwoot_conversation_uidx
  on public.waflow_leads(chatwoot_conversation_id)
  where chatwoot_conversation_id is not null;

create index if not exists waflow_leads_reference_code_idx
  on public.waflow_leads(reference_code)
  where reference_code is not null;

comment on column public.waflow_leads.chatwoot_conversation_id is
  'Chatwoot conversation id linked by /api/webhooks/chatwoot.';
comment on column public.waflow_leads.chatwoot_last_event is
  'Latest mapped Chatwoot lifecycle event processed for this WAFlow lead.';
comment on column public.waflow_leads.chatwoot_custom_attributes is
  'Latest Chatwoot custom attributes payload observed for matching/debugging.';
