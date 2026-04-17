# Spec: Market Experience Switcher (Idioma + Moneda)

## Contexto
- El sitio público ya soporta idioma y moneda vía query params (`lang`, `currency`) + `localStorage`.
- El menú actual usa controles `select` separados y funcionales, pero con una experiencia visual básica.
- El panel de diseño en Studio no expone una configuración explícita para la experiencia de mercado.

## Objetivo
- Mejorar UX del switcher de idioma/moneda en el header para que sea más claro, consistente y menos genérico.
- Exponer en Studio una configuración dedicada para esta experiencia, sin romper la lógica base de Booker de monedas.

## Alcance
- Header público:
  - Reemplazar la presentación de dos `select` sueltos por un control unificado de mercado.
  - Soportar estilos visuales configurables (`compact`, `chips`, `segmented`).
  - Mantener persistencia y query params existentes.
- Studio (Design):
  - Nuevo tab/editor `Market UX`.
  - Configurar:
    - `switcher_style`
    - `show_in_header`
    - `show_in_footer`
    - `show_language`
    - `show_currency`
    - `default_locale`
    - `supported_locales`
- Footer:
  - Usar locales soportados configurados y respetar visibilidad configurada.

## Fuera de alcance
- Cambios en lógica financiera de Booker (moneda base y tasas del día).
- Edición de tasas de cambio desde Studio.
- Migraciones SQL nuevas.

## Modelo de datos (content + website)
- `websites.content.market_experience`:
  - `switcher_style`: `compact | chips | segmented`
  - `show_in_header`: `boolean`
  - `show_in_footer`: `boolean`
  - `show_language`: `boolean`
  - `show_currency`: `boolean`
- `websites.default_locale` y `websites.supported_locales`:
  - usados para resolver opciones de idioma del switcher.

## Criterios de aceptación
1. Header muestra un control unificado de mercado con estado visible (ej. `ES · COP`).
2. Al cambiar idioma:
   - actualiza `lang` en URL,
   - persiste en `localStorage`,
   - mantiene navegación en la misma ruta.
3. Al cambiar moneda:
   - actualiza `currency` en URL,
   - persiste en `localStorage`,
   - la conversión de precios sigue respetando moneda base + tasas.
4. Si `show_in_header=false`, no aparece switcher en header.
5. Si `show_in_footer=false`, no aparece switcher de idioma en footer.
6. Studio permite cambiar estilo y visibilidad, y persiste vía autosave.
7. `supported_locales` limita las opciones visibles del selector.

## Implementación técnica
- `lib/site/currency.ts`
  - helpers para resolver configuración de mercado y locales efectivos.
- `components/site/site-header.tsx`
  - nuevo panel de preferencias de mercado con estilos visuales.
- `components/site/language-switcher.tsx`
  - aceptar locales dinámicos (no solo catálogo fijo).
- `components/site/site-footer.tsx`
  - respetar `market_experience.show_in_footer` + `supported_locales`.
- `components/admin/market-experience-editor.tsx`
  - nuevo editor de configuración de mercado en Studio.
- `app/dashboard/[websiteId]/design/page.tsx`
  - nuevo tab `Market UX`.

## Riesgos conocidos
- Warnings de backend existentes (`product.v2-parse`) no bloquean este alcance pero pueden ensuciar señales en E2E.
- Error intermitente React boundary (`3547900577`) observado en corridas previas, no reproducido en la validación final de smoke.

## Validación mínima
- E2E smoke Chromium en session pool:
  - `@smoke` concurrente (`workers=3`) debe terminar en verde para tests ejecutables.
