---
paths:
  - "**/*"
---

# Cross-Repo Context: bukeer-flutter

Related repo: `/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter` (`weppa-cloud/bukeer-flutter`)
Purpose: Flutter Web app (PWA) + Supabase backend. Same Supabase project as this repo.

## Shared DB tables
- `websites` — written by Flutter admin, read here for rendering
- `package_kits` + `package_kit_versions` — Flutter manages catalog; studio displays on public site
- `itineraries`, `itinerary_items`, `contacts`, `products` — shared data model

## Key decisions (2026-04-10)

**Package Kits:** Packages display in account's primary currency. Items applied from a package are freely editable (template, not lock). `itinerary_items.product_type` uses Spanish capitalized values (`'Hoteles'`, `'Servicios'`, `'Transporte'`, `'Vuelos'`).

**Theme v3:** DB shape: `websites.theme = { tokens: DesignTokens, profile: ThemeProfile }` — CHECK constraint enforces v3. Use `{ tokens, profile }` shape, not flat `{ seedColor }`. 8 presets: adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic.

**Auth:** Same Supabase auth project. UI must not access JWT tokens directly (ADR-022). SSR cookies flow through Next.js middleware.

## SEO gaps to fix
1. `inLanguage` hardcoded to `'es'` — should read from DB
2. `/packages/[slug]` page missing
3. `slug` field missing in `package_kits` table

## Data flow
```
Flutter admin → Supabase DB → Studio SSR → ISR cached public pages
```

## Issue cross-references
- Package Kit distribution: `weppa-cloud/bukeer-flutter#544`, `#545`
- Website UX redesign: `weppa-cloud/bukeer-flutter#548`
- Theme Platform v3: `weppa-cloud/bukeer-flutter#550`
