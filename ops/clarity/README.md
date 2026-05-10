# Clarity Operations

Operacion continua de Microsoft Clarity para tenants de Bukeer. Esta carpeta replica el patron de `ops/meta-ads/` y `ops/google-ads/`: los playbooks viven junto a la operacion diaria, las iteraciones se versionan por tenant, y la documentacion tecnica del MCP vive en `docs/ops/`.

## Estructura

```text
ops/clarity/
├── README.md
├── playbooks/
│   ├── 01-local-setup.md
│   ├── 02-readonly-analysis.md
│   └── 03-recordings-behavior-analysis.md
├── colombiatours/
│   ├── README.md
│   └── 2026-05-mcp-readonly/
│       └── _STATUS.md
└── archive/
```

## MCP estandar

El MCP project-scoped se configura en `.mcp.json` con el nombre `clarity` y ejecuta:

```bash
npx -y @microsoft/clarity-mcp-server --clarity_api_token="$CLARITY_API_TOKEN"
```

El token se carga desde `.env.mcp`. No se guardan tokens ni exports de sesiones en git.

## Tenants

| Tenant | Dominio | Project id | Estado | Iteracion activa |
|--------|---------|------------|--------|------------------|
| ColombiaTours | `colombiatours.travel` | `tj1pmavijv` | live-readonly | `2026-05-mcp-readonly` |

## Politicas

- Read-only por defecto: Clarity alimenta diagnosticos UX, no ejecuta cambios.
- Usar ventanas cortas: 1 dia para exploracion, 3 dias maximo para confirmar patrones.
- No quemar cuota en loops. La API limita a 10 requests por proyecto por dia.
- No publicar recordings, datos personales ni capturas sensibles en issues o docs.
- Antes de proponer cambios de CRO, contrastar con GA4, GSC, `funnel_events` y estado de landings.
- El flujo principal para CRO es: metricas agregadas -> grabaciones filtradas -> patrones de comportamiento -> backlog/experimento.

## Referencias

- MCP tecnico: `docs/ops/clarity-mcp.md`
- Config project-scoped: `.mcp.json`
- Public analytics runtime: `docs/ops/public-analytics-standard.md`
