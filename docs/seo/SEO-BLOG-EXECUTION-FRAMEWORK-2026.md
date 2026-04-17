# SEO Blog 2026 Execution Framework (Technical + Content)

Related spec (source of truth): [#180](https://github.com/weppa-cloud/bukeer-studio/issues/180)

Template files:

- `docs/seo/templates/seo-blog-global-technical-checklist.template.csv`
- `docs/seo/templates/seo-blog-content-checklist.template.csv`
- `docs/seo/templates/seo-blog-work-items.template.csv`

## Objective

Operationalize blog SEO work in two mandatory dimensions:

- Technical dimension first (blocking): shared technical hardening across all posts.
- Content dimension second (post-specific): editorial optimization by slug.

Initial audited baseline: `62/100`
Publication target: `90/100`

## Scope

Initial batch:

- `cano-cristales-guia-de-viajes`
- `temporada-de-ballenas-en-colombia`
- `san-valentin-en-colombia-para-enamorados`

Out of scope for this framework:

- Full visual redesign of blog pages.
- Non-SEO architectural refactors.

## Phase model (mandatory)

### Phase A: Global technical hardening (blocking)

All `technical` P0/P1 items must be `Done` before closing dependent `content` items.

### Phase B: Per-post content optimization (after Phase A)

Content items can progress only when all referenced technical dependencies are closed.

## Artifact 1: Global Technical Checklist (template)

Status values: `pass` | `fail`
Severity values: `P0` | `P1` | `P2` | `P3`

| component | check | status | severity | evidence | owner | acceptance_test |
|---|---|---|---|---|---|---|
| canonical-hreflang | Canonical and hreflang use production domain (no placeholders). | fail | P0 | Lighthouse + DOM inspection |  | Canonical/hreflang resolved to final domain for all target slugs. |
| robots-sitemap | `robots.txt` and sitemap are valid, crawlable, and linked. | fail | P0 | Lighthouse SEO audit + HTTP check |  | Robots parses correctly; sitemap reachable and referenced. |
| metadata | Unique title/meta description per post. | fail | P1 | Lighthouse + DOM inspection |  | No missing or duplicated metadata in target batch. |
| semantics-a11y | Sequential heading order, descriptive anchor text, AA contrast minimum. | fail | P1 | Lighthouse accessibility + manual review |  | No heading-order or critical contrast/link-text failures. |
| media-seo | Relevant non-empty alt text and valid image aspect ratios. | fail | P1 | Lighthouse + DOM inspection |  | No incorrect aspect-ratio failures; informational images have descriptive alt. |
| structured-data | `BlogPosting`, `BreadcrumbList`, `Organization/TravelAgency` valid. | fail | P1 | Rich Results Test + JSON-LD validation |  | Required schema present and valid for all target posts. |
| cwv-gate | Meets CWV target in p75 where measurable (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1). | fail | P2 | CrUX/PSI/Lighthouse evidence |  | CWV target met or accepted exception documented. |

## Artifact 2: Per-Post Content Checklist (template)

Status values: `pass` | `fail`
Priority values: `high` | `medium` | `low`
Estimate values: `S` | `M` | `L`

| post_slug | component | check | status | priority | estimate | owner | acceptance_test |
|---|---|---|---|---|---|---|---|
| <slug> | search-intent | Primary/secondary intent mapped and aligned with current SERP. | fail | high | M |  | Query intent map documented; intro + structure match intent. |
| <slug> | editorial-structure | Clear scan flow: value-first opening, useful H2/H3, strong close CTA. | fail | high | M |  | Article readability and section hierarchy validated by editor checklist. |
| <slug> | tourism-value | Includes logistics, best season, indicative costs, safety, recommendations. | fail | high | L |  | Required tourism components present and coherent. |
| <slug> | internal-linking | Cluster links to destination/package/activity/related posts. | fail | medium | S |  | Minimum internal link density and relevance met. |
| <slug> | eeat-trust | Adds source references and local-expertise trust signals. | fail | medium | M |  | Trust and source evidence visibly present. |
| <slug> | multilingual-parity | `es`, `en`, `pt` maintain semantic equivalence. | fail | high | L |  | Localized versions validated for intent and key claims parity. |

## Artifact 3: Operational backlog item interface

### Type definition

```ts
export type SeoBlogDimension = 'technical' | 'content'

export type SeoBlogWorkItem = {
  work_id: string
  post_slug: string
  dimension: SeoBlogDimension
  component: string
  issue: string
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  priority: 'high' | 'medium' | 'low'
  owner: string
  estimate: 'S' | 'M' | 'L'
  depends_on: string[]
  acceptance_test: string
  status: 'Open' | 'In Progress' | 'Blocked' | 'Done'
}
```

### CSV header

```csv
work_id,post_slug,dimension,component,issue,severity,priority,owner,estimate,depends_on,acceptance_test,status
```

### Precedence rule (mandatory)

- A `content` item cannot be marked `Done` if any `depends_on` points to a `technical` item with status different from `Done`.

## Initial batch execution board (seed)

| work_id | post_slug | dimension | component | issue | severity | priority | estimate | depends_on | acceptance_test | status |
|---|---|---|---|---|---|---|---|---|---|---|
| TECH-001 | cano-cristales-guia-de-viajes | technical | canonical-hreflang | Placeholder canonical/hreflang domain. | P0 | high | M |  | Production domain appears in canonical + alternates. | Open |
| TECH-002 | cano-cristales-guia-de-viajes | technical | metadata | Lighthouse flags missing meta description. | P1 | high | S |  | Meta description detectable and unique. | Open |
| TECH-003 | cano-cristales-guia-de-viajes | technical | media-seo | Incorrect image aspect ratio + low-quality alt coverage. | P1 | high | M |  | No aspect-ratio failures; descriptive alt policy met. | Open |
| TECH-004 | temporada-de-ballenas-en-colombia | technical | semantics-a11y | Contrast issues in meta/date text blocks. | P1 | high | S |  | AA contrast in article metadata and key labels. | Open |
| TECH-005 | san-valentin-en-colombia-para-enamorados | technical | semantics-a11y | Heading order invalid (H1 to H3 jump). | P1 | high | S |  | Sequential heading hierarchy passes audit. | Open |
| TECH-006 | *global* | technical | robots-sitemap | Robots validity issue observed in audit flow. | P0 | high | M |  | Robots and sitemap validation pass in pre-prod checks. | Open |
| CONT-001 | cano-cristales-guia-de-viajes | content | tourism-value | Add missing quick facts block: best season, access, costs, safety. | P2 | high | M | TECH-001;TECH-006 | Tourism-value module complete and accurate. | Open |
| CONT-002 | temporada-de-ballenas-en-colombia | content | internal-linking | Add strategic cluster links to destinations/packages/related posts. | P2 | medium | S | TECH-001;TECH-006 | Internal links improve cluster navigation and relevance. | Open |
| CONT-003 | san-valentin-en-colombia-para-enamorados | content | search-intent | Tighten intent alignment and reduce generic sections. | P2 | high | M | TECH-005;TECH-001;TECH-006 | Intent coverage checklist passes editorial review. | Open |
| CONT-004 | *all-3-posts* | content | multilingual-parity | Validate semantic equivalence in `es`, `en`, `pt`. | P1 | high | L | TECH-001;TECH-006 | Locale parity checklist >= 85% for each post. | Open |

## Testing gate

### Global technical tests

- Lighthouse per post: SEO, Accessibility, Best Practices.
- Rich Results Test for schema validity.
- Indexability checks: HTTP 200, canonical correctness, robots/sitemap reachability.

### Content tests

- Search intent coverage and SERP-aligned completeness.
- Internal linking quality and final CTA effectiveness.
- Editorial consistency between primary and localized variants.

### Exit criteria

- 100% of `technical` P0/P1 items in `Done`.
- Content checklist completion >= 85% per prioritized post.
- Average score for target batch >= 90/100.
