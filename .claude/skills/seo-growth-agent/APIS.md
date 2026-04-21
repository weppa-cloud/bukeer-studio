# APIs & MCPs Inventory — seo-growth-agent

All invocations the agent may perform. Envelope convention across HTTP
routes (ADR-012): on success `{ success: true, data: <payload> }`; on
failure `{ success: false, error: { code, message, details? } }`.

Base URL defaults:
- Dev (manual): `http://localhost:3000`
- Dev (agent with session pool): `http://localhost:$PORT` where `$PORT` is
  the claimed slot (never port 3000 from an agent — see
  `.claude/rules/e2e-sessions.md`).

Auth:
- Dashboard / editor routes require a Supabase session cookie (SSR) or the
  `Authorization: Bearer <editor_token>` header via `getEditorAuth()`.
- Public read routes are open.
- Mutation routes enforce rate limiting — respect 429 `Retry-After`.

---

## SEO Content Intelligence

### POST `/api/seo/content-intelligence/audit`
Full on-page audit for a single URL or slug.

```bash
curl -X POST "$BASE/api/seo/content-intelligence/audit" \
  -H "Content-Type: application/json" \
  -d '{"websiteId":"$SITE_ID","url":"/blog/mejor-epoca-cartagena"}'
```

Response envelope: `{ success: true, data: { scores, issues[], suggestions[] } }`.
ADR refs: ADR-003 (contract-first), ADR-012 (envelope).

### POST `/api/seo/content-intelligence/research`
Competitive + entity research for a keyword.

```bash
curl -X POST "$BASE/api/seo/content-intelligence/research" \
  -H "Content-Type: application/json" \
  -d '{"websiteId":"$SITE_ID","keyword":"mejor época cartagena","locale":"es-CO"}'
```

Response: `{ success: true, data: { entities[], paa[], suggestedHeadings[],
gaps[], sourceUrls[] } }`.

### POST `/api/seo/content-intelligence/optimize`
Suggests surgical edits for an existing piece.

```bash
curl -X POST "$BASE/api/seo/content-intelligence/optimize" \
  -H "Content-Type: application/json" \
  -d '{"postId":"$POST_ID","goal":"raise-grade-to-A"}'
```

Response: `{ success: true, data: { patches[], expectedGrade } }`.

### POST `/api/seo/content-intelligence/transcreate`
State-machine driven localization.

Actions: `create_draft | review | apply`.

```bash
curl -X POST "$BASE/api/seo/content-intelligence/transcreate" \
  -H "Content-Type: application/json" \
  -d '{"action":"create_draft","sourcePostId":"$POST","targetLocale":"en-US"}'
```

Response: `{ success: true, data: { jobId, state, payload?, findings? } }`.
State transitions enforced server-side (`draft → review → apply`).

### POST `/api/seo/score`
Algorithmic scorer (no cost). Returns grade A–F and 21 checks.

```bash
curl -X POST "$BASE/api/seo/score" \
  -H "Content-Type: application/json" \
  -d '{"content":"...","keyword":"...","locale":"es-CO"}'
```

Response: `{ success: true, data: { grade, score, checks[], suggestions[] } }`.

---

## Analytics

### GET `/api/seo/analytics/striking-distance`
Keywords ranking P4–P20 eligible for a push.

```bash
curl "$BASE/api/seo/analytics/striking-distance?websiteId=$SITE_ID"
```

Response: `{ success: true, data: { items: [{ keyword, url, position, volume, delta }] } }`.

### GET `/api/seo/analytics/health`
Site-level health summary.

```bash
curl "$BASE/api/seo/analytics/health?websiteId=$SITE_ID"
```

Response: `{ success: true, data: { issues: { critical, warning, info },
lastAuditAt } }`.

### POST `/api/seo/sync`
Trigger a sync of GSC / GA4 data for a website.

```bash
curl -X POST "$BASE/api/seo/sync" \
  -H "Content-Type: application/json" \
  -d '{"websiteId":"$SITE_ID","source":"gsc","range":"7d"}'
```

Response: `{ success: true, data: { jobId, started } }`.

### GET `/api/seo/integrations/status`
Which integrations (GSC, GA4, Bing) are connected per website.

```bash
curl "$BASE/api/seo/integrations/status?websiteId=$SITE_ID"
```

Response: `{ success: true, data: { gsc: {...}, ga4: {...}, bing: {...} } }`.

### GET `/api/seo/analytics/keywords`
Per-keyword 30d performance. Supports `?minImpressions=500`.

### GET `/api/seo/analytics/overview`
Dashboard summary — clicks, impressions, top queries, top pages.

---

## AI

### POST `/api/ai/editor/generate-blog`
Generates an MDX blog post. `version: "v2"` recommended.

```bash
curl -X POST "$BASE/api/ai/editor/generate-blog" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -d '{"websiteId":"$SITE_ID","keyword":"...","locale":"es-CO","brief":"...","version":"v2"}'
```

Response: `{ success: true, data: { title, slug, mdx, meta: { title, description },
cost: { tokens, usd } } }`.
ADR refs: ADR-005 (auth), ADR-006 (AI streaming optional — here non-stream),
ADR-012 (envelope).

---

## Direct Supabase (read/write via mcp__supabase__execute_sql or Studio SSR)

Tables the agent touches:

| Table                          | Access             | Purpose                                     |
|--------------------------------|--------------------|---------------------------------------------|
| `websites`                     | read               | Lookup `id`, `slug`, `locale`, brand voice  |
| `website_blog_posts`           | read / write       | Blog content (insert drafts, update, move)  |
| `website_pages`                | read               | Custom pages (sections JSONB)               |
| `website_product_pages`        | read / **overlay only** | SEO overlay columns (see SAFETY.md §1) |
| `seo_keywords`                 | read / write       | Tracked keyword registry                    |
| `seo_keyword_snapshots`        | read / write       | Daily rank snapshots                        |
| `seo_page_metrics_daily`       | read               | GSC-derived daily metrics per URL           |
| `seo_audit_results`            | read               | Audit history                               |
| `seo_clusters`                 | read / write       | Topic clustering                            |
| `seo_transcreation_jobs`       | read / **API only** | Translation state machine                  |
| `seo_localized_variants`       | read / write       | Variant registry per source                 |

MCP invocation (preferred):
```
mcp__supabase__execute_sql
  project_id: "$SUPABASE_PROJECT_REF"
  query: "<SQL>"
```

SQL checklist (SAFETY.md rule §2, §9): every `UPDATE`/`INSERT` scoped by
`website_id`; every `DELETE` requires user confirmation; no `SELECT *`
across production tables (cost).

---

## MCPs available today

| MCP                  | Purpose                                    | Key tools                                   |
|----------------------|--------------------------------------------|--------------------------------------------|
| `supabase`           | Query / mutate DB                          | `execute_sql`, `list_tables`               |
| `search-console`     | GSC analytics, anomalies, striking distance, cannibalization | `analytics_anomalies`, `analytics_top_queries`, `analytics_top_pages`, `seo_striking_distance`, `seo_cannibalization`, `analytics_compare_periods` |
| `google-analytics`   | GA4 reports (sessions, conversions)        | `run_report`, `run_realtime_report`        |
| `dataforseo`         | SERP + keyword metrics (metered, **Tier 1 — use freely**) | `dataforseo_labs_google_keyword_overview`, `dataforseo_labs_google_keyword_ideas`, `dataforseo_labs_google_ranked_keywords`, `dataforseo_labs_google_competitors_domain`, `serp_organic_live_advanced`, `backlinks_summary`, `dataforseo_labs_google_domain_rank_overview` |
| `chrome-devtools`    | Live browser inspection / screenshots      | Reuse from `debugger` skill                |
| `playwright`         | E2E / visual checks                        | Respect session pool                       |

### DataForSEO — primary keyword tool

No budget gate — use freely for SEO/growth work. Key flows:

```
# Keyword overview (volume, difficulty, intent)
mcp__dataforseo__dataforseo_labs_google_keyword_overview
  keywords: ["mejor época cartagena"]
  location_code: 2170  # Colombia
  language_code: "es"

# Keyword ideas from seed
mcp__dataforseo__dataforseo_labs_google_keyword_ideas
  keywords: ["tour cartagena"]
  location_code: 2840  # US for en-US research
  language_code: "en"

# SERP live (check who ranks)
mcp__dataforseo__serp_organic_live_advanced
  keyword: "colombia tour packages"
  location_code: 2840
  language_code: "en"
  depth: 10

# Domain rank overview
mcp__dataforseo__dataforseo_labs_google_domain_rank_overview
  target: "colombiatours.travel"
  location_code: 2840
  language_code: "en"
```

### Planned (not yet shipped)

| MCP                  | Issue | Purpose                                        |
|----------------------|-------|------------------------------------------------|
| `mcp-bukeer-studio`  | #158  | Tool-level access to Studio SEO endpoints      |

---

## ADR cross-references

| ADR     | Topic                            | Relevance                                       |
|---------|----------------------------------|-------------------------------------------------|
| ADR-003 | Contract-first validation (Zod)  | All request/response payloads are validated     |
| ADR-005 | Defense in depth / auth boundary | Service role keys server-only                   |
| ADR-006 | AI streaming architecture        | `generate-blog` responses structured via `generateObject` |
| ADR-010 | Observability                    | Every API call logged; session file mirrors log |
| ADR-012 | Envelope `{ success, data | error }` | Standard across every HTTP route here        |

---

## Error handling pattern

On `{ success: false, error }`:

1. Inspect `error.code`:
   - `RATE_LIMITED` → respect `Retry-After` (or fall back 30s), one retry max.
   - `BUDGET_EXCEEDED` → abort, update `budget.md`, write partial session.
   - `VALIDATION_ERROR` → log `details`, fix inputs, retry once.
   - `AUTH_REQUIRED` → re-read env, confirm session cookie, escalate to user if still missing.
   - `STATE_CONFLICT` (transcreate) → re-read job row, never force.
2. Log error in session `## Executed actions` with input + response.
3. If the failure blocks the whole playbook, set `outcome: blocked` and
   stop.

Never retry more than once on the same error code — compounding retries
waste budget and muddy telemetry.
