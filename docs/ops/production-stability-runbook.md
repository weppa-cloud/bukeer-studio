# Production stability runbook

Incident focus: Supabase/PostgREST/Realtime pressure from Chatwoot, public website SSR/blog, flow tracking, and itinerary/list RPCs.

## Fast health check

```sql
select * from public.production_stability_health;

select
  query,
  calls,
  round(total_exec_time::numeric, 1) as total_ms,
  round(mean_exec_time::numeric, 1) as mean_ms,
  round(max_exec_time::numeric, 1) as max_ms
from pg_stat_statements
where query ilike any(array[
  '%conversation_messages%created_at%',
  '%get_total_unread_count%',
  '%get_website_blog_post%',
  '%function_get_itineraries_with_agents_filter_v2%',
  '%get_popular_locations%',
  '%realtime.list_changes%',
  '%flow_events%'
])
order by total_exec_time desc
limit 20;
```

## Expected post-hotfix signals

- `conversation_messages account_id + created_at` mean should stay sub-second and max should not hit statement timeout.
- `get_total_unread_count` should use `conversation_unread_marks` instead of scanning message rows.
- Blog list pages should call `get_website_blog_post_summaries` and avoid full `content` payload.
- Chatwoot duplicate retries should return 200 `{ status: "duplicate" }`, not 409/23505.
- Realtime should not subscribe to `conversation_messages` from Flutter; `chatwoot_events` remains authoritative.
- Flow tracking flush cadence is 15s with 1 retry to reduce insert pressure.

## Rollback notes

- DB indexes are additive. Only re-add dropped redundant indexes if a query plan regression is proven.
- RPC rollback: restore previous `get_total_unread_count` and stop callers from using `get_website_blog_post_summaries`.
- Edge function rollback: revert `supabase/functions/chatwoot-webhook/index.ts` to direct insert path.
- Studio rollback: revert cache/RPC changes in `lib/supabase/get-website.ts` and `lib/supabase/get-pages.ts`.

## Guardrails

- Do not run `CREATE INDEX CONCURRENTLY` inside `apply_migration`; run it as standalone SQL or via CLI with autocommit.
- Do not loop Supabase MCP if connection errors recur. Wait/retry later or use dashboard/SQL editor.
- Never paste service role keys/tokens in logs or docs.
