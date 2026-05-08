# Supabase Migration Reconciliation — 2026-05-08

Status: reconciliation prepared; one verified production history repair completed.

Source repos:

- Studio: `/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio`
- Flutter: `/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter`

Commands run:

```bash
cd /Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter
supabase migration list --linked

cd /Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio
bash scripts/supabase-migration-audit.sh
```

Repair completed:

```bash
cd /Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter
supabase migration repair --linked --status applied 20260504111600 --yes
```

This did not apply SQL. It only recorded the migration version after production
indexes were verified to already exist.

`supabase db dump --linked --schema supabase_migrations --data-only` was attempted
but blocked because Docker is not running locally. Remote history was then
verified through Supabase MCP with:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

## Current Local Cleanliness

After cleanup:

| Check | Result |
|---|---:|
| Studio SQL files | 38 |
| Studio normalized migrations | 38 |
| Flutter SQL files | 347 |
| Shared by filename | 17 |
| Studio-only normalized migrations | 21 |
| Flutter-only migrations | 330 |
| Studio duplicate `* 2.sql` files | 0 |
| Shared filename content mismatches | 0 |
| Same-version Studio/Flutter filename collisions | 1 |

Cleanup performed:

- Removed 11 tracked accidental `* 2.sql` duplicates from Studio.
- Aligned two comment-only Studio/Flutter mismatches:
  - `20260429153000_growth_audit_run_identity.sql`
  - `20260504111200_public_rate_limits_request_count_contract.sql`
- Archived 59 inactive Studio-only migrations outside `supabase/migrations`
  because they are not related to the currently open Growth/Funnel worktrees.

No SQL semantics changed in the aligned migrations.

Remaining version collisions:

| Version | Studio file | Flutter file | Risk |
|---|---|---|---|
| `20260504123000` | `20260504123000_growth_work_items_autonomous_workboard.sql` | `20260504123000_account_rates_display_name.sql` | Same migration version points to different SQL. |

These are hard blockers for any direct push from either folder until the
intended canonical SQL is archived, renamed with a new timestamp, or confirmed
as already represented in production under a different version.

## Remote History Summary

`supabase migration list --linked` reported:

| Category | Count |
|---|---:|
| Distinct Flutter local migration versions parsed | 289 |
| Distinct remote migration versions parsed | 489 |
| Flutter local versions not present remotely | 271 |
| Remote versions without a local Flutter file | 470 |

Interpretation:

- Production history is not just "behind local"; it is divergent.
- Many old local Flutter files use 8-digit timestamps, which collapse multiple
  files into the same migration version and make exact automated repair unsafe.
- Several Studio/Flutter files are already represented in production with a
  different `version` and a `name` that points back to the original migration.
- Do not run `supabase db push` with the full local migration folder.

## Studio Migration Classification

Pre-archive classification:

| Classification | Count | Meaning |
|---|---:|---|
| `remote_recorded` + `in_flutter` | 2 | Already recorded remotely and mirrored in Flutter. |
| `remote_missing` + `in_flutter` | 19 | Missing by exact version; most are already represented under alternate production versions. |
| `remote_recorded` + `studio_only` | 1 | Remote has the version, but Flutter does not have the Studio filename. Needs provenance check. |
| `remote_missing` + `studio_only` | 75 | Not applicable from Studio. Some are alternate-applied; the rest must be mirrored, superseded or archived. |

Post-archive active migration folder:

| Classification | Count | Meaning |
|---|---:|---|
| `in_flutter` | 17 | Shared filenames kept for Flutter parity/provenance. |
| `studio_only_active` | 21 | Kept because they map to open Growth/Funnel/WAFlow/booking workstreams. |
| `studio_only_archived` | 59 | Moved outside active migrations because they do not map to current local worktrees. |

### Already Recorded And Mirrored

| Version | Migration |
|---|---|
| `20260504111500` | `20260504111500_growth_content_tasks_reviews.sql` |
| `20260504111600` | `20260504111600_waflow_reference_first_conversation_index.sql` |

### Remote Recorded But Studio-Only

| Version | Migration | Required action |
|---|---|---|
| `20260503170000` | `20260503170000_growth_agent_change_sets.sql` | Confirm whether production's `20260503170000` is the same SQL. If not, create a forward-only repair migration with a new timestamp. |

## Mirrored In Flutter But Missing By Exact Version

These 19 have matching Studio/Flutter files but their exact timestamp version is
not recorded in production. Supabase MCP shows most were already applied under a
different production version. Do not repair these blindly; use the remote
evidence column first.

| Local version | Migration | Remote evidence | Default next action |
|---|---|---|---|
| `20260418000000` | `20260418000000_multi_locale_content.sql` | Related remote `20260420140814` = `multi_locale_content_partial_finalize` | Treat as superseded candidate; verify objects before any repair/apply. |
| `20260418000100` | `20260418000100_growth_ops_tables.sql` | Remote `20260428180119` = `20260418000100_growth_ops_tables` | Do not apply; verify and optionally repair only if policy requires exact local version. |
| `20260428131601` | `20260428131601_seo_integrations_growth_contract.sql` | Remote `20260428182337` = `20260428131601_seo_integrations_growth_contract` | Do not apply; already represented remotely. |
| `20260428154000` | `20260428154000_waflow_leads_full_session_variant_unique.sql` | Remote `20260428200357` = same original name | Do not apply; already represented remotely. |
| `20260428155001` | `20260428155001_public_rate_limits_operational.sql` | Remote `20260428200547` = same original name | Do not apply; already represented remotely. |
| `20260428155002` | `20260428155002_webhook_events_operational.sql` | Remote `20260428200616` = same original name | Do not apply; already represented remotely. |
| `20260428161000` | `20260428161000_itinerary_confirmed_funnel_event.sql` | Remote `20260428201705` = same original name | Do not apply; already represented remotely. |
| `20260429153000` | `20260429153000_growth_audit_run_identity.sql` | Remote `20260429155456` = `growth_audit_run_identity` | Do not apply; already represented remotely. |
| `20260429192000` | `20260429192000_geo_ai_visibility_facts.sql` | Remote `20260429170457` = `geo_ai_visibility_facts` | Do not apply; already represented remotely. |
| `20260429193500` | `20260429193500_seo_audit_results_run_identity.sql` | Remote `20260429185537` = `seo_audit_results_run_identity` | Do not apply; already represented remotely. |
| `20260429193600` | `20260429193600_seo_audit_results_run_identity_upsert_key.sql` | Remote `20260429185640` = `seo_audit_results_run_identity_upsert_key` | Do not apply; already represented remotely. |
| `20260429203000` | `20260429203000_translation_quality_gate.sql` | Remote `20260429183445` = `translation_quality_gate` | Do not apply; already represented remotely. |
| `20260504110700` | `20260504110700_meta_conversion_events.sql` | Remote `20260428180147` = same original name | Do not apply; already represented remotely. |
| `20260504110900` | `20260504110900_funnel_events.sql` | Remote `20260428180218` = same original name | Do not apply; already represented remotely. |
| `20260504111000` | `20260504111000_funnel_events_backfill.sql` | Remote `20260428180254` = same original name | Do not apply; already represented remotely. |
| `20260504111100` | `20260504111100_growth_cache_tables.sql` | Remote `20260428180408` = same original name | Do not apply; already represented remotely. |
| `20260504111200` | `20260504111200_public_rate_limits_request_count_contract.sql` | Remote `20260428211206` = `public_rate_limits_request_count_contract` | Do not apply; already represented remotely. |
| `20260504111300` | `20260504111300_package_detail_prefers_kit_name.sql` | Production function body already contains the expected fallbacks | Do not apply; already represented remotely by schema state. Repair exact history only after resolving the `20260504111300` Flutter collision. |
| `20260504123000` | `20260504123000_growth_work_items_autonomous_workboard.sql` | Remote `20260504220011` = `growth_work_items_autonomous_workboard`; production table/indexes verified | Do not apply; already represented remotely. |

### Collision Verification

MCP Supabase confirmed that none of the four collision timestamps is recorded
with its exact local version:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in (
  '20260418000000',
  '20260429203000',
  '20260504111300',
  '20260504123000'
);
```

Confirmed result: no rows.

Production object checks:

| Collision version | Studio migration state | Flutter migration state | Decision |
|---|---|---|---|
| `20260418000000` | Partially present. `locale` and `translation_group_id` exist on website/blog/page/product tables, but `public.destinations` and its locale indexes were not present. | Not checked in this pass. | Do not repair exact history. Create a new forward-only completion migration if the missing destination locale pieces are still required. |
| `20260429203000` | `seo_translation_quality_checks` table and indexes exist. | Not checked in this pass. | Already represented remotely as `20260429183445`; do not apply. |
| `20260504111300` | `get_website_product_page` contains the expected activity fallback fields: `cover_image_url`, `schedule_data`, and `program_highlights`. | `find_or_create_request` contains the reference-first signature and behavior. | Both sides are live in production under other history. Do not reuse this timestamp; repair only after a canonical policy decision. |
| `20260504123000` | `growth_work_items` table and indexes exist. | `account_rates.display_name` and `upsert_account_rate(..., p_display_name text)` exist. | Both sides are live in production under other history. Do not reuse this timestamp; repair only after a canonical policy decision. |

### Completed Repair

`20260504111600_waflow_reference_first_conversation_index.sql` was verified
against production before repair:

```sql
select
  to_regclass('public.waflow_leads') as waflow_leads,
  to_regclass('public.waflow_leads_chatwoot_conversation_uidx') as old_unique_index,
  to_regclass('public.waflow_leads_chatwoot_conversation_idx') as conversation_index,
  to_regclass('public.waflow_leads_chatwoot_conversation_reference_idx') as conversation_reference_index;
```

Result:

| Object | Production state |
|---|---|
| `public.waflow_leads` | Exists |
| `public.waflow_leads_chatwoot_conversation_uidx` | Not present |
| `public.waflow_leads_chatwoot_conversation_idx` | Exists |
| `public.waflow_leads_chatwoot_conversation_reference_idx` | Exists |

After `supabase migration repair`, remote history was confirmed with:

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '20260504111600';
```

Confirmed result:

| Version | Name |
|---|---|
| `20260504111600` | `waflow_reference_first_conversation_index` |

## Studio-Only Remote-Missing Block

These 21 Studio-only normalized migrations remain active because they are
related to the currently open Growth OS, Funnel Events, WAFlow or booking
workstreams. They must still not be applied from Studio. For each one, either
map it to an alternate remote version, mirror it into a Flutter migration
branch, prove it was superseded, or archive it outside `supabase/migrations`.

```text
20260422000000_leads_booking_phase_a.sql
20260422000400_bookings_fsm_phase_b.sql
20260503000120_editorial_v1_waflow_leads.sql
20260503120000_funnel_events_reconcile_adr029.sql
20260503120100_event_destination_mapping.sql
20260503130000_record_funnel_event_rpc.sql
20260503130100_funnel_events_dispatch_trigger.sql
20260503140000_google_ads_offline_uploads.sql
20260503142000_growth_runtime_8_5_learning_tables.sql
20260503150000_itinerary_confirmed_emits_funnel_event.sql
20260503150100_record_booking_confirmed_rpc.sql
20260503153000_growth_runtime_skill_rejected_status.sql
20260503161000_growth_runtime_learning_proposed_by_compat.sql
20260503170000_growth_agent_change_sets.sql
20260504020000_funnel_followups_q1q2q3.sql
20260504110800_chatwoot_waflow_linkage.sql
20260504123000_growth_work_items_autonomous_workboard.sql
20260507153000_growth_paperclip_autonomy_contracts.sql
20260507182000_growth_profile_freshness_flow.sql
20260508123000_growth_live_gated_change_sets_human_review_exemption.sql
20260508170000_growth_runtime_cycles.sql
```

Archived inactive Studio-only migrations live at:

```text
docs/archive/supabase-migration-drafts/2026-05-08-inactive-studio-only/
```

### Studio-Only Remote Name Cross-Check

Before archiving, MCP Supabase was used to cross-check the original 80
Studio-only slugs against `supabase_migrations.schema_migrations.name`.

| Bucket | Count | Action |
|---|---:|---|
| Has remote name match or close remote name match | 63 | Treat as `already_in_prod` by name. Do not apply from Studio. Use schema verification only if exact history repair is desired. |
| No remote name match | 17 | Requires object-level verification before any archive, repair or new migration. |

No-remote-name candidates and current production evidence from the pre-archive
pass:

| Migration | Production evidence | Classification |
|---|---|---|
| `20260422000400_bookings_fsm_phase_b.sql` | `webhook_events` and `bookings` exist; `booking_events`, `create_booking_hold`, and `expire_stale_bookings` were not found. | Partial. Do not repair; create a new forward-only completion migration only if booking FSM is still active scope. |
| `20260503000120_editorial_v1_waflow_leads.sql` | `waflow_leads` and `touch_waflow_leads_updated_at` exist. | Already in production by schema state; do not apply. |
| `20260503120100_event_destination_mapping.sql` | `event_destination_mapping` exists; touch helper was not found by function name. | Partial/variant. Verify trigger before repair; do not apply directly. |
| `20260503120000_funnel_events_reconcile_adr029.sql` | `funnel_events` exists. Detailed column/index reconciliation still needed. | Needs column-level diff before classification. |
| `20260504020000_funnel_followups_q1q2q3.sql` | `fn_emit_crm_booking_confirmed` exists; `funnel_events_emission_errors`, `record_lead_stage_change`, and `google_ads_offline_uploads` were not found. | Partial. Split into a new forward-only completion migration if required. |
| `20260503140000_google_ads_offline_uploads.sql` | `google_ads_offline_uploads` was not found. | Pending/future. Mirror to Flutter only if current release needs it. |
| `20260504110300_issue_276_package_kits_products_translations.sql` | `package_kits.translations` and `activities.translations` exist. | Already in production by schema state; do not apply. |
| `20260503150000_itinerary_confirmed_emits_funnel_event.sql` | `fn_emit_crm_booking_confirmed` and trigger `trg_itinerary_emit_crm_booking_confirmed` exist. | Already in production by schema state; do not apply. |
| `20260422000000_leads_booking_phase_a.sql` | `public_rate_limits` exists; `product_availability` and the checked `leads` booking columns were not found. | Partial/obsolete candidate. Do not repair. |
| `20260504111300_package_detail_prefers_kit_name.sql` | `get_website_product_page` contains expected fallback fields. | Already in production by schema state; do not apply. |
| `20260419120100_package_kits_slug_redirect_trigger.sql` | `package_kits_slug_redirect_tg` and trigger were not found. | Pending/future. Recreate with a new timestamp if still required. |
| `20260504110100_pilot_colombiatours_planner_package_backfill.sql` | Prerequisite columns `contacts.signature_package_id` and `package_kits.planner_id` exist; data backfill not verified. | Data-only candidate. Verify rows before archive or re-run. |
| `20260417000000_product_video_url.sql` | `package_kits.video_url` and `package_kits.video_caption` exist. | Already in production by schema state; do not apply. |
| `20260503150100_record_booking_confirmed_rpc.sql` | `record_booking_confirmed` and `record_lead_stage_change` were not found. | Pending/future or superseded. Do not repair. |
| `20260503130000_record_funnel_event_rpc.sql` | `record_funnel_event` exists. | Already in production by schema state; do not apply. |
| `20260414_seo_analytics_e2e_foundation.sql` | `seo_gsc_credentials`, `seo_ga4_page_metrics`, `seo_competitors`, and `seo_api_calls` exist. | Already in production by schema state; do not apply. |
| `20260504110400_website_sections_and_contacts_translations.sql` | `contacts.translations` exists; checked `website_sections` locale columns were not found. | Partial. Create a new forward-only completion migration only if website section translations still require it. |

## Immediate Execution Plan

1. Treat `20260504111600_waflow_reference_first_conversation_index.sql` as
   closed. It was verified and repaired as applied; do not apply its SQL.
2. Treat `20260504123000_growth_work_items_autonomous_workboard.sql` as the
   only remaining active same-version collision. If exact history is required,
   resolve the Flutter `20260504123000_account_rates_display_name.sql`
   collision before any repair.
3. Treat archived inactive migrations as drafts/provenance only. If one becomes
   required again, recreate it as a new forward-only migration in Flutter.
4. Do not apply the other mirrored/exact-missing migrations; production
   already records them under alternate versions.
5. For candidates where the database object already exists and behavior is live,
   run only after evidence is captured:

```bash
supabase migration repair --status applied <version>
```

6. If the object does not exist and the feature is still required, apply from
   the reviewed Flutter branch.
7. Keep all Studio-only migrations out of production until mapped to remote
   history, mirrored, superseded or archived.
