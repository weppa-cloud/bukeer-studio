# ColombiaTours Growth OS Beta Diagnostic

Generated: 2026-05-29T14:24:46.204Z
Status: `watch`
Dedupe: `request_refresh` (required_profile_stale_or_gated)

## Provider State

| Profile | Status | Quality | Run |
| --- | --- | --- | --- |
| `gsc_daily_complete_web_v1` | `fresh` | `pass` | `c1dd5108-66b0-411e-9881-1a2a9d4b12e9` |
| `ga4_daily_web_traffic_v1` | `fresh` | `pass` | `b9d932d0-217e-47dc-9289-e4b675ba8a13` |
| `dataforseo_serp_opportunity_v1` | `cost_gated` | `watch` | `acb988f2-4fb9-48b7-b974-13877f24fc16` |

## Diagnostic

Verdict: `diagnostic_ready_without_provider_calls`

Primary opportunity: Preparar un brief de optimizacion para paginas existentes usando demanda GSC y comportamiento GA4 ya materializados; mantener SERP/DataForSEO como evidencia gobernada hasta aprobacion de costo.

Why now:
- GSC profile status: fresh
- GA4 profile status: fresh
- DataForSEO profile status: cost_gated
- Dedupe verdict: request_refresh

Allowed next action: Generar propuesta/brief interno; no publicar, no escalar contenido y no llamar APIs externas.

Blocked until approval:
- Extraccion pagada DataForSEO SERP/Labs
- Mutaciones de paid media
- Publicacion automatica de contenido
- Llamadas directas a APIs proveedor desde agentes

## Guardrails

- Provider API called by this diagnostic: `false`.
- Content published by this diagnostic: `false`.
- Agents must consume context packet/snapshot data only.
- `blocked_actions` includes `call_provider_api_directly`.

## Source Profiles

- `gsc_daily_complete_web_v1` (gsc) run=c1dd5108-66b0-411e-9881-1a2a9d4b12e9 refs=cache:growth_gsc_cache:d74d0731-1555-447d-b6f8-e636ada0e864
- `ga4_daily_web_traffic_v1` (ga4) run=b9d932d0-217e-47dc-9289-e4b675ba8a13 refs=cache:growth_ga4_cache:f243d6b3-8e18-4826-b3da-2a66cafaa59c
- `dataforseo_serp_opportunity_v1` (dataforseo) run=acb988f2-4fb9-48b7-b974-13877f24fc16 refs=none
