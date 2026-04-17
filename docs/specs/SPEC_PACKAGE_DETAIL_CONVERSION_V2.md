# SPEC: Package Detail — Conversion Upgrade v2

**Estado**: Draft
**Fecha**: 2026-04-17
**Autor**: Yeison Gomez
**Prioridad**: Alta
**Rev**: 1

---

## 1. Contexto y Problema

Auditoría UX/conversión del 2026-04-17 sobre `/site/colombiatours/paquetes/paquete-eje-cafetero-4-d-as` (viewports 1440×900 y 390×844) detectó fallos en los 4 *gaps* de conversión (curiosidad, confianza, expectativa, pérdida). La página renderiza pero no persuade.

**Hallazgos críticos:**

1. Sección `Circuito del viaje` no muestra mapa — sólo chips de texto (ej. `1 Salento`). Producto "paquete" tiene el mapa como activo visual central.
2. Hero sin CTA, sin chips (duración, pax, rating). Sólo título + precio.
3. `Itinerario` + `Programa` duplicados. Timeline con huecos visuales grandes (saltos 3→8).
4. `Incluye / No incluye` sólo muestra columna "Incluye" (columna "No incluye" vacía).
5. Copy interno filtrado: `1 pax 2025`, `Plan PAM`, `Pasaporte Natural`, `Transporte privado 1 a 3 pax 2025`.
6. CTA final es link de texto (`Solicitar cotizacion`). No WhatsApp destacado, no botón.
7. Sin galería expandida, sin video, sin FAQ visible, sin trust badges visibles (infra existe).
8. Sticky CTA bar existe (`StickyCTABar`) pero percepción en auditoría indica baja prominencia.

**Infra existente a aprovechar:**

- `components/pages/product-landing-page.tsx` orquesta todo
- `components/site/sticky-cta-bar.tsx` ya soporta WhatsApp + tel
- `components/site/whatsapp-url.ts` (builder)
- `components/site/product-faq.tsx`, `trust-badges.tsx`, `program-timeline.tsx`, `highlights-grid.tsx`, `meeting-point-map.tsx`, `reviews-block.tsx`
- `lib/products/package-circuit.ts` devuelve stops (string[]) derivados del itinerario — sin coordenadas

**Decisión guía:** Cero formularios. WhatsApp = CTA único. Mapa = componente nuevo sobre MapLibre respetando ADR-015.

---

## 2. Alcance

### En scope

1. **Mapa del circuito** (P0) — nuevo `<PackageCircuitMap>` con MapLibre, markers numerados por día, polyline entre stops, popup con foto/título del día. Fallback SVG/lista si WebGL falla (ADR-015).
2. **Geocoding de stops** — tabla estática `lib/products/city-coords.ts` con lat/lng de `KNOWN_CITIES` (Cartagena, Salento, Medellín, etc.). Sin dependencia de servicio externo.
3. **Hero enriquecido** — chips `{duración} · {rating} · {grupo}` + botón WhatsApp inline + precio desde.
4. **Sanear copy interno** — pipeline en `normalizeProduct`/`formatCircuitStops` que esconda strings con patrón `\b(plan|pax|visitor|\d{4})\b` y formatee etiquetas comerciales.
5. **"No incluye" fallback** — lista por defecto configurable por cuenta (`websites.content.package_defaults.no_incluye`) + lista hardcoded fallback.
6. **Fusionar Itinerario + Programa** — un solo bloque `Día a día`, renumerado 1..N consecutivo, sin saltos.
7. **Descripción emocional** — si `product.description` vacío o < 80 chars, generar placeholder a partir de nombre + location usando plantilla (no IA en runtime).
8. **CTA WhatsApp reforzado** — botón primario en hero, en sticky bar, en bloque final. Ningún formulario. Tel secundario.
9. **Analytics** — eventos `map_marker_click`, `whatsapp_cta_click` (ya existe), `gallery_open`, `sticky_cta_click` por posición.
10. **Schema.org** — extender `ProductSchema` con `TouristTrip` + `Offer` + `AggregateRating` cuando hay reviews.
11. **FAQ default** — si `product.faq` vacío y tipo=package, montar 6 FAQs estándar desde `lib/products/package-faqs-default.ts`.
12. **Trust badges default** — si `website.content.account.trust_badges` vacío, mostrar set mínimo (RNT, Anato, años).

### Fuera de scope

- Formularios de cotización (explícitamente excluidos).
- Selector de fecha + pax con precio dinámico (requiere backend pricing engine).
- Video hero autoplay (P1 aparte).
- Cross-sell "Otros paquetes similares" (P2).
- Migración de datos en bukeer-flutter (copy del CMS — recomendación aparte).
- Escasez dinámica / anclaje de precio.
- A/B testing harness.

---

## 3. User Flows

### Flow 1 — Visitante mobile llega, ve mapa, contacta WhatsApp

```
GET /site/colombiatours/paquetes/paquete-eje-cafetero-4-d-as (390×844)
  |
SSR → ProductLandingPage
  | Hero: imagen + H1 + chips "4D/3N · 5★ · 1-3 pax" + botón WhatsApp visible
  | Highlights: 3 chips con íconos reales
  | [Mapa del circuito] — MapLibre carga, muestra 4 markers Pereira→Salento→Cocora→Finca
  |   usuario toca marker día 2 → popup con "Salento: pueblo cafetero, 2h desde Pereira"
  |   emite map_marker_click {day:2, city:"Salento"}
  | Día a día (timeline renumerado, sin huecos)
  | Incluye (lista) + No incluye (lista fallback visible)
  | Testimoniales Google
  | CTA final: botón WhatsApp grande + tel secundario
  | Sticky bar inferior: "$3.7M · Reservar por WhatsApp"
  |
usuario toca sticky → abre wa.me con mensaje prellenado
  → trackEvent whatsapp_cta_click {position:"sticky", product_id}
```

### Flow 2 — WebGL no disponible (navegador viejo / iframe restringido)

```
PackageCircuitMap monta
  | detecta WebGL fail (ADR-015)
  | render fallback: lista numerada de stops con íconos pin + línea SVG conectora
  | sin mapa interactivo, pero información del circuito preservada
```

### Flow 3 — Paquete sin coordenadas conocidas

```
getPackageCircuitStops → ["Ciudad Inventada", "Salento"]
  | city-coords.ts lookup: "Ciudad Inventada" → undefined, "Salento" → [lat,lng]
  | PackageCircuitMap:
  |   si <2 stops tienen coords → render fallback lista (no mapa)
  |   si ≥2 tienen coords → render mapa sólo con esos, resto como chips debajo
```

### Flow 4 — Descripción vacía en DB

```
product.description = "4 Días"
  | normalizeProduct detecta length < 80
  | generatePackageDescription({name, location, days}) → plantilla
  |   "Vive 4 días descubriendo el Eje Cafetero. Desde los paisajes del Valle del Cocora
  |    hasta las fincas productoras de café, una experiencia pensada para conectar con…"
  | renderiza texto generado marcado con `data-generated="true"` para futura sustitución
```

### Flow 5 — Usuario desktop usa CTA final

```
scroll hasta "¿Listo para vivir esta experiencia?"
  | bloque muestra: botón WhatsApp (primario, verde), botón tel (secundario)
  | sin formulario
  | click WhatsApp → wa.me con mensaje: "Hola, me interesa el paquete {nombre} ({URL})"
  | trackEvent whatsapp_cta_click {position:"final_cta"}
```

---

## 4. Acceptance Criteria

### AC1 — Mapa del circuito renderiza
- **Dado** paquete con ≥2 stops geocodables,
  **cuando** se visita la página,
  **entonces** `<PackageCircuitMap>` monta un mapa MapLibre con markers numerados y polyline.
- Markers muestran número de día y abren popup con ciudad al tap/hover.
- Estilo respeta `--accent` y `--chart-*` tokens (ADR-015 §4).
- Sin WebGL → fallback lista numerada (no blank container).

### AC2 — Hero convierte
- Hero incluye en viewport visible: imagen, H1, chip de duración (`4 días / 3 noches`), chip de pax (`1-3 personas`), chip de rating (si ≥1 review), precio desde, botón `Reservar por WhatsApp`.
- Botón WhatsApp dispara `whatsapp_cta_click {position:"hero"}`.

### AC3 — Día a día unificado
- Sólo existe un bloque `Día a día` (antes eran `Itinerario` + `Programa`).
- Items numerados 1..N consecutivos, sin saltos.
- Timeline sin huecos verticales > 32px entre items.
- Cada día muestra: número, título limpio, descripción sin strings internos.

### AC4 — Incluye / No incluye completo
- Columna "Incluye" siempre renderiza con al menos 1 item.
- Columna "No incluye" siempre renderiza con al menos 3 items (fallback si vacío).
- Items son copy legible (sin `Plan PAM`, `1 a 3 pax 2025`, años sueltos).

### AC5 — Copy sanitization
- Ningún string user-visible contiene patrones: `/\b\d pax \d{4}\b/`, `/Plan PAM/i`, `/Visitor/i` como standalone, `/\d{4}$/` al final.
- Nombre del paquete en H1 no contiene sufijos `1 pax`, `2 pax`.

### AC6 — WhatsApp = único CTA transaccional
- No existen `<form>` con input de email o submit de cotización en la página.
- `StickyCTABar` visible en mobile tras 200px scroll.
- Mensaje prellenado WhatsApp incluye nombre del paquete y URL canónica.

### AC7 — Schema.org extendido
- `<script type="application/ld+json">` contiene `TouristTrip` con `itinerary`, `offers`, `aggregateRating` (si reviews).
- Rich Results Test no reporta errores críticos.

### AC8 — Analytics
- `map_marker_click`, `whatsapp_cta_click`, `gallery_open`, `sticky_cta_click` emiten con contexto `{product_id, product_type, position?}`.

### AC9 — Resiliencia
- Sin fotos del producto → hero usa fallback de website (ADR-015 §3 análogo).
- Sin coordenadas → circuit cae a modo lista.
- Sin FAQ data → 6 FAQs genéricas por tipo "package".
- Sin description → placeholder generado.

### AC10 — Performance
- LCP < 2.5s desktop / < 3.0s mobile en red 4G simulada.
- CLS < 0.1.
- Mapa carga lazy (dynamic import, no bloquea hidratación).

---

## 5. Edge Cases

| # | Caso | Comportamiento |
|---|---|---|
| EC1 | Paquete sin itinerary_items | Oculta bloque Día a día; mantiene resto de secciones |
| EC2 | Stops < 2 con coords | Renderiza lista numerada, no mapa |
| EC3 | website.content.social.whatsapp = null | Oculta botones WhatsApp, muestra sólo tel; si tampoco hay tel, muestra email mailto |
| EC4 | Description contiene sólo números/fechas | Tratar como vacío y usar placeholder |
| EC5 | reviews.length = 0 | Oculta bloque "Lo que dicen"; omite AggregateRating del schema |
| EC6 | Mapa style URL 404 | Fallback según ADR-015 §2 (lista) |
| EC7 | Nombre paquete contiene "1 pax" | Stripper en `normalizeProduct` limpia antes del H1 y metadata |
| EC8 | `no_incluye` en DB pero sólo tiene 1 ítem | Completa hasta 3 con defaults, sin duplicar |
| EC9 | Galería = 1 imagen | No muestra controles next/prev; lightbox permanece funcional |
| EC10 | Usuario sin JS | Hero + contenido estático + `<a href="https://wa.me/...">` funcional; mapa degrada a lista (SSR-safe) |

---

## 6. Data Model

### Nuevos archivos

```ts
// lib/products/city-coords.ts
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'salento':          { lat: 4.6378,  lng: -75.5708 },
  'pereira':          { lat: 4.8087,  lng: -75.6906 },
  'filandia':         { lat: 4.6744,  lng: -75.6603 },
  'cartagena':        { lat: 10.3910, lng: -75.4794 },
  'santa marta':      { lat: 11.2408, lng: -74.1990 },
  'medellin':         { lat: 6.2442,  lng: -75.5812 },
  'bogota':           { lat: 4.7110,  lng: -74.0721 },
  'guatape':          { lat: 6.2328,  lng: -75.1600 },
  'villa de leyva':   { lat: 5.6340,  lng: -73.5258 },
  'san andres':       { lat: 12.5567, lng: -81.7185 },
  'barichara':        { lat: 6.6377,  lng: -73.2233 },
  'zipaquira':        { lat: 5.0265,  lng: -74.0044 },
  'cali':             { lat: 3.4516,  lng: -76.5320 },
  'leticia':          { lat: -4.2153, lng: -69.9406 },
  'santa rosa de cabal': { lat: 4.8692, lng: -75.6237 },
  'valle del cocora': { lat: 4.6406,  lng: -75.4860 },
};

export function lookupCityCoords(city: string): { lat: number; lng: number } | null { /* normalize + map */ }
```

```ts
// lib/products/package-faqs-default.ts
export const PACKAGE_FAQS_DEFAULT = [
  { q: '¿Incluye vuelos?', a: '…' },
  { q: '¿Cuál es la política de cancelación?', a: '…' },
  { q: '¿Qué debo llevar?', a: '…' },
  { q: '¿Hay edad mínima o máxima?', a: '…' },
  { q: '¿Las actividades son aptas para todo el mundo?', a: '…' },
  { q: '¿Puedo personalizar el paquete?', a: '…' },
];
```

```ts
// components/site/package-circuit-map.tsx (NUEVO)
interface PackageCircuitMapProps {
  stops: Array<{ city: string; lat: number; lng: number; day?: number; title?: string; photo?: string }>;
  className?: string;
}
```

### Modificaciones

- `components/pages/product-landing-page.tsx` — reemplaza bloque Circuito (líneas 821-844) por `<PackageCircuitMap>`; fusiona `Itinerario` + `Programa` en bloque único `Día a día`.
- `lib/products/package-circuit.ts` — agrega `withCoords(stops: string[]): Array<{city, lat, lng}>` que filtra stops geocodados.
- `lib/products/normalize-product.ts` — añadir sanitización de strings (stripper de patrones internos).
- `components/seo/product-schema.tsx` — extender `buildProductSchema` con `TouristTrip` cuando `productType==='package'`.

### Sin migración de DB

Geocoding, FAQ defaults y "no incluye" fallback son estáticos (bundled). Copy real mejora viene de actualizar registros en `package_kits` desde Flutter admin (tarea aparte del equipo de contenido).

### Opcional (Fase 2, no en este spec)

Nuevo campo `package_kits.waypoints jsonb` para override manual de coordenadas/fotos por stop — requiere migración en bukeer-flutter.

---

## 7. Permissions

- **Público** (sin auth): lee rendering SSR. Sin cambios RBAC.
- `SUPABASE_SERVICE_ROLE_KEY` no usado en rutas nuevas.
- `NEXT_PUBLIC_MAP_STYLE_URL` / `NEXT_PUBLIC_MAP_STYLE_TOKEN` ya existen (ADR-015 §5). Sin variables nuevas.

---

## 8. L10N

Página es `es` only en MVP actual. Todos los strings nuevos:

- Centralizar en `lib/l10n/package-landing.ts` con keys tipo `package.hero.book_whatsapp`, `package.circuit.title`, `package.day_by_day.title`, `package.includes.title`, `package.excludes.title`, `package.excludes.fallback.*`, `package.faq.defaults.*`.
- Estructura similar a `lib/l10n/app_es.arb` del repo Flutter pero como módulo TS. Preparada para variantes futuras (`en`, `pt`).
- `normalizeLanguage()` ya existe en `components/seo/product-schema.tsx` — reusar para locale del schema.

---

## 9. ADRs Relevantes

| ADR | Aplica a |
|-----|----------|
| ADR-001 Server-First Rendering | Toda la página sigue SSR + ISR (`revalidate = 300` ya presente) |
| ADR-002 Error Handling | `<SectionErrorBoundary>` ya envuelve secciones; nuevo mapa envuelto igual |
| ADR-003 Contract-First Validation | Si se añade `waypoints` al contract (Fase 2), pasa por `packages/website-contract/src/schemas/` con Zod |
| ADR-009 Multi-tenant Subdomain | Sin cambios; ruta `/site/[subdomain]/paquetes/[slug]` se preserva |
| ADR-015 Resilient Map Rendering | **Crítico.** `PackageCircuitMap` hereda reglas: hydration-safe paint, WebGL fallback, style fallback, theme tokens, env contract |
| ADR-022 Auth Token Boundary | Página pública, sin tokens expuestos |

---

## 10. Analytics

### Eventos nuevos

| Evento | Props | Cuándo |
|---|---|---|
| `map_marker_click` | `{product_id, product_type:'package', day, city}` | Tap/click marker |
| `gallery_open` | `{product_id, image_index}` | Abrir lightbox |
| `sticky_cta_click` | `{product_id, channel:'whatsapp'|'tel'}` | Click sticky bar |

### Existentes reusados

- `whatsapp_cta_click` con `position` (`hero` | `final_cta` | `sticky` | `inline`).
- `phone_cta_click`.

### Funnel

`page_view → scroll_50 → scroll_90 → {whatsapp_cta_click | phone_cta_click}`.

---

## 11. Plan de Implementación (sugerido)

1. **PR 1** — `city-coords.ts` + `withCoords()` helper en `package-circuit.ts` + tests.
2. **PR 2** — `<PackageCircuitMap>` componente + fallback + tests E2E.
3. **PR 3** — Wiring en `ProductLandingPage`: hero enriquecido + merge Día a día + WhatsApp CTA final.
4. **PR 4** — `normalize-product` stripper + `no-incluye` fallback + `package-faqs-default`.
5. **PR 5** — Schema `TouristTrip` + analytics nuevos + smoke vía `/qa-nextjs`.

Cada PR: pasa `tech-validator` MODE: CODE + Lighthouse gate (`scripts/lighthouse-ci.sh`).

---

## 12. Métricas de Éxito

Baseline previo a merge (Lighthouse + GA4):

- LCP mobile objetivo ≤ 3.0s (medir con `lighthouse-ci.sh`).
- CTR WhatsApp: baseline vs post (GA4 `whatsapp_cta_click` / `page_view`).
- Scroll-depth 90%: baseline vs post.
- Rebote: baseline vs post a 30 días.

---

## 13. Referencias

- Auditoría: conversación 2026-04-17 (screenshots en `/tmp/bukeer-audit/`)
- ADR-015: `docs/architecture/ADR-015-resilient-map-rendering-and-marker-media-fallback.md`
- Contract: `packages/website-contract/src/types/product.ts`
- Componente actual: `components/pages/product-landing-page.tsx`
- Circuit helper: `lib/products/package-circuit.ts`
- WhatsApp builder: `components/site/whatsapp-url.ts`
- Sticky bar: `components/site/sticky-cta-bar.tsx`
- Patrones 2026: [VWO travel bookings](https://vwo.com/blog/increase-travel-website-bookings/), [Mapbox travel](https://www.mapbox.com/industries/travel), [TraveledMap itineraries](https://www.traveledmap.com/blog/articles/how-to-add-interactive-travel-itinerary-maps-to-a-travel-agency-website)
