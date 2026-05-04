# Playbook 05 — Emergency pause

**Cuándo**: en cualquier momento que detectes problema crítico en producción.
**Owner**: cualquier persona del equipo Growth con acceso a Google Ads.
**Tiempo**: <5 min desde detección.

## Trigger conditions

- 🚨 Spend del día > 3x daily budget
- 🚨 CTR colapsa <1% por >2 horas
- 🚨 Disapproval mass (>50% ads `Disapproved`)
- 🚨 Site down (`colombiatours.travel`)
- 🚨 Conversion tracking roto (0 conv 4+ horas con tráfico normal)
- 🚨 Bot attack / click fraud sospechoso
- 🚨 Mensaje legal / compliance

## Pause levels

### Level 1 — 1 ad group (10s)
Web UI → Campaigns > Campaign > Ad groups → checkbox AG → **Pause**

### Level 2 — 1 campaña (30s)
Web UI → Campaigns → checkbox → **Pause**

### Level 3 — Todas las campañas (60s)
**Web UI**: Campaigns view → filter `Enabled` → select all → Bulk actions **Pause**

**Mobile app**: más rápido en emergencia

### Level 4 — Suspender cuenta (último recurso)
Settings > Account settings > **Suspend account** (toma 1-2h en aplicarse)

⚠️ Suspender cuenta puede afectar Quality Score histórico al reactivar.

## Post-pause checklist

1. **Notificar**: Slack/email al equipo Growth + tech lead
2. **Diagnose**: identificar root cause con logs
3. **Fix**: aplicar fix
4. **Verify in staging** si posible
5. **Resume gradual**: 1 campaña a la vez, 1h espera, verificar

## Common issues + quick fixes

| Issue | Quick fix |
|---|---|
| Spend = 3x budget | Cambiar bidding a Manual CPC 24h, monitorear |
| CTR <1% | Ver razón en Ad Disapproved, reescribir RSA |
| All ads disapproved | Contactar Google Ads support |
| 0 conv 4h+ | Tag Assistant en landing → ver gtag → fix Tag Manager |
| Site down | Pause + alert tech lead |
| Click fraud | Add IPs a IP exclusion list, report a Google |

## Logging

Crear `<iter>/incidents.log.md`:

```md
| Date | Trigger | Action | Root cause | Resolution time | Notes |
|---|---|---|---|---:|---|
| 2026-05-15 14:23 | CTR <1% MX | Level 2 pause | Landing /cartagena 502 Cloudflare | 45 min | Tech fix deploy |
```

Después del 2do incidente: revisar si automated rules necesitan tunearse.
