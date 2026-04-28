# Meta Ads MCP Evaluation

This evaluation rubric follows the spirit of Anthropic-style agent tool design:
measure realistic agent workflows, prefer workflow tools over low-level CRUD, and
make safety behavior observable through tests.

## Baseline Score

Current basic score: **76 / 100**

Status: **controlled production candidate**

Why not higher yet:

- The MCP has strong local guardrails, schemas, annotations, tests, and audit.
- It still needs a dedicated remote repo, CI, release workflow, live secret vault,
  separated write token, and operational rate-limit/retry policy before broad production.

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
| Security operations | 15 | 10 | 14 |
| Evals and CI | 10 | 7 | 10 |
| Production readiness | 10 | 7 | 9 |
| **Total** | **100** | **76** | **98 possible / 95 target** |

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
