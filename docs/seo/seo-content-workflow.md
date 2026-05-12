---
name: seo-content-workflow
display_name: "SEO Content Workflow Profesional — ColombiaTours"
description: "Workflow completo para crear contenido SEO que Google premia. Usa DataForSEO + Google Ads + EEAT. NO es traducción genérica — es contenido posicionable con intención de búsqueda."
tags: [bukeer, colombiatours, seo, content, transcreation, eeat]
---

# SEO Content Workflow Profesional

## Filosofia

Google premia contenido con **experiencia real**, penaliza el contenido generico generado en masa.

Para ColombiaTours: **"Colombia como la cuenta quien la camina"** no es un tagline — es la estrategia de contenido.

## Ciclo Completo: Creacion + Edicion + Transcreacion

```
ES-EXISTENTE ──→ EDITAR (estabilizar voz, mejorar EEAT, optimizar SEO)
                      │
                      ▼
               ES-ESTABLE ──→ CREAR NUEVO (si hay gap)
                      │
                      ▼
         BRIEF POR LOCALE (DE/FR/PT/EN)
                      │
                      ▼
              TRANSCREAR (NO traducir)
                      │
                      ▼
              PUBLICAR + VERIFICAR
                      │
                      ▼
              MEDIR + ITERAR
```

**Editar lo que existe es TAN importante como crear nuevo.** Un blog mal escrito en espanol va a producir una traduccion igual de mala.

## Pipeline Completo (6 Fases)

```
Fase 0 — Competitive Analysis (DataForSEO competitors domain + GSC)
         ↓
Fase 1 — Keyword Research (DataForSEO + Google Ads)
         ↓
Fase 2 — Content Brief (SERP analysis + gap detection + brand voice)
         ↓
Fase 3 — EDICION: Estabilizar contenido ES existente
         ├── Revisar tono vs Brand Voice Reference
         ├── Mejorar EEAT (autor, fuentes, experiencia)
         ├── Optimizar SEO metadata
         └── Verificar competencia cubierta
         ↓
Fase 3B — CREACION: Nuevo contenido (si hay gap)
         ├── Redaccion con tono ColombiaTours + EEAT
         └── SEO metadata desde el brief
         ↓
Fase 4 — Transcreacion por locale (DE/FR/PT/EN)
         ├── Brief locale-specific con keywords del mercado
         ├── Transcrear con tono del locale
         ├── Glossary enforcement
         └── EEAT adaptado al mercado target
         ↓
Fase 5 — Publicacion + Verificacion (14 checks, sitemap, hreflang)
         ↓
Fase 6 — Medicion + Iteracion (GSC, GA4, re-optimizacion dia 30, re-evaluar competencia)
```

---

## Fase 0 — Competitive Analysis

**Propósito:** Entender qué está haciendo la competencia para identificar gaps y oportunidades. Esto informa TODO lo demás.

### Proceso

```
1. Identificar competidores reales
   - Buscadores orgánicos: sitios que rankean para nuestras keywords target
   - DataForSEO: /v3/dataforseo_labs/competitors_domain/live
   Input: colombiatours.travel
   Output: top 20 dominios competidores con solapamiento de keywords

2. Analizar contenido de competidores
   - DataForSEO SERP: qué páginas rankean para cada keyword
   - Extraer: tipo de contenido, longitud, estructura, tono
   - Identificar: qué cubren bien, qué NO cubren (nuestro gap)

3. Gap Analysis Matrix

| Keyword | Competidores | Lo que cubren | GAP (nuestra oportunidad) |
|---------|-------------|---------------|--------------------------|
| "viaje a colombia" | SitioA, SitioB | Info general | No cubren presupuesto real |
| "cartagena tours" | SitioC, SitioD | Tours genéricos | No cubren experiencias locales |

4. Brand Voice Differentiation
   - ¿Cómo hablan los competidores? (formales, fríos, genéricos)
   - ¿Cómo vamos a sonar DIFERENTE? (cálidos, locales, auténticos)
   - Esto se traduce al brief de cada contenido

5. GSC Cross-Reference
   - ¿Qué queries nos están trayendo tráfico? (GSC MCP)
   - ¿Qué queries tienen nuestros competidores que nosotros no?
   - DataForSEO: domains_by_keyword para ver solapamiento

### Output
- Matriz de competidores por cluster
- Gaps de contenido priorizados por volumen de búsqueda
- Diferenciación de voz vs competencia
```

---

## Fase 3 — EDICIÓN: Estabilizar Contenido ES Existente

**Propósito:** Antes de traducir NADA, el contenido en español debe ser sólido. Un blog malo × 4 idiomas = 4 blogs malos.

### Gate de entrada
Solo se edita contenido que tiene tráfico GSC o potencial DataForSEO. No se pierde tiempo en contenido muerto.

### Proceso por pieza

```
1. Evaluación inicial
   - Leer contenido actual
   - Puntuar en 3 ejes:
     Tono:   1 (plantilla SEO) → 5 (voz ColombiaTours)
     EEAT:  1 (sin fuentes) → 5 (experto local)
     SEO:   1 (sin metadata) → 5 (optimizado)

2. Si puntuación < 3 en cualquier eje → EDITAR

3. Edición de tono (vs Brand Voice Reference)
   - Cambiar tercera persona → "tú" / "nosotros" donde corresponda
   - Añadir experiencias reales: "cuando visitamos Bocagrande..."
   - Eliminar jerga de negocio: "el funnel", "la iteracion"
   - Añadir cultural references: comida, música, gente
   - Reescribir CTAs genéricas → CTAS de viaje real

4. Edición de EEAT
   - Añadir autor con bio de experiencia local
   - Añadir fuentes: datos de turismo Colombia, guías locales
   - Incluir anécdotas o detalles que solo alguien que ha ido sabe
   - Enlazar a contenido relacionado del sitio

5. Edición de SEO
   - Verificar/completar: meta_title, meta_description, h1, keywords
   - Añadir internal links (mínimo 3 a contenido relacionado)
   - Verificar structured data
   - Optimizar imágenes con alt text

6. Brand Voice Consistency Check
   - ¿Suena a ColombiaTours o a cualquier sitio?
   - Frase de prueba: si le quitas el logo, ¿se sabe que es ColombiaTours?
```

### Checklist de Edición

```
TONO
☐ Usa "tú" o "usted" consistentemente según la página
☐ Incluye al menos 1 experiencia/anécdota real
☐ Elimina jerga de negocio/SEO
☐ Las CTAs suenan a viaje, no a formulario

EEAT
☐ Autor visible con bio de expertise local
☐ Fuentes citadas (datos, guías, referencias)
☐ Detalles específicos del destino (no genéricos)
☐ Enlaces a contenido relacionado del sitio

SEO
☐ Meta title ≤60 chars con keyword
☐ Meta description ≤160 chars con keyword + CTA
☐ H1 único y descriptivo
☐ Keywords distribuidas naturalmente
☐ Internal links: mínimo 3
☐ Alt text en imágenes

VOZ
☐ Frase de prueba superada
☐ Consistente con Brand Voice Reference
```

### Anti-patrones de Edición

| ❌ No hacer | Por qué |
|------------|---------|
| Solo cambiar palabras sin reestructurar | No mejora el valor real |
| Añadir keywords sin contexto | Google lo detecta como stuffing |
| Traducir primero, editar después | Multiplicas el error × 4 |
| Editar sin ver DataForSEO primero | Puedes mejorar algo que nadie busca |
| Ignorar competencia | Puedes estar haciendo lo mismo que ellos |

### Input
Clusters de contenido ColombiaTours: `colombia-travel`, `cartagena`, `medellin`, `eje-cafetero`, `santa-marta`, `san-andres`, `actividades`, `blogs-generic`

### Proceso por cluster

```
1. Seed keywords → DataForSEO Keywords for Keywords
   GET /v3/keywords_data/google/keywords_for_keywords/live
   → 200+ keywords con volume, cpc, difficulty

2. SERP analysis → DataForSEO SERP organic
   GET /v3/serp/google/organic/live/advanced
   → Tipo de contenido que rankea, gaps

3. Intent classification:
   - INFORMATIONAL → blog post / guía
   - COMMERCIAL → comparativa + package
   - TRANSACTIONAL → landing page de producto
   - NAVIGATIONAL → nuestra página

4. Gap analysis → DataForSEO competitors domain
   GET /v3/dataforseo_labs/competitors_domain/live
   → Keywords que tienen competidores y nosotros no

5. Google Ads validation → Google Ads MCP
   mcp_google_ads_keyword_opportunities()
   → Volumen real + competencia pagada

6. Priority scoring
   Score = (Volume × Intent_Value) / Difficulty
   P0: score > 50 → crear YA
   P1: score 20-50 → crear pronto
   P2: score < 20 → backlog
```

---

## Fase 2 — Content Brief

**Antes de escribir, se genera un brief.** Este es el paso más importante.

### Brief Template

```yaml
keyword_principal: ""
keyword_secondary: []
target_locale: "es-CO"  # o DE/FR/PT/EN
intent: "informational|commercial|transactional"

# SERP Analysis
top_10_types: ["guide", "listicle", "product", "video"]
people_also_ask:
  - "pregunta 1"
  - "pregunta 2"
gaps:
  - "qué NO cubren los competidores"

# EEAT Signals
author: "Guía local ColombiaTours"
experience_evidence: "fotos reales, anécdotas, datos locales"
sources: ["link a fuente local", "estadística de turismo"]

# Structure
h1: ""
h2s:
  - "Sección 1"
  - "Sección 2"
cta: "Tipo de CTA (whatsapp, ver paquetes, cotizar)"
internal_links: ["url1", "url2"]

# SEO Metadata
meta_title: ""  # ≤60 chars, keyword al inicio
meta_description: ""  # ≤160 chars, incluye keyword + CTA
slug: ""  # /{locale}/{keyword-slug}
```

### Herramientas para generar el brief
- DataForSEO SERP → extraer People Also Ask + top 10 structure
- DataForSEO OnPage → analizar páginas de competidores
- Google Ads MCP → validar intención de búsqueda

---

## Fase 3 — Redacción con EEAT

### EEAT Checklist por pieza

```
EXPERIENCE (Experiencia directa)
☐ ¿El contenido refleja haber estado en el destino?
☐ ¿Hay detalles que solo alguien que ha ido sabe?
☐ ¿Incluye recomendaciones específicas (dónde comer, cómo moverse)?
☐ ¿Las fotos son reales o genéricas?

EXPERTISE (Conocimiento experto)
☐ ¿El autor tiene bio con expertise local?
☐ ¿Los datos son precisos y actualizados?
☐ ¿Hay referencias a fuentes colombianas locales?

AUTHORITATIVENESS (Autoridad)
☐ ¿El contenido enlaza a otras páginas del sitio que refuerzan el tema?
☐ ¿Hay menciones de ColombiaTours como operador con experiencia?
☐ ¿El tono es de autoridad sin ser arrogante?

TRUSTWORTHINESS (Confiabilidad)
☐ ¿La información de contacto es clara?
☐ ¿Las políticas (cancelación, reservas) son transparentes?
☐ ¿Hay testimonios o casos reales?
```

### Google's Self-Assessment Questions

```
ANTES DE PUBLICAR, responder:
1. ¿Provee información original? (no copia de otros blogs)
2. ¿Es completa y sustancial? (no 300 palabras genéricas)
3. ¿Tiene análisis más allá de lo obvio?
4. ¿El título describe exactamente el contenido?
5. ¿Es bookmarkeable? ¿la recomendarías a un amigo?
6. ¿Tendría cabida en una revista impresa de viajes?
```

---

## Fase 4 — Publicación + Verificación

### Technical SEO Checklist

```
☐ Title: ≤60 chars, keyword principal al inicio
☐ Meta description: ≤160 chars, keyword + CTA
☐ H1: único, descriptivo, keyword incluida
☐ URL: /{locale}/{keyword-slug}
☐ Imágenes: alt text descriptivo con keywords secundarias
☐ Internal links: mínimo 3 a contenido relacionado del sitio
☐ Structured data: Article, BreadcrumbList, FAQPage (si aplica)
☐ Open Graph: title, description, image para redes sociales
```

### Post-Publish Verification (14 checks — ver #508)

```bash
# Ejecutar verificación
npx tsx scripts/seo/verify-transcreated-urls.ts --batch=batch1

# Checks críticos:
# - HTTP 200 ✅
# - html lang correcto ✅
# - Canonical self ✅
# - Hreflang recíproco ✅
# - No robots noindex ✅
# - Title correcto ✅
# - Body language correcto ✅
```

---

## Fase 5 — Medición e Iteración

### Timeline

```
Semana 1: Publicar
Semana 2-4: Monitorear GSC
  - ¿Aparece en búsquedas? (impresiones)
  - ¿La gente hace clic? (CTR)
  - ¿En qué posición? (avg position)

Día 30: Primera iteración
  - Actualizar con nueva data
  - Añadir secciones basadas en preguntas reales de usuarios
  - Mejorar CTAs si no hay conversiones

Mes 3: Evaluación completa
  - ¿El contenido generó consultas? (metas de negocio)
  - ¿Se posicionó para las keywords target?
  - ¿Hay nuevos gaps que cubrir?
```

### Herramientas de Medición

| Herramienta | Qué medir | Frecuencia |
|-------------|-----------|------------|
| GSC MCP | Queries, impresiones, clicks, CTR, posición | Semanal |
| GA4 MCP | Tráfico orgánico por página, tasa de rebote | Semanal |
| DataForSEO | Re-evaluar difficulty de keywords | Mensual |
| Google Ads MCP | Keywords que están convirtiendo en paid | Mensual |

---

## Anti-Patrones (NO HACER)

| ❌ Anti-patrón | Por qué | ✅ Alternativa |
|---------------|---------|---------------|
| Traducir 736 activities en batch sin revisión | Scaled content penalty | Top 100 con DataForSEO, resto con rate limits |
| Publicar +50 piezas por semana | AI content farm signal | Batch de 5-10/semana con verificación |
| Copiar estructura SERP exacta | No aporta valor | Usar SERP para gaps, no para clonar |
| Keyword stuffing en traducciones | Penalización directa | Keywords naturales, priorizar legibilidad |
| Ignorar EEAT en locales | Google descarta sin señales de autoridad | Autor locale + fuentes locales + evidencia |

---

## Tools Integration

### DataForSEO (keyword research)
```python
# Keywords for a seed
curl -X POST "https://api.dataforseo.com/v3/keywords_data/google/keywords_for_keywords/live" \
  -H "Authorization: Basic $(echo -n '$LOGIN:$PASSWORD' | base64)" \
  -d '[{"keywords":["colombia travel packages"],"location_code":2840,"language_code":"en","limit":200}]'

# SERP analysis
curl -X POST "https://api.dataforseo.com/v3/serp/google/organic/live/advanced" \
  -H "Authorization: Basic $(echo -n '$LOGIN:$PASSWORD' | base64)" \
  -d '[{"url":"https://colombiatours.travel/","language_code":"en","location_code":2840}]'
```

### Google Ads MCP (keyword validation)
```
mcp_google_ads_keyword_opportunities()
mcp_google_ads_campaign_performance()
```

### GA4 MCP (content measurement)
```
mcp_ga4_analytics_run_report(
  property_id="...",
  dimensions=["pagePath", "country"],
  metrics=["activeUsers", "screenPageViews"],
  date_ranges=[{"start_date": "30daysAgo", "end_date": "today"}]
)
```

### GSC MCP (ranking tracking)
```
mcp_ga4_analytics_gsc_search_analytics(
  site_url="https://colombiatours.travel/",
  start_date="30daysAgo",
  end_date="today",
  dimensions=["query", "page"],
  row_limit=100
)
```

---

## Ejemplo de Ejecución

Cuando el usuario dice "crea contenido para [keyword/tema]":

```
1. DataForSEO keyword research → brief
2. Check if existing content exists → actualizar o crear
3. Redactar con tono ColombiaTours + EEAT
4. SEO metadata
5. Aplicar a producción
6. Verificar post-publish
7. Reportar resultado
```

Cuando el usuario dice "traduce [página] a [locale]":

```
1. Leer contenido ES existente
2. DataForSEO keyword research en locale target
3. Transcrear (NO traducir literal) con tono del locale
4. Glossary enforcement
5. EEAT checklist
6. Publicar + verificar
7. Sitemap + hreflang
```

---

## Dependencias

- DataForSEO API keys en env
- Google Ads MCP configurado
- GA4 MCP configurado
- GSC site verificado
- `post-publish-verifier.ts` (ya existe en lib/seo/)
- `seo-transcreation-pipeline` skill para aplicación técnica
