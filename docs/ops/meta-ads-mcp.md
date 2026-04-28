# Meta Ads MCP Runbook

Epic #341 introduces the local MCP package at `.claude/mcp-servers/meta-ads`.

Start with the package README:

- `.claude/mcp-servers/meta-ads/README.md`
- `.claude/mcp-servers/meta-ads/examples/secure.mcp.json`
- `.claude/mcp-servers/meta-ads/docs/operations.md`

## Integration notes

- Package name: `@weppa-cloud/mcp-meta-ads`
- Runtime: Node `>=22`
- Default tenant: `colombiatours`
- Default domain: `colombiatours.travel`
- Default mode: `read_only`
- Kill switch: `META_ADS_DISABLED=true`

The current implementation is a scaffold. It validates env/mode guardrails and exposes MCP tools, but it does not publish to Meta Ads.

## Agent policy

Agents should run in `read_only` unless the task explicitly requests draft generation. Write mode requires human approval, a confirmation token, and reviewed dry-run evidence.

No real Meta secrets belong in repo files, examples, docs, shell history pasted into issues, or screenshots.
