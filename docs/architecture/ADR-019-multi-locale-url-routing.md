# ADR-019 — Multi-locale URL Routing (Path-Prefix Strategy)

**Status:** Accepted
**Date:** 2026-04-17
**Principles:** P1 (Server-First), P4 (Edge-First Delivery), P7 (SEO by Default)

## Context

Bukeer Studio serves multi-tenant travel agency websites across multiple markets (LatAm, Spain, Brazil, USA). Each site can be configured for multiple languages (`websites.supported_locales`). We need a URL strategy that:

1. Lets Google discover and index language variants independently.
2. Keeps shared domain authority (vs. subdomains or ccTLDs).
3. Is readable by the Cloudflare Workers middleware without Node.js APIs.
4. Does not require session-state to determine which locale to render.

## Decision

Use **path-prefix locale routing** where the 2-letter language code is the first path segment for non-default locales. The default locale has no prefix.

### URL structure

| Locale | URL example | Notes |
|--------|-------------|-------|
| `es-CO` (default) | `/paquetes/cartagena-5-dias` | No prefix |
| `en` | `/en/paquetes/cartagena-5-dias` | 2-letter prefix |
| `pt` | `/pt/paquetes/cartagena-5-dias` | 2-letter prefix |
| `fr` | `/fr/paquetes/cartagena-5-dias` | 2-letter prefix |

Slug translation (`destinos` → `destinations`) is handled via a static lookup table in `lib/seo/locale-routing.ts`; the server-side path rewrite does not depend on it.

### Middleware flow (`middleware.ts`)

1. Extract subdomain → load `WebsiteLocaleSettings` from LRU cache (5min TTL, 200-entry).
2. Detect 2-letter language segment from first path segment.
3. Resolve full locale (`en` → `en-US` or best match in `supported_locales`).
4. Strip language prefix before Next.js rewrite: `/en/paquetes/X` → `/site/[subdomain]/paquetes/X`.
5. Set request headers consumed by SSR:
   - `x-public-locale` — resolved locale (e.g., `es-CO`)
   - `x-public-default-locale` — site default
   - `x-public-lang` — 2-letter language code
   - `x-public-locale-segment` — non-empty only for non-default locales

### Client-side switcher

Language switcher (`components/site/site-header.tsx`, `components/site/language-switcher.tsx`) navigates via `window.location.href` (full page reload), NOT `router.push`. Reason: middleware reads the request path at the Worker level; client-side navigation bypasses middleware locale detection.

Flow:
1. `resolveLocaleFromPublicPath(window.location.pathname, settings)` → `pathnameWithoutLang`
2. `buildPublicLocalizedPath(pathnameWithoutLang, newLocale, defaultLocale)` → target URL
3. Preserve currency `?moneda=` query param; drop `?lang=` (locale is now in path).
4. Persist selection to `localStorage` key `bukeer_site_lang` for preference continuity.

### Key functions

- `lib/seo/locale-routing.ts` — `buildPublicLocalizedPath`, `resolveLocaleFromPublicPath`, `normalizeLanguageCode`
- `lib/site/currency.ts` — `SITE_LANG_QUERY_PARAM`, `SITE_LANG_STORAGE_KEY`

## Alternatives Rejected

| Option | Why rejected |
|--------|-------------|
| **Subdomain** (`en.site.com`) | Splits domain authority; harder to manage SSL per tenant |
| **ccTLD** (`.co`, `.mx`) | High operational cost; one tenant = multiple domains |
| **Query param** (`?lang=en`) | Server (middleware) cannot read query params to set locale headers; SSR sees wrong locale |
| **Cookie-based** | Not readable at Worker edge without extra round-trip |

## Consequences

### Positive
- Single domain authority shared across all locales.
- Middleware can detect locale from path without database calls.
- Google indexes each locale independently via path-distinct URLs + hreflang (see [[ADR-020]]).
- Works on Cloudflare Workers (no Node.js APIs in the routing path).

### Negative
- Default locale has no path prefix — if `defaultLocale` changes, all non-prefixed URLs break. Default locale is immutable after site creation.
- Slug translation table (`SLUG_TRANSLATIONS`) must be maintained manually as new route segments are added.

## Related

- [[ADR-009]] — Multi-tenant subdomain routing (middleware foundation)
- [[ADR-011]] — Middleware LRU cache (WebsiteLocaleSettings TTL)
- [[ADR-020]] — hreflang emission policy
- [[SPEC #187]] — Multi-locale translation + SEO migration EPIC
