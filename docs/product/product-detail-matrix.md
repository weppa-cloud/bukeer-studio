# Matriz de Inventario — Detalle de Producto

**Actualizado:** 2026-04-17
**Aplica a:** landing de Actividad/Servicio + landing de Paquete
**Propósito:** vista de diseño de producto (no dev). Lista cada pieza de información que aparece en la página pública, de dónde viene, cómo se llena, qué componente la muestra y en qué landing aparece.
**Ver también:** [[package-detail-anatomy]] · [[product-detail-inventory]]

---

## Cómo leer esta matriz

**Columnas:**
- **#** — número de ítem
- **Información** — qué es (lenguaje común, no técnico)
- **Origen** — de dónde viene el dato
- **Generación** — cómo se llena (quién lo escribe o cómo se calcula)
- **Act** — aparece en landing de Actividad/Servicio
- **Pkg** — aparece en landing de Paquete
- **Artefacto visual** — cómo se ve en la página
- **Estado** — operativa / con observación

**Códigos de generación:**

| Código | Qué significa |
|--------|---------------|
| 🟦 **Manual (Flutter)** | Operador escribe en Bukeer Flutter (catálogo de productos) |
| 🟨 **Manual (Studio)** | Operador escribe en Bukeer Studio (personalización de página) |
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
| 🚫 | Schema existe, falta editor o trigger |

---

## Matriz principal — Campos e información

### A. Cabecera (Hero)

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 1 | Imagen de portada | `products.image` → galería[0] | 🟦 Manual (Flutter) | ✅ | ✅ | Imagen a ancho completo, 70vh, gradiente inferior | ✅ |
| 2 | Título del producto | `product_page_customizations.custom_hero.title` → `products.name` | 🟨 Manual (Studio) → 🟦 Manual (Flutter) | ✅ | ✅ | H1 grande 4xl/5xl, blanco sobre hero | 🚫 *editor Studio falta* |
| 3 | Subtítulo de ubicación | `custom_hero.subtitle` → `products.location` → `city + country` | 🟨 → 🟦 → 🟥 Computado | ✅ | ✅ | Texto secundario bajo H1 | 🚫 *editor Studio falta* |
| 4 | Categoría (etiqueta) | hardcoded por `productType` | ⬛ | ✅ | ✅ | Letra pequeña monospace encima del H1 ("ACTIVIDADES", "PAQUETES") | ✅ |
| 5 | Chip duración | `products.duration` (Act) / `duration_days + duration_nights` (Pkg) | 🟦 Manual (Flutter) | ✅ | ✅ | Píldora con ícono de reloj | ✅ |
| 6 | Chip ubicación | `products.location` | 🟦 Manual (Flutter) | ✅ | ❌ | Píldora con ícono de pin | ✅ |
| 7 | Chip rating | `products.user_rating` → promedio reviews Google | 🟦 → 🟩 Auto Google | ✅ | ✅ | Píldora con ★ y valor | ✅ |
| 8 | Chip tamaño de grupo | regex sobre `name + description` | 🟥 Auto — Computado | ❌ | ✅ | Píldora — ej. "10-15 pax" | ⚠️ *frágil sin campo explícito* |
| 9 | Chips inclusiones destacadas | regex sobre `inclusions` | 🟥 Auto — Computado | ✅ | ❌ | Hasta 3 píldoras con ✓ verde | ✅ |
| 10 | Estrellas (hotel) | `products.star_rating` | 🟦 Manual (Flutter) | hotel | ❌ | Ícono ★ repetido (1–5) | ✅ |
| 11 | Precio "Desde" | min de `products.options[].prices` → `products.price` | 🟥 Computado → 🟦 Manual (Flutter) | ✅ | ✅ | Píldora semibold con "Desde $X" | ✅ |
| 12 | Botón WhatsApp | `websites.content.whatsapp` | 🟦 Manual (Flutter) | ✅ | ✅ | Botón verde oscuro | ✅ |
| 13 | Botón Teléfono | `websites.content.phone` | 🟦 Manual (Flutter) | ✅ | ✅ | Botón secundario | ✅ |
| 14 | **Botón "Ver video"** ([[#165]]) | `products.video_url` | 🟦 Manual (Flutter) | ✅ | ✅ | Píldora con ícono ▶ — abre lightbox | 🚫 *UI Flutter pendiente* |

### B. Navegación / Ruta

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 15 | Miga de pan | derivada de `productType + name` | 🟥 Auto — Computado | ✅ | ✅ | Texto horizontal con `/` separadores | ✅ |
| 16 | Sticky CTA (tras scroll) | mismo precio + CTAs del hero | reutiliza fuentes existentes | ✅ | ✅ | Barra fija inferior aparece tras 200px scroll | ✅ |

### C. Contenido principal

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 17 | Grid de highlights | `custom_highlights` → **`program_highlights`** (IA) → `highlights` (legacy) | 🟨 Manual (Studio) → 🟪 Auto — IA → 🟦 Manual | ✅ | ✅ | Grid 2×3 de cards con ícono | 🟡 sin data en Act sin AI |
| 18 | Galería | **`program_gallery`** (F1) → `photos` → `images` → `image` | 🟫 Auto — Agregación (Pkg) → 🟦 Manual | ✅ | ✅ | 1 principal + 4 miniaturas → abre lightbox con navegación | ✅ |
| 19 | Descripción larga | `products.description` → **IA (si `description_ai_generated=true`)** | 🟦 Manual → 🟪 Auto — IA (Pkg) | ✅ | ✅ | Prose ~4 columnas, ~80 líneas máx | ✅ |
| 20 | Video modal | `products.video_url` — procesado por `parseVideoMeta` | 🟦 Manual (Flutter) | ✅ | ✅ | Lightbox fullscreen con iframe YouTube/Vimeo/MP4 lazy-loaded | 🚫 *UI Flutter pendiente* |

### D. Sección activity-specific

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 21 | Recomendaciones | `products.recommendations` (split por línea/coma) | 🟦 Manual (Flutter) | ✅ | ❌ | Lista con viñetas pequeñas | ✅ |
| 22 | Tarifa base | min opción / `products.price` | 🟥 Computado | ✅ | ❌ | Panel "Desde $X" | ✅ |
| 23 | Programa (timeline) | `products.schedule[]` (ScheduleEntry) | 🟦 Manual (Flutter) | ✅ | ❌ (excluido) | Timeline vertical con hora + título + descripción + imagen | ✅ |

### E. Sección package-specific

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 24 | Mapa de la ruta del paquete | `itinerary_items[].destination` + `city-coords` (17 ciudades CO) | 🟥 Auto — Computado + Geo | ❌ | ✅ | Mapa interactivo con marcadores numerados + líneas conectoras | ⚠️ límite 17 ciudades |
| 25 | Día a día | `itinerary_items[]` renderizados por tipo | 🟦 Manual (itinerario en Flutter) | ❌ | ✅ | Lista con badge "Día N" + variante por tipo (hotel/actividad/transporte/vuelo) | ✅ |
| 26 | Día (hotel) | `hotels.star_rating + amenities` | 🟦 Manual (Flutter) | — | ✅ | Estrellas + hasta 6 amenity badges + link al hotel | ✅ |
| 27 | Día (actividad) | `activities.schedule_data` | 🟦 Manual (Flutter) | — | ✅ | Título + descripción + acordeón expandible con primeros 5 steps | ✅ |
| 28 | Día (transporte) | `transfers.from_location + to_location + duration` | 🟦 Manual (Flutter) | — | ✅ | Texto "{origen} → {destino} · {duración}" | ✅ |
| 29 | Día (vuelo) | `flights.carrier + flight_number + departure + arrival` | 🟦 Manual (Flutter) | — | ✅ | Texto "{aerolínea} {vuelo} · {sale} → {llega}" | ✅ |

### F. Inclusiones / exclusiones

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 30 | Qué incluye | **`program_inclusions`** (F1) → `inclusions` → hardcoded | 🟫 Auto — Agregación (Pkg) → 🟦 → ⬛ | ✅ | ✅ | Grid 2 columnas con ✓ verde | ✅ |
| 31 | Qué no incluye | **`program_exclusions`** (F1) → `exclusions` → hardcoded | 🟫 → 🟦 → ⬛ | ✅ | ✅ | Grid 2 columnas con ✗ rojo | ✅ |

### G. Mapa / ubicación

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 32 | Circuito multi-stop de actividad | `schedule[].title + description` + geocoding | 🟥 Auto — Computado + Geo | ✅ | ❌ | Mapa interactivo con ≥2 paradas | ✅ |
| 33 | Punto de encuentro | `products.meeting_point` (address, lat/lng) | 🟦 Manual (Flutter) | ✅ (si <2 stops) | ✅ (si no hay circuito) | Mapa estático con pin + dirección | ✅ |

### H. Precios / opciones

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 34 | Tabla de opciones | `products.options[]` (ActivityOption) | 🟦 Manual (Flutter) | ✅ (principal) | raro | Tabla con nombre, tipo unidad, min/max pax, precios multi-moneda | ✅ (Act) / ⚠️ G5 (Pkg) |

### I. Conversión / confianza

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 35 | Preguntas frecuentes (FAQ) | `custom_faq` (Studio) → defaults hardcoded | 🟨 Manual (Studio) → ⬛ | ✅ | ✅ | Acordeón de preguntas | ✅ |
| 36 | Trust badges | `websites.content.trust` (TrustContent schema) | 🟦 Manual (Flutter) | ✅ | ✅ | Grid de badges — RNT, años, viajeros, certificaciones | ✅ |
| 37 | **Reviews de Google** | Google Places API (gated por `account.google_reviews_enabled`) | 🟩 Auto — Google | ✅ | ✅ | Grid de cards con foto + nombre + ★ + texto + respuesta | ✅ |

### J. Sidebar (desktop)

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 38 | Resumen lateral | espejo de hero (rating, ubicación, duración, precio, CTAs) | reutiliza fuentes existentes | ✅ | ✅ | Card sticky en columna derecha | ✅ |

### K. Cierre

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 39 | CTA final | texto estático + `website.content.whatsapp + phone` | ⬛ + 🟦 Manual | ✅ | ✅ | Sección centrada "¿Listo para vivir esta experiencia?" + botones | ✅ |
| 40 | Similares (carousel) | query SSR: mismo `location` → top 3 del account | 🟥 Auto — Computado | ✅ | ✅ | Carousel horizontal de 3 cards | ✅ |

### L. SEO / metadata (invisible al usuario, sí al buscador)

| # | Información | Origen | Generación | Act | Pkg | Artefacto visual | Estado |
|---|-------------|--------|------------|:---:|:---:|------------------|:------:|
| 41 | Título SEO (`<title>`) | `custom_seo_title` → auto `{name} - {type} en {location}` | 🟨 Manual (Studio) → 🟥 | ✅ | ✅ | — (head de HTML) | ✅ |
| 42 | Meta description | `custom_seo_description` → `products.description` truncada | 🟨 → 🟦 | ✅ | ✅ | — (head de HTML) | ✅ |
| 43 | Open Graph image | `products.social_image` → `image` → `photos[0]` | 🟦 Manual (Flutter) | ✅ | ✅ | — (og:image) | ✅ |
| 44 | JSON-LD Product schema | derivado de `products.*` | 🟥 Auto — Computado | ✅ | ✅ | — (inline `<script>`) | ✅ |
| 45 | JSON-LD Breadcrumb | derivado del path | 🟥 Auto — Computado | ✅ | ✅ | — | ✅ |
| 46 | JSON-LD FAQ | derivado de `custom_faq` | 🟥 Auto — Computado | ✅ | ✅ | — | ✅ |
| 47 | **JSON-LD VideoObject** ([[#165]]) | derivado de `video_url + video_caption` | 🟥 Auto — Computado | ✅ | ✅ | — | ✅ |
| 48 | Robots noindex | `custom_page.robots_noindex` | 🟨 Manual (Studio) | ✅ | ✅ | — (meta robots) | ✅ |

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
| Highlights Grid (Act) | `custom_highlights` o `highlights` no vacíos | Flutter (catálogo) o Studio (SEO editor) |
| Highlights Grid (Pkg) | además puede venir de IA F3 | Flutter, Studio, o trigger `/api/ai/generate-package-content` |
| Galería avanzada (>1 imagen) | `photos/images` con ≥2 entradas | Flutter media picker |
| Video hero | `products.video_url` presente | 🚫 Flutter UI pendiente ([[#165]]) |
| Chip rating | rating explícito o Google reviews activas | Flutter o Google Places |
| Chip tamaño de grupo | regex match en nombre/descripción | Convención de nomenclatura |
| Recomendaciones (Act) | `products.recommendations` no vacío | Flutter |
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
| `custom_hero.title` | `product_page_customizations` | 🚫 Studio | Sobrescritura de título por landing pendiente |
| `custom_hero.subtitle` | `product_page_customizations` | 🚫 Studio | Sobrescritura de subtítulo pendiente |
| `custom_hero.backgroundImage` | `product_page_customizations` | 🚫 Studio | Sobrescritura de hero image pendiente |
| `custom_sections[]` | `product_page_customizations` | 🚫 Studio | Inyección de secciones custom pendiente |
| `sections_order[]` | `product_page_customizations` | 🚫 Studio | Reordenar secciones pendiente |
| `hidden_sections[]` | `product_page_customizations` | 🚫 Studio | Ocultar secciones pendiente |
| `products.video_url` | `products` ([[#165]]) | 🚫 Flutter | Video en hero pendiente |
| `products.video_caption` | `products` ([[#165]]) | 🚫 Flutter | Caption del video pendiente |
| `package_kits.description_ai_generated` | `package_kits` ([[#174]]) | 🚫 Flutter | Flag para proteger edición manual de descripción |
| `package_kits.highlights_ai_generated` | `package_kits` ([[#174]]) | 🚫 Flutter | Flag para proteger edición manual de highlights |
| `package_kits.last_ai_hash` | `package_kits` ([[#174]]) | auto — no editable | Control de dedup de IA |
| `min_group_size` / `max_group_size` | **no existe** | Campo nuevo propuesto | Reemplazar regex G1 |
| `cancellation_policy_text` | **no existe** | Campo nuevo propuesto | FAQ cancelación hoy hardcoded G2 |

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
| Prose largo | 19 (descripción) |
| Badge | 10 (estrellas hotel), 26 (amenities hotel) |
| Carousel | 40 (similares) |
| Reviews cards | 37 (Google reviews) |
| Metadata (no visible) | 41-48 (SEO + JSON-LD) |

---

## Referencias

- [[package-detail-anatomy]] — desglose sección por sección del paquete con hygiene checklist
- [[product-detail-inventory]] — inventario técnico cross-page con matriz de editabilidad
- [[#165]] — Product Video Field (hero + VideoObject JSON-LD)
- [[#171]] [[#172]] [[#173]] [[#174]] — Package Content Population (F1/F2/F3)
- [[#127]] — Package Detail Conversion v2 (hero chips, WhatsApp CTA)
