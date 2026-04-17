# EPIC #128 Lighthouse Summary

- Date: 2026-04-17
- Command: `bash scripts/lighthouse-ci.sh`
- Session pool: `s1` on port `3001`
- Result: **failed assertions** (script exit code 1)
- Raw reports: `.lighthouseci/`
- Notes: final re-run executed after remediations on product detail routes (activity/hotel/package).

## Representative run scores

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/site/colombiatours/actividades/4x1-adventure` | 0.58 | 0.97 | 1.00 | 0.92 |
| `/site/colombiatours/hoteles/aloft-bogota-airport` | 0.80 | 1.00 | 1.00 | 0.92 |
| `/site/colombiatours/paquetes/paquete-bogot-4-d-as` | 0.75 | 1.00 | 1.00 | 0.92 |

## Assertion failures (`.lighthouseci/assertion-results.json`)
- Performance `< 0.90` on all three URLs.
- SEO `< 0.95` on all three URLs.
- Common SEO failing audit: `meta-description`.

## Target comparison (Epic gate)
- Target: `>= 0.90 / 0.95 / 0.95` (Perf/A11y/SEO)
- Status: **not met**

## Artifacts
- [activities report](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_actividades_4x1_adventure-2026_04_17_20_19_53.report.json)
- [hotel report](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_hoteles_aloft_bogota_airport-2026_04_17_20_20_37.report.json)
- [package report](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/.lighthouseci/localhost-_site_colombiatours_paquetes_paquete_bogot_4_d_as-2026_04_17_20_20_58.report.json)
