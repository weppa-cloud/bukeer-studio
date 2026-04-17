# Growth Readiness Evidence — colombiatours.travel

Suite de validación real-data contra tenant productivo ColombiaTours.Travel (`website_id = 894545b7-73ca-4dae-b76a-da5b6a3f8441`).

Mapa de artefactos:

| Archivo | Generado por | Contenido |
|---------|--------------|-----------|
| `integration-health-YYYY-MM-DD.json` | `scripts/seo/growth-readiness-check.mjs` | Ping GSC/GA4/DataForSEO/AI/Supabase + freshness + readiness level |
| `journey-trace.json` | `e2e/tests/growth-real-data/growth-journey.spec.ts` | Timing + console errors + screenshot refs por paso |
| `screenshots/*.png` | Todos los specs growth-real-data + journey | Feedback visual per flow |
| `ux-fluency.md` | `scripts/seo/ux-fluency-report.mjs` | Matriz 5-dim x 10 flujos + verdict |
| `production-ready-attestation.md` | `scripts/seo/ux-fluency-report.mjs` | Respuesta SI/PARCIAL/NO + known gaps |

## Ejecución completa

```bash
# 0. Cargar env local (creds GSC/GA4/OpenRouter/DataForSEO/Supabase service role)
#    consultoria@weppa.co / contraseña en .env.local como E2E_USER_EMAIL/E2E_USER_PASSWORD

# 1. Integration health (rápido, sin dev server)
node scripts/seo/growth-readiness-check.mjs --website-id=894545b7-73ca-4dae-b76a-da5b6a3f8441

# 2. Suite E2E completa por capa (usa session pool — ver docs/development/local-sessions.md)
npm run session:list
npm run session:run -- e2e/tests/growth-real-data/contenido.spec.ts --project=chromium --workers=1
npm run session:run -- e2e/tests/growth-real-data/analytics.spec.ts --project=chromium --workers=1
npm run session:run -- e2e/tests/growth-real-data/blog.spec.ts --project=chromium --workers=1
npm run session:run -- e2e/tests/growth-real-data/translations.spec.ts --project=chromium --workers=1
npm run session:run -- e2e/tests/growth-real-data/growth-journey.spec.ts --project=chromium --workers=1

# 3. Consolidar reporte UX
node scripts/seo/ux-fluency-report.mjs
```

## Tags disponibles

| Tag | Alcance |
|-----|---------|
| `@real-data` | Todos los tests del suite real-data |
| `@contenido` | Capa Contenido (9 tests) |
| `@analytics` | Capa Analytics (10 tests) |
| `@blog` | Capa Blog (8 tests) |
| `@translations` | Capa Traducciones (10 tests) |
| `@growth-journey` | Journey E2E (1 test largo) |
| `@known-gap` | Tests que documentan gaps conocidos sin fallar el gate |
| `@partial` | Sub-tabs PLACEHOLDER/PARCIAL |

## Criterios production-ready

| Capa | PASS | WARN | FAIL |
|------|------|------|------|
| Contenido | ≥7/9 | Kanban + Low CTR mock | Guardrail Paquete falla |
| Analytics | ≥6/10 | Competitors/AI Visibility/Backlinks | Sync, Keywords o Clusters break |
| Blog | ≥5/8 | AI button no visible, cluster UI gap | Publish roundtrip falla |
| Translations | ≥5/10 | Dashboard ausente, bulk ausente | apply muta source content |
| Journey | 10/10 pasos completables, <25min | Latency step >30s | Dead-end no recuperable |
| UX Matrix | ≥7/10 PASS | — | <5/10 PASS |

## Decisión final

Archivo `production-ready-attestation.md` responde la pregunta del playbook:

> ¿Puede un usuario ejecutar los flujos de growth SEO con experiencia fluida?

Posibles: **SI** / **PARCIAL** / **NO**, con rationale + known gaps priorizados.

## Security

- No commitear `.env.local` ni `.env.local.e2e` (gitignored via `.env*`).
- No commitear `e2e/.auth/user.json` (gitignored).
- Screenshots revisados: ningún frame captura campos password.
- Service role key solo se usa server-side en scripts.
