---
session_id: "2026-05-04-es-batch2-optimization"
date: 2026-05-04
agent: "A4 SEO Content Lead"
scope: "content-optimization"
locale: es
market: "ES + MX"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
related_issues: [314, 313]
upstream_audit: "docs/growth-sessions/2026-04-27-seo-audit-top100.md"
upstream_batch1: "docs/growth-sessions/2026-04-27-es-batch1-optimization.md"
status_live_mcp_pull: BLOCKED — projected from 2026-04-25 DataForSEO snapshot. Re-pull at deploy time required.
---

# ES Batch 2 — Top 10 Optimization Recommendations (#314, W2)

Selection rule: same as batch 1, excluding pages already in batch 1. Adds (1) destination hubs identified as `BLOCKED` in audit, (2) compliance content (year drift), (3) experience clusters with clear demand.

> **Pre-condition:** Batch 1 must be deployed (≥6 of 10 shipped) and tracked T+7d minimum before triggering batch 2 ship cycle, to avoid noise in attribution.

---

## #ES11 — `/guatape-antioquia-colombia/` (or canonical destination URL)

- **Why now:** DataForSEO SV 22,200 for `guatape antioquia`; current rank 55-74. Moving even to top 30 captures meaningful volume. Highest absolute opportunity in the destination universe.
- **Current title (estimate):** `Guatapé Antioquia Colombia — ColombiaTours.Travel`.
- **Proposed title:** `Guatapé Antioquia 2026: Guía con Mapa, Tours y Mejor Época`
- **Proposed meta:** `Guía 2026 de Guatapé Antioquia: cómo llegar desde Medellín, subir el Peñol, mejor época, fotos y tours con planner local. Reserva con Bukeer.`
- **Proposed H1:** `Guatapé Antioquia — guía completa 2026 con tours y mapa`
- **Body changes (L effort):**
  1. Restructure as canonical destination hub: H2 secciones (Cómo llegar / Qué hacer / Mejor época / Tours destacados / Mapa / FAQ).
  2. Add `TouristDestination` schema with verified geo + photos.
  3. Embed map (lat: 6.2333, lng: -75.1500).
  4. List 4-6 activities (link `/actividades/{slug}` for Guatape).
  5. List 2 packages including Guatape (link).
- **Internal links:**
  1. `/medellin-colombia/`
  2. `/eje-cafetero-colombia/`
  3. `/los-mejores-paquetes-de-viajes-a-colombia/`
  4. `/actividades/{guatape-actividades}` (4-6 links)
- **Hypothesis:** Pos 55 → 15-20 in 45d.
- **Expected:** +250-400 clicks/mes at pos 15.

---

## #ES12 — `/san-andres-colombia/` (or canonical URL)

- **Why now:** DataForSEO SV 22,200 for `isla san andres` / `san andres island`. Current rank 65-82. Same magnitude as #ES11.
- **Current title:** TBD verify.
- **Proposed title:** `San Andrés Colombia 2026: Playas, Buceo y Paquetes Top`
- **Proposed meta:** `Vive San Andrés 2026: las mejores playas, planes de buceo, mejor época y paquetes con vuelos desde Bogotá/Medellín. Guía hecha por planners locales.`
- **Proposed H1:** `San Andrés Colombia — playas, tours y paquetes 2026`
- **Body changes:** Same destination hub treatment as #ES11.
- **Internal links:**
  1. `/paquetes/...san-andres.../` (if exists in 7 paquetes set; otherwise create note).
  2. `/actividades/{san-andres-actividades}`
  3. `/los-mejores-paquetes-de-viajes-a-colombia/`
- **Hypothesis:** Pos 65 → 20 in 45d. +200-300 clicks/mes.

---

## #ES13 — `/valle-del-cocora/` (or canonical URL)

- **Why now:** DataForSEO SV 2,900. Pos 52-65.
- **Proposed title:** `Valle del Cocora 2026: Cómo Visitar las Palmas de Cera`
- **Proposed meta:** `Guía 2026 del Valle del Cocora: caminata, palmas de cera más altas del mundo, cómo llegar desde Salento, mejor época y tours con planner local.`
- **Proposed H1:** `Valle del Cocora — guía 2026 de caminatas y palmas de cera`
- **Internal links:**
  1. `/eje-cafetero-colombia/`
  2. `/actividades/{cocora-actividades}`
  3. `/paquetes/...eje-cafetero.../`
- **Hypothesis:** Pos 55 → 12-18 in 45d. +60-100 clicks/mes.

---

## #ES14 — `/cartagena-colombia/`

- **Why now:** DataForSEO `cartagena colombia travel` SV 1,000 (MED, KD 11). Current rank not in top GSC report (likely outside top 50).
- **Proposed title:** `Cartagena Colombia 2026: Qué Hacer, Mejor Época y Paquetes`
- **Proposed meta:** `Guía 2026 de Cartagena Colombia: ciudad amurallada, Islas del Rosario, mejor época, paquetes todo incluido y planner local. Reserva con Bukeer.`
- **Proposed H1:** `Cartagena Colombia — guía 2026 con tours y paquetes`
- **Internal links:**
  1. `/paquetes/...cartagena-cultura.../`
  2. `/actividades/{cartagena-actividades}`
  3. `/devolucion-de-iva-a-turistas-extranjeros/`
- **Hypothesis:** Top-50 → top-15 in 45d. +80-120 clicks/mes.

---

## #ES15 — `/medellin-colombia/`

- **Why now:** DataForSEO `medellin colombia tours` SV 880 (HIGH comp, $2.74 CPC = strong commercial). Critical for ES + MX market.
- **Proposed title:** `Medellín Colombia 2026: Tours, Comuna 13 y Eje Cafetero`
- **Proposed meta:** `Guía 2026 de Medellín: Comuna 13, Pueblito Paisa, tour del café y excursión a Guatapé. Itinerarios y paquetes con planner local Bukeer.`
- **Proposed H1:** `Medellín Colombia — qué hacer, tours y paquetes 2026`
- **Internal links:**
  1. `/guatape-antioquia-colombia/` (#ES11)
  2. `/paquetes/...medellin.../`
  3. `/actividades/{medellin-actividades}`
- **Hypothesis:** Move to top 15 in 45d for `medellin colombia tours`. +50-90 clicks/mes.

---

## #ES16 — `/eje-cafetero-colombia/`

- **Why now:** DataForSEO `eje cafetero colombia` SV 1,600 (LOW comp).
- **Proposed title:** `Eje Cafetero Colombia 2026: Salento, Cocora y Tour de Café`
- **Proposed meta:** `Guía 2026 del Eje Cafetero: Salento, Filandia, Valle del Cocora y tour por una hacienda cafetera. Mejor época y paquetes con planner local.`
- **Proposed H1:** `Eje Cafetero Colombia — guía 2026 con tour cafetero y paquetes`
- **Body changes:** Hub treatment + visible 5-day suggested itinerary.
- **Internal links:**
  1. `/valle-del-cocora/` (#ES13)
  2. `/paquetes/...eje-cafetero.../`
  3. `/actividades/{eje-actividades}`
- **Hypothesis:** Top-50 → top-15. +90-130 clicks/mes.

---

## #ES17 — `/requisitos-para-viajar-a-colombia/`

- **Why now:** DataForSEO `requisitos para viajar a colombia 2025` 320 SV. Updating to 2026 + variant capture. Stale year drift = #C4-P0-10 in fix plan.
- **Proposed title:** `Requisitos para Viajar a Colombia en 2026 (Pasaporte, Visa, Check-MIG)`
- **Proposed meta:** `Lista oficial 2026: pasaporte, visa, Check-MIG, vacunas y seguro. Cómo entrar a Colombia desde México, USA y Europa. Fuente: Migración Colombia.`
- **Proposed H1:** `Requisitos para viajar a Colombia 2026 — guía oficial`
- **Body changes:**
  1. Update all "2025" → "2026".
  2. Add `dateModified 2026-05`.
  3. Cite official sources (`migracioncolombia.gov.co`, `cancilleria.gov.co`).
  4. Add per-country block (Mexico / USA / Europa / LATAM).
- **Internal links:**
  1. `/agencia-de-viajes-a-colombia-para-mexicanos/`
  2. `/check-mig-colombia/` (or create)
  3. `/devolucion-de-iva-a-turistas-extranjeros/`
- **Hypothesis:** Capture 2026 query variant → +30-50 clicks/mes.

---

## #ES18 — Mexico cost cluster `/check-mig-colombia/` (CREATE if missing)

- **Why now:** DataForSEO `check-mig colombia` 6,600 SV — second-highest demand in MX cluster. Compliance cluster supports MX funnel.
- **Status:** AUDIT confirms existence pending. If missing, **create**.
- **Proposed title:** `Check-MIG Colombia 2026: Cómo Llenar el Formulario (Guía Oficial)`
- **Proposed meta:** `Paso a paso 2026 para llenar el Check-MIG de Migración Colombia: enlaces oficiales, tiempos, errores comunes y soporte. Para viajeros desde México.`
- **Proposed H1:** `Check-MIG Colombia — cómo llenarlo en 2026 (guía paso a paso)`
- **Body:**
  1. 5-step visible process with screenshots/diagrams.
  2. Cite official `apps.migracioncolombia.gov.co` URL.
  3. FAQ block (mínimo 6 preguntas reales: cuándo llenarlo, costo, qué pasa si no lo lleno, etc.).
  4. CTA to `/agencia-de-viajes-a-colombia-para-mexicanos/`.
- **Internal links:**
  1. `/requisitos-para-viajar-a-colombia/` (#ES17)
  2. `/agencia-de-viajes-a-colombia-para-mexicanos/`
- **Hypothesis:** New page → top-10 within 45d on low-competition compliance query. +200-400 clicks/mes from MX (volume normalized).
- **Risk:** Creating thin/AI-generated content fails E-E-A-T. Required: real screenshots + quotes from Migración Colombia source.

---

## #ES19 — `/colombia-tours/` (or `/tours-colombia/`)

- **Why now:** Query `colombia tours` (40 clicks/3,026 impr/CTR 1.32%/pos 33.52). Head term, high impression. Currently captured by `/` (home) but home is broad — dedicated commercial pillar at this slug would consolidate.
- **Status:** Verify existence. If missing, redirect this batch into #ES03 (`/los-mejores-paquetes-de-viajes-a-colombia/`) instead.
- **Proposed title (if URL exists):** `Tours a Colombia 2026: Itinerarios Top con Planner Local`
- **Proposed meta:** `Catálogo 2026 de tours a Colombia: clásicos (Cartagena+Eje), aventura (Sierra+Tayrona), playa (San Andrés). Planner local Bukeer. Cotiza por WhatsApp.`
- **Proposed H1:** `Tours a Colombia — itinerarios 2026 por planner local`
- **Internal links:**
  1. All 7 paquetes detail.
  2. Top destination hubs (Cartagena, Medellín, Eje, San Andrés).
- **Hypothesis:** Pos 33 → 15 in 45d. +80-120 clicks/mes.

---

## #ES20 — `/blog/los-10-mejores-destinos-para-conocer-colombia/` (ES root version, if exists)

- **Why now:** EN subdomain version captures 19 clicks / 10,270 impr / CTR 0.19% / pos 4.89 — but on EN subdomain serving ES content. ES root version has unknown perf — likely losing impressions to EN cannibalization.
- **Action:** Verify ES root URL. If exists, optimize. If not, post-#C6-P1-14 cannibalization fix should redirect EN → ES root.
- **Proposed title:** `Los 10 Mejores Destinos para Conocer Colombia en 2026`
- **Proposed meta:** `Top 10 destinos 2026 en Colombia: Cartagena, Medellín, San Andrés, Eje Cafetero, Sierra Nevada, Amazonas y más. Selección de planners locales con paquetes.`
- **Proposed H1:** `Los 10 mejores destinos para conocer Colombia (guía 2026)`
- **Body changes:** Same model as #ES06 but distinct angle (destinos vs lugares).
- **Hypothesis:** Once cannibalization fixed (#C6-P1-14) and ES version optimized, recover 50-70% of EN impressions to ES URL. +30-50 clicks/mes.

---

## Aggregate batch 2 expected impact (additive to batch 1)

| Metric | Baseline (batch 1 + batch 2 URLs) | Target +21d (2026-05-25) | Target +45d (2026-06-19) |
|---|---:|---:|---:|
| Sum clicks (these 10 URLs) | ~75 (mostly under-tracked) | 320 (+327%) | 760 (+913%) |
| Avg position | 50+ | 25 | 15 |
| Avg CTR | 0.5% | 1.5% | 3.0% |

> Note: destination hubs have largest absolute upside but slowest re-rank. SEO eval window per #337 = 21-45d.

## Owner placeholders + delivery

| URL | Owner | Effort | Ship target |
|---|---|---|---|
| #ES11 Guatapé | TBD | L | 2026-05-09 |
| #ES12 San Andrés | TBD | L | 2026-05-10 |
| #ES13 Cocora | TBD | M | 2026-05-11 |
| #ES14 Cartagena | TBD | L | 2026-05-12 |
| #ES15 Medellín | TBD | L | 2026-05-13 |
| #ES16 Eje Cafetero | TBD | L | 2026-05-14 |
| #ES17 Requisitos 2026 | TBD | M (year drift) | 2026-05-08 (priority) |
| #ES18 Check-MIG (CREATE) | TBD | XL (new page) | 2026-05-15 |
| #ES19 Tours Colombia | TBD | M | 2026-05-13 |
| #ES20 10 Destinos ES | TBD | M | 2026-05-15 |

## Verification before ship

Same protocol as batch 1: SERP re-pull, meta truncation check, internal-link anchor verification, ISR revalidate.

## Cross-batch caveats

- DO NOT ship destination hubs before brand cannibalization fix (#C1-P0-01). Otherwise hub linking signals leak to non-canonical URLs.
- DO NOT create #ES18 if Bukeer planner team cannot supply real Migración Colombia screenshots — defer to a later sprint rather than ship thin content.
- All internal links must be added bidirectionally where the target page makes editorial sense (e.g. `/eje-cafetero-colombia/` should link to `/valle-del-cocora/` AND vice versa).
