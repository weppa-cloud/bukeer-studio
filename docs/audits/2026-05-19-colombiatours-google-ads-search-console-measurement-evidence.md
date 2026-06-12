# ColombiaTours - Evidencia Google Ads + Search Console - 2026-05-19

## Decision

No necesitamos activar campanas ni simular para probar el ciclo de medicion de Google Ads. Ya hay evidencia real de clicks, conversiones, click ids, eventos first-party y offline uploads enviados.

- Google Ads offline uploads 7d: **136 sent**, **72 skipped esperados**, **0 failed**, **0 pending**.
- Replay dry-run con click id: **136 eventos escaneados**, **0 candidatos pendientes**.
- Google Ads Search 7d activo: **559 clicks**, **COP 1,299,362** de spend, **34 conversions**, **97 all conversions**.
- Search Console: **10/10 landings inspeccionadas PASS**, indexacion permitida, fetch exitoso y canonical correcto.
- GA4 MP sigue limpio: **395 sent 7d**, **0 failed**.

Simulacion solo aplica si creamos un evento nuevo, una landing nueva sin trafico, o cambiamos mapping/conversion action. Para lo actual, usar simulacion seria menor evidencia que el trafico real.

## Google Ads - Evidencia De Medicion

Ventana: 2026-05-13 a 2026-05-19.

| campaign | id | status | spend | clicks | impressions | conversions | allConversions | tracking |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MX_Multidestino_y_Caribe_2026_05 | 23815528484 | ENABLED | COP 618,356 | 308 | 1701 | 18 | 55 | yes |
| ES_Cartagena_Medellin_2026_05 | 23819986291 | ENABLED | COP 449,383 | 153 | 1110 | 12 | 34 | yes |
| CL_Search_Colombia_SanAndres_2026_05 | 23829507075 | ENABLED | COP 212,884 | 92 | 804 | 4 | 8 | yes |
| BR_Search_Colombia_Packages_2026_05 | 23843668228 | ENABLED | COP 18,739 | 6 | 34 | 0 | 0 | yes |

Totales activos: COP 1,299,362, 559 clicks, 3649 impressions, 34 conversions, 97 all conversions.

## Google Ads Offline Uploads

| metric | value |
| --- | --- |
| rows_7d | 208 |
| sent_7d | 136 |
| skipped_7d | 72 |
| failed_7d | 0 |
| pending_7d | 0 |
| with_click_id_sent | 136 |
| replay_dry_run_candidates | 0 |

Por evento y estado:

| eventStatus | count |
| --- | --- |
| crm_quote_sent\|sent | 90 |
| crm_quote_sent\|skipped | 47 |
| waflow_submit\|sent | 46 |
| waflow_submit\|skipped | 24 |
| crm_booking_confirmed\|skipped | 1 |

Por conversion action:

| actionStatus | count |
| --- | --- |
| 7604169583\|sent | 90 |
| 7604169583\|skipped | 47 |
| 7604169577\|sent | 46 |
| 7604169577\|skipped | 24 |
| 7604169586\|skipped | 1 |

Conversion actions relevantes:

- `7604169577`: Bukeer SOT - waflow_submit.
- `7604169583`: Bukeer SOT - quote_sent.
- `7604169586`: Bukeer SOT - booking_confirmed.

Muestra de trazabilidad reciente:

| event | reference_code | action | status | sent_at | click_id | campaign |
| --- | --- | --- | --- | --- | --- | --- |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:26:20.98+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:26:03.723+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:25:36.295+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:25:25.309+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:25:18.381+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:24:03.842+00:00 | yes | 23815528484 |
| crm_quote_sent | PAQUET-1905-ZGGZ | 7604169583 | sent | 2026-05-19T22:20:14.263+00:00 | yes | 23815528484 |
| waflow_submit | PAQUET-1905-ZGGZ | 7604169577 | sent | 2026-05-19T22:17:43.702+00:00 | yes | 23815528484 |

## Search Console - Evidencia De Indexacion

Propiedad: `sc-domain:colombiatours.travel`.

Health check GSC 2026-05-09 a 2026-05-16:

| metric | current | change |
| --- | --- | --- |
| clicks | 85 | +16.4% |
| impressions | 10612 | -16.2% |
| ctr | 0.80% | +38.9% |
| avg_position | 30.55 | flat |

Inspeccion de landings activas/prioritarias:

| url | verdict | coverage | lastCrawl | richResults |
| --- | --- | --- | --- | --- |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos | PASS | Enviada e indexada | 2026-05-15T01:38:22Z | FAIL: FAQPage duplicado |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-espanoles | PASS | Enviada e indexada | 2026-04-25T01:48:39Z | PASS |
| https://colombiatours.travel/viajes-a-colombia-desde-chile | PASS | Enviada e indexada | 2026-05-15T01:43:48Z | PASS |
| https://colombiatours.travel/pacotes-colombia | PASS | Enviada e indexada | 2026-05-15T01:24:51Z | PASS |
| https://colombiatours.travel/san-andres-4-dias | PASS | Enviada e indexada | 2026-05-07T16:39:40Z | PASS |
| https://colombiatours.travel/eje-cafetero | PASS | Enviada e indexada | 2026-05-14T14:23:33Z | PASS |
| https://colombiatours.travel/cartagena | PASS | Enviada e indexada | 2026-05-13T17:33:15Z | PASS |
| https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera | PASS | Enviada e indexada | 2026-05-17T11:09:52Z | PASS with product warnings |
| https://colombiatours.travel/paquetes | PASS | Enviada e indexada | 2026-05-19T21:37:16Z | PASS |
| https://colombiatours.travel/ | PASS | Enviada e indexada | 2026-05-19T12:48:24Z | PASS |

Warnings SEO separados del ciclo Ads:

- 4 sitemaps de locales con errores: `sitemap-pt-PT.xml`, `sitemap-fr-FR.xml`, `sitemap-de-DE.xml`, `sitemap-pt-BR.xml`.
- `sitemap.xml`, `sitemap-es-CO.xml`, `sitemap-en-US.xml` y `sitemap_index.xml` estan descargando sin error.
- Landing MX indexada, pero rich results tiene error de `FAQPage` duplicado.
- Paquete Medellin indexado, con warnings de producto por `review`/`aggregateRating` faltantes.

## Interpretacion Operativa

Google Ads ya tiene el ciclo de medicion cerrado para eventos actuales porque:

1. El click entra con tracking de campana (`utm_source=google`, `utm_campaign`, `gclid/gbraid/wbraid`).
2. El evento first-party entra en `funnel_events` con `reference_code`.
3. `waflow_submit` y `crm_quote_sent` salen a `google_ads_offline_uploads`.
4. Los eventos con click id estan `sent`; los que no tienen click id quedan `skipped`, que es el comportamiento correcto.
5. El replay dry-run no encuentra pendientes.

Search Console confirma que las landings no estan bloqueadas por indexacion/crawl, pero no prueba conversiones de Ads. Sirve como evidencia de salud organica y readiness de landing.

## Governance Google Ads

El check de conversion governance confirma que existen conversion actions SOT por upload de clicks, pero mantiene una advertencia de limpieza:

| metric | value |
| --- | --- |
| canonicalUploadActionCount | 6 |
| legacyBiddingActionCount | 4 |
| webpageLeadBiddingActionCount | 0 |
| blockers | legacy_imported_actions_still_in_bidding_or_conversions_metric |

Lectura: esto no contradice que el ciclo de upload este cerrado. Significa que antes de escalar Smart Bidding conviene limpiar conversiones legacy importadas que siguen como primary/include.

## Recomendacion

- No activar campanas solo para probar medicion.
- No simular Google Ads mientras haya eventos reales recientes con click id.
- Mantener aprendizaje con campanas actuales y cerrar calidad CRM por `reference_code`.
- Corregir warnings SEO: sitemaps locales y FAQ duplicado en landing MX.
- Simular solo para un nuevo evento/mapping o una landing nueva antes de activarla.

## Evidencia Local

- Search inspector: `artifacts/google-ads/2026-05-19-colombiatours-google-ads-measurement-evidence/search-inspector-7d.json`
- Google Ads offline ledger: `artifacts/google-ads/2026-05-19-colombiatours-google-ads-measurement-evidence/google-ads-offline-ledger-7d.json`
- Google Ads replay dry-run: `artifacts/google-ads/2026-05-19-colombiatours-google-ads-measurement-evidence/google-ads-offline-dry-run/dispatch-replay-google_ads-report.json`
- Search Console summary: `artifacts/google-ads/2026-05-19-colombiatours-google-ads-measurement-evidence/search-console-evidence-summary.json`
- Platform dispatch summary: `artifacts/funnel-events/2026-05-19-colombiatours-meta-capi-measurement-closure/platform-dispatch-summary.json`
- Google Ads conversion governance: `artifacts/google-ads/2026-05-19-colombiatours-google-ads-measurement-evidence/google-ads-conversion-governance.json`
