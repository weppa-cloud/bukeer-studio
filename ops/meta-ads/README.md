# Meta Ads Operations

Operacion continua de Meta Ads para tenants de Bukeer. Esta carpeta replica el patron de `ops/google-ads/`: los cambios mayores se versionan por tenant/iteracion, los playbooks viven junto a la operacion diaria, y la documentacion tecnica del MCP vive en `docs/ops/`.

## Estructura

```text
ops/meta-ads/
├── README.md
├── templates/
├── playbooks/
├── colombiatours/
│   ├── README.md
│   └── 2026-05-cli-readonly/
│       └── _STATUS.md
└── archive/
```

## MCP estandar

El MCP project-scoped se configura en `.mcp.json` con el nombre `meta-ads` y ejecuta:

```bash
node scripts/mcp/meta-ads-cli-server.mjs
```

El servidor local envuelve la CLI oficial `meta` mediante `scripts/meta-ads-cli.sh`, carga `.env.local` y `.env.mcp`, y expone herramientas read-only por defecto.

## Tenants

| Tenant | Meta Ad Account | Status |
|---|---|---|
| ColombiaTours | `act_1249829212995679` | `2026-05-cli-readonly/` live-readonly |

## Convenciones

### Iteraciones por tenant

Cada cambio mayor se versiona en:

```text
ops/meta-ads/<tenant>/<YYYY-MM>-<slug-descriptivo>/
```

### Status

`_STATUS.md` en cada iteracion:

- `draft` - diseno en construccion.
- `approved` - humano aprobo, listo para ejecutar/importar.
- `live-readonly` - integracion de lectura activa, sin mutaciones.
- `live` - cambios corriendo en plataforma.
- `archived` - cerrado/reemplazado.

## Politica operativa

- La lectura de campanas, anuncios, creatives, datasets, catalogos e insights es segura para analisis.
- Las escrituras pasan por `meta_ads_cli_write_operation` y estan bloqueadas por flags.
- Cualquier entidad creada por automatizacion debe quedar `PAUSED` salvo aprobacion explicita.
- Activacion, deletes y cambios destructivos requieren aprobacion humana y flags adicionales.

## Referencias

- MCP tecnico: `docs/ops/meta-ads-cli-mcp.md`
- Config project-scoped: `.mcp.json`
- Wrapper CLI: `scripts/meta-ads-cli.sh`
- MCP local: `scripts/mcp/meta-ads-cli-server.mjs`
