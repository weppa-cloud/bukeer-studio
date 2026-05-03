---
session_id: "2026-04-27-es-batch1-optimization"
date: 2026-04-27
agent: "A4 SEO Content Lead"
scope: "content-optimization"
locale: es
market: "ES + MX (es-CO origin)"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
related_issues: [314, 313, 312]
upstream_audit: "docs/growth-sessions/2026-04-27-seo-audit-top100.md"
data_sources:
  - "GSC mcp__search_console 2026-03-27 → 2026-04-24 (28d)"
  - "GA4 property 294486074 — 2026-03-28 → 2026-04-24"
  - "DataForSEO MCP batch 2026-04-25"
  - "Production crawl 2026-04-24"
status_live_mcp_pull: BLOCKED — re-pull SERP titles + competitor SERPs before deploying titles. Recommendations below are baseline-grounded but should be sanity-checked vs current SERP truncation (60-65 char title, 155-165 char meta) at deploy time.
---

# ES Batch 1 — Top 10 Optimization Recommendations (#314)

Selection rule: ES pages with position 5-15 (or pos 25-30 with high commercial intent) AND CTR below the channel median (`0.45% × 2 = 0.90%`). Goal: reclaim CTR + move ≥5 pages 2-7 positions in 21d.

SERP truncation policy: title ≤60 chars (pixel-safe ≤575px), meta ≤155 chars. H1 visible variant of title (longer allowed).

---

## #ES01 — `/devolucion-de-iva-a-turistas-extranjeros/`

- **Why now:** GSC pos 5.43, CTR 7.22%, 48 clicks/665 impr. Highest CTR in ES non-brand set. Closest to top-3 jump. Tax-free is a Mexico funnel entry — `tax free colombia` 22 clicks/166 impr CTR 13.25%.
- **Current title:** `Devolución de IVA a Turistas Extranjeros — ColombiaTours.Travel` (likely template-driven, ~64 chars).
- **Current meta:** `Información sobre la devolución de IVA en Colombia.` (estimate; needs crawl confirm).
- **Current H1:** `Devolución de IVA a turistas extranjeros`.
- **Proposed title (≤60):** `Tax Free Colombia 2026: Cómo Pedir la Devolución de IVA`
- **Proposed meta (≤155):** `Guía 2026 para turistas: cómo solicitar la devolución de IVA al salir de Colombia. Lista de tiendas, documentos y pasos. Actualizado por planners.`
- **Proposed H1:** `Tax Free Colombia 2026 — Devolución de IVA paso a paso`
- **Internal links to add (3-5):**
  1. `/agencia-de-viajes-a-colombia-para-mexicanos/` — anchor "Si viajas desde México, planifica con un agencia experta"
  2. `/paquetes-a-colombia-todo-incluido-en-9-dias/` — anchor "Paquetes todo incluido a Colombia"
  3. `/los-mejores-paquetes-de-viajes-a-colombia/` — anchor "Compara paquetes 2026 con planner local"
  4. `/requisitos-para-viajar-a-colombia/` — anchor "requisitos de entrada a Colombia"
- **Hypothesis:** CTR 7.22% → 11-13%; pos 5.43 → 3.0 in 21d. Adds Mexico bridge → +5-8 WAFlow submits/mes.
- **Risk:** Title change can drop CTR before re-rank stabilizes; revert window 14d.

---

## #ES02 — `/pueblos-para-visitar-cerca-de-bucaramanga/`

- **Why now:** GSC pos 5.17, CTR 0.80%, 23 clicks/2,886 impr. Engagement champion (GA4 2,084s avg session). Massive CTR gap.
- **Current title:** `Pueblos para visitar cerca de Bucaramanga — ColombiaTours.Travel`.
- **Proposed title:** `15 Pueblos Cerca de Bucaramanga para Visitar en 2026`
- **Proposed meta:** `Lista revisada por planners de los 15 mejores pueblos cerca de Bucaramanga: distancias, planes, mejor época y mapa. Diseña tu ruta 2026 sin perder tiempo.`
- **Proposed H1:** `15 pueblos cerca de Bucaramanga que vale la pena visitar (guía 2026)`
- **Internal links to add:**
  1. `/destinos/santander/` (or equivalent) — anchor "rutas por Santander"
  2. `/arma-tu-plan-colombia/` — anchor "diseña tu viaje a Colombia con un planner experto"
  3. `/paquetes/...santander.../` (if exists) — anchor "paquetes a Santander con guía local"
- **Hypothesis:** CTR 0.80% → 4.0%+ (numeric+year title), pos 5.17 → 3.0 in 21d. Triggers PAA expansion.
- **Expected:** +30-50 clicks/mes on this URL alone.

---

## #ES03 — `/devolucion-de-iva-a-turistas-extranjeros/` cluster check (`pueblos cerca a bucaramanga`)
> Same as #ES02 — query `pueblos cerca a bucaramanga` 4 clicks/455 impr CTR 0.88% pos 2.54. The pos 2.54 query already targets #ES02; treat as covered. Skip.

---

## #ES03 — `/los-mejores-paquetes-de-viajes-a-colombia/`

- **Why now:** GSC pos 29.7, CTR 1.75%, 11 clicks/629 impr. Commercial pillar at striking distance edge. GA4 364 views with 95.2% engagement (already high-quality traffic).
- **Current title:** `Los mejores paquetes de viajes a Colombia — ColombiaTours.Travel`.
- **Proposed title:** `Los Mejores Paquetes a Colombia 2026: 6 Itinerarios Top`
- **Proposed meta:** `Compara los 6 mejores paquetes de viaje a Colombia 2026 — precios desde, días, ciudades incluidas y planner experto. Reserva con devolución de IVA.`
- **Proposed H1:** `Los mejores paquetes de viajes a Colombia 2026 — comparativa por planner local`
- **Body change (required):** Replace generic intro with 6-package matrix (price-from, days, destinations covered, link to detail). Add "Tax Free Colombia" callout for foreign travelers.
- **Internal links to add:**
  1. Each of the 7 `/paquetes/{slug}/` detail pages (already in matrix).
  2. `/devolucion-de-iva-a-turistas-extranjeros/` — anchor "qué es Tax Free Colombia"
  3. `/agencia-de-viajes-a-colombia-para-mexicanos/` — anchor "viajeros desde México"
- **Hypothesis:** Pos 29.7 → 12-15 in 21d (heavy commercial intent — competition tier matters). CTR 1.75% → 4-6%.
- **Expected:** +25-40 clicks/mes; primary lead-gen page.

---

## #ES04 — `/agencia-de-viajes-a-colombia-para-mexicanos/`

- **Why now:** GA4 #1 by views (2,552/28d), engagement 48.6% (under-performs vs site avg 90%+). MX commercial hub. GSC stats not in top reported but 28d window estimated 18-25 clicks based on traffic ratio.
- **Current title:** `Agencia de viajes a Colombia para mexicanos — ColombiaTours.Travel`.
- **Proposed title:** `Viajes a Colombia desde México 2026 — Agencia con Planner Local`
- **Proposed meta:** `Vive Colombia desde México 2026: agencia con planners locales, paquetes todo incluido, Check-MIG y devolución de IVA. Cotiza por WhatsApp en minutos.`
- **Proposed H1:** `Agencia de viajes a Colombia desde México — diseñamos tu plan 2026`
- **Body changes (P0):**
  1. Above-the-fold cost block: "¿Cuánto cuesta viajar a Colombia desde México?" (table with USD/MXN ranges, 5/7/9 días).
  2. Check-MIG / pasaporte / visa / Tax Free in 4-card grid (cite official sources).
  3. Package CTA — top 3 paquetes por días (5d, 7d, 9d).
  4. Testimonial from MX traveler if available (else remove placeholder).
- **Internal links to add:**
  1. `/paquetes-a-colombia-todo-incluido-en-9-dias/`
  2. `/devolucion-de-iva-a-turistas-extranjeros/`
  3. `/requisitos-para-viajar-a-colombia/`
  4. `/en-cuanto-sale-un-viaje-a-colombia-blog/`
- **Hypothesis:** Engagement 48.6% → 70%+. WAFlow submits +20/mes (currently estimated ~5).
- **Expected metric:** Qualified lead requests from MX +15/mes in 30d.

---

## #ES05 — `/paquetes-a-colombia-todo-incluido-en-9-dias/`

- **Why now:** GA4 #2 by views (1,394/28d), engagement 44.9%. Commercial detail under-converting.
- **Current title:** `Paquetes a Colombia todo incluido en 9 días — ColombiaTours.Travel`.
- **Proposed title:** `Paquete Colombia 9 Días Todo Incluido 2026 — Desde USD X`
- **Proposed meta:** `Recorre Cartagena, Medellín y Eje Cafetero en 9 días con todo incluido: vuelos internos, hoteles 4★ y planner local. Ideal viajeros desde México 2026.`
- **Proposed H1:** `Paquete Colombia 9 días todo incluido 2026 — Cartagena · Medellín · Eje Cafetero`
- **Body changes:** Add visible day-by-day itinerary above the fold (currently behind tab? Verify — Google does not index hidden content per #catalog-v2-seo-rendering memory). Visible price-from with Tax Free callout for foreigners.
- **Internal links:**
  1. `/agencia-de-viajes-a-colombia-para-mexicanos/`
  2. `/paquetes/` (collection)
  3. `/cartagena-colombia/` (destination hub)
  4. `/eje-cafetero-colombia/` (destination hub)
- **Hypothesis:** Engagement 44.9% → 65%+; rank uplift on `paquete colombia 9 dias` (DFS demand confirmed).
- **Expected:** +15 leads/mes.

---

## #ES06 — `/los-10-mejores-lugares-turisticos-de-colombia/`

- **Why now:** GA4 83 organic sessions (#3 organic), engagement 79.5%. Targets `los 15 lugares turisticos de colombia` (10 clicks/836 impr CTR 1.20% pos 1.50 — already #1, but CTR weak for #1 spot indicates title/snippet issue).
- **Current title:** `Los 10 mejores lugares turísticos de Colombia — ColombiaTours.Travel`.
- **Proposed title:** `Los 15 Mejores Lugares Turísticos de Colombia (Edición 2026)`
- **Proposed meta:** `Selección 2026 hecha por planners locales: los 15 mejores lugares turísticos de Colombia con mapa, mejor época y paquetes recomendados. Inspírate en 5 minutos.`
- **Proposed H1:** `Los 15 mejores lugares turísticos de Colombia — guía 2026`
- **Body changes:** Convert from 10 items to 15 (matches highest-CTR query). Add `dateModified 2026-04`. Add `reviewedBy: { @type: 'Person', name: '[real planner]' }` if data exists.
- **Internal links:**
  1. Each of the 15 destination hubs (Guatape, Cartagena, Medellín, Eje Cafetero, San Andrés, Valle del Cocora, etc.).
  2. `/los-mejores-paquetes-de-viajes-a-colombia/`
  3. `/arma-tu-plan-colombia/`
- **Hypothesis:** CTR at pos 1.50 jumps from 1.20% to 8-12% (matching numeric title query intent).
- **Expected:** +60-80 clicks/mes.

---

## #ES07 — `/mejor-epoca-para-viajar-a-colombia-mes-a-mes/`

- **Why now:** GA4 78 organic sessions, engagement 94.9%. Highest-quality traffic; GSC underweighted.
- **Current title:** `Mejor época para viajar a Colombia mes a mes — ColombiaTours.Travel`.
- **Proposed title:** `Mejor Época para Viajar a Colombia 2026 — Mes a Mes`
- **Proposed meta:** `Tabla 2026 mes a mes: temperatura, lluvias y eventos por destino. Sabrás cuándo ir a Cartagena, Medellín o Eje Cafetero. Recomendado por planners.`
- **Proposed H1:** `Mejor época para viajar a Colombia mes a mes — guía climática 2026`
- **Body changes:**
  1. Add 12-month visible table (Cartagena | Medellín | Eje | Bogotá | San Andrés | Amazonas).
  2. Add `dateModified`.
  3. Internal links to destination hubs from each row.
- **Internal links:**
  1. `/cartagena-colombia/`
  2. `/medellin-colombia/` (if exists, else create gap noted in #C7-P1-16)
  3. `/eje-cafetero-colombia/`
  4. `/arma-tu-plan-colombia/`
- **Hypothesis:** Captures AI Overview spot for `mejor epoca colombia` (DFS LOW comp). Pos jump unknown → re-pull GSC at eval.
- **Expected:** +30-50 organic clicks/mes from AI Overview pickup.

---

## #ES08 — `/10-pueblos-cerca-de-bogota-que-debes-visitar/`

- **Why now:** GA4 66 sessions, engagement 89.4%. Pueblo cluster strong.
- **Current title:** `10 Pueblos cerca de Bogotá que debes visitar — ColombiaTours.Travel`.
- **Proposed title:** `10 Pueblos Cerca de Bogotá Imperdibles en 2026 (con Mapa)`
- **Proposed meta:** `Mapa 2026 con los 10 mejores pueblos cerca de Bogotá: distancia, planes, dónde comer y mejor época. Selección de planners locales.`
- **Proposed H1:** `10 pueblos cerca de Bogotá que debes visitar (con mapa, 2026)`
- **Body changes:** Add embedded map (lat/lng for each pueblo), `TouristDestination` schema per pueblo.
- **Internal links:**
  1. `/destinos/cundinamarca/` (if exists)
  2. `/arma-tu-plan-colombia/`
  3. `/paquetes/...bogota-esencial.../`
- **Hypothesis:** SERP map pack trigger; CTR uplift +20%.

---

## #ES09 — `/los-mejores-lugares-turisticos-colombia/` (canibalization risk with #ES06)

- **Why now:** GA4 81 sessions, engagement 98.8% — extremely high quality. But likely canibalizes `/los-10-mejores-lugares-turisticos-de-colombia/`.
- **Action:** Audit cannibalization → likely consolidate. Two options:
  - **Option A:** 301 redirect this URL to `#ES06`. Preserves equity.
  - **Option B:** Differentiate this as broader `lugares turisticos colombia` (no number cap) and keep `/los-10-mejores-lugares-turisticos-de-colombia/` as listicle.
- **Recommendation:** Option B — differentiate.
- **Proposed title (Option B):** `Lugares Turísticos de Colombia 2026: Guía Completa por Región`
- **Proposed meta:** `Guía 2026 de los lugares turísticos de Colombia organizados por región: Caribe, Andes, Pacífico y Amazonía. Mapa, fotos y paquetes.`
- **Proposed H1:** `Lugares turísticos de Colombia — guía 2026 organizada por región`
- **Internal links:** All 5 regional hubs + `#ES06` listicle as internal link "Si buscas un top 15, mira nuestra selección" anchor.
- **Hypothesis:** Both URLs hold rank for different query types; +10-15 incremental clicks/mes.

---

## #ES10 — `/en-cuanto-sale-un-viaje-a-colombia-blog/`

- **Why now:** GA4 61 views with engagement crash 4.92% (vs site avg 90%+). Indicates content/intent mismatch — visitors land but bounce. Mexico cost cluster (DFS `cuanto cuesta viajar a colombia` 2,400 SV with AI Overview).
- **Current title:** Likely `¿En cuánto sale un viaje a Colombia? — Blog ColombiaTours.Travel`.
- **Proposed title:** `Cuánto Cuesta Viajar a Colombia en 2026 (Tabla por País)`
- **Proposed meta:** `Tabla actualizada 2026: cuánto cuesta viajar a Colombia desde México, USA y Europa. Vuelos, hoteles, paquetes y consejos para ahorrar. Por planners locales.`
- **Proposed H1:** `Cuánto cuesta viajar a Colombia en 2026 — costos reales por país`
- **Body changes (P0):**
  1. Replace "blog" suffix in URL slug with re-publish at canonical `/cuanto-cuesta-viajar-a-colombia/` (301 from old).
  2. Add visible table (USD/MXN/EUR — vuelos, hospedaje, comida, actividades, paquete) with sources.
  3. Cite price ranges from real packages (link).
  4. Add `dateModified`.
- **Internal links:**
  1. `/paquetes-a-colombia-todo-incluido-en-9-dias/`
  2. `/devolucion-de-iva-a-turistas-extranjeros/`
  3. `/agencia-de-viajes-a-colombia-para-mexicanos/`
- **Hypothesis:** Engagement 4.92% → 60%+ (intent match). Captures AI Overview block for cost question. +40-60 clicks/mes from MX market.
- **Risk:** URL change requires 301 + Search Console URL Inspection re-submit.

---

## Aggregate batch 1 expected impact

| Metric | Baseline 28d | Target +21d (2026-05-18) | Target +45d (2026-06-12) |
|---|---:|---:|---:|
| Sum clicks (these 10 URLs) | ~265 (GSC top reported) | 380 (+44%) | 480 (+81%) |
| Avg position (where rankable) | 12.5 | 8.5 | 5.5 |
| Avg CTR | 1.8% | 3.0% | 4.5% |
| WAFlow submits attributable | ~12/mes (estimate) | 25/mes | 40/mes |

## Owner placeholders + delivery

| URL | Owner | Effort | Ship target |
|---|---|---|---|
| #ES01 Tax Free | TBD | XS (title+meta+links) | 2026-04-29 |
| #ES02 Pueblos Bucaramanga | TBD | S | 2026-04-30 |
| #ES03 Mejores paquetes | TBD | M (body restructure) | 2026-05-02 |
| #ES04 Mexico hub | TBD | M (body block additions) | 2026-05-02 |
| #ES05 Paquete 9 días | TBD | S (visible itinerary) | 2026-05-04 |
| #ES06 15 lugares | TBD | M (10→15 + reviewedBy) | 2026-05-05 |
| #ES07 Mejor época | TBD | M (12-month table) | 2026-05-06 |
| #ES08 Pueblos Bogotá | TBD | M (map + schema) | 2026-05-07 |
| #ES09 Lugares por región | TBD | L (new structure) | 2026-05-09 |
| #ES10 Cuánto cuesta | TBD | L (URL change + table + 301) | 2026-05-09 |

## Verification before ship

For each URL, just before deploy:
1. Re-pull current SERP via DataForSEO MCP (verify proposed title not too similar to top 3 competitors).
2. Confirm meta length renders ≤155 chars in mobile SERP (no `…` truncation).
3. Test internal-link anchors exist as new anchor — no orphans.
4. Confirm `dateModified` ISO updates trigger new ISR cache via Studio revalidate endpoint.

## Eval procedure

- T+7 days: GSC URL Inspection + check impressions trend.
- T+21 days: GSC re-pull → close batch entries with `win/loss/inconclusive/scale/stop`.
- T+45 days: Final eval; promote winners to "scale" (more internal links, broader hub coverage); kill losers.
