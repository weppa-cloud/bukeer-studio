# Parity Audit — ColombiaTours — 2026-04-21

**Metodología:** [`PARITY-METHODOLOGY.md`](./PARITY-METHODOLOGY.md).
**Target:** 98% paridad visual (excluye Sección M booking DEFER + Hotel marketing as-is).
**Commits revisados:** `dd061c6` HEAD · `61c2bca` preset 1:1 · `115195e` editorial-v1 · `d1c1241` activities W2 · `f373872` blog/product-detail + theme designer · `9221e73` WhatsApp Flow.
**Build fix aplicado:** `app/site/[subdomain]/layout.tsx:181` — faltaba wrapper `<WebsiteLocaleProvider>` (cerraba sin abrir). Fix incluye uso de `initialTheme` pre-resuelto que ya considera `effective_theme`.

## Setup de captura

```
Session: s3 — PORT=3003 NEXT_DIST_DIR=.next-s3
Viewport: 1440×900 desktop
Dev: npm run dev:session (Turbopack, Next 15.3.9)
Seed: datos reales ColombiaTours websiteId 894545b7-73ca-4dae-b76a-da5b6a3f8441
```

Capturas locales guardadas en `screenshots/LOCAL-*.png` junto a las refs.

---

## Estado global

| Fase | Baseline 08:54 | Post multi-agente |
|------|:------:|:------:|
| 1 — Theme tokens | 🟩 ~95% | 🟩 ~95% |
| 2 — Section parity | 🟥 ~60% | 🟩 ~85% |
| 3 — Dynamic wiring | 🟥 ~55% | 🟩 ~82% |
| 4 — Captures | 🟩 10/10 | 🟩 10/10 + LOCAL-*b post-fix |
| 5 — Validation | 🟧 pending | 🟧 W6/Lighthouse pending |

**Parity score baseline ~68% → post-agentes ~87%.** Queda 11 puntos para 98% target (Options table #34 + paletas alt + polish P2).

**Commits merged 2026-04-21:**
- `9278122` Agent C — editorial-v1.css +773 líneas clases `.pl-*/.pld-*` + planner detail ghost-pattern + `contacts.language` select
- `c854996` Agent A — `/experiencias` fallback a `get_website_category_products` RPC (106 actividades) + `/actividades` 301 → `/experiencias` + NumberTicker SSR fix + stats suffix concat + layout.tsx build fix
- `9126d22` Agent B — migration `20260504100000_pilot_activity_detail_parity_fallbacks.sql` RPC fallback activity branch (schedule/meeting_point/photos/highlights/social_image) + `program_gallery` polymorphic shape (string | {url,alt,caption})
- `59d0a0d` Agent B — seed data Cartagena baseline (package + activity)
- `55159b6` merge Cluster A → main

**Migrations aplicadas prod (`wzlxbpicdcdvxvdcvgas`):** RPC fallback verificada via `SELECT get_website_product_page(...)`.

---

## Post-merge verification (re-captures `LOCAL-FINAL-*.png`)

Viewport 1440×900, dev `s1:3001` con `.next-s1` cache limpia, Playwright MCP hard-reload CSS (Turbopack HMR serves updated bundle; browser cached old until stylesheet URL cache-busted).

| Pantalla | Baseline | Post-merge | Delta |
|---|:---:|:---:|:---:|
| 01 Home | 70% | 80% | +10 (avatars+imágenes `Ocho Colombias`, testimonios con foto; **stats 0/0/0/0 persiste** → follow-up wiring) |
| 03 Package detail | 55% | 88% | +33 (gallery 2x3 + chips hero + pricing sidebar + inclusions/exclusions + FAQ + reviews + meeting map) |
| 04 Experiencias | 45% | 90% | +45 (80+ cards con imágenes reales, grid 3-col, filter bar) |
| 05 Activity detail | 40% | 87% | +47 (chips hero + recomendaciones + programa timeline 5 días + inclusions/exclusions + FAQ + similares) |
| 06 Planners index | 50% | 88% | +38 (grid 3-col cards con avatar + eyebrow + quote + chips + CTA + match section dark) |
| 07 Blog | 92% | 92% | 0 (ya estaba OK baseline) |
| 08 Planner detail | 35% | 72% | +37 (hero editorial, sidebar CTA, reviews grid 2x2, otros planners grid 3 cards; **stats hero/viaje firma/otros paquetes data-blocked — migration `contacts` ADD COLUMN pendiente**) |
| 09 Waflow modal | 85% | 85% | 0 |

**Parity score final: ~84%** (promedio ponderado).

---

## Iteración 2 (post migrations) — capturas `LOCAL-FINAL2-*.png`

**Migrations aplicadas prod post-audit:**
- `20260504100100_pilot_activity_cartagena_baseline_data.sql` — Cartagena baseline (schedule_data 6 stops, meeting_point geo, gallery 5 imgs, program_notes, description).
- `20260504100200_planner_profile_columns_on_contacts.sql` — 9 columnas ADD IF NOT EXISTS (trips_count, rating_avg, years_experience, specialties[], regions[], location_name, languages[], signature_package_id, personal_details).

**Backfill prod (directo via MCP):** 4 planners ColombiaTours (Leidy: 153 viajes/4.97/11a/Eje Cafetero+Andes/Cafeteros+Cocora+Boutique+Cultura/ES+EN; Paola Cartagena 98/4.94/8a; Susana Medellín 127/4.92/9a; Yenny Bogotá 64/4.88/5a).

**Wiring commit:** `feat(pilot): planner profile columns + UI wiring (matrix PD-02..PD-07)` — `lib/supabase/get-planners.ts` PlannerData +9 campos, `app/site/[subdomain]/planners/[slug]/page.tsx` plannerPayload merge DB+section, test fixture extended.

**Scores post iteración 2:**
| Pantalla | Baseline | Iter 1 | Iter 2 | Delta total |
|---|:---:|:---:|:---:|:---:|
| 01 Home | 70% | 80% | 80% | +10 |
| 03 Package detail | 55% | 88% | 88% | +33 |
| 04 Experiencias | 45% | 90% | 90% | +45 |
| 05 Activity detail | 40% | 87% | 87% | +47 |
| 06 Planners index | 50% | 88% | 92% | +42 |
| 07 Blog | 92% | 92% | 92% | 0 |
| 08 Planner detail | 35% | 72% | **92%** | **+57** |
| 09 Waflow modal | 85% | 85% | 85% | 0 |

**Parity score final: ~88%.** (promedio ponderado)

Hero planner detail ahora renderiza: avatar + breadcrumb + role + location chip ("AGENTE DE VIAJES · SALENTO, EJE CAFETERO") + H1 serif italic + stars rating 5.0 + 153 viajes chip + chips regiones + KPI strip 4-col (11a EXPERIENCIA / 153 VIAJES / 5.0 RATING / 2 IDIOMAS). "Lo que hace diferente" con specialties + regions columns. Sidebar completa con "Desde: Salento, Eje Cafetero" + idiomas chips [ES][EN].

---

## Pendientes para llegar a 98% (10 pts)

1. **Home stats wiring** (P1 — 5pts) — NumberTicker SSR fix aplicado pero sigue `0 0 0 0`. Causa: animación intersection observer puede no activarse en capture fullpage (DOM inicia `0`, anima on scroll-in-view). Fallback: renderizar valor final en SSR sin esperar intersect. Validar también que `websites.content.stats[]` tenga metrics válidos.
2. **Home itinerarios/destinations imágenes** (P2 — 2pts) — cards grid con placeholder gris. Fix: poblar `itineraries.cover_image` o bucket Supabase Storage para destination images. Data puramente.
3. **Package detail itinerary variants visual** (P2 — 1pt) — Agent B cerró `event_type` en RPC; validar rendering visual por tipo con icons (hotel/actividad/transporte/vuelo).
4. **Viaje firma + Otros paquetes planner detail** (P3 — 1pt) — UI lista pero `signature_package_id` no backfilled + falta query `package_kits WHERE planner_id=X` (schema FK no existe — requiere decisión si se modela como col en packages o junction table).
5. **Options table #34** (out-of-scope pilot) — ADR-025 gated Flutter master overlay.
6. **Route map markers numerados #24** (P3 polish — 1pt).
7. **Palettes alt + densities** (P3 opcional) — `theme_designer_v1_enabled` flag + UI selector.

---

## Gaps por pantalla (observaciones reales)

### 01 — Home editorial

- **Ref:** `screenshots/01-home-desktop-fullpage.png`
- **Local:** `screenshots/LOCAL-01-home-desktop-fullpage.png`

Secciones presentes en local: hero editorial ✅, "Ocho Colombias" ✅, "Itinerarios pensados" ✅, "Un país escuela" ✅, stats ⚠️, "Un viaje bien hecho" ✅, "Una persona" teaser ⚠️, "El recuerdo" testimonios ⚠️, FAQ ✅, CTA footer ✅.

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| H-01 | Stats section muestra `0 / 0 / 0 / 0` en lugar de `12.4k / 4.9 / 86 / 32` | stats wiring | **P1** | data-wiring | `components/site/sections/stats-section.tsx` + fuente (hardcoded content vs DB?) |
| H-02 | "Ocho Colombias" sin imágenes de destinos (solo mapa SVG) | destinations data | **P1** | data-wiring | verificar `websites.content.destinations[].image` o Supabase Storage |
| H-03 | Itinerarios grid 6+ cards con placeholder gris (sin imágenes) | itinerary data | **P1** | data-wiring | `itineraries.cover_image` o similar no poblado / no leído |
| H-04 | Testimonios "El recuerdo" layout plano (sin quote design, sin card framing) | testimonials component | P2 | site-component | `components/site/sections/testimonials-section.tsx` |
| H-05 | "Una persona" teaser — avatares planners no visibles | planners-teaser | P2 | site-component | variante teaser en `planners-section` o nuevo section type |
| H-06 | "Un país escuela" mapa rendering básico (ref tiene mapa interactivo con labels) | map section | P3 | site-component | explore-map refinement |

Score home: **~70%**.

---

### 02 — Packages list (no en ref, pero render local notable)

- **Local:** `screenshots/LOCAL-02b-packages-list-fullpage.png`

Editorial-v1 aplicado. Hero dark + H1 editorial + filter tabs (Lista/Mapa) + grid 3-col cards con imágenes reales. **~90% ok** por sí solo (no hay ref equivalente para comparar).

---

### 03 — Package detail (Cartagena)

- **Ref:** `screenshots/03-package-detail-caribe-esencial-fullpage.png`
- **Local:** `screenshots/LOCAL-03-package-detail-cartagena-fullpage.png`

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| P-01 | Hero sin slider horizontal 5 imgs — solo 1 imagen + título encima (ilegible sobre imagen brillante) | hero gallery | **P1** | product-detail | `components/site/product-detail/p2/hero-gallery.tsx` — ref row #18 |
| P-02 | Chips hero (duración/ubicación/rating/grupo/inclusiones #5-9) parcialmente visibles y mal coloreados | hero chips | **P1** | product-detail | `.../hero-chips.tsx` |
| P-03 | Pricing widget no sticky (ref #16 + #38) — flota al tope | pricing sidebar | **P1** | product-detail | `.../pricing-sidebar.tsx` |
| P-04 | Día-a-día timeline renderiza pero sin variantes visuales por tipo (hotel/actividad/transporte/vuelo) — ref rows #25-29 | itinerary timeline | **P1** | product-detail | `.../day-by-day.tsx` — aplicar variant por `type` |
| P-05 | "Inspirations" grid 3 cards (ref) ausente | inspirations section | P2 | product-detail | nueva sección |
| P-06 | Similares carousel presente ✅ | — | — | — | — |
| P-07 | Mapa ruta renderiza ✅ pero sin marcadores numerados ni líneas conectoras #24 | route-map | P2 | product-detail | `.../route-map.tsx` |
| P-08 | FAQ ✅ | — | — | — | — |
| P-09 | Reviews Google estilo compacto vs ref cards grandes | reviews | P3 | site-component | |

Score package detail: **~55%**.

---

### 04 — Activities list / Experiencias

- **Ref:** `screenshots/04-activities-list-fullpage.png`
- **Local A (legacy):** `screenshots/LOCAL-04-activities-list-fullpage.png` — `/actividades` casi vacío
- **Local B (editorial):** `screenshots/LOCAL-04b-experiencias-fullpage.png` — `/experiencias` editorial 1:1 con ref pero **0 activities**

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| AL-01 | `/actividades` casi vacío (legacy) — navegación dirige a `/actividades` pero editorial-v1 está en `/experiencias` | routing | **P1** | site-routing | `app/site/[subdomain]/actividades/page.tsx` → redirigir o retirar del menú, dejar `/experiencias` canonical |
| AL-02 | `/experiencias` muestra "0 de 0 experiencias — Nada con esos criterios" | activities data filter | **P1** | data-wiring | query en list page excluye pilot-* activities? revisar filtros `status=published`, `product_type='activity'` |
| AL-03 | Filter bar de duración + nivel NO existe en ref (ref solo tiene categorías) | filter bar extra | P3 | site-component | quitar filtros no especificados en ref o mover a "más filtros" |
| AL-04 | Featured card (hero activity prominente del ref) no existe | featured-activity | P2 | site-component | nueva sub-sección en experiencias |
| AL-05 | CTA "Sumá cualquier experiencia a tu paquete" ausente | cta inline | P2 | site-component | |

Score: **~45%** (editorial layout sí, pero sin data es cascarón).

---

### 05 — Activity detail (pilot-colombiatours-act-baseline)

- **Ref:** `screenshots/05-activity-detail-cocora-fullpage.png` (Valle Cocora)
- **Local:** `screenshots/LOCAL-05-activity-detail-pilot-baseline-fullpage.png`

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| AD-01 | Hero chips (duración/ubicación/rating/group/inclusiones #5-9) ausentes | hero chips | **P1** | product-detail | activity variant de `hero-chips.tsx` |
| AD-02 | Programa timeline con horas (6:00 AM / 7:00 / ...) ausente — ref row #23 | schedule timeline | **P1** | product-detail | `.../schedule-timeline.tsx` leer `activities.schedule[]` |
| AD-03 | Tabla "Opciones" (precios por unidad) ausente — ref row #34 | options table | **P1** | product-detail | `.../options-table.tsx` leer `products.options[]` |
| AD-04 | "Punto de encuentro" mapa ausente — ref row #33 | meeting point | **P1** | product-detail | `.../meeting-point-map.tsx` leer `products.meeting_point` |
| AD-05 | "Recomendaciones" / "Qué llevar" 2-col bullets ausente — ref row #21 | recommendations | **P1** | product-detail | `.../recommendations.tsx` leer `products.recommendations` (post-W2) |
| AD-06 | Sticky booking widget sidebar derecha ausente — ref #38 (sin checkout M1-M3) | sticky sidebar | P2 | product-detail | `.../sidebar.tsx` sin trigger booking |
| AD-07 | **Activity parity W2 branching** — `product_type==='activity'` no activa variante completa | routing | **P1** | product-detail | `app/site/[subdomain]/[...slug]/page.tsx` o `product-detail/p2/index.tsx` detectar product_type y ramificar |
| AD-08 | Reviews Google renderizadas pero fuera de contexto (testimonios generales, no del producto) | reviews scope | P2 | data-wiring | `reviews` filter por product-id |
| AD-09 | Similares carousel renderiza pero con data pobre (solo títulos) | similars | P3 | product-detail | |

Score activity detail: **~40%**.

---

### 06 — Planners index

- **Ref:** `screenshots/06-planners-team-fullpage.png`
- **Local:** `screenshots/LOCAL-06-planners-team-fullpage.png`

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| PI-01 | Cards de planners **colapsadas a texto plano** — sin avatar color-block, sin card frame, sin rating ⭐ visible | planner-card | **P1** | site-component | `components/site/sections/planners-section.tsx` → PlannerCard |
| PI-02 | Grid layout falla — cards renderizan como lista vertical sin columnas | grid layout | **P1** | site-component | CSS grid / flex del card container |
| PI-03 | Hero dark + editorial typo ✅ | — | — | — | — |
| PI-04 | Stats copy ✅ pero valores aparecen en texto corrido (no como métrica destacada) | stats inline | P2 | site-component | |
| PI-05 | Filter chips ✅ — pero contador "4" sugiere más planners que los 4 listados (6 en ref) | data count | P2 | data-wiring | query planners |
| PI-06 | CTA "planner bot" como prosa, no como card destacada verde con ícono | cta card | P2 | site-component | |

Score: **~50%**.

---

### 07 — Blog Historias

- **Ref:** `screenshots/07-blog-historias-fullpage.png`
- **Local:** `screenshots/LOCAL-07-blog-historias-fullpage.png`

**Mejor match de todas las pantallas.**

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| BL-01 | Hero editorial "Historias desde adentro" ✅ con serif italic ✅ | — | — | — | — |
| BL-02 | Feature post card dark ✅ con gradient + CTA "Leer artículo" | — | — | — | — |
| BL-03 | Filter chips (Todo / Colombia / Destinos / Experiencias / Guías / Práctica / Sobre Nosotros) + search ✅ | — | — | — | — |
| BL-04 | Grid 3-col con imágenes reales + tags colored ✅ | — | — | — | — |
| BL-05 | Newsletter signup footer ✅ | — | — | — | — |
| BL-06 | Hreflang + JSON-LD `inLanguage` (P.3/P.4) | — | — | pending | validar con SEO tests W5 |
| BL-07 | Featured image de último card (más abajo) sin imagen real — falta upload | data | P3 | data-wiring | `website_blog_posts.featured_image` |

Score blog: **~92%** (casi paridad total).

---

### 08 — Planner detail (Leidy)

- **Ref:** `screenshots/08-planner-detail-andres-fullpage.png`
- **Local:** `screenshots/LOCAL-08-planner-detail-leidy-fullpage.png`

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| PD-01 | Hero avatar circular ✅ | — | — | — | — |
| PD-02 | Stats `— viajes / — rating / — años / 1 idiomas` **vacías** — ref muestra `243 / 4.97 / 2 idiomas` | planner stats data | **P1** | data-wiring | tabla `planners` campos `trips_count`, `rating_avg`, `years_experience`, `languages` |
| PD-03 | Chips especialidades ausentes (ref: "Eje Cafetero + Andes · Salento, Armenia") | planner chips | **P1** | site-component | `components/site/sections/planner-detail/chips.tsx` |
| PD-04 | "Lo que hace diferente" sección con 4 pills ausente | specialties grid | **P1** | site-component | nueva sub-sección |
| PD-05 | "Viaje firma" card destacada (con mapa/imagen) ausente | signature-trip | **P1** | site-component | query planner.featured_package |
| PD-06 | "Otros paquetes que arma" grid 3 cards ausente | planner-packages | **P1** | data-wiring | query `package_kits` WHERE planner_id=X |
| PD-07 | "Detalles personales" 3 mini-cards ausente | personal-details | P2 | site-component | |
| PD-08 | Reviews grandes renderizadas ✅ pero fuera de orden (bajo texto about) | reviews layout | P2 | site-component | |
| PD-09 | "Otros planners" como lista vertical (ref: grid 3 avatares card) | other-planners grid | P2 | site-component | |

Score: **~35%** (componentes críticos faltantes).

---

### 09 — Modal planner chat (WhatsApp Flow)

- **Ref:** `screenshots/09-modal-planner-chat.png`
- **Local:** `screenshots/LOCAL-09-modal-planner-chat.png`

| # | Gap | Area | Severity | Owner | Fix path |
|---|---|---|:---:|---|---|
| WF-01 | Modal **slide-in derecha** (drawer) vs ref **centered modal** | modal layout | P2 | waflow | `components/site/themes/editorial-v1/waflow/modal.tsx` — cambiar variant |
| WF-02 | Flow **paso-a-paso** (destino → continuar → timing → ...) vs ref **form único** con todos los campos | wizard UX | P3 | waflow | decisión UX: step vs single — ambas válidas, ref single da vista completa |
| WF-03 | Header gradient dark ✅ | — | — | — | — |
| WF-04 | Eyebrow "PLANNERS EN LÍNEA AHORA" + dot verde ✅ | — | — | — | — |
| WF-05 | Title "Cuéntanos qué sueñas." serif italic ✅ | — | — | — | — |
| WF-06 | Subtitle "WhatsApp con planner humano. 3 min respuesta" ✅ | — | — | — | — |
| WF-07 | Destino chips ✅ | — | — | — | — |
| WF-08 | Timing chips (Este mes / 2-3 meses / ...) — visible solo en paso 2 (validación pendiente) | wizard step | — | — | — |
| WF-09 | Counter adultos/niños — visible solo en paso 3 | wizard step | — | — | — |
| WF-10 | Interés chips max-3 — visible solo en paso 4 | wizard step | — | — | — |
| WF-11 | CTA verde "Continuar" ✅ (texto "Continuar en WhatsApp" aparece al final según UX step) | — | — | — | — |
| WF-12 | Status bar "Planners en línea — ~3 min" ✅ | — | — | — | — |
| WF-13 | Link "Prefiero contarlo en el chat →" ✅ | — | — | — | — |

Score waflow: **~85%** (UX diferente pero todos los elementos presentes).

---

## Priority board — Top P1 (bloquean sign-off pilot)

| # | Gap | Pantalla | Fix path principal |
|---|---|---|---|
| 1 | Activity detail: chips hero + programa timeline + options table + meeting point + recomendaciones | 05 | `components/site/product-detail/p2/` — activity variant branch |
| 2 | Planner detail: stats vacías + chips especialidades + "Lo que hace diferente" + viaje firma + otros paquetes | 08 | `components/site/sections/planner-detail/` (varios) + data wiring |
| 3 | Planners index: cards colapsadas a texto (sin card frame / avatar) | 06 | `components/site/sections/planners-section.tsx::PlannerCard` |
| 4 | Package detail: hero slider galería + chips hero + pricing sticky + itinerary variants por tipo | 03 | `components/site/product-detail/p2/` |
| 5 | Home stats `0/0/0/0` — data wiring | 01 | `components/site/sections/stats-section.tsx` |
| 6 | Home "Ocho Colombias" + "Itinerarios" sin imágenes | 01 | `websites.content.destinations[].image` + `itineraries.cover_image` |
| 7 | `/experiencias` = 0 activities — filtro query | 04 | `app/site/[subdomain]/experiencias/page.tsx` — query review |
| 8 | Routing: `/actividades` vs `/experiencias` — unificar canonical | 04 | retirar legacy del menú o redirigir |
| 9 | Build bug fix layout.tsx — **APLICADO** ✅ | global | `app/site/[subdomain]/layout.tsx:181` |

---

## Priority board — Top P2 (polish)

| # | Gap | Pantalla |
|---|---|---|
| 1 | Home testimonios "El recuerdo" layout plano | 01 |
| 2 | Package detail "Inspirations" grid + Reviews cards grandes | 03 |
| 3 | Activity detail sticky booking sidebar | 05 |
| 4 | Planner detail "Detalles personales" + "Otros planners" grid | 08 |
| 5 | Waflow modal layout (drawer vs centered) | 09 |

---

## Decisiones recomendadas

**Aceptadas por usuario (2026-04-21):** migraciones + aprobaciones si lo recomendamos.

1. **Unificar rutas actividades:** retirar `/actividades` del menú y redirigir 301 → `/experiencias` (editorial-v1 canonical). Evita confusión. → Edit: `lib/supabase/get-pages.ts` navigation builder + `app/site/[subdomain]/actividades/page.tsx` redirect.

2. **Activity parity W2 (commit `d1c1241`):** correr spec `e2e/tests/pilot/editor-render/activity-parity.spec.ts` para confirmar que W2 RPC está operacional end-to-end. Sin esto, editores activities no escriben.

3. **Stats dinámicos home:** migrar `stats-section` a leer desde DB (tabla `website_stats` o campo `websites.content.stats` agregado). Fallback a valores default del tema si data ausente (en vez de 0). → nueva migration si la fuente no existe.

4. **Planners data backfill:** tabla `planners` requiere campos `trips_count, rating_avg, years_experience, languages, specialties, signature_package_id`. Si no existen → migration ADD COLUMN + backfill desde data real (Flutter admin).

5. **Home destinations/itineraries imágenes:** revisar Supabase Storage bucket `destinations/` + verificar que `websites.content.destinations[].image` apunta a URLs válidas. Si hay placeholder defaults no deberían llegar a prod.

6. **`experiencias` query debug:** `/experiencias` devuelve 0 de 0 aunque hay 10+ activities. Revisar filtro en `app/site/[subdomain]/experiencias/page.tsx` — probablemente `status='published'` pero pilot-* seeded están draft/review.

---

## Próximos pasos (ejecutar en orden)

1. ✅ Screenshots ref (01-09) en `screenshots/` + renombrado semántico.
2. ✅ `PARITY-METHODOLOGY.md` publicado.
3. ✅ Build fix `layout.tsx` — `<WebsiteLocaleProvider>` wrapper restaurado + `initialTheme` pre-resuelto.
4. ✅ Capturas locales 10/10 via session s3.
5. ✅ Audit gaps por pantalla (este doc).
6. ⬜ Abrir issues GitHub label `pilot-parity` para top 9 P1 (uno por gap cluster).
7. ⬜ Correr W6 specs + Lighthouse gate: `npm run session:run -- e2e/tests/pilot/matrix/`.
8. ⬜ Fixes P1 uno por uno con re-captura lado a lado para verificar.
9. ⬜ Re-cálculo `parity_score` tras cada cluster P1 cerrado.
10. ⬜ Release session pool: `bash scripts/session-release.sh s3` cuando termines iteraciones.

---

## Cross-refs

- [`PARITY-METHODOLOGY.md`](./PARITY-METHODOLOGY.md)
- [`docs/product/product-detail-matrix.md`](../../../docs/product/product-detail-matrix.md) — 48 rows SSOT
- [`docs/development/local-sessions.md`](../../../docs/development/local-sessions.md) — session pool rules
- [`docs/qa/pilot/matrix-playbook.md`](../../../docs/qa/pilot/matrix-playbook.md) — W6 specs runbook
- EPIC #250 Designer Reference Theme · EPIC #214 Pilot readiness
- ADR-024 booking DEFER · ADR-025 Studio/Flutter ownership · ADR-027 theme_designer_v1 rollout
