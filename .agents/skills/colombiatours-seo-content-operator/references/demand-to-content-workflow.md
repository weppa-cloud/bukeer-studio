# Demand To Content Workflow

## Required Matrix

Every planning, dry-run, or execution batch must output this exact matrix:

```text
cluster | market | locale | source_url | target_url | primary_keyword | intent | volume | cpc | difficulty | gsc_impressions | gsc_clicks | gsc_position | serp_type | competitor_gap | business_value | action | priority | publish_decision | issue
```

## Evidence Sources

Use evidence in this order:

1. GSC for actual ColombiaTours demand.
2. DataForSEO Labs for external market demand.
3. DataForSEO SERP for intent and rankability.
4. GA4/funnel events for conversion and engagement.
5. Supabase for current content, locale, and publish state.
6. Rendered URL checks for technical readiness.

## Opportunity Score

Use:

```text
Demand x Intent x Current Gap x Rankability x Business Value
```

Suggested scoring scale: 1 to 5 for each factor.

- Demand: GSC impressions/clicks plus DataForSEO volume and CPC.
- Intent: buying/reservation > planning > destination > informational.
- Current Gap: missing page, weak page, untranslated page, or CTR/rank gap.
- Rankability: competitor strength, SERP type, difficulty, domain fit.
- Business Value: package/activity margin, lead quality, funnel relevance.

Priority:

- P0: score >= 400, conversion path exists, and page is missing/broken.
- P1: score >= 250, strong demand or position 4-20 opportunity.
- P2: score >= 125, useful support content or entity coverage.
- P3: lower score; watch or backlog.

## Intent Mapping

Map keywords and queries to one intent:

- `booking`: user is ready to compare, price, reserve, or contact.
- `commercial_planning`: user is choosing itinerary, agency, destination, or package.
- `destination_research`: user is exploring a place.
- `activity_research`: user is exploring an activity.
- `trust_safety`: user needs confidence, safety, visa, cost, or logistics.
- `informational_support`: user has an early-stage question.

## Action Decision

Choose exactly one action:

- `optimize_es_existing`: ES URL has traction, position 4-20, CTR gap, or weak
  content that can support leads.
- `transcreate_en_from_es`: ES source exists and EN demand maps to the same
  user problem, but the page needs market adaptation.
- `create_en_new`: EN demand exists and no ES source can satisfy the intent
  without creating a poor translation.
- `keep_hidden`: row has no source, no demand, or failed EN quality gate.
- `watch`: live/indexable page has some evidence but not enough to scale.
- `block`: content is thin, risky, wrong-language, duplicate, or scaled-content.

## SERP Review

For each P0/P1 content target, inspect the top 10 SERP and record:

- dominant page type: product, hub, guide, list, local pack, UGC, video, PAA
- content angle that Google rewards
- missing angle ColombiaTours can uniquely add
- required entities and FAQs
- competitors that should not be copied

If ColombiaTours cannot add value beyond the top 10, do not create a page.

The SERP review must be stored as:

```text
artifacts/seo/YYYY-MM-DD-colombiatours-serp-briefs/{slug}.md
```

Use `references/serp-competitive-brief.md` as the required structure. Content
drafting starts only after this brief exists.

## Internal Link Policy

Every support article must link to a hub or money page. Every hub should link
to its relevant packages, activities, destinations, and planner CTA.

Do not add EN internal links to EN targets that fail publish gates. Use ES or
default routes intentionally only when the EN page is not ready.
