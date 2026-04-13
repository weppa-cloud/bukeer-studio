# SPEC: SEO One-Page Optimizer — Product Integration + Content Editing

**Estado**: Draft → Rev 4 (Hybrid: Legacy + V2 Enrichment)
**Fecha**: 2026-04-13
**Autor**: Yeison Gomez + Claude
**Prioridad**: Alta
**Rev**: 4

---

## 1. Contexto y Problema

El SEO Audit Dashboard solo muestra **523 de ~1,600 items** (33%). Faltan ~1,080 productos porque el codigo busca una tabla `products` que no existe.

Ademas, el SEO detail actual solo permite editar **meta tags** (titulo, descripcion, keyword). No permite mejorar el **contenido** del producto, que es lo que realmente impacta el score.

### Hallazgo critico: IDs y RPCs publicos usan tablas LEGACY

Validacion tecnica (2026-04-13) descubrio:

1. **`website_product_pages.product_id` usa IDs legacy** — 71 hotels matchean `hotels.id` (0 matchean `account_hotels.id`), 125 activities matchean `activities.id`
2. **El RPC publico `get_website_product_page`** consulta directamente `hotels`, `activities`, `transfers` — es lo que Google indexa
3. **El trigger `auto_create_product_landing_pages`** inserta IDs legacy desde `featured_products` jsonb
4. **Activities V2 tiene solo 20 de 828** — cobertura insuficiente para ser fuente primaria

### Decision Rev 4: Estrategia HIBRIDA

```
Base: tablas legacy (hotels, activities, transfers, package_kits)
  → Son la fuente de verdad de website_product_pages y RPCs publicos
  → IDs legacy = product_id en website_product_pages

Enriquecimiento: Catalog V2 (master_hotels, master_activities)
  → Via bridge: account_hotels.legacy_hotel_id → master_hotels
  → Aporta: geo, rating, reviews, amenities rico, fotos, policies
  → Opcional: si no hay bridge, funciona solo con legacy
```

### Bridge Legacy → V2

| Tabla V2 | Activos | Con legacy_id | Bridgeable |
|----------|--------:|-------------:|-----------:|
| account_hotels | 400 | 374 (94%) | Si |
| account_activities | 20 | 16 (80%) | Si (parcial, migración en curso) |

### Ventaja del enriquecimiento V2

| Dato | Legacy | + V2 Enrichment (master_*) |
|------|--------|---------------------------|
| Nombre + descripcion | Si | + description_short, ai_content |
| Imagen | 1 (main_image) | + Galeria completa (photos jsonb) |
| Ubicacion | No | + city, country, lat/lng |
| Rating/reviews | No | + user_rating, reviews_count |
| Amenidades | Array basico | + JSONB rico (hotel_style, policies) |
| Check-in/out | No | + check_in_time, check_out_time |
| Geo coordinates | No | + latitude, longitude |
| Inclusiones | No (activities) | + inclusions, exclusions (jsonb) |

### Referencia: como lo hacen los grandes

| Plataforma | Modelo | Edita contenido + SEO? |
|-----------|--------|------------------------|
| Yoast/WordPress | Panel SEO adjunto al editor | Contenido arriba, SEO abajo |
| Surfer SEO | Editor + sidebar de score | Si — editas y ves score en tiempo real |
| Shopify | SEO fields al final del product edit | Contenido + SEO en misma pagina |

**Decision**: Modelo **Surfer** — one-page SEO optimizer.

### Datos reales del inventario (2026-04-13)

| Tabla | Items activos | Fuente | SEO override |
|-------|--------------|--------|--------------|
| Hotels | ~501 | `hotels` (legacy) + bridge a `master_hotels` | `website_product_pages` (71 existentes) |
| Activities | ~828 | `activities` (legacy) + bridge a `master_activities` | `website_product_pages` (125 existentes) |
| Transfers | ~232 | `transfers` (legacy) | `website_product_pages` |
| Packages | ~18 | `package_kits` (directo) | `website_product_pages` (4 existentes) |
| Pages | ~13 | `website_pages` | campos propios |
| Blog posts | ~510 | `website_blog_posts` | campos propios |
| **Total** | **~2,100** | | **207 wpp records, 0 con SEO** |

### Multi-tenant

```
URL: /dashboard/{websiteId}/seo
  → websites.account_id = '{accountId}'
  → Hotels: hotels WHERE account_id = {accountId} AND deleted_at IS NULL
  → Activities: activities WHERE account_id = {accountId} AND deleted_at IS NULL
  → Transfers: transfers WHERE account_id = {accountId} AND deleted_at IS NULL
  → Packages: package_kits WHERE account_id = {accountId}
  → Cada cuenta ve SOLO sus productos activos
```

---

## 2. Arquitectura SEO

### 2.1 Cascada de resolucion SEO (3 niveles)

```typescript
// Para un hotel:
seoTitle =
  website_product_pages.custom_seo_title       // 1. Override SEO per-website
  ?? hotels.name                                // 2. Tabla legacy (fuente de verdad)

seoDescription =
  website_product_pages.custom_seo_description
  ?? hotels.description

targetKeyword =
  website_product_pages.target_keyword ?? null

robotsNoindex =
  website_product_pages.robots_noindex ?? false

// Enriquecimiento V2 (opcional, para JSON-LD y scoring):
v2Bridge = account_hotels WHERE legacy_hotel_id = hotels.id
masterData = master_hotels WHERE id = v2Bridge.master_hotel_id
  → geo: { lat: masterData.latitude, lng: masterData.longitude }
  → rating: { value: masterData.user_rating, count: masterData.reviews_count }
  → amenitiesRich: masterData.amenities (jsonb)
  → photos: masterData.photos (jsonb gallery)
  → starRating: masterData.star_rating
  → policies, checkIn/Out, etc.
```

```typescript
// Para una actividad:
seoTitle =
  website_product_pages.custom_seo_title
  ?? activities.name

seoDescription =
  website_product_pages.custom_seo_description
  ?? activities.description

// Enriquecimiento V2 (cuando bridge existe):
v2Bridge = account_activities WHERE legacy_activity_id = activities.id
masterData = master_activities WHERE id = v2Bridge.master_activity_id
  → geo, inclusions, exclusions, highlights, duration_minutes, photos, etc.
```

```typescript
// Para transfers y packages: sin bridge V2
seoTitle = website_product_pages.custom_seo_title ?? transfers.name | package_kits.name
seoDescription = website_product_pages.custom_seo_description ?? transfers.description | package_kits.description
```

### 2.2 Contenido completo disponible por tipo

Las tablas legacy tienen mucho mas contenido del que el SEO detail original contemplaba:

#### Activities (696 items, ColombiaTours)

| Tab Flutter | Campo DB | Cobertura | Uso SEO |
|-------------|----------|----------:|---------|
| Informacion | `description` | 93% (648) | Meta description source, content scoring |
| Informacion | `description_short` | si | Google snippet fallback |
| Informacion | `inclutions` | 96% (666) | JSON-LD offers/features, content richness |
| Informacion | `exclutions` | 95% (664) | JSON-LD, content richness |
| Informacion | `recomendations` | 87% (603) | Content richness for scorer |
| Informacion | `instructions` | 64% (442) | JSON-LD meetingPoint / directions |
| Galeria | `images` (tabla separada) | 85% (2,427 fotos) | JSON-LD image[], og:image cascade |
| Galeria | `main_image` | 84% (586) | og:image primary |
| — | `experience_type` | si | JSON-LD additionalType, AI context |
| — | `duration_minutes` | parcial | JSON-LD estimatedDuration |
| — | `slug` | 100% | URL canonica |

#### Hotels (397 items)

| Tab Flutter | Campo DB | Cobertura | Uso SEO |
|-------------|----------|----------:|---------|
| Informacion | `description` | 92% (364) | Meta description source |
| Informacion | `inclutions` | 91% (363) | JSON-LD amenityFeature |
| Informacion | `exclutions` | 93% (370) | Content richness |
| Informacion | `recomendations` | 86% (341) | Content richness |
| Informacion | `instructions` | 82% (327) | JSON-LD directions |
| Galeria | `images` (tabla) | 73% (1,825 fotos) | JSON-LD image[], og:image |
| Galeria | `main_image` | 73% (288) | og:image primary |
| — | `star_rating` | si | JSON-LD starRating |
| — | `amenities` | si | JSON-LD amenityFeature |
| — | `check_in_time/check_out_time` | si | JSON-LD checkinTime/checkoutTime |
| — | `user_rating` | si | JSON-LD aggregateRating (legacy field) |

#### Transfers (118 items)

| Tab Flutter | Campo DB | Cobertura | Uso SEO |
|-------------|----------|----------:|---------|
| Informacion | `description` | 60% (71) | Meta description source |
| Informacion | `inclutions` | 25% (29) | Content richness |
| Galeria | `images` (tabla) | 42% (148 fotos) | JSON-LD image[] |
| — | `vehicle_type` | si | JSON-LD vehicle |
| — | `max_passengers` | si | JSON-LD seatingCapacity |
| — | `policies` | si | Content richness |
| — | `from_location/to_location` | si | JSON-LD areaServed |

#### Packages (18 items)

| Tab Flutter | Campo DB | Cobertura | Uso SEO |
|-------------|----------|----------:|---------|
| — | `description` | si | Meta description source |
| — | `program_highlights` (jsonb) | si | JSON-LD itinerary highlights |
| — | `program_inclusions` (jsonb) | si | JSON-LD offers |
| — | `program_exclusions` (jsonb) | si | Content richness |
| — | `program_gallery` (jsonb) | si | JSON-LD image[] |
| — | `cover_image_url` | si | og:image primary |
| Programa | `services_snapshot` (version) | si | JSON-LD itinerary ItemList |

#### Galeria: tabla `images` (compartida)

```sql
images (id, entity_id, account_id, url, order_index, created_at)
-- entity_id = hotel.id | activity.id | transfer.id
-- RPC website_collect_entity_images() ya recopila main_image + gallery
```

| Tipo | Fotos totales | Entidades con fotos |
|------|-------------:|--------------------:|
| Activities | 2,427 | 592 (85%) |
| Hotels | 1,825 | 288 (73%) |
| Transfers | 148 | 50 (42%) |

### 2.3 Principio: "El SEO vive con la pagina publica, no con el producto"

```
Producto = CATALOGO (tablas legacy = fuente de verdad de la web publica)
  → hotels, activities, transfers: datos + contenido rico que Google indexa
  → images: galeria vinculada por entity_id
  → website_product_pages: SEO override per-website

Catalog V2 = ENRIQUECIMIENTO ADICIONAL (datos extras para JSON-LD)
  → master_hotels/master_activities: geo, rating externo, fotos externas, amenities rico
  → Bridge via legacy_hotel_id / legacy_activity_id
  → Opcional: si no hay bridge, el contenido legacy ya es suficiente para SEO
```

### 2.3 Estrategia anti-canibalizacion por tipo de producto

```
PRODUCTO (hotel/actividad) → Intencion TRANSACCIONAL
  keyword: "hotel boutique cartagena reservar"
  schema: LodgingBusiness / TouristAttraction

PAQUETE (package_kit) → Intencion COMERCIAL
  keyword: "viaje cartagena 5 dias todo incluido"
  schema: TouristTrip con itinerario

BLOG POST → Intencion INFORMATIVA
  keyword: "que hacer en cartagena 2026"
  schema: BlogPosting / Article

DESTINO → Intencion NAVEGACIONAL
  keyword: "cartagena de indias turismo"
  schema: TouristDestination con geo
```

---

## 3. Fases de implementacion

### Fase 1 — COMPLETADA

- [x] F1: AI SEO Generator (single item)
- [x] F2: Toggle Noindex
- [x] F3: og:image fallback
- [x] F4: Bulk AI Apply
- Solo funciona para: website_pages (13) + website_blog_posts (510) = 523 items.

---

### Fase 2 — Dashboard hibrido (~6h)

**Objetivo**: Mostrar ~2,100 items usando legacy + V2 enrichment.

#### S2.1: Dashboard — queries a tablas legacy + V2 bridge

**Archivo**: `app/dashboard/[websiteId]/seo/page.tsx`

```typescript
const accountId = website.account_id;

// 1. Hotels (legacy — ALL content fields)
const { data: hotels } = await supabase
  .from('hotels')
  .select(`id, name, slug, main_image, social_image, description, description_short,
    star_rating, amenities, user_rating, check_in_time, check_out_time,
    inclutions, exclutions, recomendations, instructions`)
  .eq('account_id', accountId)
  .is('deleted_at', null);

// 2. Activities (legacy — ALL content fields)
const { data: activities } = await supabase
  .from('activities')
  .select(`id, name, slug, main_image, social_image, description, description_short,
    duration_minutes, experience_type,
    inclutions, exclutions, recomendations, instructions`)
  .eq('account_id', accountId)
  .is('deleted_at', null);

// 3. Transfers (legacy — ALL content fields)
const { data: transfers } = await supabase
  .from('transfers')
  .select(`id, name, slug, main_image, description, description_short,
    vehicle_type, max_passengers, policies, duration_minutes, from_location, to_location,
    inclutions, exclutions, recomendations, instructions`)
  .eq('account_id', accountId)
  .is('deleted_at', null);

// 4. Packages (ALL content fields)
const { data: packages } = await supabase
  .from('package_kits')
  .select(`id, name, description, cover_image_url, destination, category,
    duration_days, duration_nights, program_highlights, program_inclusions,
    program_exclusions, program_notes, program_meeting_info, program_gallery,
    robots_noindex`)
  .eq('account_id', accountId);

// 5. Gallery images count per entity (for scoring)
const { data: galleryCounts } = await supabase
  .from('images')
  .select('entity_id')
  .eq('account_id', accountId);
const galleryMap = new Map<string, number>();
for (const img of galleryCounts ?? []) {
  galleryMap.set(img.entity_id, (galleryMap.get(img.entity_id) ?? 0) + 1);
}

// 5. SEO overrides (single query)
const { data: seoOverrides } = await supabase
  .from('website_product_pages')
  .select('product_id, product_type, custom_seo_title, custom_seo_description, target_keyword, robots_noindex')
  .eq('website_id', websiteId);

// 6. V2 bridge for hotels (optional enrichment)
const { data: hotelBridges } = await supabase
  .from('account_hotels')
  .select('legacy_hotel_id, master_hotels!inner(city, country, star_rating, user_rating, reviews_count, photos, latitude, longitude)')
  .eq('account_id', accountId)
  .eq('is_active', true)
  .not('legacy_hotel_id', 'is', null);

// 7. Build maps
const overrideMap = new Map(seoOverrides?.map(o => [`${o.product_type}:${o.product_id}`, o]) ?? []);
const hotelV2Map = new Map(hotelBridges?.map(b => [b.legacy_hotel_id, b.master_hotels]) ?? []);

// 8. Merge hotels
for (const h of hotels ?? []) {
  const override = overrideMap.get(`hotel:${h.id}`);
  const v2 = hotelV2Map.get(h.id); // enrichment (optional)
  items.push({
    id: h.id,
    name: h.name,
    type: 'hotel',
    slug: h.slug ?? '',
    image: v2?.photos?.[0]?.url ?? h.main_image,
    input: {
      type: 'hotel',
      name: h.name,
      slug: h.slug ?? '',
      description: h.description,
      image: v2?.photos?.[0]?.url ?? h.main_image,
      seoTitle: override?.custom_seo_title ?? undefined,
      seoDescription: override?.custom_seo_description ?? undefined,
      targetKeyword: override?.target_keyword ?? undefined,
      amenities: h.amenities,
      starRating: v2?.star_rating ?? h.star_rating,
      // V2 enrichment (null if no bridge)
      latitude: v2?.latitude ?? undefined,
      longitude: v2?.longitude ?? undefined,
      userRating: v2?.user_rating ?? undefined,
      reviewsCount: v2?.reviews_count ?? undefined,
      hasJsonLd: true, hasCanonical: true, hasHreflang: true, hasOgTags: true, hasTwitterCard: true,
    },
  });
}
// 9. Similar for activities (with V2 bridge if available)
// 10. Transfers + packages (no V2)
```

#### S2.2: Detail page — fetch legacy + V2 enrichment

**Archivo**: `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx`

```typescript
case 'hotel': {
  // Legacy data (fuente de verdad — ALL content fields)
  const { data: hotel } = await supabase
    .from('hotels')
    .select(`id, name, slug, main_image, social_image, description, description_short,
      star_rating, amenities, user_rating, check_in_time, check_out_time,
      inclutions, exclutions, recomendations, instructions`)
    .eq('id', id)
    .single();

  // Gallery images
  const { data: gallery } = await supabase
    .from('images')
    .select('url, order_index')
    .eq('entity_id', id)
    .eq('account_id', accountId)
    .order('order_index');
  if (!hotel) return null;

  // SEO override
  const { data: override } = await supabase
    .from('website_product_pages')
    .select('custom_seo_title, custom_seo_description, target_keyword, robots_noindex')
    .eq('product_id', id)
    .eq('website_id', websiteId)
    .maybeSingle();

  // V2 enrichment (optional)
  const { data: v2Bridge } = await supabase
    .from('account_hotels')
    .select(`
      id, custom_name, custom_description,
      master_hotels!inner (
        id, name, description, star_rating, user_rating, reviews_count,
        amenities, photos, city, country, latitude, longitude,
        check_in_time, check_out_time, hotel_style, address,
        pet_policy, children_policy, smoking_policy,
        accessibility_features, ai_content
      )
    `)
    .eq('legacy_hotel_id', id)
    .eq('account_id', accountId)
    .maybeSingle();

  const master = v2Bridge?.master_hotels ?? null;

  return {
    id: hotel.id, type: 'hotel',
    name: hotel.name, slug: hotel.slug ?? '',
    description: hotel.description,
    image: master?.photos?.[0]?.url ?? hotel.main_image,
    // SEO (level 1)
    seoTitle: override?.custom_seo_title ?? undefined,
    seoDescription: override?.custom_seo_description ?? undefined,
    targetKeyword: override?.target_keyword ?? undefined,
    robotsNoindex: override?.robots_noindex ?? false,
    // Legacy data
    amenities: hotel.amenities,
    starRating: hotel.star_rating,
    // V2 enrichment (null if no bridge)
    v2: master ? {
      city: master.city,
      country: master.country,
      latitude: master.latitude,
      longitude: master.longitude,
      userRating: master.user_rating,
      reviewsCount: master.reviews_count,
      photos: master.photos,
      amenitiesRich: master.amenities,
      checkInTime: master.check_in_time,
      checkOutTime: master.check_out_time,
      hotelStyle: master.hotel_style,
      address: master.address,
      policies: {
        pet: master.pet_policy,
        children: master.children_policy,
        smoking: master.smoking_policy,
      },
      accessibility: master.accessibility_features,
      aiContent: master.ai_content,
      // Account overlay
      customName: v2Bridge?.custom_name,
      customDescription: v2Bridge?.custom_description,
    } : null,
  };
}
```

#### S2.3: Save handler — upsert a website_product_pages (usa legacy ID)

```typescript
if (['hotel', 'activity', 'transfer', 'package'].includes(item.type)) {
  await supabase
    .from('website_product_pages')
    .upsert({
      website_id: websiteId,
      product_id: itemId,       // ← LEGACY ID (hotels.id, activities.id, etc.)
      product_type: item.type,
      custom_seo_title: fields.seoTitle,
      custom_seo_description: fields.seoDescription,
      target_keyword: fields.targetKeyword,
      robots_noindex: fields.robotsNoindex,
    }, { onConflict: 'website_id,product_id' });
  return;
}
```

#### S2.4: Error handling (ADR-002)

```typescript
// Fallback si query falla
const { data: hotels, error: hotelsError } = await supabase...
if (hotelsError) {
  console.error('[seo.dashboard.hotels]', hotelsError);
  // No crash — continuar con items = [] para hotels
}

// V2 bridge falla → degradar gracefully (solo datos legacy)
const { data: hotelBridges, error: bridgeError } = await supabase...
if (bridgeError) {
  console.error('[seo.dashboard.v2bridge]', bridgeError);
  // hotelV2Map queda vacio — items se muestran sin enriquecimiento
}
```

#### S2.5: Observability (ADR-010)

```typescript
console.log('[seo.dashboard.load]', {
  websiteId,
  counts: { hotels: hotels?.length, activities: activities?.length, ... },
  v2Enriched: { hotels: hotelBridges?.length ?? 0 }
});

console.log('[seo.detail.save]', { itemId, itemType, fields: Object.keys(fields) });
console.error('[seo.ai.generate]', { error, itemId });
```

#### Acceptance Criteria Fase 2

- [ ] AC-1: Dashboard muestra ~2,100 items (vs 523 actual)
- [ ] AC-2: Hotels aparecen con datos legacy + V2 enrichment cuando bridge existe
- [ ] AC-3: Activities aparecen con datos legacy (V2 bridge parcial, ~20 items)
- [ ] AC-4: Click en hotel → detail carga legacy + V2 master data
- [ ] AC-5: Guardar SEO → upsert en website_product_pages con LEGACY ID
- [ ] AC-6: Si V2 bridge no existe → funciona con solo datos legacy (degradacion graceful)
- [ ] AC-7: Errores de query no causan crash (ADR-002 Tier 1: return null)
- [ ] AC-8: Logs estructurados con namespace `[seo.*]` (ADR-010)
- [ ] AC-9: Multi-tenant: filtro por account_id
- [ ] AC-10: Paginacion server-side (no cargar >500 items en memoria — ADR-007)

---

### Fase 3 — One-Page SEO Optimizer (~4h)

**Objetivo**: Convertir el SEO detail en "Surfer-style optimizer".

#### UI: SEO Item Detail expandido (Hotel con V2)

```
+------------------------------------------------------+
| Hotel Casa del Mar  *****              B — 82/100     |
| hotel | Cartagena, Colombia            [Guardar]      |
+------------------------------------------------------+
|                                                       |
| 1. DATOS DEL PRODUCTO (legacy)            [READ-ONLY] |
| +---------------------------------------------------+ |
| | Nombre: Hotel Casa del Mar                         | |
| | Descripcion: Hotel boutique en Cartagena...        | |
| | Estrellas: 5  | Amenidades: [piscina] [wifi]       | |
| | Imagen: [thumbnail]                                | |
| +---------------------------------------------------+ |
|                                                       |
| 2. DATOS ENRIQUECIDOS (V2)     [READ-ONLY] [opcional] |
| +---------------------------------------------------+ |
| | Ciudad: Cartagena  Pais: Colombia                  | |
| | Geo: 10.3932, -75.5514                             | |
| | Rating: 4.7/5 (234 reviews)                        | |
| | Galeria V2: 8 fotos (thumbnails)                   | |
| | Check-in: 15:00  Check-out: 12:00                  | |
| | [i] Datos del catalogo maestro — no editables aqui | |
| +---------------------------------------------------+ |
|                                                       |
| 3. SEO PER-WEBSITE                        [EDITABLE]  |
|    Keyword: [hotel boutique cartagena          ]      |
|    Indexacion: [ON Visible en Google]                  |
|    SEO Title: [Hotel Casa del Mar — Cartagena   ]     |
|    Meta Desc: [Disfruta de una estadia unica... ]     |
|    [Generar con IA]                                   |
|                                                       |
| 4. GOOGLE PREVIEW                                     |
|    Hotel Casa del Mar — Cartagena                     |
|    colombiatours.travel/hoteles/casa-del-mar          |
|    Disfruta de una estadia unica en...                |
|                                                       |
| 5. JSON-LD PREVIEW (enriquecido si V2 disponible)     |
|    LodgingBusiness { starRating: 5,                   |
|      geo: { lat: 10.39, lng: -75.55 },               |
|      aggregateRating: { 4.7, 234 reviews }            |
|    }                                                  |
|                                                       |
| 6. SEO CHECKLIST                                      |
|    Meta: 88% | Content: 75% | Technical: 95%         |
+------------------------------------------------------+
```

#### Campos editables

| Campo | Fuente | Editable? | Guarda en |
|-------|--------|:---------:|-----------|
| Nombre | hotels.name (legacy) | NO | — |
| Descripcion | hotels.description (legacy) | NO | — |
| Amenidades | hotels.amenities (legacy) | NO | — |
| Imagen | hotels.main_image (legacy) | NO | — |
| V2: geo, rating, fotos, policies | master_hotels (V2) | NO | — |
| **SEO Title** | website_product_pages | **SI** | website_product_pages |
| **SEO Description** | website_product_pages | **SI** | website_product_pages |
| **Target Keyword** | website_product_pages | **SI** | website_product_pages |
| **Robots Noindex** | website_product_pages | **SI** | website_product_pages |

**Nota**: La edicion de contenido del producto (descripcion, amenidades) se hace desde Flutter admin. Studio solo gestiona SEO metadata.

#### S3.1: JSON-LD enriquecido con V2 (cuando bridge existe)

```typescript
// Hotel con V2 → LodgingBusiness rico
const schema = {
  "@type": "LodgingBusiness",
  name: hotel.name,
  description: override?.custom_seo_description ?? hotel.description,
  image: v2?.photos?.map(p => p.url) ?? [hotel.main_image],
  ...(v2?.starRating && { starRating: { "@type": "Rating", ratingValue: v2.starRating } }),
  ...(v2?.userRating && {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: v2.userRating,
      reviewCount: v2.reviewsCount
    }
  }),
  ...(v2?.latitude && {
    geo: { "@type": "GeoCoordinates", latitude: v2.latitude, longitude: v2.longitude }
  }),
  ...(v2?.city && {
    address: { "@type": "PostalAddress", addressLocality: v2.city, addressCountry: v2.country }
  }),
  // Sin V2 → schema basico pero valido
};
```

#### S3.2: AI usa contexto V2 cuando disponible

```typescript
// Expandir seo-prompts.ts
context: {
  city: v2?.city ?? undefined,             // V2 enrichment
  amenities: hotel.amenities,              // Legacy
  starRating: v2?.starRating ?? hotel.star_rating, // V2 fallback legacy
  userRating: v2?.userRating ?? undefined,  // V2 only
  reviewsCount: v2?.reviewsCount ?? undefined,
}
// Prompt: "Hotel 5 estrellas en Cartagena, Colombia, rated 4.7/5 (234 reviews)"
// vs sin V2: "Hotel 5 estrellas" (menos contexto pero funciona)
```

#### Acceptance Criteria Fase 3

- [ ] AC-1: Datos legacy se muestran read-only (nombre, desc, amenidades)
- [ ] AC-2: Datos V2 se muestran read-only cuando bridge existe (geo, rating, fotos)
- [ ] AC-3: Si no hay bridge V2, seccion "Datos Enriquecidos" se oculta
- [ ] AC-4: SEO fields son editables y guardan en website_product_pages
- [ ] AC-5: JSON-LD usa datos V2 cuando disponible, legacy como fallback
- [ ] AC-6: "Generar con IA" envia contexto V2 cuando disponible
- [ ] AC-7: Preview iframe muestra pagina publica
- [ ] AC-8: Score recalcula en tiempo real

---

### Fase 4 — Polish (~3h, nice-to-have)

- [ ] Bulk AI para contenido
- [ ] Score historico
- [ ] Comparativa before/after
- [ ] Export CSV
- [ ] Scorer checks adicionales: geo presente, gallery > 3 fotos, rating

---

## 4. Data Model

### Tablas involucradas

```sql
-- LEGACY (fuente de verdad para website publico)
hotels       (id, name, slug, description, main_image, amenities, star_rating, account_id, deleted_at)
activities   (id, name, slug, description, main_image, duration_minutes, account_id, deleted_at)
transfers    (id, name, slug, description, main_image, account_id, deleted_at)
package_kits (id, name, description, cover_image_url, destination, category,
              duration_days, duration_nights, program_highlights, program_gallery,
              robots_noindex, account_id)

-- CATALOG V2 (enriquecimiento via bridge)
master_hotels    (id, name, description, star_rating, user_rating, reviews_count,
                  amenities, photos, city, country, latitude, longitude,
                  check_in_time, check_out_time, hotel_style, address, ...)
account_hotels   (id, account_id, master_hotel_id, legacy_hotel_id,
                  custom_name, custom_description, is_active)

master_activities (id, name, description, description_short, duration_minutes,
                   experience_type, city, country, latitude, longitude,
                   inclusions, exclusions, highlights, photos, ...)
account_activities (id, account_id, master_activity_id, legacy_activity_id,
                    custom_name, custom_description, is_active)

-- SEO overrides per-website (product_id = LEGACY ID)
website_product_pages (
  id, website_id, product_id, product_type,
  custom_seo_title, custom_seo_description,
  target_keyword, custom_seo_keywords[],
  robots_noindex, is_published, ...
  UNIQUE(website_id, product_type, product_id)
)

-- Pages y blogs
website_pages      (seo_title, seo_description, target_keyword, robots_noindex)
website_blog_posts (seo_title, seo_description, seo_keywords[])
```

### Flujo de datos

```
Fase 2: READ legacy + V2 bridge → WRITE only to website_product_pages (legacy ID)
Fase 3: READ + V2 enrichment para JSON-LD y AI context → WRITE to website_product_pages
```

---

## 5. ADR Compliance

| ADR | Status | Notas |
|-----|--------|-------|
| ADR-001 Server-First | ✅ | Dashboard es server component, RPCs server-side |
| ADR-002 Error Handling | ✅ | Fallback si query falla, V2 bridge degrada gracefully |
| ADR-003 Contract-First | ⚠️ PENDIENTE | Definir Zod schemas para respuestas de queries en website-contract |
| ADR-004 State Management | ✅ | Server components + URL params, useActionState para forms |
| ADR-005 Security | ✅ | getUser() + role check, RLS via account_id, rate limiting |
| ADR-006 AI Streaming | ✅ | Bulk usa ReadableStream + SSE, prompts en lib/ai/ |
| ADR-007 Edge-First | ✅ | Paginacion server-side 50/page, no cargar todo en memoria |
| ADR-008 Monorepo | ⚠️ PENDIENTE | Zod schemas nuevos deben ir en website-contract |
| ADR-009 Multi-Tenant | ✅ | Filtro por account_id, aislamiento correcto |
| ADR-010 Observability | ✅ | Logs [seo.dashboard], [seo.detail], [seo.ai] |
| ADR-032 Catalog V2 | ✅ | Hibrido: legacy base + V2 enrichment via bridge |

### ADR-003 / ADR-008 pendiente: Zod schemas

```typescript
// Agregar a @bukeer/website-contract:
export const SeoItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['hotel', 'activity', 'transfer', 'package', 'page', 'blog']),
  slug: z.string(),
  image: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  targetKeyword: z.string().nullable(),
  robotsNoindex: z.boolean().default(false),
  // V2 enrichment (optional)
  v2: z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    userRating: z.number().nullable(),
    reviewsCount: z.number().nullable(),
    photos: z.array(z.unknown()).nullable(),
  }).nullable().optional(),
});

export const SeoUpdateSchema = z.object({
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  targetKeyword: z.string().max(50).optional(),
  robotsNoindex: z.boolean().optional(),
});
```

---

## 6. Riesgos

| Riesgo | Severidad | Mitigacion |
|--------|-----------|-----------|
| RLS bloquea queries a hotels/activities | Media | Verificar policies; usar service_role si necesario en server component |
| Performance: 2,100 items scoring client-side | Media | Paginacion 50/page, scoring O(1) per item, lazy scoring |
| V2 bridge no existe para un hotel | Baja | Degradacion graceful: funciona sin V2, solo pierde enrichment |
| Activities V2 bridge parcial (20/828) | Baja | Mayoría usa solo legacy; V2 enrichment mejora con migracion |
| Editar descripcion en Studio conflicta con Flutter | N/A Rev4 | Studio solo edita SEO metadata, no contenido del producto |
| AI genera datos que inventan info | Media | Prompt: "NUNCA inventar datos no proporcionados" |
| CF Worker memory con queries pesadas | Media | Paginacion + stream para bulk (ADR-007) |

---

## 7. Metricas de exito

| Metrica | Antes (Fase 1) | Despues Fase 2 | Despues Fase 3 |
|---------|----------------|----------------|----------------|
| Items en dashboard | 523 | ~2,100 | ~2,100 |
| Items con SEO title | ~520 (pages+blogs) | ~520 + overrides | +80% con AI |
| Items con V2 enrichment | 0 | ~374 hotels, ~16 activities | Crece con migracion |
| Score promedio | B/89 (solo pages) | D/40 (productos sin SEO) | B/75 (con AI) |
| JSON-LD richness | Basico | + geo, rating (V2 items) | + policies, photos |

---

## 8. Archivos afectados

### Fase 2
| Archivo | Cambio |
|---------|--------|
| `app/dashboard/[websiteId]/seo/page.tsx` | Queries legacy + V2 bridge + override map |
| `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx` | fetchItemByType legacy + V2 + save |
| `app/api/ai/seo/generate-bulk/route.ts` | Queries actualizadas |
| `components/admin/bulk-seo-modal.tsx` | getTableForType |
| `lib/seo/unified-scorer.ts` | Checks para V2 data (geo, rating, gallery) |
| `packages/website-contract/src/types/seo.ts` | NEW: SeoItemSchema, SeoUpdateSchema |

### Fase 3
| Archivo | Cambio |
|---------|--------|
| `components/admin/seo-item-detail.tsx` | Tabs de contenido legacy read-only + V2 enrichment + preview |
| `components/seo/product-schema.tsx` | JSON-LD enriquecido: inclusions, gallery, geo, rating |
| `lib/ai/seo-prompts.ts` | Prompt expandido: inclusions, recommendations, gallery count, V2 context |
| `app/api/ai/seo/generate/route.ts` | Soporte para full content context |

### Contenido legacy que impacta el scorer y JSON-LD

| Campo legacy | Scorer check | JSON-LD property | AI prompt context |
|-------------|-------------|-------------------|-------------------|
| `description` | Word count > 150 | description | Si — fuente principal |
| `description_short` | Fallback si desc falta | — | Si — snippet |
| `inclutions` | Has inclusions? | offers / amenityFeature | Si — "incluye: ..." |
| `exclutions` | Has exclusions? | — | Si — "no incluye: ..." |
| `recomendations` | Content richness | — | Si — contexto |
| `instructions` | Has directions? | meetingPoint / directions | Si — punto de encuentro |
| `images` (gallery) | Gallery > 3 fotos? | image[] | Si — "X fotos disponibles" |
| `main_image` | Has image? | image primary | Si |
| `star_rating` | — | starRating | Si |
| `amenities` | Has amenities? | amenityFeature[] | Si |
| `check_in/out` | — | checkinTime/checkoutTime | Si |
| `vehicle_type` | — | vehicle | Si (transfers) |
| `experience_type` | — | additionalType | Si (activities) |
| `duration_minutes` | — | estimatedDuration | Si |
| `program_highlights` | — | itinerary highlights | Si (packages) |
