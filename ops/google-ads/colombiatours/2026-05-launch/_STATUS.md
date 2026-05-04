# Status: 🟢 approved (pendiente import)

**Iteración**: ColombiaTours launch mes 1
**Created**: 2026-05-03
**Last update**: 2026-05-03 (Phase 2 — copywriting completo)
**Owner**: Growth lead

## Etiqueta

`approved` — diseño firmado, copywriting completo, listo para Playbook 01 (Web UI prep) → Playbook 02 (import via Editor).

## Estado de archivos

| Archivo | Estado | Filas (excl header) |
|---|---|---:|
| `00_campaigns.csv` | ✅ Completo | 2 (MX + ES) |
| `01_ad_groups.csv` | ✅ Completo | 7 (4 MX + 3 ES) |
| `02_keywords.csv` | ✅ Completo | 45 keywords |
| `03_responsive_search_ads.csv` | ✅ Completo | 7 RSAs (15 H + 4 D cada) |
| `04_negative_keywords.csv` | ✅ Completo (copia de master) | 44 negatives |
| `05_sitelinks.csv` | ✅ Completo | 12 (6 MX + 6 ES) |
| `06_callouts.csv` | ✅ Completo | 16 (8 MX + 8 ES) |
| `07_structured_snippets.csv` | ✅ Completo | 4 (Destinos + Servicios × 2) |
| `08_audience_targeting.csv` | ✅ Completo | 8 (Customer Match + 3 in-market × 2) |
| `09_location_bid_adjustments.csv` | ✅ Completo | 6 (3 ciudades × 2) |
| `10_ad_schedule.csv` | ✅ Completo | 2 (1 por campaña) |
| `11_demographics.csv` | ✅ Completo | 8 (Income + Age × 2) |
| `12_device_bid_adjustments.csv` | ✅ Completo | 6 (3 devices × 2) |

## Estructura final

### 🇲🇽 Campaña MX_Multidestino_y_Caribe_2026_05 — $500/mes

- **Geo**: México (`2484`) excl Colombia (`-2170`)
- **Bid**: Maximize conversions
- **Daily budget**: 67,000 COP
- **Audiences overlay**: ColombiaTours_Past_Customers +30%, In-market Travel +15%

| Ad Group | Max CPC | Landings | Keywords |
|---|---:|---|---:|
| AG1_San_Andres_Caribe | 4,000 COP | `/san-andres-4-dias` | 8 |
| AG2_Multidestino_Tours | 5,500 COP | `/agencia-de-viajes-a-colombia-para-mexicanos` + `/tour-colombia-10-dias` + paquetes | 9 |
| AG3_Cartagena_Caribe | 6,000 COP | `/cartagena` + `/cartagena-4-dias` | 6 |
| AG4_Medellin_Guatape | 7,000 COP | `/paquetes/medellin-y-guatape-5-dias-...` | 3 |

### 🇪🇸 Campaña ES_Cartagena_Medellin_2026_05 — $300/mes

- **Geo**: España (`2724`) excl Colombia (`-2170`)
- **Bid**: Maximize conversions
- **Daily budget**: 40,000 COP
- **Audiences overlay**: ColombiaTours_Past_Customers +30%, Premium income +25%

| Ad Group | Max CPC | Landings | Keywords |
|---|---:|---|---:|
| AG1_Cartagena_Premium | 4,000 COP | `/cartagena` + `/paquetes/cartagena-premium-...` | 6 |
| AG2_Medellin_Cultural | 4,500 COP | `/paquetes/medellin-y-guatape-5-dias-...` | 5 |
| AG3_Multidestino_Premium | 8,000 COP | `/agencia-de-viajes-a-colombia-para-espanoles` + `/paquetes/gran-tour-colombia-15-dias-...` + `/tour-colombia-15-dias` | 8 |

## Decisiones tomadas

1. ✅ Eliminado AG2 San Gil (no hay landing) — $50 reasignado a Multidestino (gold mine en standby)
2. ✅ Eliminada Campaña USA (no hay locale EN) — $200 quedaron como reserva ($800 total mes 1 vs $1000 plan original)
3. ✅ Eliminada Brand defensiva (volumen branded <100/mes — $100 reasignado)
4. ✅ Geo MX/ES con exclusión Colombia (`-2170`) para evitar tráfico local
5. ✅ Tracking template con `&gclid={gclid}` para redundancia (F2 middleware ya captura)

## Decisiones pendientes (humano)

1. ⏸ **Validar dev token Google Ads** (`TODO[F2-followup]` en `lib/google-ads/offline-upload.ts`) — sin esto el dispatcher F2 no envía conversions reales
2. ⏸ **Crear landing `/san-gil`** (1 día dev — gold mine $0.17 CPC × 9,900 vol/mes)
3. ⏸ **Crear locale EN** (3-5 días dev — desbloquea Campaña US con $200 reserve)
4. ⏸ **Validar copy ES** (revisión nativa — terminología "vacaciones"/"circuito" vs "viaje"/"tour")
5. ⏸ **Confirmar Customer Match audience name** post upload — actualizar `08_audience_targeting.csv` si difiere

## Próximos pasos

1. ✅ ~~Phase 1: estructura + templates~~
2. ✅ ~~Phase 2: copywriting completo~~
3. ⏭️ Ejecutar [Playbook 01](../../../playbooks/01-pre-launch-checklist.md) (Web UI prep)
4. ⏭️ Esperar merge dev → producción para que F2 dispatcher esté live
5. ⏭️ Ejecutar [Playbook 02](../../../playbooks/02-import-via-editor.md) (import via Editor)
6. ⏭️ Cambiar `_STATUS.md` → `live`
7. ⏭️ Aplicar [Playbook 03](../../../playbooks/03-post-launch-monitoring.md) daily/weekly

## Volumetría esperada

| Campaña | Budget | Clicks/mes | Leads/mes | CPA proxy |
|---|---:|---:|---:|---:|
| 🇲🇽 MX | $500 | ~666 | 20-26 | $19-25 |
| 🇪🇸 ES | $300 | ~353 | 14-18 | $17-21 |
| **Total** | **$800** | **~1,019** | **34-44** | **$18-24** |

(Reserva $200 sin asignar — pendiente decisión USA o reasignar)

## Referencias

- Audit completo: [`docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md`](../../../../docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md)
- Bundle README: [`_BUNDLE_README.md`](./_BUNDLE_README.md)
- Tenant overview: [`../README.md`](../README.md)
- F1/F2/F3 PRs (mergeados): [#426](https://github.com/weppa-cloud/bukeer-studio/pull/426) [#428](https://github.com/weppa-cloud/bukeer-studio/pull/428) [#427](https://github.com/weppa-cloud/bukeer-studio/pull/427)
