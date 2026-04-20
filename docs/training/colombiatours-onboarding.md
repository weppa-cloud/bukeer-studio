# Onboarding ColombiaTours — Bukeer Studio (Pilot)

> **Audiencia:** Partner operativo de ColombiaTours (Rol 2 — gestor de contenido). **NO** requiere conocimientos de código, Supabase, ni despliegues.
>
> **Qué aprenderás:** cómo editar el contenido de tu sitio público (paquetes y actividades), cómo traducir contenido al inglés y cómo leer el tablero de cobertura SEO. Todo se hace desde Studio (interfaz web).

**Última revisión:** 2026-04-20.
**Versión doc:** W7-b (Flows 6 / 7 / 8 + FAQ expansion; screencasts pendientes en W7-c).
**Issue tracker:** [#221](https://github.com/weppa-cloud/bukeer-studio/issues/221) · EPIC [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214).

> **Nota de numeración (W7 spec vs. este doc):** el spec W7 (#221) numera los flows así — Flow 1 marketing, Flow 2 booking (DEFER), Flow 3 layout, Flow 4 traducción (3 sub-flows), Flow 5 coverage + drift, Flow 6 Activity Studio editor, Flow 7 Hotel Flutter handoff, Flow 8 SEO transcreate técnico. Este doc preserva la numeración histórica (W7-a) por compatibilidad de anchors existentes: "Flow 4" acá = **SEO personalizado** y "Flow 5" acá = **traducción (3 sub-flows)**. Los nuevos **Flows 6 / 7 / 8** (W7-b) sí siguen el spec.

---

## Tabla de contenido

1. [Antes de empezar](#antes-de-empezar)
2. [Flow 1 — Editar marketing de un paquete](#flow-1--editar-marketing-de-un-paquete)
3. [Flow 2 — Reservas / Booking (DEFERRED post-pilot)](#flow-2--reservas--booking-deferred-post-pilot)
4. [Flow 3 — Layout de secciones: hero, video, orden, ocultar, custom](#flow-3--layout-de-secciones-hero-video-orden-ocultar-custom)
5. [Flow 4 — SEO personalizado por página](#flow-4--seo-personalizado-por-página)
6. [Flow 5 — Traducción es-CO → en-US (3 sub-flows)](#flow-5--traducción-es-co--en-us-3-sub-flows)
7. [Flow 6 — Editar una actividad (Variant A — Studio native)](#flow-6--editar-una-actividad-variant-a--studio-native)
8. [Flow 7 — Hotel Flutter handoff (Variant B — read-only Studio)](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio)
9. [Flow 8 — SEO transcreate (técnico: stream, estados, drift, bulk)](#flow-8--seo-transcreate-técnico-stream-estados-drift-bulk)
10. [FAQ — preguntas frecuentes](#faq--preguntas-frecuentes)
11. [Qué **NO** debes hacer](#qué-no-debes-hacer)
12. [Cheat-sheet "Si ves X, haz Y"](#cheat-sheet-si-ves-x-haz-y)
13. [Cómo pedir ayuda](#cómo-pedir-ayuda)

---

## Antes de empezar

- **URL del dashboard:** `https://<dashboard>/dashboard/<websiteId>/`.
- **Credenciales:** las recibes por el canal oficial (Slack / email) antes del training.
- **Sesión:** expira tras inactividad; si ves pantalla de login, vuelve a ingresar.
- **Alcance editorial pilot (confirmado 2026-04-19):**
  - **Paquetes:** editables 100% desde Studio (marketing + contenido + SEO + traducción).
  - **Actividades:** editables desde Studio (mismos campos que paquetes, vía W2).
  - **Hoteles:** se editan en Flutter (equipo catálogo). Studio permite editar **solo** el meta SEO del hotel. Ver [FAQ #5](#por-qué-los-hoteles-se-editan-en-flutter-y-no-en-studio).
  - **Blog:** editable y traducible desde Studio.
  - **Reservas (booking):** **no** hay date picker ni formulario de lead todavía. Pilot usa WhatsApp + teléfono. Ver [Flow 2](#flow-2--reservas--booking-deferred-post-pilot) y [FAQ #6](#por-qué-no-hay-date-picker-todavía).

[SCREENSHOT: Dashboard home landing — sidebar con Products / Translations / SEO / Ops]

---

## Flow 1 — Editar marketing de un paquete

**Objetivo:** ajustar la descripción, highlights, inclusiones/exclusiones, galería, recomendaciones e imagen de portada de un paquete existente.

**Ruta Studio:** `/dashboard/<websiteId>/products/<slug>/marketing`

### Pasos

1. **Abrir el paquete.** Desde el sidebar → `Products` → buscar el paquete → clic en el nombre.
   [SCREENSHOT: Lista de paquetes con campo de búsqueda]
2. **Entrar al editor de marketing.** Pestaña `Marketing`.
   [SCREENSHOT: Pestañas Marketing / Content / SEO del detalle de paquete]
3. **Editar descripción.** Bloque `Descripción` → escribe / pega texto → guardar. Si el texto fue generado por IA verás un badge; puedes reescribirlo manualmente (ver [FAQ #2](#el-badge-de-ia-no-desaparece)).
   [SCREENSHOT: Editor de descripción con badge AI visible]
4. **Editar highlights.** Bloque `Highlights` → lista ordenable → arrastrar para reordenar, botón `+` para agregar.
   [SCREENSHOT: Editor de highlights con lista ordenable]
5. **Editar inclusiones y exclusiones.** Bloques `Inclusiones` y `Exclusiones` → mismas listas ordenables.
   [SCREENSHOT: Editor de inclusiones / exclusiones]
6. **Editar recomendaciones.** Bloque `Recomendaciones` (texto libre + tips).
   [SCREENSHOT: Editor de recomendaciones]
7. **Curar galería.** Bloque `Galería` → subir imágenes, reordenar, marcar portada.
   [SCREENSHOT: Gallery curator con drag-to-reorder]
8. **Cambiar imagen de portada (cover).** Botón "establecer como portada" sobre una imagen de la galería.
   [SCREENSHOT: Cover selector con imagen activa destacada]
9. **Verificar en público.** Abrir `https://<tu-dominio>/paquetes/<slug>` en nueva pestaña. Debería reflejar los cambios en menos de 60 s (ISR). Si no aparece, ver [FAQ #7](#cambio-no-se-refleja).
   [SCREENSHOT: URL pública del paquete con cambios aplicados]

### Resultado esperado

- El paquete muestra el banner `last_edited_by_surface=studio` (debug / admin view).
- Badges de IA se muestran si el campo fue generado por IA; desaparecen tras edición manual.
- Cambios visibles en `/paquetes/<slug>` tras la ventana ISR.

### Errores comunes

- "Guardé pero no veo el cambio" → [FAQ #7](#cambio-no-se-refleja).
- "La portada no actualiza en las cards del home" → [FAQ #1](#cover-image-no-se-actualiza-en-cards).
- "Veo 'Solo lectura'" → [FAQ #11](#flag-studio_editor_v2-off--por-qué-aparece-solo-lectura).

---

## Flow 2 — Reservas / Booking (DEFERRED post-pilot)

**Estado: DIFERIDO.** No hay walkthrough de booking en este pilot.

ColombiaTours pilot sale a producción con **WhatsApp + teléfono** como canales de conversión. **No** hay selector de fechas (date picker), **no** hay formulario de lead, **no** hay endpoint `/api/leads` activo. Esto es una decisión explícita del cliente en la reunión del 2026-04-19.

El CTA de WhatsApp sigue siendo la señal de conversión canónica (evento `whatsapp_cta_click`, paridad con el pilot Product Landing v1).

### Referencias

- **ADR-024** (Accepted-DEFER 2026-04-19): `docs/architecture/ADR-024-booking-v1-pilot-scope.md`.
- **Issue [#217](https://github.com/weppa-cloud/bukeer-studio/issues/217)** — W3 Booking decisión DEFER.
- **Priority change v2 comment** en EPIC [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214).

**Qué dice el FAQ cuando un cliente pregunta "¿y el botón de reservar?"** Ver [FAQ #6](#por-qué-no-hay-date-picker-todavía).

[SCREENSHOT: Página de producto pública mostrando CTA WhatsApp + teléfono, sin date picker]

---

## Flow 3 — Layout de secciones: hero, video, orden, ocultar, custom

**Objetivo:** cambiar el hero, agregar video, reordenar / ocultar secciones del detalle del producto (paquete o actividad), o inyectar una sección custom.

**Ruta Studio:** `/dashboard/<websiteId>/products/<slug>/content`.

Aplica a **paquetes + actividades** (mismos editores). Hoteles: ver [FAQ #5](#por-qué-los-hoteles-se-editan-en-flutter-y-no-en-studio).

### Pasos — Hero override

1. Pestaña `Content` del producto.
2. Bloque `Hero override` → elegir imagen / video / configuración alternativa al hero por defecto.
3. Guardar → preview lateral refresca.
4. Verificar URL pública.

[SCREENSHOT: Hero override editor con preview]

### Pasos — Video URL

1. Bloque `Video` → pegar URL (YouTube / Vimeo / MP4 directo).
2. Guardar.
3. Verificar que el lightbox de video abre desde el hero.

[SCREENSHOT: Video URL editor]

### Pasos — Reordenar / ocultar secciones

1. Bloque `Sections layout`.
2. Lista de secciones (Hero, Highlights, Itinerary, Gallery, Inclusiones, FAQ, etc.) con handles de drag.
3. Arrastra para reordenar.
4. Toggle "Ocultar" por sección → la sección desaparece del render público.
5. Guardar.

[SCREENSHOT: Sections reorder con toggles de visibilidad]

### Pasos — Inyectar sección custom

1. Bloque `Custom sections`.
2. Botón `+ Agregar custom section` → elige un tipo del registry (ver [[SECTION_TYPES_REGISTRY]] — interno, no editable aquí).
3. Rellena los campos (título, copy, imágenes, CTA).
4. Guardar → aparece en el orden que elegiste en el paso anterior.

[SCREENSHOT: Custom section injector con preview]

### Resultado esperado

- El render público de `/paquetes/<slug>` (o `/actividades/<slug>`) respeta el nuevo orden.
- Secciones ocultas no se exponen ni en HTML ni en sitemap (si marcaste `robotsNoindex` en SEO — ver Flow 4).
- Video lightbox abre desde el hero.

---

## Flow 4 — SEO personalizado por página

**Objetivo:** override de `title`, `meta description`, FAQ schema, robots, canonical.

**Ruta Studio:** `/dashboard/<websiteId>/seo/<itemType>/<itemId>`.

Alcance: 4 tipos de contenido — `package`, `activity`, `hotel`, `blog`. (Hoteles: SEO sí editable aquí, aunque marketing/content sea Flutter-owner.)

### Pasos

1. Sidebar → `SEO` → seleccionar tipo (package / activity / hotel / blog) → clic en el ítem.
2. **Title override** → deja vacío si quieres usar el generado automático; escribe para override.
3. **Meta description override** → igual, vacío = automático.
4. **FAQ schema** → agregar Q&A que se emiten como `FAQPage` JSON-LD.
5. **Robots** → toggle `noindex` / `nofollow` por página si la quieres fuera del índice de Google.
6. **Canonical URL** → campo opcional; deja en blanco para que Studio use la canónica por defecto.
7. Guardar.
8. Verificar en `/<tipo>/<slug>` → inspeccionar `<head>` (título + meta + canonical + robots).
9. (Opcional) Probar en [Google Rich Results Test](https://search.google.com/test/rich-results) si editaste FAQ schema.

[SCREENSHOT: Editor SEO con title / description / FAQ / robots]

### Resultado esperado

- `<title>` y `<meta description>` en el HTML reflejan tu override.
- `FAQPage` JSON-LD aparece en el head si agregaste Q&A.
- Si marcaste `noindex`: la página NO aparece en sitemap. Si marcaste solo `nofollow` (y no `noindex`): sigue en sitemap pero con directivas robots correctas. Ver [FAQ #3](#sitemap-incluye-páginas-ocultas) para la regla exacta.

---

## Flow 5 — Traducción es-CO → en-US (3 sub-flows)

**Objetivo:** traducir contenido es-CO → en-US para que se publique en `/en/...`.

Alcance: **paquetes + actividades + blog** (hoteles NO están en scope de transcreate pilot — ver [FAQ #5](#por-qué-los-hoteles-se-editan-en-flutter-y-no-en-studio)).

**Ruta Studio:** `/dashboard/<websiteId>/translations` (o entry point del dashboard de traducción).

**Ciclo de vida de una traducción:** `Draft` → `Reviewed` → `Applied`. (Los nombres de estado están en inglés porque la UI de Studio los maneja así — están en el i18n catalog.)

### Flow 5.a — Traducir un paquete

1. **Picker.** Abrir dashboard de traducciones (`/dashboard/<websiteId>/translations`) → filtrar por tipo `Package` → seleccionar paquete.
   - Estado UI esperado: la raíz del dashboard tiene `data-testid="translations-dashboard-root"`. Los filtros (`translations-dashboard-filter-page-type`, `translations-dashboard-filter-status`, `translations-dashboard-filter-search`) están visibles; el KPI panel (`translations-dashboard-kpis`) muestra contadores por estado.
   [SCREENSHOT: Translations picker con filtro Package {{screenshot-placeholder}}]
2. **Stream.** Disparar transcreate → UI muestra stream en vivo (pipeline ADR-021, endpoint `POST /api/seo/content-intelligence/transcreate`).
   - Estado esperado en DB: se crea fila en `seo_transcreation_jobs` con `status='draft'`; `seo_localized_variants` aparece con `status='draft'`.
   [SCREENSHOT: Transcreate stream en progreso {{screenshot-placeholder}}]
3. **Corregir draft.** Revisa línea por línea. Edita términos, tono, keywords locales.
   [SCREENSHOT: Bilingual editor es-CO / en-US con diferencias resaltadas {{screenshot-placeholder}}]
4. **Reviewed.** Marcar estado `Reviewed` cuando esté listo (opcional: segundo par de ojos).
   - Transición DB: `seo_transcreation_jobs.status` pasa de `draft` → `reviewed`.
   [SCREENSHOT: Estado Draft → Reviewed {{screenshot-placeholder}}]
5. **Applied.** Botón `Apply` publica a `en-US`. Coverage matrix refresca.
   - Transición DB: `seo_transcreation_jobs.status` pasa de `reviewed` → `applied`; `seo_localized_variants.status='applied'` y se dispara ISR fan-out (ver [Flow 8](#flow-8--seo-transcreate-técnico-stream-estados-drift-bulk)).
   [SCREENSHOT: Apply action con confirmación {{screenshot-placeholder}}]
6. **Verificar URL pública.** Abrir `/en/paquetes/<slug>` en nueva pestaña. Validar:
   - `<html lang="en">`
   - `<link rel="alternate" hreflang="en-US">` + contraparte `hreflang="es-CO"` + `hreflang="x-default"`
   - `<link rel="canonical" href="/en/paquetes/<slug>">`
   - JSON-LD con `inLanguage: "en"` en los campos traducibles
   [SCREENSHOT: URL pública /en/paquetes/<slug> {{screenshot-placeholder — capture con URL /en/ visible}}]

**Troubleshooting rápido (aplica también a 5.b + 5.c):**

- **Stream se aborta / se corta.** El endpoint de stream puede cortarse por timeout edge o abort del cliente. No deja fila orfanada: `seo_transcreation_jobs` no se crea si el stream no llegó a `create_draft`. Relanzar el transcreate es seguro. QA ref: [`docs/qa/pilot/transcreate-playbook.md`](../qa/pilot/transcreate-playbook.md) §stream-abort.
- **429 Rate-limited.** Esperado por priority v2 (la API real impone un límite diario 10 calls/locale/website). Payload: `{ "code": "RATE_LIMITED", "message": "Daily transcreate AI limit exceeded for this locale." }`. No es bug; esperar ~24 h o contactar al equipo si es urgente.
- **409 `TARGET_RERESEARCH_REQUIRED` al crear draft.** El pipeline exige un keyword candidate "decision-grade" previo para la combinación (`website_id`, `content_type`, `target_locale`, `target_keyword`). Pedir al equipo sembrar el candidato o usar el flujo "sugerir keyword" del dashboard.
- **409 `TRANSCREATE_REVIEW_REQUIRED` al re-aplicar.** Apply NO es idempotente. Si necesitas re-aplicar, primero vuelve a `Reviewed` (rollback — ver §"Common — Rollback").

### Flow 5.b — Traducir una actividad

Mismo ciclo que 5.a; cambian filtro, path de verificación y overlay (`activities`):

1. Picker → `translations-dashboard-filter-page-type` = `Activity` → seleccionar.
2. Stream → corregir → `Reviewed` → `Applied` (transiciones DB iguales que 5.a; overlay en `seo_localized_variants` con `target_entity_type='activity'`).
3. Verificar URL pública `/en/actividades/<slug>` con `<html lang="en">`, hreflang triple (`en-US` + `es-CO` + `x-default`), canonical, y JSON-LD `inLanguage: "en"`.

[SCREENSHOT: Translations picker filtro Activity {{screenshot-placeholder}}]
[SCREENSHOT: URL pública /en/actividades/<slug> {{screenshot-placeholder — capture con URL /en/ visible}}]

### Flow 5.c — Traducir un blog post

1. Picker → `translations-dashboard-filter-page-type` = `Blog` → seleccionar post.
2. Stream → corregir → `Reviewed` → `Applied`.
   - **Comportamiento blog-específico:** `applyTranscreateJob` crea una **nueva fila** en `website_blog_posts` con `locale='en-US'` + `canonical_post_id` apuntando al source. El slug se deriva del payload (`payload.slug`). Si el slug EN difiere del slug ES, la URL `/en/blog/<source-slug>` devuelve 404 — usa el slug EN devuelto por el apply response (la UI lo muestra en la confirmación).
3. Verificar `/en/blog/<slug-en>` con las mismas assertions (`<html lang>`, hreflang, canonical, `inLanguage`).

[SCREENSHOT: Translations picker filtro Blog {{screenshot-placeholder}}]
[SCREENSHOT: URL pública /en/blog/<slug-en> {{screenshot-placeholder — capture con URL /en/ visible}}]

### Common — Rollback de traducción

Si al hacer `Apply` algo sale mal:

1. En Studio, vuelve al estado `Reviewed` del registro (hay un selector de revisión anterior).
2. La URL pública vuelve al locale base (es) hasta que re-publiques.
3. Procedimiento L1–L4 detallado en [`docs/ops/studio-editor-v2-rollback.md`](../ops/studio-editor-v2-rollback.md).

### Coverage + drift

- Pantalla `Coverage` muestra % traducido por tipo (pkg / act / blog) y alertas de drift (contenido cambió en es-CO después de aplicar en en-US → re-traducir).
- Si ves una alerta de drift, re-entra al Flow 5.x correspondiente para el ítem listado.

[SCREENSHOT: Coverage matrix con drift alerts]

### Resultado esperado

- URL pública `/en/paquetes/<slug>` (o `/en/actividades/<slug>`, o `/en/blog/<slug>`) renderiza contenido traducido.
- Head incluye hreflang + canonical + `inLanguage` correctos (ADR-019, ADR-020).
- Si desactivas en-US, el language switcher hace fallback según ADR-019 — ver [FAQ #4](#language-switcher-salta-al-homepage).

---

## Flow 6 — Editar una actividad (Variant A — Studio native)

**Objetivo:** editar marketing + contenido + SEO de una actividad directamente desde Studio (mismo modelo que paquetes). Esta es la **Variant A** (Studio native editor), default del pilot post-W2.

**Ruta Studio:**
- Marketing → `/dashboard/<websiteId>/products/<slug>/marketing`
- Contenido → `/dashboard/<websiteId>/products/<slug>/content`
- SEO → `/dashboard/<websiteId>/seo/activity/<itemId>` (Flow 4)

**Requisito:** feature flag `studio_editor_v2` **habilitado** en tu cuenta + sitio. Si aparece "Solo lectura", ver [FAQ #11](#flag-studio_editor_v2-off--por-qué-aparece-solo-lectura).

Shipping ref: [PR #229](https://github.com/weppa-cloud/bukeer-studio/pull/229) (W2 #216 activities marketing parity — RPC `update_activity_marketing_field` + routes + editors) · [PR #237](https://github.com/weppa-cloud/bukeer-studio/pull/237) (W4 #218 editor→render E2E; test `activity-parity.spec.ts`).

### Pasos — Marketing de actividad

1. Sidebar → `Products` → buscar la actividad (filtrar por tipo `activity`) → clic en el nombre.
   - Estado esperado: la ruta resuelve con `product_type=activity`; la query va contra la tabla `activities` (no `package_kits`).
   [SCREENSHOT: Products list con actividad seleccionada {{screenshot-placeholder}}]
2. Pestaña `Marketing` → bloques disponibles (mismos editores que paquetes, pero con RPC dedicada `update_activity_marketing_field`):
   - `DescriptionEditor` (descripción rica).
   - `HighlightsEditor` (lista ordenable).
   - `InclusionsExclusionsEditor` (dos listas paralelas).
   - `RecommendationsEditor` (texto libre + tips).
   - `InstructionsEditor` (instrucciones operativas de la actividad — específico de activities, no de packages).
   - `SocialImagePicker` (imagen OG / Twitter).
   - `GalleryCurator` (subida + reorder + portada).
   [SCREENSHOT: Activity marketing editor con los 7 bloques {{screenshot-placeholder}}]
3. Cada edición guarda vía `update_activity_marketing_field` RPC. Si el RPC devuelve error (p. ej. permiso faltante), la UI muestra toast y el campo revierte al último valor guardado.

### Pasos — Contenido de actividad

1. Pestaña `Content` de la misma actividad → editores de contenido:
   - `HeroOverrideEditor` (imagen / video del hero).
   - `VideoUrlEditor` (URL de YouTube / Vimeo / MP4).
   - `SectionVisibilityToggle` (ocultar secciones del render público).
   - `SectionsReorderEditor` (reordenar via drag).
   - `CustomSectionsEditor` (inyectar secciones custom del registry).
   - `AiFlagsPanel` (ver qué campos fueron generados por IA + override).
   [SCREENSHOT: Activity content editor con los 6 editores {{screenshot-placeholder}}]
2. Al guardar, Studio dispara revalidate fan-out (ISR). Espera ≤ 60 s para ver cambios en público.

### Resultado esperado

- URL pública `/actividades/<slug>` renderiza los cambios tras la ventana ISR.
- Banner `last_edited_by_surface=studio` visible en admin view.
- AI badges se limpian al editar manualmente (si aparecía "Generado por IA" y lo reescribiste).
- E2E ref (no corre desde este doc, lo corre QA): `activity-parity.spec.ts` valida editor → render para todos los campos.

### Variant B (Flutter handoff) — contingencia solo

Si por algún motivo W2 no hubiera entregado la RPC `update_activity_marketing_field`, actividades fallback a Variant B (Flutter handoff, igual que hoteles — ver [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio)). **En el pilot ColombiaTours post-2026-04-20 esto NO aplica** — default es Variant A. Si ves "Solo lectura" en una actividad, NO es Variant B: es el flag `studio_editor_v2` off. Ver [FAQ #11](#flag-studio_editor_v2-off--por-qué-aparece-solo-lectura).

---

## Flow 7 — Hotel Flutter handoff (Variant B — read-only Studio)

**Objetivo:** entender por qué los hoteles NO son editables en Studio para marketing / contenido, qué SÍ puedes hacer desde Studio (SEO meta), y cómo solicitar cambios de catálogo al equipo Flutter.

**Política pilot:** hoteles son **Flutter-owner** por decisión explícita confirmada 2026-04-19 + [[ADR-025]]. Studio **no** es el editor canónico para marketing/contenido de hotel. Studio expone hoteles en **read-only** para el partner.

Shipping ref: [[ADR-025]] `docs/architecture/ADR-025-studio-flutter-field-ownership.md` + `.claude/rules/cross-repo-flutter.md`.

### Qué se edita dónde

| Campo | Editor canónico | Ruta |
|-------|----------------|------|
| Marketing (descripción, highlights, inclusiones, galería, recomendaciones, cover) | **Flutter admin** (app `weppa-cloud/bukeer-flutter`) | Catálogo → Hoteles → detalle hotel |
| Contenido (hero, video, sections layout, custom sections) | **Flutter admin** | Catálogo → Hoteles → detalle hotel |
| Pricing + availability + inventory | **Flutter admin** (fuente canónica) | Catálogo operaciones |
| **SEO meta** (title / description / FAQ / robots / canonical) | **Studio** (Flow 4) | `/dashboard/<websiteId>/seo/hotel/<itemId>` |
| Traducción es-CO → en-US | **Fuera de scope pilot** | — (hoteles NO están en Flow 5) |

### Pasos — Ver un hotel en Studio (read-only)

1. Sidebar → `Products` (o `Hoteles` según el sidebar del sitio) → filtrar por tipo `hotel` → clic en el hotel.
2. Estado esperado: el detalle del hotel **muestra** campos de marketing + contenido pero con los editores **deshabilitados** (mensaje "Solo lectura — este campo se edita en Flutter").
   - Indicador visible: badge "Flutter-owner" + icono de candado.
   [SCREENSHOT: Hotel detail en Studio — editores deshabilitados con banner "Flutter-owner" {{screenshot-placeholder}}]
3. **SEO meta sí es editable:** ir a `/dashboard/<websiteId>/seo/hotel/<itemId>` para editar `custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex` (Flow 4 aplica igual que pkg/act/blog).

### Pasos — Solicitar un cambio de hotel al equipo Flutter

1. Identificar el campo + valor deseado (p. ej. "cambiar hero image del hotel Playa Blanca").
2. Abrir el handoff protocol (canal Slack `#pilot-colombiatours` o `#bukeer-catalog`).
3. Incluir:
   - Slug del hotel.
   - URL pública `/hoteles/<slug>` (para referencia visual).
   - Campo a cambiar + valor antiguo + valor nuevo.
   - Screenshot si aplica.
4. El equipo catálogo (Flutter) hace el cambio en Flutter admin → Supabase DB actualiza → Studio lee el cambio vía SSR + ISR fan-out (≤ 60 s en público).
5. Verificar en `/hoteles/<slug>` (español) — si necesitas verificar en Studio, refresca la página del hotel y valida el banner `last_edited_by_surface=flutter`.
   [SCREENSHOT: Flutter admin editando hotel — flecha apuntando a Studio read-only view {{screenshot-placeholder}}]

### Drift entre Flutter y Studio

Si un cambio de hotel en Flutter no aparece en Studio tras 60 s:

1. Verifica `/dashboard/<websiteId>/ops/reconciliation` — debería mostrar el hotel con timestamp reciente si el cambio llegó a DB.
2. Si llegó a DB pero Studio no actualiza → ISR cache stale → pedir al equipo correr `POST /api/revalidate`.
3. Si NO llegó a DB → el cambio Flutter no se guardó; pedir al equipo catálogo reintentar.

### Variant A (Studio editor hoteles) — post-pilot

Si post-pilot se construye la RPC `update_hotel_marketing_field`, Studio podría adoptar la edición de marketing de hoteles (paridad con packages + activities). Eso NO está en scope W2 ni priority v2 — es una decisión post-pilot. Hasta entonces, Variant B (Flutter handoff) es el default.

---

## Flow 8 — SEO transcreate (técnico: stream, estados, drift, bulk)

**Objetivo:** capa técnica del transcreate (complemento a Flow 5). Entiende qué pasa detrás del botón `Apply`, cómo interpretar `seo_localized_variants`, cómo detectar drift y cómo usar bulk review.

**Alcance:** aplica a los 3 tipos traducibles — **paquetes + actividades + blog** (hoteles NO; ver [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio)).

Shipping ref: [PR #238](https://github.com/weppa-cloud/bukeer-studio/pull/238) (W5 #219 transcreate lifecycle E2E) + [`docs/qa/pilot/transcreate-playbook.md`](../qa/pilot/transcreate-playbook.md) (QA side, cross-ref no duplicado).

### 8.1 Stream vs. manual override

Hay dos rutas técnicas:

| Ruta | Endpoint | Uso | Determinismo |
|------|----------|-----|--------------|
| **Stream** (UI default) | `POST /api/seo/content-intelligence/transcreate` (SSE) | Dashboard UI — lo que ves en Flow 5 | No determinístico (LLM) |
| **Manual override** (avanzado) | Mismo endpoint, payload `payloadV2` con draft pre-computado | Bulk imports, QA E2E | Determinístico |

Para 99% de tu operación usas Stream (Flow 5). Manual override es para el equipo cuando migra contenido desde un corpus externo.

### 8.2 Interpretar `seo_localized_variants`

Tabla clave: `seo_localized_variants`. Cada fila representa una overlay de un campo traducido para una tupla `(target_entity_type, target_entity_id, target_locale, field)`.

Estados (`status`):

| Estado | Significado | Acción siguiente |
|--------|-------------|------------------|
| `draft` | El LLM generó el campo, no revisado. | Revisar en dashboard (Flow 5) → Reviewed |
| `reviewed` | Un humano aprobó el draft. | Apply para publicar |
| `applied` | Publicado en `/en/...` (render público). | Ninguna. Drift puede marcarlo `stale`. |
| `stale` | Contenido base (es-CO) cambió después del apply → re-traducir. | Re-entrar Flow 5 para refrescar |

Relación con `seo_transcreation_jobs`: cada apply crea (o actualiza) un `seo_transcreation_jobs` row con el payload completo del LLM. `seo_localized_variants` es la overlay proyectada que el SSR renderiza.

### 8.3 Drift detection (`status='stale'`)

Cuando editas contenido es-CO de un paquete/actividad/blog que ya tiene traducción `applied` en en-US, el sistema marca el variant EN como `stale` ([[ADR-021]] drift policy).

**Dónde ves drift:**
- Dashboard `Coverage` → banner "N items con drift" (top del dashboard).
- `/dashboard/<websiteId>/ops/reconciliation` → lista de stale items con link al editor.
- Alertas opcionales en Slack (si el equipo configuró webhook de drift).

**Cómo re-aplicar tras drift:**
1. Abrir el item desde el drift banner (click → va directo al translation editor).
2. Disparar transcreate de nuevo (mismo Flow 5.a/b/c).
3. El nuevo draft refleja los cambios es-CO; revisar → Reviewed → Apply.
4. Variant vuelve a `applied` (deja de estar `stale`).

### 8.4 Bulk review (`/api/seo/translations/bulk`)

Cuando tienes varias traducciones en `reviewed` listas para publicar en batch:

1. Dashboard → seleccionar varios items con checkbox (todos en estado `reviewed`).
2. Botón "Apply seleccionados" → llama a `POST /api/seo/translations/bulk`.
3. El endpoint aplica los N jobs **atómicamente**: si uno falla, se revierten todos (salvaguarda contra apply parcial).
4. Resultado esperado: todos los variants pasan a `applied` + ISR fan-out se dispara una sola vez por tenant.

**Error común:** si uno de los items ya está `applied`, el endpoint devuelve 409 `TRANSCREATE_REVIEW_REQUIRED`. Deseleccionar el item ya aplicado y reintentar.

### 8.5 Checklist SEO por tipo de contenido

Tras aplicar una traducción, verifica estos campos en la URL `/en/...` correspondiente:

| Elemento | Package | Activity | Blog | Fuente |
|----------|---------|----------|------|--------|
| `<title>` | ✔ | ✔ | ✔ | `seo_localized_variants.field='meta_title'` |
| `<meta name="description">` | ✔ | ✔ | ✔ | `seo_localized_variants.field='meta_description'` |
| Open Graph `og:title` + `og:description` + `og:image` | ✔ | ✔ | ✔ | Overlay + social_image |
| Twitter card (`twitter:title` + `twitter:description`) | ✔ | ✔ | ✔ | Igual OG |
| `<link rel="canonical">` → `/en/<tipo>/<slug>` | ✔ | ✔ | ✔ | ADR-019 routing |
| `<link rel="alternate" hreflang="en-US">` + `hreflang="es-CO"` + `hreflang="x-default"` | ✔ | ✔ | ✔ | [[ADR-020]] |
| JSON-LD con `inLanguage: "en"` | ✔ | ✔ | ✔ | `components/seo/product-schema.tsx` + `landing-page-schema.tsx` |
| `FAQPage` JSON-LD (si definido) | ✔ | ✔ | ✔ | Flow 4 SEO editor |

Si un item falla la checklist:
- `inLanguage` mal → regresión #208 (threading). Reportar al equipo.
- `hreflang="en-US"` falta → ADR-020 gate failed. Verificar que `seo_transcreation_jobs.status='applied'` para el item.
- `x-default` falta → `websites.content.locale` o `default_locale` mal configurado. Ticket al equipo.

---

## FAQ — preguntas frecuentes

### Cover image no se actualiza en cards

**Síntoma:** cambiaste la portada del paquete pero las cards del home siguen mostrando la anterior.

**Causa:** ventana ISR + cache CDN.

**Resolución:**
1. Esperar hasta 60 s (ISR window).
2. Si persiste, probar la URL directa `curl -I https://<tu-dominio>/paquetes/<slug>` y leer header `cf-cache-status`:
   - `HIT` = Cloudflare aún sirve cache viejo → esperar o pedir purge.
   - `MISS` / `EXPIRED` = ya tomó el valor nuevo → forzar refresh del navegador (Ctrl+Shift+R).
3. Si sigue mal después de 5 min, [Cómo pedir ayuda](#cómo-pedir-ayuda).

### El badge de IA no desaparece

**Síntoma:** editaste el texto manualmente pero sigue apareciendo "Generado por IA".

**Causa:** el flag `*_ai_generated=true` no se limpia automáticamente en todos los casos.

**Resolución:** un admin puede correr un override manual `ai_generated=false` en el campo afectado. Avísale al equipo en el canal de soporte con el slug del paquete y el campo (description / highlights / etc.).

### Sitemap incluye páginas ocultas

**Síntoma:** oculté una sección / página y aparece en `sitemap.xml`.

**Causa:** la regla `robotsNoindex` per-page controla la inclusión en el sitemap. "Ocultar" una sección dentro de un producto no saca al producto del sitemap — lo oculta del render.

**Resolución:**
- Si quieres que la página completa NO esté en sitemap → Flow 4 → marca `noindex`.
- Si solo quieres ocultar una sección dentro de una página que sigue indexable → Flow 3 (toggle de visibilidad).
- Referencia: [[ADR-019]] `docs/architecture/ADR-019-multi-locale-url-routing.md` (reglas de sitemap inclusion).

### Language switcher salta al homepage

**Síntoma:** hago clic en "EN" y me manda al home, no al equivalente en inglés de la página actual.

**Causa:** comportamiento fallback de [[ADR-019]]: si la ruta actual no tiene traducción aplicada (`Applied`) en el locale target, el switcher hace fallback al home de ese locale en lugar de dejarte en una URL rota.

**Resolución:**
- Traduce la página (Flow 5) → aplicar → el switcher respeta la ruta específica.
- Mientras tanto, la coverage matrix te dice qué falta traducir.

### Por qué los hoteles se editan en Flutter y no en Studio

**Respuesta corta:** decisión de ownership confirmada con cliente el 2026-04-19 para el pilot.

**Respuesta larga:** hoteles tienen un catálogo canónico mantenido en la app Flutter del equipo operaciones (availability, pricing, inventory). Duplicar un editor de marketing en Studio sin la RPC correspondiente generaría drift. Para el pilot:

- **Marketing + contenido de hotel** → editar en Flutter (equipo catálogo).
- **Meta SEO del hotel** → editar en Studio (Flow 4).
- **Traducción del hotel** → fuera de scope pilot (hoteles NO están en Flow 5).

Post-pilot: si se construye `update_hotel_marketing_field` RPC, Studio podría adoptar la edición. Ver [[ADR-025]] `docs/architecture/ADR-025-studio-flutter-field-ownership.md` y `.claude/rules/cross-repo-flutter.md`.

### Por qué no hay date picker todavía

**Respuesta corta:** Booking V1 diferido post-pilot por decisión del cliente el 2026-04-19.

**Respuesta larga:** el pilot sale a producción con WhatsApp + teléfono como canales de conversión. Agregar date picker + formulario de lead requiere endpoint `/api/leads` activo + validación + analytics nuevo, todo diferido. Ver [Flow 2](#flow-2--reservas--booking-deferred-post-pilot), [[ADR-024]] `docs/architecture/ADR-024-booking-v1-pilot-scope.md`, issue [#217](https://github.com/weppa-cloud/bukeer-studio/issues/217).

### Sesión expira

**Síntoma:** veo pantalla de login o "Tu sesión ha expirado".

**Resolución:** volver a iniciar sesión con tus credenciales. Si no tienes las credenciales, [Cómo pedir ayuda](#cómo-pedir-ayuda).

### Cambio no se refleja

**Síntoma:** guardé un cambio en Studio y no se ve en el sitio público.

**Resolución en orden:**
1. Esperar hasta 60 s (ventana ISR).
2. Forzar refresh del navegador (Ctrl+Shift+R).
3. Probar en ventana privada / otro navegador para descartar cache local.
4. Si persiste, avisar al equipo con el slug afectado.

### Error 429

**Síntoma:** ves "429 Too Many Requests" al disparar un transcreate.

**Estado actual (pilot, priority v2):** **esperado, NO es bug**. La API real de transcreate impone un límite de 10 llamadas por día por combinación `(website × target_locale)`. El cliente aceptó esto explícitamente el 2026-04-19 (sin TM short-circuit, sin rate-limit mitigation).

**Qué hacer:**
1. Revisar el payload de respuesta: si `code = "RATE_LIMITED"`, es el límite diario.
2. Esperar ~24 h y retry — el contador se resetea por día.
3. Si el cliente necesita más traducciones el mismo día, escalar al equipo (decisión del release lead).
4. El flujo alterno (manual override con payload pre-computado) es de uso interno del equipo, NO del partner.

Ref QA: [`docs/qa/pilot/transcreate-playbook.md`](../qa/pilot/transcreate-playbook.md) §stream-abort — el spec E2E W5 acepta 429 como pass.

### Traducción parece no actualizarse

**Síntoma:** apliqué una traducción (`Applied`) y la URL `/en/...` sigue mostrando el texto viejo o en español.

**Resolución:**
1. Verifica que el estado está en `Applied` (no solo `Reviewed`).
2. Ventana ISR — esperar 60 s.
3. Refrescar navegador.
4. Distinguir entre:
   - **Coverage cache** (tablero de traducciones) — actualiza cada ~5 min.
   - **Render cache** (página pública) — ISR, ~60 s.
5. Si el coverage dice `Applied` pero la URL pública sigue en español → forzar revalidación (pedir al equipo correr `POST /api/revalidate` si hace falta).

### Flag studio_editor_v2 off — por qué aparece "Solo lectura"

**Síntoma:** entro a un editor y todos los campos están deshabilitados con mensaje "Solo lectura — este campo se edita en Flutter".

**Causa:** el flag `studio_editor_v2` está desactivado (globalmente, por cuenta o por sitio). Esto puede ser por un rollback preventivo post-incidente.

**Resolución:** contactar al equipo; el runbook de rollback [`docs/ops/studio-editor-v2-rollback.md`](../ops/studio-editor-v2-rollback.md) §8 documenta el proceso de re-habilitación.

**Diferencia importante:**
- "Solo lectura" en **actividad** → flag off (ver arriba).
- "Solo lectura" en **hotel** → comportamiento esperado (hotel es Flutter-owner, [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio)). NO es bug ni flag off.

### Variant A vs. Variant B — cómo distinguirlas

**Pregunta:** "veo 'Solo lectura' en una actividad — ¿es Variant B?"

**Respuesta corta:** NO. Actividades son Variant A default (Studio native, editable) post-W2 ([Flow 6](#flow-6--editar-una-actividad-variant-a--studio-native)). Solo hoteles son Variant B (Flutter handoff, read-only en Studio — [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio)).

| Tipo | Variant | Editor canónico | Expectativa Studio |
|------|---------|----------------|--------------------|
| **Package** | A | Studio | Editable (marketing + content + SEO + translation) |
| **Activity** | A (post-W2) | Studio | Editable (marketing + content + SEO + translation) |
| **Hotel** | B | Flutter | Read-only en Studio. Solo SEO meta editable. |
| **Blog** | A | Studio | Editable (editor + translation) |

Si ves "Solo lectura" en pkg / activity / blog → es el flag `studio_editor_v2` off. Reportar al equipo con SLA crítico si es cutover day.

### Por qué veo hoteles pero no los puedo editar en Studio

**Respuesta corta:** política de ownership. Hoteles son Flutter-owner por [[ADR-025]]; Studio los muestra en read-only para que el partner vea el catálogo pero los cambios van por Flutter.

**Respuesta larga:** ver [Flow 7 — Hotel Flutter handoff](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio) y [FAQ — Por qué los hoteles se editan en Flutter](#por-qué-los-hoteles-se-editan-en-flutter-y-no-en-studio).

**Handoff protocol:** para solicitar un cambio de hotel, usar Slack `#pilot-colombiatours` con slug + campo + valor viejo/nuevo + screenshot (ver Flow 7).

### Por qué mi transcreate bulk falló parcialmente

**Síntoma:** seleccioné 5 items para bulk apply, 4 pasaron pero 1 falló — y me dicen que "se revirtieron todos".

**Causa:** el endpoint `/api/seo/translations/bulk` es **atómico por diseño** (Flow 8.4). Si un item falla, los otros 4 también se revierten. Esto previene estados parciales (mitad en `applied`, mitad en `reviewed`).

**Resolución:**
1. Identificar cuál falló (el endpoint devuelve el ID + código de error en el payload de respuesta).
2. Si el error es `TRANSCREATE_REVIEW_REQUIRED` → ese item ya estaba `applied`. Deseleccionarlo y reintentar.
3. Si el error es 429 → esperar y reintentar (ver FAQ "Error 429").
4. Si el error es 5xx inesperado → reportar al equipo.

### Cómo pedir ayuda

**Canal primario:** Slack — canal `#pilot-colombiatours` (invitación enviada pre-cutover).

**SLA pilot:**
- Incidente crítico (sitio caído, error rate > 2%) → respuesta ≤ 10 min dentro de horario operativo.
- Duda operativa (cómo editar X, dónde está Y) → respuesta ≤ 1 día hábil.
- Request de cambio (nuevo feature, reescribir doc) → triage en sync semanal.

**Información que necesitamos cuando reportas:**
- URL afectada.
- Slug del producto / paquete / blog.
- Captura de pantalla si es UI.
- Hora aproximada del problema.
- Qué esperabas vs qué viste.

---

## Qué **NO** debes hacer

Esta sección es vinculante. Hacer cualquiera de estas cosas puede romper el sitio o perder datos.

1. **NO ejecutar `supabase migration down`** (aplica a cualquier migración, pero especialmente a migraciones del repo Flutter `#752`, `#753`, `#754`). Las migraciones son forward-only. Ver `docs/ops/product-landing-v1-runbook.md` §8.3.
2. **NO landear migraciones Flutter en la ventana cutover ±24 h.** Preflight §5.2 del pilot runbook.
3. **NO editar manualmente el blob JSON `theme.tokens` en la DB.** Usa Studio o un theme-sdk preset.
4. **NO correr `npm run test:e2e` directo** desde un agente o terminal local. Usar siempre el session pool (`npm run session:run`). Puerto 3000 es exclusivo para dev manual. Ver `.claude/rules/e2e-sessions.md`.
5. **NO ejecutar `wrangler deploy` local para producción.** Todos los deploys prod van por CI (auditoría). Ver `docs/ops/product-landing-v1-runbook.md` §3.3.
6. **NO saltarse el gate `@p0-seo`** sin justificación escrita del release lead. Ver `docs/ops/ci-seo-i18n-gate.md` §Emergency bypass.
7. **NO intentar editar hotel marketing/content en Studio.** Hotel es Flutter-owner. Usa el handoff protocol o el equipo catálogo. SEO del hotel sí va en Studio (Flow 4).
8. **NO exponer date picker / lead form en pilot cutover.** Booking V1 está DEFERRED.

---

## Cheat-sheet "Si ves X, haz Y"

| Si ves... | Haz... |
|-----------|--------|
| "Solo lectura" en un editor de pkg / act / blog | [FAQ Flag](#flag-studio_editor_v2-off--por-qué-aparece-solo-lectura) — contactar equipo (flag off) |
| "Solo lectura" en hotel | Esperado — [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio), usar handoff Flutter |
| Badge "Generado por IA" que no se va | [FAQ IA](#el-badge-de-ia-no-desaparece) — pedir override manual |
| Cambio guardado pero invisible en público | [FAQ ISR](#cambio-no-se-refleja) — esperar 60 s + refresh forzado |
| Cover vieja en las cards del home | [FAQ cover](#cover-image-no-se-actualiza-en-cards) — probe `cf-cache-status` |
| Sitemap incluye una página que oculté | [FAQ sitemap](#sitemap-incluye-páginas-ocultas) — usar `noindex` en Flow 4, no solo hide |
| Language switcher salta al home | [FAQ switcher](#language-switcher-salta-al-homepage) — traducir la página (Flow 5) |
| Hotel no aparece en editor marketing | [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio) — es Flutter-owner |
| Cliente pregunta por botón "Reservar" | [FAQ booking](#por-qué-no-hay-date-picker-todavía) — Booking DEFERRED |
| Error 429 en transcreate | [FAQ 429](#error-429) — esperar 24 h, es el límite diario (no bug) |
| Traducción aplicada pero público en español | [FAQ render](#traducción-parece-no-actualizarse) — distinguir coverage cache vs render cache |
| Necesito editar una actividad (marketing/contenido) | [Flow 6](#flow-6--editar-una-actividad-variant-a--studio-native) — Variant A Studio native |
| Necesito cambiar marketing de un hotel | [Flow 7](#flow-7--hotel-flutter-handoff-variant-b--read-only-studio) — handoff Slack al equipo Flutter |
| Drift alert sobre traducción stale | [Flow 8.3](#83-drift-detection-statusstale) — re-disparar transcreate del item |
| Quiero aplicar varias traducciones en batch | [Flow 8.4](#84-bulk-review-apiseotranslationsbulk) — bulk atómico |
| Confundido entre Variant A y Variant B | [FAQ Variant](#variant-a-vs-variant-b--cómo-distinguirlas) — tabla de expectativas |

---

## Cómo pedir ayuda

- **Canal Slack:** `#pilot-colombiatours`
- **SLA crítico:** ≤ 10 min (error rate > 2%, sitio caído).
- **SLA operativo:** ≤ 1 día hábil (dudas, cómo editar X).
- **Incluir siempre:** URL + slug + screenshot + hora + expectativa vs realidad.

---

**Cambios en este documento:** se versiona con el repo. Screencasts (W7-c) reemplazarán los `{{screenshot-placeholder}}` + `[SCREENSHOT: ...]` markers cuando se graben contra la UI final post-cutover.

**Referencias rápidas:**
- [`docs/ops/pilot-runbook-colombiatours.md`](../ops/pilot-runbook-colombiatours.md) — runbook operacional cutover.
- [`docs/ops/cutover-checklist.md`](../ops/cutover-checklist.md) — checklist cutover day.
- [`docs/qa/pilot/transcreate-playbook.md`](../qa/pilot/transcreate-playbook.md) — playbook QA transcreate (W5 #219).
- [[ADR-003]] · [[ADR-005]] · [[ADR-018]] · [[ADR-019]] · [[ADR-020]] · [[ADR-021]] · [[ADR-023]] · [[ADR-024]] · [[ADR-025]].

**Shipping refs W7-b (docs-only):**
- W2 #216 → [PR #229](https://github.com/weppa-cloud/bukeer-studio/pull/229) (activities RPC + editors — Flow 6).
- W4 #218 → [PR #237](https://github.com/weppa-cloud/bukeer-studio/pull/237) (editor→render E2E).
- W5 #219 → [PR #238](https://github.com/weppa-cloud/bukeer-studio/pull/238) (transcreate lifecycle — Flow 8).
- W6 #220 → [PR #239](https://github.com/weppa-cloud/bukeer-studio/pull/239) (matrix visual playbook).
- W7-a → [PR #230](https://github.com/weppa-cloud/bukeer-studio/pull/230) (onboarding Flows 1-5 + runbook + checklist).
