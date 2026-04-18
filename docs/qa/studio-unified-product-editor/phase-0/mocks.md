# Phase 0 — UI Mocks

**Issue:** #191 (child of #190)
**Route:** `/dashboard/[websiteId]/products/[slug]/content`

5 editors componen la página. Orden vertical, cada uno en card independiente.

---

## Layout macro

```
┌────────────────────────────────────────────────────────┐
│ header                                                 │
│  Website <id>                                          │
│  Contenido de "<slug>"                                 │
│  Personalización por landing…                          │
├────────────────────────────────────────────────────────┤
│ 1. <VideoUrlEditor>                                    │
├────────────────────────────────────────────────────────┤
│ 2. <HeroOverrideEditor>                                │
├────────────────────────────────────────────────────────┤
│ 3. <SectionVisibilityToggle>                           │
├────────────────────────────────────────────────────────┤
│ 4. <SectionsReorderEditor>                             │
├────────────────────────────────────────────────────────┤
│ 5. <CustomSectionsEditor>                              │
└────────────────────────────────────────────────────────┘
```

---

## 1. `<VideoUrlEditor>`

```
┌─ Video del producto ──────────────────────────────────┐
│                                                        │
│  URL del video                                         │
│  [https://youtube.com/watch?v=dQw4w9WgXcQ       ] [×] │
│  [YouTube]                                             │
│                                                        │
│  Título del video (opcional)                           │
│  [Así se vive el tour                         ]        │
│                                                        │
│  [ Guardar ]  [ Vista previa ]  [ Quitar video ]       │
└────────────────────────────────────────────────────────┘
```

- Badge cambia color por provider (YouTube rojo / Vimeo azul / MP4 verde / external gris + warning amber).
- "Vista previa" abre `<MediaLightbox type="video">` con iframe sandboxed.
- URL externa muestra: "URL no reconocida — se abrirá en nueva pestaña en lugar de lightbox".
- readOnly: card con texto "Solo lectura — no tienes permisos…".

Baselines: `video-url-editor-{empty,youtube,external}.png`

---

## 2. `<HeroOverrideEditor>`

```
┌─ Personalización del hero ────────────────────────────┐
│                                                        │
│  Sobrescribe título / subtítulo / imagen      [ ◯ ]   │
│  solo para esta landing                                │
│                                                        │
│  (si activo:)                                          │
│  ─────────────────────────────────────────             │
│  Título                                                │
│  [Custom Title…                              ]         │
│                                                        │
│  Subtítulo                                             │
│  [Custom sub…                                ]         │
│                                                        │
│  URL de imagen de hero                                 │
│  [https://…                                  ]         │
│  ┌───── preview 3:1 ─────────────────────┐             │
│  │                                       │             │
│  └───────────────────────────────────────┘             │
│                                                        │
│  [ Guardar ]  [ Restaurar default ]                    │
└────────────────────────────────────────────────────────┘
```

- Toggle `aria-pressed` controla visibilidad del form.
- Preview usa `<Image unoptimized>` (Cloudflare Workers compat).
- Empty value + toggle off = inactive (default).

Baselines: `hero-override-editor-{empty,filled,readonly}.png`

---

## 3. `<SectionVisibilityToggle>`

```
┌─ Visibilidad de secciones ────────────────────────────┐
│ Oculta secciones del landing sin afectar el producto. │
│                                                        │
│  Hero                                                  │
│  Cabecera con imagen…                       [ ● ]     │
│                                                        │
│  Highlights                                            │
│  Grid de beneficios destacados              [ ○ ]     │
│                                                        │
│  Galería                                               │
│  Imágenes del producto                      [ ● ]     │
│                                                        │
│  …                                                     │
└────────────────────────────────────────────────────────┘
```

- Toggle por fila (pressed = visible, not pressed = hidden).
- Lista generada por `useRenderableSections(productType)`.
- Activity → incluye recommendations, program_timeline, circuit_map_activity, options_table.
- Package → incluye circuit_map_package, day_by_day.
- Hotel → incluye amenities_grid, room_types.

Baselines: `section-visibility-toggle-{activity,package-hidden}.png`

---

## 4. `<SectionsReorderEditor>`

```
┌─ Orden de secciones ──────────────────────────────────┐
│ Arrastra o usa las flechas para reordenar.            │
│                                                        │
│  ⋮⋮  01  Hero                              [ ↑ ][ ↓ ] │
│  ⋮⋮  02  Highlights                        [ ↑ ][ ↓ ] │
│  ⋮⋮  03  Galería                           [ ↑ ][ ↓ ] │
│  ⋮⋮  04  Descripción                       [ ↑ ][ ↓ ] │
│  …                                                     │
└────────────────────────────────────────────────────────┘
```

- Drag-drop via `@dnd-kit/core` + `@dnd-kit/sortable`.
- Keyboard fallback: `↑`/`↓` botones (disabled en bordes).
- Auto-save tras reorder ("Guardado" badge emerald).
- ARIA-live region anuncia cambios.

Baselines: `sections-reorder-editor-activity.png`

---

## 5. `<CustomSectionsEditor>`

```
┌─ Secciones personalizadas ────────────────────────────┐
│ Inyecta bloques adicionales — máximo 20.              │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ [text]  Posición 1                  [Eliminar] │   │
│  │ <p>Hello</p>                                   │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │ [cta]   Posición 2                  [Eliminar] │   │
│  │ Reservar → https://…                           │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [ + Agregar sección ]                                 │
└────────────────────────────────────────────────────────┘
```

- Modal de creación: select de tipo (text/image_text/cta/spacer) + descripción helper.
- `renumberPositions()` re-numera al agregar/eliminar.
- Empty state: "Aún no hay secciones personalizadas."
- Cap @ 20 → botón "Agregar" disabled.

Baselines: `custom-sections-editor-{empty,filled}.png`

---

## Estados cubiertos por CT (28 tests)

| Editor | empty | filled | readOnly | visual variants |
|--------|:-----:|:------:|:--------:|:---------------:|
| Hero override | ✅ | ✅ | ✅ | 3 |
| Section visibility | ✅ | ✅ | ✅ | 2 |
| Sections reorder | ✅ | ✅ | ✅ | 1 |
| Custom sections | ✅ | ✅ | ✅ | 2 |
| Video URL | ✅ | ✅ (4×) | ✅ | 3 |

Estados NO cubiertos por CT (diferidos a E2E / Phase 0.5):
- `loading` — skeleton del editor cuando datos aún fetcheando (wrapped en Suspense a nivel page).
- `error` con onSave rechazado — Playwright CT serializa function props via RPC; probado integration en Phase 0.5.
- `ai-diff` / `locked` / `ghost` — Phase 2 / Phase 0.5.
- Bulk save — Phase 2.

---

## Integración pendiente (no cubierta por Phase 0)

Esta fase entrega los editores como client components **con callbacks `onSave` / `onChange` como props**. El wiring al server action / API lo hace el dashboard page RSC. El page `content/page.tsx` actualmente renderiza los 5 sin pasar callbacks — la persistencia real se integra cuando se conecte server action (`updateProductPageCustomization` TBD en Phase 0.5).

Para el editor de video, la ruta PATCH `/api/products/[id]/video` ya existe y puede ser llamada desde un handler del page wrapper.

Backlog inmediato para Phase 0.5:
- Server action `updateProductPageCustomization({ productId, patch })`
- Cache invalidation policy post-save
- Optimistic UI con rollback si falla

---

## A11y checklist manual

Todas las CT verifican:
- ✓ Roles ARIA (button, alert, list, listitem)
- ✓ aria-labels descriptivos (no genéricos)
- ✓ aria-pressed en toggles
- ✓ Keyboard: Tab navigation funciona, Enter actives, Esc cierra dialogs
- ✓ focus-visible ring tokens (`--ring`)
- ✓ Contraste WCAG AA en todos los text states

Pendiente verificación manual (no cubierto por CT):
- [ ] Screen reader (NVDA / VoiceOver)
- [ ] Navegación 100% con teclado en drag-drop
- [ ] Zoom 200% sin pérdida de funcionalidad
- [ ] Reducir movimiento (prefers-reduced-motion)

---

## Referencias

- Parent EPIC: [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190)
- Issue: [#191](https://github.com/weppa-cloud/bukeer-studio/issues/191)
- Convención CT: `docs/qa/studio-unified-product-editor/fixtures-convention.md`
- ADR: [[ADR-023]] Playwright CT + visual regression
