# Examples — seo-growth-agent

Three real session samples. Abbreviated where noise would dominate signal.
Each sample shows what the agent does turn-by-turn, what it writes to the
mutation table, and what it hands back to the user.

---

## Sample 1 — Monday Planning, colombiatours.travel, 2026-W16

**User:** "Haz el weekly planning de colombiatours.travel para esta semana."

### Turn 1 — Session start ritual

Agent:
1. `Read docs/growth-okrs/active.md` → extracts targets
   (7D `quick_wins_completed: 5`, 30D `clicks: 500`, `avg_position: 15`,
   `tech_score: 75`).
2. `Read docs/growth-okrs/budget.md` → DataForSEO `$0/50`, NVIDIA Nim `$0/20`.
3. Confirms MCPs: `supabase ✓`, `search-console ✓`, `google-analytics ✓`.
4. Confirms website: slug `colombiatours.travel`,
   id `894545b7-73ca-4dae-b76a-da5b6a3f8441`.
5. Reports: "Session ready. Running weekly-planning playbook for
   colombiatours.travel, week 2026-W16. Budget 0% / 0%. MCPs: gsc, ga4,
   supabase OK."

### Turn 2 — Pull GSC top queries (7d)

```
mcp__search-console__analytics_top_queries
  site_url: "https://colombiatours.travel"
  range: "7d"
  row_limit: 50
```

Result (abbreviated): 14 queries, top movers:
- `tours a cartagena` — 318 imp, 9 clicks, pos 8.2 (was 6.1, ↓2.1)
- `paquetes colombia todo incluido` — 204 imp, 1 click, pos 14.8
- `que hacer en medellin 3 dias` — 512 imp, 28 clicks, pos 5.3

Then:
```
mcp__search-console__analytics_compare_periods
  site_url: ..., current: "2026-04-13/2026-04-19", previous: "2026-04-06/2026-04-12"
```

Flags `tours a cartagena` as P1 striking-distance regression.

### Turn 3 — Striking distance refresh

```
GET /api/seo/analytics/striking-distance?websiteId=894545b7-...
→ { success: true, data: { items: [
    { keyword: "tours a cartagena", url: "/tours/cartagena", position: 8.2,
      volume: 2400, delta: -2.1 },
    { keyword: "paquetes colombia todo incluido", url: "/paquetes",
      position: 14.8, volume: 1100, delta: 0 },
    ... 8 more
  ] } }
```

### Turn 4 — Low CTR + cannibalization

```
GET /api/seo/analytics/keywords?websiteId=...&minImpressions=500
→ 3 pages below benchmark; top offender /blog/que-hacer-medellin (CTR 1.8%
  vs 3.2% benchmark at pos 5).

mcp__search-console__seo_cannibalization
  site_url: ..., top_n: 10
→ 1 conflict: "tours cafeteros" splits traffic across /tours/eje-cafetero
  and /blog/ruta-cafetera.
```

### Turn 5 — Render WEEKLY_PLAN_PROMPT → 6 Quick Wins

Quick Wins (abbrev):
- P1 T-1 `tours a cartagena` → `/tours/cartagena` from pos 8.2 → 5.0 (rewrite H1 + internal links).
- P1 T-2 `paquetes colombia todo incluido` → `/paquetes` from pos 14.8 → 9.0.
- P1 T-3 `que hacer en medellin 3 dias` → `/blog/que-hacer-medellin` raise CTR 1.8% → 3.0% (new title + description).
- P2 T-4 `/blog/clima-colombia` CTR 2.1% vs 4% benchmark.
- P2 T-5 `/tours/san-andres` meta description truncated, rewrite.
- P3 T-6 Cannibalization `tours cafeteros` — consolidate into `/tours/eje-cafetero`, turn blog into TOFU.

### Turn 6 — Write weekly file

`Write docs/growth-weekly/2026-W16-colombiatours-travel.md` with
frontmatter, OKR context, Quick Wins table, Friday review stub.

Agent reports: "Wrote weekly plan. 6 Quick Wins prioritized. DataForSEO
$0/50 (no paid calls used)."

---

## Sample 2 — Create Blog "mejor época visitar Cartagena" (es-CO)

**User:** "Crea blog SEO sobre la mejor época para visitar Cartagena."

### Turn 1 — Session start ritual

As sample 1. Confirms website + locale es-CO. Budget headroom OK.

### Turn 2 — Competitor research

```
WebSearch: "mejor época para visitar Cartagena"  lang:es  → 10 URLs
for each URL: WebFetch → extract H1, H2[], PAA, entities
```

Aggregates top 10 into a compact JSON dataset (entities: clima, temporada
alta, lluvia, huracanes, festividades; common H2s: meses, temporada alta
vs baja, qué empacar).

### Turn 3 — Content intelligence research

```
POST /api/seo/content-intelligence/research
  { websiteId, keyword: "mejor época para visitar Cartagena", locale: "es-CO",
    competitors: [...10 urls...] }
→ { success: true, data: {
    entities: ["temporada seca", "temporada de lluvias", "huracanes", ...],
    paa: ["¿cuál es el mejor mes...?", "¿cuándo es temporada alta...?", ...],
    suggestedHeadings: [...],
    gaps: ["festival del dulce", "temporada de cruceros"]
  } }
```

### Turn 4 — Generate blog (v2)

```
POST /api/ai/editor/generate-blog
  { websiteId, keyword, locale: "es-CO", version: "v2",
    brief: "<CONTENT_BRIEF_PROMPT rendered>", researchRef: "..." }
→ { success: true, data: { title: "Mejor Época para Visitar Cartagena: Guía...",
    slug: "mejor-epoca-visitar-cartagena", mdx: "...", meta: {...},
    cost: { tokens: 3820, usd: 0.009 } } }
```

Session file appends budget row: NVIDIA Nim $0.009 (pre-flight).

### Turn 5 — Score loop

```
POST /api/seo/score  { content, keyword, locale }
→ grade B (8 improvements)  [iteration 1]

POST /api/ai/editor/generate-blog
  { ..., revisionHints: [top-5 scorer suggestions] }
→ new MDX

POST /api/seo/score → grade A   [iteration 2, stop]
```

### Turn 6 — Insert draft

```
mcp__supabase__execute_sql
  INSERT INTO website_blog_posts (website_id, locale, slug, title,
    content_mdx, meta_title, meta_description, status, seo_grade,
    translation_group_id, created_by_agent)
  VALUES ('894545b7-...', 'es-CO', 'mejor-epoca-visitar-cartagena',
    'Mejor Época...', $1, $2, $3, 'draft', 'A', gen_random_uuid(),
    'seo-growth-agent')
  RETURNING id, slug;
→ id: "c7a1...", slug: "mejor-epoca-visitar-cartagena"
```

### Turn 7 — Session log

Mutations table:
| Entity                  | Action          | Before | After                             | Source                              |
|-------------------------|-----------------|--------|-----------------------------------|-------------------------------------|
| website_blog_posts#c7a1 | INSERT draft    | (none) | status:draft, grade:A, es-CO      | /api/ai/editor/generate-blog (v2)   |

External costs: NVIDIA Nim $0.018 (2 generations + 1 score).
Next step: hand draft to editor for human review before publish.

---

## Sample 3 — Translate existing post to en-US

**User:** "Traduce el post `mejor-epoca-visitar-cartagena` a en-US."

### Turn 1 — Session start ritual

As above. Confirms source post id via slug lookup:

```sql
SELECT id, slug, title, translation_group_id
FROM website_blog_posts
WHERE website_id = '894545b7-...'
  AND slug = 'mejor-epoca-visitar-cartagena';
→ id: "c7a1...", group: "g-5f31..."
```

### Turn 2 — Create draft

```
POST /api/seo/content-intelligence/transcreate
  { action: "create_draft", sourcePostId: "c7a1...", targetLocale: "en-US",
    glossary: [{source:"temporada seca", target:"dry season"},
               {source:"temporada alta", target:"peak season"}],
    tone: "advisor, US English, warm",
    brandTermsKeep: ["Bukeer", "Cartagena"] }
→ { success: true, data: { jobId: "j-88b2...", state: "draft" } }
```

### Turn 3 — Review

```
POST /api/seo/content-intelligence/transcreate
  { action: "review", jobId: "j-88b2..." }
→ { success: true, data: { state: "review",
    findings: [
      { severity: "info",  check: "currency", note: "COP preserved in 2 places; consider USD parens." },
      { severity: "warn",  check: "date_format", note: "DD/MM/YYYY → MM/DD/YYYY for US audience." },
      { severity: "ok",    check: "entities_coverage", note: "100% preserved." }
    ] } }
```

No `severity: "block"` → safe to apply. Agent reports findings to user
before apply.

### Turn 4 — Apply

```
POST /api/seo/content-intelligence/transcreate
  { action: "apply", jobId: "j-88b2..." }
→ { success: true, data: {
    state: "apply",
    created_post: { id: "d9c2...", slug: "en-us-mejor-epoca-visitar-cartagena",
      locale: "en-US", translation_group_id: "g-5f31...", status: "draft" } } }
```

Slug uses pre-#129 prefix convention (`en-us-*`) per SAFETY rule 7.

### Turn 5 — Session log

Mutations table:
| Entity                       | Action              | Before        | After            | Source         |
|------------------------------|---------------------|---------------|------------------|----------------|
| seo_transcreation_jobs#j-88b2| CREATE draft        | (none)        | state: draft     | transcreate API |
| seo_transcreation_jobs#j-88b2| STATE draft→review  | draft         | review           | transcreate API |
| seo_transcreation_jobs#j-88b2| STATE review→apply  | review        | apply            | transcreate API |
| website_blog_posts#d9c2      | INSERT en-US draft  | (none)        | locale:en-US, draft, group:g-5f31 | transcreate apply |

External costs: NVIDIA Nim $0.012 (transcreation + review).
Next step: human review of en-US draft → publish when ready → schedule
Playbook 5 audit for next locale round.
