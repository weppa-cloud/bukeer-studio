# Playbooks — seo-growth-agent

Five operational playbooks. Each one assumes the **Session Start Ritual**
from `SKILL.md` already ran (OKRs loaded, budget checked, website confirmed,
MCPs verified).

Conventions:
- `{site}` = subdomain slug, `{site_id}` = UUID from `websites.id`.
- `{today}` = ISO date; `{week}` = ISO week (e.g. `2026-W16`).
- All HTTP calls are issued via WebFetch against the running Studio instance
  (default base `http://localhost:3000`, respect the E2E session pool when a
  slot is active — never hit port 3000 if an agent is running on it).
- Session file path derived per `SKILL.md` → Output conventions.

---

## Playbook 1 — Daily Morning Check (15 min)

**Trigger phrases:** "daily check", "morning SEO", "check anomalies".
**Scope:** `daily-check`.
**Output:** `docs/growth-sessions/{today}-morning-{site}.md`.

### Steps

1. **Read OKRs & budget**
   - `Read docs/growth-okrs/active.md` → pin 7D targets.
   - `Read docs/growth-okrs/budget.md` → gate paid calls.

2. **GSC anomalies — last 24h**
   - Preferred MCP: `mcp__search-console__analytics_anomalies` with
     `site_url` of `{site}`, `date_range: 1d`.
   - Fallback: `mcp__search-console__analytics_time_series` 7d and diff
     day-over-day clicks/impressions/position.
   - Inputs: site URL, date range. Outputs: list of anomalous queries/pages.

3. **Striking distance refresh (P1)**
   - Primary: `mcp__search-console__seo_striking_distance` `site_url={site_url}`.
   - Enrich top 3 keywords with DataForSEO:
     `mcp__dataforseo__dataforseo_labs_google_keyword_overview`
     `keywords: [kw1, kw2, kw3]`, `location_code: 2170` (or 2840 for en-US).
   - Fallback: `GET /api/seo/analytics/striking-distance?websiteId={site_id}`.
   - Keep top 3 by `(volume * (11 - position))`.

4. **Digest — top 3 actions**
   - Build a 3-bullet summary: "what moved · probable cause · next action".
   - Tag each action P1/P2/P3.

5. **Write session file**
   - Render from `docs/growth-sessions/TEMPLATE.md` with frontmatter
     `scope: daily-check`, `outcome: completed`.
   - Populate `## Mutations` (empty table if nothing was written),
     `## External costs` (zero if all MCP/free), `## Next steps`.

### Expected inputs / outputs

- **Input:** `{site_id}`, `{site}`, optional comparison window.
- **Output:** session file + 3-bullet digest printed to chat.

### Failure modes

- GSC MCP returns empty → fall back to `seo_page_metrics_daily` in Supabase
  for last 2 days; if still empty, flag data-pipeline issue.
- Striking-distance endpoint 500 → fall back to direct SQL on
  `seo_keyword_snapshots` (latest `captured_at` per keyword, filter position
  between 4 and 20).
- Budget ≥100% → skip any paid MCP, mark in session.

---

## Playbook 2 — Weekly Planning (Monday, 30 min)

**Trigger phrases:** "weekly planning", "quick wins", "plan of the week".
**Scope:** `weekly-planning`.
**Output:** `docs/growth-weekly/{week}-{site}.md` + optional GitHub issues.

### Steps

1. **Pull GSC top queries (7d) + DataForSEO enrichment**
   - MCP: `mcp__search-console__analytics_top_queries`
     `site_url={site_url}`, `range: 7d`, `row_limit: 50`.
   - Compute 7-day position delta: `mcp__search-console__analytics_compare_periods`.
   - Enrich top 10 queries with volume + difficulty:
     `mcp__dataforseo__dataforseo_labs_google_keyword_overview`
     `keywords: [top10queries]`, `location_code: 2840`, `language_code: "en"`.
   - Flag keywords with high volume + low difficulty as priority opportunities.

2. **Drift detection (translation_group)**
   - SQL via `mcp__supabase__execute_sql`:
     ```sql
     SELECT group_id, max(updated_at) AS src_updated, min(updated_at) AS tgt_updated
     FROM website_blog_posts
     WHERE website_id = '{site_id}'
     GROUP BY group_id
     HAVING max(updated_at) - min(updated_at) > interval '14 days';
     ```
   - Flag variants stale > 14d vs source.

3. **Low CTR pages**
   - HTTP: `GET /api/seo/analytics/keywords?websiteId={site_id}&minImpressions=500`.
   - Filter rows where `ctr < benchmark_ctr_by_position` (use 3.2% at P1, 1.0% at P10
     as rule-of-thumb if DB benchmark missing).

4. **Cannibalization (intra-locale)**
   - MCP: `mcp__search-console__seo_cannibalization`
     `site_url={site_url}`, min 2 URLs on the same query, same language.

5. **Generate 5–7 Quick Wins (P1/P2/P3)**
   - P1 striking distance (top 3).
   - P2 low CTR (top 2).
   - P3 drift/cannibalization (top 2).
   - Use `WEEKLY_PLAN_PROMPT` from `PROMPTS.md`.

6. **Write weekly file**
   - Render from `docs/growth-weekly/TEMPLATE.md`.
   - Fill frontmatter: `week_of`, `week_start`, `website_id`, `website_slug`,
     `generated_by: claude-code-s1`, `generated_at: {iso_now}`.
   - Fill OKR progress row from `active.md`.

7. **Optional: open a GitHub issue per Quick Win**
   - If user opted in (`"also open issues"`), for each task run:
     ```bash
     gh issue create \
       --title "[QW] {T-N} — {short_desc}" \
       --label "growth,quick-win,week:{week}" \
       --body-file /tmp/qw-body.md
     ```
   - Record issue numbers back into the weekly file checkboxes.

### Expected inputs / outputs

- **Input:** `{site_id}`, `{site}`, week number.
- **Output:** weekly markdown + optional issue numbers + Friday review stub.

### Failure modes

- Comparison period MCP empty (new site) → mark "baseline week, no delta".
- No cannibalization signal → skip P3 cannibalization row, keep drift row.
- More than 7 candidate tasks → rank by `impact * confidence / effort`, drop tail.

---

## Playbook 3 — Content Creation Flow (10 min / post)

**Trigger phrases:** "crea blog", "write a post about", "new SEO article".
**Scope:** `content-create`.
**Output:** Supabase draft row in `website_blog_posts` + session log.

### Steps

1. **Gather inputs from user**
   - Primary keyword, target locale (default source locale of website),
     optional secondary keywords, tone, optional competitor hint list.

2. **Competitor research — WebSearch top 10**
   - `WebSearch` query `"{keyword}" site:* -site:{site}` lang filter by locale.
   - Collect top 10 URLs → for each, `WebFetch` extract `<h1>`, `<h2>`, FAQ,
     entities. Aggregate into a dataset.

3. **Content intelligence research**
   - HTTP: `POST /api/seo/content-intelligence/research`
     body `{ websiteId, keyword, locale, competitors: [...] }`.
   - Expected response envelope: `{ success, data: { entities[], paa[],
     suggestedHeadings[], gaps[] } }`.

4. **Generate blog**
   - HTTP: `POST /api/ai/editor/generate-blog`
     body: `{ websiteId, keyword, locale, brief: <CONTENT_BRIEF_PROMPT>,
     researchRef: <id from step 3>, version: "v2" }`.
   - Response: `{ success, data: { title, slug, mdx, meta: { title, description } } }`.

5. **Score loop → grade A**
   - HTTP: `POST /api/seo/score` body `{ content, keyword, locale }`.
   - If `grade != "A"`, feed `suggestions` back into a second
     `generate-blog` call with `revisionHints`. Max 3 iterations.
   - If after 3 iterations still not A → write as draft with grade noted.

6. **Insert draft**
   - SQL via `mcp__supabase__execute_sql`:
     ```sql
     INSERT INTO website_blog_posts
       (website_id, locale, slug, title, content_mdx, meta_title, meta_description,
        status, seo_grade, translation_group_id, created_by_agent)
     VALUES
       ('{site_id}', '{locale}', '{slug}', '{title}', $1, $2, $3,
        'draft', '{grade}', gen_random_uuid(), 'seo-growth-agent')
     RETURNING id, slug;
     ```
   - Log mutation in session file.

7. **Session log + handoff**
   - Render session file `scope: content-create`.
   - Include primary keyword, final grade, iteration count, draft URL.

### Expected inputs / outputs

- **Input:** keyword, locale, tone, optional competitors.
- **Output:** draft row id + slug + session log. Content stays `status=draft`
  for human review before publish.

### Failure modes

- `generate-blog` throws rate-limit → back off 30s, retry once, then stop.
- Scorer endpoint 5xx → insert with grade `U` (unknown) and flag in session.
- Competitor WebFetch blocked (403/captcha) → skip that URL, require min 5
  valid competitors before proceeding; otherwise ask user for curated list.

---

## Playbook 4 — Translation Flow (5 min / post)

**Trigger phrases:** "traduce a <locale>", "transcreate post", "localize article".
**Scope:** `translate`.
**Output:** Transcreated draft row + session log.

### Steps

1. **Fetch source post**
   - SQL: `SELECT id, slug, title, content_mdx, meta_title, meta_description,
     translation_group_id FROM website_blog_posts WHERE id = '{src_post_id}';`
   - Verify `status in ('draft', 'published')` and `locale != {target_locale}`.

2. **Create transcreation draft**
   - HTTP: `POST /api/seo/content-intelligence/transcreate`
     body `{ action: "create_draft", sourcePostId, targetLocale, glossary,
     tone, brandTermsKeep: [...] }`.
   - Server creates a row in `seo_transcreation_jobs` with state `draft`.

3. **Review**
   - HTTP: `POST /api/seo/content-intelligence/transcreate`
     body `{ action: "review", jobId }`.
   - Response includes `findings[]` — accuracy, terminology, tone, SEO
     preservation. **Never skip review.** If `findings` include blockers
     (`severity: "block"`), stop and escalate to user.

4. **Apply**
   - HTTP: `POST /api/seo/content-intelligence/transcreate`
     body `{ action: "apply", jobId }`.
   - This transitions job state `draft → review → apply` and inserts a new
     row in `website_blog_posts` with same `translation_group_id` as source.

5. **Slug handling (pre-#129)**
   - Use helper `prefixSlugForLocale(sourceSlug, targetLocale)` from
     `lib/seo/slug-locale.ts` (planned, see #160).
   - While helper is not shipped, apply manual prefix: `{locale-kebab}-{source-slug}`
     (e.g. `en-us-best-time-cartagena`). Post-#129 use dedicated `locale` column.

6. **Log + handoff**
   - Write session file `scope: translate`.
   - Mutation table rows: one for each of the three transcreate actions + one
     for the inserted `website_blog_posts` row.

### Expected inputs / outputs

- **Input:** `{src_post_id}`, `{target_locale}`, glossary, tone.
- **Output:** new draft row id + job id + session log.

### Failure modes

- Source post not found → stop, ask user for correct id.
- Review returns `severity: "block"` findings → do NOT apply; write
  findings into session, hand off to user.
- Apply 409 (state machine violation) → re-read job state, never force.
- `seo_transcreation_jobs` cost exceeds NVIDIA Nim budget → abort per
  SAFETY rules.

---

## Playbook 5 — Multi-locale Audit (5 min)

**Trigger phrases:** "audit multi-locale", "missing en-US variants",
"locale coverage".
**Scope:** `audit`.
**Output:** `docs/growth-sessions/{today}-audit-{site}.md`.

### Steps

1. **Query posts missing target locale variant**
   ```sql
   SELECT s.id AS source_id, s.slug AS source_slug, s.title,
          s.translation_group_id, s.published_at
   FROM website_blog_posts s
   LEFT JOIN website_blog_posts t
     ON t.translation_group_id = s.translation_group_id
    AND t.locale = '{target_locale}'
   WHERE s.website_id = '{site_id}'
     AND s.locale = '{source_locale}'
     AND s.status = 'published'
     AND (t.id IS NULL OR t.locale IS NULL);
   ```

2. **Cross-ref GSC clicks priority**
   - MCP: `mcp__search-console__analytics_top_pages`
     `site_url={site_url}`, `range: 30d`, `row_limit: 100`.
   - Join by slug → rank missing variants by source post clicks.

3. **Prioritized backlog**
   - Bucket:
     - **P1** — source has ≥100 clicks/30d and no variant.
     - **P2** — source has 20–99 clicks and no variant.
     - **P3** — source <20 clicks (long tail).
   - Limit to top 20 in output.

4. **Write audit session file**
   - Include: total source posts, missing count, P1/P2/P3 tables, next-step
     recommendation (e.g. "Run Playbook 4 on top 5 P1 entries this week").

### Expected inputs / outputs

- **Input:** `{site_id}`, `{source_locale}`, `{target_locale}`.
- **Output:** audit markdown + prioritized backlog printed to chat.

### Failure modes

- No `translation_group_id` populated on source rows → flag data-model issue,
  recommend running backfill migration before further translation work.
- GSC top_pages returns empty → fall back to `seo_page_metrics_daily` join.
- Target locale has >80% coverage already → report "good coverage" and
  suggest switching to content-creation mode instead.

---

---

## Playbook 6 — Bulk Product Transcreation (no time box)

**Trigger phrases:** "transcreate products", "traduce paquetes", "traduce planners",
"transcreate all", "bulk transcreate", "traduce todo el sitio".
**Scope:** `bulk-transcreate`.
**Output:** console progress log + session file `docs/growth-sessions/{today}-transcreate-{site}.md`.

### Steps

1. **Confirm scope with user**
   - Which content types? (package_kits / planners / activities / blogs / all).
   - Target locale (default `en-US`).
   - Dry run first? (recommended for first run per site).
   - `--website-id` if not colombiatours default.

2. **Package kits transcreation**
   ```bash
   node scripts/seo/transcreate-package-kits.mjs \
     --website-id {site_id} \
     [--dry-run] [--force] [--limit N] [--ids a,b,c]
   ```
   - Default: processes ALL packages linked to the website (no limit).
   - Writes to `package_kits.translations['en-US']`.
   - Skips already-translated unless `--force`.

3. **Planners transcreation**
   ```bash
   node scripts/seo/transcreate-planners.mjs \
     --website-id {site_id} \
     [--dry-run] [--force] [--ids a,b,c]
   ```
   - Processes all contacts with `show_on_website = true` for the account.
   - Writes to `contacts.translations['en-US']` (bio, position, specialty).

4. **Blog translation (per post, via API)**
   - For each high-priority blog (P1 from Playbook 5 audit):
     ```
     POST /api/seo/content-intelligence/transcreate
       { action: "create_draft", sourcePostId, targetLocale }
     POST /api/seo/content-intelligence/transcreate
       { action: "review", jobId }
     POST /api/seo/content-intelligence/transcreate
       { action: "apply", jobId }
     ```
   - Never skip `review` step. Escalate blockers to user.

5. **Verify coverage post-run**
   - Run Playbook 5 (Multi-locale Audit) after completion.
   - Expected: missing count drops significantly.

6. **Write session file**
   - Include: packages processed, planners processed, blogs translated,
     success/skip/error counts per type, total tokens used.

### Expected inputs / outputs

- **Input:** `{site_id}`, content types, target locale.
- **Output:** updated `translations` JSONB in DB + session log.

### Failure modes

- AI rate limit from OpenRouter → script auto-retries once, then logs error per item.
- Package has no `name` → skipped automatically.
- Blog apply returns 409 → log job ID, escalate to user (never force state).

---

## Playbook 7 — OKR Progress Update

**Trigger phrases:** "update OKRs", "check OKRs", "OKR progress", "how are we doing",
"progress vs targets", "weekly OKR update", "monthly review".
**Scope:** `okr-update`.
**Output:** updated `docs/growth-okrs/active.md` + summary in chat.

### Steps

1. **Read current OKRs**
   - `Read docs/growth-okrs/active.md` → extract site_id, KPI targets, current values.

2. **Pull 7D metrics from GSC**
   - MCP: `mcp__search-console__analytics_performance_summary`
     `site_url={site_url}`, `date_range: 7d`.
   - Extract: clicks, impressions, avg_position.

3. **Pull 30D metrics from GA4**
   - MCP: `mcp__google-analytics__run_report`
     `property_id={ga4_property}`, dimensions `[sessionSource]`,
     metrics `[sessions, newUsers]`, `date_ranges: [{startDate: "30daysAgo", endDate: "today"}]`.

4. **Pull domain metrics from DataForSEO**
   - `mcp__dataforseo__dataforseo_labs_google_domain_rank_overview`
     `target: {site_domain}`, `location_code: 2840`, `language_code: "en"`.
   - Extract: DR equivalent, ranked keywords count.
   - `mcp__dataforseo__dataforseo_labs_google_ranked_keywords`
     `target: {site_domain}`, `location_code: 2840`, count top-10 keywords in `en-US`.

5. **Pull tech score from DB**
   ```sql
   SELECT performance_score FROM seo_audit_results
   WHERE website_id = '{site_id}'
   ORDER BY created_at DESC LIMIT 1;
   ```

6. **Update active.md**
   - Overwrite `Current` column in each KPI row with fetched values.
   - Update `Last fetch` to today's date.
   - Update `Progress` = `Current / Target * 100%`.

7. **Print 3-line summary to chat**
   - Format: `KPI: {current} / {target} ({delta vs last period} {↑↓=})`.
   - Flag any KPI at risk (< 50% of target with < 30 days left in period).

### Expected inputs / outputs

- **Input:** `{site_id}`, `{site_url}`, `{ga4_property}`, `{site_domain}`.
- **Output:** updated `active.md` + summary printed to chat.

### Failure modes

- GSC returns no data → flag "GSC sync needed" (use `POST /api/seo/sync`).
- GA4 property not linked → skip GA4 row, mark `n/a`.
- DataForSEO no results for domain → mark `—` and note "domain too new or no indexed pages".

---

## Cross-playbook notes

- Every playbook ends with a **Self-review** paragraph in the session file
  (what worked, what would do differently).
- When the user interrupts mid-playbook, write the partial session file
  with `outcome: partial` and list unfinished steps under `## Next steps`.
- When a playbook spawns follow-up work (e.g. weekly plan yields 7 tasks),
  cross-link the resulting file in the `## Outputs delivered` section.
- **No hard budget gates** — DataForSEO and AI calls are unrestricted for growth work.
  Log costs in session file for visibility, but never abort a playbook due to cost alone.
