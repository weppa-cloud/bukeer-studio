# ColombiaTours Landing Optimization Apply - Google Ads

Fecha: 2026-05-18
Modo: apply aprobado por usuario
Alcance: campañas Search activas y landings usadas por Ads. Incluye cambios en Supabase `website_pages`, `website_product_pages`, scripts locales y mutaciones controladas en Google Ads.

## Resultado

- Todas las landings activas auditadas quedaron en 100% dentro del scoring operativo del auditor.
- Todas las landings activas devuelven 200, `index, follow`, GTM/gtag/dataLayer, WhatsApp y WAFlow detectables.
- Se eliminaron de pauta activa las URLs legacy rotas `/viajar-a-colombia-con-todo-incluido2` y `/viajar-a-colombia-con-todo-incluido2/` pausando sus `ad_group_ad` y el ad group activo elegible.
- BR queda activo con URL canónica sana `https://colombiatours.travel/pacotes-colombia` porque `/pt/pacotes-colombia` todavía renderiza 404 en producción aunque el RPC de Supabase ya encuentra el alias.
- El intento de revalidación ISR contra producción devolvió 401 por secreto local distinto, pero los smokes con cache-bust validan la lectura actualizada desde DB.

## Landings Activas Post-Aplicación

| Score | URL | Campañas | Estado |
| --- | --- | --- | --- |
| 100% | https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos | MX_Multidestino_y_Caribe_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/agencia-de-viajes-a-colombia-para-espanoles | ES_Cartagena_Medellin_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/eje-cafetero | ES_Cartagena_Medellin_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/viajes-a-colombia-desde-chile | CL_Search_Colombia_SanAndres_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/san-andres-4-dias | CL_Search_Colombia_SanAndres_2026_05, MX_Multidestino_y_Caribe_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera | ES_Cartagena_Medellin_2026_05, MX_Multidestino_y_Caribe_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/cartagena | MX_Multidestino_y_Caribe_2026_05, ES_Cartagena_Medellin_2026_05 | 200, index, tracking OK |
| 100% | https://colombiatours.travel/pacotes-colombia | BR_Search_Colombia_Packages_2026_05 | 200, index, tracking OK |

## Cambios Aplicados En Contenido

- MX: reforzado city-gating CDMX/Monterrey/Guadalajara, viaje completo, no hotel/vuelo suelto, agencias, testimonios y filtros de calidad.
- ES: reforzado Madrid/Barcelona, viajes organizados, agencias, todo incluido, Cali, Cartagena, Medellín y planner local.
- CL: reforzado Santiago, viaje completo, Cartagena de Indias, todo incluido, testimonios y ciudad de salida.
- Cartagena: corregido `post migration`, nuevo hero/meta, pricing, FAQ, trust y bloque de calidad.
- Eje Cafetero: añadido bloque de calidad con Madrid/Barcelona/CDMX/Monterrey/Santiago, viaje completo, testimonios y términos de intención.
- San Andrés: añadido bloque de calidad para paquetes, viajes a medida, todo incluido, origen y no hotel-only.
- Medellín/Guatapé: actualizado `website_product_pages` es-CO con meta title corto y descripción de viaje completo.
- BR/PT: actualizado `pacotes-colombia` con São Paulo, viaje completo, testimonios/avaliações, no hotel/pasaje avulso; creado alias DB `pt/pacotes-colombia` pero no usado en Ads por fallo de routing live.

## Cambios Aplicados En Google Ads

- `BR_Search_Colombia_Packages_2026_05`: mantiene São Paulo, PRESENCE, exact-first y final URL activa `https://colombiatours.travel/pacotes-colombia`.
- `Mexico Viajar a colombia  Prueba 44`: Google no permite cambiar `campaign.status` por ser trial campaign; se pausaron 2 `ad_group_ad` activos y el ad group activo `Viaja Por Colombia`.
- `Mexico Viajar a colombia dirigirlos al home`: Google no permite cambiar `campaign.status` por ser trial campaign; se pausó 1 `ad_group_ad` activo.
- Validación final de cleanup: `operationCounts.total = 0`; no quedan operaciones P0 pendientes para esos ad groups/ads.

## Evidencia

- Auditoría final: `artifacts/google-ads/2026-05-18-colombiatours-active-landing-alignment/active-landing-alignment-report.json`
- CSV scores: `artifacts/google-ads/2026-05-18-colombiatours-active-landing-alignment/landing-scores.csv`
- Apply landings: `artifacts/google-ads/2026-05-18-colombiatours-landing-optimizations/2026-05-18T19-24-55-573Z-apply-report.json`
- Apply score gaps: `artifacts/google-ads/2026-05-18-colombiatours-landing-score-gaps/2026-05-18T19-32-04-763Z-apply-report.json`
- Apply legacy cleanup: `artifacts/google-ads/2026-05-18-colombiatours-p0-legacy-cleanup/2026-05-18T19-24-53-842Z-apply-report.json`
- Apply BR canonical URL: `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T19-24-52-953Z-apply-br-report.json`
- Validación final BR idempotente: `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T19-31-16-842Z-validate-report.json`
- Reporte audit markdown final: `docs/audits/2026-05-18-colombiatours-active-landing-alignment.md`

## Validaciones Ejecutadas

- `node --check` para scripts Google Ads nuevos y modificados.
- `git diff --check` en archivos tocados.
- `npm run typecheck`.
- Auditoría Google Ads read-only post-apply: 6 campañas, 20 ads, 80 keywords, 321 search terms, 8 landings, todas 100%.
- Smoke HTTP con cache-bust: 8/8 URLs devuelven 200 y `<meta name="robots" content="index, follow"/>`.

## Pendientes Reales

- Corregir routing/deploy de `/pt/pacotes-colombia`; hoy Supabase RPC resuelve el alias, pero producción todavía renderiza “Página no encontrada”. No usar esa URL en Ads hasta que el Worker la sirva correctamente.
- Revisar en 24h y 72h: search terms, spend, CPC, CTR, `waflow_submit`, oportunidades CRM y calidad comercial.
- BR ad `809247707959` está ENABLED con approval status `UNKNOWN` en el último read; monitorear aprobación/policy review.
