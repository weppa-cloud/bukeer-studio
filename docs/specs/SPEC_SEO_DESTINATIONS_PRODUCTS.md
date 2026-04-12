# SPEC: SEO — Destinos y Páginas de Productos

**Estado**: Approved  
**Fecha**: 2026-04-12  
**Autor**: Yeison Gomez  
**Prioridad**: Alta  
**Rev**: 2 (post-audit)

---

## 1. Contexto y Problema

La auditoría SEO de 2026-04-10 reveló brechas críticas en las páginas de destinos y productos. Las páginas de detalle y listing de destinos **no emiten JSON-LD**, y el catch-all `[...slug]/page.tsx` **no inyecta hreflang** en sus metadatos.

Google Search Console y validadores de schema (Rich Results Test) no pueden procesar structured data en estas páginas, reduciendo el potencial de rich snippets y posicionamiento multilingual.

**Impacto actual**:
- `TouristDestination` schema existe en `components/seo/product-schema.tsx` pero nunca se renderiza, y además le faltan campos (`geo`, `aggregateRating`)
- Destinos no aparecen como rich results en Google
- Sin hreflang en productos/destinos → canonicalización incorrecta para agencias multilingue (EN/PT/FR)

---

## 2. Alcance

### En scope

1. **Extender `buildDestinationSchema()`** en `product-schema.tsx` — agregar `geo` y `aggregateRating`
2. **JSON-LD en `destination-detail-page.tsx`** — schema `TouristDestination` + `BreadcrumbList`
3. **JSON-LD en `destination-listing-page.tsx`** — schema `CollectionPage` + `BreadcrumbList`
4. **hreflang en catch-all `[...slug]/page.tsx`** — `alternates.languages` para destinos y productos

### Fuera de scope

- Unificacion/refactor de `lib/schema/generators.ts` vs `lib/schema/json-ld.tsx` (deuda tecnica separada)
- Pagina `/packages/[slug]` bloqueada por migracion de DB en bukeer-flutter (ver #544)
- FAQ schema en paginas de destinos
- `inLanguage` en `generateOrganizationSchema()` — ya esta resuelto en `generateArticleSchema()` (usa `post.locale || 'es'`); el schema `TravelAgency` no requiere `inLanguage` segun schema.org

---

## 3. User Flows

### Flow 1 — Googlebot indexa una pagina de destino

```
GET /site/[subdomain]/destinos/cartagena
  |
[...slug]/page.tsx
  | generateMetadata() -> title, description, OG, canonical, alternates.languages <-- NUEVO
  | fetchDestination() + fetchSerpEnrichment()
  | render DestinationDetailPage
       | <script type="application/ld+json"> con TouristDestination + BreadcrumbList <-- NUEVO
```

**Antes**: Googlebot solo encuentra `<meta>` tags. Sin schema.
**Despues**: Googlebot encuentra JSON-LD valido -> eligible para rich results.

### Flow 2 — Googlebot indexa el listing de destinos

```
GET /site/[subdomain]/destinos
  |
[...slug]/page.tsx
  | generateMetadata() -> title, description, OG, canonical, alternates.languages <-- NUEVO
  | fetchDestinations()
  | render DestinationListingPage
       | <script type="application/ld+json"> con CollectionPage + BreadcrumbList <-- NUEVO
```

### Flow 3 — Usuario llega desde busqueda en ingles a hotel

```
GET /site/[subdomain]/hoteles/decameron-cartagena
  |
generateMetadata() actual: title/OG si pero sin alternates.languages
generateMetadata() nuevo: + alternates.languages { en: /en/hotels/..., pt: /pt/hoteis/... } <-- NUEVO
```

---

## 4. Acceptance Criteria

### AC1 — `buildDestinationSchema()` extendido
- [ ] `buildDestinationSchema()` en `product-schema.tsx` acepta y emite `geo` con `GeoCoordinates` (lat/lng)
- [ ] `buildDestinationSchema()` acepta y emite `aggregateRating` (ratingValue + reviewCount)
- [ ] Campos nuevos son opcionales — schema valido sin ellos

### AC2 — JSON-LD en destination detail
- [ ] `destination-detail-page.tsx` renderiza un `<script type="application/ld+json">` con `@type: "TouristDestination"`
- [ ] El schema incluye: `name`, `description` (del enrichment merge), `image`, `url`
- [ ] Si `destination.lat`/`destination.lng` existen, incluye `geo.GeoCoordinates`
- [ ] Si `serpEnrichment` tiene `rating`, incluye `aggregateRating`
- [ ] El schema incluye un `BreadcrumbList`: Inicio > Destinos > [Nombre destino]
- [ ] Validado en Rich Results Test sin errores

### AC3 — JSON-LD en destination listing
- [ ] `destination-listing-page.tsx` renderiza `@type: "CollectionPage"` con `name` y `url`
- [ ] Incluye `BreadcrumbList`: Inicio > Destinos
- [ ] Maximo 10 items en `hasPart` (destinos con 2+ productos)

### AC4 — hreflang en catch-all
- [ ] `generateMetadata()` en `[...slug]/page.tsx` inyecta `alternates.languages` para:
  - Destination listing (`/destinos`)
  - Destination detail (`/destinos/[slug]`)
  - Product pages (`/hoteles/[slug]`, `/actividades/[slug]`, `/traslados/[slug]`)
- [ ] Usa `generateHreflangLinks()` de `lib/seo/hreflang.ts` con transformacion `HreflangLink[] -> Record<string, string>` (mismo patron del homepage)
- [ ] `x-default` apunta a la URL en espanol

---

## 5. Datos y Modelo

### Tipos involucrados — incompatibilidad conocida

**`DestinationData`** (`lib/supabase/get-pages.ts:199-211`):
```typescript
interface DestinationData {
  id: string;
  name: string;
  slug: string;
  state: string;
  lat: number;       // coordenadas directas, NO en .location
  lng: number;
  hotel_count: number;
  activity_count: number;
  total: number;
  min_price: string | null;
  image: string | null;  // null, no undefined
  // NO tiene: description, type, location, country, city
}
```

**`ProductData`** (`@bukeer/website-contract`):
```typescript
interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;      // undefined, no null
  location?: string;
  country?: string;
  city?: string;
  type: 'destination' | 'hotel' | ...;
  // ... campos especificos por tipo
}
```

**Estrategia**: Mapear `DestinationData` -> `ProductData` inline en el componente. No crear un mapper separado ya que es un solo caso de uso.

### Fuente de datos por campo del schema

| Campo schema | Fuente en `destination-detail-page.tsx` | Disponible? |
|---|---|---|
| `name` | `destination.name` | Si directo |
| `description` | `enrichment.description` (post-merge en linea 56) | Si, despues del merge |
| `image` | `heroImage` (post-merge en linea 71-73) | Si, despues del merge |
| `url` | Construido: `https://${subdomain}.bukeer.com/destinos/${destination.slug}` | Si |
| `geo.latitude` | `destination.lat` | Si directo |
| `geo.longitude` | `destination.lng` | Si directo |
| `aggregateRating.ratingValue` | `enrichment.rating` (de serpEnrichment) | Opcional |
| `aggregateRating.reviewCount` | `enrichment.reviewCount` (de serpEnrichment) | Opcional |

### Schema `TouristDestination` objetivo

```typescript
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "Cartagena",
  "description": "Ciudad amurallada con playas...",
  "image": "https://...",
  "url": "https://miagencia.bukeer.com/destinos/cartagena",
  "geo": {                                    // solo si lat/lng existen
    "@type": "GeoCoordinates",
    "latitude": 10.391,
    "longitude": -75.514
  },
  "aggregateRating": {                        // solo si serpEnrichment.rating existe
    "@type": "AggregateRating",
    "ratingValue": 4.5,
    "reviewCount": 2340
  }
}
```

---

## 6. Implementacion

### Tarea 1 — Extender `buildDestinationSchema()` en `product-schema.tsx`

**Archivo**: `components/seo/product-schema.tsx`

Agregar soporte para `geo` y `aggregateRating` al builder existente. Los campos se pasan via `ProductData` extendiendo con campos opcionales.

```typescript
// product-schema.tsx — buildDestinationSchema()
function buildDestinationSchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: product.name,
    description: product.description,
    image: product.image,
    url: websiteUrl,
    address: buildAddress(product),
    // NUEVO: GeoCoordinates
    geo: product.latitude != null && product.longitude != null
      ? {
          '@type': 'GeoCoordinates',
          latitude: product.latitude,
          longitude: product.longitude,
        }
      : undefined,
    // NUEVO: AggregateRating
    aggregateRating: product.rating != null
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          ...(product.review_count != null && { reviewCount: product.review_count }),
        }
      : undefined,
  };
}
```

Requiere agregar campos opcionales a `ProductData` en `@bukeer/website-contract`:

```typescript
// packages/website-contract/src/types/product.ts — agregar:
  // Geo (for destinations)
  latitude?: number;
  longitude?: number;

  // Rating (from enrichment)
  rating?: number;
  review_count?: number;
```

### Tarea 2 — JSON-LD en `destination-detail-page.tsx`

**Archivo**: `components/pages/destination-detail-page.tsx`

Importar `ProductSchema` y mapear `DestinationData` -> `ProductData` inline despues del merge de enrichment (linea ~67, donde ya se tienen todos los datos resueltos).

```typescript
import { ProductSchema } from '@/components/seo/product-schema';
import type { ProductData } from '@bukeer/website-contract';

// Dentro del componente, DESPUES del merge de enrichment (linea ~67):
const heroImage = /* ... ya existe ... */;

// Mapper DestinationData -> ProductData para schema
const schemaProduct: ProductData = {
  id: destination.id,
  name: destination.name,
  slug: destination.slug,
  type: 'destination',
  description: enrichment.description || undefined,  // null -> undefined
  image: heroImage || destination.image || undefined, // null -> undefined
  location: destination.state || undefined,
  latitude: destination.lat,
  longitude: destination.lng,
  rating: enrichment.rating || undefined,
  review_count: enrichment.reviewCount || undefined,
};

const websiteUrl = website.custom_domain
  ? `https://${website.custom_domain}/destinos/${destination.slug}`
  : `https://${website.subdomain}.bukeer.com/site/${website.subdomain}/destinos/${destination.slug}`;

// En el JSX, al inicio del return:
return (
  <>
    <ProductSchema
      product={schemaProduct}
      productType="destination"
      websiteUrl={websiteUrl}
    />
    <div className="min-h-screen" ...>
      {/* ... resto del componente sin cambios ... */}
    </div>
  </>
);
```

### Tarea 3 — JSON-LD en `destination-listing-page.tsx`

**Archivo**: `components/pages/destination-listing-page.tsx`

Schema `CollectionPage` + `BreadcrumbList` inline (no requiere `ProductSchema` — este componente maneja una lista, no un producto).

```typescript
// Dentro del componente, antes del return:
const siteName = website.content?.account?.name || website.content?.siteName || website.subdomain;
const baseUrl = website.custom_domain
  ? `https://${website.custom_domain}`
  : `https://${website.subdomain}.bukeer.com/site/${website.subdomain}`;

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `Destinos | ${siteName}`,
  description: `Descubre los mejores destinos de viaje con ${siteName}.`,
  url: `${baseUrl}/destinos`,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: visibleDestinations.length,
    itemListElement: visibleDestinations.slice(0, 10).map((dest, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: dest.name,
      url: `${baseUrl}/destinos/${dest.slug}`,
    })),
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: baseUrl },
    { '@type': 'ListItem', position: 2, name: 'Destinos' },
  ],
};

// En el JSX, al inicio del return:
return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
    <div className="min-h-screen" ...>
      {/* ... sin cambios ... */}
    </div>
  </>
);
```

### Tarea 4 — hreflang en `[...slug]/page.tsx`

**Archivo**: `app/site/[subdomain]/[...slug]/page.tsx`

Agregar `alternates.languages` en `generateMetadata()`. Requiere la misma transformacion `HreflangLink[] -> Record<string, string>` que ya usa el homepage (`app/site/[subdomain]/page.tsx:22-27`).

Crear un helper reutilizable al inicio del archivo:

```typescript
import { generateHreflangLinks } from '@/lib/seo/hreflang';

// Helper: transforma HreflangLink[] a Record<string, string> para Next.js metadata
function buildAlternateLanguages(baseUrl: string, pathname: string): Record<string, string> {
  const links = generateHreflangLinks(baseUrl, pathname);
  const languages: Record<string, string> = {};
  for (const link of links) {
    languages[link.hreflang] = link.href;
  }
  return languages;
}
```

Aplicar en cada branch de `generateMetadata()`:

```typescript
// Destination listing
if (slug.length === 1 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
  const baseUrl = `https://${subdomain}.bukeer.com`;
  return {
    title: `Destinos | ${siteName}`,
    description: `Descubre los mejores destinos...`,
    openGraph: { ... },
    alternates: {                                    // <-- NUEVO
      canonical: `${baseUrl}/destinos`,
      languages: buildAlternateLanguages(baseUrl, '/destinos'),
    },
  };
}

// Destination detail
if (slug.length === 2 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
  // ... fetch dest ...
  const baseUrl = `https://${subdomain}.bukeer.com`;
  const pathname = `/destinos/${slug[1]}`;
  return {
    title, description,
    openGraph: { ... },
    alternates: {                                    // <-- NUEVO
      canonical: `${baseUrl}${pathname}`,
      languages: buildAlternateLanguages(baseUrl, pathname),
    },
  };
}

// Product pages
if (slug.length >= 2) {
  // ... fetch product ...
  const baseUrl = `https://${subdomain}.bukeer.com`;
  const pathname = `/${slug.join('/')}`;
  return {
    title, description,
    openGraph: { ... },
    alternates: {                                    // <-- NUEVO
      canonical: `${baseUrl}${pathname}`,
      languages: buildAlternateLanguages(baseUrl, pathname),
    },
  };
}
```

---

## 7. Edge Cases

| Caso | Comportamiento esperado |
|------|------------------------|
| Destino sin `slug` | No renderizar schema (evitar URL invalida) |
| Destino sin imagen | Omitir `image` del schema (campo opcional en schema.org) |
| `serpEnrichment` nulo | Schema sin `aggregateRating` ni `description` enriquecida |
| `enrichment.description` null + sin staticContent | Schema sin `description` (omitido, no string vacia) |
| `destination.lat`/`lng` = 0 | Emitir `geo` (0,0 es coordenada valida, aunque improbable) |
| Destino con `lat`/`lng` pero sin enrichment | Schema con `geo` pero sin `aggregateRating` |
| Listing con 0 destinos visibles | `CollectionPage` con `numberOfItems: 0`, sin `itemListElement` |
| Website con `custom_domain` | URLs usan dominio custom, no subdomain.bukeer.com |

---

## 8. Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `packages/website-contract/src/types/product.ts` | + `latitude?`, `longitude?`, `rating?`, `review_count?` en `ProductData` |
| `components/seo/product-schema.tsx` | + `geo` y `aggregateRating` en `buildDestinationSchema()` |
| `components/pages/destination-detail-page.tsx` | + mapper DestinationData->ProductData + render `<ProductSchema>` |
| `components/pages/destination-listing-page.tsx` | + render `<script>` con CollectionPage + BreadcrumbList |
| `app/site/[subdomain]/[...slug]/page.tsx` | + `alternates.languages` en `generateMetadata()` + import hreflang |

**Sin tocar**:
- `lib/seo/hreflang.ts` — completo y funcional
- `lib/seo/sitemap.ts` — ya incluye destinos
- `lib/schema/generators.ts` — `inLanguage` ya resuelto en `generateArticleSchema()`

---

## 9. Orden de implementacion

```
Tarea 1: Extender ProductData + buildDestinationSchema()
    |
    v
Tarea 2: JSON-LD en destination-detail (depende de Tarea 1)
    |
    v (independientes entre si)
Tarea 3: JSON-LD en destination-listing
Tarea 4: hreflang en catch-all
```

Tareas 3 y 4 son independientes y pueden ejecutarse en paralelo.

---

## 10. Testing

### Manual
1. Correr `npm run dev`
2. Navegar a `/site/[subdomain]/destinos` -> View Source -> buscar `application/ld+json`
   - Verificar: `@type: "CollectionPage"`, `BreadcrumbList`, items <= 10
3. Navegar a `/site/[subdomain]/destinos/[slug]` -> View Source
   - Verificar: `@type: "TouristDestination"`, `geo`, `BreadcrumbList`
   - Si destino tiene enrichment: verificar `aggregateRating`
4. Pegar URL en Rich Results Test -> sin errores
5. En destinos y productos: verificar `<link rel="alternate" hreflang="en">` en `<head>`
6. Comparar homepage -> verificar que hreflang sigue funcionando (no regresion)

### Automatizado (futuro)
- Unit test: `buildDestinationSchema()` con datos mock -> assert `@type === 'TouristDestination'` + `geo` + `aggregateRating`
- Unit test: `buildAlternateLanguages()` -> assert `Record<string, string>` con claves `es`, `en`, `pt`, `fr`, `x-default`
- E2E: Playwright navega a pagina de destino y extrae `document.querySelectorAll('script[type="application/ld+json"]')`

---

## 11. Dependencias y Riesgos

| Dependencia | Estado | Riesgo |
|-------------|--------|--------|
| `buildDestinationSchema()` en `product-schema.tsx` | Existe, necesita extension | Bajo — cambio aditivo |
| `ProductData` en `@bukeer/website-contract` | Existe, necesita 4 campos opcionales | Bajo — no rompe consumidores |
| `generateHreflangLinks()` en `lib/seo/hreflang.ts` | Completo | Nulo |
| `destination.slug` en DB | Existe | Nulo |
| `destination.lat`/`lng` en DB | Existe (via RPC) | Nulo |
| Patron `HreflangLink[] -> Record` | Probado en homepage | Nulo — copiar patron |
| Schema `/packages/[slug]` | Bloqueado por bukeer-flutter#544 | Fuera de scope |

---

## 12. Criterios de Done

- [ ] AC1-AC4 verificados manualmente
- [ ] Rich Results Test muestra `TouristDestination` valido en al menos 1 pagina de destino
- [ ] `<link rel="alternate" hreflang>` visible en View Source de producto/destino
- [ ] Sin regresiones en homepage SEO (verificar que hreflang y schemas siguen funcionando)
- [ ] `npm run build` sin errores de TypeScript
- [ ] PR aprobado y mergeado a `main`

---

## Apendice: Hallazgos de la auditoria (Rev 1 -> Rev 2)

| # | Problema detectado | Correccion aplicada |
|---|---|---|
| 1 | Type mismatch `DestinationData` vs `ProductData` — el spec asumia compatibilidad directa | Documentado el mapper inline; se detalla la fuente real de cada campo |
| 2 | `buildDestinationSchema()` no soporta `geo` ni `aggregateRating` — el spec decia "sin tocar" | Tarea 1 creada para extender el builder + `ProductData` |
| 3 | hreflang `HreflangLink[]` vs Next.js `Record<string, string>` — el spec pasaba array directamente | Tarea 4 ahora incluye helper `buildAlternateLanguages()` con transformacion correcta |
| 4 | Tarea 4 original (`inLanguage` en `generateOrganizationSchema`) era un no-op — ya estaba resuelto | Eliminada del scope; documentado en seccion 2 por que |
| 5 | `destination.description` no existe en `DestinationData` — el spec lo asumia como prop | Corregido: se usa `enrichment.description` (post-merge, linea 56 del componente) |
