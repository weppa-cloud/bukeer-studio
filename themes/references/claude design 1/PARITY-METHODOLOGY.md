# Parity Methodology — ColombiaTours (design ref → local)

**Objetivo:** 98% paridad visual 1:1 entre diseño referencia y sitio ColombiaTours local, preservando el theme "claro" y manteniendo el contenido dinámico fluyendo desde DB (Flutter catálogo + Studio overrides + auto-computado). **No hardcode** de datos que deberían ser dinámicos.

**Fecha:** 2026-04-21
**Scope:** pilot ColombiaTours (EPIC #214 + EPIC #250)
**SSOT componentes:** [`docs/product/product-detail-matrix.md`](../../../docs/product/product-detail-matrix.md) (48 rows + sección P blog + sección M booking DEFER)

---

## Artefactos de referencia

```
themes/references/claude design 1/project/
├── ColombiaTours Fase 1.html     ← golden HTML (home + modal + nav)
├── ColombiaTours Destinos.html   ← golden HTML (destino detail)
├── ColombiaTours Switcher.html   ← golden HTML (market/currency switcher)
├── styles.css                     ← tokens golden (paletas caribe/andes/selva/cafe × densidades snug/roomy/airy)
├── sections.jsx                   ← home sections
├── details.jsx                    ← package detail sections
├── experiences.jsx                ← activities list + detail
├── planners.jsx                   ← planners index + detail
├── blog.jsx                       ← blog index + detail
├── pages.jsx                      ← wrappers
├── primitives.jsx                 ← chip, button, card, eyebrow base
├── waflow.jsx                     ← WhatsApp Flow modal
├── switcher.jsx                   ← market/currency switcher
├── app.jsx / app_f1.jsx           ← router
└── screenshots/                   ← 9 capturas full-page del golden
    ├── 01-home-desktop-fullpage.png
    ├── 02-package-detail-caribe-esencial.pdf
    ├── 03-package-detail-caribe-esencial-fullpage.png
    ├── 04-activities-list-fullpage.png
    ├── 05-activity-detail-cocora-fullpage.png
    ├── 06-planners-team-fullpage.png
    ├── 07-blog-historias-fullpage.png
    ├── 08-planner-detail-andres-fullpage.png
    └── 09-modal-planner-chat.png   (pendiente re-cap)
```

---

## Principios

1. **Theme "claro" se preserva.** Paleta caribe default (`seedColor #0e5b5b`, coral `#e85c3c`, yellow `#f3b13b`, leaf `#6ea842`, cream warm `#fffaf0`). No overrides sin aprobación.
2. **Contenido dinámico = dinámico.** Toda fila de la matriz 48 debe leer de su origen documentado (Flutter DB, Studio override, auto-computed, Google Places, IA). Nunca hardcode en component salvo ⬛ fallback explícito.
3. **Experience 1:1 con diseño.** Markup, jerarquía, chips, spacing, motion — coinciden con golden (`styles.css` + `*.jsx`).
4. **Flag-gated rollout.** `theme_designer_v1_enabled` + `studio_editor_v2` controlan surface; default off; rollback con `pilot_theme_snapshots` (ADR-027).
5. **Booking V1 queda fuera del scope pilot** (ADR-024 DEFER). Sección M del matriz se computa fuera del denominador de parity.
6. **Hotels as-is** (ADR-025). Marketing retiene Flutter-only; solo SEO meta editable via Studio.

---

## 5 fases

### Fase 1 — Theme tokens (design system layer)

**Fuente golden:** `themes/references/claude design 1/project/styles.css` (root vars + `[data-palette="X"]` + `[data-density="X"]`).

**Local:** `packages/theme-sdk/src/presets/colombia-presets.ts::COLOMBIA_CARIBE_PRESET`.

**Checklist:**
- [ ] Colores: `seedColor, secondary, accent2, tertiary, surfaceWarm` = ref.
- [ ] Typography: Bricolage Grotesque (display) + Inter (body) + Instrument Serif italic (`.serif`).
- [ ] Type scale: `display-xl..body-md` + `.label` + eyebrow mono-sm.
- [ ] Shape: `radius.lg`, `buttonRadius: full`, `cardRadius: xl`.
- [ ] Spacing: `baseUnit: 4px`, density roomy (`sp-1:8, sp-4:24, sp-6:48, section-py:112`).
- [ ] Motion: `duration:250ms`, easing `cubic-bezier(.2,.7,.2,1)`.
- [ ] **Pendiente (gated):** 4 paletas (caribe/andes/selva/cafe) + 3 densities (snug/roomy/airy) via `data-palette` / `data-density`. Solo aplica si cliente aprueba scope.

**Verificación:** DevTools → inspeccionar hero H1, eyebrow, chip, card → comparar computed styles vs ref.

---

### Fase 2 — Section parity (visual component layer)

Para cada pantalla, por sección, validar que el componente local iguala al ref en markup + jerarquía + motion.

| Pantalla | Entry point local | Componentes de ref involucrados |
|---|---|---|
| Home | `app/site/[subdomain]/page.tsx` + `components/site/sections/*` | `sections.jsx` (hero, destinations, packages, activities, hotels, testimonials, stats, cta, faq) |
| Package detail | `app/site/[subdomain]/paquetes/[slug]/page.tsx` + `components/site/product-detail/p2/*` | `details.jsx` (hero slider, galería, pricing sticky, itinerary day-by-day) |
| Activities list | `app/site/[subdomain]/experiencias/page.tsx` | `experiences.jsx` (filter bar, grid, featured) |
| Activity detail | `app/site/[subdomain]/[...slug]/page.tsx` (product_type=activity) + `product-detail/p2/*` | `experiences.jsx` (hero + programa timeline + booking widget) |
| Planners index | `app/site/[subdomain]/planners/page.tsx` | `planners.jsx` (hero + grid 6 planners + stats) |
| Planner detail | `app/site/[subdomain]/planners/[slug]/page.tsx` | `planners.jsx` (avatar + chips + stats + about + viaje firma + otros paquetes + reviews) |
| Blog index | `app/site/[subdomain]/blog/page.tsx` | `blog.jsx` (hero + feature post + grid categorías) |
| Blog detail | `app/site/[subdomain]/blog/[slug]/page.tsx` | `blog.jsx` (article layout) |
| Modal planner chat | overlay global | `waflow.jsx` (wizard — destino/timing/pax/interés/name/whatsapp) |

**Checklist por sección:**
- [ ] ¿Componente existe en repo?
- [ ] ¿Markup 1:1 (H1, eyebrow, chips, grid cols, card structure)?
- [ ] ¿Motion/animations coinciden?
- [ ] ¿Edge cases cubiertos (empty state, long text, many items)?

---

### Fase 3 — Dynamic content wiring (matriz 48 rows)

**Principio:** cada fila lee de su origen documentado. Si falta data, renderer condicional esconde la sección (ver "fantasma sections" en matriz).

**Workflow:**
1. Abrir `docs/product/product-detail-matrix.md`.
2. Por columna aplicable (`Act` / `Pkg` / `Hotel`) confirmar que:
   - 🟦 Flutter: SSR read pulla el campo.
   - 🟡-flag Studio: editor escribe + renderer lee `product_page_customizations.*`.
   - 🟥 computed: deriva runtime (regex, geocoding, JSON-LD).
   - 🟩 Google: Places API gate por `account.google_reviews_enabled`.
   - 🟪 IA: F3 pipeline (packages only).
   - ⬛ hardcoded: fallback solo cuando data ausente.
3. Confirmar rows **excluidas** del scope pilot:
   - Sección M (booking) 🚫 DEFER (ADR-024).
   - Hotel marketing 🚫 as-is (ADR-025), excepto SEO meta.

**Regla oro:** Si un componente hardcodea algo que debería ser dinámico → **bug de wiring, no de diseño**. Fix = conectar fuente, no modificar design.

---

### Fase 4 — Auditoría side-by-side per screen

Workflow reproducible por pantalla (8 pantallas):

```bash
# 1. Claim session slot
eval "$(bash scripts/session-acquire.sh)"
# exports: SESSION_NAME, PORT, _ACQUIRED_SESSION

# 2. Build + dev server
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"

# 3. Seed pilot data
npm run seed:pilot -- baseline        # o TS helper: seedPilot('baseline')

# 4. Capture cada pantalla vía Playwright MCP
#    browser_navigate http://localhost:$PORT/site/colombiatours/
#    browser_take_screenshot fullPage:true filename:screenshots/LOCAL-01-home.png
#    [repetir por cada URL]

# 5. Release slot
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

**Estructura de capturas:**
```
themes/references/claude design 1/project/screenshots/
├── 01-home-desktop-fullpage.png           ← ref
├── LOCAL-01-home-desktop-fullpage.png     ← local
├── 03-package-detail-caribe-esencial-fullpage.png
├── LOCAL-03-package-detail-caribe-esencial.png
├── ... (pares ref/LOCAL por pantalla)
```

**Tabla gaps (en `PARITY-AUDIT-YYYY-MM-DD.md`):**

| Gap | Ref (screen:area) | Local (diff) | Matriz row | Severity | Owner | Fix path |
|---|---|---|---|---|---|---|
| P1 = bloquea pilot | 01:hero-eyebrow | falta monospace-sm | — | P1 | theme-sdk | `packages/theme-sdk/src/presets/colombia-presets.ts` |
| P2 = visual polish | 03:pricing-sticky | no sticky on scroll | #16 | P2 | site-component | `components/site/product-detail/p2/pricing-sidebar.tsx` |
| P3 = nice-to-have | … | … | … | P3 | … | … |

**Severity:**
- **P1** — bloquea sign-off pilot (componente faltante, data no fluye, experience roto).
- **P2** — visual polish (spacing, typography weight, motion off).
- **P3** — nice-to-have (extra paletas, extra density, animaciones secundarias).

**Owner:**
- `theme-sdk` — tokens / preset.
- `site-component` — `components/site/**`.
- `product-detail` — `components/site/product-detail/p2/**`.
- `waflow` — `components/site/waflow/**`.
- `contract` — Zod schemas.
- `flutter` — campo catalog upstream (abrir issue en `weppa-cloud/bukeer-flutter`).
- `data-wiring` — SSR query / mapping falla.

---

### Fase 5 — Validation 98% gate

**Automated (W6 #220 E2E specs):**
- `e2e/tests/pilot/matrix/pilot-matrix-public-package.spec.ts` — 48 rows applicable a `pkg`.
- `e2e/tests/pilot/matrix/pilot-matrix-public-activity.spec.ts` — 48 rows applicable a `act` + W2 editable loop.
- `e2e/tests/pilot/matrix/pilot-matrix-public-hotel.spec.ts` — rows applicable a `hotel` (read-only).
- `e2e/tests/pilot/matrix/pilot-matrix-public-blog.spec.ts` — sección P rows + hreflang + JSON-LD Article.
- `e2e/tests/pilot/lighthouse/pilot-lighthouse-{package,activity,hotel,blog}.spec.ts` — thresholds en `lighthouserc.pilot.js`.

**Comando:**
```bash
npm run session:run -- e2e/tests/pilot/matrix/ e2e/tests/pilot/lighthouse/ --grep "@pilot-w6"
bash scripts/lighthouse-ci.sh        # per-screen, session-pool-aware
```

**Manual:**
- Inspección lado-a-lado (audit doc) → P1 = 0 pendientes.
- Visual regression snapshot match.

**Score:**
```
parity_score = (matriz_rows_ok + visual_sections_ok) / (rows_aplicables + secciones_totales)
```
Denominador excluye:
- Sección M rows (booking DEFER).
- Hotel marketing rows (as-is).

Target: **≥ 98%**. Si < 98% → audit doc lista P1/P2 pendientes, no sign-off.

---

## Anti-patterns

- ❌ Hardcode de nombres de destinos, stats, testimonios → deben venir de DB.
- ❌ Modificar el diseño para "facilitar" la implementación.
- ❌ Crear componentes nuevos cuando el registry ya tiene equivalentes (`SECTION_TYPES`).
- ❌ Saltarse la matriz 48 rows (cada fila debe validarse).
- ❌ Wire booking V1 (violaría ADR-024).
- ❌ Editar tokens del preset sin PR aprobado (EPIC #250 lock).
- ❌ Correr `npm run dev` en :3000 desde un agente (viola session pool rules).

---

## Escalation path

- Gap que requiere cambio de tokens preset → PR contra `packages/theme-sdk/src/presets/colombia-presets.ts` + snapshot rollback `pilot_theme_snapshots`.
- Gap que requiere nuevo SECTION_TYPE → PR contra `packages/website-contract/src/types/section.ts` + migration + renderer.
- Gap que requiere campo nuevo en DB → issue en `weppa-cloud/bukeer-flutter` + migration + matrix row update.
- Gap que requiere editor Studio nuevo → scope post-pilot (a menos que W2/W4/W5/W6 ya lo cubran).

---

## Referencias

- [[ADR-024-booking-v1-pilot-scope]] — Booking DEFER
- [[ADR-025-studio-flutter-field-ownership]] — Studio/Flutter ownership
- [[ADR-027]] — theme_designer_v1 rollout + snapshot rollback
- [`docs/product/product-detail-matrix.md`](../../../docs/product/product-detail-matrix.md) — 48 rows SSOT
- [`docs/qa/pilot/matrix-playbook.md`](../../../docs/qa/pilot/matrix-playbook.md) — W6 spec playbook
- [`docs/development/local-sessions.md`](../../../docs/development/local-sessions.md) — session pool
- [EPIC #250](https://github.com/weppa-cloud/bukeer-studio/issues/250) — Designer Reference Theme ColombiaTours
- [EPIC #214](https://github.com/weppa-cloud/bukeer-studio/issues/214) — Pilot readiness
