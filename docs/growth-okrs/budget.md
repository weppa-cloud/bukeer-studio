# Provider Budget Counter (manual pre-#130 `seo_provider_usage`)

_Updated every session that invokes paid provider._

## Monthly caps (defaults)

| Provider | Monthly cap USD |
|----------|----------------|
| DataForSEO | 50.00 |
| NVIDIA Nim (OpenRouter) | 20.00 |

## 2026-04 usage

### DataForSEO

| Date | Operation | Cost USD | Session | Note |
|------|-----------|----------|---------|------|
|      |           |          |         |      |

**Subtotal: $0.00 / $50.00 (0%)**

### NVIDIA Nim

| Date | Operation | Tokens | Cost USD | Session | Note |
|------|-----------|--------|----------|---------|------|
|      |           |        |          |         |      |

**Subtotal: $0.00 / $20.00 (0%)**

---

## Rules

- Every paid call MUST append row in this file before execution
- At 80% cap → warning to user
- At 100% cap → abort operation, ask user to raise cap or wait next month
- Reset counter first of month (archive to `history/YYYY-MM-budget.md`)
