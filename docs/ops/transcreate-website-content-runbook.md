# Transcreate Website Content — End-to-End Runbook

**Status:** Active
**Date:** 2026-04-18
**Applies to:** Multi-locale sites usando path-prefix routing (ADR-019)

## Overview

Traducción de contenido SEO de un sitio entero (home + product landings + blog posts + destinations) a los locales configurados en `websites.supported_locales`. Pipeline automatizado con AI + human review.

## Pre-requisites

Antes de arrancar:

- [ ] `websites.default_locale` configurado (e.g. `es-CO`)
- [ ] `websites.supported_locales` incluye target locales (e.g. `['es-CO', 'en-US', 'pt-BR']`)
- [ ] Glossary seeded para target locales (brand terms, no-translate terms)
- [ ] OpenRouter API key configurada (`OPENROUTER_AUTH_TOKEN`)
- [ ] Rate limit budget conocido: 10 AI calls/día por `(website_id, target_locale)`

## Flujo por fases

### Fase 1 — Setup glossary (1 vez por sitio)

URL: `/dashboard/[websiteId]/translations/glossary`

Agregar términos críticos antes de cualquier traducción:

| Tipo | Ejemplo | Reason |
|------|---------|--------|
| Brand — never translate | "ColombiaTours", "Bukeer" | Consistency de marca |
| Product term | "todo incluido" → "all inclusive" | Evita mala traducción literal |
| Geo term | "Ciudad Amurallada" → "Walled City" | Terminología SEO |

**Bulk CSV import** disponible en el dashboard — formato: `term,translation,notes`.

### Fase 2 — Review coverage matrix

URL: `/dashboard/[websiteId]/translations`

Matrix visual por página × locale:

| Page | es-CO | en-US | pt-BR |
|------|-------|-------|-------|
| /paquetes/cartagena-5d | 🟢 applied | 🔴 missing | 🔴 missing |
| /l/tour-colombia-10-dias | 🟢 applied | 🟠 draft | 🔴 missing |
| /blog/post-x | 🟢 applied | 🟠 reviewed | 🟢 applied |

Colores:
- 🟢 `applied` o `published` → hreflang activo, indexable
- 🟠 `draft` o `reviewed` → job existe, no visible en producción
- 🔴 missing → no hay job

### Fase 3 — Generar drafts AI (per-item)

**Opción A — Dashboard UI (recomendado):**

1. En coverage matrix, click "Translate with AI" en celda 🔴 faltante
2. Sistema lanza pipeline:
   - TM pre-fill (translation memory exact matches si `similarity ≥ 1.0`)
   - Glossary injection (terms no-translate + translations obligatorias)
   - `streamText` call a OpenRouter (si TM cobertura < 100%)
3. Preview progresivo en UI (tokens streaming)
4. Al terminar: draft creado con `status='draft'`, `ai_generated=true`
5. Rate limit counter: `remaining = 9/10`

**Opción B — API directa (para scripts):**

```bash
curl -X POST https://<site>.bukeer.com/api/seo/content-intelligence/transcreate/stream \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "894545b7-...",
    "sourceContentId": "0acf68e7-...",
    "pageType": "package",
    "sourceLocale": "es-CO",
    "targetLocale": "en-US",
    "country": "United States",
    "language": "en"
  }'
```

Response: streaming JSON → `{meta_title, meta_desc, slug, h1, keywords[]}`

**Rate limit:** si `remaining = 0` → 429 con `resetAt` timestamp.

### Fase 4 — Human review

1. Abrir item con `status='draft'` en dashboard
2. Verificar:
   - Glossary terms respetados (brand no traducido, terminología correcta)
   - Meta title ≤ 60 chars, meta desc ≤ 155 chars
   - Slug válido (`^[a-z0-9-]+$`)
   - Keywords relevantes al mercado target
3. Editar si necesario
4. Click "Mark as reviewed" → `status='reviewed'`

**Shortcut bulk review:** seleccionar múltiples → `translation-bulk-bar.tsx` → "Review all" → PATCH `/api/seo/translations/bulk`.

### Fase 5 — Apply (publicar a producción)

1. Desde `status='reviewed'` → click "Apply"
2. Sistema escribe overrides en `seo_localized_variants` (+ `product_seo_overrides` si product landing)
3. `status='applied'` → hreflang empieza a incluir ese locale en esa página
4. SSR renderiza contenido localizado en `/en/<path>`

**Bulk apply:** mismo endpoint `/api/seo/translations/bulk` con `action: 'apply'`.

### Fase 6 — Verification post-apply

| Check | Cómo |
|-------|------|
| Contenido renderiza en URL localizada | `curl https://<site>.bukeer.com/en/paquetes/X` → verificar `<title>` traducido |
| hreflang incluye el locale | grep `<link rel="alternate" hreflang="en-US"` en HTML |
| Sitemap lista el locale | `GET /sitemap.xml` → verificar `<xhtml:link hreflang="en-US">` |
| Google puede indexar | GSC URL inspection tool |
| JSON-LD `inLanguage` correcto | view-source + buscar `"inLanguage": "en-US"` |

### Fase 7 — Publish (opcional — marcar como finalized)

`status='published'` es idéntico a `applied` para SEO pero marca "este contenido fue firmado por equipo de contenido". Use case: workflow de aprobación con roles.

## Escalado a sitio completo

### Estrategia recomendada por prioridad

**Tier 1 (urgente — top traffic):**
1. Home `/`
2. Top 10 landings por sessions (90d GA4) — ver baseline en #99
3. Blog top 10 por clicks (90d GSC)

**Tier 2 (catalogo principal):**
4. Todos los package_kits activos
5. Todos los destinations principales

**Tier 3 (long tail):**
6. Blog posts restantes (510 en colombiatours)
7. Hoteles + activities secundarias

### Budget de traducción

Con rate limit 10/día por locale:
- 1 locale × 10 items/día = 10 items/día
- 3 locales × 10/día = 30 items/día (si se distribuye)
- Sitio de 500 items × 3 locales = 1,500 jobs → **50 días** con limit actual

Si necesitas más throughput:
- Aumentar `DAILY_LIMIT` en `lib/seo/transcreate-rate-limit.ts:3` (trade-off: costo OpenRouter)
- TM cache reduce LLM calls: si ya tradujiste "Cartagena" → próximos items con esa palabra reutilizan TM sin llamar LLM

## Edge cases

### 1. Cutover desde WP — colombiatours pattern

Pre-cutover: preservar rankings EN existentes.
- Baseline GSC del subdomain EN (ver #99)
- Traducir top 25 páginas EN ANTES del cutover
- Activar hreflang ANTES del DNS switch
- Post-cutover: monitor GSC URL inspection por 72h

### 2. Fallback strategy (ADR-020)

Si una página NO tiene job `applied/published` en el locale X:
- hreflang para ese locale NO se emite
- El usuario ve el locale default (Google lo indexará bajo default locale)
- Evita "duplicate content" penalties

### 3. Drift detection (pending — en #146)

Cuando source content cambia post-traducción:
- Future: flag `needs_review` automático
- Current: verificación manual via dashboard "stale translations" filter

### 4. Cost estimation

- OpenRouter `claude-sonnet-4-6` aprox $3/1M input tokens, $15/1M output
- Draft promedio: ~1500 input + 500 output = ~$0.012 per call
- 1500 calls = ~$18 de gasto de AI

## KPIs

Medir éxito del programa:

| KPI | Target | Fuente |
|-----|--------|--------|
| Coverage % por locale | 100% Tier 1, 80% Tier 2 | Dashboard coverage matrix |
| Time to review | < 5 min por item | Telemetría `reviewTranscreateJob` |
| hreflang reciprocidad | 100% sin gaps | `#146` audit cron (pending) |
| GSC impressions EN post-apply | +20% vs baseline 90d | GSC weekly report |
| TM reuse rate | > 30% calls skipped | Rate limit telemetry |

## Troubleshooting

### "Rate limit exceeded"
- Response 429 con `resetAt`
- Esperar hasta el timestamp o aumentar `DAILY_LIMIT`

### "TARGET_RERESEARCH_REQUIRED" (409)
- Keyword target no tiene data `live` authoritative en `seo_keyword_candidates`
- Correr keyword research antes del transcreate (ver #64 pendiente)
- Workaround: usar `sourceKeyword` en el payload

### "AI output keywords no es array"
- `normalizeLocaleAdaptationOutput` debería normalizar
- Si no lo hace: actualizar prompt en `lib/ai/prompts/locale-adaptation.ts`

### "hreflang no aparece en HTML final"
- Verificar job `status IN ('applied', 'published')` en DB
- Invalidar ISR cache: `revalidateTag('website:<id>')`
- Ver ADR-016 para cache behavior

## Referencias

- [[ADR-019]] Multi-locale URL routing (path-prefix)
- [[ADR-020]] hreflang emission policy
- [[ADR-021]] Translation memory + transcreation pipeline
- Dashboard: `app/dashboard/[websiteId]/translations/page.tsx`
- Components: `components/admin/translations-dashboard.tsx`, `translation-row.tsx`, `translation-bulk-bar.tsx`
- API routes:
  - `/api/seo/content-intelligence/transcreate/stream` (generate)
  - `/api/seo/content-intelligence/transcreate` (review, apply, publish)
  - `/api/seo/translations/bulk` (bulk operations)
- Rate limit: `lib/seo/transcreate-rate-limit.ts`
- Workflow: `lib/seo/transcreate-workflow.ts`
