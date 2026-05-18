# T2 — Apply Write Gate

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice1`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Entity: `/tour-colombia-10-dias`
Target: `pt-BR/BR`
Scope: one-entity production DML only; no provider calls, no publish, no mass transcreation.

Status: `PASS_WRITTEN`

## Rows written/touched

- `growth_provider_policies.id`: `56719ae8-2f5f-4550-b294-e08957e79667`
- `growth_profile_runs.id`: `5c453359-e77d-44a5-80cf-e292b657e928`
- `growth_signal_facts.id`: `87c3fa60-8930-497e-b767-cef7f541a308`
- `growth_source_refs.id`: `026f743c-0297-4436-8902-55f7f9449c4e`
- `growth_profiles.id`: `0b4d0d4c-d293-4214-9bec-cb8113689284`
- `growth_context_packet_log.id`: `1dd79ba7-44c8-4908-9922-a6ecb760f2aa`

## Guardrails kept

- No provider calls.
- No secrets.
- No publish.
- No mass transcreation.
- Single entity only.

## Rollback SQL

```sql
begin;
update public.growth_profiles
set source_signal_fact_ids = array_remove(source_signal_fact_ids, '87c3fa60-8930-497e-b767-cef7f541a308'::uuid),
    payload = payload - 'write_gate_slice1'
where id='0b4d0d4c-d293-4214-9bec-cb8113689284';

delete from public.growth_context_packet_log
where id='1dd79ba7-44c8-4908-9922-a6ecb760f2aa';

delete from public.growth_source_refs
where id='026f743c-0297-4436-8902-55f7f9449c4e';

delete from public.growth_signal_facts
where id='87c3fa60-8930-497e-b767-cef7f541a308';

delete from public.growth_profile_runs
where id='5c453359-e77d-44a5-80cf-e292b657e928';

update public.growth_provider_policies
set enabled=false, consent_granted=false, updated_at=now(), notes=coalesce(notes,'') || ' [rollback disabled by operator]'
where id='56719ae8-2f5f-4550-b294-e08957e79667';
commit;
```
