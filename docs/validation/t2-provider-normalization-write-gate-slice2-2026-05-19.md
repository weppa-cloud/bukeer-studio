# T2 — Apply Write Gate Slice2

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice2`
Status: `PASS_WRITTEN`

## Rows written/touched

- `/bogota-cartagena-6-dias` — fact `7b592169-7fd7-434a-a51b-d5dafa94f77f` — source_ref `eeed26f2-b800-4764-a15a-3b6e2b22d730` — profile_run `b08baddd-9f23-4408-9a98-d5a4243f4164`
- `/tour-colombia-15-dias` — fact `6c01b696-5d4d-428f-b09e-8e3d97447b17` — source_ref `5b20632e-88e7-45f3-b39f-93acefa3b03b` — profile_run `776d119b-af46-493b-964b-a2c7147b4034`
- `/cartagena-4-dias` — fact `6b494e2c-ef83-455e-928e-b5d22c1ba1e3` — source_ref `b1e0fee3-e2d6-4111-9415-e601c7be9ca1` — profile_run `83032e80-d07e-4598-916c-18337b411b44`
- `/colombia-esencia-12-dias` — fact `21a1192d-436b-4824-b3c8-8f4a32bc2065` — source_ref `bc6a06cb-dae2-4d5e-a8a9-6677ab183fb9` — profile_run `88c54a19-c237-4db8-88c2-9d7fa4df1b0e`
- `/los-mejores-paquetes-de-viajes-a-colombia` — fact `a6c431de-f6f4-4591-bccb-be8faf2b5024` — source_ref `cf2a6188-4788-4ccc-990f-b18e7a642ee0` — profile_run `d392f150-f146-4a6e-8e6e-2de89169bd0e`

- `growth_context_packet_log.id`: `4492667b-c7a2-44d3-be5d-7e6218239242`
- `growth_profiles.id`: `0b4d0d4c-d293-4214-9bec-cb8113689284` updated with `write_gate_slice2` payload and five fact links.
- Existing provider policy reused/updated for manual operator source-truth write gate: `56719ae8-2f5f-4550-b294-e08957e79667`

## Guardrails kept

- No provider calls.
- No secrets.
- No publish.
- No mass transcreation.
- Five-entity batch only.

## Rollback SQL

```sql
begin;
update public.growth_profiles
set source_signal_fact_ids = array_remove(
      array_remove(
        array_remove(
          array_remove(
            array_remove(source_signal_fact_ids,
              '7b592169-7fd7-434a-a51b-d5dafa94f77f'::uuid),
            '6c01b696-5d4d-428f-b09e-8e3d97447b17'::uuid),
          '6b494e2c-ef83-455e-928e-b5d22c1ba1e3'::uuid),
        '21a1192d-436b-4824-b3c8-8f4a32bc2065'::uuid),
      'a6c431de-f6f4-4591-bccb-be8faf2b5024'::uuid),
    payload = payload - 'write_gate_slice2'
where id='0b4d0d4c-d293-4214-9bec-cb8113689284';

delete from public.growth_context_packet_log
where id='4492667b-c7a2-44d3-be5d-7e6218239242';

delete from public.growth_source_refs where id='eeed26f2-b800-4764-a15a-3b6e2b22d730';
delete from public.growth_signal_facts where id='7b592169-7fd7-434a-a51b-d5dafa94f77f';
delete from public.growth_profile_runs where id='b08baddd-9f23-4408-9a98-d5a4243f4164';
delete from public.growth_source_refs where id='5b20632e-88e7-45f3-b39f-93acefa3b03b';
delete from public.growth_signal_facts where id='6c01b696-5d4d-428f-b09e-8e3d97447b17';
delete from public.growth_profile_runs where id='776d119b-af46-493b-964b-a2c7147b4034';
delete from public.growth_source_refs where id='b1e0fee3-e2d6-4111-9415-e601c7be9ca1';
delete from public.growth_signal_facts where id='6b494e2c-ef83-455e-928e-b5d22c1ba1e3';
delete from public.growth_profile_runs where id='83032e80-d07e-4598-916c-18337b411b44';
delete from public.growth_source_refs where id='bc6a06cb-dae2-4d5e-a8a9-6677ab183fb9';
delete from public.growth_signal_facts where id='21a1192d-436b-4824-b3c8-8f4a32bc2065';
delete from public.growth_profile_runs where id='88c54a19-c237-4db8-88c2-9d7fa4df1b0e';
delete from public.growth_source_refs where id='cf2a6188-4788-4ccc-990f-b18e7a642ee0';
delete from public.growth_signal_facts where id='a6c431de-f6f4-4591-bccb-be8faf2b5024';
delete from public.growth_profile_runs where id='d392f150-f146-4a6e-8e6e-2de89169bd0e';
commit;
```

For the profile array rollback, use `array_remove` for each fact id above before deleting facts if manual rollback is required.
