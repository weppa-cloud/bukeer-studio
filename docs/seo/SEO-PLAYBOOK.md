> **Estado**: Implementado — ver [SEO-IMPLEMENTATION.md](./SEO-IMPLEMENTATION.md) para referencia técnica completa.
> Última actualización: Abril 2026

---

# 1. FLUJO MAESTRO — Auditoría & Configuración General del Sitio
**Nombre del flujo y objetivo:** `Flujo Maestro SEO Travel` — auditar estado actual, detectar brechas de demanda/competencia y dejar un baseline accionable para crecer tráfico orgánico y leads.

**Pre-requisitos (datos/accesos):**
- `siteUrl` verificado en Google Search Console (dominio completo o prefijo URL).
- `propertyId` de GA4 y acceso de lectura.
- País objetivo del sitio (ej. Colombia, México, Perú) para `location_name`.
- Lista de URLs muestra por tipo de contenido: Hoteles, Actividades, Paquetes, Destinos, Blogs.
- Dominio propio + 3-5 competidores directos.

## Fase 1: Health Check inicial
**Objetivo:** confirmar integraciones, cobertura mínima y tendencia base antes de optimizar.

**Pasos (orden recomendado):**
1. [TOOL: diagnostics] → parámetros: ninguno → buscar: cuentas conectadas sin errores (Google/Bing/GA4) y latencia normal.
2. [TOOL: sites_list] → parámetros: `engine="google"` → buscar: propiedad correcta del sitio y variantes duplicadas (http/https, www/no-www).
3. [TOOL: sites_health_check] → parámetros: `engine="google", siteUrl="<SITE_URL>"` → buscar: estado general, alertas de caída y señales de cobertura.
4. [TOOL: analytics_performance_summary] → parámetros: `siteUrl="<SITE_URL>", days=28` → buscar: baseline de clicks, impressions, CTR y posición promedio.
5. [TOOL: growth_pulse] → parámetros: `timeframe="last_30_days"` → buscar: señales rápidas de crecimiento/caída en sesiones y conversiones orgánicas.

**Criterios de éxito / métricas objetivo:**
- Integraciones 100% operativas.
- Baseline documentado (28 días) para clicks, impressions, CTR, posición.
- 0 bloqueos críticos de acceso a datos.

**Tiempo estimado:** 30-45 minutos.

**Pitfalls comunes a evitar:**
- Analizar propiedad equivocada (`sc-domain` vs `https://`).
- Mezclar datos de brand y non-brand sin segmentar.
- Arrancar optimizaciones sin baseline trazable.

## Fase 2: Auditoría técnica SEO
**Objetivo:** detectar cuellos técnicos que limiten crawling, indexación y rankings.

**Pasos (orden recomendado):**
1. [TOOL: sitemaps_list] → parámetros: `siteUrl="<SITE_URL>", engine="google"` → buscar: sitemap(s) activos, fecha de último fetch, errores.
2. [TOOL: sitemaps_get] → parámetros: `siteUrl="<SITE_URL>", feedpath="<SITEMAP_URL>"` → buscar: URLs enviadas vs indexadas y tipo de contenido con peor cobertura.
3. [TOOL: inspection_batch] → parámetros: `siteUrl="<SITE_URL>", inspectionUrls=["<URL_HOTEL>","<URL_ACTIVIDAD>","<URL_PAQUETE>","<URL_DESTINO>","<URL_BLOG>"]` → buscar: estado de indexación, canonical seleccionada, bloqueos.
4. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_CRITICA>"` por cada template → buscar: LCP, CLS, INP en móvil y desktop.
5. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_CRITICA>", strategy="mobile"` → buscar: oportunidades de performance y SEO técnico.
6. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_CRITICA>"` → buscar: errores/advertencias en JSON-LD.
7. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", startDate="<YYYY-MM-DD>", endDate="<YYYY-MM-DD>", dimensions=["page"], limit=1000` → buscar: páginas con impresiones altas y CTR muy bajo (señal de snippet/canonical/meta-title).

**Criterios de éxito / métricas objetivo:**
- 95%+ de URLs estratégicas indexables.
- 0 errores críticos de sitemap/canonical/schema.
- Core Web Vitals: 75%+ de URLs en "Good" (móvil como prioridad).

**Tiempo estimado:** 2-3 horas.

**Pitfalls comunes a evitar:**
- Medir CWV solo en home y no en templates por tipo.
- Ignorar canonical mismatch entre páginas similares.
- Tener JSON-LD válido sintácticamente pero incoherente con contenido real.

## Fase 3: Análisis de demanda (keyword universe travel por país)
**Objetivo:** construir universo de keywords por intención (informacional, comercial, transaccional) y estacionalidad local.

**Pasos (orden recomendado):**
1. [TOOL: kw_data_google_ads_search_volume] → parámetros: `keywords=["viajes a","hoteles en","paquetes a","que hacer en"], location_name="<PAIS>", language_code="<IDIOMA>"` → buscar: volúmenes base y clusters iniciales.
2. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["hoteles en <ciudad>","paquetes a <destino>","tours en <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=200` → buscar: variantes long-tail y CPC/competencia.
3. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="viajar a <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=200` → buscar: entidades relacionadas útiles para hubs de contenido.
4. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_100_KEYWORDS>], language_code="<IDIOMA>"` → buscar: intención dominante y keywords ambiguas.
5. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["viajes a <destino>","temporada alta <destino>"], location_name="<PAIS>", type="web"` → buscar: picos estacionales para calendar editorial.

**Criterios de éxito / métricas objetivo:**
- Keyword universe priorizado por intención, volumen y estacionalidad.
- 1 mapa de clústeres por cada tipo de contenido (5 mapas).
- 20-50 oportunidades de "quick wins" detectadas.

**Tiempo estimado:** 2-4 horas.

**Pitfalls comunes a evitar:**
- Priorizar solo volumen y olvidar intención de compra.
- No separar búsquedas locales (`cerca de mí`, ciudad-país).
- Ignorar estacionalidad (vacaciones, festivos, clima).

## Fase 4: Análisis competitivo (rank, competidores, backlinks gap)
**Objetivo:** entender quién captura la demanda y dónde está el mayor gap atacable.

**Pasos (orden recomendado):**
1. [TOOL: dataforseo_labs_google_competitors_domain] → parámetros: `target="<DOMINIO>", location_name="<PAIS>", language_code="<IDIOMA>", limit=50` → buscar: competidores orgánicos reales por intersección de keywords.
2. [TOOL: dataforseo_labs_google_domain_intersection] → parámetros: `target1="<DOMINIO>", target2="<COMPETIDOR_1>", location_name="<PAIS>", language_code="<IDIOMA>", intersections=false, limit=200` → buscar: keywords del competidor donde tu dominio no rankea.
3. [TOOL: backlinks_summary] → parámetros: `target="<DOMINIO>"` → buscar: referring domains, backlinks totales y señales de autoridad.
4. [TOOL: backlinks_competitors] → parámetros: `target="<DOMINIO>", limit=50` → buscar: dominios competidores con mayor overlap de backlinks.
5. [TOOL: backlinks_domain_intersection] → parámetros: `targets=["<DOMINIO>","<COMPETIDOR_1>","<COMPETIDOR_2>"]` → buscar: dominios que enlazan a competidores y no enlazan a ti.
6. [TOOL: backlinks_referring_domains] → parámetros: `target="<DOMINIO>", limit=200` → buscar: calidad y relevancia temática de dominios enlazantes.

**Criterios de éxito / métricas objetivo:**
- Top 3 competidores priorizados por amenaza real.
- Lista de 50-100 keywords gap accionables.
- Lista de 30-50 dominios para outreach/link partnerships.

**Tiempo estimado:** 2-3 horas.

**Pitfalls comunes a evitar:**
- Compararte con OTAs globales no atacables en corto plazo.
- Copiar keywords sin validar intención/conversión para travel local.
- Buscar volumen sin evaluar dificultad y autoridad requerida.

## Fase 5: Configuración de baseline según hallazgos
**Objetivo:** traducir hallazgos en plan de ejecución priorizado y medible.

**Pasos (orden recomendado):**
1. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=100` → buscar: keywords con impresiones altas y ranking bajo optimizable.
2. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, limit=100` → buscar: consultas en posiciones 8-15 para empujar a top 5.
3. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=500` → buscar: snippets a reescribir (title/meta).
4. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", engine="google", days=28, minImpressions=50, limit=100` → buscar: queries con 2+ URLs compitiendo.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<ULTIMOS_28D>", period1End="<HOY>", period2Start="<28D_ANTERIORES>", period2End="<DIA_PREVIO>"` → buscar: tendencia para fijar baseline y metas realistas.

**Criterios de éxito / métricas objetivo:**
- Backlog priorizado P1/P2/P3 por impacto x esfuerzo.
- 100% de páginas objetivo con owner, fecha y KPI.
- Meta 90 días por tipo: clicks, CTR, top 10 keywords, leads orgánicos.

**Tiempo estimado:** 1.5-2 horas.

**Pitfalls comunes a evitar:**
- No separar quick wins (P1) de apuestas estructurales (P2/P3).
- Medir solo tráfico y no conversiones.
- Cambiar demasiadas variables a la vez sin control.

**Entregable: scorecard con métricas a mejorar + prioridades P1/P2/P3**

| KPI | Baseline | Meta 90 días | Prioridad | Tipo de acción |
|---|---:|---:|---|---|
| Clicks orgánicos total | `<valor>` | `+30-50%` | P1 | Optimización de URLs en striking distance |
| CTR orgánico promedio | `<valor>` | `+1.5-3 pp` | P1 | Reescritura title/meta en top impresiones |
| Keywords en Top 10 | `<valor>` | `+25%` | P1 | Clusters transaccionales y enlaces internos |
| URLs válidas con CWV "Good" | `<valor>` | `>=75%` | P2 | Performance móvil por templates |
| Errores de indexación críticos | `<valor>` | `0` | P1 | Canonical, sitemap, inspección |
| Referring domains relevantes | `<valor>` | `+20-40` | P3 | Link gap outreach travel partners |
| Leads orgánicos (GA4) | `<valor>` | `+20-35%` | P1 | Mejora de landings transaccionales |

# 2. FLUJO DE ESTRATEGIA — Análisis Continuo & OKRs SEO
**Nombre del flujo y objetivo:** `Ciclo SEO Continuo 30/90` — operar SEO como sistema recurrente mensual y revisión estratégica trimestral.

**Pre-requisitos (datos/accesos):**
- Baseline de la Sección 1 completado.
- Mapeo URL -> tipo de contenido.
- Eventos de conversión definidos en GA4 (`lead_submit`, `whatsapp_click`, `booking_start`, etc.).

**Cadencia operativa:**
- Mensual: ejecución completa de monitoreo, alertas y priorización.
- Trimestral: recalibración de OKRs, universo de keywords y benchmark competitivo.

**Métricas a monitorear por tipo de contenido (mensual):**

| Tipo | Métricas GSC | Métricas GA4 | Meta sugerida |
|---|---|---|---|
| Hoteles | clicks, CTR, posición por URL/query | sesiones orgánicas, tasa de lead | subir CTR y leads locales |
| Actividades | clicks por query transaccional | eventos de contacto/reserva | crecer long-tail "qué hacer + precio" |
| Paquetes | impresiones/clicks en términos comerciales | embudo de conversión y revenue | mover keywords 8-15 a top 5 |
| Destinos | cobertura y tendencia estacional | engagement y navegación a money pages | sostener tráfico en low season |
| Blogs | crecimiento non-brand y top queries | engaged sessions, assisted conversions | alimentar TOFU hacia páginas comerciales |

**Pasos numerados (flujo mensual):**
1. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], startDate="<MES_INICIO>", endDate="<MES_FIN>", limit=5000` → buscar: variación por URL y query en cada tipo.
2. [TOOL: get_report_data] → parámetros: `startDate="<MES_INICIO>", endDate="<MES_FIN>", dimensions=["landingPage","sessionDefaultChannelGroup"], metrics=["sessions","engagementRate","conversions","totalRevenue"]` → buscar: rendimiento orgánico y calidad de sesión.
3. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=50, limit=100` → buscar: queries con múltiples URLs del mismo tipo compitiendo.
4. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: URLs cercanas a primera página (posiciones 8-15).
5. [TOOL: seo_lost_queries] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: pérdidas severas para re-optimización urgente.
6. [TOOL: analytics_trends] → parámetros: `siteUrl="<SITE_URL>", dimension="query", days=56, minClicks=100, threshold=10` → buscar: queries al alza/caída para sprint del mes.
7. [TOOL: get_growth_metrics] → parámetros: `startDate="<MES_INICIO>", endDate="<MES_FIN>", compareWith="previous_period"` → buscar: progreso contra periodo previo y contra OKR.
8. [TOOL: dataforseo_labs_google_competitors_domain] → parámetros: `target="<DOMINIO>", location_name="<PAIS>", language_code="<IDIOMA>", limit=20` (trimestral) → buscar: nuevos competidores/amenazas.

**Cómo priorizar qué páginas optimizar primero (scoring):**
- `Impacto potencial = (Impressions * CTR_gap * Intento_comercial)`.
- `Facilidad = (Posición entre 8-20) + (URL ya indexada) + (autoridad interna alta)`.
- `Prioridad final = Impacto potencial * Facilidad`.
- Ejecutar primero top 20 URLs con score más alto.

**Criterios de éxito / métricas objetivo:**
- Cumplimiento mensual de SLA SEO (monitoreo + backlog + ejecución).
- 70%+ de acciones enfocadas en páginas con potencial de negocio.
- Mejora consistente de clicks, CTR y conversiones orgánicas mes contra mes.

**Tiempo estimado:** mensual 3-4 horas; trimestral 5-6 horas.

**Pitfalls comunes a evitar:**
- Revisar solo promedio global y no por tipo de contenido.
- Perseguir vanity metrics sin impacto en leads.
- Ignorar señales de canibalización hasta que caiga tráfico.

# 3. FLUJOS INDIVIDUALES POR TIPO DE CONTENIDO
### Hoteles: Flujo A — Research & Priorización
**Nombre del flujo y objetivo:** `Hotel Demand Capture` — detectar keywords de intención de reserva y priorizar URLs hoteleras con mayor potencial.

**Pre-requisitos:** inventario de páginas de hoteles activas, ciudades objetivo, país/idioma del sitio.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["hotel en <ciudad>","hoteles baratos en <ciudad>","hotel boutique <ciudad>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=200` → buscar: volumen, CPC, competencia, variantes transaccionales.
2. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_HOTEL_KEYWORDS>], language_code="<IDIOMA>"` → buscar: intención comercial/transactional dominante.
3. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], filters=[{"dimension":"page","operator":"contains","expression":"/hoteles/"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: URLs hoteleras con impresiones altas y posición 8-20.
4. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: consultas hoteleras casi en página 1.
5. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=300` → buscar: snippets hoteleros con baja tasa de clic.

**Criterios de éxito / métricas objetivo:** top 15 URLs de hoteles priorizadas con keyword principal, secundaria y objetivo de CTR/posición.

**Tiempo estimado:** 60-90 minutos.

**Pitfalls comunes a evitar:** agrupar todos los hoteles bajo una sola intención; ignorar modificadores locales (`centro`, `todo incluido`, `familiar`).

### Hoteles: Flujo B — Optimización de Página Individual
**Nombre del flujo y objetivo:** `Hotel Page Lift` — mejorar visibilidad y conversión de una URL hotelera específica.

**Pre-requisitos:** URL objetivo, keyword principal, acceso a edición en Bukeer Studio.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_HOTEL>"` → buscar: indexación, canonical seleccionada y cobertura.
2. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_HOTEL>", strategy="mobile"` → buscar: bloqueadores de LCP/INP.
3. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_HOTEL>"` → buscar: errores de `Hotel`/`LodgingBusiness` JSON-LD.
4. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_HOTEL>"}], startDate="<ULTIMOS_28D>", endDate="<HOY>"` → buscar: queries reales para reescribir `title`, `meta description`, H1, FAQs.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: delta de clicks/CTR/posición tras cambios.

**Criterios de éxito / métricas objetivo:** +20% clicks orgánicos y +1.5 pp CTR en 4-8 semanas.

**Tiempo estimado:** 45-75 minutos por URL.

**Pitfalls comunes a evitar:** cambiar title/meta sin alinear contenido visible; no incluir señales de confianza (precio, ubicación, amenities).

### Actividades: Flujo A — Research & Priorización
**Nombre del flujo y objetivo:** `Activity Intent Mining` — identificar oportunidades "qué hacer", tours y experiencias con intención de compra.

**Pre-requisitos:** catálogo de actividades, destinos activos y temporada (alta/baja/lluvias).

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="que hacer en <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: ideas de actividades por subtema.
2. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["tour <destino>","excursiones <destino>","actividades <destino>"], location_name="<PAIS>", type="web"` → buscar: meses pico por actividad.
3. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["tour en <destino>","actividad en <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=200` → buscar: long-tail con intención transaccional.
4. [TOOL: analytics_top_queries] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=250, sortBy="impressions"` → buscar: queries de actividades con potencial sin página dedicada fuerte.
5. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=100, limit=100` → buscar: quick wins de actividades.

**Criterios de éxito / métricas objetivo:** backlog de 20 páginas de actividades (nuevas/optimizar) con prioridad alta-media-baja.

**Tiempo estimado:** 60-90 minutos.

**Pitfalls comunes a evitar:** no separar actividades por perfil de viajero (familias, aventura, parejas); ignorar restricciones estacionales.

### Actividades: Flujo B — Optimización de Página Individual
**Nombre del flujo y objetivo:** `Activity Page Conversion Boost` — aumentar CTR y acciones de contacto/reserva en una página de actividad.

**Pre-requisitos:** URL de actividad, CTA definido, eventos GA4 configurados.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_ACTIVIDAD>"` → buscar: indexación y canonical.
2. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_ACTIVIDAD>"` → buscar: estado CWV en móvil.
3. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_ACTIVIDAD>"` → buscar: validez de `TouristAttraction` o `Product` + `Offer`.
4. [TOOL: get_report_data] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", dimensions=["landingPage"], metrics=["sessions","engagementRate","conversions"]` → buscar: engagement y conversiones de la URL.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: impacto SEO posterior.

**Criterios de éxito / métricas objetivo:** +15% CTR orgánico y +10% conversiones asistidas en 30-60 días.

**Tiempo estimado:** 45-60 minutos por URL.

**Pitfalls comunes a evitar:** no mostrar precio/rango; contenido genérico sin itinerario, duración ni "incluye/no incluye".

### Paquetes: Flujo A — Research & Priorización
**Nombre del flujo y objetivo:** `Package Revenue SEO` — priorizar páginas de paquetes con mayor potencial de ingresos.

**Pre-requisitos:** slug público por paquete, inventario vigente, destinos/temporadas y margen comercial.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["paquetes a <destino>","viaje todo incluido <destino>","paquete <destino> <temporada>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=250` → buscar: keywords comerciales con intención alta.
2. [TOOL: dataforseo_labs_google_domain_intersection] → parámetros: `target1="<DOMINIO>", target2="<COMPETIDOR_PAQUETES>", location_name="<PAIS>", language_code="<IDIOMA>", intersections=false, limit=200` → buscar: oportunidades donde competidor rankea y tú no.
3. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["page","query"], filters=[{"dimension":"page","operator":"contains","expression":"/packages/"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: paquetes con alta impresión y baja posición.
4. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=100` → buscar: páginas de paquetes en posiciones 8-15.
5. [TOOL: get_growth_metrics] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", compareWith="previous_period"` → buscar: páginas de paquetes que ya muestran tracción.

**Criterios de éxito / métricas objetivo:** top 10 paquetes priorizados por potencial de ingreso orgánico.

**Tiempo estimado:** 75-120 minutos.

**Pitfalls comunes a evitar:** optimizar paquetes sin URL indexable estable; no alinear keyword con moneda/mercado objetivo.

### Paquetes: Flujo B — Optimización de Página Individual
**Nombre del flujo y objetivo:** `Package Page Monetization` — optimizar una landing de paquete para captar tráfico y convertir.

**Pre-requisitos:** URL pública del paquete, pricing visible y estructura de oferta clara.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_PAQUETE>"` → buscar: indexación y canonical correcta.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_PAQUETE>"` → buscar: `Product` + `Offer` + `AggregateRating` (si aplica) sin errores.
3. [TOOL: pagespeed_analyze] → parámetros: `url="<URL_PAQUETE>", strategy="mobile"` → buscar: mejoras de LCP e interactividad en módulos de precio/CTA.
4. [TOOL: analyze_funnel] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", steps=[{"name":"Landing","pagePath":"<PATH_PAQUETE>"},{"name":"Contacto","eventName":"lead_submit"},{"name":"Inicio Reserva","eventName":"booking_start"}]` → buscar: drop-offs por etapa.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: mejora SEO + conversión.

**Criterios de éxito / métricas objetivo:** +20% clicks orgánicos, +10% tasa de inicio de reserva en 6-8 semanas.

**Tiempo estimado:** 60-90 minutos por URL.

**Pitfalls comunes a evitar:** páginas de paquete sin diferenciadores claros; CTA sin fricción reducida para móvil.

### Destinos: Flujo A — Research & Priorización
**Nombre del flujo y objetivo:** `Destination Authority Builder` — priorizar páginas destino para dominar intención informacional-comercial.

**Pre-requisitos:** listado de destinos core, mapa de hubs y subpáginas disponibles.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["viajar a <destino>","guia de <destino>","mejor epoca para viajar a <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: clúster TOFU/MOFU.
2. [TOOL: kw_data_google_trends_explore] → parámetros: `keywords=["clima <destino>","temporada <destino>","viaje <destino>"], location_name="<PAIS>", type="web"` → buscar: estacionalidad para calendario de actualización.
3. [TOOL: dataforseo_labs_search_intent] → parámetros: `keywords=[<TOP_DESTINO_KEYWORDS>], language_code="<IDIOMA>"` → buscar: split informacional vs comercial.
4. [TOOL: analytics_top_pages] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=200, sortBy="impressions"` → buscar: páginas destino con alta visibilidad y margen de CTR.
5. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=500, limit=100` → buscar: destinos con snippet poco competitivo.

**Criterios de éxito / métricas objetivo:** plan de contenidos por destino con prioridad basada en estacionalidad + intención + gap.

**Tiempo estimado:** 60-90 minutos.

**Pitfalls comunes a evitar:** tratar destinos como páginas estáticas; no actualizar contenido por temporada/eventos.

### Destinos: Flujo B — Optimización de Página Individual
**Nombre del flujo y objetivo:** `Destination Page Topical Depth` — convertir una URL de destino en hub de autoridad y tráfico cualificado.

**Pre-requisitos:** URL destino, clusters secundarios y enlaces a Hoteles/Actividades/Paquetes relacionados.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_DESTINO>"` → buscar: indexación y canonical.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_DESTINO>"` → buscar: validez de `TouristDestination`, `FAQPage`, `BreadcrumbList`.
3. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_DESTINO>"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: queries faltantes para enriquecer secciones.
4. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<URL_DESTINO>"` → buscar: CWV en móvil para evitar pérdida de ranking.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: mejora de visibilidad y CTR.

**Criterios de éxito / métricas objetivo:** +25% clicks non-brand a la URL y +15% clics internos hacia páginas transaccionales.

**Tiempo estimado:** 45-75 minutos por URL.

**Pitfalls comunes a evitar:** no enlazar a money pages; contenido enciclopédico sin intención de viaje real.

### Blogs: Flujo A — Research & Priorización
**Nombre del flujo y objetivo:** `Blog-to-Booking Pipeline` — usar blog para capturar demanda informacional y derivar tráfico a páginas de negocio.

**Pre-requisitos:** categorías de blog, destinos comerciales prioritarios y mapa de enlaces internos.

**Pasos numerados:**
1. [TOOL: dataforseo_labs_google_related_keywords] → parámetros: `keyword="guia de viaje <destino>", location_name="<PAIS>", language_code="<IDIOMA>", limit=300` → buscar: temas informacionales con volumen sostenido.
2. [TOOL: dataforseo_labs_google_keyword_ideas] → parámetros: `keywords=["que hacer en <destino>","itinerario <destino> 3 dias","costo viaje <destino>"], location_name="<PAIS>", language_code="<IDIOMA>", limit=250` → buscar: oportunidades TOFU/MOFU.
3. [TOOL: analytics_top_queries] → parámetros: `siteUrl="<SITE_URL>", days=56, limit=500, sortBy="impressions"` → buscar: queries informacionales sin artículo específico o con canibalización.
4. [TOOL: seo_cannibalization] → parámetros: `siteUrl="<SITE_URL>", days=56, minImpressions=30, limit=100` → buscar: posts compitiendo por la misma intención.
5. [TOOL: seo_low_hanging_fruit] → parámetros: `siteUrl="<SITE_URL>", days=56, minImpressions=200, limit=100` → buscar: posts con potencial rápido de subida.

**Criterios de éxito / métricas objetivo:** backlog de 30 temas de blog priorizados por potencial de tráfico y traspaso a landings comerciales.

**Tiempo estimado:** 60-90 minutos.

**Pitfalls comunes a evitar:** producir contenidos sin puente a conversión; no actualizar artículos evergreen.

### Blogs: Flujo B — Optimización de Página Individual
**Nombre del flujo y objetivo:** `Blog Post SEO Upgrade` — mejorar ranking de un artículo y su capacidad de enviar tráfico a páginas de negocio.

**Pre-requisitos:** URL del post, keyword objetivo, enlaces internos de salida definidos.

**Pasos numerados:**
1. [TOOL: inspection_inspect] → parámetros: `siteUrl="<SITE_URL>", inspectionUrl="<URL_BLOG>"` → buscar: indexación y canonical.
2. [TOOL: schema_validate] → parámetros: `type="url", data="<URL_BLOG>"` → buscar: validez de `Article`/`BlogPosting`.
3. [TOOL: analytics_query] → parámetros: `siteUrl="<SITE_URL>", dimensions=["query"], filters=[{"dimension":"page","operator":"equals","expression":"<URL_BLOG>"}], startDate="<ULTIMOS_90D>", endDate="<HOY>"` → buscar: keywords secundarias para H2/FAQs.
4. [TOOL: get_report_data] → parámetros: `startDate="<ULTIMOS_28D>", endDate="<HOY>", dimensions=["landingPage"], metrics=["sessions","engagementRate","conversions"]` → buscar: retención y conversiones asistidas por el post.
5. [TOOL: analytics_compare_periods] → parámetros: `siteUrl="<SITE_URL>", period1Start="<POST_28D>", period1End="<POST_FIN>", period2Start="<PRE_28D>", period2End="<PRE_FIN>"` → buscar: impacto de refresh (tráfico + CTR + posición).

**Criterios de éxito / métricas objetivo:** +20% tráfico orgánico del post y +10% clics internos hacia Hoteles/Paquetes/Actividades.

**Tiempo estimado:** 45-60 minutos por post.

**Pitfalls comunes a evitar:** sobreoptimizar keywords y perder legibilidad; no incluir CTAs contextuales.

# 4. PLAYBOOK GENERAL — Para Cualquier Usuario de Bukeer Studio
**Nombre del flujo y objetivo:** `Quick Start SEO Bukeer (No Técnico)` — dejar el sitio configurado y monitoreado en 5 pasos simples.

**Pre-requisitos (mínimos):**
- Tener acceso a Search Console del sitio.
- Tener acceso a GA4 (o pedirlo a tu equipo).
- Conocer el país objetivo de tus clientes.

**Guía de inicio rápido (5 pasos):**
1. [TOOL: sites_health_check] → parámetros: `engine="google", siteUrl="<SITE_URL>"` → qué buscar: si el sitio está sano o con alertas críticas.
2. [TOOL: sitemaps_list] → parámetros: `siteUrl="<SITE_URL>", engine="google"` → qué buscar: que el sitemap esté activo y sin errores.
3. [TOOL: pagespeed_core_web_vitals] → parámetros: `url="<HOME_URL>"` y 2 páginas clave → qué buscar: si móvil está en verde (Good).
4. [TOOL: seo_striking_distance] → parámetros: `siteUrl="<SITE_URL>", days=28, limit=20` → qué buscar: páginas casi en primera página para optimizar primero.
5. [TOOL: seo_low_ctr_opportunities] → parámetros: `siteUrl="<SITE_URL>", days=28, minImpressions=300, limit=20` → qué buscar: páginas con muchas impresiones y pocos clics para mejorar título y descripción.

**Criterios de éxito / métricas objetivo:**
- Checklist mensual completo en menos de 1 hora.
- 5-10 páginas priorizadas cada mes con acciones claras.
- Tendencia positiva en clicks y CTR en 8-12 semanas.

**Tiempo estimado de ejecución:** 45-60 minutos al mes.

**Pitfalls comunes a evitar:**
- Querer optimizar todo al mismo tiempo.
- No esperar 2-6 semanas para medir cambios SEO.
- No llevar registro de qué se cambió y cuándo.

---
