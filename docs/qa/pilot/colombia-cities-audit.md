# Colombia cities + website.content audit — 2026-04-20

Source: audit run via Supabase MCP under EPIC #262 child-5 (#267).
Pilot website: `894545b7-73ca-4dae-b76a-da5b6a3f8441` (colombiatours).

Reproducibility: `npx tsx scripts/audit-website-pages.ts 894545b7-73ca-4dae-b76a-da5b6a3f8441`.

## Scope reality check

Original ticket assumed "17 Colombia city custom pages." Actual DB state:

- **18 `page_type='custom'` rows** (not 17)
- **2 real city landings:** Cartagena, Eje Cafetero
- **12 itinerary / package pages:** `bogota-cartagena-6-dias`, `cartagena-4-dias`, `colombia-armonia-8-dias`, `colombia-corazon-15-dias`, `colombia-esencia-12-dias`, `colombia-ritmo-y-sabor-11-dias`, `medellin-cartagena-6-dias`, `paquetes-a-colombia-todo-incluido-en-9-dias`, `san-andres-4-dias`, `tour-colombia-10-dias`, `tour-colombia-15-dias`, `los-mejores-paquetes-de-viajes-a-colombia`
- **2 market landings:** `agencia-de-viajes-a-colombia-para-espanoles` (España), `agencia-de-viajes-a-colombia-para-mexicanos` (México)
- **1 blog shell:** `blog` (intro_content empty, used as blog-listing marker)
- **1 E2E QA fixture:** `e2e-qa-landing-894545b7` (`is_published=false`)

## 15 city landings NOT present

Follow-up tracked in **[#269](https://github.com/weppa-cloud/bukeer-studio/issues/269)**:

- Medellín · Bogotá · Cali · Santa Marta · San Andrés (city landing)
- Providencia · Tayrona · Ciudad Perdida · Guatavita · Villa de Leyva
- Salento · Palomino · Leticia · Popayán · Barú

All tier-2/3 destinations that would unlock the designer Colombia-map `[data-palette]` pin routing.

## Per-page status

| Slug | Published | Intro (chars) | Sections (bytes) | Hero image | SEO meta | Keywords | Classification |
|---|---|---|---|---|---|---|---|
| `agencia-de-viajes-a-colombia-para-espanoles` | ✅ | 0 (empty) | 7067 | ✅ | ✅ | 8 | Market landing |
| `agencia-de-viajes-a-colombia-para-mexicanos` | ✅ | 0 | 6972 | ✅ | ✅ | 8 | Market landing |
| `blog` | ✅ | 0 | 5 | ❌ | ✅ | 0 | Blog index shell |
| `bogota-cartagena-6-dias` | ✅ | 0 | 5260 | ✅ | ✅ | 6 | Itinerary |
| **`cartagena`** | ✅ | **1250** | **1926** | ✅ | ✅ | 8 | **City landing (populated)** |
| `cartagena-4-dias` | ✅ | 0 | 5171 | ✅ | ✅ | 6 | Itinerary |
| `colombia-armonia-8-dias` | ✅ | 0 | 6283 | ✅ | ✅ | 6 | Itinerary |
| `colombia-corazon-15-dias` | ✅ | 0 | 7689 | ✅ | ✅ | 6 | Itinerary |
| `colombia-esencia-12-dias` | ✅ | 0 | 6200 | ✅ | ✅ | 6 | Itinerary |
| `colombia-ritmo-y-sabor-11-dias` | ✅ | 0 | 5946 | ✅ | ✅ | 6 | Itinerary |
| `e2e-qa-landing-894545b7` | ❌ | 26 | 436 | ❌ | ❌ | 0 | E2E fixture |
| **`eje-cafetero`** | ✅ | **1297** | **1931** | ✅ | ✅ | 8 | **City landing (populated)** |
| `los-mejores-paquetes-de-viajes-a-colombia` | ✅ | 0 | 5204 | ✅ | ✅ | 5 | Package index |
| `medellin-cartagena-6-dias` | ✅ | 0 | 5377 | ✅ | ✅ | 6 | Itinerary |
| `paquetes-a-colombia-todo-incluido-en-9-dias` | ✅ | 0 | 7219 | ✅ | ✅ | 6 | Itinerary |
| `san-andres-4-dias` | ✅ | 0 | 5130 | ✅ | ✅ | 6 | Itinerary |
| `tour-colombia-10-dias` | ✅ | 0 | 7729 | ✅ | ✅ | 6 | Itinerary |
| `tour-colombia-15-dias` | ✅ | 0 | 6370 | ✅ | ✅ | 6 | Itinerary |

## `websites.content` JSONB state

**Before #267:** 393 bytes (`seo/logo/social/account/contact/tagline/siteName` only — no brand_name/hero/trust/nav/footer).

**After #267:** 3164 bytes text (~1962 after TOAST compression on disk). Added:

- `brand_name: "ColombiaTours"`
- `hero.slides[]` — 3 slides (Cartagena / Amazonas / Eje Cafetero) with image + title + subtitle + CTA
- `hero.meta` — `{ autoplay: true, interval: 5000, effect: "fade" }`
- `trust_badges[]` — 4 badges (RNT 35323, ANATO, Google 4.9/5, Guías certificados)
- `nav.primary[]` — 6 items (Paquetes / Actividades / Destinos / Blog / Nosotros + CTA)
- `nav.cta` — `{ label: "Planifica tu viaje", href: "/contacto" }`
- `footer.links[]` — 3 groups (Viajes / Empresa / Ayuda)
- `footer.legal[]` — 3 items
- `footer.copyright` — includes NIT + RNT

**Still placeholder, pending partner update:**
- `contact.email` — currently `hola@colombiatours.travel` (guess)
- `contact.address` — `"Medellín, Colombia"` (guess)
- `social.instagram` + `social.facebook` — guessed handles
- RNT number `35323` — verify

## Actions applied

1. **`websites.content`** expanded in prod DB (via Supabase MCP `execute_sql`, 2026-04-20).
2. **`cartagena` page** populated: intro 1250 chars, 3 sections (Qué hacer / Dónde dormir / Cómo llegar), SEO meta complete (seo_title 59 chars, seo_description 153 chars, 8 keywords). `robots_noindex=false`.
3. **`eje-cafetero` page** populated: intro 1297 chars, 3 sections, SEO meta complete (seo_title 58 chars, seo_description 145 chars, 8 keywords). `robots_noindex=false`.
4. **13 other custom pages** backfilled `seo_keywords` (6 keywords each, derived from slug).
5. **Zod schema** for `websites.content` committed at `lib/types/website-content.ts`.

## Pending follow-ups

| # | Scope | Owner |
|---|---|---|
| [#269](https://github.com/weppa-cloud/bukeer-studio/issues/269) | Create 15 missing Colombia city pages | Post-launch |
| Partner review | Cartagena + Eje Cafetero AI-drafted intro_content + sections | Partner, pre-AC-X4a |
| Partner data fill | Contact email/address, social URLs, RNT number validation | Partner, ops ticket |
| Hero key normalization | 2 destination pages use `hero_config.image`, 14 itinerary pages use `hero_config.backgroundImage`. Standardize to `backgroundImage` per contract type. | Follow-up refactor |
| Homepage render | Verify new `hero.slides` + `trust_badges` + `nav` render in designer theme (EPIC #250 Cluster β, #255) | Cluster β |

## Related

- EPIC [#262](https://github.com/weppa-cloud/bukeer-studio/issues/262) Content + SEO Go-Live
- Child [#267](https://github.com/weppa-cloud/bukeer-studio/issues/267) Pages populate + content expansion
- Follow-up [#269](https://github.com/weppa-cloud/bukeer-studio/issues/269) 15 missing city pages
- Designer reference: `themes/references/claude design 1/project/`
- ADR-003 Contract-first Zod validation
- ADR-025 Studio/Flutter field ownership
