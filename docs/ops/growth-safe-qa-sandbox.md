# Growth Safe QA Sandbox

Date: 2026-05-18
Owner: Growth Control Plane
Applies to: QA, data-audit, canary and validation workers for Growth Agents.

## Purpose

Prevent QA/ops/data-audit workers from accessing secrets while still allowing useful validation of Growth Control Plane behavior.

This runbook was created after a Phase 1 QA worker attempted to inspect Supabase service-role/API-key material from temporary files. The correct response was to kill the worker, remove temp key files, and continue with read-only/operator evidence.

## Rule

QA validates behavior. QA does not own credentials.

## Allowed inputs

QA/data-audit/canary workers may use:

- committed repo files in the assigned worktree,
- synthetic fixtures,
- committed SQL dry-run scripts,
- committed validation docs,
- non-sensitive command outputs supplied by Neo/operator,
- read-only MCP query summaries with secrets removed.

## Forbidden inputs

QA/data-audit/canary workers must not read, print, parse, copy, summarize or partially reveal:

- `/opt/data/.env`,
- Supabase service-role keys,
- API keys or provider tokens,
- auth stores,
- git remotes with embedded credentials,
- `/tmp/*key*`, `/tmp/*secret*`, `/tmp/*token*`,
- profile auth files,
- production write credentials.

Partial key output is also forbidden. Length, prefix, suffix, checksum or “first/last N chars” counts as secret probing.

## Execution pattern

### Preferred

```text
Neo/operator -> read-only MCP/query/tool -> redacted evidence -> QA validates docs/tests/gates
```

### Avoid

```text
QA worker -> source full env -> inspect key files -> call production DB/provider
```

## Worker prompt guardrail

Every Growth QA/data-audit/canary task should include:

```text
Do not read/print .env, service_role, API keys, tokens, auth files, git remote credentials, or temp secret files. If privileged data is needed, stop and request read-only operator evidence. No provider calls, no prod writes, no publish.
```

## Kill criteria

Terminate the worker if it:

1. tries to inspect secret files,
2. asks for service-role credentials,
3. prints key prefixes/suffixes/lengths/checksums,
4. attempts provider calls outside the ContextPacket contract,
5. attempts production writes/backfills/publish without an approved ops lane.

Then:

1. remove any temp secret files created during the run,
2. comment the Kanban task with reason,
3. continue via operator gate or constrained worker,
4. materialize the lesson in learning docs/facts.

## Recommended profile hardening

Create a future constrained QA profile/lane with:

- no inherited full `/opt/data/.env`,
- no service-role key,
- no provider write credentials,
- repo/worktree read-only by default,
- allowlisted commands only for tests/typecheck/read-only scripts,
- explicit MCP read-only evidence supplied by operator.

Until that exists, Growth Control Plane T4/T5 audits should use `tech-validator` or operator-gated read-only evidence instead of unconstrained `qa-engineer`.

## Relationship to ContextPacket gate

The QA sandbox does not relax Growth gates. It reinforces them:

- no verified `source_refs` -> block,
- unknown freshness -> block,
- unknown policy -> block,
- implicit locale/market fallback -> block,
- missing permission -> block.

A blocked canary with correct evidence is a PASS for safety.
