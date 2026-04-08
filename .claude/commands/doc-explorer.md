---
description: "Autonomous documentation explorer — 3-phase Karpathy loop that navigates Bukeer, captures screenshots, and writes enriched Docusaurus docs for end users"
argument-hint: "[phase=auto] [module=all] [flow=all] [max_cycles=10] [budget_minutes=90]"
allowed-tools: mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__list_pages, mcp__chrome-devtools__select_page, mcp__chrome-devtools__new_page, mcp__chrome-devtools__click, mcp__chrome-devtools__fill, mcp__chrome-devtools__type_text, mcp__chrome-devtools__press_key, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__list_console_messages, mcp__supabase__execute_sql, Bash(mkdir:*), Bash(echo:*), Bash(cat:*), Bash(grep:*), Bash(date:*), Bash(test:*), Bash(base64:*), Bash(cp:*), Bash(ls:*), Bash(find:*), Bash(printf:*), Bash(sleep:*), Read, Write, Edit, Glob, Grep, Agent
---

# Doc Explorer — Documentación Autónoma con Screenshots

Explorador autónomo de 3 fases (Karpathy autoresearch) que navega Bukeer, captura screenshots en cada paso y genera/enriquece la documentación Docusaurus en `docs-site/` para usuarios finales (agentes de viaje y operadores de agencias).

**Tono**: Funcional, español, directo. Explica qué hace cada pantalla y cómo usarla.

**Output final**: Archivos `.md` en `docs-site/docs/`, screenshots reales embebidos, navegación actualizada y cobertura registrada en inventario.

**Fuente de verdad de la estructura**: `docs-site/doc-explorer.structure.json`

**Plantilla operativa de página**: `docs-site/doc-explorer.page-template.md`

**Checklist automática**: `docs-site/doc-explorer.quality-checklist.json` + `node tools/doc_explorer_quality_check.js`

La estructura editorial manda sobre el orden de captura. Si una ruta existe pero no encaja con la estructura, se documenta como apoyo, no como navegación principal.

---

## Principios Karpathy (5 reglas — aplican a las 3 fases)

1. **Budget fijo por ciclo** — Phase 1: 5 min/ruta, Phase 2: 10 min/flujo, Phase 3: 8 min/página. Timeout → skip y continuar.
2. **1 entregable por ciclo** — 1 screenshot + metadata, o 1 flujo completo, o 1 página `.md` actualizada.
3. **Fingerprint diff** — Comparar `aria_label_count + cta_fingerprint` vs. inventario previo. Si no cambió → skip (no re-documentar). Si cambió o no existe → documentar.
4. **Auto-stop por saturación** — 3 ciclos consecutivos con `status=skipped` en la misma fase → avanzar a siguiente fase.
5. **Append-only inventory** — `docs-site/.doc-inventory.json` nunca se borra. Se actualiza por ruta/flujo.

---

## Input Contract

Parsear `$ARGUMENTS`:

- `phase`: `auto` (default), `1`, `2`, `3`
- `module`: `all` (default), `primeros-pasos`, `contactos`, `productos`, `itinerarios`, `financiero`, `reportes`, `agenda`, `ia`, `sitio-web`, `configuracion`, `super-admin`, `soporte`
- `flow`: `all` (default), nombre de flujo específico (ver catálogo abajo)
- `max_cycles`: entero, default `10`, `0` = sin límite
- `budget_minutes`: entero, default `90`
- `priority`: `P0` (default), `P1`, `P2`, `P3`, `all` — filtra por prioridad de la estructura de docs
- `sync_structure`: `true` (default), `false` — crear/sincronizar archivos `.md` faltantes y `sidebars.js` desde la estructura
- `run_checklist`: `true` (default), `false` — ejecutar checklist automática al final del flujo

Ejemplos:
```
/doc-explorer                                           → fase auto, todos los módulos
/doc-explorer phase=2 module=itinerarios               → solo flujos de itinerarios
/doc-explorer phase=2 flow=crear-itinerario            → solo ese flujo
/doc-explorer phase=3 module=contactos                 → solo escribir docs de contactos
/doc-explorer priority=P0                              → solo secciones P0 (flujo principal)
/doc-explorer priority=P1 module=financiero            → P1 del módulo financiero
/doc-explorer sync_structure=false                     → no crear archivos nuevos; solo enriquecer docs existentes
/doc-explorer run_checklist=false                      → omitir validación automática al final
```

---

## Target

**App**: `https://app.bukeer.com`
**Cuenta demo**: `demo@demo.bukeer.com` / `demo@demo.bukeer.com`

No se requiere servidor local. El comando apunta directamente a producción con la cuenta demo.

---

## Preflight (obligatorio — bloqueante)

### 0) Sincronizar estructura editorial

Antes de navegar la app, cargar `docs-site/doc-explorer.structure.json` y usarlo como mapa canónico de documentación.

Si `sync_structure=true`:

- Crear carpetas faltantes bajo `docs-site/docs/`
- Crear o refrescar páginas `.md` usando `docs-site/doc-explorer.page-template.md`
- Actualizar `docs-site/sidebars.js` para que refleje exactamente la estructura editorial
- No borrar contenido útil existente; enriquecerlo o dejarlo intacto si ya está escrito

Resultado esperado:

- Toda página del sidebar existe físicamente
- Cada `doc_file` de Phase 2 y Phase 3 está mapeado en la estructura
- La navegación del sitio coincide con la arquitectura editorial, no solo con los menús del producto

### 1) Crear directorios de screenshots

```bash
Bash: mkdir -p docs-site/static/img/screens/{primeros-pasos,contactos,productos,itinerarios,financiero,reportes,agenda,ia,sitio-web,configuracion,super-admin,soporte}
```

### 2) Abrir app y autenticar

Navegar a la app de producción con semántica habilitada:

```
mcp__chrome-devtools__navigate_page
type: url
url: https://app.bukeer.com/?e2e=1
```

Esperar 4s, luego inyectar sesión vía Supabase REST (sin tocar la UI de login):

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  const SUPABASE_URL = 'https://wzlxbpicdcdvxvdcvgas.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bHhicGljZGNkdnh2ZGN2Z2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0NjQyODAsImV4cCI6MjA0MTA0MDI4MH0.dSh-yGzemDC7DL_rf7fwgWlMoEKv1SlBCxd8ElFs_d8';
  const email = 'demo@demo.bukeer.com';
  const password = 'demo@demo.bukeer.com';

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();

  const authPayload = JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now()/1000) + (data.expires_in || 3600),
    expires_in: data.expires_in || 3600,
    token_type: 'bearer',
    user: data.user
  });

  const knownKeys = [
    'sb-wzlxbpicdcdvxvdcvgas-auth-token',
    ...Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  ];
  [...new Set(knownKeys)].forEach(k => localStorage.setItem(k, authPayload));

  return {
    ok: true,
    email: data.user?.email,
    account_id: data.user?.user_metadata?.account_id
  };
}
```

Guardar `account_id` del response — necesario para queries de Phase 2.

Recargar la página y esperar 5s:
```
mcp__chrome-devtools__navigate_page
type: url
url: https://app.bukeer.com/?e2e=1
```

### 3) Health check

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 5000));
  const glass = document.querySelector('flt-glass-pane');
  const host = glass?.shadowRoot?.querySelector('flt-semantics-host');
  const isLogin = window.location.pathname === '/login' || window.location.pathname === '/';
  return {
    ok: !!glass && !!host && !isLogin,
    pathname: window.location.pathname,
    isLoginRedirect: isLogin,
    hasGlassPane: !!glass,
    hasSemanticsHost: !!host
  };
}
```

Si `ok === false`:
- Si `isLoginRedirect` → auth falló. Reintentar inyección una vez. Si persiste → stop.
- Si `hasSemanticsHost === false` → esperar 10s adicionales y reintentar. Si persiste → stop.

### 4) Cargar inventario existente

```bash
Bash: test -f docs-site/.doc-inventory.json && cat docs-site/.doc-inventory.json || echo "{}"
```

Parsear el JSON. Cada entrada tiene:
```json
{
  "/itineraries": {
    "last_documented": "ISO-8601",
    "aria_label_count": 42,
    "cta_fingerprint": "Crear itinerario|Buscar|Filtrar",
    "screenshot_count": 3,
    "phase1_done": true
  }
}
```

---

## Phase 1: INVENTORY (screenshot de todas las rutas)

**Métrica**: `inventory_score = routes_with_screenshots / total_eligible_routes`
**Gate**: `inventory_score >= 0.90` → avanzar a Phase 2
**Budget por ciclo**: 5 minutos por ruta

### Catálogo de rutas (en orden de prioridad)

#### 🔴 P0 — Rutas críticas (flujo principal)

| Ruta | Módulo | Doc target | Notas |
|------|--------|-----------|-------|
| `/dashboard` | primeros-pasos | `primeros-pasos/bienvenida.md` | Dashboard principal |
| `/profile` | primeros-pasos | `primeros-pasos/tu-cuenta.md` | Perfil de usuario |
| `/itineraries` | itinerarios | `itinerarios/crear-gestionar.md` | Lista de itinerarios |
| `/contacts` | contactos | `contactos/contactos.md` | Lista de contactos |
| `/products` (hoteles) | productos | `productos/hoteles.md` | Catálogo — tab hoteles |
| `/conversations` | contactos | `contactos/conversaciones-crm.md` | Panel CRM |

#### 🟡 P1 — Rutas operativas

| Ruta | Módulo | Doc target | Notas |
|------|--------|-----------|-------|
| `/products` (vuelos) | productos | `productos/vuelos.md` | Catálogo — tab vuelos |
| `/products` (actividades) | productos | `productos/actividades.md` | Catálogo — tab actividades |
| `/products` (transfers) | productos | `productos/transfers.md` | Catálogo — tab transfers |
| `/reports` o dashboard tabs | reportes | `reportes/panel-principal.md` | Reportes y métricas |

#### 🟢 P2 — Rutas complementarias

| Ruta | Módulo | Doc target | Notas |
|------|--------|-----------|-------|
| `/agenda` | agenda | `agenda/agenda.md` | Calendario |
| `/ai-assistant` | ia | `ia/asistente-ia.md` | Asistente IA |
| `/settings` | configuracion | `configuracion/equipo.md` | Configuración general |
| `/users` | configuracion | `configuracion/equipo.md` | Gestión de equipo |
| `/settings/email` | configuracion | `configuracion/correo.md` | Config correo |
| `/settings/financial` | configuracion | `configuracion/financiero.md` | Config financiero |

#### ⚪ P3 — Rutas especializadas

| Ruta | Módulo | Doc target | Notas |
|------|--------|-----------|-------|
| `/website-builder` | sitio-web | `sitio-web/dashboard.md` | Creador de sitio web |
| `/website-builder/pages` | sitio-web | `sitio-web/editor-paginas.md` | Editor de páginas |
| `/website-builder/blog` | sitio-web | `sitio-web/blog.md` | Blog |
| `/admin` | super-admin | `super-admin/gestion-cuentas.md` | Panel super admin |

### Procedimiento por ruta

**Paso 1.1 — Verificar si necesita re-documentar**

Comparar fingerprint actual vs. inventario:
- Si ruta en inventario Y `last_documented` < 7 días Y `cta_fingerprint` no cambió → `status=skipped`
- Si ruta NO está en inventario, o fingerprint cambió, o screenshot_count == 0 → documentar

**Paso 1.2 — Navegar y esperar carga**

```javascript
mcp__chrome-devtools__navigate_page
type: url
url: https://app.bukeer.com/{route}?e2e=1
```

Esperar 5s, verificar que no redirige a `/login`.

**Paso 1.3 — Capturar fingerprint actual**

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 5000));
  function collect(root, depth = 0) {
    if (depth > 10) return { labels: [], ctas: [] };
    const labels = [];
    const ctas = [];
    for (const el of root.querySelectorAll('[aria-label]')) {
      const l = (el.getAttribute('aria-label') || '').trim();
      if (l) labels.push(l);
      const role = el.getAttribute('role') || '';
      const lower = l.toLowerCase();
      if (role === 'button' || el.tagName === 'BUTTON') {
        if (lower.includes('crear') || lower.includes('nuevo') || lower.includes('agregar') ||
            lower.includes('editar') || lower.includes('guardar') || lower.includes('buscar') ||
            lower.includes('filtrar') || lower.includes('exportar') || lower.includes('generar') ||
            lower.includes('importar') || lower.includes('invitar') || lower.includes('configurar') ||
            lower.includes('publicar') || lower.includes('enviar')) {
          ctas.push(l);
        }
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const sub = collect(el.shadowRoot, depth + 1);
        labels.push(...sub.labels);
        ctas.push(...sub.ctas);
      }
    }
    return { labels, ctas };
  }
  const { labels, ctas } = collect(document);
  const tabs = [];
  function collectTabs(root, depth = 0) {
    if (depth > 10) return;
    for (const el of root.querySelectorAll('[role="tab"]')) {
      const l = (el.getAttribute('aria-label') || el.innerText || '').trim();
      if (l) tabs.push(l);
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) collectTabs(el.shadowRoot, depth + 1);
    }
  }
  collectTabs(document);
  return {
    pathname: window.location.pathname,
    aria_label_count: labels.length,
    cta_fingerprint: [...new Set(ctas)].join('|'),
    tabs: [...new Set(tabs)],
    title: document.title
  };
}
```

**Paso 1.4 — Screenshot principal**

Nombre del archivo: `{module}_{screen}_{YYYYMMDD}.png`

Ejemplo: `itinerarios_lista_20260318.png`

```
mcp__chrome-devtools__take_screenshot
```

Guardar el screenshot capturado:
```bash
Bash: TIMESTAMP=$(date +%Y%m%d) && echo "{base64_screenshot_data}" | base64 --decode > docs-site/static/img/screens/{module}/{screen}_${TIMESTAMP}.png
```

Si el take_screenshot devuelve una ruta local (no base64), copiar al destino correspondiente.

**Paso 1.5 — Screenshots de tabs (si existen)**

Para cada tab detectado en el fingerprint:
1. Buscar y hacer click en el tab via aria-label
2. Esperar 3s
3. Capturar screenshot nombrado `{module}_{screen}_tab_{tab_slug}_{YYYYMMDD}.png`

Máximo 5 tabs por ruta dentro del budget de 5 minutos.

**Paso 1.6 — Actualizar inventario**

Guardar en `docs-site/.doc-inventory.json`:
```json
{
  "{route}": {
    "last_documented": "{ISO-8601}",
    "aria_label_count": "{N}",
    "cta_fingerprint": "{pipe-separated CTAs}",
    "tabs": ["{tab1}", "{tab2}"],
    "screenshot_count": "{N}",
    "screenshots": ["{filename1}", "{filename2}"],
    "module": "{module}",
    "priority": "{P0|P1|P2|P3}",
    "phase1_done": true
  }
}
```

**Paso 1.7 — Registrar en log**

```bash
Bash: echo -e "{timestamp}\tphase1\t{route}\t{module}\t{priority}\t{aria_count}\t{screenshot_count}\t{status}" >> docs-site/.doc-run-log.tsv
```

---

## Phase 2: FLOWS (flujos completos paso a paso)

**Métrica**: `flow_coverage = flows_with_screenshots / total_flows`
**Gate**: `flow_coverage >= 0.85` → avanzar a Phase 3
**Budget por ciclo**: 10 minutos por flujo

### Catálogo de flujos

Cada flujo tiene: `flow_id`, `module`, `doc_file`, `priority`, `steps[]`

---

#### 🔴 P0 — Flujos críticos (sin esto no pueden operar)

**F01 — `primer-acceso` (primeros-pasos)**
Doc: `primeros-pasos/bienvenida.md`
Steps:
1. Navegar a `/dashboard` → screenshot: `pp_f01_s01_dashboard.png`
2. Identificar elementos principales del dashboard → screenshot: `pp_f01_s02_elementos.png`
3. Navegar al perfil → screenshot: `pp_f01_s03_perfil.png`

**F02 — `configurar-agencia` (primeros-pasos)**
Doc: `primeros-pasos/configurar-agencia.md`
Steps:
1. Navegar a `/settings` → screenshot: `pp_f02_s01_settings.png`
2. Subir logo → screenshot: `pp_f02_s02_logo.png`
3. Completar datos legales → screenshot: `pp_f02_s03_datos.png`
4. Configurar moneda principal → screenshot: `pp_f02_s04_moneda.png`

**F03 — `crear-contacto` (contactos)**
Doc: `contactos/contactos.md`
Steps:
1. Navegar a `/contacts` → screenshot lista: `cont_f03_s01_lista.png`
2. Click "Nuevo contacto" → modal: `cont_f03_s02_modal.png`
3. Llenar nombre, email, teléfono → screenshot: `cont_f03_s03_form.png`
4. Guardar → ver en lista: `cont_f03_s04_guardado.png`

**F04 — `crear-proveedor` (contactos)**
Doc: `contactos/contactos.md`
Steps:
1. Navegar a `/contacts` → filtrar tipo proveedor: `cont_f04_s01_filtro.png`
2. Click "Nuevo proveedor" → modal: `cont_f04_s02_modal.png`
3. Llenar datos del proveedor: `cont_f04_s03_form.png`
4. Guardar: `cont_f04_s04_guardado.png`

**F05 — `panel-conversaciones` (contactos)**
Doc: `contactos/conversaciones-crm.md`
Steps:
1. Navegar a `/conversations` → screenshot panel: `cont_f05_s01_panel.png`
2. Abrir conversación → screenshot detalle: `cont_f05_s02_detalle.png`
3. Mostrar etiquetas y filtros: `cont_f05_s03_etiquetas.png`
4. Usar respuesta prediseñada: `cont_f05_s04_respuesta.png`

**F06 — `crear-hotel` (productos)**
Doc: `productos/hoteles.md`
Steps:
1. Navegar a `/products` → filtrar hoteles: `prod_f06_s01_lista.png`
2. Click en hotel para ver detalle: `prod_f06_s02_detalle.png`
3. Tab de tarifas → ver tarifas: `prod_f06_s03_tarifas.png`
4. Agregar nueva tarifa: `prod_f06_s04_nueva_tarifa.png`

**F07 — `crear-itinerario` (itinerarios)**
Doc: `itinerarios/crear-gestionar.md`
Steps:
1. Navegar a `/itineraries` → screenshot: `itin_f07_s01_lista.png`
2. Click "Nuevo itinerario" → screenshot: `itin_f07_s02_modal.png`
3. Llenar campos (Nombre, Cliente, Fechas) → screenshot: `itin_f07_s03_form.png`
4. Seleccionar cliente desde selector → screenshot: `itin_f07_s04_selector.png`
5. Guardar → screenshot: `itin_f07_s05_guardado.png`
6. Ver detalle del itinerario → screenshot: `itin_f07_s06_detalle.png`

**F08 — `agregar-servicios` (itinerarios)**
Doc: `itinerarios/agregar-servicios.md`
Requiere: itinerario existente (resolver via DB)
Steps:
1. Navegar a detalle de itinerario → screenshot: `itin_f08_s01_detalle.png`
2. Click en tab "Servicios" → screenshot: `itin_f08_s02_tab.png`
3. Agregar hotel: click "Agregar hotel" → screenshot: `itin_f08_s03_modal_hotel.png`
4. Llenar campos de hotel → screenshot: `itin_f08_s04_form_hotel.png`
5. Guardar hotel → screenshot: `itin_f08_s05_hotel_agregado.png`
6. Agregar actividad → screenshot: `itin_f08_s06_actividad.png`
7. Agregar transfer → screenshot: `itin_f08_s07_transfer.png`

**F09 — `gestionar-pasajeros` (itinerarios)**
Doc: `itinerarios/pasajeros.md`
Steps:
1. Detalle de itinerario → tab "Pasajeros": `itin_f09_s01_tab.png`
2. Click "Agregar pasajero" → modal: `itin_f09_s02_modal.png`
3. Buscar y seleccionar contacto: `itin_f09_s03_buscar.png`
4. Guardar → pasajero en lista: `itin_f09_s04_guardado.png`

**F10 — `registrar-pagos-cliente` (itinerarios)**
Doc: `itinerarios/registrar-pagos.md`
Steps:
1. Detalle de itinerario → tab "Pagos": `itin_f10_s01_tab.png`
2. Click "Registrar pago": `itin_f10_s02_modal.png`
3. Llenar monto, fecha, método: `itin_f10_s03_form.png`
4. Guardar → saldo actualizado: `itin_f10_s04_guardado.png`

**F11 — `vista-previa-pdf` (itinerarios)**
Doc: `itinerarios/vista-previa-envio.md`
Steps:
1. Detalle de itinerario → tab "Preview" o botón PDF: `itin_f11_s01_preview.png`
2. Mostrar preview del PDF: `itin_f11_s02_pdf.png`
3. Botón para descargar/compartir: `itin_f11_s03_compartir.png`
4. Enviar por correo: `itin_f11_s04_enviar_correo.png`

**F12 — `inicio-rapido-5-pasos` (primeros-pasos)**
Doc: `primeros-pasos/inicio-rapido.md`
Nota: Este flujo es un tutorial que conecta F03 → F06 → F07 → F08 → F11 en secuencia. Tomar screenshots adicionales que muestren la transición entre pasos.
Steps:
1. Screenshot introductorio: `pp_f12_s01_intro.png`
2. Ejecutar F03 (crear contacto) → screenshot resumen: `pp_f12_s02_contacto.png`
3. Ejecutar F06 (crear hotel) → screenshot resumen: `pp_f12_s03_hotel.png`
4. Ejecutar F07 (crear itinerario) → screenshot resumen: `pp_f12_s04_itinerario.png`
5. Ejecutar F08 (agregar servicio) → screenshot resumen: `pp_f12_s05_servicio.png`
6. Ejecutar F11 (preview y compartir) → screenshot resumen: `pp_f12_s06_compartir.png`

---

#### 🟡 P1 — Flujos operativos (operaciones diarias)

**F13 — `importar-contactos` (contactos)**
Doc: `contactos/importacion-masiva.md`
Steps:
1. Navegar a importación → screenshot: `cont_f13_s01_importar.png`
2. Descargar plantilla CSV: `cont_f13_s02_plantilla.png`
3. Cargar archivo: `cont_f13_s03_cargar.png`
4. Ver resultado importación: `cont_f13_s04_resultado.png`

**F14 — `catalogo-chat-flyers` (contactos)**
Doc: `contactos/catalogo-chat-flyers.md`
Steps:
1. Abrir conversación con cliente: `cont_f14_s01_chat.png`
2. Acceder al catálogo de chat: `cont_f14_s02_catalogo.png`
3. Crear/enviar flyer: `cont_f14_s03_flyer.png`

**F15 — `enviar-cotizacion-email` (contactos)**
Doc: `contactos/comunicacion-clientes.md`
Steps:
1. Desde itinerario → botón enviar: `cont_f15_s01_enviar.png`
2. Componer correo: `cont_f15_s02_componer.png`
3. Confirmar envío: `cont_f15_s03_confirmado.png`

**F16 — `registrar-vuelo` (productos)**
Doc: `productos/vuelos.md`
Steps:
1. `/products` → filtrar vuelos: `prod_f16_s01_lista.png`
2. Crear vuelo manualmente: `prod_f16_s02_form.png`
3. Configurar tarifas: `prod_f16_s03_tarifas.png`

**F17 — `crear-actividad` (productos)**
Doc: `productos/actividades.md`
Steps:
1. `/products` → filtrar actividades: `prod_f17_s01_lista.png`
2. Ver detalle de actividad: `prod_f17_s02_detalle.png`
3. Campos: nombre, precio, descripción: `prod_f17_s03_form.png`

**F18 — `importar-productos` (productos)**
Doc: `productos/importacion-masiva.md`
Steps:
1. Acceder a importación: `prod_f18_s01_importar.png`
2. Descargar plantilla: `prod_f18_s02_plantilla.png`
3. Cargar archivo: `prod_f18_s03_cargar.png`
4. Verificar productos: `prod_f18_s04_verificar.png`

**F19 — `gestion-tarifas-avanzada` (productos)**
Doc: `productos/gestion-avanzada.md`
Steps:
1. Detalle producto → tarifas: `prod_f19_s01_tarifas.png`
2. Crear tarifa por temporada: `prod_f19_s02_temporada.png`
3. Inclusiones/exclusiones: `prod_f19_s03_inclusiones.png`
4. Métodos de pago proveedor: `prod_f19_s04_metodos_pago.png`

**F20 — `planificador-visual` (itinerarios)**
Doc: `itinerarios/planificador-visual.md`
Steps:
1. Acceder al planificador desde itinerario: `itin_f20_s01_acceder.png`
2. Vista día a día: `itin_f20_s02_vista_dias.png`
3. Arrastrar servicios: `itin_f20_s03_organizar.png`

**F21 — `catalog-builder` (itinerarios)**
Doc: `itinerarios/agregar-servicios.md`
Steps:
1. Abrir Catalog Builder desde itinerario: `itin_f21_s01_abrir.png`
2. Panel de catálogo — buscar productos: `itin_f21_s02_buscar.png`
3. Panel de carrito — revisar selección: `itin_f21_s03_carrito.png`
4. Confirmar servicios: `itin_f21_s04_confirmar.png`

**F22 — `cobros-clientes` (financiero)**
Doc: `financiero/cobros-clientes.md`
Steps:
1. Tab pagos del itinerario: `fin_f22_s01_tab.png`
2. Ver estados de pago: `fin_f22_s02_estados.png`
3. Registrar abono: `fin_f22_s03_abono.png`

**F23 — `pagos-proveedores` (financiero)**
Doc: `financiero/pagos-proveedores.md`
Steps:
1. Proveedores del itinerario: `fin_f23_s01_proveedores.png`
2. Registrar pago a proveedor: `fin_f23_s02_pago.png`
3. Ver seguimiento CxP: `fin_f23_s03_seguimiento.png`

**F24 — `generar-voucher` (financiero)**
Doc: `financiero/vouchers.md`
Steps:
1. Detalle itinerario → vouchers: `fin_f24_s01_vouchers.png`
2. Generar voucher proveedor: `fin_f24_s02_voucher_prov.png`
3. Generar voucher viajero: `fin_f24_s03_voucher_viajero.png`

**F25 — `reportes-dashboard` (reportes)**
Doc: `reportes/panel-principal.md`
Steps:
1. Dashboard principal → métricas: `rep_f25_s01_dashboard.png`
2. Filtrar por agente y fecha: `rep_f25_s02_filtros.png`
3. Reporte de ventas: `rep_f25_s03_ventas.png`
4. Reporte de rentabilidad: `rep_f25_s04_rentabilidad.png`
5. CxC: `rep_f25_s05_cxc.png`
6. CxP: `rep_f25_s06_cxp.png`
7. Productos vendidos: `rep_f25_s07_productos.png`
8. Rendimiento CRM: `rep_f25_s08_crm.png`

---

#### 🟢 P2 — Flujos complementarios

**F26 — `paquetes-prediseñados` (itinerarios)**
Doc: `itinerarios/paquetes-predisenados.md`
Steps:
1. Acceder a paquetes: `itin_f26_s01_lista.png`
2. Crear paquete con servicios: `itin_f26_s02_crear.png`
3. Usar paquete en itinerario nuevo: `itin_f26_s03_usar.png`

**F27 — `vista-publica-itinerario` (itinerarios)**
Doc: `itinerarios/vista-publica.md`
Steps:
1. Obtener enlace compartible: `itin_f27_s01_enlace.png`
2. Abrir vista pública: `itin_f27_s02_vista.png`
3. Lo que ve el cliente: `itin_f27_s03_cliente.png`

**F28 — `agenda` (agenda)**
Doc: `agenda/agenda.md`
Steps:
1. Navegar a `/agenda`: `agenda_f28_s01_calendario.png`
2. Ver actividades programadas: `agenda_f28_s02_actividades.png`

**F29 — `asistente-ia` (ia)**
Doc: `ia/asistente-ia.md`
Steps:
1. Acceder al asistente: `ia_f29_s01_panel.png`
2. Generar itinerario con IA: `ia_f29_s02_generar.png`
3. Revisar borrador: `ia_f29_s03_borrador.png`

**F30 — `ia-conversaciones` (ia)**
Doc: `ia/ia-conversaciones.md`
Steps:
1. Abrir conversación: `ia_f30_s01_chat.png`
2. Activar sugerencia IA: `ia_f30_s02_sugerencia.png`

**F31 — `configurar-equipo` (configuracion)**
Doc: `configuracion/equipo.md`
Steps:
1. `/users` → lista equipo: `config_f31_s01_equipo.png`
2. Invitar miembro: `config_f31_s02_invitar.png`
3. Asignar rol y permisos: `config_f31_s03_permisos.png`

**F32 — `configurar-correo` (configuracion)**
Doc: `configuracion/correo.md`
Steps:
1. Settings → Email: `config_f32_s01_email.png`
2. Integrar Gmail: `config_f32_s02_gmail.png`
3. Prueba de envío: `config_f32_s03_prueba.png`

**F33 — `respuestas-prediseñadas` (configuracion)**
Doc: `configuracion/respuestas-crm.md`
Steps:
1. Settings → CRM: `config_f33_s01_crm.png`
2. Crear respuesta prediseñada: `config_f33_s02_crear.png`

---

#### ⚪ P3 — Flujos especializados

**F34 — `sitio-web-editor` (sitio-web)**
Doc: `sitio-web/editor-paginas.md`
Steps:
1. Dashboard sitio web: `web_f34_s01_dashboard.png`
2. Editor visual de páginas: `web_f34_s02_editor.png`
3. Publicar página: `web_f34_s03_publicar.png`

**F35 — `sitio-web-blog` (sitio-web)**
Doc: `sitio-web/blog.md`
Steps:
1. Sección blog: `web_f35_s01_blog.png`
2. Crear artículo: `web_f35_s02_crear.png`

**F36 — `super-admin` (super-admin)**
Doc: `super-admin/gestion-cuentas.md`
Steps:
1. Panel admin → cuentas: `admin_f36_s01_cuentas.png`
2. Ver estado de cuenta: `admin_f36_s02_estado.png`
3. Ingresar como cliente: `admin_f36_s03_impersonar.png`

---

### Procedimiento por flujo

**Paso 2.1 — Verificar si necesita re-documentar**

Leer inventario para `flow_id`:
- Si `flow_coverage_done: true` Y `last_documented` < 7 días → `status=skipped`
- Si screenshots del flujo en `docs-site/static/img/screens/{module}/` ya existen con fecha reciente → `status=skipped`
- Sino → ejecutar flujo

**Paso 2.2 — Resolver dependencias DB (si el flujo requiere datos)**

Para flujos que requieren un itinerario existente:

```sql
SELECT id, name FROM public.itineraries
WHERE account_id = '{account_id}' AND is_deleted = false
ORDER BY updated_at DESC LIMIT 1;
```

Para flujos que requieren un contacto:
```sql
SELECT id, name FROM public.contacts
WHERE account_id = '{account_id}' AND deleted_at IS NULL
ORDER BY updated_at DESC LIMIT 3;
```

Para flujos que requieren un producto hotel:
```sql
SELECT id, name FROM public.hotels
WHERE account_id = '{account_id}'
ORDER BY updated_at DESC LIMIT 1;
```

Usar `mcp__supabase__execute_sql` para cada query.

**Paso 2.3 — Ejecutar steps del flujo**

Para cada step del catálogo:
1. Ejecutar la acción (navegar / click / fill)
2. Esperar carga (3-5s según complejidad)
3. Tomar screenshot nombrado según catálogo
4. Registrar en inventario

**Helper — click por aria-label (shadow DOM)**:

```javascript
mcp__chrome-devtools__evaluate_script
function: (targetLabel) => {
  function findAndClick(root, label, depth = 0) {
    if (depth > 10) return false;
    const selector = '[role="button"], button, [aria-label]';
    for (const el of root.querySelectorAll(selector)) {
      const l = (el.getAttribute('aria-label') || el.innerText || '').trim();
      if (l.toLowerCase().includes(label.toLowerCase())) {
        el.click();
        return { found: true, label: l, tag: el.tagName };
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const result = findAndClick(el.shadowRoot, label, depth + 1);
        if (result) return result;
      }
    }
    return false;
  }
  return findAndClick(document, targetLabel);
}
```

**Helper — fill de campo por label**:

```javascript
mcp__chrome-devtools__evaluate_script
function: (targetLabel, value) => {
  function findAndFill(root, label, val, depth = 0) {
    if (depth > 10) return false;
    for (const el of root.querySelectorAll('input, textarea')) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const labelLower = label.toLowerCase();
      if (ariaLabel.includes(labelLower) || placeholder.includes(labelLower)) {
        el.focus();
        if (typeof el.select === 'function') el.select();
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: el.value === val, found: true };
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const result = findAndFill(el.shadowRoot, label, val, depth + 1);
        if (result) return result;
      }
    }
    return false;
  }
  return findAndFill(document, targetLabel, value);
}
```

**Paso 2.4 — Guardar screenshots del flujo**

Por cada screenshot capturado en los steps:
```bash
Bash: echo "{base64_data}" | base64 --decode > docs-site/static/img/screens/{module}/{filename}.png
```

**Paso 2.5 — Actualizar inventario del flujo**

```json
{
  "flows": {
    "{flow_id}": {
      "last_documented": "{ISO-8601}",
      "module": "{module}",
      "doc_file": "{relative_path}",
      "priority": "{P0|P1|P2|P3}",
      "screenshots": ["{file1}", "{file2}"],
      "steps_completed": "{N}",
      "flow_coverage_done": true
    }
  }
}
```

---

## Phase 3: WRITE (generar/actualizar markdown)

**Métrica**: `doc_freshness = pages_with_screenshots / total_doc_pages`
**Gate**: `doc_freshness >= 0.85` → fase completa
**Budget por ciclo**: 8 minutos por página `.md`

### Reglas editoriales de Phase 3

1. Escribir según `docs-site/doc-explorer.structure.json`, no según improvisación de rutas.
2. Priorizar organización basada en tareas y resultados del usuario.
3. Insertar screenshots reales cuando existan; si no existen, dejar placeholder explícito para la próxima corrida.
4. Si la página no existe, crearla. Si existe, enriquecerla sin destruir contenido bueno.
5. Si una misma pantalla sirve para varias páginas, reutilizar la captura con texto adaptado al objetivo del artículo.
6. La corrida solo cuenta como completa cuando también deja `docs-site/sidebars.js` alineado con la estructura.
7. Toda página gestionada por el comando debe cumplir la plantilla de `docs-site/doc-explorer.page-template.md`.

### Procedimiento por página

**Paso 3.1 — Leer el archivo `.md` actual**

Usar `Read` para cargar el contenido actual del archivo doc.

**Paso 3.2 — Identificar screenshots disponibles para esta página**

Leer el inventario para encontrar todos los screenshots asociados al `doc_file` de esta página. También hacer:

```bash
Bash: ls docs-site/static/img/screens/{module}/ | grep "{page_slug}"
```

**Paso 3.3 — Verificar si necesita actualización**

- Si el `.md` ya contiene `![` (tiene imágenes) Y los screenshots referenciados existen Y no hay nuevos screenshots → `status=skipped`
- Sino → actualizar

**Paso 3.4 — Regenerar el archivo con screenshots**

Usar `Write` para reescribir el archivo con el contenido enriquecido.

**Patrón de archivo generado** (template enriquecido):

```markdown
---
sidebar_position: {N}
title: {Título en español}
description: {Descripción corta para SEO}
---

# {Título de la sección}

> **¿Quién necesita esto?** {Rol mínimo requerido: Agente / Gerente / Administrador}
> **⏱️ Tiempo estimado:** {N} minutos

{Párrafo introductorio: qué es esta función y para qué sirve. 2-3 oraciones. Tono directo y funcional.}

:::info Antes de empezar
{Requisitos previos. Ej: "Asegúrate de haber creado al menos un producto en el catálogo."}
:::

![{Descripción de la pantalla}](/img/screens/{module}/{screenshot_principal}.png)

## {Subtítulo 1: primer paso o acción principal}

{Explicación del paso. Qué hace el usuario, qué pasa en la pantalla.}

![{Descripción}](/img/screens/{module}/{screenshot_paso1}.png)

1. {Paso 1 numerado}
2. {Paso 2 numerado}
3. {Paso 3 numerado}

:::tip
{Consejo práctico opcional. Solo si hay algo no-obvio que vale la pena destacar.}
:::

## {Subtítulo 2: siguiente sección}

{Contenido...}

![{Descripción}](/img/screens/{module}/{screenshot_paso2}.png)

| Campo | Descripción | Obligatorio |
|-------|-------------|-------------|
| **{Campo 1}** | {Qué se ingresa} | Sí / No |
| **{Campo 2}** | {Qué se ingresa} | Sí / No |

## ✅ Resultado esperado

{Descripción de cómo se ve la pantalla cuando el usuario completó correctamente todos los pasos.}

![{Pantalla final exitosa}](/img/screens/{module}/{screenshot_resultado}.png)

## ❓ Problemas comunes

**{Problema 1}**
{Causa y solución corta}

**{Problema 2}**
{Causa y solución corta}

## 📚 Artículos relacionados

- [{Título artículo siguiente}]({ruta relativa al siguiente artículo})
- [{Título artículo relacionado}]({ruta relativa})
```

**Reglas de escritura**:
- Máximo 2 párrafos seguidos sin un screenshot o lista
- Subtítulos = acciones del usuario ("Cómo crear un itinerario", "Agregar pasajeros")
- Nunca usar jerga técnica interna (no mencionar IDs, UUIDs, nombres de tablas)
- Si una pantalla tiene tabs, documentar cada tab con su screenshot
- Admonitiones de Docusaurus: `:::tip`, `:::info`, `:::warning` — usar con parsimonia
- Siempre incluir cabecera con rol mínimo y tiempo estimado
- Siempre incluir resultado esperado y problemas comunes
- Siempre incluir al menos 2 artículos relacionados (siguiente paso lógico)
- Cross-references: si una sección se explica en detalle en otra parte, usar `→ [ver guía completa en §X.Y](ruta)`

**Paso 3.5 — Verificar links de imágenes**

Después de escribir el archivo, verificar que cada imagen referenciada existe:

```bash
Bash: grep -o '/img/screens/[^)]*' docs-site/docs/{module}/{file}.md | while read path; do test -f "docs-site/static$path" && echo "OK: $path" || echo "MISSING: $path"; done
```

Si hay imágenes faltantes → log en `.doc-run-log.tsv` con `status=img_missing`.

**Paso 3.6 — Registrar en log**

```bash
Bash: echo -e "{timestamp}\tphase3\t{doc_file}\t{module}\t{priority}\t{screenshot_count_embedded}\t{words_added}\t{status}" >> docs-site/.doc-run-log.tsv
```

**Paso 3.7 — Ejecutar checklist automática**

Si `run_checklist=true`, ejecutar:

```bash
Bash: node tools/doc_explorer_quality_check.js
```

Si la checklist falla:

- guardar el resultado en `docs-site/.doc-quality-report.json`
- marcar la corrida con `status=quality_failed`
- no considerar la documentación como terminada

---

## Phase Gate Logic

```
Phase 1: inventory_score >= 0.90  → avanzar a Phase 2
Phase 2: flow_coverage >= 0.85    → avanzar a Phase 3
Phase 3: doc_freshness >= 0.85    → fase completa
```

Cuando se avanza de fase:
1. Guardar `doc-inventory.json` actualizado
2. Reset del contador de ciclos skippeados
3. Continuar con ciclos restantes en la nueva fase

Si `max_cycles` agotado o `budget_minutes` superado → stop y mostrar resumen.

Auto-detection de fase (cuando `phase=auto`):
```
Leer .doc-inventory.json:
  No existe / vacío       → Phase 1
  inventory_score < 0.90  → Phase 1
  inventory_score >= 0.90 AND flow_coverage < 0.85 → Phase 2
  flow_coverage >= 0.85 AND doc_freshness < 0.85   → Phase 3
  doc_freshness >= 0.85                             → todas las fases completas → summary
```

Filtro por prioridad (cuando `priority` != `all`):
```
Solo procesar rutas/flujos/docs cuyo campo priority coincida.
Recalcular métricas sobre el subset filtrado.
```

---

## Inventario Schema Completo

Archivo: `docs-site/.doc-inventory.json`

```json
{
  "version": "2.0",
  "last_run": "ISO-8601",
  "routes": {
    "/itineraries": {
      "last_documented": "ISO-8601",
      "aria_label_count": 0,
      "cta_fingerprint": "",
      "tabs": [],
      "screenshot_count": 0,
      "screenshots": [],
      "module": "itinerarios",
      "priority": "P0",
      "phase1_done": false
    }
  },
  "flows": {
    "crear-itinerario": {
      "last_documented": "ISO-8601",
      "module": "itinerarios",
      "doc_file": "itinerarios/crear-gestionar.md",
      "priority": "P0",
      "screenshots": [],
      "steps_completed": 0,
      "flow_coverage_done": false
    }
  },
  "docs": {
    "itinerarios/crear-gestionar.md": {
      "last_written": "ISO-8601",
      "screenshot_count": 0,
      "word_count": 0,
      "has_images": false,
      "has_role": false,
      "has_time_estimate": false,
      "has_related_articles": false,
      "priority": "P0"
    }
  },
  "summary": {
    "inventory_score": 0.0,
    "flow_coverage": 0.0,
    "doc_freshness": 0.0,
    "total_screenshots": 0,
    "total_routes": 20,
    "total_flows": 36,
    "total_doc_pages": 30,
    "by_priority": {
      "P0": { "routes": 6, "flows": 12, "docs": 10 },
      "P1": { "routes": 4, "flows": 13, "docs": 10 },
      "P2": { "routes": 6, "flows": 8, "docs": 8 },
      "P3": { "routes": 4, "flows": 3, "docs": 4 }
    },
    "last_full_run": null
  }
}
```

---

## Mapeo Estructura de Docs ↔ Archivos

Referencia rápida de cómo los archivos `.md` mapean a la estructura de 12 partes:

| Parte | Carpeta | Archivos |
|-------|---------|----------|
| 1. Primeros Pasos | `primeros-pasos/` | `bienvenida.md`, `tu-cuenta.md`, `configurar-agencia.md`, `inicio-rapido.md` |
| 2. Contactos y CRM | `contactos/` | `contactos.md`, `importacion-masiva.md`, `conversaciones-crm.md`, `catalogo-chat-flyers.md`, `comunicacion-clientes.md` |
| 3. Catálogo Productos | `productos/` | `hoteles.md`, `vuelos.md`, `actividades.md`, `importacion-masiva.md`, `gestion-avanzada.md` |
| 4. Itinerarios | `itinerarios/` | `crear-gestionar.md`, `planificador-visual.md`, `agregar-servicios.md`, `paquetes-predisenados.md`, `pasajeros.md`, `precios-costos.md`, `vista-previa-envio.md`, `vista-publica.md` |
| 5. Gestión Financiera | `financiero/` | `cobros-clientes.md`, `proveedores-itinerario.md`, `pagos-proveedores.md`, `vouchers.md` |
| 6. Panel y Reportes | `reportes/` | `panel-principal.md`, `ventas.md`, `rentabilidad.md`, `cxc.md`, `cxp.md`, `productos-vendidos.md`, `rendimiento-crm.md` |
| 7. Agenda | `agenda/` | `agenda.md` |
| 8. Asistente IA | `ia/` | `asistente-ia.md`, `generar-itinerarios.md`, `ia-conversaciones.md`, `ia-contenido-web.md` |
| 9. Sitio Web | `sitio-web/` | `dashboard.md`, `editor-paginas.md`, `blog.md`, `catalogo-publico.md` |
| 10. Configuración | `configuracion/` | `equipo.md`, `empresa-legales.md`, `financiero.md`, `correo.md`, `respuestas-crm.md`, `integraciones.md` |
| 11. Super Admin | `super-admin/` | `gestion-cuentas.md`, `administracion-global.md` |
| 12. Soporte | `soporte/` | `chat-soporte.md`, `tickets.md`, `preguntas-frecuentes.md`, `contacto.md` |

---

## Resumen Final

Después de todos los ciclos o budget agotado:

```
══════════════════════════════════════════════════════════════
 DOC EXPLORER — Reporte Final
 Módulo: {module} | Prioridad: {priority} | Ciclos: {N} | Budget usado: {M}min
══════════════════════════════════════════════════════════════
 Phase 1 (Inventory):  {inventory_score:.0%} ({screenshotted}/{total} rutas)
 Phase 2 (Flows):      {flow_coverage:.0%} ({documented}/{total} flujos)
 Phase 3 (Write):      {doc_freshness:.0%} ({pages_with_imgs}/{total} páginas)
══════════════════════════════════════════════════════════════
 Por prioridad:
   🔴 P0: {p0_score:.0%} ({p0_done}/{p0_total})
   🟡 P1: {p1_score:.0%} ({p1_done}/{p1_total})
   🟢 P2: {p2_score:.0%} ({p2_done}/{p2_total})
   ⚪ P3: {p3_score:.0%} ({p3_done}/{p3_total})
══════════════════════════════════════════════════════════════
 Screenshots capturados: {total_screenshots}
   → docs-site/static/img/screens/
 Páginas .md actualizadas: {pages_updated}
   → docs-site/docs/
 Imágenes faltantes: {missing_count} (ver .doc-run-log.tsv)
══════════════════════════════════════════════════════════════

Artefactos:
  docs-site/.doc-inventory.json   ← estado del inventario
  docs-site/.doc-run-log.tsv      ← log de cada ciclo
  docs-site/static/img/screens/   ← screenshots capturados
  docs-site/docs/                 ← documentación actualizada

Para ver los docs localmente:
  cd docs-site && npm start
```

---

## Notas de Implementación

**Screenshots en Flutter Web (CanvasKit)**:
- `mcp__chrome-devtools__take_screenshot` captura el canvas completo incluyendo el UI de Flutter
- Para modales: esperar que el overlay sea visible antes de capturar (verificar `[role="dialog"]` en shadow DOM)
- Resolución preferida: no cambiar viewport — usar la resolución activa del browser
- Si el screenshot devuelve base64: decodificar con `base64 --decode`
- Si devuelve path de archivo: copiar con `cp`

**Flujos que crean datos de prueba**:
- Los flujos F07 (crear itinerario) y F03/F04 (crear contacto) crean registros reales en la DB del account demo
- Son aceptables para documentación — usar prefijo `[DOC]` en el nombre para identificarlos
- No limpiar después (los datos demo son descartables)

**Re-runs**:
- El comando es idempotente: el fingerprint diff previene re-documentar lo que no cambió
- Para forzar re-documentación completa: borrar `docs-site/.doc-inventory.json`
- Para forzar un módulo específico: `phase=2 module=itinerarios` ignora el inventario para ese módulo
- Para documentar solo lo crítico: `priority=P0` filtra a las secciones esenciales

**Cross-references entre artículos**:
- La Parte 1 (Primeros Pasos) contiene versiones resumidas que enlazan a las partes detalladas
- Ejemplo: §1.3.1 (Configurar correo) → enlaza a §10.4 (guía completa de correo)
- Phase 3 debe generar estos enlaces automáticamente usando el mapeo de la tabla de arriba
