# ColombiaTours — operación Google Ads

**Customer ID**: `1261189646`
**MCC**: `2511163613` jasismo MCC
**Login customer ID** (env): `2511163613`
**Moneda**: COP · **Time zone**: America/Bogota · **Auto-tagging**: ON
**Conversion tracking ID**: `852643280`
**Website**: `colombiatours.travel` (`subdomain=colombiatours`, `website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`, `account_id=9fc24733-b127-4184-aa22-12f03b98927a`)

## Estado actual

🟡 **Cuenta apagada** desde ~2026-01 (todas campañas históricas `PAUSED`). Conversion primary `lead_calificado_form` sin registros desde 2026-01-13. Causa: cambio en GTM/Fluent Forms WordPress legacy antes del cutover (22-abr-2026) al worker Next.js.

## Iteraciones

| Folder | Status | Resumen |
|---|---|---|
| `2026-05-launch/` | 🟡 `draft` | Launch inicial $1,000/mes — 2 campañas (MX + ES), 7 ad groups |
| _(futuras)_ | | |

## Conversion truth (Supabase, 12 meses al 2026-05-03)

- **227 itinerarios confirmados** · **COP 2,149,896,301** revenue (~$537k USD)
- Ticket promedio: **COP 12.6M (~$3,150 USD)**
- Lead → confirmación: mediana **166 días**
- 2,279 conversaciones Chatwoot únicas

## Mercados con revenue confirmado

| Mercado | Itinerarios | Revenue (M COP) | Ticket prom (USD) |
|---|---:|---:|---:|
| 🇲🇽 México | 57 | 778 | $3,412 |
| 🇪🇸 España | 24 | 540 | **$5,625** ⭐ |
| 🇨🇴 Colombia local | 38 | 256 | $1,684 |
| 🇺🇸 USA | 11 | ? | (orgánico, sin Ads) |
| 🇦🇷 Argentina | 7 | ? | ? |

## Tracking gaps abiertos

- C1: Conversion primary muerta desde 2026-01-13
- C2: 5 conversion actions SUBMIT_LEAD_FORM duplicadas
- C3: gclid no capturado en WAFlow → **F2 (#428) lo resuelve** (middleware captura desde URL params)
- C4: Valores `default_value=1 COP` en lugar real
- H1: Sin offline import desde Supabase → **F1+F2 lo resuelven** (dispatcher automático)

Ver detalle completo en [`docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md`](../../../docs/audits/2026-05-google-ads-colombiatours-diagnostic-and-campaign-proposal.md).

## Status PRs F1/F2/F3 (EPIC #419)

| PR | Branch | Status | Closes |
|---|---|---|---|
| #426 | `feat/f1-funnel-events-foundation` | 🟡 DRAFT | #420 (RPC + dispatcher trigger) |
| #428 | `feat/f2-google-ads-dispatcher` | 🟡 DRAFT | #421 (Google Ads dispatcher + offline upload) |
| #427 | `feat/f3-crm-purchase-event-studio` | 🟡 DRAFT | #422 (CRM purchase event) |

**Pre-launch**: esperar al menos F1+F2 mergeados a dev antes de prender campañas.
