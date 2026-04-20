# CONTINUATION — pick up Stage 6 handoff mid-flight

**Para el próximo agente (Claude Code o humano):** aquí retomas el Paso 4 en adelante. Todo autonomous (Stage 0-6 + Cluster F) ya shipped en main. Paso 2 (env vars) + Paso 3 (data-fill) también completados en el último turno.

## Dónde quedó la sesión previa

- Repo: `/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio`
- Branch: `main`
- HEAD: `65aab56` (Cluster F merged) o descendant
- Session pool: **FREE 4/4** (recién liberado)
- Dev server previo mató por timeout compile Turbopack + Zod schema mismatch `getCategoryProducts` en log dev
- Playwright MCP iba a arrancar pero compile se estancó → retry o usa `npm run build && npm run start` para prod-mode

## State snapshot

### Prod Supabase — aplicado 2026-04-20

- ✅ W2 RPC expansion (`update_package_kit_marketing_field` allowlist +4)
- ✅ W2 activities parity DDL (12 cols) + `update_activity_marketing_field` RPC
- ✅ multi-locale columns en `website_blog_posts` / `website_pages` / `website_product_pages` / `websites`
- ✅ `account_feature_flags` ColombiaTours row `{scope:'website', studio_editor_v2_enabled=true}` (row id `477f33fe-d97d-4bd0-b17b-9e7a903d5537`)

### Env vars verificados

- Cloudflare Worker `bukeer-web-public`: `REVALIDATE_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` presentes
- GitHub Actions: `REVALIDATE_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` presentes (2026-04-19)
- `.env.local` local: `REVALIDATE_SECRET=F125AB8D-D0C0-41E9-8625-4937FC2F24E8` + `E2E_REVALIDATE_SECRET` (same value)

### Data fill 2 canonical picks

**Pkg 15D** (`fe7a1603-d434-4228-8d6e-d051d5bb7dc9`, slug `paquete-vacaciones-familiares-por-colombia-15-d-as`):
- `package_kits.description` 576 chars
- `program_highlights` 7 / `program_inclusions` 11 / `program_exclusions` 6
- `video_url` + `video_caption` + `cover_image_url` presentes
- `website_product_pages.custom_hero` + `custom_highlights` (6 strings) + `custom_faq` (6 Q&A) + `custom_sections` (1 testimonials) + full SEO overrides

**Act Guatape** (`0f334bee-f7ab-4503-8987-934cc7f86d81`, slug `tour-a-guatape-y-pe-ol`):
- Same shape as pkg: program_* + custom_* + SEO

Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441` · Account: `9fc24733-b127-4184-aa22-12f03b98927a`.

## Pasos restantes

### Paso 4 — Flow 1 walkthrough (interrumpido)

**Blocker previo:** Turbopack dev compile se estanca o `[product.v2-parse] Schema mismatch` en `getCategoryProducts`. Opciones:

**Opción A — Usar prod build (recomendado)**:
```bash
cd /Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio
eval "$(bash scripts/session-acquire.sh)"
# Build prod isolated per slot
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run build
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run start &
# o npm run start:prod:clean si quieres full clean
```

**Opción B — Dev mode con warm-up**:
```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
DEV_PID=$!
# Warm-up crítico — espera compile antes Playwright
timeout 180 bash -c "until curl -s -m 10 http://localhost:$PORT/site/colombiatours/ | grep -q 'colombiatours'; do sleep 5; done"
```

**Una vez server listo, ejecutar via Playwright MCP:**

```
Stories (marcar PASS/FAIL por cada + desktop + mobile):
1. Homepage           /site/colombiatours/
2. Search             /site/colombiatours/buscar
3. Pkg 15D detail     /site/colombiatours/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as
4. Pkg 15D EN         /site/colombiatours/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as
5. Act Guatape        /site/colombiatours/actividades/tour-a-guatape-y-pe-ol
6. Act Guatape EN     /site/colombiatours/en/actividades/tour-a-guatape-y-pe-ol
7. Hotel detail       /site/colombiatours/hoteles/<pick>   (query DB primero — partner no llenó)
8. Blog detail        /site/colombiatours/blog/<slug>
9. Privacy            /site/colombiatours/privacy
10. Terms             /site/colombiatours/terms
11. Legal             /site/colombiatours/legal
12. Translations      /dashboard/894545b7-73ca-4dae-b76a-da5b6a3f8441/translations (requiere auth)
SKIP: booking (ADR-024 DEFER)
```

**MCP tool sequence per story:**

```
mcp__playwright__browser_navigate  url=http://localhost:$PORT/site/colombiatours/<path>
mcp__playwright__browser_resize    width=1440 height=900
mcp__playwright__browser_take_screenshot  filename=qa-screenshots/pilot-colombiatours-2026-04-20/$SESSION_NAME/<story>/desktop.png fullPage=true
mcp__playwright__browser_console_messages  level=warning filename=artifacts/qa/pilot/2026-04-20/$SESSION_NAME/story-by-story/console/<story>.txt
mcp__playwright__browser_network_requests  static=false filename=artifacts/qa/pilot/2026-04-20/$SESSION_NAME/story-by-story/network/<story>.har
mcp__playwright__browser_resize    width=390 height=844    (iPhone 14)
mcp__playwright__browser_take_screenshot  filename=qa-screenshots/pilot-colombiatours-2026-04-20/$SESSION_NAME/<story>/mobile.png fullPage=true
```

**Paralelo Lighthouse AC-A5:**
```bash
bash scripts/lighthouse-ci.sh
# O contra pilot seed:
bash scripts/lighthouse-pilot.sh
```

Gate: SEO ≥ 0.90 (hard-block < 0.90), a11y ≥ 0.95 (hard-block < 0.85), perf ≥ 0.90 warn.

**Output deliverable:** crear `docs/qa/pilot/flow-1-walkthrough-2026-04-20.md` con tabla PASS/FAIL + issue list + Lighthouse scores + thumbnails.

**Doc referencia completa:** [`paso-4-flow1-walkthrough.md`](paso-4-flow1-walkthrough.md).

### Paso 5 — W7-c screencasts

**Doc:** [`paso-5-w7c-screencasts.md`](paso-5-w7c-screencasts.md) — 5 Loom videos shot-list.

No automatizable — Loom recording humano. Post-UI-freeze (tras Paso 4 OK).

Cuando listo:
```bash
# Actualizar training doc con links:
gh issue close 221 --comment "W7-c shipped: 5 Loom videos + Drive mirror. AC-W7-3 cerrado."
```

### Paso 6 — Sign-offs

**Doc:** [`paso-6-sign-offs.md`](paso-6-sign-offs.md) — templates AC-X4a + AC-X4b.

Post Paso 5:
1. Partner AC-X4a → comment en #207 con GO/NO-GO
2. QA-lead AC-X4b → comment en #207 con sign-off confirmation
3. Close #213 → close #214 EPIC cascade

### Paso 7 — DNS cutover

**Doc:** [`paso-7-dns-cutover.md`](paso-7-dns-cutover.md) — runbook completo + rollback.

T-24h pre-cutover:
- Backup WP
- Wrangler deploy verify
- DNS TTL 3600→300s

Cutover:
- Flip A/CNAME → `bukeer-web-public` Worker route `colombiatours.travel/*`
- Propagation watch 5-10min
- Smoke test 10 URLs
- Lighthouse live

Post-cutover T+2h:
- TTL 300→3600s
- Close #213 + #214
- Archive pilot branch

## Handoff docs al detalle

```
docs/ops/handoff-2026-04-20/
├── README.md                  ← índice maestro + timeline + PR history
├── paso-2-ops-env-vars.md     ← env vars (COMPLETADO 2026-04-20)
├── paso-3-partner-data-fill.md ← data fill (COMPLETADO 2026-04-20 via Supabase MCP)
├── paso-4-flow1-walkthrough.md ← Flow 1 MCP runner (ejecutar ahora)
├── paso-5-w7c-screencasts.md  ← Loom videos
├── paso-6-sign-offs.md        ← sign-off templates
├── paso-7-dns-cutover.md      ← cutover runbook
└── CONTINUATION.md            ← este doc
```

## Follow-ups cross-repo (non-blocker)

- **#234** bukeer-studio — extend `get_website_product_page` RPC para JOIN `package_kits.video_url` + `video_caption` → unlock VideoObject JSON-LD active pass. Requiere work en `weppa-cloud/bukeer-flutter` repo.

## Issues/PRs shipped today (2026-04-20)

```
PR #235  firefox VideoObject skip parity
PR #237  W4 pilot-seed + editor→render
PR #238  W5 transcreate lifecycle
PR #239  W6 matrix visual + Lighthouse
PR #240  docs deps Stage 4 complete
PR #241  W7-b training Flows 6/7/8
PR #242  Stage 6 autonomous baseline
PR #243  Cluster A transcreate fixes
PR #244  Cluster D validation
PR #245  Cluster C turbopack
PR #246  Cluster B matrix render
PR #247  Cluster E middleware locale
PR #248  Stage 6 FINAL revalidation
PR #249  handoff docs paso 2-7
PR #251  Cluster F residuales (F1 pkg RPC + F4 firefox isMobile)
```

Prod applied vía Supabase MCP (no PR):
- Migration `marketing_field_rpc_expand` (W2)
- Migration `activity_marketing_field_rpc` (W2)
- Migration `multi_locale_content_partial_finalize` (EPIC #128)
- Data seed `account_feature_flags` ColombiaTours row

## Qué ya NO hay que hacer

- ❌ NO aplicar más migrations sin plan (drift prod hay, backlog acepta post-pilot)
- ❌ NO tocar booking (ADR-024 DEFER)
- ❌ NO añadir editor UI para hotels (ADR-025 Flutter-owner)
- ❌ NO overwrite el work ya en main (verifica HEAD vs branches antes de editar)
- ❌ NO usar port 3000 directo (session pool only per `.claude/rules/e2e-sessions.md`)

## Qué deberías saber

- MCP Playwright + dev Turbopack combo es frágil en primera compile — prefer prod build o warm-up >3min antes de navegar
- Hotels no tienen data rellena (partner no ha llenado) — elegir uno live cualquiera o skip su story
- Translations dashboard story requiere auth — usa `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` de `.env.local`
- EN transcreate routes `/en/paquetes/<slug>` + `/en/actividades/<slug>` — renderá base locale hasta que transcreate apply corra (ver Paso 5 training Flow 4)
- Bundled playwright CLI conflict conocido — usa `npm run session:run` o `node node_modules/playwright/cli.js` directamente, no `npx playwright`

## Task state

Tasks internas del orchestrator (file-based, no GitHub issues):
- #61-#79 completados
- #82 Cluster F completed
- #84 data-fill completed
- #85 Flow 1 walkthrough **in_progress** (interrupted)

Próximo agente: claim slot s1 → boot prod build → Playwright MCP walkthrough 12 stories → emit flow-1 report + sign-off stub update.
