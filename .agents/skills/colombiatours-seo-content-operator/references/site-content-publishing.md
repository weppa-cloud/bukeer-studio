# Site Content Publishing

This skill can create and edit ColombiaTours public website content, but only
through the approved Studio/Growth surfaces and only after research, SERP,
editorial and publish gates pass.

## Supported Surfaces

| Surface | Table / route | Allowed operation | Public URL |
|---|---|---|---|
| Blog post | `website_blog_posts` | create draft, edit, publish, archive with approval | `https://colombiatours.travel/blog/{slug}` or `https://colombiatours.travel/en/blog/{slug}` |
| Custom page / hub | `website_pages` | create/edit page fields and SEO metadata | `https://colombiatours.travel/{slug}` or localized equivalent |
| Existing page sections | `website_sections` | safe apply to section content only when reversible | existing public route |
| Product/package SEO | `website_product_pages` / `product_seo_overrides` | SEO overlay only; never truth fields | `/paquetes/{slug}` or `/actividades/{slug}` |
| Transcreated variants | `seo_transcreation_jobs`, `seo_localized_variants` | use transcreation API/state machine | localized public URL after apply |

Truth tables remain read-only:

- `activities`
- `destinations`
- `hotels`
- `package_kits`
- catalog/product canonical fields such as name, slug, price, status, duration
  and inventory facts

## Create Blog Post

Use for new posts such as safety, best time, itinerary or Mexico-market support
content.

Required before write:

1. research pack
2. SERP competitive brief
3. content draft
4. internal SEO score
5. rollback expectation
6. public URL plan

Minimum payload fields:

```text
website_id
locale
title
slug
content / markdown
excerpt or summary
seo_title
seo_description
status
published_at
```

Default status is `draft`. Set `published` only after gates pass.

Public URL rules:

- ES/default blog: `https://colombiatours.travel/blog/{slug}`
- EN blog: `https://colombiatours.travel/en/blog/{slug}`
- MX Spanish market uses Spanish/default route unless a dedicated locale exists.

## Edit Blog Post

Before editing a live post:

- snapshot current row
- record current public URL
- prepare rollback payload
- keep original slug unless the task explicitly includes redirect/canonical
  handling
- preserve published status unless the gate says `keep_hidden` or `block`

Allowed edits:

- title
- excerpt
- content/body/markdown
- SEO title/description
- FAQ/schema content
- internal links
- status/published_at only through publish gate

## Create Or Edit Page / Hub

Use for page hubs such as `/paquetes`, `/actividades`, `/en/packages` and
planner pages.

Allowed:

- page SEO metadata
- page body/sections when the page is Studio-owned
- reversible section content changes

Do not rewrite catalog/product truth. Package and activity details must use SEO
overlay fields or Studio-owned page sections only.

## Transcreate Content

Use the transcreation state machine:

```text
create_draft -> review -> apply
```

Never skip review. If review returns blockers, do not apply.

Transcreation output must include:

- target locale
- target slug/path
- localized title/meta/H1/body
- localized schema fields
- internal-link plan
- publish decision

## Public URL Verification

Every publish/apply must return a `public_url` and verify it.

Required checks:

```text
public_url
http_status = 200
content_type includes text/html
canonical is self-referential
hreflang is reciprocal where applicable
robots/indexability matches decision
title/meta/H1 match target locale
body language matches target locale
schema is present and valid for page type
CTA/internal links are valid
sitemap inclusion matches publish decision
```

For draft/review rows, record the planned public URL even if it is not yet
indexable.

## Publication Record

Every mutation log must include:

```text
entity | action | before | after | public_url | verification | rollback | source_evidence | issue
```

Every published URL must also record:

```text
public_url | locale | market | published_at | baseline | day_7_check | day_21_check | day_45_check
```

## Completion Rule

The task is not complete if:

- no public URL is recorded
- the URL has not been checked after publish
- GSC/DataForSEO evidence is missing for a P0/P1 publish
- rollback is not defined
- sitemap/hreflang state conflicts with publish decision
