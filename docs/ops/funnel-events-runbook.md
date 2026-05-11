# Funnel Events Dispatcher Runbook

Operational owner: Studio growth engineering.

Scope: `funnel_events` as the source of truth, `dispatch-funnel-event` Edge Function, Meta CAPI replay, dashboard validation, rollback, and post-cutover evidence for #423/#456. This runbook does not cover schema migrations or app route changes.

## Prerequisites

- Production `.env.local` or shell env has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase Edge Function `dispatch-funnel-event` is deployed.
- `event_destination_mapping` has enabled `meta` or `meta_messaging` rows for the funnel events being replayed.
- `service_channels` has the `meta_capi` contract seed.
- Each tenant that should send Meta CAPI has an active `account_channel_contracts` row for `meta_capi`; the browser Pixel remains in `websites.analytics.facebook_pixel_id`, and the CAPI access token stays in `account_channel_contracts.credentials_encrypted`.
- Operator has access to Supabase SQL editor and platform logs.

Do not run unbounded production replay. Always set `--since`, `--until`, and a conservative `--limit` for the first pass.

## Multi-tenant Meta Config

Production dispatch resolves Meta in this order:

1. `websites.analytics.facebook_pixel_id` for the public browser Pixel ID.
2. Active tenant channel config in `account_channel_contracts` joined to `service_channels.code='meta_capi'`.
3. `account_channel_contracts.credentials_encrypted.meta_access_token` or `access_token` for the CAPI token.
4. `account_channel_contracts.config.api_version` and `test_event_code` for optional per-tenant knobs.

Global `META_PIXEL_ID` and `META_ACCESS_TOKEN` are not production multi-tenant config. They are valid only for local/test or when `FUNNEL_META_LEGACY_ENV_FALLBACK_ACCOUNT_IDS` explicitly names the rollout tenant.

Tenant readiness query:

```sql
select
  w.subdomain,
  w.analytics->>'facebook_pixel_id' as browser_pixel_id,
  sc.code as channel_code,
  acc.is_active,
  acc.config,
  acc.credentials_encrypted ? 'meta_access_token'
    or acc.credentials_encrypted ? 'access_token'
    or acc.credentials_encrypted ? 'conversions_api_access_token' as has_capi_token
from public.websites w
left join public.account_channel_contracts acc
  on acc.account_id = w.account_id
 and acc.is_active = true
left join public.service_channels sc
  on sc.id = acc.channel_id
 and sc.code = 'meta_capi'
where w.subdomain = 'colombiatours';
```

Expected before Meta certification: browser Pixel present, `meta_capi` active, and `has_capi_token=true`.

## Replay CLI

Dry-run is the default. It reads `funnel_events`, joins by destination event id (`pixel_event_id` fallback `event_id`) against `meta_conversion_events`, and reports candidates where the Meta log is missing or has replayable status.

```bash
npm run dispatch:replay -- \
  --destination=meta \
  --since=2026-05-08T13:00:00Z \
  --until=2026-05-08T14:00:00Z \
  --limit=100 \
  --out-dir=artifacts/funnel-events/replay-2026-05-08-dry-run
```

Apply mode reopens only selected rows whose `dispatch_status` is `dispatched` or `failed`, invokes the existing dispatcher, and leaves the dispatcher to write the final status.

```bash
npm run dispatch:replay -- \
  --destination=meta \
  --since=2026-05-08T13:00:00Z \
  --until=2026-05-08T14:00:00Z \
  --limit=25 \
  --out-dir=artifacts/funnel-events/replay-2026-05-08-apply \
  --apply
```

Useful filters:

```bash
# Single website.
npm run dispatch:replay -- --destination=meta --website-id=<uuid> --since=<iso> --until=<iso>

# Single event class.
npm run dispatch:replay -- --destination=meta --event-name=waflow_submit --since=<iso> --until=<iso>

# Replay only failed logs, not skipped logs or missing logs.
npm run dispatch:replay -- --destination=meta --statuses=failed --include-missing=false --since=<iso> --until=<iso>
```

Replay acceptance:

- Dry-run candidate count matches the incident window and the affected event names.
- First apply batch uses `--limit=25` or lower.
- Apply result has `failed=0`.
- Follow-up dry-run for the same window returns `candidates=0`, or every remaining candidate has a documented platform/config reason.

## Production Smoke

Run immediately after deployment or feature flag enablement.

1. Confirm dispatcher health from a bounded recent window:

```sql
select
  dispatch_status,
  count(*) as events,
  max(dispatch_attempted_at) as last_attempt_at
from public.funnel_events
where created_at >= now() - interval '2 hours'
group by dispatch_status
order by dispatch_status;
```

2. Confirm Meta log writes:

```sql
select
  status,
  count(*) as logs,
  max(created_at) as latest_log_at
from public.meta_conversion_events
where provider = 'meta'
  and created_at >= now() - interval '2 hours'
group by status
order by status;
```

3. Confirm a fresh event joins to a Meta log by the platform dedup id:

```sql
select
  fe.event_name as funnel_event_name,
  fe.event_id as funnel_event_id,
  coalesce(fe.pixel_event_id, fe.event_id) as destination_event_id,
  fe.dispatch_status,
  mce.event_name as meta_event_name,
  mce.status as meta_status,
  mce.sent_at,
  mce.error,
  mce.trace->>'dispatch_config_reason' as dispatch_config_reason
from public.funnel_events fe
left join public.meta_conversion_events mce
  on mce.provider = 'meta'
 and mce.event_id = coalesce(fe.pixel_event_id, fe.event_id)
where fe.created_at >= now() - interval '2 hours'
order by fe.created_at desc
limit 25;
```

4. Run replay dry-run against the same two-hour window. Expected: no large candidate count; any candidate has an explainable `skipped` config reason.

```bash
npm run dispatch:replay -- \
  --destination=meta \
  --since="$(date -u -v-2H +%Y-%m-%dT%H:%M:%SZ)" \
  --until="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --limit=100
```

## Dashboard SQL

Daily volume by funnel event:

```sql
select
  date_trunc('day', occurred_at) as day,
  event_name,
  source,
  count(*) as events
from public.funnel_events
where occurred_at >= now() - interval '14 days'
group by 1, 2, 3
order by 1 desc, 2, 3;
```

## Platform Goal Sync (F7)

`funnel_events` remains the source of truth for what happened. Platform goal
sync governs the destination-side setup: Google Ads conversion actions, GA4 key
events, Meta Pixel/Dataset/CAPI readiness, and Clarity context. This layer is
tracked by [SPEC_FUNNEL_EVENTS_GOAL_PROVISIONING_SYNC](../specs/SPEC_FUNNEL_EVENTS_GOAL_PROVISIONING_SYNC.md)
and issue #493.

Operational rule:

- Always run dry-run first.
- Do not mutate Google Ads campaign bidding, campaign goals, custom goals, or
  platform conversion settings without explicit human approval.
- Do not use global production credentials. Tenant credentials and account IDs
  resolve through `account_channel_contracts`, `service_channels`,
  `seo_integrations`, and `websites.analytics`.
- Clarity is diagnostic only; it never becomes a bidding or conversion goal.

### Dry-run API

```bash
curl -sS -X POST "$BASE_URL/api/growth/platform-goals/dry-run" \
  -H "content-type: application/json" \
  -b "$AUTH_COOKIE" \
  --data '{
    "website_id": "<website_uuid>",
    "platforms": ["google_ads", "ga4", "meta", "clarity"]
  }'
```

Expected response:

- `plan.summary.create`: bindings/goals that need to be created.
- `plan.summary.update`: existing bindings with status/name/account drift.
- `plan.summary.blocked`: provider credentials/config missing.
- `plan.planHash`: immutable approval handle for future apply.
- `runId`: audit row in `platform_goal_sync_runs`.

### Status API

```bash
curl -sS "$BASE_URL/api/growth/platform-goals/status?website_id=<website_uuid>&platform=google_ads&platform=ga4" \
  -b "$AUTH_COOKIE"
```

Health meanings:

| Health | Meaning |
|--------|---------|
| `healthy` | All known bindings are aligned. |
| `watch` | Bindings exist but some desired/live state drift remains. |
| `blocked` | Credentials/account mismatch/missing provider config blocks sync. |
| `unknown` | No bindings have been created yet. |

## GA4 Measurement Protocol Checks

GA4 is an observability/reporting destination. It is not the conversion source
of truth; `funnel_events` remains authoritative for agents, CRM correlation,
and paid-media optimization.

Tenant config resolution:

- Browser GA4/page tracking may continue through public website analytics.
- Server-side GA4 Measurement Protocol uses `seo_integrations` for the tenant:
  `property_id`, `metadata.measurement_id`, and the Measurement Protocol secret
  in `api_token`.
- Do not put production GA4 API secrets in docs, GitHub comments, or
  `websites.analytics`. Env fallback is local/test only.

Production smoke query:

```sql
select
  event_name,
  status,
  measurement_id,
  property_id,
  error,
  created_at,
  updated_at
from public.ga4_measurement_protocol_events
where funnel_event_id = '<funnel_events.event_id>'
order by created_at desc;
```

ColombiaTours evidence from 2026-05-11:

- `dispatch-funnel-event` deployed with `FUNNEL_GA4_MP_DISPATCH_V1=true`.
- Real event `crm_quote_sent` / `PRICIN-1105-TV55` dispatched to GA4 as
  `begin_checkout`.
- `ga4_measurement_protocol_events.status = 'sent'` for measurement ID
  `G-6ET7YRM7NS`, property `294486074`.
- Platform goal dry-run `b7a87cc8-8d5c-494a-8f40-26a04d5acbb9` returned 38
  desired, 38 keep, 0 watch, 0 blocked.

### Apply Gate

The apply endpoint is intentionally gated until provider mutation adapters are
implemented. Current behavior records an audit attempt and returns
`PROVIDER_APPLY_NOT_IMPLEMENTED`.

```bash
curl -sS -X POST "$BASE_URL/api/growth/platform-goals/apply" \
  -H "content-type: application/json" \
  -b "$AUTH_COOKIE" \
  --data '{
    "website_id": "<website_uuid>",
    "plan_hash": "<dry_run_plan_hash>",
    "confirmation": "APPLY_PLATFORM_GOALS"
  }'
```

This prevents a partial implementation from silently mutating external
platforms. Provider apply adapters must be implemented and tested per platform
before this gate is opened.

### Binding Resolution

Google Ads upload resolution now checks, in order:

1. explicit runtime override used by tests;
2. `platform_goal_bindings.platform_goal_id`;
3. legacy `event_destination_mapping.tenant_overrides[account_id].conversion_action_id`.

The legacy fallback keeps production stable while tenants are migrated to F7
bindings.

Day-over-day drop monitor. Alert when `drop_ratio <= -0.50` and yesterday had at least 10 events.

```sql
with daily as (
  select
    date_trunc('day', occurred_at)::date as day,
    event_name,
    count(*) as events
  from public.funnel_events
  where occurred_at >= current_date - interval '8 days'
  group by 1, 2
),
paired as (
  select
    today.day,
    today.event_name,
    today.events as today_events,
    yesterday.events as yesterday_events,
    case
      when yesterday.events > 0
        then (today.events - yesterday.events)::numeric / yesterday.events
      else null
    end as drop_ratio
  from daily today
  left join daily yesterday
    on yesterday.event_name = today.event_name
   and yesterday.day = today.day - interval '1 day'
)
select *
from paired
where day = current_date
order by drop_ratio asc nulls last, event_name;
```

Failed dispatches by hour. Alert if any hour has more than 10 failures.

```sql
select
  date_trunc('hour', dispatch_attempted_at) as hour,
  event_name,
  count(*) as failed_events
from public.funnel_events
where dispatch_status = 'failed'
  and dispatch_attempted_at >= now() - interval '24 hours'
group by 1, 2
having count(*) > 10
order by 1 desc, 3 desc;
```

Meta parity for the last 24 hours:

```sql
with funnel as (
  select
    event_name,
    count(*) as funnel_events
  from public.funnel_events
  where occurred_at >= now() - interval '24 hours'
  group by 1
),
meta as (
  select
    fe.event_name,
    count(*) filter (where mce.status = 'sent') as meta_sent,
    count(*) filter (where mce.status = 'failed') as meta_failed,
    count(*) filter (where mce.status = 'skipped') as meta_skipped,
    count(*) filter (where mce.event_id is null) as meta_missing
  from public.funnel_events fe
  left join public.meta_conversion_events mce
    on mce.provider = 'meta'
   and mce.event_id = coalesce(fe.pixel_event_id, fe.event_id)
  where fe.occurred_at >= now() - interval '24 hours'
  group by fe.event_name
)
select
  funnel.event_name,
  funnel.funnel_events,
  coalesce(meta.meta_sent, 0) as meta_sent,
  coalesce(meta.meta_failed, 0) as meta_failed,
  coalesce(meta.meta_skipped, 0) as meta_skipped,
  coalesce(meta.meta_missing, 0) as meta_missing,
  round(coalesce(meta.meta_sent, 0)::numeric / nullif(funnel.funnel_events, 0), 4) as sent_ratio
from funnel
left join meta using (event_name)
order by sent_ratio asc nulls last, funnel.event_name;
```

Replay candidates by reason:

```sql
select
  fe.event_name,
  fe.dispatch_status,
  coalesce(mce.status, 'missing_meta_log') as meta_status,
  count(*) as events
from public.funnel_events fe
left join public.meta_conversion_events mce
  on mce.provider = 'meta'
 and mce.event_id = coalesce(fe.pixel_event_id, fe.event_id)
where fe.occurred_at >= now() - interval '24 hours'
  and (mce.event_id is null or mce.status in ('skipped', 'failed'))
group by 1, 2, 3
order by events desc;
```

## Rollback

Primary rollback is operational: stop dispatching to external platforms while preserving first-party `funnel_events` writes.

1. Disable the dispatcher feature flag/config used by the deployment. If flags live in DB config, set `funnel_events_dispatcher_v1=false`. If using environment config, deploy with Meta CAPI disabled or missing only in the dispatcher environment.

2. Pause cron replay if failures are being amplified:

```sql
select cron.unschedule('funnel_events_redispatch');
```

3. Verify new funnel rows continue to be written:

```sql
select count(*) as new_funnel_events
from public.funnel_events
where created_at >= now() - interval '15 minutes';
```

4. Verify external dispatch has stopped or is only logging expected skips:

```sql
select status, count(*)
from public.meta_conversion_events
where created_at >= now() - interval '15 minutes'
group by status;
```

5. Preserve replay window:

```sql
select
  min(created_at) as rollback_window_start,
  max(created_at) as rollback_window_end,
  count(*) as pending_or_failed
from public.funnel_events
where created_at >= now() - interval '2 hours'
  and dispatch_status in ('pending', 'failed');
```

6. Re-enable by fixing config, redeploying the Edge Function if needed, re-scheduling cron from the canonical migration definition, and running replay dry-run before any apply.

Rollback decision table:

| Symptom | Action |
| --- | --- |
| `dispatch_status='failed'` > 10/hour and Meta is healthy | Disable dispatcher, pause cron, inspect `meta_conversion_events.error`, fix forward, replay bounded window. |
| Meta CAPI credentials missing or disabled | Keep writes on, fix Edge Function env, replay rows with `meta_log_skipped`. |
| Candidate replay count unexpectedly large | Stop. Narrow by `--event-name` / `--website-id`, verify mapping, and run a 25-row apply batch first. |
| Duplicate Meta logs detected | Do not replay. Check unique constraints and `pixel_event_id` pairing before any apply. |

## Evidence Checklist

### 24 hours after cutover

- [ ] Production smoke SQL captured with timestamp and operator.
- [ ] `dispatch_status='failed'` count is `0`, or every failure has a linked incident.
- [ ] Meta parity query shows `sent_ratio >= 0.95` for mapped high-volume event names.
- [ ] Replay dry-run for last 24 hours saved under `artifacts/funnel-events/<date>-24h/`.
- [ ] No direct app route or browser path is calling platform APIs outside the dispatcher.
- [ ] Dashboard/alert screenshots or query exports saved for daily volume, failed dispatches, and replay candidates.
- [ ] Any skipped Meta logs are expected config skips, not payload errors.

### 7 days after cutover

- [ ] Seven daily volume rows exist for each active mapped event name/source pair.
- [ ] Day-over-day drop monitor has no unexplained `<= -50%` drops.
- [ ] Failed dispatch alert stayed below threshold, or incidents were resolved with replay evidence.
- [ ] 7-day Meta parity remains `>= 0.95` for mapped high-volume event names.
- [ ] At least one replay drill was run in dry-run mode and documented.
- [ ] Rollback procedure was reviewed against current cron/function names.
- [ ] Evidence bundle links are added to #423/#456 before closure.
