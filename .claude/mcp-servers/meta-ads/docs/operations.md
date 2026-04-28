# Meta Ads MCP Operations

## Safe Rollout

1. Run read-only tools against one allowlisted account.
2. Run draft tools and review generated plans.
3. Add a write token but keep `META_MCP_MODE=dry-run`.
4. Test approval flow.
5. Switch to `META_MCP_MODE=live` only when ready.
6. Keep `META_MCP_WRITES_ENABLED=false` as the emergency default.

## Audit Table

```sql
create table if not exists meta_ads_mcp_audit_log (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  actor text,
  tool text not null,
  role text,
  account_id text,
  input jsonb,
  diff jsonb,
  dry_run boolean,
  approval_token_hash text,
  meta_response jsonb,
  error_category text,
  result_id text,
  outcome text not null,
  duration_ms integer
);
```

## Token Rotation

Rotate immediately when a token was committed to git, access changes, Meta reports suspicious activity, or the MCP host changes.
