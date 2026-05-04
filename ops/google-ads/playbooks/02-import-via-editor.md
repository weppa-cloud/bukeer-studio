# Playbook 02 — Import via Google Ads Editor desktop

**Cuándo**: después de Playbook 01, con `_STATUS.md = approved`.
**Owner**: humano operador.

## Setup inicial

1. Descargar Editor: https://ads.google.com/intl/en/home/tools/ads-editor/
2. Login con cuenta acceso a Google Ads `<customer_id>`
3. Open account → tenant
4. Get recent changes (sync)

## Import paso a paso

Cada CSV se pega en su vista correspondiente. Respetar orden (dependencias).

| # | Archivo | Vista en Editor | Notas |
|---|---|---|---|
| 1 | `00_campaigns.csv` | Campaigns | Bid strategy literal: `Maximize conversions`, `Manual CPC`, etc. |
| 2 | `01_ad_groups.csv` | Ad groups | Cada AG referencia campaña por nombre exacto |
| 3 | `02_keywords.csv` | Keywords > Search keywords | `Type` column = `Broad`/`Phrase`/`Exact` |
| 4 | `03_responsive_search_ads.csv` | Ads > Responsive search ads | Mín 3 H + 2 D; recomendado 11+ H y 4 D |
| 5 | `04_negative_keywords.csv` | Keywords > Negative keywords | Para shared list: crear lista en Web UI primero |
| 6 | `05_sitelinks.csv` | Ad assets > Sitelinks | |
| 7 | `06_callouts.csv` | Ad assets > Callouts | |
| 8 | `07_structured_snippets.csv` | Ad assets > Structured snippets | Header + values con `;` |
| 9 | `08_audience_targeting.csv` | Audiences (Targeting) | Customer Match debe existir antes |
| 10 | `09_location_bid_adjustments.csv` | Locations | Solo bid adjustments (geo principal en `00_`) |
| 11 | `10_ad_schedule.csv` | Ad schedule | |
| 12 | `11_demographics.csv` | Demographics | |
| 13 | `12_device_bid_adjustments.csv` | Devices | |

## Flujo por archivo

1. Sidebar → vista correspondiente
2. Click **Make multiple changes** (toolbar superior)
3. **Paste from clipboard** o **Import from file**
4. Editor preview con diff (Add/Edit). Verificar:
   - Status: `Paused` (NO Enabled aún)
   - Datos OK
5. **Finish and review changes**
6. **Pending changes** tab → **Keep**

⚠️ **No prender Post a la cuenta hasta el final.**

## Final review + Post

1. **Pending changes** (botón superior derecho) — diff completo
2. **Validate** — cero errors
3. **Post** (botón rojo) → confirma

## Verificación post-Post

En Web UI (1-2h después):
- [ ] Campañas aparecen con status `Paused`
- [ ] Conversion tracking ON en cada campaña
- [ ] Customer Match aplicada
- [ ] Negative list shared asociada
- [ ] Sitelinks visible en `Assets`
- [ ] No disapproval pendiente

Si OK → cambiar status `Paused` → `Enabled` (MX primero, esperar 48h, luego ES).

## Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| "Campaign with same name exists" | Histórica con mismo nombre | Renombrar nueva con sufijo `_2026-05` |
| "Final URL not crawlable" | Landing 404 | Verificar URL en browser |
| RSA Ad Strength "Poor" | <3 H o <2 D | Agregar variaciones |
| Keyword "low search volume" | <10/mes en geo target | Ignorar si vol esperado >50 |
| "Bid strategy not compatible" | Smart Bidding requiere conv históricas | Maximize Clicks 2 semanas, luego volver |
