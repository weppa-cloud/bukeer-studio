# Production Gate

This MCP can be considered production-ready for client budget only when every
gate below is satisfied.

## Code Gates

- `npm run build` passes.
- `npm test` passes.
- `npm run eval` passes.
- No tool name contains `delete`, `remove`, or `destroy`.
- All write tools produce a dry-run approval proposal before touching Meta.
- All create operations force `status=PAUSED`.
- Activation requires `admin`, approval, live mode, and recent health check.

## Operational Gates

- Remote repo exists: `angelaaragon48-droid/mcp-meta-ads`.
- CI runs on pull requests and `main`.
- Release tags are created only after build, tests, and evals.
- `META_ACCESS_TOKEN_READ` is separate from `META_ACCESS_TOKEN_WRITE`.
- `META_APP_SECRET` is configured.
- `META_AD_ACCOUNT_ALLOWLIST` contains only approved accounts.
- Supabase audit table has been created and tested.
- Rollback owner knows how to disable writes and pause entities.

## Score Target

- Local technical score target: `95/100`.
- Operational production score target: `95/100`.

The local code can satisfy the technical target. The operational score is not
complete until vault, write token, app secret, and Supabase audit are verified
in the production environment.
