# Agent Setup — Claude Code for Bukeer Studio

**Status**: Active
**Last updated**: 2026-04-17
**Audience**: Developers configuring a Claude Code session (human or agent) to run Studio workflows — in particular the `seo-growth-agent` skill and the growth OKR loop.

This guide enables a new developer (or a fresh agent session) to:

1. Install and configure all MCP servers required for the SEO growth loop.
2. Set up credentials securely — no secrets committed to the repo.
3. Execute a copy-paste verification checklist to confirm the environment is healthy.
4. Understand the security boundaries — what must NEVER leave `.env.local` / `.env.mcp`.
5. Follow the session-start ritual so the agent always loads the right OKR + budget state before acting.

---

## 1. MCP Inventory

MCPs are declared in [`.mcp.json`](../../.mcp.json). Config snippets below mirror that file; update the snippet and this table together if the config changes.

| MCP | Purpose | Package | Config snippet | Required for |
|-----|---------|---------|----------------|--------------|
| `playwright` | E2E browser control for Studio flows | `@playwright/mcp@latest` | `"command": "npx", "args": ["@playwright/mcp@latest"]` | `playwright-skill`, `qa-nextjs`, growth playbook visual verification |
| `supabase` | DB queries, migrations, Edge Function logs for the shared Bukeer project | `@supabase/mcp-server-supabase@latest` | `bash -lc "set -a; [ -f .env.mcp ] && source .env.mcp; set +a; npx -y @supabase/mcp-server-supabase@latest --access-token \"$SUPABASE_ACCESS_TOKEN\""` | `backend-dev`, all `seo-growth-agent` playbooks that read `seo_*` tables |
| `chrome-devtools` | Lighthouse audits, DOM / network inspection | `chrome-devtools-mcp@latest` | `"command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"]` | `website-quality-gate`, tech-score playbook |
| `shadcn-ui` | shadcn component metadata + scaffolding | `shadcn-ui-mcp-server` | `"command": "npx", "args": ["-y", "shadcn-ui-mcp-server"]` | `website-section-generator`, UI PRs |
| `magic-ui` | Magic UI component catalog | `magicui-mcp` | `"command": "npx", "args": ["-y", "magicui-mcp"]` | `website-section-generator` |
| `aceternity-ui` | Aceternity component catalog | `aceternity-ui-mcp` | `"command": "npx", "args": ["-y", "aceternity-ui-mcp"]` | `website-section-generator` |
| `google-analytics` | GA4 property reports, realtime, funnels | `analytics-mcp` (via `pipx run`) | `bash -lc "set -a; [ -f .env.mcp ] && source .env.mcp; set +a; pipx run analytics-mcp"` | Overview / sessions playbook, conversion tracking |
| `search-console` | GSC queries, Bing, pagespeed, opportunity finder | `search-console-mcp@latest` | `bash -lc "set -a; [ -f .env.mcp ] && source .env.mcp; set +a; npx -y search-console-mcp@latest"` | Keyword research, striking-distance, cannibalization, low-CTR playbooks |

### Planned Tier 1 (not yet shipped)

These MCPs are tracked in GitHub issues and will be wired into the same `.mcp.json` once ready:

| MCP | Purpose | Package | Issue | Required for |
|-----|---------|---------|-------|--------------|
| `bukeer-studio` | Thin wrapper around `/api/seo/*` and `/api/ai/*` endpoints (blog generation, integrations status, technical audit trigger) | TBD — local MCP under `packages/` | [#158](https://github.com/weppa-cloud/bukeer-studio/issues/158) | `seo-growth-agent` content-production playbook, integrations health check |
| `dataforseo` | SERP data, keyword volume, difficulty + budget cap enforcement | Vendor-provided | [#159](https://github.com/weppa-cloud/bukeer-studio/issues/159) | Striking-distance, content-gap, competitor analysis playbooks |

> When these land, update the table above and the verification checklist in §4.

### Skill cross-reference

The `seo-growth-agent` skill (`.claude/skills/seo-growth-agent/SKILL.md`) orchestrates the following MCPs per playbook:

- **Discover / keyword research** → `search-console`, `google-analytics`, `dataforseo` (planned)
- **Content production** → `bukeer-studio` (planned), `supabase`
- **Technical audit** → `chrome-devtools`, `bukeer-studio` (planned), `playwright`
- **Measurement / OKR update** → `search-console`, `google-analytics`, `supabase`

---

## 2. Required Credentials

All credentials live in local, gitignored files. The `.env*` glob in [`.gitignore`](../../.gitignore) already blocks every `.env*` variant except the committed `.env.local.example` template.

| Variable | Purpose | Where to store | Rotation policy |
|----------|---------|----------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL (shared with bukeer-flutter) | `.env.local` + `.env.mcp` | No rotation (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for SSR client | `.env.local` | Only on reset of Supabase project |
| `SUPABASE_ACCESS_TOKEN` | MCP-only PAT for `@supabase/mcp-server-supabase` | `.env.mcp` (gitignored) | Rotate quarterly or on offboarding |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key (Edge Functions, scripts) | `.env.local` (gitignored) | Rotate quarterly; immediately on suspected leak |
| `OPENROUTER_AUTH_TOKEN` | AI generation (blogs, section generator) | `.env.local` | Rotate quarterly |
| `OPENROUTER_BASE_URL` | OpenRouter endpoint | `.env.local` | n/a |
| `OPENROUTER_MODEL` | Model slug (e.g. `anthropic/claude-sonnet-4-5`) | `.env.local` | n/a |
| `DATAFORSEO_LOGIN` | DataForSEO API login (planned) | `.env.local` | Rotate immediately after any exposure |
| `DATAFORSEO_PASSWORD` | DataForSEO API password (planned) | `.env.local` | Rotate immediately after any exposure |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to GA4 service-account JSON | `.env.mcp` (path only; JSON file outside repo) | Rotate on offboarding |
| `GOOGLE_PROJECT_ID` | GCP project id for GA4 MCP | `.env.mcp` | n/a |
| `GSC_SITE_URL` | Primary GSC site URL | `.env.mcp` | n/a |
| GSC / GA4 OAuth tokens | User-scoped auth for `search-console` / `google-analytics` | Managed by MCP OAuth flow (cached in user MCP dir, NOT in repo) | Re-auth when token expires |
| `REVALIDATE_SECRET` | Auth for `/api/revalidate` ISR endpoint | `.env.local` | Rotate quarterly |

### Verify `.env.mcp` is gitignored

```bash
grep -F ".env" .gitignore   # must show: .env*
git check-ignore -v .env.mcp   # must return a gitignore rule
```

If either command does not confirm the file is ignored, **stop** and fix `.gitignore` before saving secrets.

### Templates shipped in repo

- [`.env.local.example`](../../.env.local.example) — copy to `.env.local`
- [`.env.mcp.example`](../../.env.mcp.example) — copy to `.env.mcp`

---

## 3. Security Boundaries

These rules are non-negotiable for any agent or human committing to this repo.

### Never commit or log to:

- `CLAUDE.md` or any other file under version control
- Memory files under `/Users/*/memory/` (personal auto-memory)
- GitHub issues, PR descriptions, or commit messages
- Agent session logs under `docs/growth-sessions/*.md`
- Slack / email / screenshots shared with non-engineers

### Redact in session logs

When an agent session records a mutation with `Before / After` values (required by the growth playbook audit log), **redact** any column that contains:

- tokens, passwords, secrets
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_AUTH_TOKEN`, `DATAFORSEO_PASSWORD`
- raw OAuth refresh tokens

Replace the value with `"[REDACTED]"` and keep the column name so the audit remains useful.

### GitHub token scope

If the agent uses `gh` CLI, the PAT must be scoped to **read+write on issues and pull requests only** — no `admin:org`, no `workflow`, no `delete_repo`.

### Rotation triggers

Rotate any credential when:

- A developer offboards from the team
- A leak is suspected (accidental paste, force-push of a dotfile, public log)
- Quarterly cadence (default to the 1st of Jan / Apr / Jul / Oct)

### DataForSEO budget (pre-#130)

Until issue [#130](https://github.com/weppa-cloud/bukeer-studio/issues/130) ships the `seo_provider_usage` table, budget is tracked manually in [`docs/growth-okrs/budget.md`](../growth-okrs/budget.md). Rules (mirrored from that file):

- Every paid DataForSEO call MUST append a row to `budget.md` **before** execution.
- At 80% monthly cap → warn the user.
- At 100% monthly cap → abort the operation; ask user to raise the cap or wait for reset.
- First of month → archive usage to `docs/growth-okrs/history/YYYY-MM-budget.md` and reset.

---

## 4. Setup Verification Checklist

Run the block below after completing §1–§3. Each step prints a clear pass/fail signal.

```bash
# ─────────────────────────────────────────────
# 0. Prerequisites
# ─────────────────────────────────────────────
node --version    # expect v22.x or v24.x
npm --version
claude mcp list   # expect all 8 MCPs present with ✓

# ─────────────────────────────────────────────
# 1. MCP: supabase — list tables on the shared project
# ─────────────────────────────────────────────
# Run via MCP tool (in a Claude Code session):
#   mcp__supabase__list_tables project_id=<your-project-id> schemas=["public"]
# Expected: list includes websites, seo_page_metrics_daily, seo_keyword_snapshots

# ─────────────────────────────────────────────
# 2. MCP: search-console — OAuth + data
# ─────────────────────────────────────────────
#   mcp__search-console__accounts_list
#   mcp__search-console__sites_list
# Expected: at least one verified GSC property
# Troubleshooting: if 401 → re-run accounts_list with re-auth, or delete
# cached OAuth token under ~/.cache/search-console-mcp and repeat.

# ─────────────────────────────────────────────
# 3. MCP: google-analytics — account summaries
# ─────────────────────────────────────────────
#   mcp__google-analytics__get_account_summaries
# Expected: non-empty list including the Bukeer property
# Troubleshooting: if empty → verify GOOGLE_APPLICATION_CREDENTIALS
# points to the service-account JSON with GA4 Viewer role.

# ─────────────────────────────────────────────
# 4. MCP: chrome-devtools — smoke test
# ─────────────────────────────────────────────
#   mcp__chrome-devtools__list_pages
# Expected: current Chrome page list (or empty if no tabs)

# ─────────────────────────────────────────────
# 5. Bukeer API alive (local dev) — uses session pool
# ─────────────────────────────────────────────
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
DEV_PID=$!
# Wait for server (max 60s)
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"
curl -sf "http://localhost:$PORT/api/seo/integrations/status" > /dev/null \
  && echo "✓ /api/seo/integrations/status alive" \
  || echo "✗ API did not respond"

# ─────────────────────────────────────────────
# 6. Blog AI endpoint (dummy seed)
# ─────────────────────────────────────────────
curl -s -X POST "http://localhost:$PORT/api/ai/editor/generate-blog" \
  -H "Content-Type: application/json" \
  -d '{"websiteId":"894545b7-73ca-4dae-b76a-da5b6a3f8441","keyword":"cartagena","locale":"es-CO"}' \
  | jq '.success'
# Expected: true
# Troubleshooting:
#   - 401/403 → check OPENROUTER_AUTH_TOKEN in .env.local
#   - 404 website → verify the websiteId belongs to a website in the shared Supabase project

# ─────────────────────────────────────────────
# Cleanup — always release the session slot
# ─────────────────────────────────────────────
kill $DEV_PID 2>/dev/null
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

### Troubleshooting matrix

| Step | Symptom | Likely cause | Fix |
|------|---------|--------------|-----|
| 1 | `SUPABASE_ACCESS_TOKEN` missing | `.env.mcp` not created | `cp .env.mcp.example .env.mcp` and fill |
| 1 | `401 Unauthorized` | Rotated PAT | Regenerate in Supabase dashboard, update `.env.mcp` |
| 2 | `401` from GSC | OAuth token refresh | Re-run `mcp__search-console__accounts_list`; consent again in browser |
| 3 | Empty GA4 list | Service account missing Viewer role | Add SA email in GA4 admin → Property Access Management |
| 5 | Port already in use | Stale session slot | `npm run session:list` → `npm run session:release <slot>` |
| 6 | `402 Payment Required` from DataForSEO (once wired) | Budget cap hit | Check [`docs/growth-okrs/budget.md`](../growth-okrs/budget.md) and raise cap |

---

## 5. Session Start Ritual

Every new agent session MUST execute these steps **before** any mutation or paid MCP call. This is the minimum invariant that keeps OKR + budget state accurate.

1. **Verify OKR file exists**
   ```bash
   ls -la docs/growth-okrs/active.md
   ```
   If missing → stop, flag to user.

2. **Read current OKRs** — load [`docs/growth-okrs/active.md`](../growth-okrs/active.md) into context. Note per-website targets + current values + last-fetch timestamp.

3. **Check budget headroom** — read [`docs/growth-okrs/budget.md`](../growth-okrs/budget.md). Record the remaining USD for each paid provider (DataForSEO, NVIDIA Nim via OpenRouter).

4. **Confirm required MCP tools are available** — verify that the tools the planned playbook needs are listed in the current session. Minimum set for the growth loop:
   - `mcp__supabase__execute_sql`
   - `mcp__supabase__list_tables`
   - `mcp__search-console__analytics_query`
   - `mcp__search-console__analytics_top_queries`
   - `mcp__google-analytics__run_report`
   - `mcp__google-analytics__get_account_summaries`

5. **Load the skill** — confirm `.claude/skills/seo-growth-agent/SKILL.md` is readable. If missing, the skill has not landed yet ([#155](https://github.com/weppa-cloud/bukeer-studio/issues/155) tracks it); abort SEO work until it is present.

6. **Report session ready** — emit a one-line summary to the user:
   ```
   Session ready — website=<id>, OKRs loaded (7D/30D/90D), budget headroom=$X/$Y DFSEO + $A/$B Nim, MCPs ok.
   ```

Only after step 6 should the agent proceed to any playbook execution.

---

## 6. Troubleshooting

Common failure modes and first-response fixes.

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| MCP server fails to start at session open | Missing / malformed `.env.mcp` | `claude mcp logs <name>` → identify missing var → fill in `.env.mcp` → restart Claude Code |
| `search-console` returns `401 / invalid_grant` | Cached OAuth token expired | Delete OAuth cache for the MCP and re-run an `accounts_list` call to trigger re-auth |
| `supabase` MCP returns `401` | PAT rotated or revoked | Generate a fresh PAT at `https://supabase.com/dashboard/account/tokens`, update `SUPABASE_ACCESS_TOKEN` in `.env.mcp`, restart Claude Code |
| `google-analytics` returns empty accounts | Service account not added to GA4 property | Invite the SA email (viewer role) in GA4 admin |
| `dataforseo` returns `402 Payment Required` (once wired) | Budget cap hit at the vendor | Check [`docs/growth-okrs/budget.md`](../growth-okrs/budget.md); raise cap via ops if justified |
| `session:list` shows all slots `BUSY` | Other parallel agents or stale locks | `npm run session:list` to see PIDs; if a PID is dead, `npm run session:release <slot>`; otherwise wait |
| `npm run dev:session` fails: `EADDRINUSE` | Port not released | `npm run session:release <slot>` and retry |
| Blog AI endpoint returns `500` with `OPENROUTER_AUTH_TOKEN` in error | Missing or invalid token | Set `OPENROUTER_AUTH_TOKEN` in `.env.local`; restart `npm run dev:session` |

If a fix here does not resolve the issue, capture the exact error and hand it to the `debugger` skill.

---

## 7. Cross-references

- Skill definition: [`.claude/skills/seo-growth-agent/SKILL.md`](../../.claude/skills/seo-growth-agent/SKILL.md) (pending — see [#155](https://github.com/weppa-cloud/bukeer-studio/issues/155))
- Shipped Studio SEO flows: [`docs/seo/SEO-FLUJOS-STUDIO.md`](../seo/SEO-FLUJOS-STUDIO.md)
- Target SEO operating model: [`docs/seo/SEO-PLAYBOOK.md`](../seo/SEO-PLAYBOOK.md)
- Cross-repo context (Flutter + shared Supabase): [`.claude/rules/cross-repo-flutter.md`](../../.claude/rules/cross-repo-flutter.md)
- Local session pool rules: [`docs/development/local-sessions.md`](./local-sessions.md) and [`.claude/rules/e2e-sessions.md`](../../.claude/rules/e2e-sessions.md)
- OKR state: [`docs/growth-okrs/active.md`](../growth-okrs/active.md)
- Budget state: [`docs/growth-okrs/budget.md`](../growth-okrs/budget.md)
