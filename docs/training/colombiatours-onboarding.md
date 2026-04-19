# Onboarding ColombiaTours — Bukeer Studio (Pilot)

> **Audiencia:** Partner operativo de ColombiaTours (Rol 2 — gestor de contenido). **NO** requiere conocimientos de código, Supabase, ni despliegues.
>
> **Qué aprenderás:** cómo editar el contenido de tu sitio público (paquetes y actividades), cómo traducir contenido al inglés y cómo leer el tablero de cobertura SEO. Todo se hace desde Studio (interfaz web).

**Última revisión:** 2026-04-19.
**Versión doc:** W7-a skeleton (screencasts pendientes en W7-c).
**Issue tracker:** [#221](https://github.com/weppa-cloud/bukeer-studio/issues/221) · EPIC [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214).

---

## Tabla de contenido

1. [Antes de empezar](#antes-de-empezar)
2. [Flow 1 — Editar marketing de un paquete](#flow-1--editar-marketing-de-un-paquete)
3. [Flow 2 — Reservas / Booking (DEFERRED post-pilot)](#flow-2--reservas--booking-deferred-post-pilot)
4. [Flow 3 — Layout de secciones: hero, video, orden, ocultar, custom](#flow-3--layout-de-secciones-hero-video-orden-ocultar-custom)
5. [Flow 4 — SEO personalizado por página](#flow-4--seo-personalizado-por-página)
6. [Flow 5 — Traducción es-CO → en-US (3 sub-flows)](#flow-5--traducción-es-co--en-us-3-sub-flows)
7. [FAQ — preguntas frecuentes](#faq--preguntas-frecuentes)
8. [Qué **NO** debes hacer](#qué-no-debes-hacer)
9. [Cheat-sheet "Si ves X, haz Y"](#cheat-sheet-si-ves-x-haz-y)
10. [Cómo pedir ayuda](#cómo-pedir-ayuda)

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

1. **Picker.** Abrir dashboard de traducciones → filtrar por tipo `Package` → seleccionar paquete.
   [SCREENSHOT: Translations picker con filtro Package]
2. **Stream.** Disparar transcreate → UI muestra stream en vivo (ADR-021 pipeline).
   [SCREENSHOT: Transcreate stream en progreso]
3. **Corregir draft.** Revisa línea por línea. Edita términos, tono, keywords locales.
   [SCREENSHOT: Bilingual editor es-CO / en-US con diferencias resaltadas]
4. **Reviewed.** Marcar estado `Reviewed` cuando esté listo (opcional: segundo par de ojos).
   [SCREENSHOT: Estado Draft → Reviewed]
5. **Applied.** Botón `Apply` publica a `en`. Coverage matrix refresca.
   [SCREENSHOT: Apply action con confirmación]
6. **Verificar URL pública.** Abrir `/en/paquetes/<slug>` en nueva pestaña. Validar:
   - `<html lang="en">`
   - `<link rel="alternate" hreflang="en">` y contraparte en español
   - `<link rel="canonical" href="/en/paquetes/<slug>">`
   - JSON-LD con `inLanguage: "en"` en los campos traducibles
   [SCREENSHOT: URL pública /en/paquetes/<slug>]

### Flow 5.b — Traducir una actividad

Mismo ciclo; solo cambia el filtro y el path público:

1. Picker → filtro `Activity` → seleccionar.
2. Stream → corregir → Reviewed → Applied.
3. Verificar `/en/actividades/<slug>`.

[SCREENSHOT: Translations picker filtro Activity]
[SCREENSHOT: URL pública /en/actividades/<slug>]

### Flow 5.c — Traducir un blog post

1. Picker → filtro `Blog` → seleccionar post.
2. Stream → corregir → Reviewed → Applied.
3. Verificar `/en/blog/<slug>`.

[SCREENSHOT: Translations picker filtro Blog]
[SCREENSHOT: URL pública /en/blog/<slug>]

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

**Síntoma:** ves "429 Too Many Requests".

**Estado actual (pilot):** **no** debería ocurrir en operación normal. El cliente aceptó el uso directo de la API de transcreate sin mitigaciones de TM short-circuit. Si aparece, reportar al equipo.

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
| "Solo lectura" en un editor | [FAQ #11](#flag-studio_editor_v2-off--por-qué-aparece-solo-lectura) — contactar equipo |
| Badge "Generado por IA" que no se va | [FAQ #2](#el-badge-de-ia-no-desaparece) — pedir override manual |
| Cambio guardado pero invisible en público | [FAQ #7](#cambio-no-se-refleja) — esperar 60 s + refresh forzado |
| Cover vieja en las cards del home | [FAQ #1](#cover-image-no-se-actualiza-en-cards) — probe `cf-cache-status` |
| Sitemap incluye una página que oculté | [FAQ #3](#sitemap-incluye-páginas-ocultas) — usar `noindex` en Flow 4, no solo hide |
| Language switcher salta al home | [FAQ #4](#language-switcher-salta-al-homepage) — traducir la página (Flow 5) |
| Hotel no aparece en editor marketing | [FAQ #5](#por-qué-los-hoteles-se-editan-en-flutter-y-no-en-studio) — es Flutter-owner |
| Cliente pregunta por botón "Reservar" | [FAQ #6](#por-qué-no-hay-date-picker-todavía) — Booking DEFERRED |
| Error 429 | [FAQ #9](#error-429) — reportar (no debería ocurrir) |
| Traducción aplicada pero público en español | [FAQ #10](#traducción-parece-no-actualizarse) — distinguir coverage cache vs render cache |

---

## Cómo pedir ayuda

- **Canal Slack:** `#pilot-colombiatours`
- **SLA crítico:** ≤ 10 min (error rate > 2%, sitio caído).
- **SLA operativo:** ≤ 1 día hábil (dudas, cómo editar X).
- **Incluir siempre:** URL + slug + screenshot + hora + expectativa vs realidad.

---

**Cambios en este documento:** se versiona con el repo. Screencasts (W7-c) reemplazarán los `[SCREENSHOT: ...]` placeholders cuando se graben contra la UI final post-cutover.

**Referencias rápidas:**
- [`docs/ops/pilot-runbook-colombiatours.md`](../ops/pilot-runbook-colombiatours.md) — runbook operacional cutover.
- [`docs/ops/cutover-checklist.md`](../ops/cutover-checklist.md) — checklist cutover day.
- [[ADR-019]] · [[ADR-020]] · [[ADR-021]] · [[ADR-024]] · [[ADR-025]].
