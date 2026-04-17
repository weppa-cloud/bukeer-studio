# Prompt Templates — seo-growth-agent

Reusable prompts used by the playbooks. Each template uses `{{VARIABLE}}`
placeholders. Fill them in code/chat before submission — never send a
template with placeholders still present.

---

## DAILY_DIGEST_PROMPT

Used in Playbook 1. Takes GSC anomalies + striking-distance data and
produces the 3-bullet morning digest.

**Variables:**
- `{{WEBSITE_SLUG}}` — e.g. `colombiatours.travel`
- `{{TIMEFRAME}}` — e.g. `last 24h` or `yesterday vs 7d avg`
- `{{GSC_ANOMALIES_JSON}}` — array of anomaly objects
- `{{STRIKING_DISTANCE_JSON}}` — top candidates array
- `{{OKR_CONTEXT}}` — 7D/30D targets from `active.md`

**Template:**

```
You are the SEO growth agent for Bukeer Studio.

Website: {{WEBSITE_SLUG}}
Timeframe: {{TIMEFRAME}}

Anomalies (GSC):
{{GSC_ANOMALIES_JSON}}

Striking distance opportunities (positions 4-20):
{{STRIKING_DISTANCE_JSON}}

Active OKR targets:
{{OKR_CONTEXT}}

Output exactly 3 bullets, each formatted:
- [P1|P2|P3] <what moved> → <probable cause> → <next action (1 verb + specific target)>

Rules:
- Do not restate data — distill signal.
- Prioritize actions that move the 7D KPI (quick_wins_completed).
- If no signal worth acting on, return: "- [NOOP] No actionable signal today.
  Monitor again tomorrow."
```

**Example substitution:**
`{{WEBSITE_SLUG}} = colombiatours.travel`,
`{{TIMEFRAME}} = last 24h`,
`{{GSC_ANOMALIES_JSON} = [{"query":"tours cartagena","clicks_delta":-23,"position_delta":+4.1}]`.

---

## WEEKLY_PLAN_PROMPT

Used in Playbook 2. Turns the data dump into 5–7 Quick Wins.

**Variables:**
- `{{WEEK_OF}}` — e.g. `2026-W16`
- `{{WEBSITE_SLUG}}`
- `{{TOP_N}}` — default `6`
- `{{STRIKING_DISTANCE_JSON}}`
- `{{LOW_CTR_JSON}}`
- `{{CANNIBALIZATION_JSON}}`
- `{{DRIFT_JSON}}`
- `{{OKR_CONTEXT}}`

**Template:**

```
Generate a weekly SEO Quick Wins plan.

Week: {{WEEK_OF}}
Website: {{WEBSITE_SLUG}}
Target count: {{TOP_N}} tasks.

Inputs:
- Striking distance (P1): {{STRIKING_DISTANCE_JSON}}
- Low CTR (P2): {{LOW_CTR_JSON}}
- Cannibalization (P3): {{CANNIBALIZATION_JSON}}
- Drift / stale variants (P3): {{DRIFT_JSON}}

Active OKRs: {{OKR_CONTEXT}}

Ranking rule: impact × confidence / effort. Impact estimated from
(volume × (11 - position)) for keywords or (impressions × ctr_gap) for pages.

Output markdown with three sections: P1 (top 3), P2 (top 2), P3 (top 2).
Per task include:
- T-N id
- Keyword or URL
- Current metric
- Target metric (delta)
- Action (1–2 sentences, concrete)
- Source table/endpoint

Stop at {{TOP_N}} tasks. Omit a priority if there is no data for it.
```

**Usage:** feed output directly into `docs/growth-weekly/{{WEEK_OF}}-{{WEBSITE_SLUG_DASH}}.md`
under the Quick Wins section.

---

## CONTENT_BRIEF_PROMPT

Used in Playbook 3 as the `brief` field posted to `/api/ai/editor/generate-blog`.

**Variables:**
- `{{KEYWORD}}`
- `{{LOCALE}}` — BCP-47 (e.g. `es-CO`, `en-US`)
- `{{COMPETITOR_TOP10_DATASET}}` — JSON array of `{url, h1, h2: [], paa: [],
  entities: []}`
- `{{INTENT}}` — informational | transactional | navigational | commercial
- `{{WORD_COUNT}}` — default `1800` (informational) or `1200` (commercial)
- `{{TONE}}` — e.g. `advisor, warm, Colombian Spanish`
- `{{WEBSITE_BRAND_VOICE}}` — pulled from `websites.brand_voice` if present

**Template:**

```
Write a {{WORD_COUNT}}-word article in {{LOCALE}} targeting the primary
keyword "{{KEYWORD}}" with {{INTENT}} intent.

Tone: {{TONE}}.
Brand voice: {{WEBSITE_BRAND_VOICE}}.

Competitive landscape (top 10):
{{COMPETITOR_TOP10_DATASET}}

Requirements:
- H1 uses the exact primary keyword.
- Cover ≥80% of the entities extracted from competitors.
- Include a FAQ section answering the top 3 PAA questions.
- Internal-linking slots: mark with [[INTERNAL:destination-slug]] so the
  editor can replace with real URLs.
- Meta title ≤60 chars, meta description ≤155 chars, include primary keyword.
- Include a JSON-LD Article block at the end (as a fenced code block).
- Avoid fluff intros; open with a scannable answer in ≤80 words.
- Target grade A in the Bukeer content scorer.

Return MDX with frontmatter fields: title, slug, description, locale,
published_at (null), primary_keyword, secondary_keywords.
```

**Example substitution:**
`{{KEYWORD}} = mejor época para visitar Cartagena`,
`{{LOCALE}} = es-CO`, `{{INTENT}} = informational`.

---

## TRANSCREATE_PROMPT

Used in Playbook 4 as the prompt carried inside the transcreate API request
when extra nuance is needed beyond the glossary.

**Variables:**
- `{{SOURCE_CONTENT}}` — MDX body of source post
- `{{SOURCE_LOCALE}}`
- `{{TARGET_LOCALE}}`
- `{{GLOSSARY_JSON}}` — `[{source: "...", target: "...", notes: "..."}]`
- `{{TONE}}`
- `{{BRAND_TERMS_KEEP}}` — list of strings that must not be translated

**Template:**

```
Transcreate the following article from {{SOURCE_LOCALE}} to {{TARGET_LOCALE}}.

Source content:
<<<
{{SOURCE_CONTENT}}
>>>

Glossary (authoritative — always apply):
{{GLOSSARY_JSON}}

Brand terms to keep in original language:
{{BRAND_TERMS_KEEP}}

Tone: {{TONE}}.

Rules:
- Preserve H1/H2 structure and internal-link placeholders
  ([[INTERNAL:...]], [[EXTERNAL:...]]).
- Re-localize examples (currencies, units, culturally-bound references).
- Update meta title and description for the target market, not a literal
  translation.
- Update slug via the slug-locale helper (e.g. en-us-<source-slug>) until
  the dedicated `locale` column lands (#129).
- Preserve the JSON-LD Article block but translate `headline`, `description`,
  and set `inLanguage` to the BCP-47 target locale.
- Return MDX in the same shape as the source; do not merge paragraphs.

If any passage is ambiguous, mark it with <!-- REVIEW: {{REASON}} --> and
continue. Do not drop content silently.
```

**Usage:** this prompt is a fallback. First choice is to rely on
`/api/seo/content-intelligence/transcreate` which carries its own internal
prompt; only pass a `prompt_override` when the endpoint accepts it.

---

## AUDIT_PROMPT

Used in Playbook 5 to summarize the SQL+GSC join into an action plan.

**Variables:**
- `{{WEBSITE_SLUG}}`
- `{{TARGET_LOCALE}}`
- `{{SCOPE_FILTER}}` — e.g. `blog only`, `packages only`, `all`
- `{{MISSING_VARIANTS_JSON}}` — rows from the audit SQL
- `{{GSC_TOP_PAGES_JSON}}`

**Template:**

```
Audit multi-locale coverage.

Website: {{WEBSITE_SLUG}}
Target locale: {{TARGET_LOCALE}}
Scope: {{SCOPE_FILTER}}

Missing variants (source posts without target translation):
{{MISSING_VARIANTS_JSON}}

GSC top pages (last 30d):
{{GSC_TOP_PAGES_JSON}}

Produce:
1. Coverage headline: X of Y source posts have a {{TARGET_LOCALE}} variant (Z%).
2. P1 table — source posts with ≥100 clicks/30d and no variant. Columns:
   source_slug | clicks_30d | translation_group_id | suggested_target_slug.
3. P2 table — 20–99 clicks.
4. P3 table — <20 clicks (top 5 only by relevance).
5. Recommendation — next 5 posts to translate, with justification (1 line each).

Do not propose translation for posts with `status != 'published'`.
Do not suggest deleting source posts.
```

**Example substitution:**
`{{WEBSITE_SLUG}} = colombiatours.travel`,
`{{TARGET_LOCALE}} = en-US`, `{{SCOPE_FILTER}} = blog only`.

---

## Usage notes

- Always substitute variables before sending. Send the result as a single
  string; do NOT paste the template literally.
- Keep JSON inputs compact (strip whitespace) when the LLM context budget
  is tight — the scorer endpoint has a 60KB body cap.
- When a prompt output is destined for a Supabase INSERT, always
  `JSON.stringify` and parameterize — never string-interpolate user or LLM
  content into SQL.
- Record every prompt-driven external call in the session file's
  `## External costs` table.
