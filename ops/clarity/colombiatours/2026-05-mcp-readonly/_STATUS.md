# ColombiaTours — Clarity MCP Read-only

**Fecha**: 2026-05-09  
**Estado**: live-readonly  
**Iteracion**: Clarity MCP read-only  
**Tenant**: ColombiaTours  
**Project id**: `tj1pmavijv`

## Implementado

- MCP project-scoped: `clarity` en `.mcp.json`.
- Paquete oficial: `@microsoft/clarity-mcp-server`.
- Variables locales documentadas en `.env.mcp.example`.
- Playbooks de setup y analisis read-only en `ops/clarity/playbooks/`.
- Playbook principal de grabaciones y comportamiento en `ops/clarity/playbooks/03-recordings-behavior-analysis.md`.
- Runtime publico ya configurado via `websites.analytics.clarity_project_id`.

## Verificacion local

El token local en `.env.mcp` fue configurado en esta workstation y el Data Export API respondio correctamente para:

```bash
project-live-insights?numOfDays=1&dimension1=Device
```

Resultado: respuesta JSON valida con 9 grupos de metricas.

## Pendiente para otros entornos

Completar `.env.mcp` con:

```bash
export CLARITY_API_TOKEN="..."
export CLARITY_PROJECT_ID="tj1pmavijv"
```

Luego reiniciar Codex Desktop y verificar:

```bash
codex mcp list
codex mcp get clarity
```

## Uso esperado

Usar `ops/clarity/playbooks/03-recordings-behavior-analysis.md` para diagnosticos recurrentes de UX basados en grabaciones. No guardar recordings crudos ni aplicar cambios de CRO sin validar contra GA4, GSC o `funnel_events`.
