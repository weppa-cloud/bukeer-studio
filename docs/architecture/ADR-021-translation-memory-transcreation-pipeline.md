# ADR-021 — Translation Memory + AI Transcreation Pipeline

**Status:** Accepted (AI wiring pending [[SPEC #188]])
**Date:** 2026-04-17
**Principles:** P2 (Validate at Boundaries), P6 (AI Streaming-First), P7 (SEO by Default)

## Context

Bukeer Studio needs to translate SEO content (titles, descriptions, keywords) for package landing pages across multiple locales. Requirements:

1. Translations must be **brand-consistent** across content items (same glossary per site).
2. AI-generated drafts must be **human-reviewable** before going live.
3. Translation must **never overwrite canonical product data** (name, price, amenities — owned by Flutter app).
4. The pipeline must leverage **existing translations** to avoid redundant AI calls (TM pre-fill).
5. Jobs must be **trackable** with clear lifecycle states.

## Decision

Use a 4-stage pipeline with a state machine per job, enforced at the database and application layers.

### Pipeline stages

```
TM Lookup → Glossary Injection → AI Draft → Human Review → Apply → Publish
                                    ↑
                           (pending SPEC #188)
```

| Stage | Function | File |
|-------|----------|------|
| 1. TM pre-fill | `enrichDraftWithTM()` | `lib/seo/transcreate-workflow.ts` |
| 2. Glossary injection | `buildGlossaryPromptBlock()` | `lib/seo/transcreate-workflow.ts` |
| 3. AI draft | `streamText()` with `locale-adaptation` prompt | `lib/ai/prompts/locale-adaptation.ts` (**pending #188**) |
| 4. Review → Apply | Dashboard UI + status transition | `app/dashboard/[websiteId]/translations/` |

### Job lifecycle

```
pending → draft → reviewed → applied → published
                    ↓
                 rejected → draft (re-draft)
```

Stored in `seo_transcreation_jobs.status`. Status transitions are gated — no skipping from `draft` to `published`.

### Data tables

| Table | Purpose |
|-------|---------|
| `seo_translation_memory` | Fuzzy-matched previous translations (pg_trgm) |
| `seo_translation_glossary` | Per-site brand terms + forced translations |
| `seo_transcreation_jobs` | One row per content-item × locale × version |
| `seo_localized_variants` | Final applied content per locale, consumed by SSR |

All tables have account-based RLS (row-level security). No cross-tenant reads possible.

### Safety constraint — TRUTH_FIELD_DENYLIST

48 canonical product fields are permanently blocked from transcreation writes:

```typescript
// lib/seo/transcreate-workflow.ts
const TRUTH_FIELD_DENYLIST = [
  'name', 'description', 'price', 'amenities', 'capacity',
  // ... 43 more
];
```

Transcreation writes are restricted to SEO overlay columns on `website_product_pages` (title override, meta description, keywords). The source-of-truth product data in `products` / `package_kits` remains immutable from Studio.

### Locale tuple

Every job is identified by `{ sourceLocale, targetLocale, country, language }`. The country/language split enables per-market content adaptation (e.g., `es-CO` vs `es-MX` have different CTAs, pricing context).

### AI model

When #188 is implemented:
- Model: `anthropic/claude-sonnet-4-6` via OpenRouter (`OPENROUTER_MODEL` env var).
- Response format: streaming (`streamText`) to enable live preview in dashboard.
- Rate limit: 10 AI calls/day per `(website_id, target_locale)` to control cost.
- Prompt template: `lib/ai/prompts/locale-adaptation.ts` — injects TM context + glossary block + source content.

## Locale tuple

```typescript
interface TranscreateLocale {
  sourceLocale: string;  // e.g. 'es-CO'
  targetLocale: string;  // e.g. 'en-US'
  country: string;       // e.g. 'US'
  language: string;      // e.g. 'en'
}
```

## Quality controls

| Control | Implementation |
|---------|---------------|
| TRUTH_FIELD_DENYLIST | Compile-time array, enforced in workflow before any write |
| TM exact match | Skip AI call if similarity ≥ 95% — reuse existing translation |
| Human review gate | `status = 'reviewed'` required before `applied` |
| Drift detection | Source content change → mark job `needs_review` (pending #146) |

## Alternatives Rejected

| Option | Why rejected |
|--------|-------------|
| Machine translation (DeepL/Google Translate) | No glossary injection; brand inconsistency; no review workflow |
| Manual translation only | Doesn't scale across 10+ locales × 100+ packages |
| Auto-apply without review | Risk of incorrect locale adaptation going live; legal/brand risk |
| Overwrite product fields | Violates Flutter/Studio boundary — product truth lives in Flutter admin |

## Consequences

### Positive
- Brand consistency enforced via per-site glossary.
- Audit trail via `seo_transcreation_jobs` — every draft, review, and apply is tracked.
- Cost control via TM reuse + daily rate limit.
- Safety: canonical product data cannot be corrupted from Studio.

### Negative
- Human review is a bottleneck at scale — mitigated by TM high-confidence auto-apply (future).
- AI wiring is not yet live (#188 pending) — current pipeline produces enriched drafts but no AI text.
- 10/day rate limit may be too low for initial bulk-translation of existing catalogs — limit is adjustable.

## Related

- [[ADR-006]] — Streaming-first AI integration (streamText pattern)
- [[ADR-005]] — Defense-in-depth (RLS on translation tables)
- [[ADR-016]] — SEO caching (localized variants cache invalidation)
- [[SPEC #187]] — Multi-locale EPIC parent
- [[SPEC #188]] — AI transcreation wiring (streamText + locale-adaptation prompt)
- [[SPEC #189]] — Content fallback strategy + coverage matrix
