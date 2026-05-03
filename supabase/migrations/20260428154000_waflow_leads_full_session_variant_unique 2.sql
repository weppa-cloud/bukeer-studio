-- Ensure PostgREST upsert can target waflow_leads(session_key, variant).
--
-- The original index is partial (`where session_key is not null`), which is
-- valid for Postgres uniqueness but cannot be inferred by PostgREST for
-- `onConflict=session_key,variant`. The API contract already requires
-- sessionKey on writes, so this full unique index is safe and keeps the
-- existing partial index in place for backwards compatibility.

create unique index if not exists waflow_leads_session_key_variant_full_uidx
  on public.waflow_leads(session_key, variant);
