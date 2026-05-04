# Landing pages inventory — ColombiaTours

Inventario verificado contra Supabase 2026-05-03.

## Custom pages

| URL | Título | Uso recomendado |
|---|---|---|
| `/` | Home | Brand defensiva |
| `/cartagena` | Cartagena de Indias | AG Cartagena (top funnel) |
| `/eje-cafetero` | Eje Cafetero - Ruta del Café | (descartado vol Ads) |
| `/san-andres-4-dias` | San Andrés 4 Días y 3 Noches | **AG San Andrés MX** ⭐ |
| `/cartagena-4-dias` | Cartagena 4 Días | Alt Cartagena (bottom funnel) |
| **`/agencia-de-viajes-a-colombia-para-mexicanos`** ⭐ | "Viaje Colombia Todo Incluido desde **México**" | **AG Multidestino MX** |
| **`/agencia-de-viajes-a-colombia-para-espanoles`** ⭐ | "Viaje Colombia Todo Incluido desde **España**" | **AG Multidestino ES** |
| `/tour-colombia-10-dias` | Tour Colombia 10 Días | target_keyword exacto |
| `/tour-colombia-15-dias` | Tour Colombia 15 Días | Multidestino premium |
| `/colombia-corazon-15-dias` | Cartagena, Cali, Medellín, Bogotá | Multidestino largo |
| `/colombia-esencia-12-dias` | Santa Marta, Eje, Medellín | Naturaleza+cultura |
| `/colombia-armonia-8-dias` | Eje + Medellín | Premium 8d |
| `/colombia-ritmo-y-sabor-11-dias` | Cali, Medellín, Cartagena | Variantes |
| `/medellin-cartagena-6-dias` | City + Guatapé + Caribe | AG Medellín |
| `/bogota-cartagena-6-dias` | Capital + Caribe | (Bogotá descartado en Ads) |
| `/los-mejores-paquetes-de-viajes-a-colombia` | Mejores Paquetes 2026 | target_keyword exacto |
| `/paquetes-a-colombia-todo-incluido-en-9-dias` | Colombia 9 Días | Alt multidestino |

## Package kits con slug → `/paquetes/[slug]`

Solo `status='active'`. Drafts/QA fixtures excluidos.

| Slug | Nombre | Destination | Días | Uso |
|---|---|---|:---:|---|
| `colombia-en-familia-15-dias-aventura-y-confort` | Colombia en Familia 15 Días | 4 destinos | 15 | Multidestino MX (familia) |
| `colombia-imperdible-9-dias-bogota-medellin-y-cartagena` | Colombia Imperdible 9 Días | 3 destinos | 9 | Multidestino MX/ES |
| `gran-tour-colombia-15-dias-bogota-eje-cafetero-medellin-y-santa-marta` | Gran Tour 15 Días | 4 destinos | 15 | **Multidestino ES** premium |
| `cartagena-premium-ciudad-amurallada-y-caribe-5-dias` | Cartagena Premium 5 Días | Cartagena | 5 | **AG Cartagena ES** ticket alto |
| **`medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera`** ⭐ | Medellín y Guatapé 5 Días | Medellín | 5 | **AG Medellín** (única landing pura) |
| `escapada-colombia-7-dias-medellin-y-cartagena` | Escapada Colombia 7 Días | 2 destinos | 7 | Combo MX/ES |
| `ruta-cafetera-autentica-4-dias-salento-y-cocora` | Ruta Cafetera 4 Días | Eje cafetero | 4 | (descartado) |
| `bogota-esencial-cultura-y-sal-4-dias` | Bogotá Esencial 4 Días | Bogotá | 4 | (descartado) |
| `santa-marta-y-tayrona-5-dias-mar-y-naturaleza` | Santa Marta y Tayrona 5 Días | Santa Marta | 5 | Reserva US fase 2 |

## Activities → `/actividades/[slug]`

100+ activities. **NO usar como Search Ads primary** (intent muy específico). Reservar para retargeting + SEO long-tail.

## Gaps detectados

| Gap | Workaround | Costo crear |
|---|---|---|
| `/medellin` puro | `/paquetes/medellin-y-guatape-5-dias-...` | Bajo |
| `/san-gil` o `/santander` | NINGUNO | 1 día (desbloquea CPC $0.17 con 9,900 vol/mes) ⭐ |
| `/bogota` puro | `/paquetes/bogota-esencial-cultura-y-sal-4-dias` | Bajo |
| Versión EN del sitio | NINGUNA | 3-5 días (desbloquea Campaña USA) |

## Verificar inventario

```sql
SELECT page_type, slug, title, target_keyword, robots_noindex
FROM website_pages
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND is_published = true
ORDER BY page_type, slug;

SELECT slug, name, destination, duration_days, status
FROM package_kits
WHERE account_id = '9fc24733-b127-4184-aa22-12f03b98927a'
  AND slug IS NOT NULL AND slug != ''
  AND status = 'active'
ORDER BY destination NULLS LAST;
```
