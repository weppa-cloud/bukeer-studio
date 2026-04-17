# Safety Rules — seo-growth-agent

Hard rules that apply to every playbook. Violating any of these is a stop
condition — abort, write what you have into a session file with
`outcome: aborted`, and escalate to the user.

---

## 1. Truth tables are read-only

**NEVER** mutate:

- `hotels`
- `activities`
- `package_kits` (and `package_kit_versions`)
- `destinations`
- any other catalog / product truth table

These are authored by Flutter admin users. The agent only **reads** truth
and writes to the SEO overlay.

**Allowed mutations (SEO overlay only):**

- `website_blog_posts` (full row lifecycle: insert draft, update, status
  change `draft ↔ review ↔ scheduled ↔ published ↔ archived`)
- `website_product_pages` — **only** these SEO overlay columns:
  - `seo_title`, `seo_description`, `seo_keywords`
  - `og_title`, `og_description`, `og_image_url`
  - `canonical_url`, `hreflang_alternates`
  - `custom_json_ld`, `content_overlay_mdx`
- `seo_keywords`, `seo_keyword_snapshots`, `seo_clusters` — insert/update only
- `seo_transcreation_jobs` — advance state machine via the API, never raw SQL
- `seo_localized_variants` — insert/update only
- `docs/growth-okrs/active.md`, `docs/growth-okrs/budget.md` — file edits
- `docs/growth-sessions/**`, `docs/growth-weekly/**` — new files

If a playbook needs to change a truth column (e.g. hotel description), **stop**
and hand the request to the Flutter admin via the user.

---

## 2. No destructive operations without explicit confirmation

**NEVER** run, without a line-by-line "yes, proceed" from the user:

- `DELETE FROM ...`
- `TRUNCATE ...`
- `UPDATE ... WHERE website_id = ...` without a narrow `slug` / `id` filter
- `UPDATE website_blog_posts SET status = 'archived'` on published rows
- Any bulk mutation affecting **>10 rows**
- Any change to a row where `published_at IS NOT NULL`

When in doubt, dry-run: select the rows first, show the count and a sample
of 3 to the user, then ask "proceed?".

---

## 3. Mutation logging is mandatory

Every write must be logged in the session file under `## Mutations`.

Format:

| Entity                 | Action             | Before                                 | After                                  | Source                               |
|------------------------|--------------------|----------------------------------------|----------------------------------------|--------------------------------------|
| website_blog_posts#N   | INSERT draft       | (none)                                 | `{title: "...", status: "draft"}`      | `/api/ai/editor/generate-blog`       |
| seo_transcreation_jobs#J | STATE draft→review | `state: "draft"`                       | `state: "review"`                      | `/api/seo/content-intelligence/transcreate` |

Rules:
- One row per logical mutation (not per SQL statement).
- Truncate long values (>120 chars) with `…` but keep enough to identify.
- Redact any field that might contain a secret (see rule 6).

---

## 4. Budget checks before paid calls

Paid providers today:

- **DataForSEO** — cap $50 / month
- **NVIDIA Nim (via OpenRouter)** — cap $20 / month

Before any paid call:

1. `Read docs/growth-okrs/budget.md`.
2. Compute subtotal for the current month.
3. Append a **pre-flight** row with the estimated cost. If the estimate
   cannot be known precisely, use the provider rate card upper bound.
4. At ≥80% cap → print a warning to the user and pause for confirmation.
5. At ≥100% cap → abort the paid step. Complete any free steps, write the
   session file with `outcome: partial`, flag in `## Decisions`.
6. After the call, edit the row with the actual cost (delta OK).

Never make a paid call with an unknown monthly cap. If the cap row is
missing, ask the user.

---

## 5. Bulk / published-content confirmations

Before any of the following, issue an explicit confirmation prompt:

| Scenario                                              | Prompt shape                                   |
|-------------------------------------------------------|------------------------------------------------|
| `UPDATE` or `INSERT` touching >10 rows                | "About to change N rows. Show sample? Proceed?" |
| `DELETE`                                              | "Delete N rows. Dry-run shown above. Proceed?" |
| Change to row with `published_at IS NOT NULL`         | "This post is live. Unpublish first or overwrite inline?" |
| Opening >5 GitHub issues in one run                   | "About to open N issues under label X. Proceed?" |
| Apply transcreation with any `severity: "block"` finding | "Review flagged blockers. Proceed anyway? (not recommended)" |

Wait for a clear affirmative ("yes", "proceed", "go") before continuing.
Ambiguous answers ("ok maybe") count as no.

---

## 6. Transcreation state machine

- Order is **fixed**: `draft → review → apply`.
- Never skip `review`. The review step produces `findings[]` that must be
  surfaced to the user before `apply`.
- If `review` returns `severity: "block"` on any finding, **do not apply**.
  Write findings into the session file, hand off to user.
- Never raw-SQL update `seo_transcreation_jobs.state`. Always go through the
  API route which enforces the state machine + audit trail.

---

## 7. Slug convention (pre-#129)

Until issue #129 ships a dedicated `locale` column on `website_blog_posts`,
locale disambiguation lives in the slug.

- Use `lib/seo/slug-locale.ts` → `prefixSlugForLocale(sourceSlug, targetLocale)`.
  This helper is planned (see #160). While it is not shipped, apply the same
  logic manually: `{locale-kebab}-{source-slug}` (e.g. `en-us-best-time-cartagena`).
- Source locale (default `es-CO` for most Bukeer sites) stays unprefixed.
- Post-#129 migration: read from the `locale` column and deprecate the prefix.

Never produce two posts with the same `(website_id, slug)` — the DB has a
unique constraint and the INSERT will fail.

---

## 8. Secrets — never log, never commit

Treat as toxic:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (public but still redact in logs)
- `OPENROUTER_AUTH_TOKEN`
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- `REVALIDATE_SECRET`
- any value matching `^sk-`, `^eyJ...`, `^Bearer `, `.*(api|service|secret)_key.*`

Rules:
- Never echo `.env*` files. Never include them in session logs.
- When curl / WebFetch examples are written into docs, use
  `$SUPABASE_SERVICE_ROLE_KEY` placeholders, not literal values.
- If a secret appears in an API response or error message, redact it in
  the mutation / session log (`"authorization": "Bearer ***redacted***"`).
- Never commit the session files if they contain secrets — re-read before
  stopping. (This skill does not commit on its own; the user does.)

---

## 9. Website-scope safety

- Every write MUST filter by `website_id`. An INSERT without `website_id`
  set is an automatic stop.
- When operating on a multi-website account, verify the `{site_id}` came
  from the user-confirmed slug lookup, not from guesswork.
- Before a bulk operation, run `SELECT id, slug FROM websites WHERE id = '{site_id}'`
  and confirm the slug matches what the user named.

---

## 10. Handoff boundaries

Stop this skill and delegate when:

| Signal                                          | Delegate to            |
|-------------------------------------------------|------------------------|
| Root cause is repo code (missing route, bug)    | `nextjs-developer`     |
| Schema change or RLS policy                     | `backend-dev`          |
| Needs formal spec / PRD                         | `specifying`           |
| Needs architectural validation                  | `tech-validator`       |
| Rendering/crash bug confirmed                   | `debugger`             |
| Theme / tokens / visual redesign                | `website-designer`     |
| New section components                          | `website-section-generator` |
| Perf / a11y / CWV gate                          | `website-quality-gate` |

The growth agent does not, ever, modify code in `app/`, `components/`,
`lib/`, `packages/`, or `scripts/`.
