# Playbook 01 - Local Setup

**Cuando**: al preparar un entorno local propio para usar Meta Ads desde Codex Desktop u otro cliente MCP.

## Requisitos

- Node >= 22.
- `uv` disponible para instalar herramientas Python.
- Acceso a un token Meta con permisos de lectura:
  - `ads_read`
  - `business_management`
  - `pages_show_list` cuando se requieran Pages.

## Instalar CLI oficial

```bash
uv tool install meta-ads
meta --version
```

Si ya existe:

```bash
uv tool upgrade meta-ads
```

## Configurar variables locales

Usar `.env.local` o `.env.mcp`. Estos archivos estan ignorados por git.

```bash
META_ACCESS_TOKEN=REPLACE_ME
META_AD_ACCOUNT_ID=act_REPLACE_ME
META_API_VERSION=v21.0
META_ADS_CLI_WRITES_ENABLED=false
META_ADS_CLI_ALLOW_ACTIVE=false
META_ADS_CLI_DESTRUCTIVE_WRITES_ENABLED=false
```

No commitear tokens, refresh tokens, service account JSON ni archivos `.credentials/`.

## Verificar CLI

```bash
scripts/meta-ads-cli.sh auth status
scripts/meta-ads-cli.sh --output json ads adaccount get
scripts/meta-ads-cli.sh --output json ads campaign list --limit 5
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_7d --fields spend,impressions,clicks,ctr,cpc,reach --limit 10
```

## Codex Desktop

El estandar del repo es `.mcp.json`; abrir Codex Desktop desde este workspace confiado deberia cargar el MCP `meta-ads`.

Si Codex Desktop no carga MCPs project-scoped en la instalacion local, registrar fallback manual:

```bash
codex mcp add meta-ads -- bash -lc 'cd /ABS/PATH/bukeer-studio && set -a; [ -f .env.local ] && source .env.local; [ -f .env.mcp ] && source .env.mcp; set +a; exec node scripts/mcp/meta-ads-cli-server.mjs'
```

Debug:

```bash
codex mcp list
codex mcp get meta-ads
codex mcp remove meta-ads
```

Reiniciar Codex Desktop despues de cambiar `.mcp.json`, `.env.local`, `.env.mcp` o scripts MCP.

## Conflictos comunes

- Si existe un `meta-ads` global en `~/.codex/config.toml`, puede ocultar el MCP project-scoped. Removerlo o renombrarlo.
- Si existe `meta-ads-cli` global, no es la fuente canonica del repo; usar `meta-ads` desde `.mcp.json`.
- `Missing Permissions` indica token sin `ads_read` o cuenta no disponible.
