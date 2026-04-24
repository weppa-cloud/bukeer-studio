# ColombiaTours Cutover Audit — 2026-04-23

## Veredicto

**NO-GO** para cutover.

La navegación principal del sitio local con preview habilitado responde en las 20 rutas auditadas, pero hay rutas críticas de detalle que devuelven HTTP 200 con contenido de "Página no encontrada". Eso bloquea migración porque rompería URLs orgánicas, campañas, enlaces internos y validación SEO aunque el status HTTP no falle.

## Alcance y entorno

- Base auditada: `http://localhost:3001/site/colombiatours`
- Fecha: 2026-04-23
- Entorno: `dev` + worktree local, session pool `s1`, puerto `3001`
- Viewports: desktop `1440x900`, mobile `390x844`
- Autenticación: preview habilitado durante el barrido Playwright; sin cookie/token el navegador integrado muestra `Preview token required` y `curl` devuelve `401`.
- No se editó contenido, no se guardó en Studio y no se tocó Supabase.

## Evidencia

- Screenshots: `qa-screenshots/pilot-colombiatours-2026-04-23/cutover-audit/`
- Resultados por ruta: `artifacts/qa/pilot/2026-04-23/cutover-audit/route-results.json`
- Resultados de links: `artifacts/qa/pilot/2026-04-23/cutover-audit/link-results.json`
- Resumen: `artifacts/qa/pilot/2026-04-23/cutover-audit/summary.json`
- Observaciones condensadas: `artifacts/qa/pilot/2026-04-23/cutover-audit/condensed-observations.json`
- Screenshot navegador integrado sin preview: `qa-screenshots/pilot-colombiatours-2026-04-23/cutover-audit/mcp-mobile-preview-token-required.png`

## Hallazgos

| Pri | Hallazgo | Evidencia | Impacto | Recomendación |
|-----|----------|-----------|---------|---------------|
| P0 | Detalles críticos renderizan 404 visual con HTTP 200: paquete 15D, paquete Bogotá legacy, blog guía y paquete EN. | `/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as`, `/paquetes/paquete-bogot-4-d-as`, `/blog/guia-viajar-colombia`, `/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as`; H1 `Pagina no encontrada` o `Page not found`; títulos `Paquete no encontrado` / `Post no encontrado`. | Bloquea cutover: SEO, backlinks, QA del inventario migrado y conversión quedan rotos aunque el status sea 200. | Corregir slugs/routing o aliases legacy y devolver 404 real solo cuando no exista. Revalidar matriz completa de detalles. |
| P0 | `/legal` devuelve HTTP 200 con contenido de "Página no encontrada". | `/site/colombiatours/legal`, H1 `Pagina no encontrada`, title `Página no encontrada`. | Bloquea confianza/legal si se publica como ruta visible. | Crear página legal local válida o removerla/redirectarla explícitamente antes de cutover. |
| P1 | Preview público local requiere token fuera del contexto autenticado. | Navegador integrado y `curl -I /site/colombiatours/actividades/4x1-adventure` devuelven `Preview token required` / `401`. | QA automatizado sin cookie falla; Lighthouse no puede auditar si no inyecta token/cookie. | Documentar flujo de preview para QA o ajustar script de Lighthouse para emitir/incluir preview token. En producción confirmar que el dominio final no queda protegido por preview. |
| P1 | Lighthouse CI no produjo score válido. | `LHCI_TENANT=colombiatours bash scripts/lighthouse-ci.sh` falló: intentó usar `s1` con puerto ocupado y Lighthouse recibió status `401`. | No hay gate de performance/a11y/SEO confiable para la decisión de cutover. | Liberar sesión real, correr Lighthouse con token de preview o contra preview público autorizado, y anexar resultados. |
| P1 | Timeouts en links internos de productos listados. | Link checker: timeouts de 5s en `/paquetes/bogota-esencial-cultura-y-sal-4-dias`, `/paquetes/colombia-en-familia-15-dias-aventura-y-confort`, `/paquetes/colombia-imperdible-9-dias-bogota-medellin-y-cartagena`. | Riesgo de rutas lentas o datos incompatibles justo en cards de home/listado. | Auditar esos slugs reales y revisar parsing de `getProductPage` / datos v2. |
| P1 | Ruido de schema/normalización en productos y hotel. | Consola servidor/browser: `[product.v2-parse] Schema mismatch`; hotel Aloft reporta 65 entradas de consola por viewport y fallbacks de normalización. | Riesgo de contenido incompleto, SEO inconsistente y errores ocultos en generación de metadata. | Corregir nullability/contrato de producto o normalizar datos en Supabase antes de render. |
| P1 | Blog detail auditado tarda más de 5.8s y renderiza 404 visual. | `/blog/guia-viajar-colombia`: 6102ms desktop, 5887ms mobile, H1 `Pagina no encontrada`. Logs previos mostraron statement timeout en `getAllBlogSlugs`. | Riesgo SEO alto para contenido migrado; experiencia lenta aun cuando no encuentra post. | Revisar índice/consulta de slugs de blog, slug legacy y fallback de metadata. |
| P1 | Rutas legales redirigen fuera del entorno local a WordPress. | `/privacy`, `/terms`, `/cancellation` terminan en `https://colombiatours.travel/terminos-y-condiciones/...`. | Bloquea QA local end-to-end y mantiene dependencia WordPress en cutover legal. | Decidir si legales quedan externalizadas temporalmente; si sí, validar disponibilidad, canonical y tracking. Ideal: migrarlas localmente. |
| P2 | `/planners` se filtra como link absoluto sin prefijo de tenant desde home. | Link checker encontró `http://localhost:3001/planners` con `404` desde `home`. La ruta tenant `/site/colombiatours/planners` sí funciona. | Enlace visible puede sacar al usuario del sitio tenant y fallar. | Corregir generación de URL/basePath para el CTA/link `Ver todos`. |
| P2 | i18n parcial: actividad EN redirige a ruta ES. | `/en/actividades/tour-a-guatape-y-pe-ol` finaliza en `/actividades/tour-a-guatape-y-pe-ol`; paquete EN renderiza 404 visual. | Hreflang/SEO internacional y experiencia EN inconsistentes. | Completar overlay EN o marcar rutas EN no publicables hasta tener slugs/contenido válidos. |
| P2 | Newsletter sigue sin garantía funcional. | Todas las páginas muestran formularios; auditoría estática previa detectó acción `${basePath}/api/newsletter` sin ruta local clara. | Conversión secundaria puede fallar silenciosamente. | Validar submit no destructivo con endpoint real o ocultar formulario hasta tener backend. |
| P2 | MapLibre falla WebGL en headless. | Home y rutas con mapas registran `Failed to initialize WebGL`; fuentes Google bloqueadas por ORB en headless. | No necesariamente afecta navegador real, pero contamina consola y Lighthouse. | Mantener fallback de mapa y filtrar/gestionar errores esperados en QA headless. |

## Matriz por ruta

`HTTP d/m` = desktop/mobile. `Consola d/m` y `Req fallidas d/m` cuentan entradas capturadas durante la carga; muchas fallas son fonts bloqueadas en headless, pero los conteos altos requieren revisión.

| Ruta | Path | HTTP d/m | Visual | Consola d/m | Req fallidas d/m | H1 observado |
|------|------|----------|--------|-------------|------------------|-------------|
| home | `/site/colombiatours` | 200/200 | OK | 2/2 | 1/1 | Colombia como la cuenta quien la camina. |
| destinos-list | `/site/colombiatours/destinos` | 200/200 | OK | 1/1 | 1/1 | Ocho Colombias, ocho ritmos. |
| paquetes-list | `/site/colombiatours/paquetes` | 200/200 | OK | 0/0 | 1/1 | Paquetes por toda Colombia. |
| experiencias-list | `/site/colombiatours/experiencias` | 200/200 | OK | 1/1 | 1/1 | Actividades para sumar a tu viaje. |
| actividades-redirect | `/site/colombiatours/actividades` | 200/200 | Redirect a `/experiencias` | 1/1 | 3/3 | Actividades para sumar a tu viaje. |
| blog-list | `/site/colombiatours/blog` | 200/200 | OK | 0/1 | 1/1 | Historias desde adentro. |
| planners-list | `/site/colombiatours/planners` | 200/200 | OK | 0/0 | 1/1 | Una persona que conoce su tierra. |
| buscar | `/site/colombiatours/buscar` | 200/200 | OK | 0/0 | 1/1 | Que estas buscando? |
| pkg-15d | `/site/colombiatours/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as` | 200/200 | **NO-GO** | 0/0 | 1/1 | Pagina no encontrada |
| pkg-bogota | `/site/colombiatours/paquetes/paquete-bogot-4-d-as` | 200/200 | **NO-GO** | 0/0 | 1/1 | Pagina no encontrada |
| act-guatape | `/site/colombiatours/actividades/tour-a-guatape-y-pe-ol` | 200/200 | OK | 2/2 | 1/1 | Tour a Guatape y Peñol |
| act-4x1 | `/site/colombiatours/actividades/4x1-adventure` | 200/200 | OK | 2/2 | 1/1 | 4x1 Adventure |
| hotel-aloft | `/site/colombiatours/hoteles/aloft-bogota-airport` | 200/200 | OK | 65/65 | 1/1 | Aloft Bogota Airport |
| blog-guia | `/site/colombiatours/blog/guia-viajar-colombia` | 200/200 | **NO-GO** | 0/0 | 1/1 | Pagina no encontrada |
| pkg-15d-en | `/site/colombiatours/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as` | 200/200 | **NO-GO** | 0/0 | 1/1 | Page not found |
| act-guatape-en | `/site/colombiatours/en/actividades/tour-a-guatape-y-pe-ol` | 200/200 | Redirect a ES | 2/2 | 2/2 | Tour a Guatape y Peñol |
| privacy | `/site/colombiatours/privacy` | 200/200 | Redirect externo | 1/2 | 6/5 | Política de Privacidad |
| terms | `/site/colombiatours/terms` | 200/200 | Redirect externo | 1/2 | 6/5 | Términos y Condiciones |
| cancellation | `/site/colombiatours/cancellation` | 200/200 | Redirect externo | 1/2 | 6/5 | Política de Cancelación |
| legal | `/site/colombiatours/legal` | 200/200 | **NO-GO** | 0/0 | 1/1 | Pagina no encontrada |

## Links y navegación

- Header/listados principales: home, destinos, paquetes, experiencias, blog, planners y buscar renderizan.
- `/actividades` redirige correctamente a `/experiencias`, pero debe quedar documentado para SEO/canonical.
- `/prensa` no fue confirmado como 404 en este barrido; se mantiene como ruta a revisar si queda visible en footer/header.
- WhatsApp/teléfono/calendario son conversión fuera de scope transaccional, coherente con ADR-024, pero deben validarse con click manual en mobile real antes de cutover.
- Links legales cargan WordPress externo. Son aceptables solo si la estrategia de cutover permite dependencia externa temporal.

## Checks automatizados

| Check | Resultado | Nota |
|-------|-----------|------|
| `npm test -- --runTestsByPath __tests__/middleware/locale-site-route.test.ts` | PASS | 11 tests pasaron. |
| Barrido Playwright no destructivo | PASS con hallazgos | 20 rutas x 2 viewports; screenshots y JSON generados. |
| Navegador integrado | FAIL esperado sin preview | `Preview token required`; confirma que el navegador sin cookie/token no puede auditar. |
| `LHCI_TENANT=colombiatours bash scripts/lighthouse-ci.sh` | FAIL de ejecución | `EADDRINUSE` en `3001` y Lighthouse recibió `401`; sin score útil. |
| Specs enfocadas `@public-search`, `public-seo`, `public-structured`, `public-hreflang`, `public-sitemap` | No ejecutadas | Se detienen hasta resolver preview token/Lighthouse y rutas P0 para evitar ruido no accionable. |

## Hallazgos conocidos revalidados

- `/privacy`: sigue resolviendo hacia WordPress externo; en esta corrida cargó, pero mantiene riesgo de timeout/bloqueo QA.
- Hotel SEO `0.92` por meta description: no se revalidó Lighthouse por fallo `401`; sigue abierto por evidencia previa y por 65 entradas de consola/fallbacks en hotel Aloft.
- Anchors `#activities`/`#hotels`: no fueron el bloqueo principal en esta corrida; revisar si esos anchors siguen visibles en footer/header tras corregir rutas P0.
- `/prensa` y newsletter: `/prensa` queda como pendiente de confirmación visual si está visible; newsletter requiere validación funcional del endpoint.

## Recomendación de salida

No cortar WordPress todavía. Orden recomendado:

1. Corregir rutas P0 de detalle: slugs legacy, aliases o contenido migrado faltante.
2. Resolver autenticación de preview para herramientas QA y rerun Lighthouse con token/cookie.
3. Sanear schema mismatches y fallbacks del hotel/productos.
4. Decidir estrategia legal: migrar local o aceptar dependencia externa explícita.
5. Repetir barrido completo y publicar nuevo sign-off con Lighthouse válido.
