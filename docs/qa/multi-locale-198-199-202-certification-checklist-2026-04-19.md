# Certificación QA — Issues #198, #199, #202

Fecha de corte: **2026-04-19**  
Responsable QA: **@yeisongomez**

Formato ejecutable: **AC -> test/evidencia -> owner -> estado**

## Issue #198 — EPIC Multi-Locale Content Parity

| AC congelado | Test / evidencia | Owner | Estado |
|---|---|---|---|
| Phase 1 i18n UI strings completada (fundación) | Checklist de #199 + barrido hardcoded en site público (`hardcoded-ui: ok`) en [`artifacts/qa/2026-04-19/lint-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/lint-final.txt) | FE + QA | **PARCIAL** |
| Phase 2 schema extendido + apply workflow estable | Checklist de #202 + E2E lifecycle serial (`3 passed`) en [`artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt) | BE + QA | **PARCIAL** |
| Gate final global del EPIC (lint/typecheck/unit/API/E2E pool) | Lint/typecheck/unit/API OK; E2E global falla (59 failed) en [`artifacts/qa/2026-04-19/e2e-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-final.txt) | QA | **BLOQUEADO** |
| Cierre del EPIC | Fases 3-8 siguen fuera de alcance de este corte | Product + QA | **NO CERRABLE** |

## Issue #199 — Phase 1 UI Strings i18n Bundle Foundation

| AC congelado | Test / evidencia | Owner | Estado |
|---|---|---|---|
| Cero hardcoded ES en `app/site` y `components/site` | Scanner expandido + barrido total: `node scripts/lint-hardcoded-public-ui.mjs` => `hardcoded-ui: ok` en [`artifacts/qa/2026-04-19/lint-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/lint-final.txt) | FE | **PASS** |
| CI lint rule detecta hardcoded UI | Script [`scripts/lint-hardcoded-public-ui.mjs`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/scripts/lint-hardcoded-public-ui.mjs) ejecutado dentro de `npm run lint` | FE | **PASS** |
| Cobertura de textos con bundle/helper central | Reemplazos en `app/site` + `components/site` usando [`lib/site/public-ui-extra-text.ts`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/lib/site/public-ui-extra-text.ts) y [`lib/site/public-ui-messages.ts`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/lib/site/public-ui-messages.ts) | FE | **PASS** |
| Typecheck sin regresiones | [`artifacts/qa/2026-04-19/typecheck-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/typecheck-final.txt) | QA | **PASS** |
| Unit/API sin regresiones | [`artifacts/qa/2026-04-19/unit-api-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/unit-api-final.txt) (50 suites / 344 tests PASS) | QA | **PASS** |
| E2E global en session pool | Falla por regresiones transversales no acotadas a #199 en [`artifacts/qa/2026-04-19/e2e-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-final.txt) | QA | **BLOQUEADO** |

## Issue #202 — Phase 2 Extended AI Schema for Body Content

| AC congelado | Test / evidencia | Owner | Estado |
|---|---|---|---|
| Contract-first: parse v1/v2/v2.1 sin romper | Ajuste de `payloadV2` union priorizando v2.1 en [`packages/website-contract/src/schemas/seo-content-intelligence.ts`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/packages/website-contract/src/schemas/seo-content-intelligence.ts) | BE | **PASS** |
| Migración segura `payload_v2` + `body_content` | Columnas verificadas en DB + migraciones aplicadas (`transcreate_payload_v2_and_body_content`, `website_product_pages_locale_overlay`) | BE | **PASS** |
| Overlay product por locale (sin colisión mono-locale) | Nueva migración [`supabase/migrations/20260502020000_website_product_pages_locale_overlay.sql`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/supabase/migrations/20260502020000_website_product_pages_locale_overlay.sql) aplicada; índice `uq_website_product_pages_locale_product` activo | BE | **PASS** |
| E2E lifecycle `draft -> reviewed -> applied` v2.0 y v2.1 estable | Ejecución serial en pool (`3 passed`) en [`artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt) | QA | **PASS** |
| Sin fallas por auth/rate-limit en corrida masiva | En E2E global se observan `AUTH_EXPIRED` + `429 over_request_rate_limit`; transcreate v2.1 cae en ese contexto | BE + QA | **FAIL** |
| Gate final global (session pool) | [`artifacts/qa/2026-04-19/e2e-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-final.txt): 239 passed, 59 failed, 47 skipped | QA | **FAIL** |

## Gate final consolidado

| Gate | Evidencia | Estado |
|---|---|---|
| Lint | [`artifacts/qa/2026-04-19/lint-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/lint-final.txt) | **PASS** |
| Typecheck | [`artifacts/qa/2026-04-19/typecheck-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/typecheck-final.txt) | **PASS** |
| Unit/API | [`artifacts/qa/2026-04-19/unit-api-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/unit-api-final.txt) | **PASS** |
| E2E pool (full) | [`artifacts/qa/2026-04-19/e2e-final.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-final.txt) | **FAIL** |
| E2E transcreate (aislado, serial) | [`artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt`](/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/artifacts/qa/2026-04-19/e2e-transcreate-final-serial.txt) | **PASS** |

## Dictamen QA al corte

- **#199:** técnicamente listo por alcance funcional (hardcoded barrido + lint + type/unit), pero bloqueado para certificación total por gate E2E global.
- **#202:** workflow v2/v2.1 validado de extremo a extremo en corrida aislada; **no certificable globalmente** hasta resolver fallas auth/rate-limit bajo carga del suite completo.
- **#198:** no cerrable (EPIC padre con fases posteriores pendientes y gate global en rojo).
