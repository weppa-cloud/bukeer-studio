# Status: 🟡 draft

**Iteración**: ColombiaTours launch mes 1
**Created**: 2026-05-03
**Last update**: 2026-05-03
**Owner**: Growth lead

## Etiqueta

`draft` — diseño en construcción, no aprobado

## Estado de archivos

| Archivo | Estado |
|---|---|
| `00_campaigns.csv` | ⚪ Solo header + ejemplo |
| `01_ad_groups.csv` | ⚪ Solo header |
| `02_keywords.csv` | ⚪ Solo header |
| `03_responsive_search_ads.csv` | ⚪ Solo header |
| `04_negative_keywords.csv` | ⚪ Vacío (negatives master en `shared/`) |
| `05_sitelinks.csv` | ⚪ Solo header |
| `06_callouts.csv` | ⚪ Solo header |
| `07_structured_snippets.csv` | ⚪ Solo header |
| `08_audience_targeting.csv` | ⚪ Solo header |
| `09_location_bid_adjustments.csv` | ⚪ Solo header |
| `10_ad_schedule.csv` | ⚪ Solo header |
| `11_demographics.csv` | ⚪ Solo header |
| `12_device_bid_adjustments.csv` | ⚪ Solo header |

## Diseño aprobado (audit doc)

- 2 campañas: 🇲🇽 MX_Multidestino_y_Caribe ($500) + 🇪🇸 ES_Cartagena_Medellin ($300)
- 1 reserva $200 (USA pendiente landing EN, o reasignar a MX)
- 7 ad groups (4 MX + 3 ES)
- Bid: Maximize Conversions desde día 1 con micro-conversions
- Customer Match audience +30% bid adjustment

## Decisiones pendientes

1. ⏸ Crear landing `/san-gil` para gold mine CPC $0.17 (1 día dev)
2. ⏸ Crear locale EN para Campaña US (3-5 días dev)
3. ⏸ Mergear PR #426 (F1) + #428 (F2) antes de prender — sin dispatcher, no hay atribución real
4. ⏸ Confirmar Customer Match audience name antes de llenar `08_audience_targeting.csv`
5. ⏸ Validar dev token Google Ads (TODO[F2-followup] en lib/google-ads/offline-upload.ts)

## Próximos pasos

1. **Phase 2**: llenar los 13 CSVs con copywriting completo
2. Cambiar status → `approved` cuando humano valide
3. Ejecutar Playbook 01 (pre-launch checklist Web UI)
4. Esperar merge F1+F2 a dev
5. Ejecutar Playbook 02 (import via Editor)
6. Cambiar status → `live`
7. Aplicar Playbook 03 daily/weekly

## Referencias

- Audit completo: [`docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md`](../../../../docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md)
- Bundle README: [`_BUNDLE_README.md`](./_BUNDLE_README.md)
- Tenant overview: [`../README.md`](../README.md)
- F1/F2 PRs: [#426](https://github.com/weppa-cloud/bukeer-studio/pull/426) [#428](https://github.com/weppa-cloud/bukeer-studio/pull/428)
