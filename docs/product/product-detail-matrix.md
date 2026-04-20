# Matriz de Inventario — Detalle de Producto

**Actualizado:** 2026-04-19
**Verificado contra commit:** `90f2303` (docs(deps) priority v2 logged — EPIC #214)
**Aplica a:** landing de Actividad/Servicio + landing de Paquete + landing de Hotel + detalle de Blog (Sección P)
**Propósito:** vista de diseño de producto (no dev). Lista cada pieza de información que aparece en la página pública, de dónde viene, cómo se llena, qué componente la muestra y en qué landing aparece.
**Ver también:** [[package-detail-anatomy]] · [[product-detail-inventory]] · [[pilot-readiness-deps]] · [[ADR-024]] · [[ADR-025]]

> **Priority v2 aplicada (2026-04-19)** — este matrix refleja las decisiones del cliente documentadas en EPIC #214 [#issuecomment-4276233308](https://github.com/weppa-cloud/bukeer-studio/issues/214#issuecomment-4276233308):
> - **Packages + Activities = editables en Studio (Rol 2)** bajo `studio_editor_v2` (🟨 / 🟡-flag en columnas `Pkg` y `Act`). La paridad Act depende de W2 `update_activity_marketing_field` RPC + branching por `product_type` en el dashboard.
> - **Hotels = as-is (Flutter-owner)** para marketing/contenido. SEO meta sí editable vía SEO item detail. Política pilot confirmada 2026-04-19 (ver leyenda al pie).
> - **Booking V1 = DEFER post-pilot** (Sección M). ADR-024 Accepted (DEFER).
> - **Blog transcreate scope = Sección P** (nueva) para W5 + W6.

---

## Cómo leer esta matriz

**Columnas:**
- **#** — número de ítem (numeración canónica 1–48 — no renumerar)
- **Información** — qué es (lenguaje común, no técnico)
- **Origen** — de dónde viene el dato
- **Generación** — cómo se llena (quién lo escribe o cómo se calcula)
- **Act** — aparece en landing de Actividad/Servicio + ownership de edición
- **Pkg** — aparece en landing de Paquete + ownership de edición
- **Hotel** — aparece en landing de Hotel + ownership de edición (columna añadida 2026-04-19)
- **Artefacto visual** — cómo se ve en la página
- **Estado** — operativa / con observación

**Códigos de generación:**

| Código | Qué significa |
|--------|---------------|
| 🟦 **Manual (Flutter)** | Operador escribe en Bukeer Flutter (catálogo de productos) |
| 🟨 **Manual (Studio)** | Operador escribe en Bukeer Studio (personalización de página) — no flag-gated |
| 🟡-flag **Manual (Studio) — flag-gated** | Studio-editable cuando `studio_editor_v2` activo (flag account/website-scoped; default off). Distinto de 🟡 "sin data". |
| 🟪 **Auto — IA** | IA lo genera (ruta F3 `#174` — solo paquetes) |
| 🟫 **Auto — Agregación** | Se calcula desde productos hijos (F1 RPC `#172` — solo paquetes) |
| 🟥 **Auto — Computado** | Se deriva en el momento de render (regex, cálculos, geocoding) |
| 🟩 **Auto — Google** | Fetch desde Google Places API |
| ⬛ **Hardcoded** | Texto estático en código — fallback |

**Estado:**

| Código | Qué significa |
|--------|---------------|
| ✅ | Operativa, con data habitual |
| ⚠️ | Funciona pero frágil / requiere atención |
| 🟡 | Existe pero suele quedar vacía — revisar hygiene |
| 🚫 | Schema existe, falta editor o trigger (o política DEFER/as-is) |

**Ownership por columna (política pilot 2026-04-19):**

- **Act** — Packages + Activities bumped a paridad editable vs Pkg bajo `studio_editor_v2` (ver [[ADR-025]]). Act parity = pendiente W2 (`update_activity_marketing_field` RPC + dashboard branching por `product_type`) para celdas marcadas 🟡-flag con nota "Act parity via W2".
- **Pkg** — Studio-editable hoy (7 marketing editors + 6 page-customization editors) bajo `studio_editor_v2`. Ver Sección N.
- **Hotel** — **As-is Flutter-owner** para marketing/contenido. Política pilot confirmada 2026-04-19 (client meeting). Hotels retienen edición Flutter-only. **SEO meta editable vía SEO item detail surface** (no via Studio marketing editor). Ver Sección O.

---

## Matriz principal — Campos e información

### A. Cabecera (Hero)

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 1 | Imagen de portada | `products.image` → galería[0] | 🟦 Manual (Flutter) | ✅ | ✅ | ✅ (Flutter) | Imagen a ancho completo, 70vh, gradiente inferior | ✅ |
| 2 | Título del producto | `product_page_customizations.custom_hero.title` → `products.name` | 🟡-flag Manual (Studio) → 🟦 Manual (Flutter) | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | H1 grande 4xl/5xl, blanco sobre hero | ✅ (editor `HeroOverrideEditor`) |
| 3 | Subtítulo de ubicación | `custom_hero.subtitle` → `products.location` → `city + country` | 🟡-flag Manual (Studio) → 🟦 → 🟥 Computado | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Texto secundario bajo H1 | ✅ (editor `HeroOverrideEditor`) |
| 4 | Categoría (etiqueta) | hardcoded por `productType` | ⬛ | ✅ | ✅ | ✅ | Letra pequeña monospace encima del H1 ("ACTIVIDADES", "PAQUETES", "HOTELES") | ✅ |
| 5 | Chip duración | `products.duration` (Act) / `duration_days + duration_nights` (Pkg) | 🟦 Manual (Flutter) | ✅ | ✅ | n/a | Píldora con ícono de reloj | ✅ |
| 6 | Chip ubicación | `products.location` | 🟦 Manual (Flutter) | ✅ | ❌ | ✅ | Píldora con ícono de pin | ✅ |
| 7 | Chip rating | `products.user_rating` → promedio reviews Google | 🟦 → 🟩 Auto Google | ✅ | ✅ | ✅ | Píldora con ★ y valor | ✅ |
| 8 | Chip tamaño de grupo | regex sobre `name + description` | 🟥 Auto — Computado | ❌ | ✅ | n/a | Píldora — ej. "10-15 pax" | ⚠️ *frágil sin campo explícito* |
| 9 | Chips inclusiones destacadas | regex sobre `inclusions` | 🟥 Auto — Computado | ✅ | ❌ | n/a | Hasta 3 píldoras con ✓ verde | ✅ |
| 10 | Estrellas (hotel) | `hotels.star_rating` | 🟦 Manual (Flutter) | ❌ | ❌ | ✅ (Flutter) | Ícono ★ repetido (1–5) | ✅ |
| 11 | Precio "Desde" | min de `products.options[].prices` → `products.price` | 🟥 Computado → 🟦 Manual (Flutter) | ✅ | ✅ | ✅ | Píldora semibold con "Desde $X" | ✅ |
| 12 | Botón WhatsApp | `websites.content.whatsapp` | 🟦 Manual (Flutter) | ✅ | ✅ | ✅ | Botón verde oscuro | ✅ |
| 13 | Botón Teléfono | `websites.content.phone` | 🟦 Manual (Flutter) | ✅ | ✅ | ✅ | Botón secundario | ✅ |
| 14 | **Botón "Ver video"** ([[#165]]) | `products.video_url` | 🟡-flag Manual (Studio) → 🟦 (Flutter) | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Píldora con ícono ▶ — abre lightbox | ✅ (editor `VideoUrlEditor`) |

### B. Navegación / Ruta

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 15 | Miga de pan | derivada de `productType + name` | 🟥 Auto — Computado | ✅ | ✅ | ✅ | Texto horizontal con `/` separadores | ✅ |
| 16 | Sticky CTA (tras scroll) | mismo precio + CTAs del hero | reutiliza fuentes existentes | ✅ | ✅ | ✅ | Barra fija inferior aparece tras 200px scroll | ✅ |

### C. Contenido principal

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 17 | Grid de highlights | `custom_highlights` → **`program_highlights`** (IA) → `highlights` (legacy) | 🟡-flag Manual (Studio) → 🟪 Auto — IA → 🟦 Manual | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Grid 2×3 de cards con ícono | ✅ (editor `HighlightsEditor`) |
| 18 | Galería | **`program_gallery`** (F1) → `photos` → `images` → `image` | 🟡-flag Manual (Studio — curator) → 🟫 Auto — Agregación (Pkg) → 🟦 Manual | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | 1 principal + 4 miniaturas → abre lightbox con navegación | ✅ (editor `GalleryCurator`) |
| 19 | Descripción larga | `products.description` → **IA (si `description_ai_generated=true`)** | 🟡-flag Manual (Studio) → 🟦 Manual → 🟪 Auto — IA (Pkg) | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Prose ~4 columnas, ~80 líneas máx | ✅ (editor `DescriptionEditor`) |
| 20 | Video modal | `products.video_url` — procesado por `parseVideoMeta` | 🟡-flag Manual (Studio) → 🟦 Manual (Flutter) | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Lightbox fullscreen con iframe YouTube/Vimeo/MP4 lazy-loaded | ✅ (editor `VideoUrlEditor`) |

### D. Sección activity-specific

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 21 | Recomendaciones | `products.recommendations` (split por línea/coma) | 🟡-flag Manual (Studio) → 🟦 Manual (Flutter) | 🟨 (W2) | n/a | n/a | Lista con viñetas pequeñas | ✅ (editor `RecommendationsEditor`) |
| 22 | Tarifa base | min opción / `products.price` | 🟥 Computado | ✅ | ❌ | n/a | Panel "Desde $X" | ✅ |
| 23 | Programa (timeline) | `products.schedule[]` (ScheduleEntry) | 🟦 Manual (Flutter) | ✅ | n/a (excluido) | n/a | Timeline vertical con hora + título + descripción + imagen | ✅ |

### E. Sección package-specific

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 24 | Mapa de la ruta del paquete | `itinerary_items[].destination` + `city-coords` (17 ciudades CO) | 🟥 Auto — Computado + Geo | n/a | ✅ | n/a | Mapa interactivo con marcadores numerados + líneas conectoras | ⚠️ límite 17 ciudades |
| 25 | Día a día | `itinerary_items[]` renderizados por tipo | 🟦 Manual (itinerario en Flutter) | n/a | ✅ | n/a | Lista con badge "Día N" + variante por tipo (hotel/actividad/transporte/vuelo) | ✅ |
| 26 | Día (hotel) | `hotels.star_rating + amenities` | 🟦 Manual (Flutter) | n/a | ✅ (render) | ✅ (source) | Estrellas + hasta 6 amenity badges + link al hotel | ✅ |
| 27 | Día (actividad) | `activities.schedule_data` | 🟦 Manual (Flutter) | n/a | ✅ | n/a | Título + descripción + acordeón expandible con primeros 5 steps | ✅ |
| 28 | Día (transporte) | `transfers.from_location + to_location + duration` | 🟦 Manual (Flutter) | n/a | ✅ | n/a | Texto "{origen} → {destino} · {duración}" | ✅ |
| 29 | Día (vuelo) | `flights.carrier + flight_number + departure + arrival` | 🟦 Manual (Flutter) | n/a | ✅ | n/a | Texto "{aerolínea} {vuelo} · {sale} → {llega}" | ✅ |

### F. Inclusiones / exclusiones

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 30 | Qué incluye | **`program_inclusions`** (F1) → `inclusions` → hardcoded | 🟡-flag Manual (Studio) → 🟫 Auto — Agregación (Pkg) → 🟦 → ⬛ | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Grid 2 columnas con ✓ verde | ✅ (editor `InclusionsExclusionsEditor`) |
| 31 | Qué no incluye | **`program_exclusions`** (F1) → `exclusions` → hardcoded | 🟡-flag Manual (Studio) → 🟫 → 🟦 → ⬛ | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | Grid 2 columnas con ✗ rojo | ✅ (editor `InclusionsExclusionsEditor`) |

### G. Mapa / ubicación

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 32 | Circuito multi-stop de actividad | `schedule[].title + description` + geocoding | 🟥 Auto — Computado + Geo | ✅ | n/a | n/a | Mapa interactivo con ≥2 paradas | ✅ |
| 33 | Punto de encuentro | `products.meeting_point` (address, lat/lng) | 🟦 Manual (Flutter) | ✅ (si <2 stops) | ✅ (si no hay circuito) | ✅ (opcional) | Mapa estático con pin + dirección | ✅ |

### H. Precios / opciones

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 34 | Tabla de opciones | `products.options[]` (ActivityOption) | 🟦 Manual (Flutter) | ✅ (principal) | raro | n/a | Tabla con nombre, tipo unidad, min/max pax, precios multi-moneda | ✅ (Act) / ⚠️ G5 (Pkg) |

### I. Conversión / confianza

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 35 | Preguntas frecuentes (FAQ) | `custom_faq` (Studio) → defaults hardcoded | 🟨 Manual (Studio) → ⬛ | ✅ | ✅ | 🚫 as-is Flutter-owner | Acordeón de preguntas | ✅ |
| 36 | Trust badges | `websites.content.trust` (TrustContent schema) | 🟦 Manual (Flutter) | ✅ | ✅ | ✅ | Grid de badges — RNT, años, viajeros, certificaciones | ✅ |
| 37 | **Reviews de Google** | Google Places API (gated por `account.google_reviews_enabled`) | 🟩 Auto — Google | ✅ | ✅ | ✅ | Grid de cards con foto + nombre + ★ + texto + respuesta | ✅ |

### J. Sidebar (desktop)

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 38 | Resumen lateral | espejo de hero (rating, ubicación, duración, precio, CTAs) | reutiliza fuentes existentes | ✅ | ✅ | ✅ | Card sticky en columna derecha | ✅ |

### K. Cierre

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 39 | CTA final | texto estático + `website.content.whatsapp + phone` | ⬛ + 🟦 Manual | ✅ | ✅ | ✅ | Sección centrada "¿Listo para vivir esta experiencia?" + botones | ✅ |
| 40 | Similares (carousel) | query SSR: mismo `location` → top 3 del account | 🟥 Auto — Computado | ✅ | ✅ | ✅ | Carousel horizontal de 3 cards | ✅ |

### L. SEO / metadata (invisible al usuario, sí al buscador)

> **Nota Hotel columna (política pilot v2 2026-04-19):** En hoteles, marketing/contenido (rows #2, #3, #14, #17, #18, #19, #20, #21, #30, #31, #35) = 🚫 **as-is Flutter-owner**. **SEO meta (rows #41, #42, #48) sí editable vía SEO item detail surface** — excepción al as-is.

| # | Información | Origen | Generación | Act | Pkg | Hotel | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|:-----:|------------------|:------:|
| 41 | Título SEO (`<title>`) | `custom_seo_title` → auto `{name} - {type} en {location}` | 🟨 Manual (Studio) → 🟥 | ✅ | ✅ | ✅ (via SEO item detail) | — (head de HTML) | ✅ |
| 42 | Meta description | `custom_seo_description` → `products.description` truncada | 🟨 → 🟦 | ✅ | ✅ | ✅ (via SEO item detail) | — (head de HTML) | ✅ |
| 43 | Open Graph image | `products.social_image` → `image` → `photos[0]` | 🟡-flag Manual (Studio) → 🟦 Manual (Flutter) | 🟨 (W2) | 🟨 | 🚫 as-is Flutter-owner | — (og:image) | ✅ (editor `SocialImagePicker`) |
| 44 | JSON-LD Product schema | derivado de `products.*` | 🟥 Auto — Computado | ✅ | ✅ | ✅ | — (inline `<script>`) | ✅ |
| 45 | JSON-LD Breadcrumb | derivado del path | 🟥 Auto — Computado | ✅ | ✅ | ✅ | — | ✅ |
| 46 | JSON-LD FAQ | derivado de `custom_faq` | 🟥 Auto — Computado | ✅ | ✅ | n/a | — | ✅ |
| 47 | **JSON-LD VideoObject** ([[#165]]) | derivado de `video_url + video_caption` | 🟥 Auto — Computado | ✅ | ✅ | 🚫 as-is Flutter-owner | — | ✅ |
| 48 | Robots noindex | `custom_page.robots_noindex` | 🟨 Manual (Studio) | ✅ | ✅ | ✅ (via SEO item detail) | — (meta robots) | ✅ |

---

## M. Booking / Conversion checkout

**Estado:** 🚫 **Deferred post-pilot** — W3 DEFER confirmado 2026-04-19. Ver [[ADR-024]] Accepted (DEFER). Pilot site sale con WhatsApp + teléfono únicamente; el wire de componentes a `ProductLandingPage` queda cancelado para pilot.

| # | Componente | Path | Act | Pkg | Hotel | Estado |
|---|-----------|------|:---:|:---:|:-----:|:------:|
| M1 | `BookingTrigger` | `components/site/booking/booking-trigger.tsx` | 🚫 | 🚫 | 🚫 | 🚫 deferred post-pilot (W3 DEFER 2026-04-19) — [[ADR-024]] |
| M2 | `DatePicker` (aka `BookingDatePicker` en drafts de specs) | `components/site/booking/date-picker.tsx` | 🚫 | 🚫 | 🚫 | 🚫 deferred post-pilot (W3 DEFER 2026-04-19) — [[ADR-024]] |
| M3 | `CalBookingCTA` | `components/site/cal-booking-cta.tsx` | 🚫 | 🚫 | 🚫 | 🚫 deferred post-pilot (W3 DEFER 2026-04-19) — [[ADR-024]] |

**Cross-refs:** #166, #169, #170, W3 #217 (DEFER). Follow-up tracked como candidato post-pilot per [[ADR-024]]. No wire a `ProductLandingPage` en pilot.

---

## N. Editabilidad Studio — mapping editor → campo

**Nota paridad Act:** las celdas Act marcadas 🟡-flag en la matriz dependen de W2 (`update_activity_marketing_field` RPC + branching por `product_type` en `app/dashboard/[websiteId]/products/[slug]/{marketing,content}/page.tsx`). Hasta que W2 cierre, estos editores responden solo a Pkg.

### N.1 Marketing editors (flag `studio_editor_v2`)

| Editor component | Path | Filas matriz | Pkg (hoy) | Act (post-W2) | Hotel |
|------------------|------|-------------|:---------:|:-------------:|:-----:|
| `DescriptionEditor` | `components/admin/marketing/description-editor.tsx` | #19 | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `HighlightsEditor` | `components/admin/marketing/highlights-editor.tsx` | #17 | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `InclusionsExclusionsEditor` | `components/admin/marketing/inclusions-exclusions-editor.tsx` | #30, #31 | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `RecommendationsEditor` | `components/admin/marketing/recommendations-editor.tsx` | #21 | n/a | 🟡-flag (W2) | 🚫 as-is |
| `InstructionsEditor` | `components/admin/marketing/instructions-editor.tsx` | (instrucciones post-reserva — no-render pilot) | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `SocialImagePicker` | `components/admin/marketing/social-image-picker.tsx` | #43 | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `GalleryCurator` | `components/admin/marketing/gallery-curator.tsx` | #18 | 🟨 | 🟡-flag (W2) | 🚫 as-is |

### N.2 Page-customization editors (flag `studio_editor_v2`)

| Editor component | Path | Filas matriz | Pkg (hoy) | Act (post-W2) | Hotel |
|------------------|------|-------------|:---------:|:-------------:|:-----:|
| `HeroOverrideEditor` | `components/admin/page-customization/hero-override-editor.tsx` | #2, #3 (+ `custom_hero.backgroundImage`) | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `VideoUrlEditor` | `components/admin/page-customization/video-url-editor.tsx` | #14, #20, #47 | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `SectionVisibilityToggle` | `components/admin/page-customization/section-visibility-toggle.tsx` | `hidden_sections[]` | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `SectionsReorderEditor` | `components/admin/page-customization/sections-reorder-editor.tsx` | `sections_order[]` | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `CustomSectionsEditor` | `components/admin/page-customization/custom-sections-editor.tsx` | `custom_sections[]` | 🟨 | 🟡-flag (W2) | 🚫 as-is |
| `AiFlagsPanel` (ops) | `components/admin/ops/*` (flag governance) | `description_ai_generated`, `highlights_ai_generated` | 🟨 | 🟡-flag (W2) | n/a |

### N.3 Route paths (dashboard editor surfaces)

| Path | Descripción | Nota paridad |
|------|-------------|--------------|
| `app/dashboard/[websiteId]/products/[slug]/marketing/page.tsx` | Marketing editors (N.1) | Pre-W2 → solo packages; post-W2 → detecta `product_type` y ramifica (`package_kits` vs `activities`) |
| `app/dashboard/[websiteId]/products/[slug]/content/page.tsx` | Page-customization editors (N.2) | Pre-W2 → solo packages; post-W2 → detecta `product_type` y ramifica |
| `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx` | SEO item detail surface (rows #41, #42, #48) | Cubre Pkg + Act + Hotel (excepción Hotel as-is para marketing) |

### N.4 W4 #218 editor→render E2E specs

EPIC #214 W4 #218 exercises the full editor→DB→ISR→public loop against the `pilot-colombiatours-*` seed. Specs live under `e2e/tests/pilot/editor-render/`, tagged `@pilot-w4`:

| Spec | Editor → testid | Target (public) |
|------|-----------------|-----------------|
| `hero-override.spec.ts` | `HeroOverrideEditor` → `section[aria-label="Personalización del hero"]` | `[data-testid="detail-hero"]` |
| `marketing-body.spec.ts` | `DescriptionEditor` / `HighlightsEditor` → `marketing-editor-description` / `-highlights` | `[data-testid="detail-description"]` / `[data-testid="detail-highlights"]` |
| `video-url.spec.ts` | `VideoUrlEditor` → `section[aria-label="Video del producto"]` | `<iframe>` + `VideoObject` JSON-LD (skip until #234 RPC ships) |
| `sections-layout.spec.ts` | `SectionsReorderEditor` + `SectionVisibilityToggle` | overlay `sections_order` / `hidden_sections` honored by renderer |
| `custom-sections.spec.ts` | `CustomSectionsEditor` | overlay `custom_sections[]` persisted + revalidate fan-out |
| `activity-parity.spec.ts` | `DescriptionEditor` (activity variant) | `[data-testid="detail-description"]` on `/actividades/<slug>` |

Seed factory: `e2e/setup/pilot-seed.ts::seedPilot(variant)` with variants `baseline` | `translation-ready` | `empty-state` | `missing-locale`. Runbook: `docs/qa/pilot/editor-to-render-playbook.md`.

---

## O. Gaps Flutter-only (razón documentada)

Campos que **retienen** Flutter-owner status (no entran a Studio editor). Razón: catalog ownership vive en `weppa-cloud/bukeer-flutter` (ver [[cross-repo-flutter]]). Flag `studio_editor_v2` default off (ver `lib/features/studio-editor-v2.ts` + `account_feature_flags`).

| Campo / Ítem | Tabla | Razón | Owner | Nota política pilot |
|--------------|-------|-------|-------|---------------------|
| `duration`, `duration_days`, `duration_nights` | `products` / `package_kits` | Catálogo canónico (Flutter admin) | Flutter | — |
| `location`, `city`, `country` | `products` | Catálogo canónico | Flutter | — |
| `user_rating` | `products` | Usualmente sync Google Places (no edita el partner) | Flutter | — |
| `schedule[]` | `activities` / `products` | Programa de actividad — Flutter itinerary editor | Flutter | — |
| `meeting_point` | `products` | Map picker Flutter | Flutter | — |
| `options[]` (ActivityOption) | `products` | Pricing panel Flutter | Flutter | — |
| `itinerary_items[].*` | `itinerary_items` | Itinerary editor Flutter (día a día) | Flutter | — |
| `hotels.star_rating` | `hotels` (row #10) | Hotel editor Flutter | Flutter | ✅ renderiza, Flutter-only |
| `hotels.amenities` | `hotels` (row #26) | Hotel editor Flutter | Flutter | ✅ renderiza, Flutter-only |
| Hotel marketing/contenido (rows #2, #3, #14, #17-21, #30, #31, #35, #43, #47) | `hotels` + `product_page_customizations` | **As-is Flutter-owner — pilot policy confirmada 2026-04-19 (client meeting)**. Hotels retienen Flutter-only editing para marketing/contenido. SEO meta editable vía SEO item detail surface (rows #41, #42, #48). | Flutter | 🚫 ver política pilot. Re-scope = post-pilot. |
| `products.video_url`, `products.video_caption` ([[#165]]) | `products` | Flutter UI pendiente (spec open) | Flutter | Studio lee; write via Flutter |
| `package_kits.description_ai_generated` | `package_kits` ([[#174]]) | Flag controla si AI sobreescribe | Flutter | (Studio ops panel via `AiFlagsPanel`) |
| `package_kits.highlights_ai_generated` | `package_kits` ([[#174]]) | Flag controla si AI sobreescribe | Flutter | (Studio ops panel via `AiFlagsPanel`) |
| `package_kits.last_ai_hash` | `package_kits` ([[#174]]) | Dedup control — no editable | auto | — |

---

## P. Blog transcreate scope (NEW 2026-04-19 — priority v2)

**Contexto:** sección añadida para cubrir el surface de blog consumido por W5 (transcreate) + W6 (matrix visual E2E). Distinta del detalle de producto: blog vive en tabla `website_blog_posts` y renderiza en `/blog/{slug}` + `/{locale}/blog/{slug}`.

### P.1 Campos translatables (`website_blog_posts`)

| # | Campo DB | Tipo | Traducible | Notas |
|---|----------|------|:----------:|-------|
| P1 | `title` | text | ✅ | Render: `<h1>` principal |
| P2 | `slug` | text | ✅ | URL; localizado per-locale. Debe permanecer URL-safe y único por `website_id + locale` |
| P3 | `excerpt` | text | ✅ | Render: meta description fallback + card preview |
| P4 | `content` | text (HTML sanitizado via `SafeHtml`) | ✅ | Render: `blog-prose`. Columna real = `content` (no `body`) |
| P5 | `seo_title` | text | ✅ | Render: `<title>` (prioridad 1 sobre `title`) |
| P6 | `seo_description` | text | ✅ | Render: meta description (prioridad 1 sobre `excerpt`) |
| P7 | `seo_keywords` | text[] | ✅ | Render: meta keywords |
| P8 | `featured_image` / `featured_alt` | text / text | parcial | Imagen = no traducible (binaria); `featured_alt` text = traducible |
| P9 | `faq_items[]` | jsonb | ✅ | V2 SEO pipeline — FAQ estructurado |
| P10 | `locale` | text | — | Clave que identifica el variant (no traducible en sí, pero define el grupo) |
| P11 | `canonical_post_id` | uuid | — | Referencia al post original (source-of-truth) |

Campos **no traducibles**: `id`, `website_id`, `category_id`, `status`, `published_at`, `updated_at`, `ai_generated`, `ai_model`, `content_version`, `word_count`, `reading_time_minutes`, `content_structure`, `last_refreshed_at`, `author_name`, `author_avatar`.

### P.2 Render path

| Locale | URL pattern | Nota |
|--------|-------------|------|
| Default (es-CO) | `/blog/{slug}` (path-prefix omitido — [[ADR-019]]) | Canonical para default locale |
| Traducido (e.g. `en-US`) | `/en/blog/{slug}` | path-prefix `/{localePrefix}` per [[ADR-019]] |
| x-default | → canónica del default locale | Per [[ADR-020]] |

Entry point: `app/site/[subdomain]/blog/[slug]/page.tsx` (detecta locale via `resolvePublicMetadataLocale` + `localeToOgLocale`).

### P.3 hreflang rules

Cada variant traducido emite:

- `<link rel="alternate" hreflang="<locale>" href="...">` para **cada** locale publicado del post (incluye el propio variant).
- `<link rel="alternate" hreflang="x-default" href="...">` apuntando al default locale variant.
- `<link rel="canonical" href="...">` apuntando al **locale actual** (auto-canonical, no cross-locale).

Gate: solo emite hreflang para variants en estado `applied | published` ([[ADR-020]]).
Impl: `buildLocaleAwareAlternateLanguages(baseUrl, blogPath, localeContext)` en `lib/seo/public-metadata.ts`.

### P.4 JSON-LD `inLanguage`

- `Article` / `BlogPosting` JSON-LD emite `inLanguage` derivado del locale **resuelto** (`localeContext.resolvedLocale`), no hardcoded `'es'`.
- Cross-ref SEO gap #1 en [[cross-repo-flutter]]: `inLanguage` hardcoded a `'es'` pendiente en keyword persistence; blog detail **ya** lee del locale correcto.

### P.5 Editor ownership

| Acción | Owner | Superficie |
|--------|:-----:|-----------|
| Crear post original (es-CO) | Flutter | Flutter admin → DB `website_blog_posts` (source of truth) |
| Editar post original | Flutter | Flutter admin |
| Traducir a otros locales | **Studio (W5 transcreate)** | Studio dashboard → W5 transcreate stream → escribe variant con `canonical_post_id` apuntando al original |
| Revisar / publicar variant traducido | Studio (Rol 2) | Studio (workflow `draft → reviewed → applied → published` — [[ADR-021]]) |

### P.6 Cross-refs

- W5 #219 — transcreate expansion (blog + pkg + act)
- W6 #220 — `pilot-matrix-blog.spec.ts` (render correctness)
- [[ADR-019]] multi-locale URL routing
- [[ADR-020]] hreflang policy
- [[ADR-021]] TM + AI transcreation pipeline (W5 blog + pkg + act)
- [[cross-repo-flutter]] (SEO gap #1 `inLanguage` hardcoded)
- Instrumentation: `data-testid="detail-blog"` wrapper top-level (W1 AC-W1-9 v2, consumido por W5/W6)

---

## Secciones auto-generadas (sin data del operador)

Estas piezas aparecen en la landing **sin necesidad de configuración manual**. Útiles para entender qué funciona "gratis":

| Pieza | Genera | Requisito mínimo |
|-------|--------|------------------|
| Miga de pan | `productType + name` | Producto existe |
| Sticky CTA | WhatsApp + teléfono del website | `websites.content.whatsapp` o `phone` |
| Chip tamaño de grupo (Pkg) | regex sobre nombre/descripción | Texto tipo "10-15 pax" en nombre o descripción |
| Chips de inclusiones destacadas (Act) | regex sobre `inclusions` | Keywords clave: "transporte", "guía", "almuerzo", etc. |
| Mapa del circuito (Pkg) | `itinerary_items.destination` + city-coords | ≥2 items con ciudades conocidas (17 CO) |
| Mapa del circuito (Act) | `schedule[]` + geocoding | ≥2 paradas en el programa |
| Punto de encuentro | `meeting_point` | Lat/lng o dirección legible |
| Reviews de Google | Google Places API | `account.google_reviews_enabled === true` + Place ID |
| Similares | query SSR | ≥1 producto con mismo `location` |
| JSON-LD completo | derivado de todo lo anterior | Producto existe |
| Breadcrumb JSON-LD | derivado del path | Producto existe |

---

## Secciones "fantasma" — existen pero suelen quedar vacías

Son secciones que **renderizan condicionalmente** y requieren data operativa. Si no hay dato, **no aparecen en la landing**. Hay que inventariar qué falta llenar para que aparezcan:

| Sección | Condición para mostrar | Dónde llenar |
|---------|------------------------|--------------|
| Highlights Grid (Act) | `custom_highlights` o `highlights` no vacíos | Studio (post-W2) o Flutter (catálogo) |
| Highlights Grid (Pkg) | además puede venir de IA F3 | Studio, Flutter, o trigger `/api/ai/generate-package-content` |
| Galería avanzada (>1 imagen) | `photos/images` con ≥2 entradas | Flutter media picker / Studio `GalleryCurator` |
| Video hero | `products.video_url` presente | Studio `VideoUrlEditor` (Pkg / Act post-W2) / Flutter |
| Chip rating | rating explícito o Google reviews activas | Flutter o Google Places |
| Chip tamaño de grupo | regex match en nombre/descripción | Convención de nomenclatura |
| Recomendaciones (Act) | `products.recommendations` no vacío | Studio `RecommendationsEditor` (post-W2) / Flutter |
| Mapa circuito (Pkg) | ≥2 ciudades mapeables | Flutter itinerario + (ampliar city-coords) |
| Mapa circuito (Act) | ≥2 paradas geocodificables en `schedule` | Flutter program editor |
| Day-by-day (Pkg) | `itinerary_items[]` poblados + `source_itinerary_id` | Flutter itinerario |
| Day: amenities (hotel) | `hotels.amenities` + `star_rating` | Flutter hotel editor |
| Day: schedule inline (act) | `activities.schedule_data` | Flutter activity editor |
| Description AI | `description_ai_generated=true` + <80 chars | trigger F3 + Flutter flag |
| Options Table | `products.options[]` | Flutter pricing panel |
| Meeting Point Map | `meeting_point` con coords | Flutter map picker |
| FAQ personalizado | `custom_faq` con ≥1 pregunta | Studio SEO editor |
| Trust badges | `websites.content.trust` configurado | Flutter settings |

---

## Campos con schema pero SIN editor (🚫 gaps)

El schema existe en la base de datos, pero **no hay forma de llenarlos** desde las UIs actuales. Gaps a resolver:

| Campo | Schema existe en | Editor faltante | Impacto |
|-------|------------------|-----------------|---------|
| `products.video_url` | `products` ([[#165]]) | 🚫 Flutter | Video en hero pendiente (Studio lee; ya wireado via `VideoUrlEditor` Studio-side) |
| `products.video_caption` | `products` ([[#165]]) | 🚫 Flutter | Caption del video pendiente |
| `package_kits.description_ai_generated` | `package_kits` ([[#174]]) | 🚫 Flutter UI | Flag para proteger edición manual de descripción (ops panel Studio existe) |
| `package_kits.highlights_ai_generated` | `package_kits` ([[#174]]) | 🚫 Flutter UI | Flag para proteger edición manual de highlights |
| `package_kits.last_ai_hash` | `package_kits` ([[#174]]) | auto — no editable | Control de dedup de IA |
| `min_group_size` / `max_group_size` | **no existe** | Campo nuevo propuesto | Reemplazar regex G1 |
| `cancellation_policy_text` | **no existe** | Campo nuevo propuesto | FAQ cancelación hoy hardcoded G2 |

### Gaps resueltos 2026-04-19

Movidos desde la tabla anterior tras validar que los editores existen (ver Sección N). No eliminados — historizados para trazabilidad per `docs/INDEX.md` §9 "Do not delete concepts on removal — mark as deprecated inline":

| Campo | Schema existe en | Resolución | Editor |
|-------|------------------|-----------|--------|
| `custom_hero.title` | `product_page_customizations` | ✅ resuelto 2026-04-19 (Pkg) · 🟡-flag post-W2 (Act) · 🚫 as-is Hotel | `HeroOverrideEditor` |
| `custom_hero.subtitle` | `product_page_customizations` | ✅ resuelto (misma nota) | `HeroOverrideEditor` |
| `custom_hero.backgroundImage` | `product_page_customizations` | ✅ resuelto (misma nota) | `HeroOverrideEditor` |
| `custom_sections[]` | `product_page_customizations` | ✅ resuelto (misma nota) | `CustomSectionsEditor` |
| `sections_order[]` | `product_page_customizations` | ✅ resuelto (misma nota) | `SectionsReorderEditor` |
| `hidden_sections[]` | `product_page_customizations` | ✅ resuelto (misma nota) | `SectionVisibilityToggle` |

Pointer commit-history: ver PR de W1 refresh (EPIC #214 Stage 1 W1, branch `stage-1/w1-matrix-refresh`).

---

## Resumen visual por tipo de artefacto

Agrupación por patrón visual (cuántos ítems usan cada patrón):

| Artefacto | Ítems # |
|-----------|---------|
| Píldora/chip en hero | 5, 6, 7, 8, 9, 11, 14 |
| Grid multi-columna | 17 (highlights), 30-31 (inc/exc) |
| Timeline / día a día | 23 (act schedule), 25-29 (pkg itinerary) |
| Mapa interactivo | 24 (pkg circuito), 32 (act circuito), 33 (meeting point) |
| Tabla | 34 (options) |
| Acordeón | 27 (schedule inline), 35 (FAQ) |
| Lightbox modal | 18 (gallery), 20 (video) |
| Sticky / flotante | 16 (CTA bar), 38 (sidebar) |
| CTA botón | 12, 13, 14, 39 |
| Prose largo | 19 (descripción), P4 (blog content) |
| Badge | 10 (estrellas hotel), 26 (amenities hotel) |
| Carousel | 40 (similares) |
| Reviews cards | 37 (Google reviews) |
| Metadata (no visible) | 41-48 (SEO + JSON-LD), P5-P7 (blog SEO) |

---

## Política pilot — footer

**Política Hotel "as-is" (pilot 2026-04-19):** Hotels retienen edición Flutter-only para marketing/contenido como política del pilot ColombiaTours. El cliente confirmó 2026-04-19 (ref EPIC #214 [#issuecomment-4276233308](https://github.com/weppa-cloud/bukeer-studio/issues/214#issuecomment-4276233308)) que no se abre superficie Studio para marketing de hoteles en pilot. Excepción: SEO meta (rows #41, #42, #48) editable vía SEO item detail surface. Cualquier re-scope = post-pilot. Ver [[ADR-025]] Editable ownership.

**Booking V1 DEFER (pilot 2026-04-19):** Sección M deferred post-pilot. Pilot site sale con WhatsApp + teléfono únicamente. Ver [[ADR-024]].

---

## Referencias

- [[package-detail-anatomy]] — desglose sección por sección del paquete con hygiene checklist
- [[product-detail-inventory]] — inventario técnico cross-page con matriz de editabilidad
- [[pilot-readiness-deps]] — dependencias gate EPIC #214 (W1-W7)
- [[ADR-024-booking-v1-pilot-scope]] — Booking V1 DEFER post-pilot
- [[ADR-025-studio-flutter-field-ownership]] — Studio / Flutter field ownership boundary
- [[ADR-003]] — Contract-first architecture
- [[ADR-019]] — Multi-locale URL routing (blog render paths)
- [[ADR-020]] — hreflang emission policy
- [[ADR-021]] — TM + AI transcreation pipeline (W5 blog + pkg + act)
- [[ADR-023]] — QA tooling (visual regression + CT)
- [[cross-repo-flutter]] — Flutter-owner fields + SEO gap #1
- [[#165]] — Product Video Field (hero + VideoObject JSON-LD)
- [[#171]] [[#172]] [[#173]] [[#174]] — Package Content Population (F1/F2/F3)
- [[#127]] — Package Detail Conversion v2 (hero chips, WhatsApp CTA)
- EPIC #214 + W1 #215 + W2 #216 + W3 #217 (DEFER) + W5 #219 + W6 #220 + W7 #221
