# Security Policy

## Secrets

Never commit Meta, Supabase, GitHub, Google, or Brevo credentials.

Required production secret handling:

- Store `META_ACCESS_TOKEN_READ` and `META_ACCESS_TOKEN_WRITE` separately.
- Store `META_APP_SECRET` in a vault or CI secret store.
- Use `.env.mcp` only for local development.
- Rotate any token that was copied into source control, chat, screenshots, or logs.

## Write Safety

Production writes require all of the following:

- `META_MCP_MODE=live`
- `META_MCP_WRITES_ENABLED=true`
- role `operator` or `admin`
- approval token bound to the exact payload
- allowlisted ad account
- budget caps
- allowed landing domain

Campaigns, ad sets, and ads are created as `PAUSED`.

## Incident Response

1. Set `META_MCP_WRITES_ENABLED=false`.
2. Rotate write token.
3. Review `.mcp-meta-ads/audit/YYYY-MM-DD.jsonl`.
4. Review Supabase `meta_ads_mcp_audit_log` if enabled.
5. Pause any affected Meta entities.
6. Re-run `npm run eval` before re-enabling writes.
