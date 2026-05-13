# ColombiaTours Context

## Tenant

- Website: `colombiatours.travel`
- Subdomain: `colombiatours`
- Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Growth epic: #310
- Main EN issues:
  - #315: Build EN-US keyword universe with DataForSEO
  - #316: Transcreate and publish EN-US priority hubs
- Related issues:
  - #312: live technical audit for top 100 URLs
  - #314: audit and optimize Spanish priority content
  - #319: Colombia destination entity graph
  - #320: E-E-A-T planner/reviewer and source blocks

## OKR Focus

Primary objectives:

- Grow qualified trip requests in ES.
- Open EN-US channel from zero.
- Build domain authority and demand-backed content coverage.

Default reporting dimensions:

- `account_id`
- `website_id`
- `locale`
- `market`

Do not aggregate ES/EN/MX outcomes into a single success metric.

## Priority Markets

- ES Colombia / LATAM: optimize current pages and conversion paths.
- EN-US: transcreate and create content for US traveler demand.
- MX: track separately when DataForSEO/GSC evidence indicates demand.

## Priority Content Surfaces

Prioritize:

1. Package and activity money pages.
2. Destination and itinerary hubs.
3. Planner/trust pages that support conversion.
4. Support articles that drive internal links into money pages/hubs.

Lower priority:

- Generic listicles with no conversion path.
- EN-only rows with no ES source, WP source, demand, or business value.
- Spanish-slug EN pages unless they have proven demand and pass quality gates.

## Priority Entities

Use demand evidence before choosing any entity, but these are known strategic
clusters:

- Cartagena
- Medellin
- Bogota
- San Andres
- Tayrona
- Coffee Region / Eje Cafetero
- Amazon / Amazonas
- Cano Cristales
- La Guajira
- Colombia tour packages
- Colombia itinerary
- Colombia safety
- Best time to visit Colombia
- Family, honeymoon, adventure, and custom tours

## Existing EN Backlog Rules

Use `docs/growth-sessions/2026-04-30-en-quality-backlog.md` as the starting
operational backlog.

Known states:

- `review_quality`: live EN rows that require manual/content QA before scale.
- `translate_from_es`: ES source exists; move only demand-backed rows to draft.
- `do_not_publish`: no reliable source; keep hidden unless rebuilt from a new
  approved brief.

Do not bulk-publish `translate_from_es` rows. Select only rows tied to #315
Tier A/B demand or clear GSC/DataForSEO opportunity.

## Brand And Content Position

ColombiaTours content should feel like a local travel planner helping an
international traveler make a confident decision.

Default tone:

- Practical
- Trustworthy
- Specific
- Warm but not promotional
- Clear about logistics, inclusions, constraints, and next step

Avoid:

- Generic "ultimate guide" filler
- Unsupported safety promises
- Overclaiming "best" without evidence
- Literal translations from Spanish
- Keyword stuffing
