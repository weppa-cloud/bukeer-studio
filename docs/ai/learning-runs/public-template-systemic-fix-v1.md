# Learning run — Public template systemic fix v1

- Pipeline ID: public-template-systemic-fix-v1
- Date: 2026-05-15
- Branch: fix/public-template-systemic-fix
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/567
- Commits:
  - `f2c24b34` — `fix: localize public template routing`
  - `d203586e` — `fix: harden localized system routes`
  - `f8b7c7c1` — `fix: localize public route metadata`
- Task IDs:
  - `t_e1866446` — developer implementation, stale run closed
  - `t_e9365fc3` — CODE GATE, first FAIL then PASS after fixes
  - `t_163ce048` — QA CANARY, WARN
  - `t_da6a135a` — SEMANTIC GATE, WARN
  - `t_d2853966` — OPS handoff
  - `t_2c4bf706` — this learning capture

## Outcome

WARN with P0 cleared. The public template/routing blockers that prevented a safe Transcreation canary were resolved:

- localized system pages for contact/press now work for EN/PT/FR/DE on custom domains;
- localized aliases no longer fall through legacy redirects that drop the locale;
- catch-all metadata/render paths strip language segments consistently before category/product lookup;
- search and hotel listing metadata now use localized public UI copy;
- QA report and evidence were added at `docs/qa/public-template-systemic-fix-v1.md`.

The flow did not authorize a production deploy or mass transcreation. PR #567 is the handoff artifact.

## Gates

| Gate | Result | Notes |
| --- | --- | --- |
| Developer | PASS after stale run closure | `t_e1866446` had a stale/dirty run; it was formally blocked/closed before continuing. |
| CODE GATE | PASS after rework | First review caught FR/DE fallback gaps, raw slug use and missing rendered canary evidence. |
| QA CANARY | WARN | P0=0; remaining P1 content/transcreation debt documented. |
| SEMANTIC GATE | WARN | Commercial route surfaces acceptable for PR handoff, not mass rollout. |
| OPS | COMPLETE | PR #567, no manual deploy, mass transcreation remains blocked. |

## Lessons

1. **Localized aliases must bypass legacy redirects.** Legacy redirect lookup is useful for default-locale URLs, but it can destroy locale context when a localized alias such as `/pt-br/contacto` is redirected to `/contact`. Add a guard for localized system aliases before `tryLegacyRedirect` in every middleware branch.

2. **Slug normalization must be symmetric.** The catch-all route needs the same stripped `routeSlug`/`metadataSlug` semantics in metadata and render paths. Mixed raw `slug` usage creates localized category/product 404s that only appear under prefixed URLs.

3. **System fallback pages need locale-first priority for system aliases.** A default-locale alias row can preempt localized fallback content. For known system pages, localized fallback should win before a stale/default same-slug DB row.

4. **Rendered canary is mandatory.** Unit tests and typecheck were not enough; the actual blocker was visible only through `next start` with `Host: colombiatours.travel`.

5. **Metadata is part of localization.** Route content may render correctly while `<title>`, canonical/hreflang and JSON-LD still leak default-locale content. QA must inspect both HTML head and body.

6. **Content debt must be separated from template blockers.** Non-ES home pages still contain DB-authored Spanish body text. That is a Transcreation/content backlog item, not a middleware blocker. The gate should record it as P1 and prevent mass rollout until the locale/profile contract is fixed.

## Materialization Candidates

- **Tech-validator checklist:** require localized alias redirect guard review in all middleware branches.
- **QA preflight:** add a canary that runs `next start` on a non-3000 port with `Host: colombiatours.travel`, checking HTTP status, `html lang`, canonical, hreflang, `/site/colombiatours` leaks and title/body Spanish leak patterns.
- **Developer pattern doc:** document three-layer locale safety for public routes: middleware path resolution, catch-all slug normalization, and DB/fallback lookup priority.
- **Reviewer calibration:** CODE GATE should fail if FR/DE/PT localized fallback uses Spanish copy for system pages.
- **Transcreation gate:** mass transcreation stays blocked until target locale profiles are fresh and the home/content Spanish body debt is explicitly tracked.

## Selective Resume Guidance

After PR #567 is merged and deployed through normal CI:

- Allow `tech-validator`/`verifier` to run a single blog canary for `requisitos-para-viajar-a-colombia-desde-mexico`.
- Keep `investigator`, `cultural-validator` and `product-transcreator` quarantined for production-scale batches until the locale/profile contract is fixed.
- If two canaries surface the same locale/profile blocker, stop expansion and create a Dev Flow DAG instead of retrying.

## Evidence

- PR: https://github.com/weppa-cloud/bukeer-studio/pull/567
- QA report: `docs/qa/public-template-systemic-fix-v1.md`
- Main files:
  - `middleware.ts`
  - `app/site/[subdomain]/[...slug]/page.tsx`
  - `app/site/[subdomain]/page.tsx`
  - `app/site/[subdomain]/buscar/page.tsx`
  - `lib/site/system-fallback-pages.ts`
  - `lib/site/public-page-resolution.ts`
