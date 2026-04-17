# EPIC 86 Walkthrough Evidence

Issue: #122
Guardrail focus: issue #92, transactional optimize path for `package`

This runbook documents the evidence flow used to validate the EPIC 86 closeout without expanding scope.

## Preconditions

1. Authenticated Playwright session available in `e2e/.auth/user.json`.
2. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` loaded from `.env.local`.
3. A test website exists in the connected Supabase project.

## Flow

### 1. Onboarding

Open the dashboard and confirm the SEO surfaces are present.

Expected:

- dashboard access works
- analytics entrypoint is visible
- the SEO surface can be reached from the unified content workspace

### 2. Audit

Go to `Analytics -> Content Intelligence`.

Expected:

- decision-grade audit controls are visible
- locale-native audit inputs are visible
- the UI advertises live/authoritative-only behavior

Screenshot:

- `./screenshots/02-content-intelligence-audit.png`

### 3. Research

Go to `Analytics -> Keywords`.

Expected:

- locale-native keyword research form is visible
- market fields are present
- decision-grade-only messaging is visible

Screenshot:

- `./screenshots/03-keywords-research.png`

### 4. Cluster

Go to `Analytics -> Clusters`.

Expected:

- cluster planner board is visible
- create-cluster controls are visible
- locale and market fields are present

Screenshot:

- `./screenshots/04-clusters-board.png`

### 5. Brief

Open a `package` SEO detail page and switch to `Brief`.

Expected:

- brief workflow loads
- approved brief can be created or reused
- versioned brief state is visible

Screenshot:

- `./screenshots/05-package-brief.png`

### 6. Optimize

On the same `package` SEO detail page, switch to `Optimize`.

Expected:

- the guardrail banner states `package/activity` is restricted to the SEO layer
- a truth-field patch is blocked by `POST /api/seo/content-intelligence/optimize`
- response envelope uses ADR-012 format
- blocked action is persisted with `action_type=blocked`
- source package fields remain unchanged

Screenshot:

- `./screenshots/06-package-optimize-guardrail.png`

### 7. Transcreate

Open a translatable item (`blog`, `page`, or `destination`) and switch to `Translate`.

Expected:

- source locale, target locale, country, and language fields are visible
- target content selector is visible
- the wizard supports create/review/apply transitions

Screenshot:

- `./screenshots/07-transcreate-translate.png`

### 8. Track

From the same translatable item, switch to `Track`.

Expected:

- the track tab is visible
- decision-grade-only mode is visible
- track can show authoritative metrics or a blocked state when data is missing

Screenshot:

- `./screenshots/08-transcreate-track.png`

## Regeneration Commands

Run the targeted evidence test:

```bash
npm run session:run -- e2e/tests/seo-content-intelligence-epic86.spec.ts --project=chromium --grep "@evidence" --workers=1
```

Run the guardrail test:

```bash
npm run session:run -- e2e/tests/seo-content-intelligence-epic86.spec.ts --project=chromium --project=firefox --grep "@issue-92" --workers=1
```

## Contract Evidence

- UI contract: Content Intelligence, Keywords, Clusters, Brief, Optimize, Translate, and Track tabs are visible in the expected surfaces.
- API contract: `POST /api/seo/content-intelligence/optimize` rejects transactional truth-field patches with `SEO_TRUTH_FIELD_BLOCKED`.
- Data contract: the blocked optimize action is persisted and the source package row is unchanged.
- Guardrails: transactional SEO stays in the SEO layer and does not rewrite source-of-truth package fields.

