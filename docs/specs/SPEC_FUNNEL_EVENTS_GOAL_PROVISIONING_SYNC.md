# SPEC: Funnel Events Goal Provisioning Sync

## GitHub Tracking
- **Epic Issue**: [#419](https://github.com/weppa-cloud/bukeer-studio/issues/419)
- **Child Issue**: [#493](https://github.com/weppa-cloud/bukeer-studio/issues/493)
- **Milestone**: ColombiaTours Growth OS 90D
- **Area**: growth

## Status
- **Author**: Codex + Growth engineering
- **Date**: 2026-05-11
- **Status**: Draft
- **ADRs referenced**: [[ADR-029]], [[ADR-005]], [[ADR-010]]
- **Cross-repo impact**: Shared Supabase configuration only. `bukeer-flutter` continues to emit CRM lifecycle events through `record_funnel_event`.

## Summary

Add a multi-tenant platform goal provisioning and synchronization layer so Bukeer Studio can create, map, verify, and monitor conversion goals across Google Ads, GA4, Meta, and future platforms from the canonical `funnel_events` matrix. `funnel_events` remains the event SOT; this spec governs platform goal setup, drift detection, and safe apply workflows.

## Motivation

The current Funnel Events SOT spec defines what events exist and how dispatch sends them to platforms, but it does not fully define how a tenant gets the required platform-side goals without manual work in each UI. That gap creates operational risk:

- Each tenant could have different conversion action names, IDs, or primary/secondary settings.
- Platform goals can drift from the canonical matrix.
- Future agents cannot safely optimize campaigns unless they know which platform goal maps to which canonical event.
- Manual setup does not scale across tenants, markets, and platforms.

This spec turns the canonical event matrix into a controlled provisioning workflow from Bukeer Studio.

## Principles

1. **Canonical matrix first.** Platform goals are derived from `funnel_events`, `event_destination_mapping`, and `optimization_policy`, not invented in platform UIs.
2. **Dry-run before mutation.** Every sync produces a plan before applying changes.
3. **Human approval for external mutation.** Creating/updating goals in ad platforms requires an explicit approval action.
4. **Tenant isolation.** Goal sync resolves credentials and account IDs through `account_channel_contracts` + `service_channels`; no global production credentials.
5. **Platform bindings are durable.** Every platform goal ID/action ID is stored in Supabase and tied to a canonical event.
6. **Drift is visible.** Studio must detect missing, duplicate, stale, legacy, and misconfigured goals.
7. **Clarity is not a conversion platform.** It receives analysis tags/context only; it does not get bidding goals.

## User Flows

### Flow 1: Tenant connects platform and previews goals
1. Owner connects Google Ads, GA4, Meta, and Clarity for a tenant in Bukeer Studio.
2. Studio reads the canonical funnel event matrix for the tenant.
3. Studio queries each platform read-only and compares current goals/actions/events to the desired state.
4. Studio shows a dry-run plan: create, update, keep, deprecate, warning, or blocked.
5. No external mutation happens until approval.

### Flow 2: Operator applies Google Ads goals
1. Operator reviews the dry-run plan for Google Ads.
2. Studio creates or updates canonical conversion actions.
3. Studio marks legacy GA4-imported goals as secondary/observation where safe.
4. Studio stores each platform action ID in `platform_goal_bindings`.
5. Dispatcher uses the binding for future uploads and diagnostics.

### Flow 3: Ongoing drift detection
1. A scheduled check pulls platform goal state.
2. Studio compares live platform state against `platform_goal_bindings` and the canonical matrix.
3. Drift is recorded in a provider run/health ledger.
4. Agents and humans can see whether bidding goals are healthy before campaign changes.

## Desired State Matrix

| Canonical event | Google Ads | GA4 | Meta | Clarity |
|-----------------|------------|-----|------|---------|
| `whatsapp_cta_click` | observation/secondary unless explicitly enabled | event only | `Contact` | tag/context |
| `waflow_submit` | primary lead conversion | `generate_lead` key event | `Lead` | tag/context |
| `crm_lead_stage_qualified` | primary or optimization-stage conversion | `qualify_lead` key event | `Lead` custom/context | tag/context |
| `crm_quote_sent` | primary or secondary by tenant policy | `begin_checkout` key event | `InitiateCheckout` | tag/context |
| `crm_booking_confirmed` | primary value conversion | `purchase` key event | `Purchase` | tag/context |
| `waflow_open` / `waflow_abandon` / validation events | observation only | diagnostic events | usually not dispatched | tag/context |

Final primary/secondary status is determined by `optimization_policy` plus tenant/market overrides.

## Acceptance Criteria

- [ ] AC1: `platform_goal_bindings` exists with tenant scope, canonical event, destination, platform account/customer/property IDs, platform goal/action IDs, desired status, live status, sync status, last verified timestamp, and drift reason.
- [ ] AC2: Goal provisioning dry-run can compare canonical desired state against live Google Ads, GA4, Meta, and Clarity configuration without mutating external platforms.
- [ ] AC3: Google Ads sync can create/update canonical conversion actions and record their IDs in `platform_goal_bindings`.
- [ ] AC4: Google Ads sync can identify legacy/duplicate/stale conversion actions and propose secondary/observation changes without deleting historical actions.
- [ ] AC5: Google Ads sync can inspect or plan account goals, campaign goals, and custom goals, and it never changes campaign bidding configuration without explicit approval.
- [ ] AC6: GA4 sync can verify/create/mark key events for canonical reporting events and record property bindings.
- [ ] AC7: Meta sync can verify Pixel/Dataset/CAPI readiness and canonical event/custom conversion availability, without duplicating Pixel+CAPI conversion counting.
- [ ] AC8: Clarity sync stores/validates project/tag context only and never treats Clarity as a conversion or bidding platform.
- [ ] AC9: Studio UI or API exposes a tenant-level health status: `healthy`, `watch`, `blocked`, with specific drift causes.
- [ ] AC10: Dispatcher and upload adapters resolve destination IDs from `platform_goal_bindings` or approved `event_destination_mapping.tenant_overrides`, never hardcoded global IDs.
- [ ] AC11: Production ColombiaTours dry-run evidence is posted to #419 and this child issue before any apply.
- [ ] AC12: Apply mode writes an audit record showing actor, tenant, platform, plan hash, mutations, provider responses, and rollback notes.

## Data Model Changes

| Table / View | Change | Notes |
|--------------|--------|-------|
| `platform_goal_bindings` | New table | Canonical event -> platform goal/action binding by tenant/account/website. |
| `platform_goal_sync_runs` | New table or provider-run profile | Stores dry-run/apply runs, plan hash, status, actor, provider response summaries. |
| `event_destination_mapping` | Extend usage | Remains delivery mapping; may point to binding keys or approved tenant overrides. |
| `account_channel_contracts` | Reuse | Credential/account config source for platform sync. |
| `growth_funnel_observability_v1` | Extend | Include goal binding health and drift state. |

Migration path: forward-only. Existing tenant overrides remain valid but should be reconciled into bindings over time.

### `platform_goal_bindings` minimum columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key. |
| `account_id` | uuid | Tenant account. |
| `website_id` | uuid nullable | Website-specific binding when applicable. |
| `canonical_event_name` | text | Example: `waflow_submit`. |
| `destination` | text | `google_ads`, `ga4`, `meta`, `clarity`, future platforms. |
| `platform_account_id` | text | Customer/ad account/property/project ID. |
| `platform_goal_id` | text nullable | Conversion action ID, key event name, custom conversion ID, etc. |
| `platform_goal_name` | text | Human-readable platform goal name. |
| `desired_status` | text | `primary`, `secondary`, `observation`, `diagnostic`, `disabled`. |
| `live_status` | text | Last observed live platform status. |
| `sync_status` | text | `healthy`, `watch`, `blocked`, `unknown`. |
| `drift_reason` | text nullable | Missing, duplicate, legacy, wrong_primary_status, credentials_missing, etc. |
| `config` | jsonb | Platform-specific non-secret config. |
| `last_synced_at` | timestamptz | Last dry-run or apply. |
| `last_verified_at` | timestamptz | Last live verification. |
| `created_at` / `updated_at` | timestamptz | Audit metadata. |

## API / Contract Changes

| Endpoint/RPC/Schema | Method | Payload | Notes |
|---------------------|--------|---------|-------|
| `GET /api/growth/platform-goals/status` | GET | tenant/website | Returns binding health and drift. |
| `POST /api/growth/platform-goals/dry-run` | POST | tenant, website, platforms | Read-only plan generation. |
| `POST /api/growth/platform-goals/apply` | POST | approved plan hash | Applies approved mutations; audit required. |
| `platform_goal_bindings` | DB | canonical mappings | Read by dispatcher/upload adapters. |
| `platform_goal_sync_runs` | DB | run/audit records | Dry-run/apply ledger. |

## Permissions (RBAC)

| Role | View status | Dry-run | Apply | Edit policy |
|------|-------------|---------|-------|-------------|
| super_admin | yes | yes | yes | yes |
| owner | yes | yes | approve if tenant owner | no |
| admin | yes | yes | no by default | no |
| agent | summary only | no | no | no |
| service_role | all | all | system-only | system-only |
| anon | no | no | no | no |

## Affected Files / Packages

| Path | Change | Description |
|------|--------|-------------|
| `supabase/migrations/*` | Create/modify | Bindings, sync runs, indexes, RLS. |
| `lib/growth/platform-goals/*` | Create | Desired-state compiler, provider adapters, diff planner. |
| `lib/funnel/destinations/google-ads.ts` | Modify | Resolve conversion action IDs from bindings. |
| `supabase/functions/dispatch-funnel-event/index.ts` | Modify | Read binding-aware destination config where needed. |
| `app/api/growth/platform-goals/*` | Create | Dry-run/apply/status API. |
| `components/admin` or Growth UI | Create/modify | Tenant goal health and approval flow. |
| `docs/ops/funnel-events-runbook.md` | Modify | Add goal sync runbook and rollback notes. |
| `docs/INDEX.md` | Modify | Add spec link. |

## Edge Cases & Error Handling

1. Platform credentials missing -> dry-run status `blocked`, no mutation.
2. Multiple matching conversion actions -> mark duplicate drift and require operator decision.
3. Platform API lacks a mutation endpoint -> store manual action requirement and verification query.
4. Campaign-level goal changes required -> plan only; explicit approval required before mutating campaign bidding or custom goals.
5. Existing tenant overrides conflict with bindings -> binding health becomes `watch` with conflict reason.
6. Provider API partial failure -> write audit record, keep previous binding active, surface retry plan.

## Out of Scope

- Automated campaign budget or bidding changes.
- Deleting historical conversion actions.
- Making GA4-imported conversions the primary Ads optimization signal.
- Cross-tenant shared platform credentials.
- TikTok/LinkedIn goal provisioning implementation; model must allow future adapters.

## Dependencies

- [[ADR-029]]
- [[SPEC_FUNNEL_EVENTS_SOT]]
- [[SPEC_FUNNEL_EVENTS_OBSERVABILITY_LAYER]]
- [[SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION]]
- GitHub Epic #419

## Rollout

- Feature flag: `PLATFORM_GOAL_SYNC_V1`
- Phase 1: read-only dry-run for ColombiaTours Google Ads + GA4.
- Phase 2: apply Google Ads conversion actions only, no campaign-goal mutation.
- Phase 3: GA4 key event sync.
- Phase 4: Meta Pixel/Dataset/CAPI/custom conversion verification.
- Phase 5: Studio UI health panel and scheduled drift detection.

Closure gate: ColombiaTours has healthy bindings for Google Ads, GA4, Meta, and Clarity context, with dry-run/apply evidence linked to #419 and no global production credentials.
