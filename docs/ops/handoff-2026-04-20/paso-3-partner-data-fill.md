# Paso 3 — Partner data-fill (ColombiaTours)

**Owner**: partner (Rol 2) — ColombiaTours
**Assisted by**: QA-lead (onboarding support)
**Estimated**: 4-8h real work
**Prereq**: Paso 1 (Cluster F fixes) + Paso 2 (env vars) ideally merged first; not strict-blocking

## Goal

Fill real marketing + content + SEO data for 2 canonical picks via Studio editors so Flow 1 walkthrough (Paso 4) reflects real ColombiaTours UX.

## Canonical picks (pinned)

| Role | ID | Slug |
|------|-----|------|
| **Pkg 15D robusto** | `fe7a1603-d434-4228-8d6e-d051d5bb7dc9` | `paquete-vacaciones-familiares-por-colombia-15-d-as` |
| **Act alta uso** | `0f334bee-f7ab-4503-8987-934cc7f86d81` | `tour-a-guatape-y-pe-ol` |

Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Account ID: `9fc24733-b127-4184-aa22-12f03b98927a`
`studio_editor_v2` flag: enabled (prod seeded 2026-04-20)

## Baseline state (0 rows on everything custom)

- 0 `custom_hero` / `custom_highlights` / `custom_faq` / `custom_sections` across 214 `website_product_pages`
- 0 `program_highlights` / `program_inclusions` / `program_exclusions` / `program_gallery` on 9 active pkgs
- 0 `description_ai_generated` / `highlights_ai_generated` true (AI flags never run)
- 0 `video_url` in pkg + act
- Only 71/696 activities with `schedule_data`

Partner starts from blank slate.

## Per-pick fill checklist

### A. Pkg 15D — `/dashboard/{websiteId}/products/{slug}/marketing`

Login partner account → route → verify editors read/write (flag enabled).

- [ ] **Description** (`DescriptionEditor`): rewrite existing description >200 chars, friendly tone, traveler-focused
- [ ] **Highlights** (`HighlightsEditor`): 5-7 bullet points program highlights (jsonb array `[{ title, description? }]`)
- [ ] **Inclusiones / Exclusiones** (`InclusionsExclusionsEditor`): fill both arrays (hospedaje, transporte, alimentación, actividades, guía; NO incluidos: vuelos, propinas, seguros)
- [ ] **Recommendations** (`RecommendationsEditor`): qué llevar, cuándo viajar, prep física si aplica
- [ ] **Instructions** (`InstructionsEditor`): punto encuentro, horarios, documentos, contacto emergencia
- [ ] **Social image** (`SocialImagePicker`): 1200×630 OG-ratio image
- [ ] **Gallery** (`GalleryCurator`): upload 6-12 images, order + add alt text (ES + EN si bilingual)

### B. Pkg 15D — `/dashboard/{websiteId}/products/{slug}/content`

- [ ] **Hero override** (`HeroOverrideEditor`): `custom_hero.title` + `custom_hero.subtitle` + `custom_hero.image_url` + optional `video_url`
- [ ] **Video URL** (`VideoUrlEditor`): YouTube link teaser (e.g. `https://www.youtube.com/watch?v=<id>`); unlocks #14/#20/#47 matrix rows + unlocks VideoObject JSON-LD once cross-repo #234 RPC JOIN ships
- [ ] **AI flags panel** (`AiFlagsPanel`): mark `description_ai_generated=false` + `highlights_ai_generated=false` if content is human-written (affects overlay read priority)
- [ ] **Section visibility toggle**: hide/show sections A-L per design intent
- [ ] **Sections reorder** (`SectionsReorderEditor`): drag to ideal order (ej. Hero → Highlights → Gallery → Description → Itinerary → Incl/Excl → FAQ → CTA)
- [ ] **Custom sections** (`CustomSectionsEditor`): optional Section P blog-style block or testimonials custom

### C. Pkg 15D — SEO (`/dashboard/{websiteId}/seo/items/{slug}` or SEO item detail)

- [ ] `custom_seo_title` — ≤60 chars, include keyword + brand
- [ ] `custom_seo_description` — ≤160 chars, lead with benefit
- [ ] `custom_faq` — ≥3 Q&A pairs (schema.org FAQPage boost)
- [ ] `robots_noindex = false` (confirm)

### D. Act Guatape — idéntico flujo (A + B + C) para activity

Activities editor route same pattern — W2 RPC now applied (2026-04-20). Fields live against `activities` table via `update_activity_marketing_field` RPC.

- [ ] Same 7 marketing fields + 6 content fields + SEO meta as pkg above
- [ ] Activity-specific: verify `schedule_data` present (programa timeline) — Guatape ya tiene 1 en los 71/696 activities con schedule; si no, añadirlo vía Flutter admin

## Translations (post data-fill)

**Route**: `/dashboard/{websiteId}/translations`

Por cada pick (2 total):
- [ ] Target en-US → "Translate with AI" → draft aparece
- [ ] Review diff es-CO vs en-US en editor
- [ ] Corrección manual ≥1 (typo / tono)
- [ ] `draft → reviewed → applied`
- [ ] Verificar `/en/paquetes/{slug}` y `/en/actividades/{slug}` rinde EN content

Blog posts: aplicar el mismo flow al ≥1 blog post destacado.

## Verificación visual

Partner abre en incognito:
- `https://colombiatours.bukeer.co/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as`
- `https://colombiatours.bukeer.co/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as`
- `https://colombiatours.bukeer.co/actividades/tour-a-guatape-y-pe-ol`
- `https://colombiatours.bukeer.co/en/actividades/tour-a-guatape-y-pe-ol`

Screenshots del antes/después → compartir con QA-lead para Flow 1 walkthrough.

## Referencia completa editors

Training doc: `docs/training/colombiatours-onboarding.md` — Flows 4/6/7/8 con screenshots + testid anchors + troubleshooting.
