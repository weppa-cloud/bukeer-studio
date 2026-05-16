# Public Template Systemic Fix v1 QA

Date: 2026-05-15 America/Bogota  
Branch: `fix/public-template-systemic-fix`  
PR: https://github.com/weppa-cloud/bukeer-studio/pull/567  
Commits validated: `f2c24b34`, `d203586e`, plus QA follow-up changes in this branch.

## Decision

Status: `WARN`, not `FAIL`.

P0 route/template blockers are clear:

- Localized contact and press routes render with locale-specific titles/copy.
- Localized search and hotel routes render HTTP 200 with correct `html lang`.
- No tested route emits public `/site/colombiatours` links.
- Blog canary has canonical, hreflang, JSON-LD, FAQPage and author.

Remaining P1 content/transcreation watch items:

- Home pages still contain some DB-authored Spanish section/body text in non-ES locales. This is content inventory/transcreation debt, not the template/routing blocker fixed here.
- Home JSON-LD description still comes from tenant content in Spanish.
- Search/listing routes are `noindex` and do not emit JSON-LD; this is acceptable for this route gate but should stay explicit in SEO policy.

## Commands

```bash
npm test -- --runInBand __tests__/lib/site/system-fallback-pages.test.ts __tests__/lib/site/public-page-resolution.test.ts
npm run typecheck
npm run lint:hardcoded-ui
npm run build:worker
next start -p 3104 # local canary only, with Host: colombiatours.travel
```

## Automated Gates

| Gate | Result |
| --- | --- |
| Focused Jest fallback/resolution tests | PASS, 11/11 |
| TypeScript | PASS |
| Hardcoded public UI lint | PASS |
| OpenNext Cloudflare build | PASS |
| Temporary `next start` cleanup | PASS, no persistent worker intended |

## Route Canary

Canary used `curl -L -H "Host: colombiatours.travel"` against `next start` on port `3104`.

| Route | HTTP | Lang | Canonical | Hreflang | JSON-LD | `/site` leaks | Title |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| `/` | 200 | es | `https://colombiatours.travel` | 7 | 3 | 0 | Colombia Tours Travel / Tours Personalizados |
| `/buscar` | 200 | es | `https://colombiatours.travel/buscar` | 7 | 0 | 0 | Buscar / ColombiaTours.Travel / ColombiaTours.Travel |
| `/contacto` | 200 | es | `https://colombiatours.travel/contact` | 2 | 1 | 0 | Contacto / ColombiaTours.Travel |
| `/prensa` | 200 | es | `https://colombiatours.travel/prensa` | 2 | 1 | 0 | Prensa / ColombiaTours.Travel |
| `/hoteles` | 200 | es | `https://colombiatours.travel/hoteles` | 2 | 0 | 0 | Hoteles / ColombiaTours.Travel |
| `/en` | 200 | en | `https://colombiatours.travel/en` | 7 | 3 | 0 | ColombiaTours.Travel / Tailor-made Colombia tours |
| `/en/buscar` | 200 | en | `https://colombiatours.travel/en/buscar` | 7 | 0 | 0 | Search / ColombiaTours.Travel / ColombiaTours.Travel |
| `/en/contacto` | 200 | en | `https://colombiatours.travel/en/contacto` | 2 | 1 | 0 | Contact / ColombiaTours.Travel |
| `/en/prensa` | 200 | en | `https://colombiatours.travel/en/prensa` | 2 | 1 | 0 | Press / ColombiaTours.Travel |
| `/en/hoteles` | 200 | en | `https://colombiatours.travel/en/hoteles` | 2 | 0 | 0 | Hotels / ColombiaTours.Travel |
| `/pt-br` | 200 | pt | `https://colombiatours.travel/pt-br` | 8 | 3 | 0 | ColombiaTours.Travel / Viagens personalizadas pela Colombia |
| `/pt-br/buscar` | 200 | pt | `https://colombiatours.travel/pt-br/buscar` | 8 | 0 | 0 | Buscar / ColombiaTours.Travel / ColombiaTours.Travel |
| `/pt-br/contacto` | 200 | pt | `https://colombiatours.travel/pt-br/contacto` | 2 | 1 | 0 | Contato / ColombiaTours.Travel |
| `/pt-br/prensa` | 200 | pt | `https://colombiatours.travel/pt-br/prensa` | 2 | 1 | 0 | Imprensa / ColombiaTours.Travel |
| `/pt-br/hoteles` | 200 | pt | `https://colombiatours.travel/pt-br/hoteles` | 2 | 0 | 0 | Hoteis / ColombiaTours.Travel |
| `/fr` | 200 | fr | `https://colombiatours.travel/fr` | 7 | 3 | 0 | ColombiaTours.Travel / Voyages sur mesure en Colombie |
| `/fr/buscar` | 200 | fr | `https://colombiatours.travel/fr/buscar` | 7 | 0 | 0 | Recherche / ColombiaTours.Travel / ColombiaTours.Travel |
| `/fr/contacto` | 200 | fr | `https://colombiatours.travel/fr/contacto` | 2 | 1 | 0 | Contact / ColombiaTours.Travel |
| `/fr/prensa` | 200 | fr | `https://colombiatours.travel/fr/prensa` | 2 | 1 | 0 | Presse / ColombiaTours.Travel |
| `/fr/hoteles` | 200 | fr | `https://colombiatours.travel/fr/hoteles` | 2 | 0 | 0 | Hôtels / ColombiaTours.Travel |
| `/de` | 200 | de | `https://colombiatours.travel/de` | 7 | 3 | 0 | ColombiaTours.Travel / Massgeschneiderte Kolumbienreisen |
| `/de/buscar` | 200 | de | `https://colombiatours.travel/de/buscar` | 7 | 0 | 0 | Suche / ColombiaTours.Travel / ColombiaTours.Travel |
| `/de/contacto` | 200 | de | `https://colombiatours.travel/de/contacto` | 2 | 1 | 0 | Kontakt / ColombiaTours.Travel |
| `/de/prensa` | 200 | de | `https://colombiatours.travel/de/prensa` | 2 | 1 | 0 | Presse / ColombiaTours.Travel |
| `/de/hoteles` | 200 | de | `https://colombiatours.travel/de/hoteles` | 2 | 0 | 0 | Hotels / ColombiaTours.Travel |

## Blog Canary

Canary entity: `requisitos-para-viajar-a-colombia-desde-mexico`.

| Route | HTTP | Lang | Hreflang | JSON-LD | FAQPage | Author | `/site` leaks |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| `/blog/requisitos-para-viajar-a-colombia-desde-mexico` | 200 | es | 3 | 4 | 2 | 1 | 0 |
| `/en/blog/requisitos-para-viajar-a-colombia-desde-mexico` | 200 | en | 6 | 4 | 2 | 1 | 0 |
| `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico` | 200 | pt | 7 | 4 | 2 | 1 | 0 |
| `/fr/blog/requisitos-para-viajar-a-colombia-desde-mexico` | 200 | fr | 6 | 4 | 2 | 1 | 0 |
| `/de/blog/requisitos-para-viajar-a-colombia-desde-mexico` | 200 | de | 6 | 4 | 2 | 1 | 0 |

## Follow-Up

- Treat home mixed-language content as transcreation/content QA debt before mass rollout.
- Keep Transcreation canary limited to one entity until profile targeting and locale contracts are fixed.
- Do not deploy manually from this worktree; promote through the PR/CI path.
