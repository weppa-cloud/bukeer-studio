# SPEC: SEO Optimization Toolkit — AI Suggestions, Noindex UI, Bulk Actions

**Estado**: Draft  
**Fecha**: 2026-04-12  
**Autor**: Yeison Gomez + Claude  
**Prioridad**: Alta  
**Rev**: 1

---

## 1. Contexto y Problema

La auditoria SEO de 2026-04-12 (estilo Surfer SEO / SEMrush) revelo que Bukeer Studio tiene un **motor de scoring solido** (23 checks, 3 dimensiones, grades A-F) pero le faltan **herramientas de accion** para que el usuario cierre los gaps detectados.

**Situacion actual**:
- El SEO Audit Dashboard muestra scores y problemas, pero las sugerencias son reglas estaticas ("Agrega un titulo de 5-70 chars")
- No hay forma de generar titulos/descriptions optimizados con IA
- El campo `robots_noindex` existe en DB pero no tiene UI
- Para optimizar 50+ productos hay que entrar uno por uno
- `og:image` falta en la mayoria de paginas publicas
- Meta descriptions de paginas de categoria son genericas (32-39 chars vs 120-160 recomendados)

**Impacto medible**:
- CTR en SERPs reducido por descriptions cortas y sin rich snippets
- Sharing en redes sociales sin imagen = ~0% engagement
- Items con score D/F no tienen via rapida de mejora
- Tiempo de optimizacion por item: ~5 min manual vs ~10 seg con AI

---

## 2. Alcance

### En scope (4 features, priorizadas)

| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| F1 | **AI SEO Generator** — Boton "Generar con IA" en SEO Item Detail | Medium | Altisimo |
| F2 | **Toggle Noindex** — Switch en SEO Item Detail | Low | Alto |
| F3 | **og:image fallback** — En todas las rutas publicas | Low | Alto |
| F4 | **Bulk AI Apply** — "Optimizar todos" desde SEO Audit Dashboard | Medium | Altisimo |

### Fuera de scope

- Keyword research con datos de volumen/dificultad (requiere API tercero: SEMrush/Ahrefs)
- Historical score tracking (tabla + graficas — feature separado)
- Schema editor visual (complejidad alta, bajo ROI vs auto-generation)
- Content editor con score en tiempo real estilo Surfer (refactor grande del blog editor)
- Analisis de internal linking (requiere crawler interno)
- `rel="prev"/"next"` para paginacion del blog (optimizacion menor)

---

## 3. Feature F1 — AI SEO Generator

### 3.1 User Flow

```
Usuario abre SEO Item Detail (ej: Hotel "Casa del Mar")
  |
  v
Ve score D (45/100) con checks fallidos:
  - Missing SEO title
  - Description too short (32 chars)
  - No target keyword
  |
  v
Click boton [Generar con IA] (junto a campo SEO Title)
  |
  v
POST /api/ai/seo/generate
  body: { itemType, name, description, slug, targetKeyword?, existingTitle?, existingDesc?, locale }
  |
  v
Claude genera:
  {
    seoTitle: "Hotel Casa del Mar en Cartagena — Frente al Mar Caribe",
    seoDescription: "Disfruta de una estadia unica en Hotel Casa del Mar, ubicado frente al mar en Cartagena. Habitaciones con vista al Caribe, piscina infinita y desayuno incluido. Reserva con tu agencia de viajes.",
    targetKeyword: "hotel cartagena frente al mar",
    reasoning: "Titulo incluye nombre + ubicacion + atributo diferenciador. Description a 155 chars con CTA."
  }
  |
  v
UI muestra preview con diff vs actual:
  Titulo: [vacio] -> "Hotel Casa del Mar en Cartagena — Frente al Mar Caribe"
  Desc:   [32 chars] -> [155 chars con keyword]
  |
  v
Usuario puede:
  [Aplicar todo]  [Aplicar titulo]  [Aplicar descripcion]  [Regenerar]  [Descartar]
  |
  v
Al aplicar -> campos se llenan + score recalcula en tiempo real
  Score: D (45) -> B (82)
```

### 3.2 Variantes por tipo de item

| Tipo | Contexto adicional para el prompt | Keywords naturales |
|------|-----------------------------------|--------------------|
| `hotel` | amenities, star_rating, ubicacion (city/state) | "hotel [ciudad]", "alojamiento [atributo]" |
| `activity` | duration, inclusions, ubicacion | "que hacer en [ciudad]", "[actividad] en [ciudad]" |
| `transfer` | origen/destino, tipo vehiculo | "traslado [origen] [destino]", "transporte [ciudad]" |
| `package` | itineraryItems, duracion total, destinos | "paquete turistico [destino]", "viaje [destino] [dias] dias" |
| `destination` | hotel_count, activity_count, state | "viajar a [ciudad]", "que hacer en [ciudad]" |
| `page` | page title, section types | Segun contenido de la pagina |
| `blog` | title, excerpt, category | Long-tail del tema del post |

### 3.3 API Route

**Endpoint**: `POST /api/ai/seo/generate`

**Auth**: JWT (editor role: super_admin, admin, agent)

**Rate limit**: tier `editor` (20 req/min, $5/day cap)

**Request**:
```typescript
interface GenerateSeoRequest {
  itemType: SeoItemType;
  name: string;
  slug: string;
  description?: string;        // Contenido actual del item
  existingTitle?: string;       // Titulo SEO actual (para mejorar, no crear de cero)
  existingDescription?: string; // Desc actual
  targetKeyword?: string;       // Keyword objetivo si el usuario ya la definio
  locale?: string;              // Default 'es'
  context?: {
    city?: string;
    state?: string;
    amenities?: string[];
    starRating?: number;
    duration?: number;
    category?: string;          // Blog category
  };
}
```

**Response**:
```typescript
interface GenerateSeoResponse {
  seoTitle: string;         // 50-65 chars ideal
  seoDescription: string;   // 140-155 chars ideal
  targetKeyword: string;     // 2-4 word phrase
  reasoning: string;         // Explicacion en espanol de por que esta optimizado
  alternatives?: {           // 2 alternativas opcionales
    seoTitle: string;
    seoDescription: string;
  }[];
  usage: { promptTokens: number; completionTokens: number; cost: number };
}
```

**Costo estimado**: ~$0.003 por generacion (input corto + output structured)

**System prompt** (resumen):
```
Eres un experto en SEO para agencias de viaje en Latinoamerica.
Genera titulo SEO (50-65 chars), meta description (140-155 chars) y keyword objetivo.
Reglas:
- Titulo: nombre del item + ubicacion/atributo + brand signal
- Description: beneficio principal + 2 atributos + CTA implicito
- Keyword: 2-4 palabras, lenguaje natural, intent transaccional o informacional
- Idioma: {locale}
- NUNCA inventar datos que no esten en la description
```

### 3.4 UI Component

**Ubicacion**: Dentro de `components/admin/seo-item-detail.tsx`, en la seccion de Meta Tags Editor.

**Elementos**:
```
+----------------------------------------------------------+
| SEO Title                                    [Generar IA] |
| [_________________________________________________] 0/70 |
|                                                          |
| Meta Description                             [Generar IA] |
| [_________________________________________________]      |
| [_________________________________________________] 0/160|
|                                                          |
| Target Keyword                               [Generar IA] |
| [_________________________________________________]      |
+----------------------------------------------------------+

// Al hacer click en [Generar IA]:

+----------------------------------------------------------+
| Sugerencia IA                                            |
|                                                          |
| Titulo:                                                  |
| "Hotel Casa del Mar en Cartagena — Vista al Caribe"     |
|                                                          |
| Descripcion:                                             |
| "Disfruta una estadia frente al mar en Cartagena..."    |
|                                                          |
| Keyword: "hotel cartagena frente al mar"                 |
|                                                          |
| Razonamiento:                                            |
| "Titulo incluye nombre + ubicacion + atributo..."       |
|                                                          |
| [Aplicar todo] [Solo titulo] [Solo desc] [Regenerar]    |
+----------------------------------------------------------+
```

**Estados**: `idle` | `generating` (spinner) | `preview` (muestra sugerencia) | `error`

### 3.5 Acceptance Criteria

- [ ] AC-1: Boton "Generar con IA" visible junto a cada campo editable (title, description, keyword)
- [ ] AC-2: Click genera sugerencia en <3 segundos para cualquier tipo de item
- [ ] AC-3: Sugerencia respeta limites de caracteres (title 50-70, desc 120-160)
- [ ] AC-4: Titulo generado contiene el nombre del item y ubicacion/contexto
- [ ] AC-5: "Aplicar todo" llena los 3 campos y recalcula score inmediatamente
- [ ] AC-6: "Regenerar" produce una sugerencia diferente
- [ ] AC-7: Rate limit muestra toast "Limite alcanzado, intenta en X segundos"
- [ ] AC-8: Error de API muestra toast con mensaje generico, no expone detalles
- [ ] AC-9: Locale por defecto es 'es', genera en espanol
- [ ] AC-10: Funciona para los 7 tipos: hotel, activity, transfer, package, destination, page, blog

---

## 4. Feature F2 — Toggle Noindex

### 4.1 User Flow

```
Usuario abre SEO Item Detail
  |
  v
Ve seccion "Indexacion" con toggle:
  [x] Indexable (visible en Google)
  [ ] Noindex (oculto de buscadores)
  |
  v
Cambia toggle a Noindex
  |
  v
Confirmation dialog: "Esta pagina dejara de aparecer en Google. Continuar?"
  |
  v
[Confirmar] -> PATCH a tabla correspondiente -> robots_noindex = true
  |
  v
Sitemap se regenera sin este item (ISR, 5 min)
Meta tag: <meta name="robots" content="noindex, follow">
```

### 4.2 Tablas y campos

| Tipo | Tabla | Campo | Existe? |
|------|-------|-------|---------|
| `page` | `website_pages` | `robots_noindex` | Si (migration aplicada) |
| `hotel/activity/transfer` | `website_product_pages` | `robots_noindex` | Si (migration aplicada) |
| `destination` | `destination_seo_overrides` | `robots_noindex` | Si (migration aplicada) |
| `blog` | `website_blog_posts` | `robots_noindex` | **NO — necesita migration** |
| `package` | `package_kits` | `robots_noindex` | **NO — necesita migration** |

### 4.3 Acceptance Criteria

- [ ] AC-1: Toggle visible en SEO Item Detail para todos los tipos de item
- [ ] AC-2: Cambiar a noindex muestra dialog de confirmacion
- [ ] AC-3: Al confirmar, guarda `robots_noindex = true` en la tabla correcta
- [ ] AC-4: Item con noindex excluido del sitemap.xml (ya implementado para pages/products/destinations)
- [ ] AC-5: Item con noindex emite `<meta name="robots" content="noindex, follow">` en la pagina publica
- [ ] AC-6: Toggle off (re-indexar) no requiere confirmacion
- [ ] AC-7: Blog posts y packages necesitan migration para agregar el campo

### 4.4 Migrations necesarias

```sql
-- Migration: add robots_noindex to blog_posts and package_kits
ALTER TABLE website_blog_posts 
  ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;

ALTER TABLE package_kits 
  ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
```

---

## 5. Feature F3 — og:image Fallback en Rutas Publicas

### 5.1 Problema

Solo `/blog/[slug]` emite `og:image`. Todas las demas paginas (homepage, categorias, destinos listing, contacto, etc.) comparten en redes sin imagen.

### 5.2 Estrategia de fallback

```
og:image = 
  1. Item-specific image (post.featured_image, product.main_image, destination.image)
  2. Page hero background image (heroConfig.backgroundImage)
  3. Website hero image (website.content.hero.backgroundImage)
  4. Website logo (website.content.header.logo)
  5. null (omitir tag — mejor que imagen rota)
```

### 5.3 Implementacion

**Archivo**: `app/site/[subdomain]/[...slug]/page.tsx` — funcion `generateMetadata()`

**Archivo**: `app/site/[subdomain]/page.tsx` — funcion `generateMetadata()` (ya parcialmente implementado)

**Archivo**: `app/site/[subdomain]/blog/page.tsx` — blog listing (ya corregido en esta sesion)

**Helper** (nuevo o en `lib/seo/og-helpers.ts`):
```typescript
export function resolveOgImage(website: WebsiteData, itemImage?: string): string | undefined {
  return (
    itemImage ||
    website.content?.hero?.backgroundImage ||
    website.content?.header?.logo ||
    undefined
  );
}
```

### 5.4 Acceptance Criteria

- [ ] AC-1: Homepage emite og:image (hero background o logo)
- [ ] AC-2: Paginas de categoria (hoteles, actividades, etc.) emiten og:image
- [ ] AC-3: Destinos listing emite og:image
- [ ] AC-4: Contacto/nosotros emiten og:image
- [ ] AC-5: Blog listing emite og:image
- [ ] AC-6: Blog post emite og:image del featured_image (ya funciona)
- [ ] AC-7: Destino detail emite og:image de la imagen del destino
- [ ] AC-8: Si no hay ninguna imagen disponible, og:image se omite (no tag vacio)

---

## 6. Feature F4 — Bulk AI Apply

### 6.1 User Flow

```
Usuario abre SEO Audit Dashboard
  |
  v
Ve: Score promedio F, 35 items sin SEO title, 28 sin description
  |
  v
Click boton [Optimizar con IA] (junto a summary cards)
  |
  v
Modal de confirmacion:
  "Se generaran sugerencias SEO para 35 items sin titulo.
   Costo estimado: ~$0.10
   Tiempo estimado: ~2 minutos
   
   [ ] Solo items sin titulo SEO (35)
   [ ] Solo items sin descripcion (28)
   [x] Todos los items con score < C (42)
   
   [Iniciar]  [Cancelar]"
  |
  v
Progress bar: "Optimizando... 12/42 items"
  Cada item: POST /api/ai/seo/generate (secuencial, 500ms delay entre requests)
  |
  v
Resultado:
  "42 items optimizados. Score promedio: F -> B
   
   [Ver cambios] [Aplicar todos] [Revisar uno por uno]"
  |
  v
[Aplicar todos] -> Batch update a DB
  O
[Revisar uno por uno] -> Lista con diff por item, accept/reject individual
```

### 6.2 API Route

**Endpoint**: `POST /api/ai/seo/generate-bulk`

**Request**:
```typescript
interface BulkGenerateRequest {
  websiteId: string;
  filter: 'missing_title' | 'missing_description' | 'low_score';
  scoreThreshold?: number;  // Default 60 (grade C)
  dryRun?: boolean;         // true = solo genera, no guarda
}
```

**Response** (streaming via SSE para progress):
```typescript
// Cada item emite un evento:
interface BulkGenerateEvent {
  type: 'progress' | 'item_complete' | 'done' | 'error';
  current?: number;
  total?: number;
  item?: {
    id: string;
    type: SeoItemType;
    name: string;
    before: { seoTitle?: string; seoDescription?: string; score: number };
    after: { seoTitle: string; seoDescription: string; targetKeyword: string; score: number };
  };
  summary?: {
    processed: number;
    avgScoreBefore: number;
    avgScoreAfter: number;
    totalCost: number;
  };
}
```

### 6.3 Acceptance Criteria

- [ ] AC-1: Boton "Optimizar con IA" visible en SEO Audit Dashboard
- [ ] AC-2: Modal muestra conteo de items por filtro y costo estimado
- [ ] AC-3: Progress bar actualiza en tiempo real durante procesamiento
- [ ] AC-4: Cada item generado muestra before/after con score delta
- [ ] AC-5: "Aplicar todos" hace batch update sin recargar pagina
- [ ] AC-6: "Revisar uno por uno" permite accept/reject individual
- [ ] AC-7: Rate limit respetado (max 20 req/min) — procesamiento automaticamente espacia requests
- [ ] AC-8: Si el usuario cierra el modal, el procesamiento se cancela (AbortController)
- [ ] AC-9: Items ya con score A/B se saltan automaticamente
- [ ] AC-10: Costo total no excede $5/dia por cuenta (rate limit tier)

---

## 7. Data Model

### Tablas existentes (sin cambios)

| Tabla | Campos SEO | Notas |
|-------|-----------|-------|
| `products` | `seo_title`, `seo_description`, `target_keyword` | Hotels, activities, transfers |
| `package_kits` | `seo_title`, `seo_description`, `target_keyword` | Packages |
| `destinations` | `seo_title`, `seo_description`, `target_keyword` | Via destination_seo_overrides |
| `website_pages` | `seo_title`, `seo_description`, `target_keyword`, `robots_noindex` | Custom pages |
| `website_blog_posts` | `seo_title`, `seo_description`, `seo_keywords` | Blog posts |
| `website_product_pages` | `slug`, `robots_noindex` | Product page customizations |
| `destination_seo_overrides` | `custom_seo_title`, `custom_seo_description`, `target_keyword`, `robots_noindex` | Destination overrides |

### Migrations necesarias

```sql
-- F2: Toggle noindex para blog y packages
ALTER TABLE website_blog_posts 
  ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
ALTER TABLE package_kits 
  ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;

-- F4: Tracking de bulk operations (opcional, para auditoria)
CREATE TABLE IF NOT EXISTS seo_bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,  -- 'generate_bulk'
  items_processed integer DEFAULT 0,
  items_applied integer DEFAULT 0,
  avg_score_before numeric(5,2),
  avg_score_after numeric(5,2),
  total_cost numeric(8,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

---

## 8. Archivos Afectados

### F1 — AI SEO Generator
| Archivo | Cambio |
|---------|--------|
| `app/api/ai/seo/generate/route.ts` | **NUEVO** — API route para generacion individual |
| `components/admin/seo-item-detail.tsx` | Agregar boton "Generar con IA", panel de preview, estados |
| `lib/ai/seo-prompts.ts` | **NUEVO** — System prompts por tipo de item |

### F2 — Toggle Noindex
| Archivo | Cambio |
|---------|--------|
| `components/admin/seo-item-detail.tsx` | Agregar toggle de indexacion con dialog |
| `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx` | Agregar handleToggleNoindex al save handler |
| Migration SQL | Agregar `robots_noindex` a `website_blog_posts` y `package_kits` |

### F3 — og:image Fallback
| Archivo | Cambio |
|---------|--------|
| `lib/seo/og-helpers.ts` | **NUEVO** — `resolveOgImage()` helper |
| `app/site/[subdomain]/[...slug]/page.tsx` | Usar `resolveOgImage()` en generateMetadata |
| `app/site/[subdomain]/page.tsx` | Usar `resolveOgImage()` en generateMetadata |
| `app/site/[subdomain]/blog/page.tsx` | Usar `resolveOgImage()` en generateMetadata |

### F4 — Bulk AI Apply
| Archivo | Cambio |
|---------|--------|
| `app/api/ai/seo/generate-bulk/route.ts` | **NUEVO** — API route con SSE streaming |
| `app/dashboard/[websiteId]/seo/page.tsx` | Agregar boton "Optimizar con IA" + modal |
| `components/admin/bulk-seo-modal.tsx` | **NUEVO** — Modal de confirmacion + progress + review |

---

## 9. Dependencias y Riesgos

| Riesgo | Mitigacion |
|--------|-----------|
| Costo de API descontrolado en bulk | Rate limit tier ($5/dia), estimacion previa, confirmacion |
| AI genera datos inventados (hallucination) | Prompt instruye NO inventar, user review antes de aplicar |
| Latencia de generacion (>3s) | Spinner + timeout de 10s + retry con backoff |
| Conflicto de save si dos usuarios editan mismo item | Optimistic locking via `updated_at` check |
| `robots_noindex` accidental en paginas criticas | Dialogo de confirmacion explicito |

---

## 10. Orden de Implementacion

```
Semana 1:
  F3 (og:image fallback)     — 2h, bajo riesgo, impacto inmediato
  F2 (toggle noindex)        — 3h, bajo riesgo, migrations simples

Semana 2:
  F1 (AI SEO generator)      — 8h, medio riesgo, feature principal
    - API route + prompts (3h)
    - UI en seo-item-detail (3h)
    - Testing con los 7 tipos (2h)

Semana 3:
  F4 (bulk AI apply)          — 10h, medio riesgo, depende de F1
    - API route con SSE (4h)
    - Modal UI + progress (4h)
    - Review/apply flow (2h)
```

**Total estimado**: ~23h de implementacion

---

## 11. Metricas de Exito

| Metrica | Antes | Objetivo |
|---------|-------|----------|
| Score promedio del sitio | F (30/100) | B (75/100) |
| Items con SEO title | ~20% | >90% |
| Items con description >120 chars | ~10% | >80% |
| og:image en paginas publicas | 1/8 rutas | 8/8 rutas |
| Tiempo para optimizar 50 items | ~4 horas manual | ~5 minutos con bulk AI |
