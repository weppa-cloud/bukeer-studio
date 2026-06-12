# Contrato de UI · Evolución (Admin Next)

> **Este documento + los archivos listados abajo son el ÚNICO contrato visual del admin Next.**
> La referencia canónica es el prototipo hifi del handoff de diseño:
> `bukeer-flutter/design/evolucion-handoff/bukeer-flutter-a-next-js/project/Prototipo Bukeer.html`.
> Cualquier pantalla nueva se construye copiando el markup del prototipo, NO re-interpretando
> con shadcn/Tailwind genérico. La desviación visual fue el error de las iteraciones anteriores.

## Regla de oro

1. El prototipo define **pixel-perfect** colores, tipografía, espaciado, radios y copys.
2. La implementación vive en `app/admin/evolucion.css` + `components/admin-next/evolucion/`.
3. **Prohibido**: hex hardcodeado en componentes, clases Tailwind de color/spacing para UI
   Evolución, crear variantes visuales no presentes en el prototipo.
4. **Obligatorio**: `data-testid` en todo elemento interactivo, datos vía fixtures/adapters
   (nunca inline), navegación con `next/link` a rutas reales `/admin/*` (mismos flujos que Flutter).

## Archivos del contrato

| Archivo | Qué es |
|---|---|
| `app/admin/evolucion.css` | Tokens `t-evo` (light/dark) + todas las clases de componentes. Port 1:1 de `bukeer-themes.css` del prototipo (+ forms/extra/detail). |
| `components/admin-next/evolucion/icons.tsx` | `EvoIcon` — paths SVG exactos del prototipo (set Lucide, stroke 1.8 vía `--icon-sw`). |
| `components/admin-next/evolucion/evo-shell.tsx` | Shell: sidebar 232px (logo, nav con counts, side-foot) + topbar (⌘K, toggle tema, IA, notificaciones, avatar). |
| `components/admin-next/evolucion/evo-dashboard.tsx` | Dashboard: 4 KPIs, ventas vs costo, cobros próximos, ranking, actividad. |
| `components/admin-next/evolucion/evo-contacts.tsx` | Contactos: grid 3 col, badges Cliente/Proveedor, filtros. |
| `components/admin-next/evolucion/evo-products.tsx` | Productos: ptabs por categoría, grid de cards con rating/precio/proveedor. |
| `components/admin-next/evolucion/evo-conversations.tsx` | Conversaciones: layout 330/1fr/300, hilo con composer + IA pill, panel CRM. |

## Tokens (resumen — la fuente es el CSS)

- **Tipografía**: Outfit (display: títulos, cifras, botones) + Readex Pro (body, peso 300 base).
- **Primary** `#7C57B3` · soft `#EEE8F7`/`#5E3F94` · teal `#1FA597` · orange `#EE8B60` ·
  green `#16A47C` · red `#E5484D`. Dark mode con sus propios valores (ver `.t-evo.dark`).
- **Superficies light**: bg `#F2F4F8`, card `#FFFFFF`, card2 `#F6F8FB`, border `#E0E3E7`.
- **Forma**: card 12px, btn/input/nav 10px, pills 999px. Sidebar `--sidew: 232px`.
- Theme-sdk (`EVOLUCION_PRESET`) sigue siendo el origen conceptual de la paleta; este CSS es
  la materialización exacta del prototipo. Si theme-sdk y prototipo divergen, **gana el prototipo**
  y se ajusta el preset, no al revés.

## Clases disponibles — COBERTURA COMPLETA (235/237 del prototipo)

`evolucion.css` contiene **TODAS** las clases del sistema Evolución de los 7 CSS del prototipo
(`bukeer-themes/iti/lists/detail/extra/forms/mobile.css`). Las únicas 2 ausentes son `.t-cab` y
`.t-brisa` (direcciones de diseño rechazadas — exclusión intencional). Construir cualquier
pantalla o modal nuevo es solo escribir el markup del prototipo; el CSS ya está.

- Layout: `.bk .t-evo .light/.dark`, `.side`, `.main`, `.topbar`, `.content`, `.page-head`
- Base: `.card`, `.btn primary|outline|ghost`, `.chip purple|teal|orange|green|red`, `.fchip(.on)`,
  `.av s24|s32|s40|s54`, `.searchbox`, `.kbd`, `.iconbtn(.ping)`, `.linklike`, `.progress(-lg)`, `.trow`
- Dashboard: `.kpis/.kpi`, `.dash-grid/.dash-col`, `.chart`, `.legend`
- Conversaciones: `.conv/.conv-list/.conv-item/.thread/.msg(.in|.out|.note)/.composer/.ai-pill/.crm-panel/.panel-sec/.iti-mini/.ch-badge`
- Contactos/Productos: `.contact-grid/.contact-card`, `.ptabs/.ptab`, `.prod-grid/.prod-card`
- Itinerarios: `.vtoggle`, `.iti-list/.iti-row/.mchips/.iti-fin/.feebadge/.amt2`, kanban `.kb*`
- Detalle itinerario: `.iti-hero/.stat/.iti-tabs/.iti-grid/.svc-day/.svc-card/.svc-ico/.sum-row/.margin-box`
- Pagos: `.bal-grid/.bal-cell/.cuota/.pm-row/.pm-ico/.toggle`
- Modales: `.modal-veil/.modal(.w720)/.modal-head/.modal-body/.modal-foot/.fgrid2/.m-results`
- Formularios (DS Flutter): `.fsec/.fphone/.addr-row/.addr-add/.stepper/.rate-sum/.loc-sel/.mb-cols/.frange/.ckbox/.fgroup/.flabel/.finput/.fdrop*(.fdrop-new)`
- Proveedores/galería: `.prv-card/.prv-head/.prv-svc/.prv-foot`, `.gal-grid/.gal-tile/.gal-add`, `.pd-gallery/.pd-main/.pd-thumbs`
- Agenda: `.ag-list/.ag-group/.ag-head/.ag-date/.ag-item/.ag-badges`
- Reportes: `.rep-grid/.rep-card`, `.grp/.grp-head/.grp-row`, `.hbar-row`
- Configuración: `.set-grid/.set-nav/.set-item/.set-body/.kvgrid/.logo-tile/.user-row/.mx-row` (matriz permisos)
- Pasajeros/Proveedores/Preview: `.px-row`, `.pr-row`, `.pv-doc/.pv-hero/.pv-day/.pv-item/.pv-thumb`
- Vista pública: `.pub*/.pv2-*` · ⌘K: `.cmdk*` · Notificaciones: `.notif-*` · Vacíos: `.empty-card`
- Móvil 390×844: `.mb/.m-*` (status bar, bottom-nav con FAB, bottom sheets, chat, tiles)
- Styleguide: `.tok/.swatches/.sw/.type-spec/.darkstrip` (lámina de especímenes)

**Deltas deliberados vs prototipo** (únicos): `overflow: hidden → auto` en contenedores de scroll
reales (listas, msgs, modal-body, kanban) — el prototipo era un canvas fijo 1440×900; y
`position: absolute → fixed` en veils de modal/⌘K/notificaciones para viewport real.

## Pantallas pendientes (fuente exacta en el prototipo)

Cada una tiene su markup HTML listo en el handoff — portar igual que las 4 ya hechas:

| Pantalla | Fuente en el prototipo | Ruta Next |
|---|---|---|
| Itinerarios (lista + kanban) | `bukeer-screens-lists.js` (`itinerariesList`) + `bukeer-lists.css` | `/admin/itineraries` |
| Itinerario detalle (tabs Items/Pasajeros/Pagos/Proveedores/Preview) | `bukeer-screens-iti.js` + `iti2.js` + `bukeer-iti.css` | `/admin/itineraries/[id]` |
| Contacto/Proveedor detalle | `bukeer-screens-detail.js`, `bukeer-screens-provider.js` + `bukeer-detail.css` | `/admin/contacts/[id]` |
| Producto detalle | `bukeer-screens-detail.js` (`productDetail`) | `/admin/products/[id]` |
| Pagos | `bukeer-screens-reports3.js`/`reports4.js` (según ROUTES) | `/admin/payments` |
| Agenda | `bukeer-screens-lists.js` | `/admin/agenda` |
| Reportes (ventas, CxC, CxP, rentabilidad) | `bukeer-screens-reports2/3/4.js` | `/admin/reports` |
| Configuración | `bukeer-screens-config/2/3.js` | `/admin/settings` |
| Modales (~25: nuevo itinerario, contacto, producto, pago, cierre conv, ⌘K, notificaciones…) | `bukeer-screens-modals*.js` + `bukeer-forms.css/js` | componentes compartidos |
| Vista pública del itinerario | `bukeer-screens-public.js` | `/admin/prototype/public-view` (o ruta pública) |
| Móvil (11 pantallas, bottom bar 5 destinos) | `Prototipo Bukeer Movil.html` + `bukeer-mobile.css/js` | responsive de las mismas rutas |

## Móvil / responsive (cómo está diseñado en el handoff)

El prototipo NO es un diseño "fluido": son **dos diseños deliberados** que comparten tokens:

1. **Desktop** (`Prototipo Bukeer.html`, canvas 1440×900) — shell `.bk` con sidebar 232px.
2. **Móvil** (`Prototipo Bukeer Movil.html`, 390×844) — deck `.mb` de **11 pantallas**:
   Inicio (KPIs scroll horizontal), Itinerarios, Itinerario detalle (tabs pill), Pagos del
   itinerario, CRM/Conversaciones, Chat, Contactos, Pagos, Agenda, Notificaciones, Más.
   - **Bottom-nav de 5 destinos**: `Inicio · Itinerarios · CRM · Agenda · Más` — decisión final
     del chat3: SIN botón ⊕ central; cada módulo lleva su agregar contextual (FAB flotante en
     Itinerarios, `+` en CRM/Contactos/Pagos).
   - **Bottom sheets** (`.m-veil/.m-bsheet`) como modales móviles: Crear, Nuevo itinerario,
     Agregar servicio (fuentes: `sheetCreate/sheetNewIti/sheetAddSvc` en `bukeer-mobile2.js`).
   - Chat con composer pill, tabs pill en detalle, filas `.m-row` de 56px mínimo.

**Estrategia de implementación**: mismas rutas Next; breakpoint único `lg` (1024px).
`≥1024px` renderiza el shell `.bk` desktop; `<1024px` renderiza los patrones `.mb/.m-*`
(bottom-nav + sheets). No inventar estados intermedios: el handoff no define tablet — ante
la duda, usar el layout móvil hasta `lg`. Todo el CSS móvil ya está en `evolucion.css`.

## Qué queda del prototipo por implementar (markup, no CSS)

El CSS está completo; lo pendiente es escribir el markup React de: detalle de itinerario
(5 tabs), detalle contacto/proveedor/producto, Pagos, Agenda, Reportes (hub + 4), Configuración,
~25 modales (`bukeer-screens-modals*.js`), vista pública, ⌘K, panel de notificaciones, y los
comportamientos JS del prototipo (abrir/cerrar dropdowns y modales, toasts, encadenamiento
Crear → Nuevo itinerario) que en Next son estado React local. Los archivos no-UI del bundle
(`design-canvas.jsx`, `tweaks-panel.jsx`, `.design-canvas.state.json`) son tooling del canvas
de diseño — NO se portan.

## Gate funcional (qué significa "pantalla migrada")

UI exacta ≠ migrada. Una pantalla cuenta como migrada cuando:
1. UI exacta al prototipo (este contrato).
2. Datos reales de Supabase vía adapter (patrón `products-adapter.ts`, modo `fixture|readonly`).
3. Mismo flujo que la pantalla Flutter equivalente (rutas, filtros en URL, acciones).
4. `requireAdminNextSession` + permisos; Playwright E2E del flujo.
5. Flag de módulo + soak antes del corte (contrato `BukeerNextCutoverService`, bukeer-flutter PR #852).
