# Clarity Local Setup

**Objetivo**: preparar Codex Desktop para consultar datos de Microsoft Clarity via MCP oficial.

## 1. Crear `.env.mcp`

```bash
cp .env.mcp.example .env.mcp
$EDITOR .env.mcp
```

Valores requeridos:

```bash
export CLARITY_API_TOKEN="REPLACE_ME"
export CLARITY_PROJECT_ID="tj1pmavijv"
export CLARITY_DEFAULT_NUM_DAYS="1"
```

El token se obtiene desde Microsoft Clarity en la configuracion del proyecto/API. Guardarlo solo en `.env.mcp`.

## 2. Verificar MCP del proyecto

Abrir Codex Desktop desde este workspace confiado. El estandar del repo es `.mcp.json`; deberia cargar el MCP `clarity`.

```bash
codex mcp list
codex mcp get clarity
```

Si la instalacion local no carga MCPs project-scoped, registrar fallback manual:

```bash
codex mcp add clarity -- bash -lc 'cd /ABS/PATH/bukeer-studio && set -a; [ -f .env.local ] && source .env.local; [ -f .env.mcp ] && source .env.mcp; set +a; : "${CLARITY_API_TOKEN:?Missing CLARITY_API_TOKEN in .env.mcp}"; exec npx -y @microsoft/clarity-mcp-server --clarity_api_token="$CLARITY_API_TOKEN"'
```

## 3. Smoke test sin consumir cuota

```bash
set -a; source .env.mcp; set +a
test -n "$CLARITY_API_TOKEN" && echo "clarity token present"
npm view @microsoft/clarity-mcp-server version
```

## 4. Smoke test con datos

Ejecutar solo cuando sea necesario; consume cuota de Clarity.

```bash
curl -fsS \
  'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=URL' \
  -H "Authorization: Bearer $CLARITY_API_TOKEN" \
  | jq '.'
```

## Troubleshooting

- `Missing CLARITY_API_TOKEN`: `.env.mcp` no existe o no tiene el token.
- MCP no aparece: reiniciar Codex Desktop despues de editar `.mcp.json`.
- 401/403: token invalido o sin acceso al proyecto.
- Sin datos: confirmar que `websites.analytics.clarity_project_id` existe y que el sitio publico esta cargando el script.
