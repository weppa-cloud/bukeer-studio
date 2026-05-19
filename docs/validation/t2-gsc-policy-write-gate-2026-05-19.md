# T2 — GSC Policy Write Gate Apply

Sprint: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`

## Production DML scope

Applied controlled production DML for one entity only.

Created/updated chain:

- provider_policy_id: `b109b76c-52dc-4d82-b4c8-068542f86103`
- profile_run_id: `ad8ac930-4142-4e30-b6aa-aefcdddd6514`
- fact_id: `4e7796ab-7d90-4f64-b06b-a07a52647e9c`
- source_ref_id: `6729d4b3-5e83-44c6-a2c4-079c29626906`
- context_packet_log_id: `26280335-cfab-4fec-92ef-87f8ddb16564`

## Notes

The first DML statement inserted the GSC policy and profile run but downstream CTEs did not see sibling data-modifying CTE inserts through ordinary table reads. Recovery was safe and idempotent: subsequent statements selected the already-created run/fact/ref from base tables and completed the chain.

This mirrors the existing deferrable-constraint pitfall: for these write gates, prefer small, explicit idempotent steps over clever multi-CTE dependency chains.

## Guardrails observed

- No publish.
- No mass transcreation.
- No worker provider calls.
- No fallback `es-CO/CO`.
- No secrets printed.

## Rollback

```sql
begin;

update public.growth_profiles
set source_signal_fact_ids = array_remove(source_signal_fact_ids, '4e7796ab-7d90-4f64-b06b-a07a52647e9c'::uuid),
    payload = payload - 'gsc_write_gate_slice1',
    updated_at = now()
where id = '0b4d0d4c-d293-4214-9bec-cb8113689284';

delete from public.growth_context_packet_log
where id = '26280335-cfab-4fec-92ef-87f8ddb16564'::uuid;

delete from public.growth_source_refs
where id = '6729d4b3-5e83-44c6-a2c4-079c29626906'::uuid;

delete from public.growth_signal_facts
where id = '4e7796ab-7d90-4f64-b06b-a07a52647e9c'::uuid;

delete from public.growth_profile_runs
where id = 'ad8ac930-4142-4e30-b6aa-aefcdddd6514'::uuid;

-- Optional: disable instead of delete policy if only rolling back the canary data.
update public.growth_provider_policies
set enabled = false, updated_at = now(), notes = coalesce(notes,'') || E'\nRollback: disabled after GSC write-gate canary.'
where id = 'b109b76c-52dc-4d82-b4c8-068542f86103'::uuid;

commit;
```
