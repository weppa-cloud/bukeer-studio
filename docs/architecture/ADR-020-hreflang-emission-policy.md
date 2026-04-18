# ADR-020 — hreflang Emission Policy and x-default Strategy

**Status:** Accepted (amended)
**Date:** 2026-04-17 (amended 2026-04-18)
**Principles:** P7 (SEO by Default), P2 (Validate at Boundaries)

## Context

Google uses `hreflang` link tags to understand which URL variant to serve for a given user language/region. Wrong hreflang signals cause:

- Cross-locale duplicate content penalties.
- Wrong-locale pages surfacing in SERPs.
- Wasted crawl budget on untranslated pages.

Bukeer Studio sites are configured with `websites.supported_locales` (array of locale codes), but not all configured locales have translated content at the page level. The initial policy emitted all `supported_locales`; shipped behavior now emits alternates only where translated content exists (`applied|published`) plus the default locale.

## Decision

### Rule 1 — Emit hreflang for translated locales + default locale

For each page, emit alternates for:
- Locales with `seo_transcreation_jobs.status IN ('applied', 'published')` for the same content item
- The `defaultLocale` (always included, even if there is no applied job)

Locales present in `supported_locales` but without translated content are intentionally omitted from `hreflang` for that page.

```typescript
// lib/seo/hreflang.ts
export function generateHreflangLinks(
  pathname: string,
  settings: WebsiteLocaleSettings,
  baseUrl: string,
): HreflangLink[]
```

### Rule 2 — `x-default` always points to default locale

`x-default` signals "no specific locale match — use this URL." It is always the canonical path of the default locale (no path prefix).

```html
<link rel="alternate" hreflang="x-default" href="https://site.com/paquetes/X" />
<link rel="alternate" hreflang="es-CO"     href="https://site.com/paquetes/X" />
<link rel="alternate" hreflang="en-US"     href="https://site.com/en/paquetes/X" />
```

### Rule 3 — hreflang tag uses full locale code; URL path uses 2-letter language

| Component | Format | Example |
|-----------|--------|---------|
| `hreflang` attribute | `language-REGION` | `en-US`, `es-CO`, `pt-BR` |
| URL path segment | 2-letter language | `/en/...`, `/pt/...` |
| Default locale URL | no prefix | `/paquetes/...` |

This split exists because Google recommends full BCP-47 codes in `hreflang` for regional targeting, while URL paths are cleaner with short codes.

### Rule 4 — Reciprocal links required inside emitted set

Every locale page must include all links from the computed emitted set, including itself. Missing reciprocity causes Google to ignore the hreflang signal entirely.

### Rule 5 — Sitemap includes hreflang alternates

`lib/seo/sitemap.ts` generates `<xhtml:link rel="alternate">` entries per URL per locale. Sitemap and page-level hreflang must be consistent.

### Historical note

The previous rule ("emit all `supported_locales`") was replaced by this amendment after production rollout of translated-locale filtering.

## Data model

```typescript
// lib/seo/hreflang.ts
interface HreflangLink {
  rel: 'alternate';
  hreflang: string;   // e.g. 'en-US' or 'x-default'
  href: string;       // absolute URL
}

interface WebsiteLocaleSettings {
  defaultLocale: string;        // e.g. 'es-CO'
  supportedLocales: string[];   // e.g. ['es-CO', 'en-US', 'pt-BR']
}
```

## Alternatives Rejected

| Option | Why rejected |
|--------|-------------|
| Emit hreflang for all `supported_locales` | Signals alternates with fallback-only content, reducing locale precision and creating quality drift between metadata and body content |
| Emit only translated locales and exclude default locale when untranslated | Breaks `x-default` guarantees and weakens stable fallback URL behavior |
| Omit `x-default` | Google recommends `x-default` for multi-regional sites; omitting loses the "no locale match" signal |
| Point `x-default` to `/` | Inconsistent when `/` is not the page being linked; each page must point its own `x-default` to its default-locale canonical |

## Consequences

### Positive
- More precise locale signals: alternates only where translated content exists.
- Reciprocal links are always consistent (generated from same function).
- Sitemap + page-level signals are kept in sync.

### Negative
- Adding a locale to `supported_locales` is not enough to make each page indexable in that locale; an applied translation is required.
- Coverage gaps can reduce alternate count while translation rollout is in progress.

### Mitigation
- `SPEC #189` tracks coverage matrix dashboard to monitor which locales have translated content per page.
- `#146` tracks hreflang-audit cron for drift detection (missing reciprocity, orphan alternates).

## Related

- [[ADR-019]] — Multi-locale URL routing (path structure)
- [[ADR-001]] — Server-first rendering (metadata generation happens at SSR time)
- [[SPEC #187]] — Multi-locale EPIC parent
- [[SPEC #189]] — Content fallback strategy + coverage matrix
