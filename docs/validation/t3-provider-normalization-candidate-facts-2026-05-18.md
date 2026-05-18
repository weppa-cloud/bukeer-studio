# T3 — Normalize Facts Dry-run / Candidate Facts

Status: `PASS_CANDIDATE_ONLY`
Date: `2026-05-18`
Sprint: `growth-provider-normalization-colombiatours-ptbr-slice1`
Task: `t_a50c072b`

## Verdict

`PASS_CANDIDATE_ONLY`

The dry-run can produce a stable candidate fact shape for `/tour-colombia-10-dias` in `pt-BR/BR`, but it must not insert it yet.

## Candidate fact properties

- `website_id`: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- `locale`: `pt-BR`
- `market`: `BR`
- `entity_table`: `website_pages`
- `entity_path`: `/tour-colombia-10-dias`
- `signal_type`: `seo_provider_normalized_signal`
- `payload.dry_run`: `true`

## Blocking reason

The candidate is shape-only. It does not represent a verified provider run or approved write.
