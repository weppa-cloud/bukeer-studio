# ColombiaTours Clarity

| Campo | Valor |
|-------|-------|
| Tenant | ColombiaTours |
| Dominio publico | `colombiatours.travel` |
| Clarity project id | `tj1pmavijv` |
| MCP | `clarity` |
| Runtime config | `websites.analytics.clarity_project_id` |
| Carga publica | despues de `window.load` + `requestIdleCallback` |

## Estado

Clarity esta configurado para las landings publicas de ColombiaTours desde `websites.analytics.clarity_project_id`. El script se carga despues del evento `load` y en idle para no bloquear el primer render.

El acceso a datos para agentes se hace por el MCP oficial `clarity`, usando `CLARITY_API_TOKEN` local en `.env.mcp`.

## Iteraciones

| Iteracion | Estado | Objetivo |
|-----------|--------|----------|
| `2026-05-mcp-readonly` | live-readonly | Activar analisis UX read-only via MCP oficial y Data Export API fallback. |

## Playbooks

- Setup local: `ops/clarity/playbooks/01-local-setup.md`
- Analisis read-only: `ops/clarity/playbooks/02-readonly-analysis.md`
- Analisis de grabaciones: `ops/clarity/playbooks/03-recordings-behavior-analysis.md`
- MCP tecnico: `docs/ops/clarity-mcp.md`
