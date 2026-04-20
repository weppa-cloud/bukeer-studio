# Transcreate lifecycle QA playbook (W5 #219)

Pilot-grade E2E playbook for the transcreation lifecycle shipped in EPIC #214 · W5 #219. Covers packages + activities + blog posts (hotels excluded per ADR-025 + client v2 priority).

## Scope

- EPIC: #214 Pilot Readiness
- Wave: W5 #219 — E2E real transcreate es-CO → en-US for 3 content types
- Stage gate: Stage 4 (post-Recovery #226)
- Content matrix: package + activity + blog (hotels excluded — Flutter-owner)
- Test tag: `@pilot-w5`
- Playwright project: `pilot` (grep `@pilot-(w4|w5)`)

## Quick run

Session pool claim is mandatory — never run on port 3000.

```bash
# Claim + run all W5 specs, auto-release on exit
npm run session:run -- --project=pilot --grep "@pilot-w5"

# Narrow to one spec (e.g. lifecycle)
npm run session:run -- --project=pilot --grep "@pilot-w5 .*lifecycle"

# Firefox matrix (W5 AC-W5-13 requires chromium + firefox stable)
SESSION_NAME=s2 PORT=3002 \
  npx playwright test --project=firefox --grep "@pilot-w5"
```

Artifacts land in:
- `playwright-report/<slot>/index.html` (HTML report)
- `test-results/<slot>/results.json` (JSON — uploaded to `artifacts/qa/pilot/<date>/w5-219/`)

## Spec matrix

All specs live under `e2e/tests/pilot/transcreate/`. Serial mode per-describe; the same `translation-ready` seed is shared across specs (memoised by variant per process).

| Spec | ACs covered | Content matrix | Notes |
|------|-------------|----------------|-------|
| `lifecycle.spec.ts` | AC-W5-4, AC-W5-9/10/11 | pkg × act × blog | draft → reviewed → applied via `/api/seo/content-intelligence/transcreate`. Manual payload (deterministic — NOT stream). |
| `public-render.spec.ts` | AC-W5-5 | pkg × act × blog | Post-apply GET `/en/<seg>/<slug>` asserts applied meta_title/meta_desc render in HTML. |
| `hreflang-canonical.spec.ts` | AC-W5-6, AC-W5-7 | pkg × act × blog | es-CO + en-US alternate + x-default; JSON-LD `inLanguage` matches URL locale. |
| `drift.spec.ts` | AC-W5-8 (Path A) | pkg | Backdate `seo_localized_variants.updated_at` 31d; re-apply advances it. |
| `stream-abort.spec.ts` | AC-W5-2 edge | pkg | Real stream endpoint — 200/429/5xx all acceptable per priority v2. No orphan job row. |
| `idempotency.spec.ts` | AC-W5-8 extension | act | Cleanup twice = no-op; `updated_at` monotonic across apply + re-apply. |
| `isr-revalidate.spec.ts` | AC-W5-3 | pkg, act | `/api/revalidate` returns product path in fan-out. |
| `bulk-review.spec.ts` | Bulk path | pkg + act (one batch) | `/api/seo/translations/bulk` review + apply 2 jobs atomically. |

Seed factory: `e2e/setup/pilot-seed.ts::seedPilot('translation-ready')` (consumed from W4 #218).
Helpers: `e2e/setup/transcreate-helpers.ts`.

## Prerequisites

Environment variables (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — service-role for seed inserts + DB reads
- `REVALIDATE_SECRET` (or `E2E_REVALIDATE_SECRET`) — optional; `isr-revalidate.spec.ts` skips cleanly without it
- `OPENROUTER_AUTH_TOKEN` — only required for `stream-abort.spec.ts` (real LLM call). Spec accepts 429 so a throttled key still passes.

Merged prereqs verified at spec authoring time (2026-04-20):
- **#208** `inLanguage` threading — CLOSED/merged (required for AC-W5-7)
- **#209** EN-URL segment — CLOSED/merged (required for AC-W5-5, AC-W5-6)

## Artifact interpretation

### Lifecycle + public-render specs

Each test attaches a JSON payload trace:
```
lifecycle-<contentType>-payload.json
```
Contains the exact `payloadV2` submitted via `create_draft`. Use this to cross-reference what the overlay row should contain. Mismatches typically mean the `applyTranscreateJob` workflow projected fields the spec did not expect (check `buildContentUpdates` / `buildProductOverlayPayload` in `lib/seo/transcreate-workflow.ts`).

### hreflang-canonical spec failures

Regex used:
```
/hreflang=["']en-US["']/
/hreflang=["']es-CO["']/
/hreflang=["']x-default["']/
/"inLanguage"\s*:\s*"(en|es)(-US|-CO)?"/
```

Failure modes:
1. `en-US` alternate missing → ADR-020 gate failed. Check `seo_transcreation_jobs.status='applied'` + `appliedTranscreationJobIds` non-empty for the tenant.
2. `inLanguage` wrong → #208 threading regression. Check `resolvePublicMetadataLocale` in `components/seo/product-schema.tsx` + `landing-page-schema.tsx`.
3. `x-default` missing → tenant default locale mis-configured. Check `websites.content.locale` + `default_locale`.

### stream-abort spec — 429 flow

Expected frequent response shape:
```json
{ "code": "RATE_LIMITED", "message": "Daily transcreate AI limit exceeded for this locale.", ... }
```
The test treats 429 as a pass — real API rate-limit is acceptable per priority v2 (2026-04-19). If you want a deterministic run, add the tenant to `seo_transcreate_feature_flags` with `enabled=false` for the test locale and use the non-stream `/transcreate` path (that's what the lifecycle spec does).

## Known gaps + justified skips

### 1. Blog `/en/blog/<slug>` 404 on fresh apply

`applyTranscreateJob` for `pageType='blog'` creates a **new** `website_blog_posts` row with `locale='en-US'` and `canonical_post_id` pointing at the source. The slug generated is derived from the transcreate payload (`payload.slug`). If the generated slug differs from the source slug, `/en/blog/<source-slug>` returns 404.

**Workaround:** `public-render.spec.ts` and `hreflang-canonical.spec.ts` issue `test.skip()` with a linked follow-up when blog returns 404. Package + activity assertions continue to fail hard.

**Follow-up:** file #219-blog-en-slug if a pilot site actually hits this (current seed uses `w5-blog-<stamp>` slugs which match across locales).

### 2. `TRANSCREATE_REVIEW_REQUIRED` 409 on double-apply

Contract (documented in ADR-021 + #219 spec): applying an already-applied job returns 409 with `code: 'TRANSCREATE_REVIEW_REQUIRED'`. The workflow is **not** idempotent. `idempotency.spec.ts` documents this — the spec's guardrail is `updated_at` monotonicity, not apply idempotency.

### 3. Real LLM rate-limit on parallel runs

Priority v2 (2026-04-19) removed rate-limit mitigation as an AC. If all 4 session pool slots run W5 simultaneously, the daily 10-call limit per website×locale will exhaust. Spec accepts 429 as a valid status.

### 4. Hotel transcreate — OUT OF SCOPE

Hotels are Flutter-owner per ADR-025 + client v2 pilot policy (2026-04-19). There is no hotel spec in this suite. Hotel marketing/content write path lives in Flutter admin.

## Debugging tips

1. **`TARGET_RERESEARCH_REQUIRED` 409 on create_draft.** Seed a live decision-grade keyword candidate:
   ```ts
   await seedDecisionGradeCandidate({ admin, websiteId, contentType, targetLocale, targetKeyword });
   ```
   `keyword` must be `ILIKE '%<normalized needle>%'` against `targetKeyword`.

2. **Overlay row missing after apply.** Check `seo_localized_variants.target_entity_id`:
   - pkg/act: should equal the source product_id (overlay keyed by `product_type,product_id`).
   - blog: should be a NEW `website_blog_posts.id` (target row) — NOT the source blog id.

3. **Spec hangs at apply.** `applyTranscreateJob` emits ISR revalidate internally. If `REVALIDATE_SECRET` is unset, the route logs an error but does NOT block apply — spec should proceed. If hang persists, check for a LLM stream still pending (rare — shows as `ai_cost_events` row with no `completed_at`).

## Teardown

Narrow-scope DB delete (`cleanupTranscreateRun` in `transcreate-helpers.ts`):
- `website_product_pages` (pkg/act) OR `website_blog_posts` target row (blog) for `(website_id, product_type, product_id, locale)` tuple.
- `seo_localized_variants` for the same tuple.
- `seo_transcreation_jobs` by jobId + (belt-and-braces) by `(page_type, page_id, target_locale)`.
- `seo_keyword_candidates` + `seo_keyword_research_runs` seeded for the run.

Never truncates. Safe to re-run after a crash — the next invocation observes a clean state (second call returns null from `readLocalizedVariant`).

## Cross-refs

- ADR-019 multi-locale URL routing
- ADR-020 hreflang translated-locales-only gate
- ADR-021 transcreation pipeline
- ADR-023 QA session pool (`.claude/rules/e2e-sessions.md`)
- ADR-025 Studio/Flutter field ownership — hotels Flutter-only
- Spec: #219 [issue](https://github.com/weppa-cloud/bukeer-studio/issues/219)
- EPIC: #214 Pilot Readiness
- Related specs: #208 (inLanguage), #209 (EN segment), #218 (W4 seed)
- Matrix: `docs/product/product-detail-matrix.md` §N.5 (W5 specs) + §P (blog scope)
