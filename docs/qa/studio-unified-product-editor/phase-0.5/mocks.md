# Phase 0.5 — UI Mocks

**Issue:** #192 (child of #190)
**Routes:**
- `/dashboard/[websiteId]/content-health` (global dashboard)
- Per-product: panel embebible en `/dashboard/[websiteId]/products/[slug]/content` (futura integración)

---

## Global dashboard layout

```
┌─ Salud del contenido ──────────────────── Filter ▼  Sort ▼ ─┐
│ 12 productos · mostrando 12                                 │
├─────────────────────────────────────────────────────────────┤
│ Producto                │ Tipo     │ Score    │ Vacías │ IA│
├─────────────────────────┼──────────┼──────────┼────────┼───┤
│ Tour Islas del Rosario  │ activity │ [45/100] │   6    │ 0 │
│ Hotel Casa del Mar      │ hotel    │ [85/100] │   1    │ 0 │
│ Paquete Caribe 5 días   │ package  │ [72/100] │   3    │ 2 │
└─────────────────────────────────────────────────────────────┘
```

- Score cell: `<ContentHealthScore variant="inline">` (pill colored).
- Link en nombre → `/products/[slug]/content`.
- Filtros: Todos · Score <60 · Score ≥80.
- Sort: Score ↑/↓ · Nombre A-Z · Vacías ↓.
- Empty state: "Este website aún no tiene productos…".

Baselines: `dashboard-{empty,filled}.png`

---

## Per-product panel (futura integración Phase 0.5 b)

```
┌─ Salud del contenido ──────────────────────────────────────┐
│                                                             │
│      ┌──────────┐                                           │
│      │    72    │    📊  72/100 · 3 vacías · 2 IA 🔓         │
│      │  score   │                                           │
│      └──────────┘                                           │
│                                                             │
│  Secciones vacías                       3 pendientes        │
│  ─────────────────────────                                  │
│  ⚠  Highlights                  Agregar highlights →        │
│     Motivo: vacío                                           │
│  ⚠  Video                       Agregar URL del video →     │
│     Motivo: vacío                                           │
│  ⚠  Galería                     (sin CTA)                   │
│     Motivo: datos insuficientes                             │
│                                                             │
│  Campos generados por IA                                    │
│  ─────────────────────────                                  │
│  🔓 description                            [ Abierto ◯ ]    │
│     Generado: 15/04/2026                                    │
│  🔒 highlights                             [ Bloqueado ● ]  │
│     Generado: 10/04/2026                                    │
└─────────────────────────────────────────────────────────────┘
```

Baselines: `score-{green,yellow,red,inline}.png`, `ghost-sections-list-{empty,filled}.png`, `ai-flags-panel-filled.png`.

---

## `<DataSourceBadge>` — 7 sources

```
🟦 Flutter      catálogo
🟨 Studio       página
🟪 IA           generado
🟫 Agregado     paquete hijos
🟥 Computado    derivado
🟩 Google       places/reviews
⬛ Default      hardcoded
```

- Aria-label: `Fuente: <label>`.
- Tooltip en hover (via `title` attribute).
- Variant `compact`: solo dot, sin texto.

Baseline: `data-source-badge-all.png`

---

## `<FieldTooltipExplainer>`

Popover contextual (aparece en hover/click del badge):

```
┌───────────────────────────────────────┐
│ Precio Desde              [🟥 Computado] │
│ Derivado automáticamente — no         │
│ editable directo.                     │
│ ┌───────────────────────────────┐     │
│ │ min(options[].prices)         │     │
│ └───────────────────────────────┘     │
└───────────────────────────────────────┘
```

Baseline: `field-tooltip-computed.png`

---

## Score formula (surface en RPC)

```
required_fields (40 pts / 8 each):
  name, description ≥80ch, image, price, slug

marketing_fields (30 pts / 6 each):
  highlights, inclusions, exclusions, gallery ≥2, video

seo_fields (15 pts / 5 each):
  custom_seo_title, custom_seo_description, social_image

penalties:
  ghost × 2 (cap -20)

bonuses (TBD Phase 2):
  AI locked field +0.5 (cap +5)

clamp [0, 100]
```

Computed en `compute_content_health_score(p_product_id)` RPC.

---

## API surface

| Endpoint | Method | Schema |
|----------|--------|--------|
| `/api/content/health/[productId]` | GET | `ContentHealthSchema` |
| `/api/content/health/website/[websiteId]?limit&offset&min_score&max_score` | GET | `ContentHealthListSchema` |
| `/api/products/[id]/ai-flags` | PATCH | `AiFlagsUpdateRequestSchema` |

Todas respuestas siguen [[ADR-012]] envelope (`{ success, data }`).

---

## Estados cubiertos por CT (32 tests)

| Componente | empty | filled | readOnly | variants | visuales |
|------------|:-----:|:------:|:--------:|:--------:|:--------:|
| Score | — | ✅ × 3 colors | — | inline + circular | 4 |
| DataSourceBadge | — | ✅ × 7 sources | — | compact | 1 |
| GhostSectionsList | ✅ | ✅ | — | con/sin CTA | 2 |
| AiFlagsPanel | ✅ | ✅ | ✅ | — | 1 |
| Dashboard | ✅ | ✅ | — | filter/sort | 2 |
| FieldTooltipExplainer | — | ✅ × 3 sources | — | con fórmula | 1 |

32 CT + 11 visual baselines capturadas.

---

## Backlog Phase 2 / 0.5 b

Items NO cubiertos por esta fase, documentados para continuidad:

- [ ] Materialized view `product_content_health_mv` + cron refresh 60min (R2)
- [ ] Score weights configurables (env / tabla)
- [ ] Batch "Optimizar N productos" (flujo masivo)
- [ ] `<HealthBadge>` primitive extracción (DRY con MediaHealth/IntegrationHealth)
- [ ] Deep-link scroll + focus restoration post-navigation
- [ ] Observabilidad: log de bulk actions + estimated cost
- [ ] Integración panel per-producto al content editor route

---

## A11y checklist manual

Todas las CT verifican:
- ✓ Role + aria-label en score + dashboard
- ✓ Links/buttons keyboard accessible
- ✓ Contraste WCAG AA (green/yellow/red + all badge variants)

Pendiente manual:
- [ ] Screen reader anuncia score change
- [ ] Focus ring visible en todos los CTAs
- [ ] Reduce motion respeta `prefers-reduced-motion`

---

## Referencias

- Parent EPIC: [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190)
- Issue: [#192](https://github.com/weppa-cloud/bukeer-studio/issues/192)
- Convención CT: `docs/qa/studio-unified-product-editor/fixtures-convention.md`
- ADR: [[ADR-023]] Playwright CT + visual regression
- Migration: `supabase/migrations/20260425000000_content_health_rpc.sql`
