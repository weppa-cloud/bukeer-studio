# SERP Competitive Brief

Every P0/P1 content row must have a SERP competitive brief before drafting,
transcreation, optimization, or publish.

## File Path

Write briefs to:

```text
artifacts/seo/YYYY-MM-DD-colombiatours-serp-briefs/{slug}.md
```

Use the target URL slug for `{slug}`. For hubs, use the route name, for example
`en-packages.md` or `paquetes.md`.

## Required Inputs

- primary keyword
- market and locale
- target URL
- content type
- DataForSEO SERP top 10
- DataForSEO keyword metrics
- GSC page/query metrics when available
- current OnPage status for target URL

## Required Brief Structure

```markdown
---
keyword: ""
market: ""
locale: ""
target_url: ""
content_type: ""
publish_decision: "draft"
---

# SERP Brief: <keyword>

## SERP Snapshot

| rank | url | title | page_type | angle | strengths | weaknesses |
|---:|---|---|---|---|---|---|

## Dominant Intent

Choose one:

- booking
- commercial_planning
- destination_research
- activity_research
- trust_safety
- informational_support

Explain why Google is rewarding that intent.

## Winning Format

State the format to produce:

- commercial hub
- package/category page
- service/planner page
- destination guide
- itinerary guide
- trust/safety guide
- FAQ/PAA support article

## Competitor Gaps

List gaps ColombiaTours can exploit:

- missing local logistics
- weak trust proof
- no planner/reviewer perspective
- generic AI copy
- no clear route/season/pricing caveats
- weak internal links to bookable products
- outdated or thin details

## Required Entities

List destinations, activities, logistics terms, safety concepts, route terms,
and seasonal terms that must appear naturally.

## Required FAQs

Include top PAA/GSC questions and answer intent.

## ColombiaTours Differentiator

State the specific advantage ColombiaTours can add. Do not invent facts.
If the differentiator is not backed by source truth, mark it `needs_review`.

## Outline

Draft the H1/H2 outline. The opener must answer the intent in 60-90 words.

## Internal Links

List internal link targets and fallback if EN target is not ready.

## Publish Gate Notes

State what must pass before publication:

- score
- canonical
- hreflang
- sitemap
- schema
- CTA
- factual review

## Decision

Choose:

- `draft`
- `review`
- `publish`
- `watch`
- `keep_hidden`
- `block`

Explain in one paragraph.
```

## Decision Rules

- If the top 10 is mostly informational, do not produce a pure sales page.
- If the top 10 is mostly agencies/packages, produce a commercial hub with
  planner trust and route clarity.
- If PAA dominates, add FAQ structure and concise answers.
- If competitors have stronger authority and ColombiaTours lacks proof, mark
  `review` and require E-E-A-T blocks.
- If ColombiaTours cannot add a specific advantage, choose `watch` or `block`.
