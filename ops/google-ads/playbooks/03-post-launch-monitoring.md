# Playbook 03 — Post-launch monitoring

**Cuándo**: después de Post + prender campañas (`Enabled`).
**Owner**: Growth lead.

## Cadencia

| Período | Frecuencia | Foco |
|---|---|---|
| Días 1-3 | Cada 6 horas | Validación tracking, sin sangría budget |
| Días 4-14 | Diaria | KPIs, ad strength, search terms |
| Días 15-30 | Cada 2 días | Optimización, decisión escalar/pivotar |
| Mes 2+ | Semanal | Cadencia normal |

## KPIs daily (mes 1)

| KPI | Target mes 1 | Alarma si |
|---|---|---|
| Spend daily | ≤ daily budget × 1.0 | >120% |
| Impressions | Crece tras día 3 | 0 imp en 48h con QS >5 |
| CTR | >4% | <2% |
| Avg CPC | Cerca o bajo Max CPC | Above Max CPC |
| Conv (form proxy) | >0 día 3-5 | 0 conv en 7 días con tráfico |
| CPA proxy | <$30 USD | >$50 |
| Quality Score | >5 | <4 en kw top spend |

## Daily check (15 min)

1. Web UI → Campaigns → Last 24h
2. Spend per campaign vs daily budget
3. Ad groups → ¿alguno dominando o muerto?
4. Ads → Ad strength check
5. Conversions tab → spike o drop
6. Search terms → revisar nuevos:
   - Off-topic con cost → agregar a `04_negative_keywords.csv` + Web UI
   - High-intent sin keyword → agregar a `02_keywords.csv` (Phrase)
7. Diagnostics → warnings de Google

## Decision gates

### Día 7

```
≥7 leads AND CPA ≤$30 → continuar
3-6 leads OR CPA $30-50 → optimización tactical (RSA test, landing review, bid ajuste QS)
<3 leads OR CPA >$50 → pivote (verificar tracking, cambiar bid strategy, revisar match types)
```

### Día 30

```
≥30 leads AND CPA <$30 → escalar ($1.5-2k/mes), activar US si landing EN existe
15-29 leads OR CPA $30-50 → optimizar sin escalar (negatives, A/B RSAs, bid up en winners)
<15 leads OR CPA >$50 → pivotar (validar funnel completo: form→WhatsApp→CRM)
```

## Alertas obligatorias

`Tools & Settings > Bulk actions > Rules`:

| Rule | Trigger | Acción |
|---|---|---|
| Auto-pause weak ad | Ad strength = Poor 7+ días | Pausar |
| Daily spend alert | > 1.5x budget | Email |
| Zero conv alert | 50+ clicks AND 0 conv en 7d | Email |
| Search term spend | Cost > $20 sin conv | Email |

## Reporting semanal (post mes 1)

```
Semana N — ColombiaTours Google Ads

📊 Resumen
- Spend: $XXX (vs target)
- Impressions/Clicks (CTR%)
- Conv: XX (CPA $XX)
- Top kw conv vs top kw spend sin conv

🟢 Wins
🟡 Optimizaciones realizadas
🔴 Problemas + acción
Próxima semana
```

## Conexión con dispatcher F2

Una vez F2 (#428) mergeado y deployado:
- Verificar `crm_booking_confirmed` recibe uploads automáticos del dispatcher
- Logs en `google_ads_offline_uploads` table (Supabase)
- Si dispatcher no envía: revisar `dispatch_status='failed'` en `funnel_events`
