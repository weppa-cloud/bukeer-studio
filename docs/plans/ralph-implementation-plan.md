# Ralph — Implementation Plan: Global Multilocale Transcreation

**Iteración:** Ralph
**Epic:** [#502](https://github.com/weppa-cloud/bukeer-studio/issues/502)
**Target:** DE/FR/PT-BR transcreations operativas en ColombiaTours
**Spec:** `docs/specs/SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO.md`

---

## TL;DR

3 bloques secuenciales, 4 semanas estimadas:

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  SPRINT 1    │ ──→ │  SPRINT 2        │ ──→ │  SPRINT 3-4     │
│  Infra (R1)  │     │  Content Ops (R2) │     │  Rollout + Mon  │
│  #503 #504   │     │  #505 #506 #507  │     │  #508 #509 #510 │
│  #508 (code) │     │  F1 hreflang     │     │  Batch 2 + Ver  │
└──────────────┘     └──────────────────┘     └─────────────────┘
```

---

## SPRINT 1: Infrastructure (Rol 1)

**Issues:** #503 (F0), #504 (F1), #508 (F5 code)
**Duración:** ~1 semana
**Output:** Código merged a `main`, contracts deployados

### 1.1 Contract extensions (#503) — Día 1-2

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `lib/growth/contracts.ts` o equivalente | Agregar tipos: `transcreate_de_from_es`, `transcreate_fr_from_es`, `transcreate_pt_br_from_es`, `create_de_new`, `create_fr_new`, `create_pt_br_new` |
| `packages/website-contract/src/schemas/growth-action.ts` | Extender schema Zod para aceptar las 6 nuevas acciones |
| `lib/seo/transcreate-workflow.ts` | Agregar `'de-DE'`, `'fr-FR'` al `LocaleTuple` type y todos los switches |
| Schemas de change sets y publication jobs | Extender para los 3 nuevos locales |
| Surfaces UI/status que asumen EN-US only | Buscar `en-US` hardcoded, reemplazar por lista dinámica |

**Checklist:**
- [ ] Types actualizados en contracts
- [ ] Zod schemas aceptan nuevas acciones
- [ ] `LocaleTuple` type extendido
- [ ] Switches de locale no tienen branches EN-US-only
- [ ] UI surfaces no asumen EN-US
- [ ] Contract tests PASS para 6 nuevas acciones

### 1.2 Technical SEO routing (#504) — Día 2-4

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `lib/seo/locale-routing.ts` | Agregar `'fr'`, `'de'` a `resolveLocaleFromPublicPath()`, `buildPublicLocalizedPath()`, `localeToOgLocale()` |
| `lib/seo/hreflang.ts` | Verificar que `generateHreflangLinks()` no excluye `fr-FR`/`de-DE`/`pt-BR` |
| `middleware.ts` | Extender path-prefix routing para `/fr/`, `/de/`. `/pt/` ya existe? confirmar |
| `app/sitemap.xml/route.ts` | State-based sitemap gate: excluir `draft`, `review`, `keep_hidden`, `block` |
| `lib/seo/public-metadata.ts` | `resolvePublicMetadataLocale()` para los 3 nuevos locales |
| `lib/site/public-ui-messages.ts` | Agregar `fr-FR`, `de-DE` a `SUPPORTED_PUBLIC_UI_LOCALES` si no existen |

**Checklist:**
- [ ] `/pt/`, `/fr/`, `/de/` resuelven sin romper ES/EN
- [ ] `html[lang]` = `pt-BR`, `fr-FR`, `de-DE` en SSR
- [ ] Canonical self-referential por locale
- [ ] Hreflang tags recíprocos entre locales applied/published
- [ ] Sitemap excluye estados pre-verification
- [ ] E2E `hreflang-canonical.spec.ts` extiende cobertura

### 1.3 Post-publish verification agent (#508 code) — Día 4-5

**Archivos nuevos:**

| Archivo | Propósito |
|---------|-----------|
| `lib/seo/post-publish-verifier.ts` | Verifier agent: checklist engine con checks individuales |
| `lib/seo/verification-types.ts` | Tipos: `VerificationCheck`, `VerificationResult`, `VerificationStatus` |
| `app/api/seo/transcreation/verify/route.ts` | API endpoint para trigger verification manual o automática |

**Checklist de verificación (implementar en `post-publish-verifier.ts`):**

```typescript
type VerificationCheck = {
  name: string;
  critical: boolean; // Si falla → FAIL inmediato
  run: (url: string, locale: string) => Promise<CheckResult>;
};

const CHECKS: VerificationCheck[] = [
  { name: 'http_200', critical: true, run: checkHttp200 },
  { name: 'no_fallback_content', critical: true, run: checkNoFallback },
  { name: 'html_lang', critical: true, run: checkHtmlLang },
  { name: 'canonical_self', critical: true, run: checkCanonicalSelf },
  { name: 'hreflang_reciprocal', critical: true, run: checkHreflang },
  { name: 'indexability', critical: true, run: checkIndexability },
  { name: 'body_language', critical: true, run: checkBodyLanguage },
  { name: 'title_tag', critical: false, run: checkTitleTag },
  { name: 'meta_description', critical: false, run: checkMetaDesc },
  { name: 'h1_tag', critical: false, run: checkH1 },
  { name: 'jsonld_inLanguage', critical: false, run: checkJsonLd },
  { name: 'sitemap_state', critical: false, run: checkSitemapState },
  { name: 'cta_visible', critical: false, run: checkCtaVisible },
  { name: 'tracking_payload', critical: false, run: checkTracking },
];
```

**Resultado:**
- **PASS** → habilita sitemap + hreflang exposure
- **WARN** → habilita sitemap, flag para revisión programada
- **FAIL** → no sitemap, no hreflang, item retorna a `review`/`keep_hidden`/`block`

**Evidencia:**
```typescript
type VerificationRecord = {
  id: string;
  url: string;
  locale: string;
  timestamp: string;
  status: 'pass' | 'warn' | 'fail';
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  sitemap_eligible: boolean;
  hreflang_eligible: boolean;
};
```

---

## SPRINT 2: Content Operations (Rol 2)

**Issues:** #505 (F2), #506 (F3), #507 (F4)
**Duración:** ~1 semana
**Output:** Inventory publicado, P0 drafts listos, gates definidos

### 2.1 Inventory + matrix (#505) — Día 1-2

**Acciones:**
1. Exportar catálogo completo de ColombiaTours:
   - Website pages (home, about, contact, etc.)
   - Packages (package_kits + package_kit_versions)
   - Destinations
   - Activities (activas comercialmente)
   - Support content que linkee a money pages
2. Para cada candidato, determinar por DE/FR/PT-BR:
   - Keyword evidence (DataForSEO volume check)
   - Intención (info / transactional / navigational)
   - Valor de negocio
   - Acción: `transcreate_from_es`, `create_new`, `keep_hidden`, `block`
   - Prioridad (P0/P1/P2)

**Output:** `docs/seo/transcreation-inventory-ralph.md`

### 2.2 Batch 1 P0 drafts (#506) — Día 2-4

**Tope:** 9 URLs P0 (máximo — respeta rate limit 10/día/locale)

**Prioridad sugerida (confirmar con data):**

| # | Tipo | Prioridad | Por qué |
|---|------|-----------|---------|
| 1 | Package estrella | P0 | Mayor volumen transaccional |
| 2 | Destination landing | P0 | Alto tráfico informacional |
| 3 | Homepage localized | P0 | Entry point del mercado |
| 4 | Activity top | P0 | Intención transaccional |
| 5-9 | Product pages | P0 | Según inventory |

**Por cada draft:**
- DataForSEO volume check
- GSC evidence (si existe)
- SERP top-10 brief del mercado target
- Contenido: title, meta, H1, body, FAQ, CTA, schema fields, alt text, slug
- Draft permanece hidden de sitemap e indexabilidad

### 2.3 Review and publish gates (#507) — Día 4-5

**Gates de revisión (cada draft pasa por):**

1. **Calidad nativa** — ¿el texto suena natural en DE/FR/PT-BR? (native speaker o AI con instrucción estricta)
2. **SERP fit** — ¿este contenido puede rankear en el mercado target?
3. **Valor ColombiaTours** — ¿aporta algo específico de la agencia o es genérico?
4. **CTA apta** — ¿WhatsApp/teléfono funciona para ese mercado? ¿horarios?
5. **Schema correcto** — Product, FAQ, Article según tipo de página
6. **Riesgo** — ¿claims no soportados? (ej: "mejor precio garantizado" en mercado nuevo)

**Resolución posible:** `draft`, `review`, `publish`, `watch`, `keep_hidden`, `block`

**Regla:** P0 commercial pages no pueden saltar review.

---

## SPRINT 3-4: Rollout + Verification + Monitoring

**Issues:** #508 (F5 verify exec), #509 (F6), #510 (F7)
**Duración:** ~2 semanas
**Output:** URLs publicadas y verificadas, monitoreo activo

### 3.1 Post-publish verification execution (#508)

**Por cada URL publicada (de Batch 1):**
1. Trigger verifier agent
2. Si FAIL → item vuelve a review con reporte de qué check falló
3. Si PASS → habilitar sitemap, hreflang exposure
4. Registrar `VerificationRecord` como evidencia

**Automatización:**
- Script `scripts/seo/verify-transcreated-urls.mjs`
- O integración en Growth Orchestrator como step post-publish

### 3.2 Batch 2 product/destination rollout (#509)

**Orden confirmado:**
1. Cartagena (paquete + destino)
2. San Andrés
3. Eje Cafetero
4. Medellín + Guatapé
5. Santa Marta / Tayrona
6. *Bloqueado:* Santander / San Gil / Barichara (espera package-led source)

**Regla:** Cada item pasa mismo pipeline: evidence → draft → review → publish → **verify** → sitemap

### 3.3 Monitoring (#510)

**Schedule por URL publicada:**
- Day 7: GSC discovery check, impressions baseline
- Day 21: CTR analysis, query fit review
- Day 45: Full readout: impressions, CTR, CTA health, qualified leads

**Paid-test URLs:** Day 7 + Day 14 readouts antes de escalar spend

**Métricas tracked:**
| Métrica | Fuente |
|---------|--------|
| GSC discovery | Google Search Console |
| Impressions + CTR | GSC |
| Query fit | GSC queries vs contenido servido |
| CTA health | GA4 / funnel events |
| Qualified leads | CRM por locale |
| Title/meta adjustments | Manual review |

---

## Dependencias Externas

| Dependencia | Para | Riesgo |
|-------------|------|--------|
| DataForSEO API key activa | Volume check en F2/F3 | Media — sin esto no hay demand evidence |
| Native speaker DE/FR/PT-BR | Review gate F4 | Alta — calidad nativa sin speaker es riesgo |
| GSC data de ColombiaTours | Evidence en F3/F7 | Baja — ya existe |
| Supabase migrations (si aplican) | Nuevos campos en tablas | Baja — schema actual soporta |

---

## Riesgos del Sprint

| Riesgo | Prob | Impacto | Mitigación |
|--------|------|---------|------------|
| Rate limit frena Batch 1 | Alta | Medio | Distribuir en ventanas de 10/día, priorizar P0, arrancar early |
| Calidad DE/FR/PT-BR insuficiente | Media | Alto | Review gate con validación nativa; loop `needs_retranslation` |
| Verifier encuentra errores en lote | Media | Medio | Esperado. Batch 1 es el que entrena el pipeline. No panic. |
| Sin native speaker para review | Alta | Alto | Usar AI con instrucción estricta de "native quality" + checklist explícito |
| Tracking sin locale en eventos | Baja | Medio | Verifier check #14 detecta, F5 bloquea hasta fix |

---

## Definition of Ready (para cerrar Ralph)

- [ ] Contracts extendidos y deployados (#503)
- [ ] Routing técnico para DE/FR/PT-BR operativo (#504)
- [ ] Inventory + matrix publicado (#505)
- [ ] Batch 1 P0 drafts con evidence packs (#506)
- [ ] Review gates ejecutados para Batch 1 (#507)
- [ ] Verifier agent code merged (#508 code)
- [ ] Verificación post-publish ejecutada para Batch 1 (#508 exec)
- [ ] Batch 2 rollout iniciado (#509)
- [ ] Monitoring schedule activo (#510)