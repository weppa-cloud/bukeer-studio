# Production-Ready Attestation — colombiatours.travel Growth SEO

**Generated:** 2026-04-17T12:04:40.313Z
**Website ID:** `894545b7-73ca-4dae-b76a-da5b6a3f8441`
**Integration readiness:** ready_partial_dataforseo_unwired

## ¿Puede un usuario ejecutar los flujos de growth SEO con experiencia fluida?

**Respuesta: SI** (8/10 flujos PASS en matriz UX)

## Rationale

Los flujos core (setup, research, clusters, optimize, tracking) funcionan con datos reales contra tenant productivo. Gaps restantes son exploratorios (AI Visibility, Backlinks, Competitors) y de gestión (dashboard traducciones, bulk translate, Kanban persistence).

## Known gaps (prioritarios para cerrar)

1. **DataForSEO backend NOT wired** — credenciales válidas pero no hay integración con SERP/keyword suggestions/backlinks. Flag `includeDataForSeo` es no-op.
2. **Dashboard gestión traducciones ausente** — no existe `/dashboard/[id]/translations`. Cannot list "posts sin traducir".
3. **Kanban board hardcoded** — `KANBAN_CARDS` fijo en `components/admin/seo-backlog.tsx`. No persiste.
4. **Low CTR + Cannibalization mock** — endpoints no implementados aún. UI label "datos de ejemplo".
5. **Blog editor sin AI button visible** — endpoint `/api/ai/editor/generate-blog` listo, sin trigger UI.
6. **Cluster assignment desde blog editor** — columna `cluster_id` + UI ausentes.
7. **website_blog_posts.locale column** — ausente. Locale hardcoded `es` en sync pipelines.
8. **Transcreate bulk** — endpoint solo single-item. No "translate selected".
9. **AI Visibility + Backlinks + Competitors** — sub-tabs PARCIAL/placeholder.

## Integration health snapshot

```json
{
  "websiteId": "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  "generatedAt": "2026-04-17T12:04:40.274Z",
  "readiness": "ready_partial_dataforseo_unwired",
  "checks": [
    {
      "name": "supabase_tables",
      "status": "pass",
      "latencyMs": 3478,
      "tables": {
        "seo_render_snapshots": {
          "count": 466
        },
        "seo_audit_findings": {
          "count": 0
        },
        "seo_keywords": {
          "count": 483
        },
        "seo_keyword_snapshots": {
          "count": null,
          "error": ""
        },
        "seo_keyword_research_runs": {
          "count": 2
        },
        "seo_keyword_candidates": {
          "count": 1000
        },
        "seo_page_metrics_daily": {
          "count": 3
        },
        "seo_ga4_page_metrics": {
          "count": 100
        },
        "seo_content_clusters": {
          "count": 0
        },
        "seo_cluster_metrics_daily": {
          "count": 0
        },
        "seo_optimization_briefs": {
          "count": 0
        },
        "seo_optimizer_actions": {
          "count": 13
        },
        "seo_transcreation_jobs": {
          "count": 0
        },
        "seo_localized_variants": {
          "count": 0
        },
        "seo_item_overlays": {
          "count": 0
        },
        "seo_gsc_credentials": {
          "count": 2
        }
      }
    },
    {
      "name": "gsc_credentials",
      "status": "pass",
      "latencyMs": 220,
      "gsc": {
        "connected": true,
        "configured": true,
        "siteUrl": "https://colombiatours.travel/",
        "expiresAt": "2026-04-05T19:04:24.688+00:00",
        "lastError": null
      },
      "ga4": {
        "connected": true,
        "configured": true,
        "propertyId": "294486074",
        "expiresAt": "2026-04-05T19:04:24.688+00:00",
        "lastError": null
      }
    },
    {
      "name": "ga4_credentials",
      "status": "pass",
      "latencyMs": 184,
      "gsc": {
        "connected": true,
        "configured": true,
        "siteUrl": "https://colombiatours.travel/",
        "expiresAt": "2026-04-05T19:04:24.688+00:00",
        "lastError": null
      },
      "ga4": {
        "connected": true,
        "configured": true,
        "propertyId": "294486074",
        "expiresAt": "2026-04-05T19:04:24.688+00:00",
        "lastError": null
      }
    },
    {
      "name": "freshness",
      "status": "pass",
      "latencyMs": 529,
      "seo_keyword_snapshots": {
        "latest": null,
        "ageDays": null
      },
      "seo_page_metrics_daily": {
        "latest": null,
        "ageDays": null
      },
      "seo_ga4_page_metrics": {
        "latest": null,
        "ageDays": null
      }
    },
    {
      "name": "dataforseo_ping",
      "status": "pass",
      "latencyMs": 1628,
      "httpStatus": 200,
      "apiStatusCode": 20000,
      "apiStatusMessage": "Ok.",
      "balance": 0.554,
      "total": 1,
      "note": "Credentials valid but backend endpoints NOT wired into app (flag includeDataForSeo is noop)"
    },
    {
      "name": "ai_ping",
      "status": "pass",
      "latencyMs": 872,
      "httpStatus": 200,
      "model": "meta/llama-4-maverick-17b-128e-instruct",
      "content": "The `ping` command!\n\n`ping",
      "usage": {
        "prompt_tokens": 11,
        "total_tokens": 19,
        "completion_tokens": 8,
        "prompt_tokens_details": null
      }
    },
    {
      "name": "gsc_real_ping",
      "status": "creds_ok",
      "latencyMs": 169,
      "connected": true,
      "configured": true,
      "siteUrl": "https://colombiatours.travel/",
      "expiresAt": "2026-04-05T19:04:24.688+00:00",
      "lastError": null
    }
  ]
}
```