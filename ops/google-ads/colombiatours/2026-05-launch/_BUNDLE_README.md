# 2026-05-launch — Bundle import Google Ads Editor

**Tenant**: ColombiaTours (`1261189646`)
**Budget mes 1**: USD $1,000
**Status**: 🟡 draft (ver `_STATUS.md`)

## 13 archivos del bundle

| Archivo | Vista Editor | Filas esperadas | Notas |
|---|---|---:|---|
| `00_campaigns.csv` | Campaigns | 2 | MX + ES |
| `01_ad_groups.csv` | Ad groups | 7 | 4 MX + 3 ES |
| `02_keywords.csv` | Keywords > Search keywords | ~40 | Mix PHRASE/EXACT |
| `03_responsive_search_ads.csv` | Ads > Responsive search ads | 7 | 1 RSA por AG |
| `04_negative_keywords.csv` | Keywords > Negative keywords | ~50 | Account-level shared list |
| `05_sitelinks.csv` | Ad assets > Sitelinks | ~12 | 4-6 por campaña |
| `06_callouts.csv` | Ad assets > Callouts | ~10 | |
| `07_structured_snippets.csv` | Ad assets > Structured snippets | 2-3 | Header + values |
| `08_audience_targeting.csv` | Audiences (Targeting) | ~6 | In-market + Customer Match |
| `09_location_bid_adjustments.csv` | Locations | ~6 | CDMX, Madrid, etc. |
| `10_ad_schedule.csv` | Ad schedule | 2 | 1 por campaña |
| `11_demographics.csv` | Demographics | ~6 | Age, Gender, Income |
| `12_device_bid_adjustments.csv` | Devices | ~6 | Mobile/Tablet/Desktop |

## Lo que NO se hace via Editor (Web UI manual)

1. Conversion actions — crear las 4 (`waflow_lead_submit`, `whatsapp_cta_click`, `phone_cta_click`, `crm_booking_confirmed`) — ver Playbook 01
2. Customer Match audience UPLOAD del CSV de contactos — Web UI > Audience manager
3. Bid strategy values específicos (target CPA value, target ROAS) si aplican

## Workflow

1. Ejecutar [Playbook 01](../../../playbooks/01-pre-launch-checklist.md) (Web UI prep)
2. Llenar los 13 CSVs (Phase 2 — copywriting completo)
3. Cambiar `_STATUS.md` → `approved`
4. Ejecutar [Playbook 02](../../../playbooks/02-import-via-editor.md) (import via Editor)
5. Cambiar `_STATUS.md` → `live` cuando campañas estén corriendo
6. Aplicar [Playbook 03](../../../playbooks/03-post-launch-monitoring.md) diariamente
7. [Playbook 05](../../../playbooks/05-emergency-pause.md) en mano por si acaso

## Gotchas

- Encoding UTF-8 (con o sin BOM ambos OK)
- Separador coma `,`
- Headers en inglés (case y espacios no importan)
- `Type` column: `Broad`/`Phrase`/`Exact`/`Negative` literales
- `Bid Strategy Type` literal: `Manual CPC`, `Maximize conversions`, etc.
- Geo IDs numéricos: MX=`2484`, ES=`2724`, US=`2840`
- Multi-value separator: `;`
- Dates `MM/DD/YYYY`
- Borrar filas `[EJEMPLO_BORRAR]` antes de import
- Account-level negatives: `Campaign = <Account-level>` literal

## Referencias

- [`docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md`](../../../../docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md)
- [Google Ads Editor — CSV columns](https://support.google.com/google-ads/editor/answer/57747)
- [Make multiple changes](https://support.google.com/google-ads/editor/answer/47660)
