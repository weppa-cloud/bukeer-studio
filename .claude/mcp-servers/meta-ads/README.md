# @weppa-cloud/mcp-meta-ads

First-party Meta Ads MCP server for Bukeer Growth and ColombiaTours.

## Safety Model

- Read-only analytics first.
- Draft planning before writes.
- All created campaigns, ad sets, and ads start `PAUSED`.
- Writes require human approval tokens.
- `dry-run` and kill switch are enabled by default.
- Audit logs are written locally, with optional Supabase mirroring.
- There are no delete tools in v1.

## Install

```bash
cd .claude/mcp-servers/meta-ads
npm install
npm run build
```

## Environment

Copy `.env.example` and fill values outside git.

Required:

- `META_ACCESS_TOKEN_READ`
- `META_AD_ACCOUNT_ALLOWLIST`

Writes remain blocked unless both are true:

```env
META_MCP_MODE=live
META_MCP_WRITES_ENABLED=true
```

Never commit access tokens. If a Meta token was committed in any repo, rotate it before using this MCP.

## Approval Flow

1. Call a write tool without `approvalToken`.
2. The MCP returns a dry-run proposal and `approvalToken`.
3. Review the proposed payload.
4. Call the same tool again with the same payload, `confirm=true`, and `approvalToken`.

Changing the payload invalidates the approval token.

## Tool Groups

Read-only: `meta_health_check`, account/campaign/adset/ad/creative listing, insights, comparisons, and audits.

Drafts: campaign plan generation, validation, budget risk, UTM/tracking and policy checks.

Guarded writes: create campaign/ad set/ad paused, budget update, pause, and admin-only activation.

Meta AI / Advantage: readiness, settings audit, Advantage plan, dynamic creative tests, creative feature toggles, and manual-vs-Advantage comparison.

## Submodule Plan

The intended long-term layout is:

```txt
bukeer-studio/
└── .claude/mcp-servers/meta-ads  ->  weppa-cloud/mcp-meta-ads
```

Once an owner creates `weppa-cloud/mcp-meta-ads`, move this implementation there and connect it with:

```bash
git submodule add https://github.com/weppa-cloud/mcp-meta-ads.git .claude/mcp-servers/meta-ads
git submodule update --init --recursive
```
