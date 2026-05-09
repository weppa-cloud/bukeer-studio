# Status: live-readonly

**Iteracion**: Meta Ads CLI MCP read-only<br>
**Tenant**: ColombiaTours<br>
**Ad account**: `act_1249829212995679`<br>
**Cuenta**: `Colombiatours.Travel24`<br>
**Owner**: Growth lead + Codex operator<br>

## Estado

- MCP project-scoped: `meta-ads` en `.mcp.json`.
- CLI wrapper: `scripts/meta-ads-cli.sh`.
- MCP local: `scripts/mcp/meta-ads-cli-server.mjs`.
- Writes: bloqueados por defecto.

## Smoke validado

```bash
scripts/meta-ads-cli.sh auth status
scripts/meta-ads-cli.sh --output json ads adaccount get
scripts/meta-ads-cli.sh --output json ads campaign list --limit 5
scripts/meta-ads-cli.sh --output json ads insights get --date-preset last_7d --fields spend,impressions,clicks,ctr,cpc,reach --limit 10
```

## Siguiente paso

Usar `ops/meta-ads/playbooks/02-readonly-analysis.md` para diagnosticos recurrentes de conversiones, gasto y tracking. No habilitar escrituras sin playbook 03.
