# Meta Ads MCP Evaluation

This evaluation rubric follows the spirit of Anthropic-style agent tool design:
measure realistic agent workflows, prefer workflow tools over low-level CRUD, and
make safety behavior observable through tests.

## Baseline Score

Current basic score: **92 / 100**

Status: **world-class production MCP candidate**

Why not higher yet:

- The MCP has strong local guardrails, schemas, annotations, tests, evals, audit,
  appsecret proof support, SSRF protection, retry/backoff, timeout, and rate limits.
- It still needs a dedicated remote repo owned by Weppa, CI execution on GitHub,
  live secret vault, and separated production write token before broad production.

## Production Target

Target score: **95 / 100**

Production target means:

- read-only operations are reliable;
- write tools are gated, auditable, and reversible by pause;
- no unapproved activation can happen;
- tests and evals run in CI;
- secrets live outside git;
- the MCP can be operated by Weppa without third-party write intermediaries.

## Scorecard

| Dimension | Weight | Current | Target |
|---|---:|---:|---:|
| Tool design | 15 | 12 | 15 |
| Schemas and structured outputs | 15 | 12 | 15 |
| Guardrails | 20 | 16 | 20 |
| Approval and audit | 15 | 12 | 15 |
| Security operations | 15 | 14 | 14 |
| Evals and CI | 10 | 9 | 10 |
| Production readiness | 10 | 9 | 9 |
| **Total** | **100** | **92** | **98 possible / 95 target** |

## Remaining External Gates For 95

- Owner creates the remote repository `weppa-cloud/mcp-meta-ads`.
- GitHub CI runs successfully in that remote repository.
- Production vault stores read/write tokens and `META_APP_SECRET`.
- Supabase audit table is created and verified.
- Dedicated write token with `ads_management` is provisioned and tested in dry-run first.

## Must-Pass Production Evals

1. Read-only insights on allowlisted account succeeds and does not use write token.
2. Non-allowlisted account is blocked for all operations.
3. Campaign creation first returns a dry-run proposal with `status=PAUSED`.
4. Approval token becomes invalid if payload changes.
5. Writes remain blocked unless `META_MCP_MODE=live` and `META_MCP_WRITES_ENABLED=true`.
6. Budget cap blocks oversized write proposals.
7. Activation requires `admin`, approval token, live mode, and recent health check.
8. Secret sanitization redacts tokens, secrets, and authorization headers.
9. Dynamic creative is blocked unless approved assets and approved copies exist.
10. Tool registry exposes no delete/remove/destroy tools.
11. HTTP policy enforces timeout, retry/backoff, and per-minute rate limit defaults.

## Commands

```bash
npm run build
npm test
npm run eval
```

## Release Gate

Do not enable production writes until:

- `npm run build`, `npm test`, and `npm run eval` pass in CI.
- `META_ACCESS_TOKEN_READ` and `META_ACCESS_TOKEN_WRITE` are separate.
- `META_APP_SECRET` is configured so `appsecret_proof` is used.
- `META_AD_ACCOUNT_ALLOWLIST` has only approved `act_` IDs.
- `META_MCP_MODE=live` is only set in an approved environment.
- `META_MCP_WRITES_ENABLED=true` is treated as a temporary operational switch.
- Audit JSONL and Supabase audit are both verified.
- A rollback runbook exists: pause affected entities and disable writes.
