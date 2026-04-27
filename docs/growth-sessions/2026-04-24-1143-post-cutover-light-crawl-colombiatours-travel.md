---
session_id: "2026-04-24-1143-post-cutover-light-crawl"
started_at: "2026-04-24T11:43:00-05:00"
ended_at: "2026-04-24T11:47:00-05:00"
agent: "codex-desktop"
scope: "audit"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "Listo hagamoslo asi"
outcome: "completed"
linked_weekly: ""
related_issues: [22, 24, 99, 290]
---

# Session audit — colombiatours-travel — 2026-04-24 11:43

## Intent

Ejecutar la fase recomendada para el cutover del Epic #22: crawl liviano propio en T+0, sin DataForSEO OnPage grande, usando `colombiatours.travel` ya servido por Bukeer Studio.

## Plan

1. Crear un crawler liviano repetible para producción.
2. Leer sitemap, combinar con rutas críticas de cutover y limitar a 300 URLs.
3. Verificar status, redirects, title, meta description, H1, canonical, robots, hreflang básico, JSON-LD y 200 con contenido de "not found".
4. Exportar JSON, CSV y Markdown.
5. Registrar hallazgos y siguiente acción.

## Executed actions

### 1. Script de crawl

- **Tool:** `apply_patch`
- **Input:** nuevo script `scripts/seo/post-cutover-light-crawl.mjs`
- **Output:** crawler CLI repetible.
- **Reasoning:** Necesitamos una herramienta propia para T+0/T+24/T+48/T+72 sin depender de DataForSEO durante estabilización.

### 2. Primer crawl

- **Tool:** `node scripts/seo/post-cutover-light-crawl.mjs`
- **Input:** `--baseUrl https://colombiatours.travel --limit 300`
- **Output:** descartado como reporte final porque el detector de 404 visual era demasiado amplio y confundía texto del bundle con contenido visible.
- **Reasoning:** El primer resumen marcó demasiados falsos positivos; se corrigió el detector antes de reportar.

### 3. Crawl final corregido

- **Tool:** `node scripts/seo/post-cutover-light-crawl.mjs`
- **Input:** `--baseUrl https://colombiatours.travel --limit 300 --outDir artifacts/seo/2026-04-24-post-cutover-light-crawl-v2`
- **Output:** `239` URLs auditadas desde `709` URLs detectadas en sitemap, sin errores HTTP/fetch.
- **Reasoning:** Validar inventario visible post-cutover sin crawler pesado.

## Results

| Metric | Value |
|---|---:|
| Sitemap URLs discovered | 709 |
| URLs crawled | 239 |
| HTTP 200 | 235 |
| Redirects | 4 |
| Fetch/HTTP errors | 0 |
| URLs with issues | 171 |

## Findings

| Priority | Finding | Count | Notes |
|---|---|---:|---|
| P0 | `visual_not_found_with_200` | 23 | URLs de blog en sitemap devuelven `Post no encontrado` con HTTP 200. |
| P1 | `missing_canonical` | 27 | Principalmente los 23 posts no encontrados + `/actividades` + legales. |
| P1 | `missing_h1` | 24 | Los 23 posts no encontrados + `/actividades`. |
| P2 | `long_title` | 144 | Optimización SEO posterior; no bloquea estabilidad T+0. |
| P2 | `unexpected_noindex` | 1 | Coincide con una URL que también es `Post no encontrado`. |

## P0 URL sample

Todas estas URLs responden `200` con title `Post no encontrado | ColombiaTours.Travel`:

- `https://colombiatours.travel/blog/10-must-visit-beaches-colombia`
- `https://colombiatours.travel/blog/15-best-vacation-destinations-colombia`
- `https://colombiatours.travel/blog/28-lugares-turisticos-colombia-descubriendo`
- `https://colombiatours.travel/blog/7-things-to-do-in-san-gil-santander`
- `https://colombiatours.travel/blog/adventure-family-tours-opiniones-colombia-from-mexico`
- `https://colombiatours.travel/blog/airlines-flying-to-colombia-from-mexico-trusted-travel-agencies`
- `https://colombiatours.travel/blog/airlines-from-mexico-to-colombia`
- `https://colombiatours.travel/blog/airlines-that-fly-to-colombia-from-mexico`
- `https://colombiatours.travel/blog/airlines-that-fly-to-colombia-from-mexico-vlr2`
- `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-bogota-tour`
- `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-top-islands`
- `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-visit-cali`
- `https://colombiatours.travel/blog/amazonia-colombia-heartbeat-of-the-planet`
- `https://colombiatours.travel/blog/best-destinations-colombia-travel-guide`
- `https://colombiatours.travel/blog/best-islands-colombia-tropical-paradise`
- `https://colombiatours.travel/blog/budget-friendly-destinations-colombia`
- `https://colombiatours.travel/blog/cano-cristales-colombia-travel-guide`
- `https://colombiatours.travel/blog/cano-cristales-un-rio-magico`
- `https://colombiatours.travel/blog/capurgana-colombia`
- `https://colombiatours.travel/blog/colombian-phrases-you-need-to-know`
- `https://colombiatours.travel/blog/colombiatours-travel-una-empresa-compromiso-social`
- `https://colombiatours.travel/blog/descubre-colombia-un-viaje-por-el-corazon`
- `https://colombiatours.travel/blog/descubre-las-islas-del-rosario`

## Mutations

| Entity | Action | Before | After | Source |
|--------|--------|--------|-------|--------|
| Repo tooling | Add script | no post-cutover light crawler | `scripts/seo/post-cutover-light-crawl.mjs` | user-approved cutover audit |

No Supabase/site content was changed.

## External costs

| Provider | Operation | Cost USD | Notes |
|----------|-----------|----------|-------|
| DataForSEO | none | 0.00 | DataForSEO intentionally skipped during T+0 stabilization. |

## Outputs delivered

- JSON: `artifacts/seo/2026-04-24-post-cutover-light-crawl-v2/post-cutover-light-crawl.json`
- CSV: `artifacts/seo/2026-04-24-post-cutover-light-crawl-v2/post-cutover-light-crawl.csv`
- Markdown: `artifacts/seo/2026-04-24-post-cutover-light-crawl-v2/post-cutover-light-crawl.md`
- Script: `scripts/seo/post-cutover-light-crawl.mjs`

## Next steps / handoff

1. Fix P0: remove the 23 missing blog URLs from sitemap or restore/redirect them to valid locale-aware posts.
2. Confirm `/actividades` canonical/H1 behavior: if it should redirect to `/experiencias`, canonical should reflect the final public route.
3. Re-run the crawler after P0 fix and again at T+24.
4. Keep DataForSEO OnPage crawl for post-T+72 enrichment, per Epic #22 guidance.

## Self-review

The lightweight crawl did the right job for T+0: it avoided paid/heavy crawling and surfaced a real sitemap/runtime mismatch without causing production load. The first detector was too broad; it was corrected before final reporting. Next iteration should add explicit robots.txt and sitemap.xml status rows and optionally compare `/en` vs `en.colombiatours.travel` once the subdomain gap is resolved.
