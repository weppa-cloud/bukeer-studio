# ADR-020 — hreflang Emission Policy and x-default Strategy

**Status:** Accepted
**Date:** 2026-04-17
**Principles:** P7 (SEO by Default), P2 (Validate at Boundaries)

## Context

Google uses `hreflang` link tags to understand which URL variant to serve for a given user language/region. Wrong hreflang signals cause:

- Cross-locale duplicate content penalties.
- Wrong-locale pages surfacing in SERPs.
- Wasted crawl budget on untranslated pages.

Bukeer Studio sites are configured with `websites.supported_locales` (array of locale codes), but not all configured locales have actual translated content. Emitting `hreflang` for a locale without translated content points Google at fallback content, which is valid — but only if the signal is intentional and consistent.

## Decision

### Rule 1 — Emit hreflang for all `supported_locales`

Every locale in `websites.supported_locales` receives an `hreflang` alternate link. The fallback content policy (see [[ADR-021]] and [[SPEC #189]]) ensures that if no translation exists, the page renders in the default locale — which is acceptable per Google's guidelines for fallback content, provided the hreflang is present and reciprocal.

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

### Rule 4 — Reciprocal links required

Every locale page must include ALL alternate links, including itself. Missing reciprocity causes Google to ignore the hreflang signal entirely. This is enforced by `generateHreflangLinks` which always returns the full set.

### Rule 5 — Sitemap includes hreflang alternates

`lib/seo/sitemap.ts` generates `<xhtml:link rel="alternate">` entries per URL per locale. Sitemap and page-level hreflang must be consistent.

### Future rule (blocked on [[SPEC #189]])

Once the content fallback strategy is implemented, the emission policy may be refined to emit hreflang only for locales with `seo_transcreation_jobs.status IN ('applied', 'published')` for that content item. Until then, emitting for all `supported_locales` is the safe default.

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
| Emit hreflang only for `applied/published` jobs | Creates hreflang gaps for new locales in setup; fallback content is valid per Google docs |
| Omit `x-default` | Google recommends `x-default` for multi-regional sites; omitting loses the "no locale match" signal |
| Point `x-default` to `/` | Inconsistent when `/` is not the page being linked; each page must point its own `x-default` to its default-locale canonical |

## Consequences

### Positive
- Full hreflang coverage from day one of enabling a new locale.
- Reciprocal links are always consistent (generated from same function).
- Sitemap + page-level signals are kept in sync.

### Negative
- Fallback content (default locale served for un-translated locale) must be accepted as intentional. Pages cannot show `noindex` for missing translations without breaking hreflang reciprocity.
- Adding a locale to `supported_locales` immediately makes it indexable — even before content is translated.

### Mitigation
- `SPEC #189` tracks coverage matrix dashboard to monitor which locales have translated content per page.
- `#146` tracks hreflang-audit cron for drift detection (missing reciprocity, orphan alternates).

## Related

- [[ADR-019]] — Multi-locale URL routing (path structure)
- [[ADR-001]] — Server-first rendering (metadata generation happens at SSR time)
- [[SPEC #187]] — Multi-locale EPIC parent
- [[SPEC #189]] — Content fallback strategy + coverage matrix
