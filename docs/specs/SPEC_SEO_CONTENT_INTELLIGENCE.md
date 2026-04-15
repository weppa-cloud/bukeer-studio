# SPEC: SEO Content Intelligence — Site Audit, Keyword Research, Cluster Tracking, Optimizer, and Translation SEO

**Status**: Draft
**Date**: 2026-04-15
**Author**: OpenAI Codex
**Priority**: Very high
**Rev**: 1

---

## 1. Context and Problem

Bukeer Studio already has a meaningful SEO foundation:

- Google integrations
- item-level SEO workflows
- scoring
- architecture utilities
- keyword ideation

But the current system is still centered on:

- isolated pages
- partial dashboards
- AI-assisted single-seed ideation
- checklist execution

It is missing the higher-leverage layer the product actually needs:

1. read the rendered site by locale
2. understand coverage by content type
3. research keywords by market and language
4. assign keywords into clusters
5. create or update briefs and pages from those clusters
6. optimize pages with template-aware guidance
7. localize content using target-market keyword demand, not literal translation
8. track progress by cluster and locale over time

This spec defines that missing system.

---

## 2. Scope

### In scope

| Feature | Summary |
|---|---|
| F1 | Site-wide rendered content audit by locale |
| F2 | Keyword research by content type, locale, and target market |
| F3 | Cluster planner and cluster tracking |
| F4 | SERP review + content brief generation |
| F5 | Assisted optimizer for blog, destination, package, activity |
| F6 | Translation SEO / transcreation workflow |
| F7 | Measurement model by page, cluster, locale |

### Out of scope for Rev 1

- full backlink intelligence engine
- full local SEO / GBP platform
- automated PR / outreach workflows
- autonomous publishing without review
- full WYSIWYG editor replacement
- fully automated AI Overview rank tracker

---

## 3. Goals

### Primary goals

1. Turn Studio into a content intelligence system, not just a dashboard set.
2. Support the four highest-value types:
   - blog
   - destination
   - package
   - activity
3. Make keyword research locale-native.
4. Allow optimization without breaking product source-of-truth.
5. Enable cluster-level execution and tracking.

### Non-goals

1. Replace every external SEO tool.
2. Promise ranking guarantees.
3. Treat translation as literal language conversion.

---

## 4. Users

| User | Main job |
|---|---|
| SEO lead | decide targets, prioritize clusters, track outcomes |
| Content manager | create and update briefs and pages |
| Product operator | maintain package/activity truth while applying SEO layer |
| Translator / localization editor | adapt content to market-specific keyword demand |

---

## 5. Product Principles

1. `Rendered-content-first`
The system must read the public rendered page, not just DB fields.

2. `Locale-native research`
Each locale must have its own keyword and SERP understanding.

3. `Cluster-first planning`
Pages should be planned and tracked as part of topical systems.

4. `Controlled product editing`
For transaccional pages, optimize through an SEO layer rather than rewriting source-of-truth data.

5. `Human-in-the-loop`
The system should recommend, score, and assist. It should not silently rewrite live commercial pages.

---

## 6. Information Architecture

### 6.1 New product areas

Recommended new surfaces:

1. `Analytics -> Content Intelligence`
   - site audit
   - cluster overview
   - opportunities

2. `Analytics -> Keywords`
   - universe builder
   - SERP review
   - cluster assignment

3. `Analytics -> Clusters`
   - cluster board
   - coverage status
   - tracking

4. `SEO Item Detail`
   - research
   - brief
   - optimizer
   - translation SEO
   - tracking

### 6.2 Suggested tabs for SEO Item Detail

| Tab | Purpose |
|---|---|
| Overview | score, target keyword, current status |
| Research | SERP and keyword context for this page |
| Brief | approved structure and recommendations |
| Optimize | scoped editing and optimizer suggestions |
| Translate | locale-specific transcreation workflow |
| Track | page-level metrics and cluster contribution |

---

## 7. Data Model Additions

### 7.1 `seo_clusters`

```sql
seo_clusters (
  id uuid primary key,
  website_id uuid not null,
  locale text not null,
  content_type text not null,
  name text not null,
  primary_topic text not null,
  target_country text,
  target_language text,
  status text not null default 'planned', -- planned, active, completed, paused
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 7.2 `seo_cluster_keywords`

```sql
seo_cluster_keywords (
  id uuid primary key,
  cluster_id uuid not null references seo_clusters(id),
  keyword text not null,
  intent text,
  serp_type text,
  difficulty numeric,
  search_volume integer,
  priority text,
  source text,
  created_at timestamptz not null default now()
)
```

### 7.3 `seo_cluster_pages`

```sql
seo_cluster_pages (
  id uuid primary key,
  cluster_id uuid not null references seo_clusters(id),
  page_type text not null,
  page_id text not null,
  role text not null, -- hub, spoke, support
  target_keyword text,
  status text not null default 'planned', -- planned, draft, optimized, published
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 7.4 `seo_render_snapshots`

```sql
seo_render_snapshots (
  id uuid primary key,
  website_id uuid not null,
  locale text not null,
  page_type text not null,
  page_id text,
  public_url text not null,
  title text,
  meta_description text,
  canonical_url text,
  hreflang jsonb,
  headings jsonb,
  visible_text text,
  internal_links jsonb,
  schema_types jsonb,
  captured_at timestamptz not null default now()
)
```

### 7.5 `seo_briefs`

```sql
seo_briefs (
  id uuid primary key,
  website_id uuid not null,
  locale text not null,
  content_type text not null,
  page_id text,
  cluster_id uuid references seo_clusters(id),
  primary_keyword text not null,
  secondary_keywords jsonb not null default '[]'::jsonb,
  brief jsonb not null,
  status text not null default 'draft', -- draft, approved, archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 7.6 `seo_transcreation_jobs`

```sql
seo_transcreation_jobs (
  id uuid primary key,
  website_id uuid not null,
  source_locale text not null,
  target_locale text not null,
  page_type text not null,
  page_id text not null,
  source_keyword text,
  target_keyword text,
  status text not null default 'draft', -- draft, reviewed, applied
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

---

## 8. User Flows

### Flow F1 — Site-Wide Audit by Locale

#### Happy path

1. User opens `Analytics -> Content Intelligence`.
2. User selects a locale.
3. System crawls or snapshots representative rendered pages for that locale.
4. System extracts:
   - title
   - meta description
   - headings
   - visible text
   - schema types
   - canonical
   - hreflang
   - internal links
5. System groups pages by type.
6. System reports:
   - missing topical coverage
   - weak pages
   - duplicate intent
   - missing internal links
   - template inconsistencies
7. User saves selected findings into clusters or page briefs.

#### Edge cases

- locale has only partial translation coverage
- page renders different text than stored CMS content
- page is blocked or noindexed
- public route does not exist yet for a content type

### Flow F2 — Keyword Research by Type, Locale, Market

#### Happy path

1. User selects:
   - content type
   - country
   - language
   - locale
2. User enters seed set.
3. System uses research providers and internal render coverage to generate a keyword universe.
4. System classifies each keyword by:
   - intent
   - SERP type
   - cluster fit
   - update vs create recommendation
5. User approves selected keywords.
6. System creates cluster candidates or page briefs.

#### Edge cases

- provider unavailable
- low search volume market
- seed in one language but locale target in another
- keyword appears relevant semantically but not commercially

### Flow F3 — Cluster Planner

#### Happy path

1. User opens Clusters.
2. User sees cluster candidates.
3. User creates a cluster.
4. User assigns keywords and pages.
5. System recommends hub/spoke roles.
6. User tracks execution across pages.

#### Edge cases

- one page competes for multiple clusters
- multiple pages target the same keyword
- cluster spans mixed locales incorrectly

### Flow F4 — Brief Generation

#### Happy path

1. User selects a page or a keyword.
2. System generates a brief including:
   - primary keyword
   - secondary keywords
   - SERP type
   - recommended sections
   - PAA questions
   - missing entities
   - internal links to add
   - conversion recommendations
3. User reviews and approves the brief.
4. Brief becomes the optimization reference for the page.

### Flow F5 — Assisted Optimizer

#### Happy path

1. User opens page detail.
2. System loads:
   - current rendered content snapshot
   - approved brief
   - score
3. System highlights gaps.
4. User applies scoped optimizations.
5. Score recalculates.
6. Changes are saved to the SEO layer or editorial fields.

#### Important editing rule

For product pages, optimizer actions must be scoped.

Allowed examples:

- SEO title
- meta description
- supplemental intro
- highlight bullets
- FAQ block
- internal links
- schema enrichment suggestions

Not allowed by default:

- price changes
- availability changes
- itinerary truth changes
- policy changes
- inclusions / exclusions changes without explicit product edit intent

### Flow F6 — Translation SEO / Transcreation

#### Happy path

1. User selects source page and target locale.
2. System reads source page and source brief.
3. System researches target-market keywords.
4. System proposes a localized brief.
5. System generates transcreated output for:
   - title
   - meta description
   - headings
   - summary
   - FAQ
   - anchors
6. User reviews and applies.

#### Important rule

This flow must not be implemented as simple translation.
It must be implemented as keyword-aware localization.

### Flow F7 — Tracking

#### Happy path

1. User opens cluster or page tracking.
2. System shows real SEO metrics by date range.
3. User sees progress by:
   - page
   - cluster
   - locale
   - content type
4. User can compare before / after an optimization milestone.

---

## 9. Acceptance Criteria

### Core

- [ ] AC-1: The system can snapshot rendered content from public pages by locale.
- [ ] AC-2: The system stores extracted headings, visible text, schema types, canonical, and internal links.
- [ ] AC-3: Keyword research supports blog, destination, package, and activity independently.
- [ ] AC-4: Keyword research requires country + language + locale inputs.
- [ ] AC-5: Research results can be assigned into clusters.
- [ ] AC-6: Clusters support page assignment and execution status.
- [ ] AC-7: Brief generation is stored and versioned.
- [ ] AC-8: The optimizer uses approved brief + rendered snapshot as inputs.
- [ ] AC-9: Product pages use scoped SEO-layer editing rather than uncontrolled rewrites.
- [ ] AC-10: Translation SEO re-researches target keywords by locale before generating copy.
- [ ] AC-11: Tracking supports cluster-level rollups.
- [ ] AC-12: User-visible text must be localizable.

### Editorial

- [ ] AC-13: Blog and destination pages support richer optimization than package/activity pages.
- [ ] AC-14: The system can recommend create vs update vs merge vs prune for blog content.
- [ ] AC-15: The system can recommend hub vs spoke role for destination-led clusters.

### Measurement

- [ ] AC-16: SEO reporting uses real GSC metrics for clicks, impressions, CTR, and average position.
- [ ] AC-17: Cluster tracking supports locale breakdown.
- [ ] AC-18: The product does not present derived or example metrics as real production SEO measurements.

---

## 10. Permissions and Roles

### RBAC

- SEO lead: full access to research, clusters, briefs, tracking
- Content manager: can create / edit briefs and apply editorial optimizations
- Product operator: can apply scoped SEO-layer changes on package/activity
- Viewer: read-only access to clusters and tracking

### Auth boundary

Follow the existing website-scoped auth boundary pattern used in SEO routes.
Do not expose provider tokens to the client.

---

## 11. API Direction

### New route families suggested

- `POST /api/seo/content-intelligence/audit`
- `GET /api/seo/content-intelligence/audit`
- `POST /api/seo/content-intelligence/research`
- `POST /api/seo/content-intelligence/clusters`
- `GET /api/seo/content-intelligence/clusters`
- `POST /api/seo/content-intelligence/briefs`
- `GET /api/seo/content-intelligence/briefs`
- `POST /api/seo/content-intelligence/optimize`
- `POST /api/seo/content-intelligence/transcreate`
- `GET /api/seo/content-intelligence/track`

---

## 12. Implementation Notes

### Rendered-content acquisition

Preferred order:

1. reuse server-side render and page resolvers where possible
2. fetch generated HTML from public domain when required
3. store snapshots for analysis reuse

### Research providers

This feature may combine:

- GSC
- DataForSEO
- AI synthesis layer
- internal render audit data

### UI approach

Do not start with a heavy freeform editor.
Start with:

- brief panel
- suggestion cards
- scoped apply actions
- before / after score feedback

---

## 13. Risks

1. Overbuilding generic SEO features instead of travel-specific flows.
2. Confusing translation with transcreation.
3. Letting AI rewrite product truth.
4. Reporting SEO KPIs from proxies instead of real sources.
5. Mixing locales inside the same cluster model.

---

## 14. Open Questions

1. Should cluster tracking live inside `Analytics` or `SEO` as a first-class section?
2. Should page render snapshots be captured on demand, on publish, or both?
3. Which provider becomes the source of truth for SERP features and difficulty in Rev 1?
4. Do package/activity SEO-layer fields live inside existing page tables or a dedicated SEO overlay table?
5. Should transcreation be stored as draft variants before applying to live fields?

---

## 15. Related Docs

- [SEO Implementation Reference](../seo/SEO-IMPLEMENTATION.md)
- [SEO Flows in Studio](../seo/SEO-FLUJOS-STUDIO.md)
- [SEO Playbook](../seo/SEO-PLAYBOOK.md)
- [SEO Content Intelligence Roadmap](./ROADMAP_SEO_CONTENT_INTELLIGENCE.md)
- [SEO Optimization Toolkit Spec](./SPEC_SEO_OPTIMIZATION_TOOLKIT.md)
- [SEO One-Page Optimizer Spec](./SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION.md)
