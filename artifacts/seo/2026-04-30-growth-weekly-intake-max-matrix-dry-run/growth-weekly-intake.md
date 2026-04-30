# Growth Weekly Intake

Generated: 2026-04-30T16:53:18.718Z
Mode: dry-run
Status: PASS
Current run: 04291924-1574-0216-0000-e2085593ce67
Previous run: 04290125-1574-0216-0000-00a1195b1ba0

## Steps

| Status | Step | Exit | Duration ms | Command |
|---|---|---:|---:|---|
| PASS | gsc_inventory_normalizer | 0 | 2093 | `node scripts/seo/normalize-growth-gsc-cache.mjs --limit 100` |
| PASS | ga4_inventory_normalizer | 0 | 1116 | `node scripts/seo/normalize-growth-ga4-cache.mjs --limit 100` |
| PASS | dataforseo_v2_triage | 0 | 1456 | `node scripts/seo/triage-dataforseo-findings.mjs --current 04291924-1574-0216-0000-e2085593ce67 --previous 04290125-1574-0216-0000-00a1195b1ba0 --limit 200` |
| PASS | dataforseo_diff | 0 | 2298 | `node scripts/seo/diff-growth-audit-runs.mjs --current 04291924-1574-0216-0000-e2085593ce67 --previous 04290125-1574-0216-0000-00a1195b1ba0` |
| PASS | cache_health | 0 | 18681 | `node scripts/seo/growth-cache-health-report.mjs` |
| PASS | max_matrix_orchestrator | 0 | 45 | `node scripts/seo/run-growth-max-matrix-orchestrator.mjs --cadence weekly` |
| PASS | max_matrix_coverage | 0 | 18741 | `node scripts/seo/audit-growth-max-matrix-coverage.mjs` |
| PASS | max_matrix_council_enforcement | 0 | 686 | `node scripts/seo/generate-growth-max-matrix-council-artifact.mjs` |

## Output

### gsc_inventory_normalizer

Status: PASS

```text
{
  "mode": "dry-run",
  "cacheSets": {
    "queryPage": [
      {
        "cache_key": "2026-04-02|2026-04-29|query,page|*|es|25000",
        "cache_tag": "growth:gsc:website:894545b7-73ca-4dae-b76a-da5b6a3f8441:locale:es",
        "window": "2026-04-02..2026-04-29",
        "rows": 14789,
        "fetched_at": "2026-04-30T14:37:50.251+00:00"
      }
    ],
    "pageCountry": [
      {
        "cache_key": "2026-04-02|2026-04-29|page,country|*|es|25000",
        "cache_tag": "growth:gsc:website:894545b7-73ca-4dae-b76a-da5b6a3f8441:locale:es",
        "window": "2026-04-02..2026-04-29",
        "rows": 5186,
        "fetched_at": "2026-04-30T14:37:52.805+00:00"
      }
    ],
    "pageDevice": [
      {
        "cache_key": "2026-04-02|2026-04-29|page,device|*|es|25000",
        "cache_tag": "growth:gsc:website:894545b7-73ca-4dae-b76a-da5b6a3f8441:locale:es",
        "window": "2026-04-02..2026-04-29",
        "rows": 1765,
        "fetched_at": "2026-04-30T14:37:54.431+00:00"
      }
    ],
    "datePage": [
      {
        "cache_key": "2026-04-02|2026-04-29|date,page|*|es|25000",
        "cache_tag": "growth:gsc:website:894545b7-73ca-4dae-b76a-da5b6a3f8441:locale:es",
        "window": "2026-04-02..2026-04-29",
        "rows": 12022,
        "fetched_at": "2026-04-30T14:37:55.852+00:00"
      }
    ]
  },
  "opportunityCounts": {
    "page_country_market": 455,
    "page_device_mobile": 96,
    "query_page_poor_position": 39,
    "query_page_low_ctr": 178,
    "date_page_trend_watch": 149
  },
  "inventoryRows": 100,
  "applied": false,
  "outDir": "artifacts/seo/2026-04-29-growth-gsc-inventory-normalization"
}
```

### ga4_inventory_normalizer

Status: PASS

```text
{
  "mode": "dry-run",
  "window": {
    "from": "2026-04-02",
    "to": "2026-04-29"
  },
  "counts": {
    "growth_ga4_cache": 4,
    "ga4_reports": 4,
    "ga4_rows": 13940,
    "funnel_events": 10,
    "meta_conversion_events": 10,
    "candidates": 491,
    "inventory_rows": 100
  },
  "candidate_buckets": {
    "campaign_traffic_watch": 18,
    "event_page_dropoff": 324,
    "source_medium_page_opportunity": 95,
    "landing_low_activation": 54
  },
  "applied": false,
  "outDir": "artifacts/seo/2026-04-29-growth-ga4-inventory-normalization"
}
```

### dataforseo_v2_triage

Status: PASS

```text
{
  "mode": "dry-run",
  "counts": {
    "current_findings": 1528,
    "previous_findings": 851,
    "classified_findings": 1528,
    "root_patterns": 12,
    "inventory_updates": 145,
    "experiments": 5,
    "rejected_experiments": 7
  },
  "classification_counts": {
    "validity": {
      "v2_profile_discovery": 242,
      "real_persistent": 599,
      "needs_manual_validation": 22,
      "new_needs_validation": 351,
      "real_likely_batch": 314
    },
    "operational_severity": {
      "P0": 203,
      "WATCH": 889,
      "P1": 436
    },
    "root_pattern": {
      "status_or_soft_404": 203,
      "performance": 84,
      "canonical": 173,
      "internal_linking": 287,
      "metadata_template_or_content": 549,
      "media_assets": 190,
      "technical_watch": 42
    },
    "gate": {
      "blocks_scale": 203,
      "watch": 1065,
      "blocks_content_scale": 143,
      "blocks_targeted_scale": 117
    }
  },
  "top_artifact": "artifacts/seo/2026-04-29-dataforseo-v2-triage/dataforseo-v2-triage.md",
  "applied": false
}
```

### dataforseo_diff

Status: PASS

```text
{
  "current": 1528,
  "previous": 851,
  "new": 929,
  "open": 599,
  "resolved": 252,
  "regressed": 0,
  "watch": 51
}
```

### cache_health

Status: PASS

```text
{
  "outDir": "artifacts/seo/2026-04-30-growth-cache-health",
  "status": "PASS",
  "tables": [
    {
      "table": "growth_gsc_cache",
      "status": "PASS",
      "row_count": 6,
      "latest_at": "2026-04-30T14:37:57.635+00:00",
      "age_hours": 2.25
    },
    {
      "table": "growth_ga4_cache",
      "status": "PASS",
      "row_count": 4,
      "latest_at": "2026-04-30T14:38:06.201+00:00",
      "age_hours": 2.24
    },
    {
      "table": "growth_dataforseo_cache",
      "status": "PASS",
      "row_count": 32,
      "latest_at": "2026-04-30T15:49:40.775+00:00",
      "age_hours": 1.05
    },
    {
      "table": "seo_audit_findings",
      "status": "PASS",
      "row_count": 3133,
      "latest_at": "2026-04-30T15:50:47.628+00:00",
      "age_hours": 1.03
    },
    {
      "table": "seo_audit_results",
      "status": "PASS",
      "row_count": 4618,
      "latest_at": "2026-04-30",
      "age_hours": 16.88
    },
    {
      "table": "funnel_events",
      "status": "PASS",
      "row_count": 20,
      "latest_at": "2026-04-30T16:32:00.13+00:00",
      "age_hours": 0.35
    },
    {
      "table": "meta_conversion_events",
      "status": "PASS",
      "row_count": 14,
      "latest_at": "2026-04-30T16:31:55+00:00",
      "age_hours": 0.35
    }
  ],
  "gsc_search_appearance_discovery": "PASS",
  "max_matrix_status": "BLOCKED",
  "max_matrix_profiles": {
    "WATCH": 16,
    "BLOCKED": 22,
    "PASS": 7
  }
}
```

### max_matrix_orchestrator

Status: PASS

```text
{
  "status": "WATCH",
  "mode": "dry-run",
  "cadence": "weekly",
  "outDir": "artifacts/seo/2026-04-30-growth-max-matrix-orchestrator",
  "selected_profiles": 25,
  "runnable_now": 14,
  "blocked": 0,
  "watch": 11
}
```

### max_matrix_coverage

Status: PASS

```text
{
  "outDir": "artifacts/seo/2026-04-30-growth-max-matrix-coverage",
  "source": "scripts/seo/growth-provider-profile-registry.mjs",
  "profiles": 45,
  "summary": {
    "total_profiles": 45,
    "registry_present": true,
    "registry_loaded": true,
    "supabase_enabled": true,
    "by_status": {
      "partial": 43,
      "excluded/watch": 2
    },
    "by_priority": {
      "P0": 14,
      "P1": 24,
      "P2": 5,
      "P3": 2
    },
    "p0_p1_open_gaps": 38
  },
  "supabase": {
    "enabled": true,
    "tables_inspected": 42
  }
}
```

### max_matrix_council_enforcement

Status: PASS

```text
{
  "status": "BLOCKED",
  "outDir": "artifacts/seo/2026-04-30-growth-max-matrix-council",
  "counts": {
    "inputs_found": 2,
    "candidates": 50,
    "approved_active": 0,
    "blocked": 50,
    "rejected": 0
  }
}
```
