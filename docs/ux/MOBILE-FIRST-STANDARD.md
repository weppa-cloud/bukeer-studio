# Mobile-First Standard — ColombiaTours / editorial-v1

**Auditoría:** 2026-04-21  
**Baseline device:** iPhone 14 Pro — 390×844px (19.5:9)  
**Tema:** `editorial-v1` · preset `colombia-caribe`  
**Principio rector:** Cada pantalla se diseña para 390px primero. Desktop es un enhancement.

---

## Estado antes / después (Home, 390px)

| Sección | Antes | Después | Delta |
|---------|-------|---------|-------|
| Hero | 864px ❌ meta invisible | 767px ✅ meta visible | -97px |
| Trust bar | 148px (2 filas wrap) | 61px (scroll horizontal) | -87px |
| Reconocidos | 120px (logos wrap) | 102px (scroll horizontal) | -18px |
| Destinos | 2,027px (grid 1-col) | 649px (carousel rail) | -1,378px |
| Paquetes | 974px | 930px | -44px |
| Explore map | 1,171px | 1,130px | -41px |
| Stats | 465px | 357px | -108px |
| Promise | 1,303px | 1,158px | -145px |
| Planners | 2,459px ❌ | 780px ✅ | -1,679px |
| Testimonios | 1,873px | 995px | -878px |
| FAQ | 1,168px | 1,083px | -85px |
| CTA final | 687px | 609px | -78px |
| **Total** | **~14,560px** | **~8,621px** | **-41%** |

---

## Estándar de experiencia mobile-first

### 1. Viewport — Hero siempre en 1 pantalla

- El hero usa `height: calc(100dvh - 77px)` (no `min-height`) en ≤640px.
- La meta strip (ciudad, dots, contador) está siempre visible en el fold.
- El side-list de destinos se oculta en mobile — aparece al hacer scroll.
- `overflow: hidden` impide cualquier desborde.

```css
/* REGLA: hero en mobile = exactamente 100dvh - nav */
@media (max-width: 640px) {
  .hero { height: calc(100dvh - 77px); min-height: unset; }
  .hero-inner > aside { display: none; }
}
```

### 2. Global tokens mobile

```css
@media (max-width: 640px) {
  [data-template-set="editorial-v1"] {
    --section-py: 64px;   /* era 112px → -48px × 9 secciones = -432px */
    --gutter: 20px;        /* era 32px → +24px contenido en 390px device */
  }
}
```

### 3. Tipografía — Escala mobile

| Clase | Desktop | Mobile |
|-------|---------|--------|
| `.display-xl` | clamp(52px, 7.8vw, 116px) | clamp(36px, 9.5vw, 52px) |
| `.display-lg` | clamp(44px, 6vw, 84px) | clamp(32px, 8.5vw, 44px) |
| `.display-md` | clamp(36px, 4.6vw, 60px) | clamp(28px, 7vw, 36px) |

Regla: en 390px, `display-xl` no debe superar 40px (≤2 líneas para headings estándar).

### 4. Carouseles horizontales — El patrón estándar

Cualquier grid con ≥4 elementos verticales en mobile se convierte en **scroll-snap rail**:

```css
@media (max-width: 640px) {
  .section-grid {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 12px;
    /* edge-to-edge con peek */
    margin: 0 calc(var(--gutter, 20px) * -1);
    padding: 0 var(--gutter, 20px) 8px;
  }
  .section-grid::-webkit-scrollbar { display: none; }
  .section-grid-item {
    flex: 0 0 72%;  /* peek-next = 28% del siguiente visible */
    scroll-snap-align: start;
  }
}
```

**Porcentaje de ancho por contexto:**

| Contexto | Ancho tarjeta | Peek visible |
|----------|---------------|--------------|
| Paquetes (2-3 en fila) | 86% | ~14% |
| Destinos (muchos) | 72% | ~28% |
| Planners (avatar) | 72% | ~28% |
| Testimonios mini | 80% | ~20% |

### 5. Touch feedback — Estados activos

Los hover no se disparan en touch. Regla obligatoria:

```css
/* Siempre incluir :active en elementos tocables */
.btn:active { transform: scale(0.96); transition: transform 0.08s ease; }
.card-interactive:active { transform: scale(0.98); transition: transform 0.08s ease; }
```

Clases que requieren `:active` state: `.btn`, `.pack-card`, `.dest-card`, `.planner`, `.testi-mini`, `.lm-card`, `.filter-tab`, `.view-toggle button`.

### 6. Tap targets — Tamaño mínimo

- Botones: `padding: 13px 18px` mínimo en mobile (≥44px de altura efectiva).
- Chips/filtros: ≥36px altura.
- Links de nav: ≥48px con padding implícito.
- Links de tarjetas: area táctil = toda la tarjeta (no solo el texto).

### 7. Fuentes y accesibilidad

- Body text: mínimo 15px (`body-md`), idealmente 16px para leer cómodamente.
- Contraste: el hero tiene texto blanco sobre imagen oscurecida — asegurar wash ≥ 55% opacity.
- `prefers-reduced-motion`: todas las animaciones de entrada usan `@media (prefers-reduced-motion: reduce)`.

### 8. Gutter y contenido edge-to-edge

- Contenido general: `--gutter: 20px` (padding izquierdo + derecho = 40px).
- Carouseles: salen edge-to-edge via `margin: 0 -20px` + `padding: 0 20px`.
- Imágenes hero/media: `inset: 0` — cubren 100% sin gutter.

---

## Change list — Mobile-first memorable

### Implementado ✅

1. **Hero height exacto** — `height: calc(100dvh - 77px)`, hero meta siempre visible
2. **Side list oculto en mobile** — hero compacto en 1 columna
3. **H1 escalado** — `clamp(36px, 9.5vw, 52px)` — 2 líneas en 390px
4. **Global tokens** — `--section-py: 64px`, `--gutter: 20px`
5. **Trust bar horizontal scroll** — 148px → 61px
6. **Reconocidos horizontal scroll** — logos no wrappean
7. **Destinos carousel rail** — 2,027px → 649px
8. **Planners carousel rail** — 2,459px → 780px
9. **Testimonios list carousel** — scroll horizontal mini cards
10. **Testimonios big card** — padding reducido para mobile
11. **Promise dark card** — padding 72px → 28px/24px
12. **Stats 2×2 grid** — `padding: 24px 16px` por celda
13. **Touch :active feedback** — scale(0.96/0.98) en todos los elementos táctiles
14. **Botones mobile** — padding y font-size reducidos

### Pendiente — Próxima iteración (ver plan por página)

15. **Scroll indicator dots** — debajo de carouseles (destinations, planners)
16. **Hero search form mobile** — el form de búsqueda colapsa a 1 campo en mobile
17. **Explore map mobile** — ocultar mapa, mostrar solo lista en mobile
18. **FAQ accordion** — reducir font-size del título, padding del item
19. **CTA section** — el roadmap (rm-track) ya está adaptado, validar visual
20. **Animaciones de entrada** — `translateY(24px)` → `opacity: 0` en scroll, con Intersection Observer
21. **WhatsApp FAB** — floating action button visible en mobile desde el scroll 2
22. **Nav mobile panel** — animación slide-down suave, items con stagger

---

## Plan de implementación por página

### Fase 1 — Home ✅ (implementado arriba)

Secciones: hero, trust bar, destinos, paquetes, stats, promise, planners, testimonios, FAQ, CTA.

Pendiente en Home:
- [ ] Scroll indicators debajo de rails (dots CSS puros)
- [ ] Hero search form mobile collapse
- [ ] Explore map — hide map on mobile, list only
- [ ] Animaciones de entrada con Intersection Observer

---

### Fase 2 — Product detail (paquete)

URL: `/site/[sub]/paquetes/[slug]`  
Componente: `p2/` (editorial overlay)

Issues mobile detectados:
- Hero split `hero-split` — verificar que `grid-template-columns: 1fr` en ≤640px
- Pricing sticky sidebar — en mobile debe ser sticky bottom bar (no sticky right column)
- Gallery lightbox — touch swipe entre imágenes
- Itinerary días — expand/collapse por día en mobile
- Hotel card: image aspect-ratio en mobile, texto no truncado

Plan:
```
- hero-split: single col, imagen arriba (aspect-ratio 4/3), texto abajo
- pricing sidebar → sticky bottom bar con precio + CTA
- gallery → swipe-friendly (ya tiene lightbox, revisar touch events)
- itinerary → collapsible por día por defecto en mobile
```

---

### Fase 3 — Activities list

URL: `/site/[sub]/experiencias`  
Secciones: filtros, grid de activities

Issues mobile:
- Filter bar `.exp-cats` en 2 columnas (puede ser horizontal scroll)
- `.exp-grid` en 1 columna (ya implementado a ≤640px)
- Map view: ocultar en mobile, solo list view

Plan:
```
- exp-cats: horizontal scroll rail en ≤640px
- exp-grid: ya 1-col, revisar spacing
- view-toggle: ocultar el botón "mapa" en ≤640px
```

---

### Fase 4 — Activity detail

URL: `/site/[sub]/[...slug]` (product_type=activity)

Issues mobile:
- Hero full (similar a paquete)
- Program table (`.ev-dest-section`) — horizontal scroll en mobile
- Options table (row #34) — scroll horizontal o cards apiladas
- Meeting point map — height limitado en mobile

---

### Fase 5 — Planners list

URL: `/site/[sub]/planners`

Issues mobile:
- `.pl-grid` ya en 1-col a ≤720px — verificar visualmente
- `.pl-intro` ya en 1-col — OK
- Filter/search bar — revisar tap targets
- Planner cards en grid: ¿ya como rail? Verificar

---

### Fase 6 — Planner detail

URL: `/site/[sub]/planners/[slug]`

Issues mobile:
- `.pld-hero` — avatar centrado (ya implementado en 1100px breakpoint)
- `.pld-body` — 1-col ya
- Signature trips rail — revisar
- Reviews list — altura y overflow

---

### Fase 7 — Blog

URL: `/site/[sub]/blog`

Issues mobile:
- Feature post: imagen + texto en 1-col
- Blog grid: 1-col o 2-col
- Category filter: horizontal scroll

---

### Fase 8 — WhatsApp Flow modal

Issues mobile:
- Modal es full-screen en mobile — verificar que `waf-drawer` usa `height: 100dvh`
- Wizard steps: chips destinos, adults counter — verificar tap targets ≥44px
- CTA button verde — verificar que llena el ancho en mobile

---

## Animaciones mobile — Estándar

### Principio: Motion que refuerza la marca de personalización

ColombiaTours tiene un tono íntimo, personal. Las animaciones deben sentirse **naturales**, no tecnológicas.

```
Entrada de secciones:
  - translateY(32px) opacity:0 → translateY(0) opacity:1
  - duration: 0.6s
  - easing: cubic-bezier(0.2, 0.7, 0.2, 1)  (var(--ease))
  - delay: stagger 80ms entre elementos del grupo

Carousel swipe:
  - scroll-snap nativo (ya implementado)
  - scroll-behavior: smooth

Cards:
  - :active → scale(0.98) — 80ms instant response

Hero rotator:
  - Crossfade entre slides: opacity 0→1, 1.2s
  - No zoom (reduce motion friendly)

CTA buttons:
  - :hover → translateY(-1px) (desktop)
  - :active → scale(0.96) (mobile)

WhatsApp FAB:
  - Aparece después de 1 scroll (IntersectionObserver on trust-bar)
  - Scale + fadeIn: scale(0) → scale(1), 300ms spring
  - Pulse en el dot verde: ya implementado
```

### Reducción de movimiento

```css
@media (prefers-reduced-motion: reduce) {
  /* Desactivar: rotador hero, entrance animations, hover transforms */
  .hero-rotator-slide { transition: opacity 0.1s; }
  .btn:hover, .btn:active { transform: none; }
  .dest-card:hover .dest-media { transform: none; }
}
```

---

## KPIs de calidad mobile

| Métrica | Target | Herramienta |
|---------|--------|-------------|
| LCP | ≤ 2.5s | Lighthouse mobile |
| CLS | ≤ 0.05 | Lighthouse |
| FID/INP | ≤ 200ms | Chrome DevTools |
| Hero fits viewport | 100% | Playwright assertion |
| Tap targets ≥44px | 100% de CTAs | axe-core |
| Horizontal overflow | 0 secciones | Playwright evaluate scrollWidth |
| Page height reduction | ≥35% vs desktop | Playwright |

---

*Última actualización: 2026-04-21 | Autor: Claude Code + Yeison Gómez*
