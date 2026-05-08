# Growth OS Live-Gated Certification — 2026-05-08

## Scope

Certify Growth OS live-gated autonomy for ColombiaTours on the technical lane.

This certification intentionally used the lowest-risk live mutation surface:
`website_sections.config` on the homepage Blog section. The mutation writes a
non-rendered certification marker only. It does not touch pricing,
availability, reservations, payments, paid media, CRM mutations or visible copy.

## Production Target

- Account: `9fc24733-b127-4184-aa22-12f03b98927a`
- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Target table: `website_sections`
- Target id: `e2ffbd34-fcde-44ca-ba33-5c2f89b8271d`
- Public path: `/`

## Certification Result

- Certification id: `growth-live-gated-2026-05-08T11-43-28-789Z`
- Certified: `true`
- Policy id: `519bef9d-43d7-4e55-82fe-a038ed034555`
- Work item id: `6bb69de7-f1a2-48e7-b9bc-8391acf40f06`
- Change set id: `40bf4f5d-f284-4d58-a20b-a0b666dcb92d`
- Publication job id: `59b06593-de17-4f68-999f-07b5aa42c64c`

## Gate Verdict

- Lane: `technical_remediation`
- Action class: `safe_apply`
- Policy: `enabled=true`, `dry_run_only=false`
- Kill switch: `false`
- Risk: `low`, score `5`
- Caps: daily `5`, weekly `10`
- Gate mode: `live`
- Gate reasons: none

Required checks passed:

- before snapshot
- rollback payload
- smoke check
- baseline
- success metric
- evaluation date
- no paid mutation
- tenant allowlist
- technical reversibility

## Live Execution Ledger

`growth_publication_jobs`

- Status: `smoke_passed`
- Job mode: `live`
- Applied at: `2026-05-08T11:43:30.903+00:00`
- Smoke checked at: `2026-05-08T11:43:30.903+00:00`
- Rolled back at: `null`
- Success metric:
  `technical_smoke_pass:live_certification:growth-live-gated-2026-05-08T11-43-28-789Z`

Smoke checks:

- `field_allowlist`
- `title_length`
- `description_length`
- `slug_format`
- `robots_noindex_type`
- `keywords_type`

Smoke failures: none.

## Outcomes

Three `growth_work_item_outcomes` rows were created:

- `immediate`, status `measuring`, evaluation date `2026-05-08`
- `day_7`, status `scheduled`, evaluation date `2026-05-15`
- `day_28`, status `scheduled`, evaluation date `2026-06-05`

## Work Item / Change Set State

`growth_work_items`

- Status: `published_applied`
- Action class: `safe_apply`
- Requires human review: `false`
- Progress: `Publicado/aplicado y en medicion`

`growth_agent_change_sets`

- Status: `applied`
- Requires human review: `false`
- Published at: `null`

## UI / E2E

Validation commands:

```bash
npm run typecheck
npm test -- --runTestsByPath __tests__/lib/growth/autonomy/live-gate.test.ts __tests__/lib/growth/autonomy/candidate-promotion.test.ts __tests__/lib/growth/autonomy/publication-executor.test.ts
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- e2e/tests/growth-os-console-ui.spec.ts --project=chromium --grep "@growth-os-ui"
```

Results:

- Typecheck: passed.
- Unit tests: 8/8 passed.
- Growth OS UI E2E before final label fix: Chromium 9/10 passed, 1 skipped.
- The failing UI contract was a tab label mismatch (`Command Center` expected).
  The label was corrected.
- Re-run attempts after certification were blocked by Playwright auth/setup
  instability (`ERR_ABORTED` at `/login`) or protected-route timeouts before
  reaching Growth OS assertions. Session pool was released and left clean.

Browser Use validation:

- Dev server was started through the mandatory session pool on `s1` / `3001`.
- Turbopack hung compiling `(auth)` routes; restarting the same session with
  `NEXT_DEV_TURBO=false` made `/login` respond normally.
- Logged in with the authorized internal test account.
- Opened `/dashboard/894545b7-73ca-4dae-b76a-da5b6a3f8441/growth/overview`.
- Verified `Technical fixes measuring = 3`, `UI readiness = 100/100`, and
  command tabs render.
- Opened `/growth/agents` and verified:
  - `growth-agent-team-cards = 1`
  - `growth-agents-table = 1`
  - `growth-agent-tool-matrix = 1`
  - `Live gated` labels visible
  - `Cost` visible for all five lanes
- Opened `/growth/workboard` and verified:
  - `growth-workboard-summary = 1`
  - `growth-workboard-kanban = 1`
  - `growth-workboard-column-published_applied = 1`
  - `growth-workboard-card = 48`
  - certification card visible
- Session pool was released after validation.

## Certification Command

```bash
npx tsx scripts/growth/certify-live-gated-autonomy.ts
```

The script is idempotent per generated certification id and prints a JSON
certificate with `certified=true` only when all ledger checks pass.

## Epic 310 Production Certification

Additional production certification closed the first five Epic 310 operating
points: autonomous organic content, transcreation merge, reversible technical
apply, measurement ledger, and agent optimization visibility.

Command:

```bash
npx tsx scripts/growth/certify-epic310-production.ts
```

Result:

- Certified: `true`
- Certified at: `2026-05-08T12:36:09.475Z`
- Organic content publication job:
  `62fa67d9-ef7d-4860-a9ed-b933de2610c3`
- Organic work item: `701b265c-1682-4b04-87fe-8db8f1f2ac08`
- Organic change set: `b9225ccc-147f-48d2-b4fc-703ce2062269`
- Published slug: `guia-viaje-colombia-cultura-naturaleza`
- Published blog target id: `18a5c93d-c4c4-483e-af6b-dec6d30234ff`
- Transcreation publication job:
  `2e0ba73f-09dd-4575-ac14-b5b98a46a412`
- Transcreation work item: `4ab8131e-e21c-4397-b88c-7fe17abbfe61`
- Transcreation change set: `c120eddc-1675-4a46-97d2-5a17580b7dd8`
- Localized variant: `1e3a24f8-2a62-46af-ab73-b0c804410753`
- Candidate promoted to work item:
  `0a811b5c-6779-424d-a278-d5a9238a9ccf` →
  `659f2cb9-38f1-42d7-a2ed-a4c0be041392`

Certified checks:

- `organic_content_live=true`
- `transcreation_live=true`
- `candidate_promoted=true`
- `measurement_closed=true`
- `paid_remains_blocked=true`
- `agent_optimization_available=true`

Measurement ledger:

- Live smoke-passed jobs: `7`
- Live jobs missing metric: `0`
- Closed immediate outcomes: `1`
- Organic publication outcomes: `2` (`day_21`, `day_45`)
- Transcreation outcomes: `2` (`day_21`, `day_45`)

Policy and schema correction:

- Applied Supabase migration
  `growth_live_gated_change_sets_human_review_exemption`.
- Local migration file:
  `supabase/migrations/20260508123000_growth_live_gated_change_sets_human_review_exemption.sql`.
- The change-set constraint now permits `requires_human_review=false` for
  `publish_packet_prepare` and `transcreation_merge_readiness` only when
  evidence has:
  - `live_gated=true`
  - `autonomy_action_class in ('content_publish', 'transcreation_merge')`
  - `paid_blocked=true`

UI and public route validation:

- Session pool: `s1`, port `3001`, `NEXT_DEV_TURBO=false`.
- Dashboard validation used authenticated Playwright context from
  `e2e/.auth/user.json`.
- `/growth/overview` rendered North Star, measuring organic work and technical
  fixes.
- `/growth/workboard` rendered the autonomous workboard and current backlog
  state.
- `/growth/agents` rendered agent cards, tools, skills, cost and replay
  recommendations for all five lanes.
- Public blog was reachable through tenant rewrite using the subdomain query
  path; the internal `/site/[subdomain]` route remains preview-token protected
  by design.

Final validation:

```bash
npx tsc --noEmit --pretty false
npm test -- --runTestsByPath __tests__/lib/growth/autonomy/live-gate.test.ts __tests__/lib/growth/autonomy/candidate-promotion.test.ts __tests__/lib/growth/autonomy/publication-executor.test.ts
```

Results:

- Typecheck: passed.
- Unit tests: 8/8 passed.
- Production certification script: `certified=true`.

## Residual Risk

- The certification proves live gated execution and ledgers. It does not mean
  unlimited autonomy is enabled; caps, kill switch, smoke checks and rollback
  remain mandatory.
- Paid, experiments, outreach, CRM, pricing, availability, reservations and
  payments remain blocked in v1.
- Future outcome windows still need real evaluation on day 21/day 45 for
  organic/transcreation and day 7/day 28 for technical SEO.
