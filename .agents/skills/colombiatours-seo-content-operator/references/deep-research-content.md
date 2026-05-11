# Deep Research Content Workflow

The ColombiaTours SEO Content Operator must act as a travel researcher before
acting as a writer. This applies to posts, hubs, service pages, and destination
pages.

## Mission

Produce content that is:

- true
- timely
- useful for the traveler
- commercially aligned
- better than the SERP because it adds local/planner insight
- transparent about uncertainty

Do not generate content from keywords alone. Research the problem, the route,
the traveler decision, and the operational reality first.

## Required Research Pack

For every P0/P1 post or page, create or attach a research pack before drafting.

Path:

```text
artifacts/seo/YYYY-MM-DD-colombiatours-research-packs/{slug}.md
```

Minimum structure:

```markdown
---
keyword: ""
market: ""
locale: ""
target_url: ""
content_type: ""
research_status: "draft"
---

# Research Pack: <keyword>

## User Problem

What decision is the traveler trying to make?

## What Must Be True

Facts that need verification before publishing.

## Current Source Notes

| source | type | claim/fact | date_checked | confidence | usage |
|---|---|---|---|---:|---|

## Traveler Questions

Questions from GSC, SERP/PAA, DataForSEO, customer intent, or planner knowledge.

## Operational Reality

Logistics, seasonality, safety, cost, route, time, booking, or availability
constraints that affect the user.

## ColombiaTours Opportunity

How ColombiaTours can answer better than generic SERP pages.

## Risks / Unknowns

Facts that are uncertain, outdated, market-specific, or require human review.

## Content Decisions

What to include, exclude, soften, qualify, or route to a CTA.
```

## Source Quality Rules

Prefer:

- official destination, park, airport, migration, tourism board, or government
  sources for rules, closures, safety, visa, fee, timing, and access facts
- ColombiaTours internal product/source truth for inclusions, routes, pricing,
  planner support, logistics, and CTAs
- DataForSEO and GSC for demand and SERP opportunity
- current SERP pages for format and competitor gap, not as factual truth
- reputable travel publishers only for angle and reader expectations

Avoid relying on:

- unsourced blogs
- stale travel claims
- competitor copy
- AI snippets without source verification
- forum claims unless treated as questions/objections, not facts

## Verification Rules

For any high-impact claim, verify before publish:

- safety
- visa/entry requirements
- park closures or access rules
- pricing or fees
- seasonal availability
- transport time
- health/weather risk
- claims about what ColombiaTours includes or guarantees

If verification is missing, mark the claim `needs_review`, soften it, or remove
it. Do not publish hard claims that cannot be supported.

## Model Reasoning Use

Use the model's reasoning to:

- identify traveler intent beyond the keyword
- infer what comparisons matter to the user
- detect missing entities and practical constraints
- turn source facts into a clear decision framework
- spot contradictions between sources
- decide whether the content should be commercial, educational, trust-building,
  or a hybrid

Do not use reasoning to invent facts.

## Opportunity Analysis

Every research pack must answer:

- Why should this page exist?
- What user decision does it improve?
- What can ColombiaTours say that competitors do not?
- Which product, service, hub, or planner CTA should this content support?
- What would make the page unhelpful or risky?

If these questions cannot be answered, choose `watch`, `keep_hidden`, or
`block`.

## Writing Handoff

Only after research:

1. Build the SERP brief.
2. Build the outline.
3. Draft or transcreate.
4. Run publish gates.

The final content must preserve:

- current caveats
- practical constraints
- useful next steps
- factual uncertainty where relevant
- traveler-first framing

## Required Citation Behavior

The public page does not need academic citations unless useful, but the research
pack must keep source traceability. For external factual claims, keep the source
URL and date checked in the pack.

When the page includes claims about official rules, closures, documents, fees or
safety, prefer a visible link or a cautious instruction to verify before travel.
