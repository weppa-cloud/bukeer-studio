# SEO Playbook v2.0 — Implementation Reference

> **Estado**: Implementado completamente (Abril 2026). Issues #61–#82 cerrados.
> Este documento es la referencia técnica para desarrolladores. Para la guía operativa de flujos SEO, ver [SEO-PLAYBOOK.md](./SEO-PLAYBOOK.md).

---

## Resumen ejecutivo

El SEO Playbook v2.0 es el módulo de optimización para motores de búsqueda integrado en el dashboard de Bukeer Website Studio. Implementa una arquitectura completa de SEO para agencias de turismo: desde la conexión con Google Search Console y GA4, hasta workflows por tipo de contenido, scoring 5D, análisis de backlinks, visibilidad en LLMs (AI Overviews), y OKRs por ciclo.

El módulo resuelve la ausencia de herramientas SEO nativas en el studio — los administradores de sitio ahora pueden operar SEO directamente desde el dashboard, sin herramientas externas, con datos conectados a sus propiedades de Google y con flujos de trabajo estructurados por tipo de contenido (hoteles, actividades, paquetes, destinos, blogs).

La implementación abarcó 24 componentes React, 13 API routes, 15 módulos en `lib/seo/`, 2 páginas de dashboard nuevas, y 2 suites de tests E2E — todo implementado en una sola sesión de trabajo (Abril 2026) cerrando los issues #61 a #82 del GitHub issue #60 (SEO Playbook v2.0 epic).

---

## Arquitectura del módulo SEO

### Capas

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGES (Next.js App Router)                                     │
│  analytics/page.tsx  contenido/page.tsx  seo/*/page.tsx         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ props / URL params
┌───────────────────────────▼─────────────────────────────────────┐
│  COMPONENTS  components/admin/seo-*.tsx  (24 archivos)          │
│  Tabs, workflows, KPI cards, wizards, kanban — todo Tailwind    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ fetch / SWR
┌───────────────────────────▼─────────────────────────────────────┐
│  API ROUTES  app/api/seo/**  (13 endpoints)                     │
│  Auth boundary: requireWebsiteAccess() en cada route            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ imports
┌───────────────────────────▼─────────────────────────────────────┐
│  lib/seo/  (15 módulos)                                         │
│  dto  server-auth  google-client  backend-service               │
│  unified-scorer  sitemap  hreflang  og-helpers                  │
│  internal-link-graph  llms-txt  click-depth                     │
│  state-token  api-call-logger  errors  robots-txt               │
└──────┬───────────────────────┬──────────────────────────────────┘
       │                       │
┌──────▼────────┐   ┌──────────▼──────────────────────────────────┐
│  Supabase DB  │   │  External APIs (con graceful degradation)    │
│  websites     │   │  GSC  GA4  DataForSEO  PageSpeed Insights    │
│  seo_configs  │   └─────────────────────────────────────────────┘
│  web_vitals   │
│  seo_items    │
└───────────────┘
```

### Data flow

```
GSC / GA4
    │  OAuth tokens stored in Supabase (seo_configs table)
    ▼
POST /api/seo/sync
    │  Llama backend-service.syncSeoData()
    │  Escribe keywords, clicks, impresiones en Supabase
    ▼
GET /api/seo/analytics/*
    │  Lee de Supabase (datos ya sincronizados)
    │  Fallback a API directa si datos < 24h de antigüedad
    ▼
Components (SeoBaseline28d, SeoKeywordResearch, etc.)
    │  Render con Tailwind CSS (sin librerías de charts)
    ▼
UI dashboard /dashboard/[websiteId]/analytics
```

---

## Componentes del dashboard (24)

### Analítica y reporting

| Componente | Ubicación | Props principales | Usado en |
|---|---|---|---|
| `seo-baseline-28d.tsx` | `components/admin/` | `websiteId` | analytics → overview tab |
| `seo-overview-table.tsx` | `components/admin/` | `websiteId`, `filter` (grade A-F) | analytics → keywords tab |
| `seo-keyword-research.tsx` | `components/admin/` | `websiteId` | analytics → keywords tab |
| `seo-technical-audit.tsx` | `components/admin/` | `websiteId` | analytics → health tab |
| `seo-serp-analysis.tsx` | `components/admin/` | `websiteId` | analytics → health tab |
| `seo-competitive-analysis.tsx` | `components/admin/` | `websiteId` | analytics → competitors tab |
| `seo-backlinks-dashboard.tsx` | `components/admin/` | `websiteId` | analytics → backlinks tab |
| `seo-ai-visibility.tsx` | `components/admin/` | `websiteId` | analytics → ai-visibility tab |
| `seo-backlog.tsx` | `components/admin/` | `websiteId` | analytics → overview tab |
| `seo-okr-cycle.tsx` | `components/admin/` | `websiteId` | analytics → overview tab |
| `seo-revenue-attribution.tsx` | `components/admin/` | `websiteId` | analytics → overview tab |
| `seo-locale-settings.tsx` | `components/admin/` | `websiteId` | analytics → config tab |
| `seo-schema-manager.tsx` | `components/admin/` | `websiteId` | analytics → health tab |

### Contenido y workflows

| Componente | Ubicación | Props principales | Usado en |
|---|---|---|---|
| `seo-item-detail.tsx` | `components/admin/` | `websiteId`, `itemType`, `itemId` | seo/[itemType]/[itemId]/page |
| `seo-content-score.tsx` | `components/admin/` | `score: Score5DResult` | seo-item-detail |
| `seo-editor.tsx` | `components/admin/` | `websiteId`, `itemId` | seo-item-detail, contenido |
| `seo-workflow-panel.tsx` | `components/admin/` | `type`, `steps[]`, `onClose` | wrapper genérico de workflows |
| `seo-hotel-workflow.tsx` | `components/admin/` | `itemId`, `websiteId` | contenido, seo-item-detail |
| `seo-activity-workflow.tsx` | `components/admin/` | `itemId`, `websiteId` | contenido, seo-item-detail |
| `seo-package-workflow.tsx` | `components/admin/` | `itemId`, `websiteId` | contenido, seo-item-detail |
| `seo-destination-workflow.tsx` | `components/admin/` | `itemId`, `websiteId` | contenido, seo-item-detail |
| `seo-blog-workflow.tsx` | `components/admin/` | `itemId`, `websiteId` | contenido, seo-item-detail |

### Onboarding y configuración

| Componente | Ubicación | Props principales | Usado en |
|---|---|---|---|
| `seo-quick-start-wizard.tsx` | `components/admin/` | `websiteId`, `onComplete` | seo/page |
| `seo-setup-banner.tsx` | `components/admin/` | `websiteId` | analytics/page (cuando wizard no completado) |

---

## API Routes (13 endpoints)

### Integrations — OAuth Google

| Método | Path | Auth | Response | Descripción |
|---|---|---|---|---|
| `POST` | `/api/seo/integrations/google/connect` | requireWebsiteAccess | `{ url: string }` | Genera URL OAuth para GSC o GA4 |
| `GET` | `/api/seo/integrations/google/callback` | state token (HMAC) | redirect | Recibe code, intercambia tokens, guarda en DB |
| `POST` | `/api/seo/integrations/google/refresh` | requireWebsiteAccess | `{ ok: true }` | Renueva access_token con refresh_token |
| `GET` | `/api/seo/integrations/google/options` | requireWebsiteAccess | `GoogleIntegrationOption[]` | Lista propiedades GSC y GA4 disponibles |
| `POST` | `/api/seo/integrations/google/configure` | requireWebsiteAccess | `{ ok: true }` | Guarda siteUrl GSC + propertyId GA4 seleccionados |
| `GET` | `/api/seo/integrations/status` | requireWebsiteAccess | `IntegrationStatusDTO` | Estado actual de todas las integraciones |

### Analytics — Data

| Método | Path | Auth | Response | Descripción |
|---|---|---|---|---|
| `GET` | `/api/seo/analytics/overview` | requireWebsiteAccess | `AnalyticsOverviewDTO` | KPIs 28D: clicks, CTR, posición, tendencia |
| `GET` | `/api/seo/analytics/keywords` | requireWebsiteAccess | `KeywordRowDTO[]` | Keywords con volumen, posición, CTR, grade |
| `GET` | `/api/seo/analytics/competitors` | requireWebsiteAccess | `CompetitorRowDTO[]` | Análisis competidores con keyword gap |
| `POST` | `/api/seo/analytics/health` | requireWebsiteAccess | `HealthAuditDTO[]` | Auditoría CWV via PageSpeed Insights |

### SEO Operations

| Método | Path | Auth | Response | Descripción |
|---|---|---|---|---|
| `POST` | `/api/seo/sync` | requireWebsiteAccess | `{ ok: true, synced: number }` | Sincroniza GSC + GA4 + DataForSEO a Supabase |
| `POST` | `/api/seo/keywords/research` | requireWebsiteAccess | `KeywordResearchDTO` | Genera keywords con AI (OpenRouter) + GSC |
| `GET` | `/api/seo/score` | requireWebsiteAccess | `Score5DResult` | Score 5D unificado de un item |

---

## lib/seo/ — Módulos core

| Archivo | Exports principales | Usado por |
|---|---|---|
| `dto.ts` | `Score5DResultSchema`, `IntegrationStatusDTO`, `AnalyticsOverviewDTO`, `KeywordRowDTO`, `CompetitorRowDTO`, `HealthAuditDTO`, `KeywordResearchDTO` | Todos los API routes |
| `server-auth.ts` | `requireWebsiteAccess()`, `WebsiteAccessContext` | Todos los API routes |
| `google-client.ts` | `buildGoogleAuthUrl()`, `exchangeGoogleCode()`, `refreshGoogleToken()`, `SearchConsoleRow` | backend-service, integrations routes |
| `backend-service.ts` | `getIntegrationStatus()`, `syncSeoData()`, `getOverview()`, `getFreshCredential()`, `GoogleIntegrationOption` | API routes analytics + sync |
| `unified-scorer.ts` | `scoreItemSeo()`, `detectDuplicates()`, `SeoItemType`, `SeoScoringInput`, `SeoScoringResult`, `SeoCheck` | /api/seo/score, seo-item-detail |
| `sitemap.ts` | `buildSitemapUrls()`, `generateSitemapXml()`, `SitemapUrl` | app/sitemap.ts |
| `robots-txt.ts` | `generateRobotsTxt()` | app/robots.ts |
| `hreflang.ts` | `generateHreflangLinks()`, `generateHreflangMetaTags()`, `SUPPORTED_LANGUAGES` | site layout, seo-locale-settings |
| `og-helpers.ts` | `resolveOgImage()` | section metadata generators |
| `internal-link-graph.ts` | `buildInternalLinkGraph()`, `LinkGraphResult`, `LinkGraphItem` | seo/architecture/page |
| `llms-txt.ts` | `generateLlmsTxt()` | app/llms.txt/route.ts |
| `click-depth.ts` | `calculateClickDepth()`, `ClickDepthResult` | seo/architecture/page |
| `state-token.ts` | `signOAuthState()`, `verifyOAuthState()` | google/connect + google/callback |
| `api-call-logger.ts` | `logSeoApiCall()`, `SeoApiCallLogInput` | Todos los API routes (observabilidad) |
| `errors.ts` | `SeoApiError`, `SeoApiErrorCode`, `toErrorResponse()` | Todos los API routes |

---

## Scoring 5D

El modelo de scoring evalúa cada item de contenido en 5 dimensiones, cada una con un máximo de 20 puntos. Total máximo: 100 puntos.

### Dimensiones

| Dimensión | Código | Max | Qué evalúa |
|---|---|---|---|
| On-Page | D1 | 20 | title tag, meta description, H1, longitud de contenido, URL slug |
| Semantic | D2 | 20 | densidad de keywords objetivo, variantes semánticas, cobertura de intención |
| Schema | D3 | 20 | presencia de JSON-LD, tipo correcto por content type, campos requeridos |
| Conversion | D4 | 20 | CTA presentes, formulario de contacto, links internos a páginas transaccionales |
| Competitive | D5 | 20 | posición GSC, CTR vs promedio del sitio, tendencia 28D |

### Grades

| Score | Grade |
|---|---|
| 90-100 | A |
| 75-89 | B |
| 60-74 | C |
| 40-59 | D |
| 0-39 | F |

### Función principal

```typescript
// lib/seo/unified-scorer.ts
scoreItemSeo(input: SeoScoringInput): SeoScoringResult
// Retorna: { d1, d2, d3, d4, d5, total, grade, checks: SeoCheck[] }
```

`SeoCheck` incluye cada verificación individual con `passed: boolean`, `label`, `points` ganados y `recommendation` cuando falla.

---

## Workflows por tipo de contenido

Los workflows son checklists interactivos que guían al editor a través de los pasos SEO específicos de cada tipo de contenido. Se abren como modal desde la tabla de contenido o desde el panel de detalle de un item.

| Tipo | Componente | Items | Particularidades |
|---|---|---|---|
| Hotel | `seo-hotel-workflow.tsx` | 12 checks | Schema `Hotel` + `LodgingBusiness`, amenities, fotos schema |
| Actividad | `seo-activity-workflow.tsx` | 10 checks | Schema `TouristAttraction` + `Activity`, duración, punto de partida |
| Paquete | `seo-package-workflow.tsx` | 11 checks | Schema `Product` + `Offer`, precio, itinerario, fechas |
| Destino | `seo-destination-workflow.tsx` | 10 checks | Pillar page: H2 por subtema, tabla de contenidos, links a hotels/activities |
| Blog | `seo-blog-workflow.tsx` | 10 checks + badge | Badge de decisión editorial: `Keeper` / `Optimize` / `Prune` por tráfico/conversión |

El componente genérico `seo-workflow-panel.tsx` implementa el modal de 4 pasos: Research → SERP → On-Page → Medir. Los workflows específicos extienden este patrón con sus checks particulares.

---

## Integraciones externas

Todas las integraciones implementan **graceful degradation**: si las credenciales no están configuradas o la API falla, el UI permanece funcional mostrando estados vacíos sin errores.

### Google Search Console (GSC)

- **Propósito**: clicks, impressions, CTR, posición por query y por página.
- **Auth**: OAuth 2.0 (Authorization Code Flow). Tokens guardados en `seo_configs` Supabase.
- **Sync**: `POST /api/seo/sync` → `syncSeoData()` → escribe en tabla `seo_keyword_metrics`.
- **Env vars requeridas**: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`.

### Google Analytics 4 (GA4)

- **Propósito**: sesiones, usuarios, conversiones, tráfico por canal.
- **Auth**: mismo OAuth app que GSC (scope adicional `analytics.readonly`).
- **Env vars requeridas**: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
- **Nota**: `propertyId` se guarda via `POST /api/seo/integrations/google/configure`.

### DataForSEO

- **Propósito**: análisis de backlinks, keyword research avanzado, rank tracking.
- **Auth**: HTTP Basic Auth con credenciales propias.
- **Env vars requeridas**: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (o `DATAFORSEO_CREDENTIALS` en formato `login:password`).
- **Activación**: solo se llama si `DATAFORSEO_ENABLED=true` o si `DATAFORSEO_CREDENTIALS` existe.

### PageSpeed Insights (Google)

- **Propósito**: Core Web Vitals (LCP, CLS, INP) por URL, estrategia mobile/desktop.
- **Auth**: sin auth (API pública). Opcionalmente `GOOGLE_PAGESPEED_API_KEY` para mayor quota.
- **Llamada**: `POST /api/seo/analytics/health` dispara auditorías on-demand.

### OpenRouter / AI

- **Propósito**: generación de keywords con AI en `seo-keyword-research.tsx`.
- **Env vars requeridas**: `OPENROUTER_AUTH_TOKEN`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`.

---

## Variables de entorno requeridas

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Si se usa GSC/GA4 | Client ID de la OAuth App en Google Cloud |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Si se usa GSC/GA4 | Client Secret de la OAuth App |
| `GOOGLE_OAUTH_REDIRECT_URI` | Si se usa GSC/GA4 | URI registrada en Google Cloud (debe coincidir) |
| `GOOGLE_OAUTH_STATE_SECRET` | Recomendada | HMAC secret para firmar state OAuth. Fallback: `REVALIDATE_SECRET` |
| `DATAFORSEO_LOGIN` | Opcional | Login de cuenta DataForSEO |
| `DATAFORSEO_PASSWORD` | Opcional | Password de cuenta DataForSEO |
| `DATAFORSEO_ENABLED` | Opcional | `"true"` para activar explícitamente DataForSEO |
| `DATAFORSEO_CREDENTIALS` | Opcional | Alternativa: `"login:password"` en una sola var |
| `GOOGLE_PAGESPEED_API_KEY` | Opcional | Aumenta quota de PageSpeed Insights |
| `OPENROUTER_AUTH_TOKEN` | Si se usa AI keywords | Token de OpenRouter para generación de keywords |
| `OPENROUTER_BASE_URL` | Si se usa AI keywords | Base URL (default: `https://openrouter.ai/api/v1`) |
| `OPENROUTER_MODEL` | Si se usa AI keywords | Modelo (default: `anthropic/claude-sonnet-4-5`) |

Variables de Supabase y autenticación general están documentadas en [CLAUDE.md](../../CLAUDE.md).

---

## Tests E2E

### Suite 1: `seo-analytics-impl.spec.ts`

**Descripción**: Tests de implementación detallados. Verifica que los elementos UI específicos del módulo SEO estén presentes y funcionales.

**Cobertura**:
- Analytics page: verifica los 7 sub-tabs (Overview, Keywords, Competitors, Health, AI Visibility, Backlinks, Config) y el panel de configuración de integraciones Google.
- Contenido page: tabla unificada con controles SEO (buscador, botones de publicación masiva), botón "Flujo SEO →" por item.
- Item detail: panel con 5 tabs (Meta, Score, Workflow, Backlinks, Historial).

### Suite 2: `seo-playbook-e2e.spec.ts`

**Descripción**: Smoke tests de flujo completo. 21 tests marcados con `@smoke` que validan la navegación y renderizado de todas las secciones del módulo SEO.

**Cobertura**:
- Analytics Dashboard (todos los tabs).
- Contenido con columnas SEO y botón de workflow.
- Arquitectura SEO (`seo/architecture`): topic clusters, click depth, árbol de links internos.
- Quick-start wizard (7 pasos, estado en localStorage).
- SEO item detail con tabs completos.

### Cómo ejecutar

```bash
# Solo smoke tests (rápido, ~2 min)
npx playwright test --grep @smoke

# Suite completa de SEO
npx playwright test e2e/tests/seo-analytics-impl.spec.ts
npx playwright test e2e/tests/seo-playbook-e2e.spec.ts

# Con override de websiteId específico
E2E_WEBSITE_ID=<uuid> npx playwright test --grep @smoke
```

---

## Páginas del dashboard

| Ruta | Archivo | Descripción |
|---|---|---|
| `/dashboard/[websiteId]/analytics` | `app/dashboard/[websiteId]/analytics/page.tsx` | 7 tabs: overview, keywords, competitors, health, ai-visibility, backlinks, config |
| `/dashboard/[websiteId]/contenido` | `app/dashboard/[websiteId]/contenido/page.tsx` | Tabla de contenido con columnas SEO + botón "Flujo SEO →" + toggle de vista por URL param |
| `/dashboard/[websiteId]/seo/architecture` | `app/dashboard/[websiteId]/seo/architecture/page.tsx` | Topic clusters, click depth, árbol de links internos (Tailwind CSS) |
| `/dashboard/[websiteId]/seo/[itemType]/[itemId]` | `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx` | Detalle de item SEO: meta editor, score 5D, workflow, recomendaciones; pills de locale |

**URL params usados** (ADR-004/P7 — estado persistente en URL):
- `?tab=` — tab activo en analytics y item detail
- `?view=` — modo de vista en contenido (table / cards)
- `?subtab=` — sub-navegación dentro de tabs

---

## Decisiones de arquitectura clave

| Decisión | Motivación |
|---|---|
| Sin librerías de charts (recharts, d3, chart.js) | Reducir bundle size en Cloudflare Worker. Todas las visualizaciones usan Tailwind CSS (barras, anillos SVG, heat maps con `bg-opacity`). |
| Graceful degradation en todas las APIs externas | El dashboard funciona sin credenciales configuradas. Los componentes muestran estados vacíos, no errores. |
| Estado en URL params, no en React state | ADR-004/P7: permite compartir links con tab activo, compatibilidad con ISR y back/forward navigation. |
| `requireWebsiteAccess()` en cada API route | Boundary de auth consistente. Verifica que el usuario autenticado tenga acceso al `websiteId` del request. |
| RLS habilitado en `web_vitals_metrics` | Bug B1 corregido: la tabla no tenía RLS, permitía lectura cross-tenant. |
| Todo el texto en español | UX para agencias latinoamericanas. Excepciones: nombres técnicos estándar (CTR, LCP, CLS, JSON-LD). |

---

## Bugs corregidos durante la implementación

| Bug | Descripción | Fix aplicado |
|---|---|---|
| **B1** — RLS faltante | `web_vitals_metrics` no tenía Row Level Security habilitada. Lectura cross-tenant posible. | Migración SQL: `ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY` + política por `website_id`. |
| **B5** — Trend siempre 0 | `AnalyticsOverviewDTO.trend` calculaba `(current - previous) / previous` pero `previous` venía como `null` de Supabase cuando no había datos del período anterior. | Fallback a `0` antes de dividir; trend retorna `null` si no hay datos suficientes. |
| **B6** — `inLanguage` hardcodeado | JSON-LD generators usaban `inLanguage: 'es'` hardcodeado. | `inLanguage` ahora lee `website.locale ?? website.language ?? 'es'` desde los datos del sitio. |
| **B7** — `hasJsonLd` hardcodeado | `seo-technical-audit.tsx` mostraba `hasJsonLd: true` siempre, sin verificar el DOM real. | Se conectó al endpoint `/api/seo/score` (D3 dimension) para obtener el valor real desde `unified-scorer.ts`. |
