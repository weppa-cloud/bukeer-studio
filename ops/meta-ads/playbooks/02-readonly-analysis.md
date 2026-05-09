# Playbook 02 - Read-only Analysis

**Cuando**: para diagnosticar cuenta, campanas, conversiones, creatives, datasets, catalogos e insights sin hacer cambios.

## MCP tools recomendadas

```text
meta_ads_cli_get_ad_account
meta_ads_cli_list_campaigns
meta_ads_cli_list_adsets
meta_ads_cli_list_ads
meta_ads_cli_list_creatives
meta_ads_cli_get_insights
meta_ads_cli_list_datasets
meta_ads_cli_list_catalogs
```

## Consultas CLI base

```bash
scripts/meta-ads-cli.sh --output json ads adaccount get
scripts/meta-ads-cli.sh --output json ads campaign list --limit 50
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_7d --fields spend,impressions,clicks,ctr,cpc,reach,actions,cost_per_action_type --limit 100
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_30d --fields spend,impressions,clicks,ctr,cpc,reach,actions,cost_per_action_type --limit 100
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_90d --fields spend,impressions,clicks,ctr,cpc,reach,actions,cost_per_action_type --limit 100
```

## Prompt recomendado para agente

```text
Usa el MCP `meta-ads` en modo solo lectura. Revisa la cuenta configurada, campanas recientes, insights de 7/30/90 dias y eventos de conversion disponibles. Devuelve campanas con gasto, conversiones detectadas, gasto sin conversiones, posibles gaps de tracking y recomendaciones. No ejecutes escrituras.
```

## Evidencia minima

Guardar en el reporte:

- fecha y ventana analizada;
- cuenta publicitaria;
- campos consultados;
- gasto, impresiones, clicks, CTR, CPC y acciones;
- recomendaciones separadas de acciones ejecutadas.
