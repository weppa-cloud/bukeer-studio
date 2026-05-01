-- ============================================================================
-- WAFlow reference-first Chatwoot linkage (#322 / EPIC #310)
-- ============================================================================
-- Purpose:
--   One WhatsApp/Chatwoot conversation can contain multiple WAFlow submissions.
--   The canonical identity for Growth/CRM linkage is `reference_code`, not
--   `chatwoot_conversation_id`.
--
-- Safety:
--   - Drops only the legacy unique index on chatwoot_conversation_id.
--   - Keeps non-unique lookup support by conversation and by conversation/ref.
--   - Does not mutate existing rows.
-- ============================================================================

drop index if exists public.waflow_leads_chatwoot_conversation_uidx;

create index if not exists waflow_leads_chatwoot_conversation_idx
  on public.waflow_leads(chatwoot_conversation_id)
  where chatwoot_conversation_id is not null;

create index if not exists waflow_leads_chatwoot_conversation_reference_idx
  on public.waflow_leads(chatwoot_conversation_id, reference_code)
  where chatwoot_conversation_id is not null
    and reference_code is not null;

comment on column public.waflow_leads.chatwoot_conversation_id is
  'Chatwoot conversation id observed for this WAFlow lead. Non-unique: one conversation may contain multiple WAFlow references.';
