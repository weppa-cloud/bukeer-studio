# Global Transcreation — Plan Operativo

**Epic:** [#502](https://github.com/weppa-cloud/bukeer-studio/issues/502) — Global multilingual transcreation for ColombiaTours DE/FR/PT-BR
**Spec:** `docs/specs/SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO.md`

---

## Fases y Dependencias

```
F0 ──→ F1 ──→ F2 ──→ F3 ──→ F4 ──→ F5 ──→ F6 ──→ F7
Contract    SEO     Inv.   Drafts  Gates  Verify Rollout Monitor
          Routing  Matrix                  [GATE]
```

| Fase | ID | Depende de | Rol | Estimación |
|------|----|-----------|-----|------------|
| F0 — Multilocale transcreation contract | #503 | — | Rol 1 | S |
| F1 — Technical SEO routing, hreflang, sitemap | #504 | F0 | Rol 1 | M |
| F2 — Source inventory and prioritization matrix | #505 | — | Rol 2 | M |
| F3 — Batch 1 P0 money page drafts | #506 | F0, F1, F2 | Rol 2 | L |
| F4 — Strict/native review and publish gates | #507 | F3 | Rol 2 | M |
| **F5 — Post-publish verification** | **#508** | **F4** | **Rol 1** | **M** |
| F6 — Batch 2 product/destination rollout | #509 | F5, F4 | Rol 2 | L |
| F7 — Monitoring and optimization | #510 | F5 | Rol 2 | M |

**Nota:** F2 (inventory) corre en paralelo con F0/F1. No espera.

---

## Ejecución Detallada

### F0 — Multilocale Transcreation Contract (#503)

**Qué:** Extender contracts de Growth OS/Growth Hermes para aceptar acciones DE/FR/PT-BR.

**Tareas:**
1. Agregar acciones: `transcreate_de_from_es`, `transcreate_fr_from_es`, `transcreate_pt_br_from_es`, `create_de_new`, `create_fr_new`, `create_pt_br_new` a schemas de validación
2. Extender work items, change sets, publication jobs para soportar los nuevos locales
3. Actualizar surfaces UI/status donde asumen EN-US only
4. Contract tests para nuevas acciones y estados de publicación
5. Verificar que tablas truth siguen read-only para transcreation writes

**Verificación:** Contract tests PASS para los 6 nuevos tipos de acción.

---

### F1 — Technical SEO Routing, Hreflang, Sitemap (#504)

**Qué:** Infraestructura técnica para servir DE/FR/PT-BR con routing correcto.

**Tareas:**
1. Extender middleware `resolveLocaleFromPublicPath()` para `/pt/`, `/fr/`, `/de/`
2. Configurar `html[lang]` → `pt-BR`, `fr-FR`, `de-DE` en SSR
3. Canonical self-referential por locale
4. Hreflang recíproco para locales applied/published
5. Sitemap gate: estados `draft`, `review`, `keep_hidden`, `block` → excluidos de sitemap
6. Published pages → sitemap-eligible solo si post-publish verification PASS

**Verificación:** E2E `hreflang-canonical.spec.ts` cubre los 3 nuevos locales.

---

### F2 — Source Inventory and Prioritization Matrix (#505)

**Qué:** Catálogo completo de contenido a transcrear.

**Tareas:**
1. Crawl/export de páginas existentes: website pages, packages, destinations, activities, support content
2. Matriz por DE/FR/PT-BR con columnas: source URL, target URL, market, locale, keyword evidence, intent, business value, action, priority, publish decision
3. Cada candidato sin demand evidence → `keep_hidden` o `block` con razón explícita

**Output:** Matrix publicada en `docs/seo/transcreation-inventory-2026-05.md`

---

### F3 — Batch 1 P0 Money Page Drafts (#506)

**Qué:** Drafts de hasta 9 URLs P0.

**Tareas:**
1. Seleccionar máx 9 URLs P0 de la matriz (mayor potencial comercial)
2. Para cada una:
   - DataForSEO volume check target market
   - GSC evidence si existe
   - SERP top-10 brief
   - Draft: title, meta, H1, body, FAQ, CTA, schema fields, alt text, slug
3. Drafts permanecen hidden de sitemap/indexabilidad hasta gates

**Output:** 9 evidence packs + drafts (máximo). Rate limit: 10/día/locale.

---

### F4 — Strict/Native Review and Publish Gates (#507)

**Qué:** Revisión humana/automática antes de publicar.

**Tareas:**
1. Review gate valida:
   - Calidad de lengua nativa
   - SERP fit (¿esto compite en el mercado target?)
   - Valor específico ColombiaTours (no genérico)
   - CTA apta para mercado
   - Schema correcto
   - Riesgo de claims no soportados
2. Resolución: `draft`, `review`, `publish`, `watch`, `keep_hidden`, `block`
3. P0 commercial pages **no pueden saltar review** antes de apply/publish
4. Blocked/hidden items → no indexables, no sitemap

---

### F5 — Post-Publish Verification and Google Visibility (#508) ← GATE

**Qué:** Verificación técnica y de contenido de cada URL publicada.

**Tareas:**
1. Implementar Verifier Agent que ejecuta checklist post-publish:
   - HTTP 200
   - No fallback content (body no es copia literal de source)
   - `html[lang]` correcto
   - Canonical self-referential
   - Hreflang recíproco
   - Indexabilidad correcta
   - No listado en sitemap prematuramente
   - Title/meta/H1 en idioma target
   - Body text — sin leaks del source locale
   - JSON-LD con `inLanguage` correcto
   - CTA visible y funcional
   - Tracking: WhatsApp/WAFlow events preservan locale, market, reference_code, UTMs, click IDs, Meta IDs
2. FAIL → mover a review/watch/keep_hidden/block + prevenir sitemap
3. Evidencia: timestamp, URL, status, resultado de cada check

**Verificación:** Cada URL publicada tiene registro de verificación antes de issue closure.

---

### F6 — Batch 2 Product/Destination Rollout (#509)

**Qué:** Rollout secuencial de productos y destinos.

**Orden:** Cartagena → San Andrés → Eje Cafetero → Medellín + Guatapé → Santa Marta/Tayrona
**Bloqueado:** Santander/San Gil/Barichara espera source en español con package.

**Reglas:**
- Product/package changes → SEO overlays únicamente
- Nunca mutar catalog truth fields
- Cada item pasa mismo pipeline de evidence → review → publish → **verify** → monitor

---

### F7 — Monitoring and Optimization (#510)

**Qué:** Ventanas de monitoreo post-publicación.

**Tareas:**
1. Schedule day 7, day 21, day 45 readouts por URL publicada
2. Paid-test URLs: day 7 + day 14 readouts antes de escalar spend
3. CRM quality tracking por locale y market (donde funnel events existan)

**Métricas:**
- GSC discovery, impressions, CTR
- Query fit (search queries vs contenido)
- CTA health (clicks, conversiones)
- Qualified lead signal por locale
- Title/meta/internal-link adjustments necesarios

---

## Infraestructura Existente

Todo esto extiende lo ya shipped:

| Componente | Archivo / ADR |
|------------|---------------|
| Path-prefix routing | ADR-019 |
| Hreflang emission | ADR-020 |
| TM + glossary + AI pipeline | ADR-021 |
| Job lifecycle state machine | `lib/seo/transcreate-workflow.ts` |
| Rate limit (10/día/locale) | `lib/seo/transcreate-rate-limit.ts` |
| Glossary enforcement | `lib/seo/transcreate-workflow.ts` |
| Dashboard + coverage matrix | `app/dashboard/[w]/translations/` |
| Transcreation v1 workflow | `runtime/growth-orchestrator/workflows/transcreation.v1.md` |
| Multi-locale infra doc | `docs/seo/multi-locale-transcreation-infrastructure.md` |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Calidad DE/FR/PT-BR insuficiente | Media | Alto | Review gate con native speaker; `needs_retranslation` loop |
| Rate limit frena Batch 1 | Alta | Medio | Distribuir drafts en ventanas de 10/día; priorizar P0 |
| Canonical/hreflang mal generados | Baja | Alto | E2E tests `hreflang-canonical.spec.ts` extendidos |
| Fallback content (EN leak) | Media | Medio | Verifier check #2 (no fallback) es crítico |
| Sin demanda evidence para ciertos keywords | Alta | Bajo | `keep_hidden` hasta que DataForSEO muestre volumen |
| TRUTH_FIELD_DENYLIST violación | Baja | Crítico | Contract test + code review obligatorio en F0/F1 |