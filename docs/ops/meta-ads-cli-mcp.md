# Meta Ads CLI MCP

Runbook for the local `meta-ads-cli` MCP used by Codex Desktop while the official remote Meta MCP OAuth flow is blocked for Codex.

## Surfaces

- Official remote MCP: `https://mcp.facebook.com/ads`
- Local project MCP: `meta-ads`
- Local server: `scripts/mcp/meta-ads-cli-server.mjs`
- CLI wrapper: `scripts/meta-ads-cli.sh`

The local MCP wraps the official `meta` Ads CLI installed on the workstation and loads `.env.local` plus `.env.mcp`. The repo-level source of truth is `.mcp.json`; personal `~/.codex/config.toml` entries are optional fallbacks only.

## Codex Desktop

Open Codex Desktop from this workspace so it can read `.mcp.json`.

If a local Codex installation does not load project-scoped MCPs, register the fallback manually:

```bash
codex mcp add meta-ads -- bash -lc 'cd /ABS/PATH/bukeer-studio && set -a; [ -f .env.local ] && source .env.local; [ -f .env.mcp ] && source .env.mcp; set +a; exec node scripts/mcp/meta-ads-cli-server.mjs'
```

Debug:

```bash
codex mcp list
codex mcp get meta-ads
codex mcp remove meta-ads
```

Restart Codex Desktop after changes to `.mcp.json`, `.env.local`, `.env.mcp`, or MCP scripts.

Avoid keeping both `meta-ads` and `meta-ads-cli` global Codex entries active; the canonical MCP name for this repo is `meta-ads`.

## Required env

```bash
META_ACCESS_TOKEN=...
META_AD_ACCOUNT_ID=act_...
META_API_VERSION=v21.0
```

Read-only token permissions:

```text
ads_read
business_management
pages_show_list
```

## Write flags

Writes are visible but blocked by default.

```bash
META_ADS_CLI_WRITES_ENABLED=false
META_ADS_CLI_ALLOW_ACTIVE=false
META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=false
```

Execution requires both:

```text
META_ADS_CLI_WRITES_ENABLED=true
confirm=true
```

Additional gates:

- `--status active` requires `META_ADS_CLI_ALLOW_ACTIVE=true`.
- `delete`, `disconnect`, or `--force` require `META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=true`.
- Create operations without `--status` are forced to `--status paused`.

## Tool surface

Read-only:

```text
meta_ads_cli_auth_status
meta_ads_cli_list_ad_accounts
meta_ads_cli_get_ad_account
meta_ads_cli_current_ad_account
meta_ads_cli_list_pages
meta_ads_cli_get_page
meta_ads_cli_list_campaigns
meta_ads_cli_get_campaign
meta_ads_cli_list_adsets
meta_ads_cli_get_adset
meta_ads_cli_list_ads
meta_ads_cli_get_ad
meta_ads_cli_list_creatives
meta_ads_cli_get_creative
meta_ads_cli_get_insights
meta_ads_cli_list_datasets
meta_ads_cli_get_dataset
meta_ads_cli_list_catalogs
meta_ads_cli_get_catalog
meta_ads_cli_list_product_feeds
meta_ads_cli_get_product_feed
meta_ads_cli_list_product_items
meta_ads_cli_get_product_item
meta_ads_cli_list_product_sets
meta_ads_cli_get_product_set
```

Write gateway:

```text
meta_ads_cli_write_operation
```

Example dry-run input:

```json
{
  "args": [
    "ads",
    "campaign",
    "create",
    "--name",
    "Draft test",
    "--objective",
    "outcome_leads"
  ],
  "reason": "Prepare a paused draft for human review.",
  "confirm": false
}
```

## Smoke tests

```bash
node --check scripts/mcp/meta-ads-cli-server.mjs
bash -n scripts/meta-ads-cli.sh
scripts/meta-ads-cli.sh auth status
scripts/meta-ads-cli.sh --output json ads adaccount get
scripts/meta-ads-cli.sh --output json ads campaign list --limit 5
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_7d --fields spend,impressions,clicks,ctr,cpc,reach --limit 10
```

The current ColombiaTours account is:

```text
act_1249829212995679
Colombiatours.Travel24
```

## Operating policy

Use read-only tools for analysis and recommendations. Do not enable write flags until there is an explicit change plan, a token with `ads_management`, and a human approval checkpoint.

Daily operations live in `ops/meta-ads/`; this file documents only the MCP implementation.
