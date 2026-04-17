# mcp-bukeer-studio

Local Model Context Protocol (MCP) server that exposes Bukeer Studio's
`/api/seo/*` and `/api/ai/*` endpoints, plus a handful of direct Supabase
helpers, as MCP tools. Claude Code calls these tools natively instead of
shelling out through `bash` + `curl`.

Only runs locally against your dev server (`http://localhost:3000`) and the
shared Supabase project. Not deployed.

## Purpose

- Give Claude structured access to the SEO content-intelligence pipeline
  (audit, research, clusters, optimize, transcreate, score, analytics, sync,
  health, integrations status).
- Let Claude generate blog posts via the existing `/api/ai/editor/generate-blog`
  route with typed arguments.
- Read `websites` rows (by subdomain or id) and upsert `website_blog_posts`
  without hitting the Next.js API surface.
- Enforce a truth-field guardrail on blog upserts so Claude cannot accidentally
  write columns owned by the hotels/activities/package_kits/destinations truth
  tables.

## Prerequisites

- Node 22+ (matches the root repo's `engines` constraint).
- A Bukeer Studio dev server running locally on `http://localhost:3000` (for
  any `/api/*` tool call). See CLAUDE.md → "Local development" / session pool.
- A Supabase service-role key for the same project this repo's Next.js app
  uses (the Flutter repo and Studio repo share one Supabase project).

### Environment variables

| Variable                       | Required for          | Notes                                                                                  |
|--------------------------------|-----------------------|----------------------------------------------------------------------------------------|
| `BUKEER_BASE_URL`              | SEO + AI tools        | Default `http://localhost:3000`. Override for session-pool slots (`:3001`–`:3004`).    |
| `BUKEER_SERVICE_ROLE_KEY`      | Forwarded header      | Sent as `x-service-role-key` on every API request (future-proofing; see Auth below).   |
| `BUKEER_SESSION_COOKIE`        | SEO + AI tools        | Full `Cookie:` header string for an authenticated Supabase session. See Auth below.    |
| `SUPABASE_URL`                 | Supabase-direct tools | Falls back to `NEXT_PUBLIC_SUPABASE_URL` if unset.                                     |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase-direct tools | Falls back to `BUKEER_SERVICE_ROLE_KEY` if unset.                                      |

## Install

```bash
cd .claude/mcp-servers/bukeer-studio
npm install
npm run build
# → dist/index.js
```

## Register

The server is already wired into `.mcp.json` at the repo root:

```jsonc
"bukeer-studio": {
  "command": "node",
  "args": [".claude/mcp-servers/bukeer-studio/dist/index.js"],
  "env": {
    "BUKEER_BASE_URL": "http://localhost:3000",
    "BUKEER_SERVICE_ROLE_KEY": "${BUKEER_SERVICE_ROLE_KEY}",
    "SUPABASE_URL": "${SUPABASE_URL}",
    "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
  }
}
```

Expand the env placeholders via your usual mechanism (shell export,
`.env.mcp`, 1Password CLI, etc). Restart Claude Code after a rebuild.

## Tool inventory (16 tools)

The spec requested 14 logical tools; clusters is split into three registered
MCP tools (`list`, `create`, `assign`) for ergonomic invocation, which yields
16 distinct MCP tool names.

| Tool                             | Backing call                                             | One-liner                                                           |
|----------------------------------|----------------------------------------------------------|---------------------------------------------------------------------|
| `bukeer_seo_audit`               | GET / POST `/api/seo/content-intelligence/audit`         | Re-run (`op:"run"`) or read (`op:"read"`) audit findings.           |
| `bukeer_seo_research`            | POST `/api/seo/content-intelligence/research`            | Keyword + SERP research for seed keywords.                          |
| `bukeer_seo_clusters_list`       | GET `/api/seo/content-intelligence/clusters`             | List clusters for a website.                                        |
| `bukeer_seo_clusters_create`     | POST `/api/seo/content-intelligence/clusters`            | Create a cluster (sends `action:"create"` automatically).           |
| `bukeer_seo_clusters_assign`     | POST `/api/seo/content-intelligence/clusters`            | Assign a keyword or page to a cluster (`assignType`).               |
| `bukeer_seo_optimize`            | POST `/api/seo/content-intelligence/optimize`            | Suggest or apply SEO patches to a single item.                      |
| `bukeer_seo_transcreate`         | POST `/api/seo/content-intelligence/transcreate`         | `action: create_draft \| review \| apply` locale pipeline.          |
| `bukeer_seo_score`               | GET `/api/seo/score`                                     | 5D SEO score for hotel/activity/transfer/package/destination/blog/page. |
| `bukeer_striking_distance`       | GET `/api/seo/analytics/striking-distance`               | Keywords ranking 8-20 with ≥100 volume.                             |
| `bukeer_seo_health`              | GET `/api/seo/analytics/health`                          | Integration + sync freshness snapshot.                              |
| `bukeer_seo_sync`                | POST `/api/seo/sync`                                     | Trigger GSC / GA4 (+ optional DataForSEO) sync.                     |
| `bukeer_integrations_status`     | GET `/api/seo/integrations/status`                       | Status of GSC / GA4 / DFS wiring.                                   |
| `bukeer_generate_blog`           | POST `/api/ai/editor/generate-blog`                      | Generate a v1 or v2 (answer-first + FAQ) blog post.                 |
| `bukeer_get_website`             | Supabase `websites` (service role)                       | One row by `bySubdomain` or `byId`.                                 |
| `bukeer_list_websites_by_account`| Supabase `websites` (service role)                       | All sites for an `accountId`.                                       |
| `bukeer_blog_post_upsert`        | Supabase `website_blog_posts` (service role)             | Insert / update a blog post. Truth-field guardrail enforced.        |

### Example invocations

```jsonc
// Re-run audit
{ "name": "bukeer_seo_audit", "arguments": { "op": "run", "websiteId": "…", "locale": "es-CO", "contentTypes": ["blog", "destination"] } }

// Read stored findings
{ "name": "bukeer_seo_audit", "arguments": { "op": "read", "websiteId": "…", "decisionGradeOnly": true, "limit": 50 } }

// Assign keyword to cluster
{ "name": "bukeer_seo_clusters_assign", "arguments": { "assignType": "keyword", "websiteId": "…", "clusterId": "…", "keyword": "tours cartagena", "intent": "commercial" } }

// Upsert blog post (will reject if any truth column is present)
{ "name": "bukeer_blog_post_upsert", "arguments": { "websiteId": "…", "slug": "…", "title": "…", "body": "# Hello" } }
```

## Safety guardrails

`src/safety.ts` exports `assertNoTruthFields(record)` which throws
`SEO_TRUTH_FIELD_BLOCKED` (with `offendingFields`) when a payload contains any
key in the truth-table denylist:

```
name, description, price, main_image, star_rating, user_rating, amenities,
duration_minutes, inclutions, exclutions, recomendations, experience_type,
currency, base_price, net_price, total_price, availability,
account_id, hotel_id, activity_id, destination_id, package_kit_id, product_id
```

`bukeer_blog_post_upsert` runs the check twice — once on the raw input and
once on the flattened row it is about to write — and will never call Supabase
if either check fails.

The denylist is intentionally conservative. Update it when the truth-table
schema ships its canonical column list.

## Auth limitation (important)

`/api/seo/*` and `/api/ai/*` routes call `requireWebsiteAccess` which reads a
Supabase user session from cookies — there is no service-role bypass on the
server side. When called from this MCP the server will respond `401 / AUTH_EXPIRED`
unless you supply a valid authenticated cookie via `BUKEER_SESSION_COOKIE`.

Workflow options:

1. **Cookie**: log in to your dev server in a browser, copy the full
   `Cookie:` header for localhost, export it as `BUKEER_SESSION_COOKIE`, then
   restart the MCP.
2. **Supabase-direct tools**: `bukeer_get_website`,
   `bukeer_list_websites_by_account`, `bukeer_blog_post_upsert` use the
   service-role Supabase client and work without a cookie session.

`BUKEER_SERVICE_ROLE_KEY` is forwarded as `x-service-role-key` on every API
call so a future header-based bypass can be added without tool changes.

## Observability

Every tool call emits one JSON line to stderr:

```json
{"tool":"bukeer_seo_audit","args_hash":"a1b2c3…","websiteId":"…","durationMs":142,"success":true}
```

- `args_hash` is a 12-char SHA-256 of the JSON-serialized arguments (redacts
  secrets automatically by not logging values).
- Errors add `"error_code"`.
- Startup emits `{"event":"server_started", ...}`.

No secrets are ever logged.

## Troubleshooting

| Symptom                                             | Likely cause / fix                                                                 |
|-----------------------------------------------------|------------------------------------------------------------------------------------|
| `ECONNREFUSED 127.0.0.1:3000`                       | Dev server not running. `npm run dev` in repo root, or point `BUKEER_BASE_URL` at a session-pool port (`:3001`–`:3004`). |
| `401` / `AUTH_EXPIRED` from API tools               | No cookie session. See "Auth limitation" — set `BUKEER_SESSION_COOKIE` or use Supabase-direct tools. |
| `SEO_TRUTH_FIELD_BLOCKED`                           | Your payload contains a column from the truth-table denylist. Remove it; blog/page upserts are SEO-only. |
| `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` | Supabase-direct tools cannot start without both. Set them in `.mcp.json` env or your shell. |
| Build error about `nodenext` module resolution      | Check `node --version` ≥ 22 and re-run `npm install`.                              |
| MCP server not listed in Claude                     | Rebuild (`npm run build`) and restart Claude Code so it re-reads `.mcp.json`.      |

## Development

```bash
npm run dev        # tsc --watch
npm run clean      # rm -rf dist
```

Run a smoke test against a running dev server:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | node dist/index.js 2>/dev/null
```
