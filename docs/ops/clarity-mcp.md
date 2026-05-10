# Microsoft Clarity MCP

Runbook for the project-scoped Microsoft Clarity MCP used by Codex Desktop to read UX behavior data for public Bukeer websites.

## Surfaces

- Official MCP package: `@microsoft/clarity-mcp-server`
- Official setup guide: <https://learn.microsoft.com/en-us/clarity/third-party-integrations/clarity-mcp-server>
- Official repository: <https://github.com/microsoft/clarity-mcp-server>
- Project MCP name: `clarity`
- Project source of truth: `.mcp.json`
- Local secrets file: `.env.mcp`
- ColombiaTours Clarity project id: `tj1pmavijv`
- Public runtime config: `websites.analytics.clarity_project_id`

## Local setup

Copy the template and fill the token locally:

```bash
cp .env.mcp.example .env.mcp
$EDITOR .env.mcp
```

Required values:

```bash
export CLARITY_API_TOKEN="REPLACE_ME"
export CLARITY_PROJECT_ID="tj1pmavijv"
export CLARITY_DEFAULT_NUM_DAYS="1"
```

The repo-level MCP entry loads `.env.local` and `.env.mcp`, validates `CLARITY_API_TOKEN`, then runs:

```bash
npx -y @microsoft/clarity-mcp-server --clarity_api_token="$CLARITY_API_TOKEN"
```

If Codex Desktop does not load project-scoped MCPs in the local installation, register a personal fallback:

```bash
codex mcp add clarity -- bash -lc 'cd /ABS/PATH/bukeer-studio && set -a; [ -f .env.local ] && source .env.local; [ -f .env.mcp ] && source .env.mcp; set +a; : "${CLARITY_API_TOKEN:?Missing CLARITY_API_TOKEN in .env.mcp}"; exec npx -y @microsoft/clarity-mcp-server --clarity_api_token="$CLARITY_API_TOKEN"'
```

Restart Codex Desktop after changing `.mcp.json`, `.env.local`, or `.env.mcp`.

## Data export fallback

When MCP tooling is unavailable, use the official Data Export API directly. This consumes the same project quota, so use it only for targeted checks:

```bash
curl -fsS \
  'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=URL' \
  -H "Authorization: Bearer $CLARITY_API_TOKEN"
```

Documented API limits:

- Maximum 10 requests per project per day.
- Maximum 3 days per request.
- Maximum 3 dimensions per request.

## Operating policy

- Treat `clarity` as read-only. It is for UX research, CRO evidence, and diagnostics.
- Keep `CLARITY_API_TOKEN` only in `.env.mcp`; never commit tokens or paste them into issues.
- Do not attach raw session recordings, screenshots with personal data, or user identifiers to public docs.
- Use Clarity as behavioral evidence, not as the sole decision source. Cross-check important findings with GA4, GSC, `funnel_events`, and production route inventory.
- Do not run broad exploratory loops. Start with `numOfDays=1`; expand to 3 days only when the first query indicates a real issue.

## Recommended analysis prompts

Use the MCP to answer specific, bounded questions:

```text
Usa el MCP clarity en modo solo lectura para ColombiaTours. Revisa los ultimos 1-3 dias por URL, Device y Source/Medium. Devuelve paginas con rage clicks, dead clicks, scroll bajo, engagement bajo y errores JS. Cruza recomendaciones con GA4/funnel_events antes de proponer cambios.
```

```text
Analiza solo mobile para las landings principales de colombiatours.travel. Prioriza problemas donde Clarity muestre friccion recurrente y el funnel tenga caida o bajo avance a WhatsApp/lead.
```

## Recording analysis workflow

The official MCP exposes `list-session-recordings` for finding recordings by URL, device, browser, OS, country, city and behavior filters. Use it after the dashboard query identifies a concrete problem.

Recommended sequence:

1. Query aggregate friction by URL/device/source.
2. List only the recordings that match the friction pattern.
3. Review a small sample: 5-10 sessions for a P1 signal, 10-20 for a P0 signal.
4. Extract behavior metrics into a short evidence table.
5. Cross-check with GA4 and `funnel_events` before changing the landing.

Metrics to extract from recordings:

- CTA seen but not clicked.
- CTA clicked but no WhatsApp/lead event follows.
- Dead clicks on non-clickable elements.
- Rage clicks on CTA, menu, forms, cards or image galleries.
- Scroll stop point before the main conversion block.
- Back/quickback after seeing price, itinerary, availability or form.
- JavaScript error before or during conversion intent.
- Repeated hesitation: long pause, scroll up/down loop, form abandonment.

Prompt:

```text
Usa el MCP clarity. Primero consulta metricas agregadas de ColombiaTours por URL y Device para los ultimos 1-3 dias. Luego lista grabaciones relevantes con friccion: rage clicks, dead clicks, errores JS, scroll bajo o quickback. Analiza una muestra pequena y devuelve metricas de comportamiento: patron observado, sesiones afectadas, pagina, device, severidad, hipotesis y accion recomendada. No guardes recordings crudos ni datos personales.
```

## Smoke tests

Validate configuration without spending API quota:

```bash
set -a; source .env.mcp; set +a
test -n "$CLARITY_API_TOKEN" && echo "clarity token present"
npm view @microsoft/clarity-mcp-server version
```

Validate live data only when necessary:

```bash
curl -fsS \
  'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=Device' \
  -H "Authorization: Bearer $CLARITY_API_TOKEN" \
  | jq '.'
```

## Related docs

- Daily operations: `ops/clarity/README.md`
- Public runtime loading policy: `docs/ops/public-analytics-standard.md`
- Growth attribution governance: `docs/ops/growth-attribution-governance.md`
