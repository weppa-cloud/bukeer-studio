# SPEC — ColombiaTours locale/trust/commercial UX recovery (Week 2)

Status: Draft for PLAN validation
Owner role: T0_SPECIFIER
Tenant/site: ColombiaTours (`https://colombiatours.travel`)
Repository/worktree: `/opt/data/home/worktrees/colombiatours-public-routing-recovery`
Base branch: `feat/colombiatours-public-routing-recovery`
Feature branch: `feat/colombiatours-locale-trust-recovery`
Parent PR: https://github.com/weppa-cloud/bukeer-studio/pull/551
Created: 2026-05-15T12:57:33Z
Kanban task: `t_da3ad980`

## 1. Business goal

Move ColombiaTours public site quality from the Week 1 P0-stabilized baseline of approximately 5.5/10 to >= 7.5/10 by fixing the highest-impact locale, trust, and commercial UX issues without resuming mass content production.

Week 2 targets:

- P1 locale UX failures on `/pt`, `/fr`, `/de`: resolved or made explicitly safe/non-indexable where untranslated content remains.
- `/buscar` visible grammar and metadata duplication: resolved.
- `/hoteles` listing trust defects: resolved or backed by explicit data-remediation inventory where code cannot manufacture missing assets.
- Contact/press system fallback pages: locale-aware and commercially safe in ES/EN/PT/FR/DE.
- Commercial CTAs: WhatsApp/email/phone resolution is consistent across header/footer/fallback/detail surfaces.
- P2 content debt: inventory only; no broad data/content generation in this sprint.

## 2. Architectural constraints and ADR alignment

This work must comply with existing Bukeer Studio architecture:

- [[ADR-007]] Edge-first delivery on Cloudflare Workers:
  - Keep public route and metadata logic edge-compatible.
  - Do not add Node-only APIs or heavy per-request processing to middleware or server components.
  - Preserve existing ISR/cache policies on public pages.
- [[ADR-009]] Multi-tenant subdomain routing:
  - Continue routing custom-domain and subdomain traffic through middleware/internal rewrites.
  - Do not leak `/site/colombiatours` or `/domain/<host>` URLs on public custom-domain pages.
  - ColombiaTours-specific content must live in data/config or a clearly scoped fallback, not generic tenant-breaking hacks.
- [[ADR-011]] Middleware in-memory cache:
  - No new unbounded path/user cache entries.
  - Locale fixes should use existing locale-routing helpers, not ad hoc middleware cache behavior.
- [[ADR-013]] Tech Validator quality gate:
  - This SPEC must be reviewed in PLAN mode before implementation.
  - Implementation must pass CODE validation before merge.
- [[ADR-019]] Multi-locale URL routing:
  - Default locale remains unprefixed.
  - Non-default locales use first path segment prefixes (`/en`, `/pt`, `/fr`, `/de`).
  - Category segment localization must use `lib/seo/locale-routing.ts` canonical segment machinery rather than duplicated app routes.
- [[ADR-020]] hreflang emission policy:
  - Emit alternates only for translated/published locales plus default locale.
  - Do not create hreflang alternates for pages that only show untranslated fallback content.
  - `x-default` points to the default-locale URL for the same page.
- [[ADR-021]] Translation Memory + AI Transcreation Pipeline:
  - This sprint is remediation, not full transcreation.
  - Any data/content remediation must be separated from code remediation and should not bypass translation/transcreation governance.
- [[ADR-028]] Media Assets Canonical Registry:
  - Hotel image fixes must prefer canonical product/media assets. Code may add safe placeholders only when image data is absent and a real asset cannot be selected automatically.

## 3. Evidence baseline

Week 1 artifacts read for this SPEC:

- `docs/live-audit-report.md`
- `docs/ai/learning-runs/colombiatours-public-routing-recovery-w1.md`
- `docs/specs/generated/colombiatours-public-routing-recovery-SPEC.md`
- `docs/ops/colombiatours-routing-recovery-rollback.md`
- `lib/site/system-fallback-pages.ts`

Key Week 1 outcome:

- Contact/press P0 soft-404s were fixed by narrow synthetic fallback pages in `lib/site/system-fallback-pages.ts` integrated in `app/site/[subdomain]/[...slug]/page.tsx`.
- Remaining debt explicitly includes hardcoded Spanish fallback content, PT/FR/DE missing translations, `/buscar` title duplication and Spanish grammar, missing hotel images, placeholder activity content, migration/test blog content, generic blog subtitles, planner zero-count filters, and PT locale mapping inconsistency.

Static inspection during this SPEC found:

- `lib/site/public-ui-messages.ts` supports `es-CO`, `en-US`, `pt-BR`, `fr-FR`, `de-DE`, but currently maps `fr-FR` and `de-DE` to `ES_CO_MESSAGES` and has Spanish/PT copy without accents in places. This directly explains visible Spanish UI in FR/DE and low-trust localized UI.
- `app/site/[subdomain]/buscar/page.tsx` returns `title: Buscar | ${siteName}`; live audit still observed `Buscar | ColombiaTours.Travel | ColombiaTours.Travel`, so implementation must verify whether Next metadata templates append site name again and avoid manual duplication.
- `lib/site/public-ui-messages.ts` has ES search title `Que estas buscando?`; expected user-facing copy is `¿Qué estás buscando?`.
- `components/site/themes/editorial-v1/pages/hoteles-list-grid.client.tsx` already renders the count with a space between total and noun in source, but live audit saw `63 de 63hoteles`; implementation must reproduce on the active rendered template/CSS path before deciding whether this is already fixed by Week 1 branch or caused by minified/DOM spacing.
- `components/site/themes/editorial-v1/pages/hoteles-list.tsx` converts hotel images from `product.image || product.images[0]`; missing images for specific hotels are likely data/media gaps, with optional code fallback needed for visual consistency.
- `lib/site/system-fallback-pages.ts` currently generates Spanish-only contact/press titles, hero copy, section body, CTA labels, and SEO metadata.

## 4. Scope

### In scope — P1 code remediation

1. Locale UI safety for PT/FR/DE:
   - Fix public UI message mapping so FR and DE no longer use Spanish strings for shared UI chrome, search, footer, error/contact labels, booking/quote CTA labels, and editorial shell copy where existing message dictionaries drive the copy.
   - Improve PT strings that are visibly missing accents or read as low-quality machine/ASCII text where touched by this sprint.
   - Keep content/product body transcreation out of code scope; untranslated DB content may remain if clearly governed by fallback/noindex policy.
2. `/buscar` metadata and visible Spanish grammar:
   - Fix duplicate title behavior.
   - Fix ES title copy to `¿Qué estás buscando?`.
   - Keep search page `robots: noindex, follow`.
3. `/hoteles` trust fixes:
   - Fix count spacing if reproducible.
   - Ensure hotel cards/listing do not collapse trust when images are missing.
   - Provide a concrete data remediation list for hotels with missing canonical images.
4. Contact/press fallback locale awareness:
   - Generate locale-aware strings for ES/EN/PT/FR/DE.
   - Keep fallback narrow to known single-segment aliases (`contact`, `contacto`, `press`, `prensa`) and CMS-first.
5. Commercial CTA consistency:
   - Normalize channel resolution for WhatsApp/email/phone across public CTA surfaces touched by this sprint.
   - Ensure no `mailto:` or `wa.me` links emit empty, malformed, or tenant-wrong channels.

### In scope — P2 inventory only

- Inventory placeholder/test activity content on public pages.
- Inventory public migration/test blog posts and generic duplicate subtitles.
- Inventory planner filter zero-count symptoms if encountered during validation.
- Produce follow-up candidates or data-remediation artifact; do not attempt broad content cleanup in this code sprint.

### Out of scope

- Full PT/FR/DE content transcreation across products, pages, blogs, and destinations.
- Mass DB edits or publication/unpublication without a separate content/data remediation owner.
- New database schema migrations unless tech-validator explicitly approves after PLAN review.
- Manual deploys, Cloudflare rollbacks, or production writes.
- Redesigning the site beyond targeted trust/CTA fixes.

## 5. Functional requirements

### FR1 — Locale UI safety for PT/FR/DE

- `getPublicUiMessages('fr-FR')` and `getPublicUiMessages('de-DE')` must return FR/DE dictionaries, not `ES_CO_MESSAGES`.
- `/fr` and `/de` may still display untranslated CMS/product body content if no transcreation exists, but shared UI chrome must not be obviously Spanish where avoidable:
  - header nav labels,
  - footer section headings and CTA labels,
  - search page title/placeholder/no-result labels,
  - 404/error labels,
  - contact form labels,
  - quote/booking/WhatsApp flow labels,
  - mobile sticky bar labels.
- `/pt` must use PT-BR public UI strings and improve visible accented strings touched by this sprint.
- Locale dictionaries may be minimal but complete for the `PublicUiMessages` interface; missing keys must not fall back silently to Spanish for FR/DE.
- Development fallback warnings from `getPublicUiMessagesWithOverrides(...)` must not appear for FR/DE dictionaries in local checks.
- SEO/hreflang behavior must follow ADR-020: untranslated fallback UI does not by itself make a page eligible for translated hreflang emission.

Acceptance examples:

- PASS: `/fr` header/footer/search chrome uses French labels such as `Destinations`, `Forfaits`, `Rechercher`, `Parler via WhatsApp`; product body may be Spanish only if no translated data exists and hreflang does not claim FR content.
- PASS: `/de` chrome uses German labels such as `Reiseziele`, `Pakete`, `Suchen`, `Per WhatsApp sprechen`.
- FAIL: `/fr` footer still shows `RECIBE HISTORIAS`, `AGENCIA`, `Destinos`, `Paquetes` from Spanish UI dictionaries.

### FR2 — `/buscar` metadata and copy

- Visible ES heading must be `¿Qué estás buscando?`.
- Search metadata title must render as a single site-name title in browser/source:
  - acceptable: `Buscar | ColombiaTours.Travel`
  - unacceptable: `Buscar | ColombiaTours.Travel | ColombiaTours.Travel`
- If parent layout already applies a metadata title template, page metadata must provide the non-duplicating segment title (`Buscar`) or explicitly disable template duplication per Next.js behavior.
- Search metadata description should be locale-aware for ES/EN/PT/FR/DE where shared UI dictionaries support it, or remain Spanish only for default ES route.
- `/buscar` must remain `robots: noindex, follow`.
- Search results category links must use route-safe category slugs, not lowercase translated display labels that can become invalid for accented FR/DE/PT labels.

### FR3 — `/hoteles` trust fixes

- `/hoteles` must render a stable hotel listing with no visual text collision in the count line.
- Expected ES count line pattern: `63 de 63 hoteles` (or equivalent count for current data), with a visible space between the total and noun.
- If `TemplateSlot('hoteles-list')` is active for ColombiaTours, the editorial listing must own the final rendered page; generic `PackagesListingPage` fallback must not leak package-specific labels into the editorial rendered page.
- Hotels with no canonical image must not appear as broken/blank cards. Acceptable code-level treatments:
  - use `product.images[0]` if present;
  - use a tenant-approved generic hotel placeholder from the canonical asset registry/config;
  - render a deliberate branded placeholder block with alt text and no broken image request.
- Missing real hotel images must be recorded in a data remediation inventory at `docs/qa/colombiatours-week2-content-inventory.md` with at least hotel name, route/slug if known, missing field, and recommended owner.
- Known live-audit examples to verify: `Blu Hotel by Tamaca`, `Delirio Hotel`, `Diez Hotel Categoría Colombia`.

### FR4 — Contact/press fallback locale awareness

- `getSystemFallbackPage(...)` must remain CMS-first and narrow:
  - only single-segment known aliases,
  - no broad 404 masking,
  - unknown/multi-segment paths still return `null` and route to `notFound()`.
- Fallback generation must accept/use the resolved request locale where available.
- Contact fallback must provide locale-aware:
  - page title,
  - hero title/subtitle,
  - CTA text,
  - contact section title/subtitle/body,
  - SEO title/description.
- Press fallback must provide locale-aware:
  - page title,
  - hero title/subtitle,
  - CTA text,
  - body copy,
  - channel labels (`Email`, phone label by locale),
  - SEO title/description.
- If locale-specific strings are incomplete, fall back to English for non-ES locales rather than Spanish.
- Existing unit tests for `system-fallback-pages` must be extended to cover ES + at least one non-ES locale and alias behavior.

### FR5 — Commercial CTA channel consistency

- Resolve contact channels from a single helper or a documented shared pattern, with priority explicitly defined:
  1. structured website columns if available (`contact_whatsapp`, future channel columns),
  2. `website.content.account.*`,
  3. `website.content.contact.*`,
  4. legacy `website.content.social.whatsapp`.
- Phone/WhatsApp links must be sanitized to digits where required by `wa.me`.
- Email links must be omitted or disabled if no valid email exists; no `mailto:undefined`, `mailto:null`, or empty CTA.
- CTA text should be locale-aware where the surrounding page is locale-aware.
- Commercial CTA smoke must include header/footer or sticky CTA plus contact/press fallback and at least one product/detail CTA if feasible.

### FR6 — P2 content inventory only

- Create/update `docs/qa/colombiatours-week2-content-inventory.md`.
- Inventory sections:
  - activity placeholder/test content,
  - public migration/test blog posts,
  - generic duplicate blog subtitles,
  - missing hotel images,
  - planner filter zero-count symptoms if still present.
- The inventory must mark each item as `data remediation`, `content remediation`, or `code remediation candidate` and assign a recommended next owner.
- Do not mutate content/data in this sprint unless a later task explicitly owns data remediation.

## 6. Implementation tasks for developer

### Task 1 — Branch and baseline checks

Files:

- No code changes expected.

Steps:

1. Work only in `/opt/data/home/worktrees/colombiatours-public-routing-recovery`.
2. Create/switch to `feat/colombiatours-locale-trust-recovery` from `feat/colombiatours-public-routing-recovery`.
3. Confirm `git status --short` is clean before implementation.
4. Run targeted static baseline:
   - inspect `lib/site/public-ui-messages.ts`, `lib/site/public-ui-extra-text.ts`, `lib/site/system-fallback-pages.ts`, `app/site/[subdomain]/buscar/page.tsx`, `components/site/themes/editorial-v1/pages/hoteles-list*.tsx`.
5. Do not run raw `npm run dev`, raw `npm run test:e2e`, or raw Playwright; use session pool for local browser/E2E checks.

### Task 2 — Add/complete locale dictionaries

Files:

- Modify: `lib/site/public-ui-messages.ts`
- Modify if needed: `lib/site/public-ui-extra-text.ts`
- Test: `__tests__/lib/site/public-ui-messages.test.ts` or closest existing test file.

Steps:

1. Add complete `FR_FR_MESSAGES` and `DE_DE_MESSAGES` dictionaries for the `PublicUiMessages` interface.
2. Change `MESSAGES_BY_LOCALE` so `fr-FR` maps to `FR_FR_MESSAGES` and `de-DE` maps to `DE_DE_MESSAGES`.
3. Improve touched ES/PT strings:
   - ES search title: `¿Qué estás buscando?`.
   - PT search title: `O que você está procurando?`.
4. Add tests that assert:
   - `getPublicUiMessages('fr-FR').nav.packages` is not Spanish `Paquetes`.
   - `getPublicUiMessages('de-DE').footer.company` is not Spanish `Compania`/`Compañía`.
   - ES search title has opening punctuation/accent.
   - PT search title has accents.

### Task 3 — Fix `/buscar` title duplication and route-safe category links

Files:

- Modify: `app/site/[subdomain]/buscar/page.tsx`
- Modify: `app/site/[subdomain]/buscar/search-client.tsx`
- Test: add or extend targeted tests for metadata/search client helper where practical.

Steps:

1. Determine whether root/site layout applies a metadata title template.
2. Change search page metadata to prevent duplicate site name in final title.
3. Keep `robots: { index: false, follow: true }`.
4. Replace category no-result links that derive paths from translated labels with stable slug mappings:
   - destinations -> `/destinos` or localized category segment via locale helper,
   - hotels -> `/hoteles`,
   - activities -> `/actividades`,
   - packages -> `/paquetes`.
5. Verify `/buscar` and at least one non-default locale search URL produce no broken category links.

### Task 4 — Make fallback contact/press pages locale-aware

Files:

- Modify: `lib/site/system-fallback-pages.ts`
- Modify: `app/site/[subdomain]/[...slug]/page.tsx`
- Test: `__tests__/lib/site/system-fallback-pages.test.ts`

Steps:

1. Add a locale-aware copy table or reuse `public-ui-messages` where appropriate.
2. Thread resolved locale from the catch-all route into `getSystemFallbackPage(...)`.
3. Preserve existing default behavior for callers without locale.
4. Add tests for:
   - ES contact still returns Spanish copy,
   - EN/PT/FR/DE contact or press returns non-Spanish hero/SEO strings,
   - unknown slug returns `null`,
   - multi-segment slug returns `null`,
   - CMS-first behavior remains in route integration.

### Task 5 — Normalize commercial contact channel resolution

Files:

- Create or modify: `lib/site/contact-channels.ts` (preferred if no equivalent exists)
- Modify touched CTA surfaces as needed:
  - `lib/site/system-fallback-pages.ts`
  - `app/site/[subdomain]/layout.tsx`
  - `app/site/[subdomain]/[...slug]/page.tsx`
  - relevant header/footer/mobile sticky components only if they duplicate channel logic.
- Test: add unit tests for channel helper.

Steps:

1. Implement `resolveWebsiteContactChannels(website)` returning normalized email, phone, whatsappRaw, whatsappDigits, and booleans for availability.
2. Use the helper in fallback pages and any directly touched CTA surfaces.
3. Ensure WhatsApp links only render when sanitized digits exist.
4. Ensure email links only render when a valid-looking email exists.
5. Do not log raw contact values beyond normal test fixtures; redact any real credentials/secrets if outputting evidence.

### Task 6 — Fix `/hoteles` trust defects and inventory missing assets

Files:

- Modify if needed: `components/site/themes/editorial-v1/pages/hoteles-list-grid.client.tsx`
- Modify if needed: `components/site/themes/editorial-v1/pages/hoteles-list.tsx`
- Modify if needed: `components/site/product-detail/p2/hotel-card.tsx`
- Create/update: `docs/qa/colombiatours-week2-content-inventory.md`
- Test: extend `__tests__/components/site/themes/editorial-v1/pages/hoteles-list.test.tsx` or related hotel card tests.

Steps:

1. Reproduce the count text in the active ColombiaTours route/template.
2. If collision exists, fix with explicit whitespace/non-breaking structure and add a test asserting `63 de 63 hoteles`-style text.
3. Audit hotel image fallback behavior in list and card components.
4. Add deliberate placeholder behavior only if it improves trust without hiding data debt.
5. Inventory missing images for known examples and any additional reproduced examples in `docs/qa/colombiatours-week2-content-inventory.md`.

### Task 7 — P2 content inventory

Files:

- Create/update: `docs/qa/colombiatours-week2-content-inventory.md`

Steps:

1. Inventory without mutating production data:
   - `Actividad /actividades/4x1-adventure` placeholder/test steps from Week 1 audit.
   - Blog post `Guia post migracion ColombiaTours 2bf3b3b7` if still visible.
   - Duplicate blog subtitle `como elegir una ruta por Colombia con sentido` occurrences if reproducible.
   - Planner zero-count filter symptoms if still reproducible.
2. Label each row by remediation type and suggested owner.
3. Keep this concise; do not boil the ocean.

### Task 8 — Local validation and evidence

Files:

- Create/update: `docs/qa/colombiatours-week2-validation.md`

Steps:

1. Use the session pool:
   - `npm run session:list`
   - `eval "$(bash scripts/session-acquire.sh)"`
   - `PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session`
   - release the slot with `bash scripts/session-release.sh` or repository-approved release script after checks.
2. Localhost requests must include `x-subdomain: colombiatours` or `?subdomain=colombiatours` per acceptance contract.
3. Validate routes:
   - `/`, `/en`, `/pt`, `/fr`, `/de`
   - `/buscar`
   - `/hoteles`
   - `/contacto`, `/contact`, `/prensa`
   - one representative product/detail CTA where feasible.
4. Each gate row must return PASS/FAIL/WARN with evidence:
   - route,
   - status/final URL,
   - key visible strings,
   - title/robots/canonical/hreflang where applicable,
   - screenshot path or curl snippet where applicable.
5. Run targeted unit tests plus typecheck/lint as appropriate for changed files.

## 7. Acceptance matrix

Every gate must report PASS/FAIL/WARN with evidence.

| Area | Route/file | Acceptance | Evidence required |
| --- | --- | --- | --- |
| Locale chrome PT | `/pt` | Shared UI chrome is PT-BR, not Spanish; no obvious Spanish nav/footer/search labels where messages own copy | screenshot/text probe |
| Locale chrome FR | `/fr` | Shared UI chrome is French, not Spanish | screenshot/text probe |
| Locale chrome DE | `/de` | Shared UI chrome is German, not Spanish | screenshot/text probe |
| Hreflang policy | `/pt`, `/fr`, `/de` | No translated hreflang is emitted solely because UI chrome exists; ADR-020 followed | curl/head evidence |
| Search title | `/buscar` | Browser/source title is not duplicated | curl/head or Playwright title |
| Search copy | `/buscar` | ES h1 is `¿Qué estás buscando?` | screenshot/text probe |
| Search robots | `/buscar` | `noindex, follow` retained | metadata evidence |
| Search links | `/buscar?q=nope` | no-result category links point to valid category slugs, not translated display-label paths | DOM/link evidence |
| Hotels count | `/hoteles` | count text has visible whitespace before noun | screenshot/text probe |
| Hotels images | `/hoteles` | known missing-image hotels do not render broken/blank cards; data debt inventoried | screenshot + inventory rows |
| Contact fallback ES | `/contacto` or `/contact` | contact fallback renders useful ES copy and valid channels | screenshot/text probe |
| Contact fallback non-ES | `/en/contact`, `/pt/contact`, `/fr/contact`, `/de/contact` where routing supports it | fallback copy is locale-aware or safe English fallback; not Spanish for non-ES | route evidence |
| Press fallback | `/prensa` plus one non-ES equivalent where supported | locale-aware/safe copy and valid channels | route evidence |
| CTA consistency | header/footer/fallback/product CTA | WhatsApp/email/phone links are valid or omitted; no empty malformed links | DOM link evidence |
| P2 inventory | `docs/qa/colombiatours-week2-content-inventory.md` | inventory exists and separates data/content/code remediation | file diff |

## 8. Test strategy

Minimum test expectations:

- Unit tests:
  - public UI locale mapping for ES/PT/FR/DE,
  - system fallback page locale behavior,
  - contact channel helper normalization if added,
  - hotels count/placeholder behavior if changed.
- Static checks:
  - `npx tsc --noEmit` or repository equivalent,
  - lint if touched files are within linted surface.
- Route validation:
  - session-pool local probes with `x-subdomain: colombiatours` or `?subdomain=colombiatours`,
  - optional production non-mutating curl after merge/deploy only by QA/ops role.
- No manual deployment.

## 9. Data/content remediation separation

Code remediation owns:

- UI dictionaries and fallback copy scaffolding.
- Metadata title duplication behavior.
- Route-safe search links.
- Safe hotel card placeholder/fallback behavior.
- Contact channel normalization.

Data/content remediation owns:

- Real PT/FR/DE transcreation for product/page/blog body content.
- Missing hotel canonical images and media registry updates.
- Removing/unpublishing migration/test blog posts.
- Rewriting generic duplicate blog subtitles.
- Cleaning activity placeholder/test step content.
- Planner taxonomy/filter data if zero-count filters are data-driven.

The implementation PR must not claim full multilingual content quality if only UI chrome is fixed.

## 10. Rollout and gates

1. PLAN review:
   - Tech-validator reviews this SPEC in PLAN mode before implementation.
2. Implementation:
   - Developer works on `feat/colombiatours-locale-trust-recovery` in the specified worktree only.
3. Local validation:
   - Use session pool; collect route evidence in `docs/qa/colombiatours-week2-validation.md`.
4. CODE validation:
   - Tech-validator CODE gate validates ADR compliance, changed-file policy, tests, typecheck/lint/build as appropriate.
5. PR:
   - Open PR from feature branch to `feat/colombiatours-public-routing-recovery` or configured integration branch per pipeline owner decision.
6. Deploy:
   - Do not deploy manually; merge to main/deployment branch triggers GitHub Actions.
7. Post-deploy QA:
   - QA/ops runs non-mutating production smoke for acceptance matrix.

## 11. Rollback plan

Rollback triggers:

- Any critical route returns unexpected 500.
- Public links leak `/site/colombiatours` or malformed contact links.
- `/buscar` becomes indexable.
- FR/DE/PT locale routes emit misleading hreflang for untranslated fallback pages.
- Contact/press fallback masks unrelated 404s.
- Hotel listing loses products or breaks map/list interaction.

Rollback levels:

1. Code rollback via PR revert/GitHub revert commit.
2. Data-only rollback if a later data remediation task changes media/content records.
3. Authorized Cloudflare Worker rollback only by ops; agents must not deploy/rollback manually.
4. Revalidate affected paths using existing revalidation runbook after authorized rollback.

## 12. Definition of done

- This SPEC is reviewed by tech-validator in PLAN mode.
- Implementation plan names exact changed files and tests before coding.
- Locale UI dictionaries no longer map FR/DE to Spanish.
- `/buscar` visible ES grammar and metadata duplication are fixed.
- `/hoteles` count/image trust defects are fixed or explicitly inventoried where data-owned.
- Contact/press fallback pages are locale-aware and remain narrow/CMS-first.
- Commercial CTA links are valid or omitted across touched surfaces.
- P2 content inventory exists and separates data/content/code remediation.
- Route validation evidence exists with PASS/FAIL/WARN rows.
- CODE gate passes or failures are explicitly documented with owner/blocker.
