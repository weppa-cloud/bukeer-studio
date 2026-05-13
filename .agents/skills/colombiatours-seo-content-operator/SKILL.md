---
name: colombiatours-seo-content-operator
description: Specialized ColombiaTours SEO content operator for demand-backed ES optimization, EN-US transcreation, and English content creation using DataForSEO, GSC, GA4, Supabase, and Google Search quality gates. Use when the user asks to optimize ColombiaTours content, transcreate EN-US hubs/posts/products, create English content from real demand, prioritize #315/#316 work, or publish SEO content with strict gates.
---

# ColombiaTours SEO Content Operator

Use this skill for ColombiaTours content operations where the goal is organic
growth from real demand: optimize existing Spanish pages, transcreate EN-US
variants, create English content, and decide whether a URL should publish,
stay hidden, watch, or block.

This skill complements `seo-growth-agent`. Load `seo-growth-agent` only when
you need its API inventory, session templates, or generic playbooks.

The agent must behave as a deep travel researcher before it behaves as a
copywriter. For posts and pages, use model reasoning to synthesize accurate,
timely, user-useful information from multiple sources, then convert that
research into content. Never start from a blank marketing draft.

## Operating Mode

Default mode is **full publish with strict gates**:

- You may prepare, apply, and publish content only after every gate in
  `references/publish-gates.md` passes.
- If any gate fails, do not publish. Choose `draft`, `watch`, `keep_hidden`,
  or `block` and record the reason.
- Any bulk mutation affecting more than 10 URLs or any destructive operation
  still requires explicit user confirmation.
- Never mutate truth tables: `activities`, `destinations`, `hotels`,
  `package_kits`, or other catalog/product source-of-truth tables.

## References

Load only the reference needed for the task:

- `references/google-2026-quality-gates.md` for Google Search standards,
  people-first content, E-E-A-T, AI use, spam, and hreflang.
- `references/traveler-editorial-style.md` for the ColombiaTours traveler
  voice, editorial references, structure, and anti-generic writing rules.
- `references/colombiatours-context.md` for tenant IDs, issues, OKRs, markets,
  priority entities, and known EN backlog rules.
- `references/demand-to-content-workflow.md` for DataForSEO/GSC/GA4 evidence,
  scoring, prioritization, and the required output matrix.
- `references/serp-competitive-brief.md` for the mandatory top-10 SERP
  comparison that must happen before drafting or publishing.
- `references/deep-research-content.md` for research depth, source quality,
  factual verification, opportunity analysis, and citations before writing.
- `references/site-content-publishing.md` for creating, editing, publishing and
  verifying public URLs for blog posts and website pages.
- `references/publish-gates.md` for exact publish, draft, watch, keep-hidden,
  and block decisions.

## Required Start Ritual

Before any operational run:

1. Read `docs/growth-okrs/active.md` and `docs/growth-okrs/budget.md`.
2. Confirm available data sources for the run: Supabase, GSC, GA4, DataForSEO,
   and rendered public URL checks.
3. Read the relevant ColombiaTours backlog/artifacts:
   - `docs/growth-sessions/2026-04-30-en-quality-backlog.md`
   - recent `artifacts/seo/**dataforseo**` files when using existing evidence
4. Create or update a session log:
   `docs/growth-sessions/YYYY-MM-DD-HHMM-colombiatours-seo-content.md`.
5. If using paid providers, log provider cost per the existing
   `seo-growth-agent` budget rules.

## Required Output Matrix

Every prioritization or batch plan must include this exact column set:

```text
cluster | market | locale | source_url | target_url | primary_keyword | intent | volume | cpc | difficulty | gsc_impressions | gsc_clicks | gsc_position | serp_type | competitor_gap | business_value | action | priority | publish_decision | issue
```

Allowed `action` values:

- `optimize_es_existing`
- `transcreate_en_from_es`
- `create_en_new`
- `keep_hidden`
- `watch`
- `block`

Allowed `publish_decision` values:

- `publish`
- `draft`
- `review`
- `watch`
- `keep_hidden`
- `block`

## Workflow

### 1. Evidence Pack

Build the evidence pack before writing or publishing:

- DataForSEO Labs: keyword volume, CPC, competition/difficulty, keyword ideas.
- DataForSEO SERP: top 10 winners, page type, SERP features, content gaps.
- DataForSEO competitors: ranked keywords and domain gaps.
- GSC: queries, impressions, clicks, CTR, average position, page/query mapping.
- GA4/funnel events: activation, WAFlow, WhatsApp, qualified lead signals.
- Supabase: current content state, locale variants, SEO overlays, status.

If demand evidence is missing, produce a dry-run matrix and stop before
content mutation.

Before drafting any P0/P1 row, create a SERP competitive brief from
`references/serp-competitive-brief.md`. Do not write or publish content until
the brief identifies the winning format, gaps, entities, FAQs, internal-link
plan, and ColombiaTours differentiator.

For posts and pages, also create or attach a research pack following
`references/deep-research-content.md`. The research pack must capture what is
true, current, useful, uncertain, and commercially relevant before any prose is
generated.

### 2. Prioritization

Score each opportunity with:

```text
Demand x Intent x Current Gap x Rankability x Business Value
```

Prioritize in this order:

1. Money pages with conversion intent.
2. Hubs that support packages, activities, destinations, or planners.
3. Support articles that internally link to a money page or hub.
4. Watchlist/maintenance pages.

Never create content from volume alone. The content must satisfy user intent
and support a conversion path or a strategically important hub.

### 3. Content Operation

- ES optimization: improve title, meta, H1, intro, FAQ, schema, entity coverage,
  internal links, trust proof, and CTA. Do not rewrite truth data.
- EN-US transcreation: adapt intent, slug, examples, objections, trust proof,
  CTA, currency/context, and entities for the US market. Do not literal-translate.
- EN new creation: use only when DataForSEO/SERP shows demand that cannot be
  satisfied by an existing ES source or transcreated page.
- Editorial voice: apply `references/traveler-editorial-style.md` so copy reads
  like a useful traveler's field note with local expertise, not a generic agency
  landing page.
- Research-first drafting: apply `references/deep-research-content.md` and
  preserve factual notes, caveats, and source-derived decisions in the session
  log or content brief.
- Site editing: apply `references/site-content-publishing.md` whenever the task
  creates or edits a public blog post, custom page, hub page, or SEO overlay.
  Every published item must return and verify its public URL.

### 4. Publish Or Block

Run `references/publish-gates.md` before any publish/apply. If a gate fails,
choose the strictest applicable state:

- `block` for factual risk, thin content, scaled-content risk, or wrong-language
  body.
- `keep_hidden` for no-source or no-demand EN rows.
- `draft` for good opportunity but missing review/evidence.
- `watch` for live content that is indexable but not ready to scale.

### 5. Monitoring

Every published or optimized URL must have:

- baseline source: GSC/DataForSEO/GA4/funnel event
- issue: usually #315 for EN keyword universe or #316 for EN transcreation
- evaluation dates: day 7, day 21, day 45
- success metric: clicks, impressions, CTR, position, qualified lead, or CTA

Reoptimize title/meta when impressions exist but CTR underperforms.

## Safety

- Use Studio APIs or approved Supabase overlay tables; never raw-update
  transcreation state machines.
- Never skip transcreation review before apply.
- Never publish more than 10 URLs in one run without explicit confirmation.
- Never expose EN URLs in sitemap/hreflang unless language, canonical,
  reciprocal hreflang, schema, and content quality all pass.
- Always log mutations with before/after summary and source evidence.
- Never consider work complete until the public URL is recorded and verified.
