# ColombiaTours Content Classification — 2026-04-23

## Veredicto

Implementado.

La revisión confirmó que los contenidos SEO editoriales deben conservarse como blog, las páginas legales deben quedar como páginas adicionales/legal, y el paquete Bogotá ya existe en Studio con un slug distinto al de WordPress. Se aplicaron cambios idempotentes en Supabase para completar faltantes y redirects.

## Matriz

| Producción WordPress | Clasificación Studio | Estado Supabase | Acción aplicada |
|---|---|---|---|
| `/viajar-por-colombia-en-15-dias/` | Blog | `FOUND_BLOG` (`website_blog_posts`, locales `es` y `en`) | Sin duplicar. Redirect 301 existente a `/blog/viajar-por-colombia-en-15-dias` confirmado. |
| `/guia-completa-para-viajar-a-colombia/` | Blog | `FOUND_BLOG` (`website_blog_posts`, locale `es`) | Sin duplicar. Redirect 301 existente a `/blog/guia-completa-para-viajar-a-colombia` confirmado. |
| `/l/explora-bogota-4dias-3noches/` | Producto paquete | `FOUND_PACKAGE_DIFFERENT_SLUG` (`package_kits.slug = bogota-esencial-cultura-y-sal-4-dias`) | Redirect 301 actualizado a `/paquetes/bogota-esencial-cultura-y-sal-4-dias`. |
| `/terminos-y-condiciones/` | Página legal/adicional | `MISSING_PAGE` | Insertada `website_pages.slug=terms`; HTML legal migrado a `accounts.terms_conditions`; redirect 301 a `/terms`. |
| `/terminos-y-condiciones/politica-de-privacidad/` | Página legal/adicional | `MISSING_PAGE` | Insertada `website_pages.slug=privacy`; HTML legal migrado a `accounts.privacy_policy`; redirect 301 a `/privacy`. |
| `/terminos-y-condiciones/politica-de-cancelacion/` | Página legal/adicional | `MISSING_PAGE` | Insertada `website_pages.slug=cancellation`; HTML legal migrado a `accounts.cancellation_policy`; redirect 301 a `/cancellation`. |
| `/legal` | No heredada | Producción devuelve 404 | No migrada. No debe ser P0 heredado. |

## Cambios Aplicados

- `website_blog_posts`: sin inserciones; los blogs ya existían como blog.
- `website_pages`: insertadas páginas `terms`, `privacy`, `cancellation` como `page_type='static'`, `is_published=true`, `locale='es-CO'`.
- `accounts`: actualizados `terms_conditions`, `privacy_policy`, `cancellation_policy` desde HTML de WordPress para que las rutas dedicadas `/terms`, `/privacy`, `/cancellation` rendericen localmente y no redirijan a WordPress.
- `website_legacy_redirects`: confirmados/insertados/actualizados redirects 301 desde rutas WordPress reales hacia rutas Studio.
- `slug_redirects`: confirmado `paquete-bogot-4-d-as` e insertado `explora-bogota-4dias-3noches` hacia `bogota-esencial-cultura-y-sal-4-dias`.
- Código: la ruta interna `/site/[subdomain]/paquetes/[slug]` ahora consulta `slug_redirects` cuando no encuentra un paquete, para que el preview local respete aliases igual que el dominio custom.

## Verificación

Rutas verificadas con preview token en `http://localhost:3001/site/colombiatours`:

| Ruta local | Resultado |
|---|---|
| `/blog/viajar-por-colombia-en-15-dias` | 200, H1 real, no 404 visual |
| `/blog/guia-completa-para-viajar-a-colombia` | 200, H1 real, no 404 visual |
| `/paquetes/bogota-esencial-cultura-y-sal-4-dias` | 200, H1 `Paquete Bogotá 4 días` |
| `/paquetes/explora-bogota-4dias-3noches` | Redirige/renderiza a `/paquetes/bogota-esencial-cultura-y-sal-4-dias` |
| `/paquetes/paquete-bogot-4-d-as` | Redirige/renderiza a `/paquetes/bogota-esencial-cultura-y-sal-4-dias` |
| `/terms` | 200 local, sin redirect externo |
| `/privacy` | 200 local, sin redirect externo |
| `/cancellation` | 200 local, sin redirect externo |

Check automatizado:

- `npm test -- --runTestsByPath __tests__/middleware/locale-site-route.test.ts` — PASS, 11/11.

## Pendientes

- Repetir auditoría cutover completa con la matriz corregida.
- Ajustar Lighthouse para preview token antes de usarlo como gate.
- Decidir si se quiere una nueva página índice `/legal`; no debe considerarse URL heredada.
