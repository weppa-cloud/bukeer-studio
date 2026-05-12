# SEO Content Workflow Profesional — ColombiaTours

**Propósito:** Crear contenido que Google premia, no penaliza. Usando DataForSEO + Google Ads + GA4 como herramientas de decisión, no solo de medición.

**Fecha:** 2026-05-12
**Skill vinculado:** `seo-transcreation-pipeline`, `transcreation-program`

---

## 1. Qué Google Penaliza en 2025-2026

### 1.1 AI-Generated Content Without Value (HEAVY PENALTY)

Google NO penaliza el AI *per se*. Penaliza el **contenido generado en masa sin valor añadido**. Su guía oficial (marzo 2025) dice:

> *"Use automation to generate content with the primary purpose of manipulating search rankings — that's against our spam policies."*

**Lo que NO se debe hacer:**
- Tomar un keyword → meterlo en una plantilla GPT → publicar sin edición
- Escalar contenido a 100+ artículos por semana sin revisión humana
- Usar AI para "rewrite" de contenido existente sin añadir expertise real

**Lo que SÍ funciona:**
- AI como asistente de investigación + estructura → humano escribe/seccion
- AI para drafts iniciales → humano edita con expertise local
- AI para traducciones → humano verifica tono y precisión cultural

### 1.2 Parasite SEO (ACTIVE PENALTY)

Google penaliza activamente el "parasite SEO" — publicar contenido en sitios de terceros (Medium, WordPress.com, etc.) solo para rankear.

**Aplica a ColombiaTours:** No es nuestro caso (publicamos en dominio propio). Pero sí aplica al revés: no usar subdirectorios de terceros.

### 1.3 Thin Affiliate Content

Contenido que no añade valor más allá del enlace de afiliado. Para ColombiaTours: los packages y activities no deben ser solo "compra esto" — deben tener información útil para decidir.

### 1.4 Mass-Produced Scaled Content

Google lo dice claro: *"Is the content mass-produced by or outsourced to a large number of creators, so that individual pages don't get enough attention or care?"*

**⚠️ Esto es directamente relevante para nosotros.** Traducir 736 activities en batch SIN revisión individual es exactamente lo que Google penaliza.

---

## 2. Qué Google Premia

### 2.1 EEAT — Experience, Expertise, Authoritativeness, Trustworthiness

Para contenido de viajes (Google clasifica como "Your Money or Your Life" — YMYL):

| Factor | Cómo se demuestra en ColombiaTours |
|--------|-----------------------------------|
| **Experience** | "Colombia como la cuenta quien la camina" — contenido de quien ha estado ahí |
| **Expertise** | Guías locales, 14 años operando, conocimiento de destinos |
| **Authoritativeness** | Citado por otras fuentes, reviews reales, presencia en Google |
| **Trustworthiness** | About page con quiénes somos, políticas claras, contacto real |

**Implementación concreta:**
- Cada blog debe tener: autor + bio con expertise local
- Las landing pages deben citar fuentes locales (guías, comunidades)
- Los packages deben incluir evidencia de calidad (fotos reales, testimonios)

### 2.2 Original Information, Research, Analysis

Google busca contenido que NO sea una copia de lo que ya existe. Para ColombiaTours:

- **NO:** "Cartagena es una ciudad colonial con playas hermosas" (lo dice todo el mundo)
- **SÍ:** "En Bocagrande el mar está más tranquilo para familias; en La Boquilla encuentras el verdadero sabor costeño a 15 min del centro" (experiencia real, información útil)

### 2.3 Comprehensive Coverage (Content Hubs)

Google premia el contenido que cubre un tema de forma completa, no artículos aislados. Esto es clave para:

```
Pillar Page: "Guía Completa de Colombia"
├── /cartagena/ → qué hacer, dónde comer, dónde dormir, cómo llegar
├── /medellin/ → ídem
├── /eje-cafetero/ → ídem
├── /blog/cuanto-cuesta-viajar-a-colombia
├── /blog/mejor-epoca-para-visitar-colombia
└── /blog/requisitos-visa
```

Cada artículo se enlaza internamente formando una red temática.

---

## 3. El Workflow Profesional: 5 Fases

### Fase 1 — Keyword Research con DataForSEO + Google Ads

**No es "qué keywords existen". Es "qué busca la gente que quiere viajar a Colombia".**

```
Paso 1.1 — Seed keywords
  Input: términos base del negocio
  Output: lista de 20-30 seed keywords por cluster
  DataForSEO: /v3/dataforseo_labs/locations_and_languages

Paso 1.2 — Keyword ideas
  Input: seeds
  Output: ~200 keywords con volume, cpc, difficulty
  DataForSEO: /v3/keywords_data/google/keywords_for_keywords/live

Paso 1.3 — SERP analysis
  Input: top 20 keywords por cluster
  Output: qué tipo de contenido rankea (listas, guías, videos, productos)
  DataForSEO: /v3/serp/google/organic/live/advanced

Paso 1.4 — Intent classification
  Cada keyword se clasifica:
  - INFORMATIONAL: "qué hacer en cartagena" → blog post
  - COMMERCIAL: "mejor hotel cartagena" → comparativa + package
  - TRANSACTIONAL: "reservar tour cartagena" → landing page de producto
  - NAVIGATIONAL: "colombiatours cartagena" → nuestra propia página

Paso 1.5 — Gap analysis
  Input: SERP de competidores
  Output: qué keywords tienen ellos que nosotros no
  DataForSEO: /v3/dataforseo_labs/competitors_domain/live

Paso 1.6 — Google Ads validation
  Input: keywords preseleccionadas
  Output: volumen real de búsqueda, competidores en ads
  Google Ads MCP: keyword_opportunities

Paso 1.7 — Priority scoring
  Score = (Volume × Intent_Value) / Difficulty
  - P0: score > 50 → crear contenido YA
  - P1: score 20-50 → crear pronto
  - P2: score < 20 → crear si sobra tiempo
```

### Fase 2 — Content Brief (El Paso Crítico)

**Antes de escribir UNA sola palabra, se genera un brief basado en DataForSEO SERP data.**

```
Para cada keyword target:

1. SERP Top 10 Analysis
   - ¿Qué tipo de contenido rankea? (long-form, listicle, video, producto)
   - ¿Qué preguntas responde cada resultado?
   - ¿Qué preguntas NO responde nadie? → OPORTUNIDAD

2. People Also Ask extraction
   - Preguntas relacionadas → incluirlas como FAQ o secciones

3. Entity Map
   - Personas, lugares, conceptos que deben mencionarse
   - Para Colombia: destinos, platos típicos, festivales, épocas

4. Content Structure Draft
   - H2s, H3s basados en SERP gaps
   - Párrafo de introducción (responde "por qué esto es diferente")
   - CTA específica

5. Keyword Allocation
   - Keyword principal en: title, H1, URL, primer párrafo
   - Keywords secundarias en: H2s, body text, alt text
   - LSI keywords (semánticamente relacionadas) distribuidas naturalmente
```

### Fase 3 — Redacción con EEAT

**Cada pieza de contenido debe pasar este checklist:**

```
CHECKLIST — Contenido People-First
☐ ¿Provee información original? (no copia de Wikipedia/otros blogs)
☐ ¿Es sustancial y completa? (no 300 palabras genéricas)
☐ ¿Tiene análisis más allá de lo obvio?
☐ ¿El título describe exactamente el contenido?
☐ ¿Es bookmarkeable? ¿la recomendarías a un amigo?
☐ ¿Tendría cabida en una revista impresa de viajes?

CHECKLIST — EEAT
☐ ¿El autor tiene expertise demostrable? (bio + enlaces)
☐ ¿Las fuentes están citadas?
☐ ¿La información es precisa para el mercado target?
☐ ¿Hay evidencia de experiencia directa? (fotos propias, anécdotas)

CHECKLIST — SEO Técnico
☐ Title: ≤60 chars, keyword principal al inicio
☐ Meta description: ≤160 chars, incluye keyword + CTA
☐ H1: único, descriptivo, incluye keyword
☐ URL: /{locale}/{keyword-slug}
☐ Imágenes: alt text descriptivo con keywords secundarias
☐ Internal links: mínimo 3 enlaces a contenido relacionado
☐ Structured data: Article, BreadcrumbList, FAQ (si aplica)
```

### Fase 4 — Publicación y Verificación

Usando el pipeline existente:

```
1. Aplicar a producción (website_pages / product_seo_overrides)
2. Verificación post-publish (14 checks — ver #508)
   - HTTP 200
   - html lang correcto
   - Canonical self
   - Hreflang recíproco
   - No robots noindex
   - Title correcto
   - Body language correcto
3. Sitemap + hreflang (solo si verificación pasa)
4. IndexNow ping
```

### Fase 5 — Medición e Iteración

**No es "publicar y olvidar". Es un ciclo:**

```
Semana 1: Publicar
Semana 2-4: Monitorear GSC
  - Impresiones, clicks, CTR, posición
  - Si no hay impresiones → revisar indexación + contenido
Mes 2: Primera iteración
  - Actualizar contenido con nueva data
  - Añadir secciones basadas en preguntas de usuarios
Mes 3: Evaluación
  - ¿El contenido generó consultas? (conversiones)
  - ¿El contenido se posicionó?
  - ¿Hay gaps nuevos?
```

**Herramientas:**
- GA4 MCP: tráfico orgánico por página
- GSC MCP: queries, posiciones, CTR
- Google Ads MCP: qué keywords están convirtiendo
- DataForSEO: re-evaluar difficulty trimestralmente

---

## 4. Cómo Usar Nuestras Herramientas para Esto

| Herramienta | Uso en el workflow | Frecuencia |
|-------------|-------------------|------------|
| **DataForSEO Keywords** | Research de keywords por cluster y locale | Quincenal |
| **DataForSEO SERP** | Análisis de competencia y tipo de contenido | Por cada brief |
| **DataForSEO OnPage** | Auditoría técnica post-publicación | Semanal |
| **Google Ads MCP** | Validación de volumen + keywords pagas | Quincenal |
| **GA4 MCP** | Medición de tráfico orgánico y conversiones | Diaria |
| **GSC MCP** | Posiciones, CTR, queries que traen tráfico | Semanal |
| **Indexing API** | Notificar a Google cuando hay contenido nuevo | Por publicación |

---

## 5. Lo Que NO Vamos a Hacer (Anti-Patrones)

| ❌ Anti-patrón | Por qué | Alternativa |
|---------------|---------|-------------|
| Traducir 736 activities en batch sin revisión | Google lo ve como scaled content sin valor | Transcrear top 100 con DataForSEO evidence, resto con rate limits y revisión |
| Publicar 50 blogs traducidos en una semana | Señal de spam / AI content farm | Batch de 5-10 por semana con verificación |
| Copiar estructura SERP exacta de competidores | No aporta valor adicional, Google lo detecta como thin | Usar SERP para encontrar gaps, no para copiar |
| Keyword stuffing en traducciones | Penalización directa | Keywords distribuidas naturalmente, priorizar legibilidad |
| Ignorar EEAT en traducciones | Google descarta contenido sin señales de autoridad | Incluir autor locale, fuentes locales, evidencia de experiencia |

---

## 6. Implementación para ColombiaTours

### Prioridad Inmediata (Fase 0 del programa)

1. **DataForSEO research** para los 8 clusters en ES-DE-FR-PT-EN
2. **Brand Voice + Glossary** (ya tenemos el análisis de voz)
3. **Brief template** (basado en SERP analysis) para cada blog

### Batch 1 — Primeros 10 blogs (semana 1-2)

Por cada blog:
1. DataForSEO keyword research + SERP analysis → brief
2. Reescritura en ES con tono ColombiaTours + EEAT
3. SEO metadata
4. Versión DE/FR/PT/EN usando brief locale-specific
5. Publicar + verificar

### Batch 2-N — Escalar con control

- 5-10 blogs por semana máximo
- Verificación post-publish obligatoria para cada uno
- Cron semanal de monitoreo
- Iteración basada en datos GSC a los 30 días

---

*Este documento es la base del skill `seo-content-workflow` que se creará para automatizar estos pasos.*
