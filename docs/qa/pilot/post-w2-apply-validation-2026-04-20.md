# Post-W2 Apply Validation — Cluster D · Activity revalidate

**Date:** 2026-04-20
**EPIC:** #214 — Pilot Readiness (ColombiaTours)
**Issue:** #213 — Stage 6 autonomous follow-up
**Cluster:** D — activity seed + activity specs re-validation
**Branch:** `fix/stage-6-cluster-d-activity-revalidate`
**Base commit:** `b713be4` (PR #242 merged)
**Artifacts:** [`artifacts/qa/pilot/2026-04-20/post-w2-apply/`](../../../artifacts/qa/pilot/2026-04-20/post-w2-apply/)
**Related:** Relates to [#213](https://github.com/weppa-cloud/bukeer-studio/issues/213) · Follows [#216 W2](https://github.com/weppa-cloud/bukeer-studio/issues/216) apply

---

## 1. Goal

Stage 6 autonomous run (PR #242) flagged 3 activity matrix specs + 8 activity transcreate specs as `SKIP` with seed error:

```
activities.cover_image_url column not in Supabase schema cache
```

W2 #216 prod DDL was applied on 2026-04-20. This cluster re-validates that:

1. The `activities.cover_image_url` column now resolves in the PostgREST schema cache.
2. The pilot seed path (`e2e/setup/pilot-seed.ts::seedPilot(variant)`) inserts activity fixtures cleanly for all 4 variants (`baseline`, `translation-ready`, `empty-state`, `missing-locale`).
3. Activity-tagged pilot specs no longer SKIP for the seed reason — they either pass or surface a NEW, unrelated failure (handed off to cluster A / B / C).

---

## 2. Schema verification

### 2.1 DDL present in prod

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='activities'
  AND column_name IN (
    'cover_image_url','program_highlights','program_inclusions',
    'program_exclusions','last_edited_by_surface','description'
  );
```

| column_name | data_type |
|---|---|
| `cover_image_url` | `text` |
| `description` | `text` |
| `last_edited_by_surface` | `text` |
| `program_exclusions` | `jsonb` |
| `program_highlights` | `jsonb` |
| `program_inclusions` | `jsonb` |

### 2.2 W2 RPCs present

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public'
  AND routine_name IN ('update_activity_marketing_field','get_website_product_page');
```

Both present.

### 2.3 PostgREST schema cache reload

Issued once at the start of the validation run to flush any stale cache:

```sql
NOTIFY pgrst, 'reload schema';
```

No further reload was needed during the run.

---

## 3. Seed path validation

Probed `seedPilot(variant)` against prod for all 4 variants. Results:

| Variant | activityId | activitySlug | activityProductPageId | Seed warnings (activity) |
|---|---|---|---|---|
| `baseline` | `a7ccf9fd-…28f7` | `pilot-colombiatours-act-baseline` | `10a306fd-…4b462` | none |
| `translation-ready` | `605d4437-…dafd8` | `pilot-colombiatours-act-translation-ready` | `2be131ac-…a25d9` | none (one transient `TypeError: fetch failed` on first attempt; clean on retry) |
| `empty-state` | `81f21822-…63b5` | `pilot-colombiatours-act-empty-state` | `93fb048e-…dc7` | none |
| `missing-locale` | `2476ffbd-…1a67e` | `pilot-colombiatours-act-missing-locale` | `26151d16-…85aec` | none |

**Conclusion:** the seed bug reported at Stage 6 is resolved. No `schema cache` error appears in any variant. The activity upsert succeeds end-to-end for all content shapes the W4/W5/W6 specs consume.

### 3.1 Activity RPC resolution

For the `baseline` activity fixture, `get_website_product_page` resolves successfully with the new columns (verified indirectly via `pilot/lighthouse/pilot-lighthouse-activity.spec.ts` passing on chromium, which depends on the public activity detail route and thus on the RPC).

### 3.2 Unrelated seed bug surfaced (blog, not activity)

All 4 variants surface the same non-fatal blog warning:

```
pilot: website_blog_posts upsert (<slug>) failed:
  null value in column "translation_group_id" of relation "website_blog_posts"
  violates not-null constraint
```

Root cause: `upsertBlogPost` in `e2e/setup/pilot-seed.ts` (lines 664–692) does not set `translation_group_id`, but the column is `NOT NULL` in prod. This is outside cluster D scope (cluster B owns blog SEO fails: `blog-500`, `blog-BlogPosting`, `blog-hreflang`). Handoff documented; no activity spec depends on the blog fixture succeeding.

---

## 4. Test count deltas

### 4.1 Before (Stage 6 autonomous PR #242)

From the PR #242 report:
- 3 activity matrix specs SKIP (`cover_image_url` seed error)
- 8 activity transcreate specs SKIP (same)

### 4.2 After (this cluster, chromium)

| Spec | Before (Stage 6) | After (chromium) | Owner |
|---|---|---|---|
| `editor-render/activity-parity.spec.ts::DescriptionEditor on activity → public reflects edit` | SKIP (seed) | **FAIL** (new cause: `marketing-editor-description` save status "Guardado" not visible within 15s) | Cluster A |
| `matrix/pilot-matrix-public-activity.spec.ts::matrix walk renders expected blocks + captures visual snapshots` | SKIP (seed) | **FAIL** (same marketing-editor save-indicator wait) | Cluster A |
| `matrix/pilot-matrix-public-activity.spec.ts::matrix walk on mobile viewport` | SKIP (seed) | **FAIL** (same marketing-editor save-indicator wait) | Cluster A |
| `matrix/pilot-matrix-public-activity.spec.ts::edit description in Studio → public activity reflects edit` | SKIP (seed) | **FAIL** (same marketing-editor save-indicator wait) | Cluster A |
| `transcreate/hreflang-canonical.spec.ts::Activity — hreflang + canonical per locale + JSON-LD inLanguage` | SKIP (seed) | **PASS** | ✅ cluster D |
| `transcreate/idempotency.spec.ts::activity — apply + cleanup twice leaves no stray rows` | SKIP (seed) | **PASS** | ✅ cluster D |
| `transcreate/lifecycle.spec.ts::Activity (act) — draft → reviewed → applied` | SKIP (seed) | **PASS** | ✅ cluster D |
| `transcreate/public-render.spec.ts::Activity — /en/<segment>/<slug> renders applied EN content` | SKIP (seed) | **PASS** | ✅ cluster D |
| `lighthouse/pilot-lighthouse-activity.spec.ts::run lighthouse audit and record scores (desktop)` | — | **PASS** | ✅ cluster D |

**Net delta (chromium): 5 activity-tagged specs moved SKIP → PASS. 4 specs moved SKIP → FAIL on a NEW (non-seed) cause owned by cluster A.**

### 4.3 Firefox + mobile-chrome

Both browsers hit cascading `ECONNREFUSED` on `:3002` mid-run: the Next.js dev server was killed by the ISR revalidate spec (Turbopack stability issue tracked by cluster C — see `Turbopack-90s`). Once the server was killed, downstream specs (including activity transcreate) surfaced as SKIP/FAIL for an infra reason, not a seed reason.

Chromium is the canonical pilot signal (per `playwright.config.ts` project `pilot` definition). The activity seed fix is validated there.

---

## 5. Full suite counts per project

| Project | expected | skipped | unexpected | flaky | duration |
|---|---|---|---|---|---|
| chromium | 6 | 15 | 14 | 0 | 7m37s |
| firefox | 3 | 15 | 16 | 1 | 9m00s |
| mobile-chrome | 1 | 13 | 21 | 0 | 5m04s |

JSON reports:
- `artifacts/qa/pilot/2026-04-20/post-w2-apply/chromium-pilot.json`
- `artifacts/qa/pilot/2026-04-20/post-w2-apply/firefox-pilot.json`
- `artifacts/qa/pilot/2026-04-20/post-w2-apply/mobile-chrome-pilot.json`

---

## 6. Remaining bugs (not cluster D scope)

| Symptom | Owner | Notes |
|---|---|---|
| `marketing-editor-description` save status not visible within 15s | Cluster A | affects activity-parity + activity matrix (3 specs) — matrix wait logic |
| `pkg-hreflang`, `pkg-meta_title` | Cluster A | package transcreate |
| `blog-500`, `blog-BlogPosting`, `blog-mobile-breadcrumb` | Cluster B | blog SEO |
| `hotel-schema` | Cluster B | hotel JSON-LD |
| `stream-400` | Cluster A/B | stream endpoint test |
| `Turbopack-90s` + ISR dev-server crash on firefox/mobile | Cluster C | infra stability |
| `website_blog_posts.translation_group_id` NOT NULL seed bug | (new finding) | blog-only; seed helper fix. Cluster B may absorb with blog-500 fix since it gates blog specs. |

---

## 7. Partner walkthrough recommendation

Pilot seed creates fixtures with minimum required content (many fields `NULL` or `[]`). That's fine for unit E2E. For the partner ColombiaTours walkthrough:

- **Use the Studio editor UI** to fill real content on the partner's actual picks (not pilot-* seeded rows):
  - `custom_hero` (title, subtitle, background image)
  - `custom_highlights` (3–5 entries per package/activity)
  - `custom_faq` (3–5 Q&A per package/activity)
  - `program_highlights` (in-product marketing body, via `update_package_marketing_field` + `update_activity_marketing_field` RPCs)
  - `cover_image_url` + `program_gallery` (hero + gallery media)
- Keep the seeded `pilot-colombiatours-*` fixtures only for automation — do not surface them in any partner demo URL.

---

## 8. Verdict

✅ **Cluster D goal met:** W2 prod DDL applied correctly. Activity seed path is unblocked. Activity transcreate specs (4) + activity lighthouse (1) now pass on chromium. Remaining activity matrix/parity failures are on a different, unrelated cause owned by cluster A and do not regress this cluster's deliverable.

❌ **Stage 6 cannot close yet:** clusters A + B + C still have open fails. Re-run this full matrix after they land to confirm the combined state.
