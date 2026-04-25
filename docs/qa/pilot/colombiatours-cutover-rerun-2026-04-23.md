# ColombiaTours Cutover Rerun — 2026-04-23

## Veredicto

**SOFT-BLOCK**. El bloqueo crítico de contenido/rutas quedó resuelto: las rutas críticas ya renderizan contenido real, los legales son locales, los redirects legacy de Bogotá funcionan y Lighthouse ya no falla por SEO/accesibilidad. El corte aún conserva warnings de performance en páginas visualmente pesadas, especialmente el paquete familiar 15D.

## Decisión Blog vs Producto 15D

Recomendación aplicada: **mantener ambos sin duplicar**.

- Producto comercial existente: `/site/colombiatours/paquetes/colombia-en-familia-15-dias-aventura-y-confort`.
- Blog informativo existente: `/site/colombiatours/blog/viajar-por-colombia-en-15-dias`.
- No se creó otro producto ni otro blog. La intención queda separada: el blog captura demanda informativa y el paquete captura intención transaccional.

## Cambios Implementados

- `scripts/lighthouse-ci.sh` y `lighthouserc.js`: Lighthouse usa session pool, cookie de preview y URLs canónicas sin `preview_token`; el harness permite index solo con `LHCI_ALLOW_INDEX=1`.
- `next.config.ts`: build LHCI usa metadata bloqueante para que Lighthouse mida `<meta name="description">` en HTML inicial.
- `middleware.ts`: preview conserva `noindex` normal salvo en harness LHCI.
- `app/site/[subdomain]/blog/[slug]/page.tsx`: metadata de blog resuelve por locale y normaliza descripción; corrige slug duplicado ES/EN del artículo 15D.
- Contrato/product schema: `duration: null` y custom sections extendidas ya no generan warnings falsos.
- Footer newsletter: el formulario ya no apunta a una ruta muerta y usa endpoint local `/site/[subdomain]/api/newsletter`.

## Matriz Crítica

| Ruta | Resultado |
|---|---|
| `/paquetes/bogota-esencial-cultura-y-sal-4-dias` | 200, contenido real, schema SEO OK |
| `/paquetes/paquete-bogot-4-d-as` | Redirect interno a Bogotá canónico |
| `/paquetes/explora-bogota-4dias-3noches` | Redirect interno a Bogotá canónico |
| `/paquetes/colombia-en-familia-15-dias-aventura-y-confort` | 200, producto comercial 15D existente |
| `/blog/viajar-por-colombia-en-15-dias` | 200, BlogPosting, meta description OK |
| `/blog/guia-completa-para-viajar-a-colombia` | 200, BlogPosting, meta description OK |
| `/terms`, `/privacy`, `/cancellation` | 200 locales, sin redirect externo |
| `/legal` | 404 visual esperado; producción WordPress también 404, no se trata como heredado P0 |

## Lighthouse

Comando final:

```bash
LHCI_TENANT=colombiatours bash scripts/lighthouse-ci.sh
```

Resultado: **exit 0**. SEO, accessibility y best-practices pasan. Quedan warnings de performance:

| Ruta | Performance mínimo | SEO | A11y | Best Practices |
|---|---:|---:|---:|---:|
| `/actividades/4x1-adventure` | 0.85 | 1.00 | 0.95 | 1.00 |
| `/hoteles/aloft-bogota-airport` | 0.81 | 1.00 | 0.95 | 1.00 |
| `/paquetes/bogota-esencial-cultura-y-sal-4-dias` | 0.87 | 1.00 | 0.95 | 1.00 |
| `/paquetes/colombia-en-familia-15-dias-aventura-y-confort` | 0.77 | 1.00 | 0.95 | 1.00 |
| `/blog/viajar-por-colombia-en-15-dias` | 0.92 | 1.00 | 0.95 | 1.00 |
| `/blog/guia-completa-para-viajar-a-colombia` | 0.91 | 1.00 | 0.96 | 1.00 |

## Evidencia

- Ruta audit JSON: `artifacts/qa/pilot/2026-04-24/cutover-rerun/route-audit.json`
- Lighthouse reports: `.lighthouseci/*.report.html` y `.lighthouseci/*.report.json`
- Tests:
  - `npm test -- --runTestsByPath __tests__/middleware/locale-site-route.test.ts` PASS
  - `npm run typecheck` PASS
  - `LHCI_TENANT=colombiatours bash scripts/lighthouse-ci.sh` PASS con warnings de performance

## Hallazgos Restantes

- **P1 Performance:** paquete familiar 15D mide 0.77-0.78. Causa probable: peso visual/JS de detalle + media above-the-fold.
- **P2 QA env:** WebGL puede fallar en navegadores headless sin aceleración; no bloquea navegación ni Lighthouse final.
- **P2 Producción:** `/legal` no debe migrarse como heredado; crear solo si negocio quiere índice legal nuevo.
