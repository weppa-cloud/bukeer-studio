# Provider Budget Counter (manual pre-#130 `seo_provider_usage`)

_Updated every session that invokes paid provider._

## Monthly caps (defaults)

| Provider                | Monthly cap USD                                                      |
| ----------------------- | -------------------------------------------------------------------- |
| DataForSEO              | 50.00 default; waived for ColombiaTours beta growth as of 2026-04-25 |
| NVIDIA Nim (OpenRouter) | 20.00                                                                |

## 2026-04 usage

### DataForSEO

| Date       | Operation                                                                                                | Cost USD | Session                                                                         | Note                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-25 | ColombiaTours beta growth batch: keyword overview, SERP competitors, ranked keywords, related keywords   | TBD      | `docs/growth-sessions/2026-04-25-1027-colombiatours-growth-dataforseo-batch.md` | User approved no budget restriction for beta partner growth; MCP did not return exact cost                                        |
| 2026-04-28 | ColombiaTours full OnPage crawl via DataForSEO, sitemap-respecting, max 1000 pages                       | TBD      | `artifacts/seo/2026-04-28-dataforseo-onpage-full`                               | User requested full URL audit; ColombiaTours beta usage remains waived, final API cost logged from task summary                   |
| 2026-04-30 | EPIC #310 next batch: Labs demand, competitor visibility, gap intersections, SERP organic and local pack | 0.348    | `artifacts/seo/2026-04-30-dataforseo-next-batch-labs-serp-apply`                | User approved paid calls without cost restriction; beta usage waived; actual provider costs are persisted in `seo_provider_usage` |
| 2026-04-30 | EPIC #310 controlled content scale: EN-US Labs/SERP demand batch                                         | 0.4100   | `artifacts/seo/2026-04-30-dataforseo-content-en-us-apply`                       | User approved paid calls without cost restriction; beta usage waived; actual provider costs are persisted in `seo_provider_usage` |
| 2026-04-30 | EPIC #310 controlled content scale: MX Labs/SERP demand batch                                            | 0.4052   | `artifacts/seo/2026-04-30-dataforseo-content-mx-apply`                          | User approved paid calls without cost restriction; beta usage waived; actual provider costs are persisted in `seo_provider_usage` |

**Subtotal: TBD / waived for ColombiaTours beta growth**

### NVIDIA Nim

| Date | Operation | Tokens | Cost USD | Session | Note |
| ---- | --------- | ------ | -------- | ------- | ---- |
|      |           |        |          |         |      |

**Subtotal: $0.00 / $20.00 (0%)**

---

## Rules

- Every paid call MUST append row in this file before execution
- At 80% cap → warning to user
- At 100% cap → abort operation, ask user to raise cap or wait next month
- Reset counter first of month (archive to `history/YYYY-MM-budget.md`)
