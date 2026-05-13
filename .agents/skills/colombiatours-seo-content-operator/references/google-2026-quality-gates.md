# Google 2026 Quality Gates

Use the current Google Search documentation as the quality baseline:

- Helpful, reliable, people-first content:
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- AI-generated content guidance:
  https://developers.google.com/search/blog/2023/02/google-search-and-ai-content
- Localized versions and hreflang:
  https://developers.google.com/search/docs/specialty/international/localized-versions
- Spam policies:
  https://developers.google.com/search/docs/essentials/spam-policies

## People-First Gate

Pass only when the page is useful if the visitor arrives directly from the
brand, not only from Google.

Required checks:

- The page answers the actual travel planning or buying intent.
- The page adds ColombiaTours-specific value, not generic SERP rewriting.
- The title/H1 describes the page without exaggeration or clickbait.
- The page gives enough practical detail for the user to take the next step.
- The page has no obvious spelling, style, or rushed production issues.

## E-E-A-T Gate

Tourism is trust-sensitive because users make safety and money decisions.
Every publishable page must show trust signals appropriate to its type:

- Experience: destination knowledge, itinerary context, local logistics,
  practical constraints, or operator insight.
- Expertise: accurate travel details, clear inclusions/exclusions, route notes,
  seasonal caveats, or planner guidance.
- Authoritativeness: brand context, reviewer/planner evidence, internal links to
  relevant hubs, and sources when factual claims need support.
- Trust: accurate CTA, contact path, no misleading claims, no unsupported safety
  promises, and no fabricated facts.

If any important factual claim cannot be verified, mark the page `draft` or
`block`.

## Who, How, Why Gate

Before publish, ensure:

- Who: author, planner, reviewer, or brand responsibility is clear where users
  would expect it.
- How: if AI materially helped create the content and a visitor would reasonably
  wonder how the page was produced, include an appropriate process note or
  internal review evidence.
- Why: the reason for the page is to help travelers choose, plan, compare, or
  book, not to mass-produce search landing pages.

## AI And Automation Gate

AI-assisted content is allowed only when it improves usefulness and originality.

Block when:

- The page is mass-produced from keyword lists without added value.
- The content paraphrases competitors without original information.
- The article exists only to target a keyword variant.
- The body is generic, repetitive, or has little practical travel value.

## Scaled Content Abuse Gate

Do not publish pages that match scaled-content risk:

- Many similar pages targeting near-identical queries.
- Pages generated from scraped SERPs or competitor text.
- Pages that stitch sources together without adding ColombiaTours value.
- Thin pages containing keywords but little useful travel guidance.

If such content already exists, choose `keep_hidden`, `noindex`, or `block`.

## Internationalization Gate

For EN-US pages:

- Main content must be in natural US English.
- Slug, title, meta, H1, CTA, FAQ, and schema must be localized.
- Canonical must be self-referential for the localized URL.
- Hreflang alternates must be reciprocal and fully qualified.
- Sitemap inclusion is allowed only after the page passes all content and
  technical gates.
- Localized pages are not duplicates when the main content is translated or
  transcreated; template-only translation is not enough.
