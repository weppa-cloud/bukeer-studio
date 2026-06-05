# ColombiaTours CRM/CAPI Measurement Closure - 2026-05-19

## Decision Ejecutiva

Estado: **cerrado para medicion operativa Meta CAPI/CRM en la ventana activa**.

- Contrato tenant `meta_capi` activo para ColombiaTours, Pixel `361881980826384` y token CAPI presente.
- Replay acotado aplicado para eventos criticos con brecha: **13/13 enviados**, **0 fallidos**.
- Verificacion posterior: **0 candidatos pendientes** en la misma ventana.
- Ultimos 7 dias: **201 eventos Meta enviados**, **0 failed**, **0 skipped**.
- No se modificaron campanas, presupuestos, anuncios ni audiencias.

La medicion ya puede usarse como evidencia first-party para auditoria y aprendizaje. Para escalar Meta Ads con confianza falta elevar calidad de identidad y CRM quality signals, porque la entrega tecnica no garantiza leads de calidad.

## Accion Aplicada

Se aplico el replay controlado recomendado por el runbook de `funnel_events`:

```bash
npm run dispatch:replay -- --destination=meta \
  --account-id=9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id=894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --event-names=waflow_submit,crm_quote_sent,chatwoot_label_qualified,qualified_lead,crm_lead_stage_qualified,crm_booking_confirmed,booking_confirmed,whatsapp_cta_click \
  --since=2026-05-12T12:00:00Z \
  --until=2026-05-19T03:14:39Z \
  --limit=200 \
  --out-dir=artifacts/funnel-events/2026-05-19-colombiatours-meta-capi-close-apply \
  --apply
```

Resultado:

| metric | value |
| --- | --- |
| Eventos escaneados | 200 |
| Candidatos a replay | 13 |
| Aplicados | 13 |
| Fallidos en apply | 0 |
| Candidatos post-apply dry-run | 0 |

Eventos recuperados:

| event | count |
| --- | --- |
| crm_quote_sent | 6 |
| whatsapp_cta_click | 4 |
| waflow_submit | 3 |

Reference codes cubiertos: `HOME-1205-6KZ3`, `HOME-1205-FJJT`, `HOME-1205-SQTJ`, `WEB-I0WNHC134A`.

## Estado Tecnico Actual

| item | status |
| --- | --- |
| Website | colombiatours |
| Website status | published |
| Meta CAPI contract | active |
| Environment | production |
| Service channel | meta_capi / active |
| Pixel ID | 361881980826384 |
| API version | v21.0 |
| CAPI credentials | present |

## Mappings Meta Confirmados

| funnel_event | destination | meta_event | enabled | note |
| --- | --- | --- | --- | --- |
| booking_confirmed | meta | Purchase | true | TEMP #425: legacy alias for crm_booking_confirmed during production validation. |
| chatwoot_label_qualified | meta | Lead | true | TEMP 2026-05-09: website Lead fallback until tenant page_id/waba_id is configured for business_ |
| chatwoot_label_qualified | meta_messaging | LeadSubmitted | false |  Meta business_messaging requires LeadSubmitted, not Lead. Disabled 2026-05-09: Meta business_m |
| crm_booking_confirmed | meta | Purchase | true | DB trigger is principal owner; value is total_markup. |
| crm_lead_stage_qualified | meta | Lead | true |  |
| crm_quote_sent | meta | InitiateCheckout | true |  |
| qualified_lead | meta | Lead | true | TEMP #425: legacy alias website Lead fallback until tenant page_id/waba_id is configured for bu |
| qualified_lead | meta_messaging | LeadSubmitted | false | TEMP #425: legacy alias for chatwoot_label_qualified during production validation. Meta busines |
| quote_sent | meta | InitiateCheckout | true | TEMP #425: legacy alias for crm_quote_sent during production validation. |
| waflow_submit | meta | Lead | true | Initial lead conversion. |
| whatsapp_cta_click | meta | Contact | true | Secondary intent signal. |

## Logs Meta

Ultimos 7 dias:

| event_status | count |
| --- | --- |
| InitiateCheckout|sent | 91 |
| Contact|sent | 57 |
| Lead|sent | 53 |

Ultimos 14 dias:

| event_status | count |
| --- | --- |
| InitiateCheckout|sent | 118 |
| Lead|sent | 102 |
| Contact|sent | 82 |
| Purchase|sent | 5 |
| Purchase|failed | 4 |
| Lead|failed | 3 |
| Lead|skipped | 3 |
| Contact|skipped | 1 |
| LeadSubmitted|failed | 1 |

Resumen 14 dias: `{"sent":307,"failed":8,"skipped":4}`.

Resumen 90 dias: `{"sent":336,"skipped":27,"failed":15}`.

## GA4 Y Google Ads Offline

El replay usa el dispatcher central. En los eventos sin click id, Google Ads debe quedar `skipped`; eso no es error de medicion, es proteccion para no subir conversiones offline sin `gclid`, `gbraid` o `wbraid`.

| plataforma | ventana | sent | skipped | failed | lectura |
| --- | --- | --- | --- | --- | --- |
| GA4 Measurement Protocol | 7d | 395 | 0 | 0 | Cerrado |
| GA4 Measurement Protocol | 14d | 440 | 0 | 0 | Cerrado |
| Google Ads offline uploads | 7d | 104 | 40 | 0 | Cerrado con skips esperados por falta de click id |
| Google Ads offline uploads | 14d | 140 | 64 | 12 | Incidencias historicas; ultimos 7d limpios |

Google Ads 7d por conversion action:

| conversion_action_id | status | count |
| --- | --- | --- |
| 7604169583 | sent | 67 |
| 7604169577 | sent | 37 |
| 7604169583 | skipped | 24 |
| 7604169577 | skipped | 16 |

## Cobertura De Identidad Y Atribucion

14 dias:

| signal | count | coverage |
| --- | --- | --- |
| reference_code | 369 | 100% |
| pixel_event_id | 300 | 81.3% |
| gclid/gbraid/wbraid | 214 | 58% |
| user_email/user_phone columns | 219 | 59.3% |
| fbp | 21 | 5.7% |
| fbc | 17 | 4.6% |
| ctwa_clid | 4 | 1.1% |
| value_amount | 5 | 1.4% |

90 dias:

| signal | count | coverage |
| --- | --- | --- |
| reference_code | 475 | 100% |
| pixel_event_id | 300 | 63.2% |
| gclid/gbraid/wbraid | 214 | 45.1% |
| user_email/user_phone columns | 219 | 46.1% |
| fbp | 21 | 4.4% |
| fbc | 17 | 3.6% |
| ctwa_clid | 4 | 0.8% |
| value_amount | 5 | 1.1% |

Interpretacion: la trazabilidad first-party por `reference_code` esta completa, y la identidad CRM en columnas existe en una parte importante. Para Meta, la senal de match sigue limitada cuando no hay trafico real de Meta con `fbclid/fbc/fbp`; por eso no recomiendo optimizar Meta a volumen todavia.

## Incidencias Residuales

| issue | count | action |
| --- | --- | --- |
| Failed Meta 14d | 8 | No bloquear si no reaparece; ultimos 7d limpios. |
| Skipped Meta 14d | 4 | Monitorear; post-apply sin candidatos. |
| Purchase failures 2026-05-11 | 4 | No replay: fuera/rozando ventana Meta 7d y error por timestamp viejo. |
| Lead/LeadSubmitted failures 2026-05-09 | 4 | Config historica business_messaging; fallback website Lead ya activo. |

## Decision Para Meta Ads

- `PASS` para medicion tecnica CAPI: eventos recientes llegan a Meta.
- `WATCH` para optimizacion de calidad: Meta no debe escalar hasta que CRM marque leads utiles y haya mayor match de identidad en trafico Meta real.
- `HOLD` para business_messaging: mantener `meta_messaging` apagado hasta configurar `page_id`/`whatsapp_business_account_id` por tenant y validarlo con Events Manager.

## Siguientes Acciones Recomendadas

1. Crear evento first-party `crm_lead_quality_confirmed` o usar `crm_lead_stage_qualified` estrictamente cuando ventas confirme lead util, no solo submit.
2. Enviar a Meta `Lead` solo para calidad confirmada en campanas de aprendizaje; mantener `Contact` y `InitiateCheckout` como senales secundarias.
3. Mejorar identity payload server-side: hash de email/telefono para Meta CAPI sin exponer PII cruda en reportes.
4. En cualquier test Meta, exigir UTMs, `fbclid`/`fbc`/`fbp` y `reference_code` antes de declarar aprendizaje valido.
5. Ejecutar smoke diario de 7 dias: Meta `failed=0`, candidatos replay `0`, y muestra CRM con quote/opportunity.

## Evidencia

- Apply replay: `artifacts/funnel-events/2026-05-19-colombiatours-meta-capi-close-apply/dispatch-replay-meta-report.json`
- Post-apply dry-run: `artifacts/funnel-events/2026-05-19-colombiatours-meta-capi-close-post-apply-dry-run/dispatch-replay-meta-report.json`
- Summary JSON: `artifacts/funnel-events/2026-05-19-colombiatours-meta-capi-measurement-closure/measurement-closure-summary.json`
