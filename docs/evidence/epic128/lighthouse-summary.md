# EPIC #128 Lighthouse Summary

- Date: 2026-04-17
- Command: `bash scripts/lighthouse-ci.sh`
- Session pool: `s1` on port `3001`
- Result: **assertions passed** (script exit code 0)
- Raw reports: `.lighthouseci/`
- Assertion file: `.lighthouseci/assertion-results.json` = `[]`
- Notes: rerun executed after performance remediations (framer removal on public template/product page path, deferred maps, dynamic split for heavy sections, cache on category products, preconnect restore).

## Current run window (4 runs per audited URL)

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/site/colombiatours/actividades/4x1-adventure` | 0.87–0.90 | 0.97 | 1.00 | 1.00 |
| `/site/colombiatours/hoteles/aloft-bogota-airport` | 0.94–0.97 | 1.00 | 1.00 | 1.00 |
| `/site/colombiatours/paquetes/paquete-bogot-4-d-as` | 0.86–0.91 | 1.00 | 1.00 | 1.00 |

## Target comparison (Epic gate)
- Target: `>= 0.90 / 0.95 / 0.95` (Perf/A11y/SEO)
- Status: **met by current LHCI assertions** (`warn` on performance threshold, `error` on a11y/seo; no assertion failures)
- Residual risk: performance variance remains on `actividades` and `paquetes` runs near/below 0.90.

## Artifacts
- [activities report (latest)](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_actividades_4x1_adventure-2026_04_17_21_38_51.report.json)
- [hotel report (latest)](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_hoteles_aloft_bogota_airport-2026_04_17_21_39_24.report.json)
- [package report (latest)](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_paquetes_paquete_bogot_4_d_as-2026_04_17_21_40_12.report.json)
