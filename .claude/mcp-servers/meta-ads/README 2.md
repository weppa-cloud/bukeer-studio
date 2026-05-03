# mcp-meta-ads

Local MCP server scaffold for Meta Ads operations in the Bukeer / Weppa Cloud stack. The package is intentionally conservative: it boots as an MCP stdio server, exposes a small tool registry, validates env configuration, and enforces read-only / draft / write guardrails before any future Meta Graph API implementation.

No real secrets are stored in this package.

## Purpose

- Give Claude Code, Codex, and other MCP clients a single integration point for Meta Ads work.
- Keep ColombiaTours campaign work inside a safe workflow: inspect, draft, review, then guarded write.
- Make dangerous operations easy to disable with a kill switch.
- Keep token rotation and submodule installation documented before the first production write path exists.

## Install

```bash
cd .claude/mcp-servers/meta-ads
npm install
npm run build
npm test
```

Runtime requires Node `>=22`.

## Environment

Copy `.env.example` into your local secret manager, shell profile, direnv file, or MCP client environment. Do not commit real values.

| Variable | Required | Notes |
|----------|----------|-------|
| `META_ADS_DISABLED` | Optional | Set `true` for the global kill switch. Tools will return disabled/errors without API calls. |
| `META_ADS_MODE` | Yes | `read_only`, `draft`, or `write`. Default is `read_only`. |
| `META_ADS_API_VERSION` | Yes for API calls | Keep explicit, for example `vXX.X`; review during Meta API upgrades. |
| `META_ADS_ACCESS_TOKEN` | Yes for API calls | Store only in a secret manager or local env. |
| `META_ADS_APP_ID` | Optional scaffold | App id used by future diagnostics. |
| `META_ADS_BUSINESS_ID` | Optional scaffold | Business Manager id used by future account checks. |
| `META_ADS_AD_ACCOUNT_ID` | Yes for account tools | Use `act_...` format. |
| `META_ADS_WRITE_CONFIRMATION` | Required in write mode | Random local string that callers must echo on write tools. |
| `META_ADS_DEFAULT_TENANT` | Optional | Defaults to `colombiatours`. |
| `META_ADS_DEFAULT_DOMAIN` | Optional | Defaults to `colombiatours.travel`. |

## Register in Claude Code / Codex

Use the safe example in [`examples/secure.mcp.json`](examples/secure.mcp.json). The important bit is that secrets are references, not literals:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "node",
      "args": [".claude/mcp-servers/meta-ads/dist/index.js"],
      "env": {
        "META_ADS_MODE": "read_only",
        "META_ADS_DISABLED": "${META_ADS_DISABLED}",
        "META_ADS_API_VERSION": "${META_ADS_API_VERSION}",
        "META_ADS_ACCESS_TOKEN": "${META_ADS_ACCESS_TOKEN}",
        "META_ADS_AD_ACCOUNT_ID": "${META_ADS_AD_ACCOUNT_ID}"
      }
    }
  }
}
```

Recommended local flow:

```bash
export META_ADS_DISABLED=false
export META_ADS_MODE=read_only
export META_ADS_API_VERSION=vXX.X
export META_ADS_ACCESS_TOKEN="from-secret-manager"
export META_ADS_AD_ACCOUNT_ID="act_example"
```

Then restart the MCP client so the server picks up the environment.

## Tools

| Tool | Mode | Network | Purpose |
|------|------|---------|---------|
| `meta_ads_status` | any | no | Reports mode, kill switch, missing config, and write guard setup. |
| `meta_ads_account_snapshot` | read-only+ | no in scaffold | Reserved for account/campaign diagnostics. |
| `meta_ads_draft_campaign` | draft/write | no | Builds a reviewable campaign draft payload. Never publishes. |
| `meta_ads_publish_draft` | write | no in scaffold | Guarded placeholder for future writes. Requires confirmation token. |

The current package is a scaffold. The publish tool intentionally returns `not_implemented` even in write mode.

## ColombiaTours defaults

The default tenant/domain are:

- `META_ADS_DEFAULT_TENANT=colombiatours`
- `META_ADS_DEFAULT_DOMAIN=colombiatours.travel`

Use these defaults for ColombiaTours Growth OS work unless a task explicitly says otherwise. Campaign drafts should point at canonical public URLs and use UTM conventions from the Bukeer Studio growth attribution docs.

## Safe workflow

1. **Read-only:** set `META_ADS_MODE=read_only`. Inspect status and future reporting tools. No drafts or writes.
2. **Draft:** set `META_ADS_MODE=draft`. Generate local payloads for campaign, ad set, creative, and tracking review. Nothing is sent to Meta.
3. **Write:** set `META_ADS_MODE=write` only after human approval, reviewed diff/evidence, and a matching `META_ADS_WRITE_CONFIRMATION`. Keep the kill switch ready.

Any future write tool must require:

- `META_ADS_MODE=write`
- matching confirmation input
- explicit target account/campaign id in the tool arguments
- dry-run payload logged to stderr or returned to the caller before publish

## Kill switch

Set:

```bash
export META_ADS_DISABLED=true
```

Restart the MCP client. With the kill switch enabled, `meta_ads_status` still works and reports disabled state; operational tools stop before any external call can be made.

Use this during incidents, unexpected spend, token suspicion, policy review, or when multiple agents are operating in the repo and the write window is closed.

## Token rotation

1. Set `META_ADS_DISABLED=true` and restart MCP clients.
2. Revoke or invalidate the old token in Meta Business tooling.
3. Generate the replacement token with the minimum scopes needed for the current mode.
4. Update the secret manager or local shell env. Do not edit tracked files with token values.
5. Run `meta_ads_status` and future read-only diagnostics.
6. Re-enable with `META_ADS_DISABLED=false`.
7. For write windows, rotate `META_ADS_WRITE_CONFIRMATION` separately from the access token.

## Submodule usage

This directory can later move to a dedicated repo and be consumed as a git submodule:

```bash
git submodule add git@github.com:weppa-cloud/mcp-meta-ads.git .claude/mcp-servers/meta-ads
git submodule update --init --recursive
cd .claude/mcp-servers/meta-ads && npm install && npm run build
```

Pin submodule updates in normal PRs and include release notes for any new write capability.

## Local files

```text
.claude/mcp-servers/meta-ads/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── docs/
│   ├── operations.md
│   └── submodule.md
├── examples/
│   └── secure.mcp.json
└── src/
    ├── config.ts
    ├── config.test.ts
    ├── index.ts
    ├── safety.ts
    └── tools.ts
```

Build output (`dist/`) and dependencies (`node_modules/`) are ignored by the repo root `.gitignore`.
