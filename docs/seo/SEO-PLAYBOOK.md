> **Estado**: Activo — ver [SEO-IMPLEMENTATION.md](./SEO-IMPLEMENTATION.md) para referencia técnica. Ver [SEO-FLUJOS-STUDIO.md](./SEO-FLUJOS-STUDIO.md) para guía de usuario paso a paso.
> Última actualización: Abril 2026

---

# Bukeer Studio — SEO Playbook for Travel v2.0
**Enterprise-grade SEO operations system for travel agencies and tour operators**

> Documento maestro para agencias SEO que operan sitios travel sobre Bukeer Studio. Cubre research, auditoría técnica, análisis competitivo, topic clusters, optimización por template, link building, GEO/AI Overviews y medición revenue-attributed. Pensado para equipos que trabajan con GSC, GA4, DataForSEO, Surfer/Clearscope, Ahrefs/Semrush y Screaming Frog.

---

## Índice

0. Principios operativos y stack de herramientas
1. Flujo Maestro — Auditoría & Configuración General
2. Flujo de Estrategia — Ciclo Continuo 30/90 con OKRs
3. Flujos Individuales por Tipo de Contenido (Hoteles, Actividades, Paquetes, Destinos, Blogs)
4. SERP Analysis & Content Scoring (capa semántica / NLP)
5. Topic Clusters & Arquitectura de Información
6. Link Building & Digital PR para Travel
7. GEO / AI Overviews / LLM Citability
8. Internationalization (hreflang + multi-país)
9. Schema.org por Template — Reference Completa
10. Revenue Attribution & Cierre de Loop con Bukeer Backend
11. Playbook General — Quick Start No Técnico

---

# 0. Principios operativos y stack de herramientas

## 0.1 Principios rectores

- **SERP-first, no keyword-first.** Cada decisión on-page arranca mirando el top 10 real del SERP objetivo, no una lista de palabras clave descontextualizadas.
- **Revenue over rankings.** Una keyword sin intención de reserva o sin margen no entra al backlog, aunque tenga 10K de volumen.
- **Priorización por impacto × facilidad × margen comercial.** Nunca solo por tráfico.
- **Medir antes de tocar.** Cada intervención requiere baseline de 28 días mínimo y ventana post-cambio de 6-8 semanas para SEO on-page, 12-16 semanas para link building.
- **Cerrar loop keyword → revenue.** La ventaja de Bukeer Studio es que tienes acceso a reservas reales en Supabase. Úsala.
- **AI-native.** Google AI Overviews, ChatGPT Search y Perplexity ya mueven tráfico travel en 2026. Optimizar solo para SERP clásico es dejar dinero en la mesa.

## 0.2 Stack de herramientas asumido

| Categoría | Herramienta principal | Alternativa |
|---|---|---|
| GSC data & queries | Google Search Console API | Bukeer Studio GSC tools |
| GA4 & atribución | GA4 + BigQuery export | Bukeer Studio analytics tools |
| Keyword research & SERP | DataForSEO Labs | Semrush, Ahrefs |
| Content scoring / NLP | Surfer SEO, Clearscope | MarketMuse, Frase |
| Backlinks & link intel | Ahrefs, Majestic | Semrush Backlink Gap |
| Rank tracking | AccuRanker, SerpRobot | Semrush Position Tracking |
| Crawling técnico | Screaming Frog | Sitebulb, JetOctopus |
| Core Web Vitals | PageSpeed Insights + CrUX | WebPageTest, Calibre |
| Schema validation | Schema.org Validator, Rich Results Test | — |
| AI Overviews tracking | Semrush AI Toolkit, Ahrefs Brand Radar | Otterly.ai, Peec AI |
| Revenue attribution | GA4 + Supabase (Bukeer backend) | Looker Studio, Metabase |

## 0.3 Roles y RACI sugerido

| Rol | Research | On-page | Técnico | Links | Reporting |
|---|---|---|---|---|---|
| SEO Lead | A | A | C | A | R |
| Content Strategist | R | R | I | I | C |
| Technical SEO | C | C | R | I | C |
| Outreach / PR | I | I | I | R | I |
| Client / Bukeer User | C | I | I | I | A |

R = Responsable · A = Aprueba · C = Consultado · I = Informado

---

# 1. FLUJO MAESTRO — Auditoría & Configuración General del Sitio

**Nombre del flujo y objetivo:** `Flujo Maestro SEO Travel` — auditar estado actual, detectar brechas de demanda/competencia/semántica/técnica y dejar un baseline accionable para crecer tráfico orgánico calificado y revenue.

**Pre-requisitos (datos/accesos):**
- `siteUrl` verificado en Google Search Console (dominio completo o prefijo URL).
- `propertyId` de GA4 con eventos de conversión definidos (`lead_submit`, `whatsapp_click`, `booking_start`, `booking_complete`).
- BigQuery export de GA4 activado (o en su defecto GA4 Data API).
- Acceso de lectura a Supabase (tabla de reservas) para cierre de loop revenue.
- País(es) objetivo con `location_name` y `language_code` por mercado.
- Lista representativa de URLs por tipo: Hoteles, Actividades, Paquetes, Destinos, Blogs (mínimo 3 por tipo).
- Dominio propio + 3-5 competidores directos **del mismo mercado** (no OTAs globales).
- Acceso a herramienta de content scoring (Surfer/Clearscope) y a Ahrefs/Semrush para backlinks.

## Fase 1: Health Check inicial

**Objetivo:** confirmar integraciones, cobertura mínima y tendencia base antes de optimizar.

**Pasos (orden recomendado):**
1. [TOOL: diagnostics] → parámetros: ninguno → buscar: cuentas conectadas sin errores (Google/Bing/GA4) y latencia normal.
2. [TOOL: sites_list] → parámetros: `engine="google"` → buscar: propiedad correcta del sitio y variantes duplicadas (http/https, www/no-www, sc-domain vs URL-prefix).
3. [TOOL: sites_health_check] → parámetros: `engine="google", siteUrl="<SITE_URL>"` → buscar: estado general, alertas de caída y señales de cobertura.
4. [TOOL: analytics_performance_summary] → parámetros: `siteUrl="<SITE_URL>", days=28` → buscar: baseline de clicks, impressions, CTR y posición promedio **segmentado brand vs non-brand**.
5. [TOOL: growth_pulse] → parámetros: `timeframe="last_30_days"` → buscar: señales rápidas de crecimiento/caída en sesiones y conversiones orgánicas.
6. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["country","device"], startDate="<28D_ATRAS>", endDate="<HOY>"` → buscar: split device (mobile vs desktop CTR gap) y país para validar hreflang.

**Criterios de éxito / métricas objetivo:**
- Integraciones 100% operativas incluyendo BigQuery export.
- Baseline documentado (28 días) para clicks, impressions, CTR, posición — **segmentado brand/non-brand, device, país**.
- 0 bloqueos críticos de acceso a datos.
- Tendencia clara identificada (up/flat/down) contra 28 días previos.

**Tiempo estimado:** 45-60 minutos.

**Pitfalls comunes a evitar:**
- Analizar propiedad equivocada (`sc-domain` vs `https://` — los datos pueden diferir 20%+).
- Mezclar datos de brand y non-brand sin segmentar.
- Arrancar optimizaciones sin baseline trazable.
- Ignorar split por device cuando en travel el 65-75% del tráfico es mobile.

## Fase 2: Auditoría técnica SEO

**Objetivo:** detectar cuellos técnicos que limiten crawling, indexación, rankings y rendering en SERPs y AI Overviews.

**Pasos (orden recomendado):**
1. [TOOL: sitemaps_list] → parámetros: `siteUrl="<SITE_URL>", engine="google"` → buscar: sitemap(s) activos, fecha de último fetch, errores.
2. [TOOL: sitemaps_get] → parámetros: `siteUrl="<SITE_URL>", feedpath="<SITEMAP_URL>"` → buscar: URLs enviadas vs indexadas por tipo de contenido; detectar cobertura < 85% como bandera roja.
3. [TOOL: inspection_batch] → parámetros: `siteUrl="<SITE_URL>", inspectionUrls=[<15-25 URLs representativas, 3-5 por tipo>]` → buscar: estado de indexación, canonical seleccionada vs declarada, bloqueos robots/noindex, hreflang.
4. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_CRITICA>"` por cada template (home + 1 por tipo = 6 URLs mínimo) → buscar: LCP, CLS, INP en móvil y desktop. **Cruzar con GSC clicks** para priorizar por tráfico real.
5. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_CRITICA>", strategy="mobile"` → buscar: oportunidades de performance (imágenes no optimizadas, JS bloqueante, fuentes sin `display=swap`).
6. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_CRITICA>"` por cada template → buscar: errores/advertencias en JSON-LD; validar coherencia con contenido visible (no basta con ser sintácticamente válido).
7. **[TOOL externo: Screaming Frog crawl]** → parámetros: crawl completo hasta 100K URLs con user-agent Googlebot-mobile → buscar: orphan pages, duplicate titles/metas, crawl depth > 4, redirect chains > 2, 404s con backlinks, paginación incorrecta.
8. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page"], startDate="<YYYY-MM-DD>", endDate="<YYYY-MM-DD>", limit=1000` → buscar: páginas con impresiones altas y CTR muy bajo (señal de snippet/canonical/meta-title débil).
9. **Auditoría hreflang** → revisar implementación si hay múltiples mercados: ¿cada página tiene return-tags? ¿`x-default` configurado? ¿URLs absolutas?
10. **Validación de Open Graph y Twitter Cards** en templates principales (impacta en CTR desde social y previews en AI chats).

**Criterios de éxito / métricas objetivo:**
- 95%+ de URLs estratégicas indexables y con canonical correcta.
- 0 errores críticos de sitemap/canonical/schema/hreflang.
- Core Web Vitals: 75%+ de URLs con tráfico en "Good" (móvil como prioridad).
- 0 orphan pages con potencial comercial.
- Crawl depth ≤ 4 para money pages.

**Tiempo estimado:** 3-4 horas.

**Pitfalls comunes a evitar:**
- Medir CWV solo en home y no en templates por tipo.
- Ignorar canonical mismatch entre páginas similares (canibalización silenciosa).
- Tener JSON-LD válido sintácticamente pero incoherente con contenido real (Google lo ignora o penaliza).
- No auditar rendering JavaScript en sitios SPA/client-side.
- Olvidar validar hreflang con herramientas como `hreflang.org` o Screaming Frog hreflang audit.

## Fase 3: Análisis de demanda (keyword universe travel por país)

**Objetivo:** construir universo de keywords por intención, estacionalidad local y potencial de revenue; **no solo volumen**.

**Pasos (orden recomendado):**
1. [TOOL: kw_data_google_ads_search_volume] → parámetros: `keywords=["viajes a","hoteles en","paquetes a","que hacer en","tours en"], location_name="<PAIS>", language_code="<IDIOMA>"` → buscar: volúmenes base y clusters iniciales.
2. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["hoteles en <ciudad>","paquetes a <destino>","tours en <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=500` → buscar: variantes long-tail, CPC/competencia (proxy de intención comercial).
3. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="viajar a <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: entidades relacionadas útiles para hubs de contenido.
4. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_300_KEYWORDS>], language_code="<IDIOMA>"` → buscar: intención dominante y keywords ambiguas.
5. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["viajes a <destino>","temporada alta <destino>","clima <destino>"], location_name="<PAIS>", type="web"` → buscar: picos estacionales para calendar editorial.
6. **[TOOL externo: Semrush/Ahrefs Keyword Magic Tool]** → buscar: **Parent Topics**, agrupación semántica, keyword difficulty calibrada y estimación de tráfico orgánico por posición.
7. **Filtrado por modificadores de intención comercial (regex):**
   - Transaccional: `precio|cuanto cuesta|cotizar|reserva|comprar|desde`
   - Comparativa: `mejor|top|vs|comparar|opiniones|reviews`
   - Informacional con intención: `como|cuando|que|cuanto|itinerario|guia`
   - Local: `cerca de|en <ciudad>|<ciudad>`
8. **Cross-reference con datos de Bukeer backend:** ¿qué destinos/actividades/paquetes generan más revenue real? Priorizar keywords que cubren ese inventario vs. keywords "huérfanas".

**Criterios de éxito / métricas objetivo:**
- Keyword universe priorizado por intención, volumen, estacionalidad **y margen comercial**.
- 1 mapa de clústeres por cada tipo de contenido (5 mapas mínimo).
- 20-50 oportunidades de "quick wins" (posiciones 8-20 con volumen ≥ 100) detectadas.
- Calendar editorial estacional con 3-6 picos identificados.

**Tiempo estimado:** 4-6 horas.

**Pitfalls comunes a evitar:**
- Priorizar solo volumen y olvidar intención de compra.
- No separar búsquedas locales (`cerca de mí`, ciudad-país).
- Ignorar estacionalidad (Semana Santa, puentes festivos, temporada seca, ferias locales tipo Flores Medellín / Carnaval Barranquilla).
- Perseguir keywords sin inventario real para cubrirlas (keyword sin producto = no vende).

## Fase 4: SERP Analysis & Content Gap Semántico

**Objetivo:** entender cómo se ve realmente el SERP objetivo para cada keyword estratégica y detectar el gap de contenido vs. top 10.

**Pasos (orden recomendado):**
1. **[TOOL externo: DataForSEO SERP API o Semrush SERP features]** → parámetros: top 20 keywords money → buscar: SERP features presentes (Featured Snippet, PAA, Maps Pack, Things to Do, Hotel Pack, Video Carousel, AI Overview, Discussions).
2. **Clasificación de SERP type por keyword:**
   - **Local-SERP dominated** (Maps Pack + Things to Do) → estrategia GBP + schema `LocalBusiness` + reviews agregados, NO landing tradicional.
   - **Informational-SERP** (PAA + Featured Snippet) → contenido long-form optimizado para extracción.
   - **Commercial-SERP** (sitelinks + productos) → landing transaccional con schema `Product`/`Offer`.
   - **Mixed-SERP** → estrategia híbrida con hub + spokes.
3. **[TOOL externo: Surfer SEO Content Editor o Clearscope]** → parámetros: URL objetivo + keyword principal → buscar:
   - **Content Score** actual vs. objetivo (mínimo 70+ para competir).
   - **Términos NLP faltantes** (entidades, co-ocurrencias, términos técnicos del nicho).
   - **Word count target** basado en media del top 10.
   - **Estructura H2/H3 recomendada** por frecuencia en SERP.
   - **Preguntas de PAA** para convertir en H2 o FAQ schema.
4. **Análisis de entidades con Google NLP API** (opcional, avanzado) → extraer entidades del top 10 y cruzar con tu contenido → detectar gaps de cobertura semántica.
5. **Análisis de AI Overviews (si presentes):**
   - ¿Qué fuentes cita Google AI Overview para esa keyword?
   - ¿Tu dominio aparece? Si no, ¿por qué? (autoridad, estructura, schema).
   - Párrafos de respuesta directa de 40-60 palabras en tu contenido optimizados para extracción.
6. **People Also Ask mining:** extraer las 10-20 PAA más frecuentes en tu cluster y convertirlas en FAQ schema + H2.
7. **Competitor content dissection** para la URL #1-3 del SERP:
   - Longitud total, número de H2, número de imágenes, schema usado.
   - Internal links outgoing y anchors.
   - Frecuencia de actualización (buscar fechas de `dateModified`).

**Criterios de éxito / métricas objetivo:**
- 100% de URLs money con SERP type clasificado.
- Content Score objetivo ≥ 70 para cada URL priorizada.
- Gap de términos NLP documentado por URL.
- Lista de 50-100 PAA convertibles en contenido.
- Identificación de keywords donde competir es **imposible sin autoridad alta** (descartar o reservar para fase 2).

**Tiempo estimado:** 3-5 horas (parte crítica del playbook).

**Pitfalls comunes a evitar:**
- Escribir contenido largo sin optimización NLP (long-form genérico ya no rankea en 2026).
- Ignorar que keywords con Maps Pack requieren GBP, no landing.
- No revisar qué fuentes cita AI Overviews (es el nuevo top 3).
- Copiar estructura del competidor #1 literal (Google detecta patrones duplicados).

## Fase 5: Análisis competitivo (rank, keywords gap, backlinks gap)

**Objetivo:** entender quién captura la demanda, dónde está el mayor gap atacable y qué links específicos replicar.

**Pasos (orden recomendado):**
1. [TOOL: dataforseo_labs_google_competitors_domain] → parámetros: `target="<DOMINIO>", location_name="<PAIS>", language_code="<IDIOMA>", limit=50` → buscar: competidores orgánicos reales por intersección de keywords (no los que tú crees que son competidores).
2. [TOOL: dataforseo_labs_google_domain_intersection] → parámetros: `target1="<DOMINIO>", target2="<COMPETIDOR_1>", location_name="<PAIS>", language_code="<IDIOMA>", intersections=false, limit=500` → buscar: keywords del competidor donde tu dominio no rankea. Repetir por cada top 3.
3. [TOOL: backlinks_summary] → parámetros: `target="<DOMINIO>"` → buscar: referring domains, backlinks totales, anchor distribution, DR/DA.
4. [TOOL: backlinks_competitors] → parámetros: `target="<DOMINIO>", limit=50` → buscar: dominios competidores con mayor overlap de backlinks.
5. [TOOL: backlinks_domain_intersection] → parámetros: `targets=["<DOMINIO>","<COMPETIDOR_1>","<COMPETIDOR_2>","<COMPETIDOR_3>"]` → buscar: dominios que enlazan a 2+ competidores y no a ti (target prioritario de outreach).
6. [TOOL: backlinks_referring_domains] → parámetros: `target="<DOMINIO>", limit=200` → buscar: calidad y relevancia temática de dominios enlazantes.
7. **[TOOL externo: Ahrefs Best by Links / Semrush Top Pages]** por competidor → identificar las 20 páginas con más backlinks de cada competidor → replicar formato/ángulo adaptado.
8. **Anchor text distribution audit** (propio y top 3 competidores):
   - Ratio saludable travel: 40-60% brand, 15-25% URL naked, 10-20% generic ("click aquí"), 5-15% parcial, < 5% exact-match.
   - Red flag: exact-match anchors > 15% sin disavow = riesgo penalty Penguin.
9. **Link velocity** mes a mes (últimos 12 meses) vs. competidores → detectar si alguien está haciendo campaña agresiva.
10. **Toxic backlinks audit** con Ahrefs Domain Rating + Spam Score (Semrush) → lista de disavow si hay > 50 dominios tóxicos.
11. **Broken backlink reclamation** → `Ahrefs → Best by Links → 404` → contactar para redirigir.
12. **Unlinked brand mentions** → `Ahrefs Content Explorer "nombre marca" -site:dominio.com` → outreach para convertir en link.

**Criterios de éxito / métricas objetivo:**
- Top 3 competidores priorizados por amenaza real (no por tamaño).
- Lista de 100-300 keywords gap accionables.
- Lista de 30-80 dominios prioritarios para outreach/link partnerships.
- Anchor distribution auditada con plan de corrección si hay red flags.
- Lista de 10-30 oportunidades de link reclamation (broken + mentions).

**Tiempo estimado:** 4-6 horas.

**Pitfalls comunes a evitar:**
- Compararte con OTAs globales (Booking, Expedia, TripAdvisor) no atacables en corto plazo — usar competidores del mismo tier.
- Copiar keywords sin validar intención/conversión para travel local.
- Buscar volumen sin evaluar dificultad y autoridad requerida.
- Ignorar anchor text distribution hasta que llegue la penalización.

## Fase 6: Configuración de baseline según hallazgos + scorecard

**Objetivo:** traducir hallazgos en plan de ejecución priorizado, medible y con dueños.

**Pasos (orden recomendado):**
1. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=100` → buscar: keywords con impresiones altas y ranking bajo optimizable.
2. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, limit=100` → buscar: consultas en posiciones 8-15 para empujar a top 5.
3. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=500` → buscar: snippets a reescribir (title/meta).
4. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=50, limit=100` → buscar: queries con 2+ URLs compitiendo.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<ULTIMOS_28D>", period1End="<HOY>", period2Start="<28D_ANTERIORES>", period2End="<DIA_PREVIO>"` → buscar: tendencia para fijar baseline y metas realistas.
6. **Fórmula de priorización (scoring final):**

```
Impacto_potencial = (Impressions × CTR_gap × Intencion_comercial × Margen_comercial)
Facilidad = (Posicion_entre_8_20 × URL_ya_indexada × Autoridad_interna × Content_Score_actual/100)
Prioridad_final = Impacto_potencial × Facilidad
```

Donde:
- `Intencion_comercial` = 0.3 (TOFU) / 0.6 (MOFU) / 1.0 (BOFU transaccional).
- `Margen_comercial` = dato real de Bukeer backend por tipo de producto (normalizado 0-1).
- `Autoridad_interna` = número de internal links entrantes / máximo del sitio.

7. **Backlog P1/P2/P3** con owner, fecha, KPI y tipo de acción.

**Criterios de éxito / métricas objetivo:**
- Backlog priorizado P1/P2/P3 por impacto × esfuerzo × margen.
- 100% de páginas objetivo con owner, fecha y KPI.
- Meta 90 días por tipo: clicks, CTR, top 10 keywords, leads orgánicos, **revenue atribuido**.

**Tiempo estimado:** 2-3 horas.

**Pitfalls comunes a evitar:**
- No separar quick wins (P1) de apuestas estructurales (P2/P3).
- Medir solo tráfico y no conversiones ni revenue.
- Cambiar demasiadas variables a la vez sin control (imposible atribuir causa).
- No incluir margen comercial en el scoring — te lleva a optimizar keywords sin plata.

**Entregable: Scorecard con métricas a mejorar + prioridades P1/P2/P3 + benchmarks de industria**

| KPI | Baseline | Meta 90 días | Benchmark travel LATAM | Prioridad | Tipo de acción |
|---|---:|---:|---:|---|---|
| Clicks orgánicos total (non-brand) | `<valor>` | `+30-50%` | — | P1 | Optimización de URLs en striking distance |
| CTR orgánico promedio | `<valor>` | `+1.5-3 pp` | Pos 1: 28% · Pos 3: 11% · Pos 5: 6% | P1 | Reescritura title/meta en top impresiones |
| Keywords en Top 10 non-brand | `<valor>` | `+25%` | — | P1 | Clusters transaccionales y content scoring |
| Keywords en Top 3 non-brand | `<valor>` | `+15%` | — | P1 | SERP-aware content + links |
| URLs con CWV "Good" (mobile) | `<valor>` | `≥75%` | Google target: 75% | P2 | Performance móvil por templates |
| Errores de indexación críticos | `<valor>` | `0` | — | P1 | Canonical, sitemap, inspección |
| Referring domains relevantes (DR 30+) | `<valor>` | `+20-40` | — | P3 | Link gap + digital PR estacional |
| Anchor exact-match ratio | `<valor>` | `<10%` | Saludable: 5-15% | P2 | Diversificación de anchors |
| Leads orgánicos (GA4) | `<valor>` | `+20-35%` | — | P1 | Mejora de landings transaccionales |
| **Revenue atribuido SEO (last-click)** | `<valor>` | `+25-40%` | — | **P1** | **Cierre de loop keyword→booking** |
| **Revenue atribuido SEO (data-driven)** | `<valor>` | `+35-55%` | — | **P1** | **Incluye blog assisted conversions** |
| Citations en AI Overviews | `<valor>` | `≥10 keywords` | — | P2 | GEO optimization (sección 7) |

---

# 2. FLUJO DE ESTRATEGIA — Ciclo Continuo 30/90 con OKRs SEO

**Nombre del flujo y objetivo:** `Ciclo SEO Continuo 7/30/90` — operar SEO como sistema recurrente **semanal** (pre-temporada alta), **mensual** (régimen normal) y **trimestral** (revisión estratégica).

**Pre-requisitos (datos/accesos):**
- Baseline de la Sección 1 completado.
- Mapeo URL → tipo de contenido → cluster → pillar.
- Eventos de conversión definidos en GA4 con revenue tracking.
- Rank tracking diario de top 50-100 keywords money.
- Alertas configuradas (Slack/email) para caídas >15% en clicks o revenue.

## 2.1 Cadencia operativa

| Cadencia | Actividades clave | Tiempo |
|---|---|---|
| **Diaria (automatizada)** | Alertas de rank drop, indexación, CWV, tráfico anómalo | 0 min (alertas) |
| **Semanal (pre-pico)** | Monitoring en temporada alta, sprints 6 semanas antes de Semana Santa/Dec/Jul | 1-2 h |
| **Mensual** | Ejecución completa de monitoreo, backlog, optimizaciones | 3-4 h |
| **Trimestral** | Recalibración OKRs, keyword universe, benchmark competitivo, link velocity audit | 5-6 h |
| **Semestral** | Auditoría técnica completa, re-crawl Screaming Frog, hreflang audit | 6-8 h |

## 2.2 Métricas a monitorear por tipo de contenido (mensual)

| Tipo | Métricas GSC | Métricas GA4 + Bukeer | Meta sugerida |
|---|---|---|---|
| Hoteles | clicks, CTR, posición por URL/query, SERP features | sesiones orgánicas, tasa de lead, revenue por URL | subir CTR y leads locales + revenue |
| Actividades | clicks por query transaccional | eventos contacto/reserva, AOV | crecer long-tail "qué hacer + precio" + revenue |
| Paquetes | impresiones/clicks en términos comerciales | embudo conversión, revenue, margen | mover keywords 8-15 a top 5 + revenue |
| Destinos | cobertura estacional, AI Overviews mentions | engagement, navegación a money pages, assisted conv | sostener tráfico low season + tráfico derivado |
| Blogs | crecimiento non-brand, PAA apariciones | engaged sessions, **assisted conversions**, scroll depth | alimentar TOFU → BOFU + revenue asistido |

## 2.3 Flujo mensual (pasos numerados)

1. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], startDate="<MES_INICIO>", endDate="<MES_FIN>", limit=5000` → buscar: variación por URL y query en cada tipo.
2. [TOOL: get_report_data] → parámetros: `startDate="<MES_INICIO>", endDate="<MES_FIN>", dimensions=["landingPage","sessionDefaultChannelGroup"], metrics=["sessions","engagementRate","conversions","totalRevenue"]` → buscar: rendimiento orgánico y calidad de sesión.
3. **[Query BigQuery / Supabase]** → cruzar `ga_sessions` con `reservations` (Bukeer backend) para revenue atribuido real por landing page orgánica.
4. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=50, limit=100` → buscar: queries con múltiples URLs compitiendo.
5. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: URLs en posiciones 8-15.
6. [TOOL: seo_lost_queries] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: pérdidas severas para re-optimización urgente.
7. [TOOL: analytics_trends] → parámetros: `siteUrl="<SITE_URL>", dimension="query", days=56, minClicks=100, threshold=10` → buscar: queries al alza/caída para sprint del mes.
8. [TOOL: get_growth_metrics] → parámetros: `startDate="<MES_INICIO>", endDate="<MES_FIN>", compareWith="previous_period"` → buscar: progreso contra periodo previo y contra OKR.
9. **Rank tracking review** — top 50 keywords money: cambios posición, volatilidad SERP, aparición/pérdida de SERP features.
10. **AI Overviews monitoring** — ¿apareces en AI Overview de tus top 20 money keywords? ¿ganaste/perdiste citation?
11. [TOOL: dataforseo_labs_google_competitors_domain] → parámetros: `target="<DOMINIO>", location_name="<PAIS>", language_code="<IDIOMA>", limit=20` (trimestral) → buscar: nuevos competidores/amenazas.
12. **Link building review** — links ganados/perdidos últimos 30 días, anchor distribution drift, nuevos dominios tóxicos.

## 2.4 Priorización de ejecución mensual

**Regla 70/20/10:**
- **70% del tiempo** → quick wins P1 (striking distance, CTR opportunities, cannibalization fix).
- **20% del tiempo** → proyectos P2 (topic clusters, new content, schema rollout).
- **10% del tiempo** → experimentos P3 (AI Overviews optimization, link campaigns, new markets).

**Criterios de éxito / métricas objetivo:**
- Cumplimiento mensual de SLA SEO (monitoreo + backlog + ejecución).
- 70%+ de acciones enfocadas en páginas con potencial de negocio.
- Mejora consistente de clicks, CTR, conversiones **y revenue** mes contra mes.
- 0 alertas críticas sin respuesta > 24h.

**Tiempo estimado:** mensual 3-4 horas; semanal pre-pico 1-2 horas; trimestral 5-6 horas.

**Pitfalls comunes a evitar:**
- Revisar solo promedio global y no por tipo de contenido.
- Perseguir vanity metrics sin impacto en leads ni revenue.
- Ignorar señales de canibalización hasta que caiga tráfico.
- No sprintear 6 semanas antes de picos estacionales (es cuando se gana o se pierde el año).

---

# 3. FLUJOS INDIVIDUALES POR TIPO DE CONTENIDO

> Cada tipo tiene un Flujo A (research & priorización) y un Flujo B (optimización de página individual). Todos los flujos de optimización asumen haber pasado por la **Fase 4 de SERP Analysis + Content Scoring** antes de tocar la página.

## 3.1 Hoteles

### Hoteles: Flujo A — Research & Priorización

**Nombre del flujo y objetivo:** `Hotel Demand Capture` — detectar keywords de intención de reserva y priorizar URLs hoteleras con mayor potencial de revenue.

**Pre-requisitos:** inventario de páginas de hoteles activas con margen por hotel, ciudades objetivo, país/idioma del sitio.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["hotel en <ciudad>","hoteles baratos en <ciudad>","hotel boutique <ciudad>","hotel todo incluido <ciudad>","hotel familiar <ciudad>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: volumen, CPC, competencia, variantes transaccionales.
2. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_HOTEL_KEYWORDS>], language_code="<IDIOMA>"` → buscar: intención comercial/transactional dominante.
3. **SERP analysis por keyword** → ¿hay Hotel Pack de Google? ¿Maps Pack? Si sí, estrategia incluye GBP + schema `Hotel` + reviews. Si no, landing tradicional compite.
4. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], filters=[{"dimension":"page","operator":"contains","expression":"/hoteles/"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: URLs hoteleras con impresiones altas y posición 8-20.
5. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: consultas hoteleras casi en página 1.
6. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=300` → buscar: snippets hoteleros con baja tasa de clic.
7. **Cross con Bukeer backend:** ¿qué hoteles generaron más revenue últimos 90 días? Priorizar optimización de esas URLs.

**Criterios de éxito / métricas objetivo:** top 15 URLs de hoteles priorizadas con keyword principal, secundaria, Content Score target, SERP type y objetivo de revenue.

**Tiempo estimado:** 90-120 minutos.

**Pitfalls comunes a evitar:** agrupar todos los hoteles bajo una sola intención; ignorar modificadores locales (`centro`, `todo incluido`, `familiar`, `económico`, `lujo`); competir en keywords con Hotel Pack sin tener GBP fuerte.

### Hoteles: Flujo B — Optimización de Página Individual

**Nombre del flujo y objetivo:** `Hotel Page Lift` — mejorar visibilidad, CTR y conversión de una URL hotelera específica.

**Pre-requisitos:** URL objetivo, keyword principal con SERP type clasificado, Content Score baseline, acceso a edición en Bukeer Studio.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_HOTEL>"` → buscar: indexación, canonical seleccionada, cobertura, hreflang.
2. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_HOTEL>", strategy="mobile"` → buscar: bloqueadores de LCP/INP (galerías de imágenes son el sospechoso #1 en hoteles).
3. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_HOTEL>"` → buscar: errores de `Hotel`/`LodgingBusiness` JSON-LD + `AggregateRating` + `Review` + `PriceRange` + `amenityFeature` (ver sección 9).
4. **[TOOL externo: Surfer SEO Content Editor]** → optimizar para Content Score ≥ 70 con términos NLP del top 10 SERP.
5. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_HOTEL>"}], startDate="<ULTIMOS_28D>", endDate="<HOY>"` → buscar: queries reales para reescribir `title`, `meta description`, H1, FAQs.
6. **On-page checklist Hoteles:**
   - Title: `<Nombre Hotel> en <Ciudad> | <USP principal>` (≤ 60 chars).
   - Meta: incluir precio desde, ubicación, 1 amenidad clave, CTA (≤ 155 chars).
   - H1 ≠ Title, incluir keyword principal.
   - Galería con alt text descriptivo (no "hotel1.jpg").
   - Sección de precios visible above-the-fold (reduce rebote).
   - Amenities con iconografía + schema `amenityFeature`.
   - FAQ con schema `FAQPage` (preguntas de PAA reales).
   - Testimonios con schema `Review` + `AggregateRating`.
   - Mapa embebido (no solo imagen) + GBP linkado.
   - Internal links hacia: destino padre, actividades en el destino, paquetes que incluyen el hotel.
7. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: delta de clicks/CTR/posición/revenue tras cambios.

**Criterios de éxito / métricas objetivo:** +20% clicks orgánicos, +1.5 pp CTR, +15% lead rate, +20% revenue atribuido en 4-8 semanas.

**Tiempo estimado:** 60-90 minutos por URL.

**Pitfalls comunes a evitar:** cambiar title/meta sin alinear contenido visible; no incluir señales de confianza (precio, ubicación, amenities, reviews); schema `Hotel` sin datos coherentes con la página.

## 3.2 Actividades

### Actividades: Flujo A — Research & Priorización

**Nombre del flujo y objetivo:** `Activity Intent Mining` — identificar oportunidades "qué hacer", tours y experiencias con intención de compra, considerando SERP local-dominated.

**Pre-requisitos:** catálogo de actividades con precio y margen, destinos activos, temporada (alta/baja/lluvias), perfil de viajero target.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="que hacer en <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: ideas de actividades por subtema.
2. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["tour <destino>","excursiones <destino>","actividades <destino>"], location_name="<PAIS>", type="web"` → buscar: meses pico por actividad.
3. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["tour en <destino>","actividad en <destino>","excursion <destino>","experiencia <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=250` → buscar: long-tail con intención transaccional.
4. **SERP analysis crítico:** la mayoría de "que hacer en X" tiene **Things to Do de Google + Maps Pack** — estrategia debe incluir GBP + schema `TouristAttraction` agregado. Landing tradicional compite solo en long-tail específico.
5. [TOOL: analytics_top_queries] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=250, sortBy="impressions"` → buscar: queries de actividades con potencial sin página dedicada fuerte.
6. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=100, limit=100` → buscar: quick wins de actividades.
7. **Segmentación por perfil de viajero:** familias, aventura, parejas, lujo, mochilero — cada uno es un cluster distinto con keywords distintas.

**Criterios de éxito / métricas objetivo:** backlog de 20 páginas de actividades (nuevas/optimizar) con prioridad alta-media-baja + clasificación de SERP type.

**Tiempo estimado:** 75-105 minutos.

**Pitfalls comunes a evitar:** no separar actividades por perfil de viajero; ignorar restricciones estacionales; competir en "que hacer" sin estrategia GBP.

### Actividades: Flujo B — Optimización de Página Individual

**Nombre del flujo y objetivo:** `Activity Page Conversion Boost` — aumentar CTR, engagement y acciones de contacto/reserva en una página de actividad.

**Pre-requisitos:** URL de actividad, CTA definido, eventos GA4 configurados, SERP type clasificado.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_ACTIVIDAD>"` → buscar: indexación y canonical.
2. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_ACTIVIDAD>"` → buscar: estado CWV en móvil.
3. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_ACTIVIDAD>"` → buscar: validez de `TouristAttraction` + `Product` + `Offer` + `Review` + `AggregateRating` (ver sección 9).
4. **[TOOL externo: Surfer SEO]** → Content Score ≥ 70 con términos NLP específicos del tipo de actividad.
5. [TOOL: get_report_data] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", dimensions=["landingPage"], metrics=["sessions","engagementRate","conversions","totalRevenue"]` → buscar: engagement y conversiones de la URL.
6. **On-page checklist Actividades:**
   - Title: `<Actividad> en <Destino> | Desde <Precio> | <USP>` (≤ 60 chars).
   - H1 con keyword primaria + localización.
   - Bloque **"Incluye / No incluye"** (alta intención → alta conversión).
   - Duración, dificultad, edad recomendada, qué llevar.
   - Itinerario detallado con timing.
   - Precio visible + CTA fija en mobile.
   - Mapa con punto de encuentro.
   - FAQ schema con preguntas reales de clientes.
   - Reviews con schema.
   - Internal links: otras actividades en el destino, hoteles cercanos, paquetes que incluyen.
7. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: impacto SEO posterior.

**Criterios de éxito / métricas objetivo:** +15% CTR orgánico, +10% conversiones asistidas, +20% revenue atribuido en 30-60 días.

**Tiempo estimado:** 60-75 minutos por URL.

**Pitfalls comunes a evitar:** no mostrar precio/rango; contenido genérico sin itinerario, duración ni "incluye/no incluye"; no capturar reviews reales.

## 3.3 Paquetes

### Paquetes: Flujo A — Research & Priorización

**Nombre del flujo y objetivo:** `Package Revenue SEO` — priorizar páginas de paquetes con mayor potencial de ingresos y margen.

**Pre-requisitos:** slug público estable por paquete, inventario vigente, destinos/temporadas, **margen comercial por paquete**, moneda objetivo por mercado.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["paquetes a <destino>","viaje todo incluido <destino>","paquete <destino> <temporada>","luna de miel <destino>","viaje en familia <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: keywords comerciales con intención alta.
2. [TOOL: dataforseo_labs_google_domain_intersection] → parámetros: `target1="<DOMINIO>", target2="<COMPETIDOR_PAQUETES>", location_name="<PAIS>", language_code="<IDIOMA>", intersections=false, limit=300` → buscar: oportunidades donde competidor rankea y tú no.
3. **SERP analysis:** paquetes tiene SERP mixto (sitelinks, featured snippets, a veces shopping) — landing transaccional con schema `TouristTrip` + `Offer` es lo que mejor funciona.
4. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], filters=[{"dimension":"page","operator":"contains","expression":"/paquetes/"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: paquetes con alta impresión y baja posición.
5. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: páginas de paquetes en posiciones 8-15.
6. [TOOL: get_growth_metrics] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", compareWith="previous_period"` → buscar: páginas de paquetes que ya muestran tracción.
7. **Cross con Bukeer backend:** revenue × margen últimos 180 días → priorizar paquetes con mejor unit economics.

**Criterios de éxito / métricas objetivo:** top 10 paquetes priorizados por potencial de revenue × margen orgánico.

**Tiempo estimado:** 90-120 minutos.

**Pitfalls comunes a evitar:** optimizar paquetes sin URL indexable estable; no alinear keyword con moneda/mercado objetivo; priorizar por volumen sin ver margen real.

### Paquetes: Flujo B — Optimización de Página Individual

**Nombre del flujo y objetivo:** `Package Page Monetization` — optimizar una landing de paquete para captar tráfico y convertir.

**Pre-requisitos:** URL pública del paquete, pricing visible, estructura de oferta clara, hreflang si aplica multi-mercado.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_PAQUETE>"` → buscar: indexación y canonical correcta.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_PAQUETE>"` → buscar: `TouristTrip` + `Offer` + `AggregateRating` (si aplica) sin errores (ver sección 9).
3. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_PAQUETE>", strategy="mobile"` → buscar: mejoras de LCP e interactividad en módulos de precio/CTA.
4. **[TOOL externo: Surfer SEO]** → Content Score ≥ 70.
5. [TOOL: analyze_funnel] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", steps=[{"name":"Landing","pagePath":"<PATH_PAQUETE>"},{"name":"Contacto","eventName":"lead_submit"},{"name":"Inicio Reserva","eventName":"booking_start"},{"name":"Reserva","eventName":"booking_complete"}]` → buscar: drop-offs por etapa.
6. **On-page checklist Paquetes:**
   - Title: `<Paquete> <Destino> <Días> | Desde <Precio>` (≤ 60 chars).
   - H1 con USP + duración + destino.
   - Precio desde visible + "incluye/no incluye" expandible.
   - Itinerario día por día con iconos y timing.
   - Galería mejorada con schema `ImageObject`.
   - Reviews con schema + agregado visible.
   - Formulario de cotización corto (mobile-friendly, ≤ 4 campos).
   - Urgencia real ("últimos cupos temporada"), no fake countdown.
   - FAQ con schema.
   - Internal links: destino padre, hoteles del paquete, actividades incluidas.
7. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: mejora SEO + conversión + revenue.

**Criterios de éxito / métricas objetivo:** +20% clicks orgánicos, +10% tasa de inicio de reserva, +25% revenue atribuido en 6-8 semanas.

**Tiempo estimado:** 75-105 minutos por URL.

**Pitfalls comunes a evitar:** páginas de paquete sin diferenciadores claros; CTA con fricción alta en móvil; precios ocultos; no incluir schema `TouristTrip` (schema específico, bajo uso en competencia = oportunidad).

## 3.4 Destinos

### Destinos: Flujo A — Research & Priorización

**Nombre del flujo y objetivo:** `Destination Authority Builder` — priorizar páginas destino como hubs para dominar intención informacional-comercial y alimentar money pages.

**Pre-requisitos:** listado de destinos core, mapa de hubs y subpáginas disponibles, arquitectura pillar → cluster definida (sección 5).

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["viajar a <destino>","guia de <destino>","mejor epoca para viajar a <destino>","que ver en <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=400` → buscar: clúster TOFU/MOFU.
2. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["clima <destino>","temporada <destino>","viaje <destino>"], location_name="<PAIS>", type="web"` → buscar: estacionalidad para calendario de actualización.
3. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_DESTINO_KEYWORDS>], language_code="<IDIOMA>"` → buscar: split informacional vs comercial.
4. **SERP analysis:** destinos tiene AI Overviews, Featured Snippets, PAA abundantes — oportunidad alta de citación si contenido está bien estructurado (ver sección 7).
5. [TOOL: analytics_top_pages] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=200, sortBy="impressions"` → buscar: páginas destino con alta visibilidad y margen de CTR.
6. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=500, limit=100` → buscar: destinos con snippet poco competitivo.

**Criterios de éxito / métricas objetivo:** plan de contenidos por destino con prioridad basada en estacionalidad + intención + gap semántico + tráfico derivable a money pages.

**Tiempo estimado:** 75-105 minutos.

**Pitfalls comunes a evitar:** tratar destinos como páginas estáticas; no actualizar contenido por temporada/eventos; contenido enciclopédico sin puente a money pages.

### Destinos: Flujo B — Optimización de Página Individual

**Nombre del flujo y objetivo:** `Destination Page Topical Depth` — convertir una URL de destino en hub de autoridad, tráfico cualificado y citation en AI Overviews.

**Pre-requisitos:** URL destino, clusters secundarios mapeados, enlaces a Hoteles/Actividades/Paquetes relacionados, estructura pillar.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_DESTINO>"` → buscar: indexación y canonical.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_DESTINO>"` → buscar: validez de `TouristDestination` + `FAQPage` + `BreadcrumbList` + `ItemList` (ver sección 9).
3. **[TOOL externo: Surfer SEO / Clearscope]** → Content Score ≥ 75 (destinos requieren más cobertura que money pages).
4. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_DESTINO>"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: queries faltantes para enriquecer secciones.
5. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_DESTINO>"` → buscar: CWV en móvil.
6. **On-page checklist Destinos (pillar page):**
   - Title: `<Destino>: Guía Completa <Año> | <Sitio>` (≤ 60 chars).
   - H1 pilar + TOC (tabla de contenidos clickeable).
   - Secciones: intro → cuándo ir → cómo llegar → dónde dormir (link a hoteles) → qué hacer (link a actividades) → paquetes recomendados → FAQs → info práctica.
   - Párrafos de respuesta directa 40-60 palabras al inicio de cada sección (optimización GEO, sección 7).
   - Galería + mapa embebido.
   - Schema `TouristDestination` + `FAQPage` + `BreadcrumbList`.
   - Internal links contextuales (no "click aquí") a money pages.
   - `dateModified` actualizado mínimo trimestralmente.
7. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: mejora de visibilidad, CTR, **clicks internos a money pages**.

**Criterios de éxito / métricas objetivo:** +25% clicks non-brand, +15% clics internos a páginas transaccionales, +10 citaciones en AI Overviews.

**Tiempo estimado:** 60-90 minutos por URL.

**Pitfalls comunes a evitar:** no enlazar a money pages; contenido enciclopédico sin intención de viaje real; olvidar actualizar `dateModified` en refreshes.

## 3.5 Blogs

### Blogs: Flujo A — Research & Priorización

**Nombre del flujo y objetivo:** `Blog-to-Booking Pipeline` — usar blog para capturar demanda informacional y derivar tráfico + conversiones asistidas a páginas de negocio.

**Pre-requisitos:** categorías de blog, destinos comerciales prioritarios, mapa de enlaces internos, configuración de **assisted conversions** en GA4.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="guia de viaje <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: temas informacionales con volumen sostenido.
2. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["que hacer en <destino>","itinerario <destino> 3 dias","costo viaje <destino>","presupuesto viaje <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: oportunidades TOFU/MOFU.
3. [TOOL: analytics_top_queries] → parámetros: `siteUrl="<SITE_URL>", days=56, limit=500, sortBy="impressions"` → buscar: queries informacionales sin artículo específico o con canibalización.
4. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", days=56, minImpressions=30, limit=100` → buscar: posts compitiendo por la misma intención.
5. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", days=56, minImpressions=200, limit=100` → buscar: posts con potencial rápido de subida.
6. **GA4 path exploration:** identificar posts que asisten conversiones aunque no cierren — son keepers, no candidatos a poda.

**Criterios de éxito / métricas objetivo:** backlog de 30 temas de blog priorizados por potencial de tráfico **y assisted conversions** a landings comerciales.

**Tiempo estimado:** 75-105 minutos.

**Pitfalls comunes a evitar:** producir contenidos sin puente a conversión; no actualizar artículos evergreen; podar posts sin revisar assisted conversions.

### Blogs: Flujo B — Optimización de Página Individual

**Nombre del flujo y objetivo:** `Blog Post SEO Upgrade` — mejorar ranking de un artículo y su capacidad de derivar tráfico y conversiones asistidas a páginas de negocio.

**Pre-requisitos:** URL del post, keyword objetivo, enlaces internos de salida definidos, Content Score baseline.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_BLOG>"` → buscar: indexación y canonical.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_BLOG>"` → buscar: validez de `Article`/`BlogPosting` + `FAQPage` + `HowTo` cuando aplique + `Speakable` (ver sección 9).
3. **[TOOL externo: Surfer SEO]** → Content Score ≥ 70 + cubrir PAA completas.
4. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_BLOG>"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: keywords secundarias para H2/FAQs.
5. [TOOL: get_report_data] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", dimensions=["landingPage"], metrics=["sessions","engagementRate","conversions"]` → buscar: retención y conversiones asistidas por el post.
6. **On-page checklist Blog:**
   - Title: claim + keyword + modificador (número, año, localidad) (≤ 60 chars).
   - H1 ≠ title, más específico.
   - Párrafo de respuesta directa 40-60 palabras en intro (GEO-friendly).
   - TOC para posts > 1200 palabras.
   - H2 cubriendo PAA (con schema FAQ).
   - Internal links contextuales a money pages (mínimo 3 por post).
   - CTA contextual a mitad y al final (no popup).
   - Autor con schema `Person` + bio.
   - `dateModified` actualizado en cada refresh.
7. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: impacto de refresh (tráfico + CTR + posición + assisted conversions).

**Criterios de éxito / métricas objetivo:** +20% tráfico orgánico, +10% clics internos hacia money pages, +15% assisted conversions.

**Tiempo estimado:** 60-75 minutos por post.

**Pitfalls comunes a evitar:** sobreoptimizar keywords y perder legibilidad; no incluir CTAs contextuales; ignorar assisted conversions y podar posts útiles.

---

# 4. SERP ANALYSIS & CONTENT SCORING — Capa semántica / NLP

**Objetivo:** asegurar que cada pieza de contenido publicada compite realmente en el SERP objetivo, no solo "cubre la keyword".

## 4.1 Por qué esta capa es no negociable en 2026

Google pasó hace años de keyword matching a **neural matching + entity understanding + intent classification**. Rankear requiere:
- Cobertura semántica de entidades del cluster (no solo keywords).
- Estructura coherente con lo que el SERP premia para esa intención.
- Respuesta directa a la pregunta subyacente del usuario.
- Señales de frescura y autoridad temática.

Herramientas como Surfer, Clearscope, MarketMuse y Frase operacionalizan esto cruzando tu contenido contra el top 10-20 del SERP y dándote un **Content Score** medible.

## 4.2 Proceso estándar por URL

**Paso 1 — SERP snapshot (previo a escribir/optimizar):**
1. Capturar top 20 resultados del SERP objetivo (país + idioma correctos).
2. Identificar SERP features presentes.
3. Clasificar SERP type: Local-dominated, Informational, Commercial, Mixed.
4. Detectar si AI Overview está activo y qué fuentes cita.

**Paso 2 — Content dissection del top 10:**
- Word count promedio (usar como **piso**, no techo).
- Número de H2/H3 promedio.
- Estructura común de secciones.
- Schema usado mayoritariamente.
- Imágenes y videos promedio.
- Frecuencia de actualización (dateModified).
- Backlinks promedio (Ahrefs).

**Paso 3 — Content Score tool (Surfer/Clearscope):**
- Importar URL objetivo o borrador.
- Configurar keyword principal + secundarias.
- Generar lista de términos NLP relevantes.
- Target: **≥ 70 Content Score** para competir en top 10; **≥ 80** para top 3.

**Paso 4 — PAA mining:**
- Extraer 10-20 People Also Ask del SERP.
- Convertir en H2 + FAQ schema.
- Priorizar las que aparecen en AI Overviews.

**Paso 5 — Entity coverage (avanzado):**
- Usar Google NLP API o InLinks para extraer entidades del top 10.
- Cruzar con tu contenido → lista de gaps.
- Agregar entidades faltantes de forma natural.

## 4.3 Criterios de publicación (Definition of Done para contenido)

Ningún contenido sale a producción sin:
- ✅ Content Score ≥ 70 (objetivo 80+ para BOFU).
- ✅ SERP type clasificado y estrategia alineada.
- ✅ PAA cubiertas en H2/FAQ.
- ✅ Schema validado para el template.
- ✅ Internal links outgoing a money pages (mínimo 2 para blog, 1 para destino).
- ✅ Párrafo de respuesta directa 40-60 palabras al inicio (GEO).
- ✅ Imágenes con alt text descriptivo y optimizadas < 200KB.
- ✅ Meta title y description con CTR angle testeable.
- ✅ `dateModified` y autor visibles.

---

# 5. TOPIC CLUSTERS & ARQUITECTURA DE INFORMACIÓN

**Objetivo:** dejar de publicar páginas sueltas y operar arquitectura pillar → cluster que concentra autoridad temática y fluye link equity a money pages.

## 5.1 Modelo pillar → cluster para travel

```
PILLAR (destino)
  ├── CLUSTER: Cuándo ir / temporadas / clima
  │    └── Blog posts informacionales
  ├── CLUSTER: Cómo llegar / transporte
  │    └── Blog posts informacionales
  ├── CLUSTER: Dónde dormir
  │    ├── Pillar secundario: Hoteles en <destino>
  │    └── URLs individuales de hoteles (money pages)
  ├── CLUSTER: Qué hacer
  │    ├── Pillar secundario: Actividades en <destino>
  │    └── URLs individuales de actividades (money pages)
  ├── CLUSTER: Paquetes y viajes organizados
  │    └── URLs individuales de paquetes (money pages)
  └── CLUSTER: Preparación / info práctica
       └── Blog posts informacionales
```

**Regla de oro:** todo blog post de un cluster debe linkear al menos a 1 money page del mismo destino con anchor contextual (no "click aquí").

## 5.2 Auditoría de arquitectura existente

**Herramienta base:** Screaming Frog + Ahrefs Internal Link Report.

**Pasos:**
1. Crawl completo del sitio con Screaming Frog (user-agent Googlebot-mobile).
2. Export de "Inlinks" e "Outlinks" por URL.
3. Detectar **orphan pages** (URLs sin inlinks internos) — son invisibles para Google en la práctica.
4. Detectar URLs con **crawl depth > 4** — reciben poco PageRank.
5. Analizar **internal PageRank flow** (Ahrefs Internal Link Opportunities o Sitebulb).
6. Detectar **anchor diversity** en internal links (no todo debe ser exact-match).
7. Listar money pages sin inlinks desde pillar pages → fix inmediato.

## 5.3 Plan de remediación

- **Orphan fix:** cada money page debe recibir al menos 3 inlinks contextuales desde contenido temáticamente relacionado.
- **Crawl depth fix:** money pages a ≤ 3 clics desde home.
- **Pillar activation:** pillar pages con TOC + links a todos los clusters + links a top money pages.
- **Contextual internal links:** reemplazar "click aquí" por anchors descriptivos con keyword variations.
- **Breadcrumb schema** en 100% de URLs.

---

# 6. LINK BUILDING & DIGITAL PR PARA TRAVEL

**Objetivo:** construir autoridad de dominio y temática de forma segura, diversificada y replicable.

## 6.1 Principios

- **Calidad > cantidad.** 1 link de medio tier 1 travel > 50 links de directorios.
- **Relevancia temática** pesa más que DR puro.
- **Anchor diversity** es protección contra penalties.
- **Link velocity** consistente > picos sospechosos.
- **Relaciones > transacciones.** Los mejores links vienen de periodistas, bloggers y partners con los que se cultivan relaciones.

## 6.2 Tácticas por prioridad

### P1 — Link reclamation (bajo esfuerzo, alto ROI)

1. **Broken backlink reclamation:** Ahrefs → Best by Links → filter 404 → contactar para redirigir a URL viva.
2. **Unlinked brand mentions:** Ahrefs Content Explorer `"<marca>" -site:dominio.com` → outreach para convertir mención en link.
3. **Lost backlinks recovery:** Ahrefs Backlinks → filter Lost últimos 90 días → outreach de recuperación.

### P2 — Digital PR estacional travel

1. **Data-driven content** con hooks de prensa:
   - "Los 10 destinos más buscados en Colombia para Semana Santa 2026" (con data de Bukeer).
   - "Cuánto cuesta viajar a <destino> en 2026" con tabla comparativa.
   - "Tendencias de viaje LATAM 2026" con encuesta propia.
2. **HARO / Qwoted / Featured.com** — responder queries de periodistas travel diariamente.
3. **Pitches a medios travel LATAM:** Aviatur Magazine, Matador Network ES, National Geographic ES, Condé Nast Traveler, Travesías, revistas de aerolíneas.
4. **Eventos estacionales:** press release antes de Feria de Flores, Carnaval Barranquilla, Hay Festival, etc. con data y cotizaciones.

### P3 — Link gap outreach

1. **Domain intersection** con top 3 competidores → lista de dominios que enlazan a ≥ 2 y no a ti.
2. **Skyscraper** sobre contenido del competidor que más links atrae.
3. **Link swaps temáticos** con travel bloggers y agencias complementarias (nunca footer links, siempre contextuales).
4. **Guest posts selectivos** en medios de DR 40+ del nicho (máximo 2-3 al mes para no levantar flags).

### P4 — Partnerships travel

1. **Tourism boards** locales y regionales (procolombia.co, fontur.com.co, oficinas de turismo).
2. **Proveedores e inventario** (hoteles, aerolíneas, transporte) — páginas "partners" con links cruzados genuinos.
3. **Bloggers y creators** en campañas reales con contenido publicado.

## 6.3 Anchor text distribution target

| Tipo de anchor | Ratio saludable travel |
|---|---:|
| Brand (ColombiaTours, Bukeer) | 40-55% |
| URL naked | 10-20% |
| Generic ("sitio web", "click aquí") | 10-15% |
| Partial match ("tours en Cartagena") | 10-20% |
| Exact match ("hoteles en Cartagena") | < 10% |
| Image alt | 5-10% |

**Red flags:**
- Exact match > 15% → riesgo Penguin, iniciar diversificación.
- Brand < 30% → over-optimization pattern.
- Picos de +50 dominios en una semana sin campaña pública → auditar spam injection.

## 6.4 Monitoring continuo

- **Rank tracking de top 50 keywords** con alerta si -5 posiciones en 7 días.
- **Link velocity mensual** vs. competidores (Ahrefs).
- **Toxic backlinks audit trimestral** con plan de disavow si > 50 dominios tóxicos nuevos.
- **Anchor distribution drift** trimestral.

---

# 7. GEO / AI OVERVIEWS / LLM CITABILITY

**Objetivo:** optimizar contenido para ser citado por Google AI Overviews, ChatGPT Search, Perplexity, Gemini, Claude y otros motores conversacionales que ya mueven tráfico travel en 2026.

## 7.1 Por qué importa en travel

El journey de un viajero en 2026 arranca cada vez más con preguntas a un LLM ("planea un viaje de 5 días a Cartagena con presupuesto X"). Estar en las fuentes citadas = estar en el "consideration set" del viajero antes de que siquiera llegue a Google.

Tráfico referral desde AI answers típicamente:
- Tiene **intent mucho más alto** (el usuario ya pasó por la fase de research).
- Convierte **2-4x mejor** que tráfico orgánico tradicional.
- Es más difícil de trackear (usa UTM + referrer detection).

## 7.2 Principios de contenido GEO-friendly

1. **Párrafos de respuesta directa** de 40-60 palabras al inicio de cada sección H2 (los LLMs los extraen literal).
2. **Datos concretos y citables:** precios, fechas, distancias, duraciones, temperaturas — no vaguedades.
3. **Atribución clara:** autor con credenciales, fecha de actualización, fuentes citadas.
4. **Estructura jerárquica limpia:** H2/H3 con preguntas naturales.
5. **Listas y tablas** (los LLMs las extraen y reformatean bien).
6. **Schema `Article` + `FAQPage` + `Speakable`** para marcar contenido extraíble.
7. **Originalidad verificable:** datos propios (Bukeer backend) que no están en otro lado.
8. **E-E-A-T signals:** experiencia real mostrada con fotos propias, itinerarios vividos, reviews verificables.

## 7.3 Optimización específica por tipo de LLM

| Motor | Qué premia | Táctica |
|---|---|---|
| Google AI Overviews | Fuentes ya rankeadas top 10 + schema + frescura | Subir ranking orgánico + schema `FAQPage` + `dateModified` reciente |
| ChatGPT Search (Bing) | Autoridad de dominio + contenido estructurado + Bing Webmaster | Registrar en Bing WMT + IndexNow + schema |
| Perplexity | Diversidad de fuentes + citations trazables | Contenido original + datos propios + outbound citations correctas |
| Gemini | Coherencia con Knowledge Graph + schema + Google Business | GBP optimizado + schema completo + entidades consistentes |
| Claude (web_search) | Contenido claro, estructurado, con fechas | Estructura limpia + `dateModified` + sin clickbait |

## 7.4 Tracking de AI Overviews y LLM referrals

**Herramientas:**
- **Semrush AI Toolkit** y **Ahrefs Brand Radar** — detectan apariciones en AI Overviews para tus keywords.
- **Otterly.ai / Peec AI** — monitoring dedicado de citations en ChatGPT/Perplexity/Gemini.
- **GA4 referral filters:** crear segmentos para `chat.openai.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`.

**KPI nuevos:**
- Número de money keywords con aparición en AI Overview.
- Citations mensuales en ChatGPT Search / Perplexity.
- Tráfico referral desde LLMs (sessions, conversions, revenue).
- Share of voice en AI answers del cluster objetivo.

## 7.5 Checklist GEO por URL

- ✅ Respuesta directa 40-60 palabras al inicio.
- ✅ Schema `FAQPage` con preguntas PAA reales.
- ✅ Schema `Speakable` en párrafos clave.
- ✅ Datos concretos citables (precios, fechas, números).
- ✅ Autor con schema `Person` + bio + credenciales.
- ✅ `dateModified` reciente (≤ 90 días para contenido evergreen).
- ✅ Fuentes externas citadas con outbound links a dominios autoritativos.
- ✅ Estructura H2/H3 con preguntas naturales.
- ✅ Tablas y listas para datos comparativos.

---

# 8. INTERNATIONALIZATION (hreflang + estrategia multi-país)

**Objetivo:** operar SEO en múltiples mercados sin canibalización internacional ni pérdida de señales.

## 8.1 Cuándo aplica

Aplica si el sitio sirve a ≥ 2 de estos mercados:
- Colombia (`es-CO`)
- México (`es-MX`)
- España (`es-ES`)
- Estados Unidos hispanohablante (`es-US`)
- Estados Unidos anglófono (`en-US`)
- Otros LATAM (`es-PE`, `es-AR`, `es-CL`, etc.)

## 8.2 Arquitectura recomendada

**Opción A (recomendada para Bukeer): subdirectorios por mercado**
```
colombiatours.travel/                  → default (es-CO)
colombiatours.travel/mx/               → es-MX
colombiatours.travel/es/               → es-ES
colombiatours.travel/en/               → en-US
```

**Ventajas:** hereda autoridad del dominio, fácil de operar, compatible con Bukeer multi-template.

**Opción B: subdominios** — solo si hay equipos o stacks separados.

**Opción C: ccTLDs** — solo si hay operaciones legales/fiscales separadas por país.

## 8.3 Implementación hreflang

**Reglas críticas:**
1. **Return tags obligatorios:** cada página debe declarar hreflang a sí misma y a todas sus alternativas.
2. **`x-default`** siempre presente (apunta a la versión por defecto o al selector de país).
3. **URLs absolutas** siempre.
4. **Coherencia con canonical** — canonical self-referencing, hreflang apunta a todas.
5. **Códigos ISO correctos:** `es-CO` no `es_co` ni `es-co`.

**Ejemplo:**
```html
<link rel="alternate" hreflang="es-CO" href="https://colombiatours.travel/paquetes/cartagena/" />
<link rel="alternate" hreflang="es-MX" href="https://colombiatours.travel/mx/paquetes/cartagena/" />
<link rel="alternate" hreflang="es-ES" href="https://colombiatours.travel/es/paquetes/cartagena/" />
<link rel="alternate" hreflang="en-US" href="https://colombiatours.travel/en/packages/cartagena/" />
<link rel="alternate" hreflang="x-default" href="https://colombiatours.travel/paquetes/cartagena/" />
```

## 8.4 Auditoría hreflang

- **Screaming Frog → Hreflang tab** — detecta return tags faltantes, códigos inválidos, inconsistencias.
- **GSC → International Targeting report** — errores reportados directamente por Google.
- **Sitemap hreflang** como alternativa/complemento a tags HTML (útil para sitios grandes).

## 8.5 Estrategia de contenido multi-país

- **No traducir literal** — adaptar precios (moneda), referencias culturales, festivos, CTAs.
- **Keywords locales** — `vacaciones` (ES) vs `vacación` (MX) vs `descansar` (CO) son distintos.
- **Links internos dentro del mismo mercado** — no mezclar clusters entre países.
- **GBP separado** por mercado con número local y dirección.
- **Pagos en moneda local** — COP, MXN, USD, EUR según mercado.

---

# 9. SCHEMA.ORG POR TEMPLATE — Reference completa

**Objetivo:** reference rápida de qué schemas implementar por tipo de página en un sitio travel.

## 9.1 Tabla maestra

| Template | Schemas requeridos | Schemas recomendados | Schemas opcionales |
|---|---|---|---|
| **Home** | `Organization`, `WebSite`, `BreadcrumbList` | `SearchAction`, `LocalBusiness` si aplica | `Speakable` |
| **Hotel** | `Hotel` o `LodgingBusiness`, `BreadcrumbList` | `AggregateRating`, `Review`, `PriceRange`, `amenityFeature`, `geo`, `image` | `FAQPage`, `Offer` |
| **Actividad** | `TouristAttraction` o `Product`, `Offer`, `BreadcrumbList` | `AggregateRating`, `Review`, `duration`, `geo`, `image` | `Event` si tiene fechas fijas, `FAQPage` |
| **Paquete** | `TouristTrip`, `Offer`, `BreadcrumbList` | `itinerary`, `AggregateRating`, `Review`, `image`, `touristType` | `FAQPage`, `TripPrice` |
| **Destino (pillar)** | `TouristDestination`, `BreadcrumbList`, `FAQPage` | `ItemList` de actividades/hoteles, `Place`, `image` | `Speakable`, `Event` si hay ferias |
| **Blog post** | `BlogPosting` o `Article`, `BreadcrumbList`, `Person` (autor) | `FAQPage`, `image`, `dateModified`, `publisher` | `HowTo` si aplica, `Speakable` |
| **Listado (SRP)** | `BreadcrumbList`, `CollectionPage`, `ItemList` | `Product` por item, `AggregateOffer` | — |
| **Contacto** | `Organization`, `ContactPoint`, `BreadcrumbList` | `LocalBusiness`, `openingHoursSpecification` | — |
| **FAQ general** | `FAQPage`, `BreadcrumbList` | `Speakable` | — |

## 9.2 Ejemplos críticos

### Hotel JSON-LD completo

```json
{
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Hotel Ejemplo Cartagena",
  "description": "Hotel boutique en el centro histórico de Cartagena con piscina y vista al mar.",
  "url": "https://colombiatours.travel/hoteles/cartagena/ejemplo/",
  "image": ["https://.../hotel-1.jpg", "https://.../hotel-2.jpg"],
  "priceRange": "$$$",
  "starRating": { "@type": "Rating", "ratingValue": "4" },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle 1 # 2-3",
    "addressLocality": "Cartagena",
    "addressRegion": "Bolívar",
    "postalCode": "130001",
    "addressCountry": "CO"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 10.4236, "longitude": -75.5519 },
  "telephone": "+57-300-000-0000",
  "checkinTime": "15:00",
  "checkoutTime": "12:00",
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "WiFi gratis", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Piscina", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Desayuno incluido", "value": true }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "128"
  }
}
```

### TouristTrip (Paquete) JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "Cartagena Mágica 5 Días",
  "description": "Paquete todo incluido con hotel boutique, tour a Islas del Rosario y city tour.",
  "url": "https://colombiatours.travel/paquetes/cartagena-magica-5-dias/",
  "image": "https://.../paquete-cartagena.jpg",
  "touristType": ["Familia", "Parejas"],
  "itinerary": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Día 1: Llegada y City Tour" },
      { "@type": "ListItem", "position": 2, "name": "Día 2: Islas del Rosario" },
      { "@type": "ListItem", "position": 3, "name": "Día 3: Centro Histórico + Gastronomía" }
    ]
  },
  "offers": {
    "@type": "Offer",
    "price": "1850000",
    "priceCurrency": "COP",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-04-01",
    "validThrough": "2026-12-31"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "42"
  }
}
```

## 9.3 Validación

- **Google Rich Results Test** — lo que Google realmente entiende.
- **Schema.org Validator** — validación estándar.
- **GSC → Enhancements** — errores reportados en producción.
- **Revisar trimestralmente** que schemas siguen vigentes (Google deprecia features cada tanto).

---

# 10. REVENUE ATTRIBUTION & CIERRE DE LOOP CON BUKEER BACKEND

**Objetivo:** dejar de reportar clicks y empezar a reportar **revenue atribuido a SEO por URL, keyword y cluster** — la ventaja única de operar sobre Bukeer Studio.

## 10.1 Modelo de datos necesario

**Fuentes:**
1. **GSC** → queries, pages, clicks, impressions, CTR, position.
2. **GA4 BigQuery export** → sessions, events, conversions por landing page y source/medium.
3. **Supabase (Bukeer backend)** → reservas con `booking_id`, `customer_id`, `package_id`, `hotel_id`, `amount`, `margin`, `created_at`, `source_url` (si se captura).

**Clave de join:** `session_id` o `booking_id` con parámetro UTM o `source_url` almacenado al momento de lead/reserva.

## 10.2 Pipeline sugerido

```
GSC API  ──┐
           ├──> BigQuery / DuckDB  ──> Modelo dbt  ──> Dashboard Looker/Metabase
GA4 BQ ────┤
           │
Supabase ──┘
```

**Tablas modelo:**
- `fct_organic_sessions` (session_id, date, landing_page, query_group, device, country)
- `fct_bookings` (booking_id, customer_id, amount, margin, product_type, created_at, session_id)
- `dim_landing_page_cluster` (landing_page, cluster, pillar, product_type)
- `dim_keyword_cluster` (query, cluster, intent, is_brand)

## 10.3 KPIs de revenue SEO

| KPI | Fórmula | Frecuencia |
|---|---|---|
| Organic Revenue (last-click) | Σ(bookings.amount) WHERE source = organic | Mensual |
| Organic Revenue (data-driven) | GA4 DDA attribution × booking revenue | Mensual |
| Revenue per Organic Session | Organic Revenue / Organic Sessions | Mensual |
| Revenue per Keyword Cluster | Σ(bookings linked to cluster landing pages) | Trimestral |
| Margin per Organic Session | Σ(bookings.margin) / Organic Sessions | Mensual |
| SEO ROI | (Organic Margin - SEO Cost) / SEO Cost | Trimestral |
| LTV of SEO-acquired customers | Cohort LTV de clientes con first touch orgánico | Semestral |
| Assisted Revenue (blog) | DDA attribution de sessions que incluyeron blog | Mensual |

## 10.4 Priorización con datos reales

Una vez cerrado el loop, la priorización cambia:

```
Prioridad_final = (Potential_additional_revenue × Effort_inverse × Margin_weight)
```

Donde `Potential_additional_revenue` se calcula proyectando:
- Keywords en striking distance → subida de posición → nuevo CTR → nuevo tráfico → **nuevo revenue** (usando revenue/session histórico del cluster).

Esto permite defender el budget SEO ante finance con números duros, no con "clicks".

## 10.5 Reporting mensual ejecutivo (1 página)

**Headline metrics:**
- Revenue SEO mes vs mes anterior vs año anterior.
- Margin SEO mes vs mes anterior vs año anterior.
- Top 10 URLs por revenue.
- Top 10 keyword clusters por revenue.
- Pipeline: keywords en striking distance × proyección de revenue adicional.

**Accionables del mes:**
- Top 5 optimizaciones ejecutadas y su impacto.
- Top 5 próximas optimizaciones priorizadas con proyección.

---

# 11. PLAYBOOK GENERAL — Quick Start para Usuarios de Bukeer Studio (No Técnicos)

**Nombre del flujo y objetivo:** `Quick Start SEO Bukeer (No Técnico)` — dejar el sitio configurado y monitoreado en pasos simples que un dueño de agencia travel puede ejecutar sin equipo SEO dedicado.

**Pre-requisitos mínimos:**
- Acceso a Search Console del sitio.
- Acceso a GA4 (o pedirlo al equipo técnico).
- Conocer el país objetivo de los clientes.
- 1 hora al mes de disciplina.

**Guía de inicio rápido (7 pasos, 45-60 min al mes):**

1. [TOOL: sites_health_check] → parámetros: `engine="google", siteUrl="<SITE_URL>"` → qué buscar: si el sitio está sano o con alertas críticas. **Si hay rojo, llamar al equipo técnico.**
2. [TOOL: sitemaps_list] → parámetros: `siteUrl="<SITE_URL>", engine="google"` → qué buscar: que el sitemap esté activo y sin errores.
3. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<HOME_URL>"` y 2 páginas clave → qué buscar: si móvil está en verde (Good). Si no, pedir mejoras al equipo técnico.
4. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=20` → qué buscar: páginas casi en primera página para optimizar primero. **Estas son las que más rápido dan resultado.**
5. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=300, limit=20` → qué buscar: páginas con muchas impresiones y pocos clics para mejorar título y descripción.
6. **Revisar top 5 money pages** (hoteles/actividades/paquetes que más venden):
   - ¿Título claro con precio desde y USP?
   - ¿Foto principal de calidad?
   - ¿CTA visible en móvil?
   - ¿Reviews visibles?
7. **Chequear revenue orgánico del mes** en GA4 o en Bukeer Studio → comparar vs mes anterior → anotar tendencia.

**Criterios de éxito / métricas objetivo:**
- Checklist mensual completo en menos de 1 hora.
- 5-10 páginas priorizadas cada mes con acciones claras.
- Tendencia positiva en clicks, CTR y **revenue orgánico** en 8-12 semanas.

**Tiempo estimado de ejecución:** 45-60 minutos al mes.

**Pitfalls comunes a evitar:**
- Querer optimizar todo al mismo tiempo.
- No esperar 4-8 semanas para medir cambios SEO (y 12-16 para link building).
- No llevar registro de qué se cambió y cuándo.
- Obsesionarse con posiciones y olvidar que lo que importa es revenue.

**Cuando escalar a equipo SEO profesional:**
- Cuando el sitio supere 10K sesiones orgánicas/mes.
- Cuando haya ≥ 2 mercados internacionales.
- Cuando el quick start deje de mover aguja (= techo del DIY).
- Cuando aparezcan competidores agresivos en el mercado.

---

## Anexos

### A1. Glosario rápido

- **BOFU / MOFU / TOFU** — Bottom / Middle / Top of Funnel.
- **CWV** — Core Web Vitals (LCP, CLS, INP).
- **DR / DA** — Domain Rating (Ahrefs) / Domain Authority (Moz).
- **E-E-A-T** — Experience, Expertise, Authoritativeness, Trustworthiness.
- **GEO** — Generative Engine Optimization (optimización para LLMs).
- **PAA** — People Also Ask.
- **SERP** — Search Engine Results Page.
- **Striking distance** — keywords en posiciones 8-20 con alto potencial de subida.

### A2. Checklist exprés pre-launch de cualquier página money

- ✅ Content Score ≥ 70.
- ✅ Schema validado para el template.
- ✅ CWV verde en mobile.
- ✅ Title y meta con CTR angle.
- ✅ H1 con keyword + modificador.
- ✅ Imagen principal optimizada < 200KB con alt.
- ✅ Internal links in (mínimo 3) y out (a money pages relacionadas).
- ✅ FAQ con schema si aplica.
- ✅ CTA visible above-the-fold en mobile.
- ✅ hreflang correcto si multi-mercado.
- ✅ `dateModified` y autor visibles.
- ✅ Inspeccionada en GSC y solicitada indexación.

### A3. Cadencia de reporting ejecutiva

| Reporte | Audiencia | Cadencia | Métricas clave |
|---|---|---|---|
| Daily alerts | SEO team | Diaria (auto) | Rank drops, CWV rojos, 404s con tráfico |
| Weekly sprint review | SEO team + Content | Semanal | Backlog progress, quick wins ejecutados |
| Monthly executive | C-level + Marketing | Mensual | Revenue SEO, top 10 URLs, tendencia OKRs |
| Quarterly business review | Board / Finance | Trimestral | SEO ROI, LTV, market share, roadmap |

---

**Documento v2.0 — Bukeer Studio SEO Playbook for Travel**
*Enterprise-grade SEO operations system · Para agencias SEO que operan sitios travel sobre Bukeer Studio*

---
