# PT-BR blog routing + hreflang QA notes

Date: 2026-05-14
Task: transcreation-stabilization PT-BR/hreflang P0

## Production symptom before fix

Known production verifier/curl evidence showed:

- `https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama` returned HTTP 200 but rendered a Spanish soft 404 with `Página no encontrada`, `<html lang="es">`, and noindex markers.
- `https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama` returned 404/noindex instead of redirecting to the Brazil Portuguese canonical surface.
- Hreflang alternates could point to `/pt/blog/...` or omit `pt-BR` / `en-US` depending on translation locale normalization.

## Root cause fixed

- Public locale parsing only recognized two-letter prefixes, so `/pt-br/...` was not treated as a locale segment.
- Public path generation used language-only prefixes, so `pt-BR` emitted `/pt/...` instead of `/pt-br/...`.
- Middleware blog locale aliases mapped generic `pt` toward `pt-PT`; ColombiaTours uses `pt-BR`.
- Blog data access normalized only legacy `es`/`en` in some paths; `pt`, `fr`, and `de` now normalize to their regional BCP-47 locales at read time.

## Expected behavior after fix

- `/pt-br/blog/<slug>` resolves request locale `pt-BR`, strips the public locale segment to `/blog/<slug>`, and renders the published PT-BR row when present.
- `/pt/blog/<slug>` redirects permanently to `/pt-br/blog/<slug>` as the legacy/generic Portuguese alias for the Brazil Portuguese canonical surface.
- Hreflang alternates for a complete blog translation group include `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`, and `x-default`; the `pt-BR` alternate points to `/pt-br/blog/<slug>`, never `/pt/blog/<slug>`.

## Verification run locally

Focused Jest command used from the worktree, reusing the main repo node_modules because this worktree had no local install:

```bash
PATH=/opt/data/home/repos/bukeer-studio/node_modules/.bin:$PATH \
NODE_PATH=/opt/data/home/repos/bukeer-studio/node_modules \
node /opt/data/home/repos/bukeer-studio/node_modules/.bin/jest \
  --runTestsByPath \
  __tests__/lib/seo/locale-routing.test.ts \
  __tests__/lib/seo/hreflang-translated-locales.test.ts \
  __tests__/middleware/locale-site-route.test.ts \
  --runInBand
```

Result: 3 test suites passed, 48 tests passed.

## Post-deploy smoke checklist

```bash
curl -sI https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama
curl -sL https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama \
  | grep -E '<html lang=|rel="canonical"|hreflang="pt-BR"|hreflang="en-US"|noindex|Página no encontrada|inLanguage'

curl -sI https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama
```

Expected:

- `/pt-br/...` is indexable published PT-BR content, not Spanish 404/noindex.
- `/pt/...` permanently redirects to `/pt-br/...` when a published PT-BR row exists.
- Reciprocal localized blog pages include `hreflang="pt-BR"` pointing to `/pt-br/...` and `hreflang="en-US"` where an EN published row exists.
