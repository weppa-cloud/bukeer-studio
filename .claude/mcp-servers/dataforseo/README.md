# mcp-dataforseo

Local MCP server wrapping a subset of the [DataForSEO](https://docs.dataforseo.com/v3/) API (SERP + keyword intelligence) with a **file-based response cache** and a **hard monthly budget cap** so agents can do SEO research inside Claude Code without burning credit on repeat calls.

## Purpose

- Expose 5 SEO tools to any MCP-capable client (Claude Code, Cursor, etc.).
- Cache every paid response for 14–30 days so identical questions don't re-bill.
- Enforce a local monthly USD cap (default `$50`) before every outbound request; block when the next call would exceed the cap.
- Auto-roll the budget each calendar month (UTC) and archive the previous period to a `.bak` file.
- Emit one structured JSON log line per tool call to **stderr** (stdout is reserved for the MCP stdio transport).

## Prerequisites

- Node **≥ 22**
- A DataForSEO account with API credentials ([signup](https://app.dataforseo.com/register))
- `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` env vars available to the MCP client

## Install

```bash
cd .claude/mcp-servers/dataforseo
npm install
npm run build          # → dist/index.js
```

## Register

Added to repo-level `.mcp.json`:

```json
"dataforseo": {
  "command": "node",
  "args": [".claude/mcp-servers/dataforseo/dist/index.js"],
  "env": {
    "DATAFORSEO_LOGIN": "${DATAFORSEO_LOGIN}",
    "DATAFORSEO_PASSWORD": "${DATAFORSEO_PASSWORD}",
    "DATAFORSEO_MONTHLY_CAP_USD": "50",
    "DATAFORSEO_BASE_URL": "https://api.dataforseo.com"
  }
}
```

Export the secrets before starting Claude Code (e.g. via `.env.mcp` sourced by your shell, or direnv):

```bash
export DATAFORSEO_LOGIN="you@example.com"
export DATAFORSEO_PASSWORD="your-api-password"
```

## Tools

| Tool | DataForSEO path | Cache TTL | Est. cost |
|------|-----------------|-----------|-----------|
| `dfs_serp_advanced` | `POST /v3/serp/google/organic/live/advanced` | 30 d | $0.30 |
| `dfs_keyword_volume` | `POST /v3/keywords_data/google_ads/search_volume/live` | 30 d | $0.05 (batch up to 1000 kw) |
| `dfs_keyword_suggestions` | `POST /v3/keywords_data/google_ads/keywords_for_site/live` | 14 d | $0.05 |
| `dfs_competitors_domain` | `POST /v3/domain_analytics/google/organic/competitors_domain/live` | 30 d | ~$0.50 |
| `dfs_budget_status` | *(no network)* | n/a | $0.00 |

Every tool's response includes `_cached: boolean` and `_cost_usd: number` (0 on cache hits). When `spent_usd / cap_usd >= 0.8` an informational `warning` string is attached.

### Example call shapes

```jsonc
// dfs_serp_advanced
{
  "keyword": "paquete turístico colombia",
  "locale": "es-CO",
  "country": "CO",
  "language_code": "es",
  "depth": 10,
  "device": "desktop"
}

// dfs_keyword_volume
{
  "keywords": ["viaje a cartagena", "tour eje cafetero"],
  "location_name": "Colombia",
  "language_name": "Spanish"
}

// dfs_keyword_suggestions
{
  "target": "colombiatours.travel",
  "location_name": "Colombia",
  "language_name": "Spanish",
  "limit": 200
}

// dfs_competitors_domain
{
  "target": "colombiatours.travel",
  "location_name": "Colombia",
  "language_name": "Spanish",
  "limit": 20
}

// dfs_budget_status
{}
```

All paid tools accept `forceRefresh: true` to bypass the cache for the current call (the fresh response still replaces the cached one and the cost is still deducted from the monthly budget).

## Cache behaviour

- Files live in `.claude/mcp-servers/dataforseo/cache/<sha256(key)>.json` (gitignored).
- Shape: `{ fetchedAt: ISO, ttlDays: number, data: any }`.
- Cache keys include all inputs that change the response (keyword, locale, country, language, depth, device — or the sorted keyword list for batch endpoints).
- On hit within TTL: return cached payload, no network call, no budget increment.
- On miss / expired: call DataForSEO, persist the response, increment the budget.
- Expired files are left on disk (lazy cleanup — a sweep script is backlog).

## Budget management

- Budget state lives in `.claude/mcp-servers/dataforseo/budget.json` (gitignored; template at `budget.json.sample`).
- Shape:
  ```json
  {
    "billing_period": "2026-04",
    "spent_usd": 12.85,
    "cap_usd": 50,
    "by_operation": {
      "dfs_serp_advanced": { "count": 30, "cost": 9.0 },
      "dfs_keyword_volume": { "count": 77, "cost": 3.85 }
    }
  }
  ```
- **Pre-call gate**: before every outbound request, the server checks `spent_usd + estimated_cost < cap_usd`. Over-cap → throws `DFS_BUDGET_EXCEEDED` (no HTTP call is made).
- **Post-call accounting**: the actual `cost` reported by DataForSEO's task envelope is applied (falls back to the per-tool estimate if the API omits it). Writes are atomic (tmp file + rename).
- **80% warning**: when spend reaches ≥80% of the cap, every tool response carries `warning: "Approaching monthly cap ($X of $Y used)"`. This is informational — calls keep succeeding.
- **Monthly rollover**: on the first call each calendar month (UTC), the previous period is archived to `budget.json.<YYYY-MM>.bak` and a fresh budget starts at `$0`. The cap is re-read from `DATAFORSEO_MONTHLY_CAP_USD` every read, so bumping the env var takes effect immediately.
- Need more runway mid-month? Raise `DATAFORSEO_MONTHLY_CAP_USD` in `.mcp.json` (or your shell env) and restart the MCP client.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `HTTP 401` | Missing or wrong `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Confirm the creds in your shell / `.env.mcp`; note DataForSEO expects the **API password**, not the dashboard password |
| `HTTP 402` from DataForSEO | Account out of credit upstream (independent of this local cap) | Top up at https://app.dataforseo.com/billing |
| `DFS_BUDGET_EXCEEDED` | Local monthly cap reached | Raise `DATAFORSEO_MONTHLY_CAP_USD` or wait for month rollover |
| `_cached: true` with no new data | Cache hit within TTL | Pass `forceRefresh: true` to bypass the cache for this call |
| Empty `top_n` in SERP | Upstream returned non-organic items only (ads, local pack, knowledge graph) | Inspect the raw `items` array by temporarily widening the filter, or bump `depth` |
| Task fails with `status_code >= 40000` in logs | DataForSEO task-level error (invalid location_name, unsupported language, etc.) | Check the `status_message` in the server log; fix the input |

## Local files (quick map)

```
.claude/mcp-servers/dataforseo/
├── package.json
├── tsconfig.json
├── README.md                 (this file)
├── budget.json.sample        (template; real budget.json is gitignored)
├── cache/                    (gitignored; .gitkeep committed)
├── src/
│   ├── index.ts              (MCP server; stdio transport; tool registry)
│   ├── client.ts             (basic auth, retry, timeout, task envelope unwrap)
│   ├── cache.ts              (sha256-keyed JSON cache with TTL)
│   ├── budget.ts             (atomic budget r/m/w, rollover, warnings)
│   ├── schemas.ts            (Zod input/output schemas)
│   └── tools/
│       ├── serp-advanced.ts
│       ├── keyword-volume.ts
│       ├── keyword-suggestions.ts
│       ├── competitors-domain.ts
│       └── budget-status.ts
└── dist/                     (gitignored; built by `npm run build`)
```

## Safety notes

- Credentials are **never** written to disk — they come from env only.
- Cache + budget + build artifacts are gitignored at the repo root (see `.gitignore`).
- The server writes all telemetry to stderr; stdout is reserved for MCP framing.
