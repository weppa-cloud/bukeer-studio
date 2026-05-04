# Diagnóstico Google Ads ColombiaTours + Propuesta de 2 campañas

**Fecha**: 2026-05-03
**Cuenta**: Google Ads `1261189646` ColombiaTours (bajo MCC `2511163613` jasismo MCC)
**Budget**: USD $1,000 / mes (mes 1 — escalable a $2-3k tras validación)
**Período auditado**: últimos 12 meses (mayo 2025 → mayo 2026)
**Objetivo**: generar leads calificados → ventas (itinerarios confirmados)

---

## TL;DR (decisiones clave)

1. **2 campañas activas** (MX + ES), USA en reserva ($200) y Brand defensiva eliminada — solo 3 mercados accionables hoy.
2. **2 hallazgos sorpresa del keyword research** que el plan inicial no detectó:
   - **San Andrés en MX** = gold mine (9,900 búsquedas/mes, CPC $0.78, LOW competition)
   - **San Gil en MX** = ultra gold mine (9,900 búsquedas/mes, **CPC $0.17**, LOW competition)
3. **Eje Cafetero, Santander, Bogotá DESCARTADOS para Ads** en los 3 mercados (volumen insuficiente o competencia mata margen).
4. **Health score actual: 21/100**. Pre-launch obligatorio antes del primer dólar.
5. **Tracking unificado en construcción** (PRs #426 F1, #428 F2, #427 F3) → cuando F1+F2 mergen, atribución click→venta automatizada.

---

## 1. Diagnóstico ejecutivo

**Account health score: 21/100 — Crítico.** La cuenta no está apagada por mala estrategia, está apagada por **ceguera de medición**: el tracking primary murió el 2026-01-13 sin que nadie lo notara hasta este audit (4 meses después), y los valores reportados son artificiales (`default_value=1 COP`).

**Realidad operativa (12 meses según Supabase, NO Ads)**:
- **227 itinerarios confirmados** por **COP 2,149,896,301** (~$537k USD)
- Ticket promedio: **COP 12.6M (~$3,150 USD)** — segmento high-ticket
- 2,279 conversaciones Chatwoot únicas
- Tiempo lead → confirmación: mediana **166 días**

**Performance histórica Ads (12m, antes del shutdown)**:
- Spend: **~$17,000 USD** (COP 67.9M) · 1.75M imp · 111.7k clicks · CTR 6.4%
- Conversion data NO confiable

| Hallazgo | Severidad | Impacto |
|---|---|---|
| C1: Conversion primary muerta desde 2026-01-13 | 🔴 | Bloquea Smart Bidding |
| C2: 5 conversion actions SUBMIT_LEAD_FORM duplicadas | 🔴 | Smart Bidding aprende mal |
| C3: gclid no capturado en WAFlow | 🔴 | 0% atribución → **F2 (#428) lo resuelve** ✅ |
| C4: Valores `default_value=1 COP` | 🔴 | ROAS aparente artificial |
| H1: Sin offline import desde Supabase | 🟠 | **F1+F2 lo resuelven** ✅ |
| H2: Estructura SKAG, 20+ campañas duplicadas | 🟠 | Fragmenta data |
| H3: Sin Customer Match desde 2,308 contactos | 🟠 | LAL valioso sin activar |

---

## 2. Análisis de mercados por revenue confirmado (Supabase 12m)

| Mercado | Itinerarios | Revenue (M COP) | Ticket prom (USD) | Decisión |
|---|---:|---:|---:|---|
| 🇲🇽 México | 57 | 778 | $3,412 | ✅ **REACTIVAR** |
| 🇪🇸 España | 24 | 540 | **$5,625** ⭐ | ✅ **REACTIVAR** |
| 🇨🇴 Colombia local | 38 | 256 | $1,684 | ❌ NO Ads (margen marginal) |
| 🇺🇸 USA | 11 | ? | premium esperado | ⏸ **PILOTO PENDIENTE** (sin landing EN) |
| 🇦🇷 Argentina | 7 | ? | ? | ⏸ Mes 3 |

**Insight clave**: España vale lo mismo que México en revenue total con la mitad de volumen — tradicionalmente subestimada en favor de MX.

---

## 3. Keyword research (DataForSEO, real, mayo 2026)

### 🇲🇽 México

| Destino | Top keyword | Vol/mes | CPC | Competition | Tier |
|---|---|---:|---:|:---:|---|
| **San Andrés** ⭐ | `san andres colombia` | **9,900** | $0.78 | **LOW** | 🥇 GOLD |
| **San Gil** ⭐⭐ | `san gil colombia` | **9,900** | **$0.17** | **LOW** | 🥇 GOLD |
| **Multidestino** | `viaje a colombia todo incluido` | 1,300 | $0.65 | HIGH | 🥈 |
| **Multidestino** | `paquetes a colombia` | 1,000 | $1.32 | HIGH | 🥈 |
| **Multidestino** | `viajes a colombia desde mexico` | 1,300 | $0.54 | HIGH | 🥈 |
| Cartagena | `viaje a cartagena` | 390 | $1.02 | HIGH | 🥉 |
| Cartagena | `paquete a cartagena colombia` | 210 | $1.49 | HIGH | 🥉 |
| Eje Cafetero | (sin volumen) | <50 | — | — | ❌ |

**Ciudades MX**: San Andrés + San Gil + Multidestino + Cartagena. Medellín/Bogotá/Eje descartados.

### 🇪🇸 España

| Destino | Top keyword | Vol/mes | CPC | Competition | Tier |
|---|---|---:|---:|:---:|---|
| **Cartagena** | `viajar a cartagena de indias` | 590 | $0.71 | HIGH | 🥇 |
| **Medellín** | `turismo medellin` | 210 | $0.60 | **LOW** ⭐ | 🥇 |
| **Cartagena** | `cartagena de indias todo incluido` | 70 | $0.73 | HIGH | 🥈 |
| **Multidestino** | `vacaciones en colombia` | 90 | $0.68 | MEDIUM | 🥈 |
| **Multidestino** | `agencia viajes colombia` | 40 | $1.65 | HIGH | 🥈 |
| **Eje Cafetero** | `turismo eje cafetero` | 40 | — | — | ❌ |
| **San Andrés** | `san andres colombia todo incluido` | 20 | — | — | ❌ |

**Ciudades ES**: Cartagena de Indias + Medellín + Multidestino. Total volumen ~1,480 búsquedas/mes.

### 🇺🇸 USA (reserva)

| Destino | Top keyword | Vol/mes | CPC | Competition |
|---|---|---:|---:|:---:|
| **San Andrés Island** ⭐ | `san andres island colombia` | **1,600** | $2.14 | **LOW (0.10)** |

CPCs USA 3x LATAM. $200/mes ≈ 89 clicks. Solo viable si se concentra 100% en San Andrés Island. **Bloqueado por falta de landing EN**.

---

## 4. Las 2 campañas — diseño detallado

### 📊 Distribución $1,000/mes

```
🇲🇽 MX_Multidestino_y_Caribe        $500   (50%)
🇪🇸 ES_Cartagena_Medellin           $300   (30%)
⏸ Reserva (USA o reasignar a MX)   $200   (20%)
                                    ─────
                                    $1,000
```

### Campaña 1: 🇲🇽 MX_Multidestino_y_Caribe — $500/mes

**Bid**: Maximize Conversions · **Geo**: México (Presence OR Interest) · **Idioma**: Español MX · **Audience**: In-market Travel + Customer Match +30%

| Ad Group | Budget | Landing | Top Keywords |
|---|---:|---|---|
| **AG1: San Andrés** ⭐ | $150 | `/san-andres-4-dias` | `san andres colombia`, `isla san andres colombia`, `playa san andres`, `hoteles san andres`, `san andres todo incluido` |
| **AG2: San Gil** ⭐⭐ | $50 | (pendiente landing) | `san gil colombia`, `san gil santander`, `que hacer en san gil` |
| **AG3: Multidestino** | $200 | `/agencia-de-viajes-a-colombia-para-mexicanos` ⭐ + `/tour-colombia-10-dias` + `/paquetes/colombia-imperdible-9-dias-...` | `viaje colombia todo incluido`, `paquetes a colombia`, `viajes colombia desde mexico`, `tour colombia` |
| **AG4: Cartagena** | $80 | `/cartagena` + `/paquetes/cartagena-premium-...` | `viaje a cartagena`, `paquete cartagena colombia`, `cartagena todo incluido` |
| **AG5: Medellín (test)** | $20 | `/paquetes/medellin-y-guatape-5-dias-...` | `tour medellin colombia`, `comuna 13 tour` |

### Campaña 2: 🇪🇸 ES_Cartagena_Medellin — $300/mes

**Bid**: Maximize Conversions · **Geo**: España · **Idioma**: Español ES (terminología "vacaciones", "circuito", "Cartagena de Indias") · **Audience**: In-market + Income top 30% + Customer Match +30%

| Ad Group | Budget | Landing | Top Keywords |
|---|---:|---|---|
| **AG1: Cartagena de Indias** | $130 | `/cartagena` + `/paquetes/cartagena-premium-...` | `viajar a cartagena de indias`, `cartagena todo incluido`, `vacaciones cartagena de indias` |
| **AG2: Medellín Cultural** | $100 | `/paquetes/medellin-y-guatape-5-dias-...` ⭐ | `turismo medellin`, `tour medellin`, `vacaciones medellin colombia` |
| **AG3: Multidestino Premium** | $70 | `/agencia-de-viajes-a-colombia-para-espanoles` ⭐ + `/paquetes/gran-tour-colombia-15-dias-...` + `/tour-colombia-15-dias` | `vacaciones en colombia`, `agencia viajes colombia`, `circuito por colombia`, `tour operador colombia` |

---

## 5. Tráfico esperado mes 1

| Campaña | Budget | Clicks/mes | Leads/mes | CPA proxy |
|---|---:|---:|---:|---:|
| 🇲🇽 MX | $500 | ~666 | 20-26 | $19-25 |
| 🇪🇸 ES | $300 | ~353 | 14-18 | $17-21 |
| **TOTAL** | **$800** | **~1,019** | **34-44** | **$18-24** |

(Reserva $200 sin asignar — USA o reasignar a MX dependiendo de decisión)

**Decisión gate mes 1**:
- ≥30 leads + CPA <$30 → escalar a $1.5-2k/mes
- 15-29 leads o CPA $30-50 → optimizar sin escalar
- <15 leads o CPA >$50 → pivotar

---

## 6. Pre-launch obligatorio

Antes del primer dólar (Web UI):
1. Desactivar 4 conversion actions duplicadas
2. Crear 4 conversion actions limpias (`waflow_lead_submit`, `whatsapp_cta_click`, `phone_cta_click`, `crm_booking_confirmed`)
3. Pausar formalmente las 2 campañas ENABLED-ENDED
4. Subir Customer Match audience (2,308 contactos)
5. Crear shared negative kw list

Ver detalle en [`ops/google-ads/playbooks/01-pre-launch-checklist.md`](../../ops/google-ads/playbooks/01-pre-launch-checklist.md).

---

## 7. Roadmap 30/60/90 días

### Mes 1 — Validación
- Días 1-7: pre-launch checklist
- Día 7: prender Campaña MX
- Día 9: prender Campaña ES
- Días 14-30: monitoreo, decisión gate día 30

### Mes 2 — Optimización
- Si MX validó: escalar a $700/mes, posiblemente activar US (si landing EN existe)
- Cambio bidding a Portfolio tCPA si >30 conv/mes
- A/B test RSAs

### Mes 3 — Escalamiento
- Reactivar Argentina si MX+ES ROI-positivos
- Customer Match LAL en Demand Gen
- Considerar PerformanceMax para 1 destino top

---

## 8. Decisiones operativas pendientes

1. **Aprobar $1,000/mes** y billing
2. **Crear landing `/san-gil`** (1 día dev, desbloquea CPC $0.17 con 9,900 vol)
3. **Crear locale EN** para Campaña US (3-5 días dev)
4. **Mergear PRs F1+F2** antes de prender — sin dispatcher, no hay atribución real
5. **Validar dev token Google Ads** (TODO[F2-followup] en `lib/google-ads/offline-upload.ts`)

---

## Bundle import + playbooks

Operación continua en [`ops/google-ads/`](../../ops/google-ads/). Bundle de import en [`ops/google-ads/colombiatours/2026-05-launch/`](../../ops/google-ads/colombiatours/2026-05-launch/).

---

## Anexos / referencias

- Audit raw 10 bloques: transcript audit 2026-05-03
- Conversion truth Supabase: queries en `shared/customer_match_export.sql` y `landing_pages_inventory.md`
- Keyword research: 3 reportes DataForSEO MX/ES/US con métricas reales
- ADR-029 + SPEC_FUNNEL_EVENTS_SOT: arquitectura tracking unificado (EPIC #419, PRs #426/#427/#428)
