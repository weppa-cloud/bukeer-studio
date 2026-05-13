# Publish Gates

Run these gates before any `publish`, `apply`, sitemap exposure, or hreflang
exposure.

## Publish

Decision: `publish`

All must pass:

- Demand evidence exists from GSC or DataForSEO.
- Intent and target page type match the SERP.
- Content adds ColombiaTours-specific value versus top 10 competitors.
- Internal SEO score is grade A or strong B.
- Main body language matches the target locale.
- Title, meta, H1, FAQ, CTA, slug, image alt text, and schema are localized.
- Canonical is self-referential.
- Hreflang is reciprocal and fully qualified.
- Sitemap policy is correct for the locale.
- CTA points to a valid WhatsApp, WAFlow, planner, hub, package, or activity.
- No unsupported safety, visa, price, legal, or medical claims.
- No scaled-content, doorway, scraping, or competitor paraphrase risk.

## Review

Decision: `review`

Use when the opportunity is strong but one human or curator check is still
needed:

- safety/logistics claim needs verification
- reviewer/planner evidence missing
- EN body is good but slug/title needs market review
- SERP fit is ambiguous
- transcreation review has warnings but no blockers

## Draft

Decision: `draft`

Use when:

- demand exists but content is incomplete
- source ES page exists but has not been approved
- DataForSEO/SERP evidence is partial
- internal links or schema are not ready
- bulk publish cap would be exceeded

## Watch

Decision: `watch`

Use when:

- page is live and technically indexable
- quality is acceptable but not strong enough to scale
- GSC has low data volume
- title/meta experiment needs day 7, 21, or 45 reading
- sitemap inclusion is intentionally deferred

## Keep Hidden

Decision: `keep_hidden`

Use when:

- EN row has no ES/WP/source evidence
- demand does not justify rebuild
- content is not ready for index
- page should remain 404/noindex/out of sitemap
- target hub does not exist yet

## Block

Decision: `block`

Use when:

- main content is in the wrong language
- content is thin, generic, duplicated, or literal translation
- factual risk cannot be resolved
- source truth conflicts with generated copy
- transcreation review returns a blocker
- page appears designed primarily to capture a keyword variant
- publishing would create scaled-content, doorway, scraping, or cannibalization risk

## Mandatory Mutation Log

For every write, log:

```text
entity | action | before | after | source_evidence | issue
```

For every published URL, log:

```text
url | locale | market | baseline | published_at | day_7_check | day_21_check | day_45_check
```

## Bulk Cap

Even in full-publish mode, stop for explicit user confirmation before:

- publishing more than 10 URLs
- applying more than 10 transcreation jobs
- changing any already-published row where rollback is not trivial
- archiving or deleting any production row
