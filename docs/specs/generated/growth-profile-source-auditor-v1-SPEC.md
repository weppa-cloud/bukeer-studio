# SPEC: Growth Profile Source Auditor v1

Status: Draft for PLAN validation
Owner role: Specifier
Pipeline: growth-profile-source-auditor-v1
Kanban task: `t_2e644eac`
Repo/worktree: `/opt/data/home/worktrees/bukeer-studio-profile-source-auditor`
Target branch: `feat/growth-profile-source-auditor`
Base branch: `origin/dev`
Created: 2026-05-16T13:58:38Z
Tenant/site: ColombiaTours (`account_id=9fc24733-b127-4184-aa22-12f03b98927a`, `website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`)
Mutation policy: read-only by default. No Supabase writes, no provider calls, no content publication, no transcreation backlog, no cron activation, no Kanban dispatch.

## 1. Goal

Implement the first governance tool for autonomous Growth OS flows: a deterministic Profile Source Auditor that proves, per account/website/locale/market/profile type:

1. which `growth_profiles` rows exist,
2. what each profile claims to know,
3. which source facts and provider caches support that knowledge,
4. whether data is fresh enough for autonomous use,
5. whether locale/market targeting is internally consistent,
6. whether related agent definitions are safe to wake for that locale/market,
7. which exact verdict blocks or allows autonomous execution.

The tool is an auditor, not an executor. It must not repair rows, refresh providers, publish content, enqueue work, dispatch Kanban tasks, or activate heavy crons. Its output is a Markdown + JSON report that downstream tech-validator, QA and developer agents can consume without re-querying Supabase.

## 2. Architectural references

- [[ADR-003]] Contract-first validation: parse CLI flags and report objects through explicit schemas/types; do not allow ad hoc output drift.
- [[ADR-005]] Defense-in-depth: never expose tokens/secrets; use tenant/account/website filters on every read and redact secret-like fields from samples.
- [[ADR-008]] Monorepo packages: place reusable verdict logic in `lib/growth/...` if the CLI grows beyond a single script; keep npm script entry in repo root.
- [[ADR-013]] Tech Validator quality gate: this SPEC requires PLAN validation before implementation and CODE validation before merge.
- [[ADR-016]] SEO Content Intelligence Caching: provider cache freshness and row counts are evidence sources; the auditor must read existing cache rows and not trigger upstream calls.
- [[ADR-019]] Multi-locale URL Routing: locale checks must respect BCP-47 locale identity and market-specific targeting, not collapse all non-ES locales into `es-CO`.
- [[ADR-020]] hreflang policy: locale safety requires precision; autonomous content decisions must not proceed when locale/profile evidence is mismatched.
- [[ADR-021]] Translation Memory + AI Transcreation Pipeline: no truth-field writes and no auto-apply/publish; source-of-truth content and translated rows remain read-only evidence.
- [[ADR-029]] Funnel Events Source of Truth: funnel/tracking evidence must come from Supabase SSOT tables, not global env credentials or task prose.

## 3. Current problem statement

Observed Growth OS gaps that this auditor must make explicit:

- `growth_profiles` rows for `en-US`, `pt-BR`, `fr-FR`, and `de-DE` exist and can be fresh, but sources are often `neo_controlled_refresh` and `source_signal_fact_ids` are empty.
- `growth_gsc_cache` row count is currently expected to be empty for ColombiaTours in the task context.
- `growth_ga4_cache` row count is currently expected to be empty for ColombiaTours in the task context.
- `growth_dataforseo_cache` has fresh rows and is the only currently strong provider-cache signal in the task context.
- `growth_agent_definitions` are enabled but still pinned to `locale=es-CO` across markets, which can create false confidence for non-ES autonomous execution.

The auditor must not depend on this Kanban task body for truth. These are seed expectations only. Implementation must query Supabase read-only and report the live state.

## 4. Scope

### In scope

- New CLI script, preferably `scripts/growth/profile-source-auditor.mjs`.
- New npm script: `growth:profile-source-audit`.
- Read-only Supabase queries against Growth OS profile, source, provider-cache, agent-definition and outcome/publication evidence tables.
- Deterministic fixture/dry-run mode that does not require `.env.local` or live Supabase.
- Markdown and JSON reports under caller-specified output directory.
- Typed verdict/scoring model with explicit blocking reasons.
- ColombiaTours defaults plus required CLI flags for account, website, locales and output format.

### Out of scope

- No provider runner execution.
- No GSC/GA4/DataForSEO network calls.
- No `growth_profiles` repairs or inserts.
- No writes to `growth_profile_runs`, work items, publication jobs, memories, skills, agent runtime state, Kanban, GitHub, or Supabase.
- No content/transcreation backlog run.
- No cron enablement or schedule changes.
- No production mutation behind `--apply` in v1. If future repair mode is desired, it must be a separate SPEC.

## 5. CLI contract

### 5.1 npm script

Add to `package.json`:

```json
"growth:profile-source-audit": "node scripts/growth/profile-source-auditor.mjs"
```

### 5.2 Command examples

Default ColombiaTours audit, live read-only Supabase:

```bash
npm run growth:profile-source-audit -- \
  --account-id=9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id=894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --locales=en-US,pt-BR,fr-FR,de-DE \
  --format=both
```

Fixture-only deterministic validation:

```bash
npm run growth:profile-source-audit -- \
  --fixture=scripts/growth/fixtures/profile-source-auditor.fixture.json \
  --format=both \
  --out-dir=artifacts/growth/profile-source-auditor-fixture
```

JSON-only CI-friendly output:

```bash
npm run growth:profile-source-audit -- --format=json --stdout=json
```

### 5.3 Flags

| Flag | Required | Default | Description |
| --- | ---: | --- | --- |
| `--account-id=<uuid>` | live mode yes | ColombiaTours account | Filters all Supabase reads. |
| `--website-id=<uuid>` | live mode yes | ColombiaTours website | Filters all Supabase reads. |
| `--locales=<csv>` | no | `en-US,pt-BR,fr-FR,de-DE` | Target locales to audit. Include `es-CO` only when explicitly requested or via `--include-default-locale`. |
| `--include-default-locale` | no | false | Adds `es-CO` to audited locales. |
| `--markets=<csv>` | no | derived from locales | Optional market override; otherwise use locale-to-market mapping from Growth OS helpers (`en-US -> US`, `pt-BR -> BR`, `fr-FR/de-DE -> EU`, `es-CO -> CO`). |
| `--profile-types=<csv>` | no | `business,buyer,seo_market,competitor,page_product,risk_policy` | Profile types to audit. Must align with `requirementsForAction(...)` in `lib/growth/autonomy/profile-freshness-gate.ts`. |
| `--action-classes=<csv>` | no | `safe_apply,content_publish,transcreation_merge` | Computes autonomous safety per action class. |
| `--format=json|markdown|both` | no | `both` | Artifact formats to write. |
| `--stdout=json|summary|none` | no | `summary` | Console output; must never print raw secrets or full payloads by default. |
| `--out-dir=<path>` | no | `artifacts/growth/<YYYY-MM-DD>-profile-source-auditor` | Report artifact directory. |
| `--fixture=<path>` | no | none | Loads deterministic fixture instead of Supabase. Enables tests without credentials. |
| `--max-age-hours-profile=<n>` | no | from action requirement | Global override for profile age thresholds. |
| `--require-source-refs` | no | true | When true, empty `source_signal_fact_ids` blocks `PASS_AUTONOMOUS`. v1 should keep this true by default. |
| `--allow-neo-controlled-refresh-canary` | no | true | Allows `neo_controlled_refresh` profiles to reach `PASS_CANARY_ONLY`, never `PASS_AUTONOMOUS`, if all other gates pass. |
| `--sample-limit=<n>` | no | 10 | Maximum redacted sample rows per evidence section. |
| `--fail-on=<verdict-csv>` | no | none | Optional CI behavior: process exits non-zero if any profile/action has one of the listed verdicts. |

Disallowed in v1: `--apply`, `--repair`, `--refresh-provider`, `--dispatch`, `--cron`, `--publish`. If passed, the CLI must exit with code 2 and a safety error.

## 6. Data sources and SQL/read model

All live reads must use Supabase service-role credentials already used by existing scripts, loaded from `.env.local`, but output must never include credentials. Every query must filter by `account_id` and/or `website_id` when the table supports those columns. If a table or optional column is missing, report `source_status=UNAVAILABLE` instead of crashing unless the table is required for the selected verdict.

### 6.1 Required source tables

#### `growth_profiles`

Purpose: primary audited object.

Minimum columns:

```sql
select
  id,
  account_id,
  website_id,
  locale,
  market,
  profile_type,
  subject_table,
  subject_id,
  subject_key,
  confidence,
  valid_from,
  valid_until,
  policy_version,
  payload,
  source_signal_fact_ids,
  created_at,
  updated_at
from growth_profiles
where account_id = :account_id
  and website_id = :website_id
  and locale = any(:locales)
order by locale, profile_type, valid_until desc;
```

Audit requirements:

- Group by `locale + market + profile_type + subject tuple`.
- Select latest row per group by `valid_until desc`, then `updated_at desc`.
- Count total rows, latest rows, expired rows and rows with empty `source_signal_fact_ids`.
- Redact `payload` before samples. The report may include payload keys and high-level source fields, not arbitrary raw text by default.

#### `growth_signal_facts`

Purpose: validate that `source_signal_fact_ids` point to existing, fresh, confidence-bearing source facts.

Minimum columns:

```sql
select
  id,
  account_id,
  website_id,
  source,
  signal_type,
  entity_table,
  entity_id,
  entity_path,
  locale,
  market,
  observed_at,
  expires_at,
  confidence,
  payload,
  created_at,
  updated_at
from growth_signal_facts
where account_id = :account_id
  and website_id = :website_id
  and id = any(:source_signal_fact_ids);
```

Audit requirements:

- Missing referenced IDs cause `FAIL_MISSING_SOURCE_REFS`.
- Expired source facts cause `FAIL_STALE` unless another referenced fact for the same profile is fresh.
- Signal fact locale/market mismatches cause `FAIL_LOCALE_MISMATCH`.
- Low signal confidence contributes to `FAIL_LOW_CONFIDENCE` if it pulls effective confidence below threshold.

#### `growth_profile_runs`

Purpose: determine how profiles were generated and whether last run was safe, successful and traceable.

Minimum columns:

```sql
select
  id,
  account_id,
  website_id,
  profile_id,
  profile_type,
  locale,
  market,
  source,
  status,
  started_at,
  completed_at,
  input_refs,
  output_profile_ids,
  evidence,
  error,
  created_at,
  updated_at
from growth_profile_runs
where account_id = :account_id
  and website_id = :website_id
order by completed_at desc nulls last, updated_at desc
limit :limit;
```

Audit requirements:

- Link runs by `profile_id`, `output_profile_ids`, profile type and locale/market when direct ID is not present.
- A latest successful run with source `neo_controlled_refresh` and no source facts can only produce `PASS_CANARY_ONLY` at best.
- Failed or errored latest run does not automatically fail a fresh profile, but must be reported as a warning.

#### Provider caches: `growth_gsc_cache`, `growth_ga4_cache`, `growth_dataforseo_cache`

Purpose: prove provider-backed freshness by provider family.

Recommended read shape:

```sql
select
  id,
  account_id,
  website_id,
  profile_id,
  cache_key,
  cache_tag,
  endpoint,
  row_count,
  fetched_at,
  expires_at,
  payload,
  created_at,
  updated_at
from <cache_table>
where account_id = :account_id
  and website_id = :website_id
order by fetched_at desc nulls last, updated_at desc nulls last
limit :limit;
```

Implementation must probe available columns because existing scripts show cache schemas differ by provider. Required behavior:

- `growth_gsc_cache` expected freshness SLA: 24 hours for GSC facts.
- `growth_ga4_cache` expected freshness SLA: 6 hours for GA4 facts.
- `growth_dataforseo_cache` expected freshness SLA: 7 days for DataForSEO facts.
- Empty cache for a provider required by a profile/action causes `FAIL_PROVIDER_CACHE_EMPTY`.
- DataForSEO freshness alone is insufficient for `PASS_AUTONOMOUS` if profile source refs are empty.
- Provider payload samples must be summarized/redacted; do not print tokens, raw URLs with secret query params, or full payloads by default.

#### `growth_agent_definitions`

Purpose: detect whether enabled agents are configured for the audited locale/market or still pinned to `es-CO`.

Minimum columns:

```sql
select
  id,
  account_id,
  website_id,
  agent_id,
  lane,
  locale,
  market,
  enabled,
  status,
  allowed_action_classes,
  config,
  created_at,
  updated_at
from growth_agent_definitions
where account_id = :account_id
  and website_id = :website_id;
```

Audit requirements:

- Enabled agent definitions with `locale=es-CO` for non-ES locales are `FAIL_LOCALE_MISMATCH` for autonomous non-ES use.
- Disabled agents should be reported as `agent_enabled=false`, not failed, unless the selected action class requires an enabled agent.
- Agent config is redacted. Include only keys, lane, locale, market, enabled/status and action class compatibility.

### 6.2 Useful supporting tables

#### `growth_work_item_outcomes`

Purpose: evidence that recent autonomous work has measurable outcomes and not repeated unsafe failures.

Read shape:

```sql
select
  id,
  account_id,
  website_id,
  work_item_id,
  publication_job_id,
  status,
  success_metric,
  baseline,
  current_result,
  evaluation_window,
  evaluation_date,
  locale,
  market,
  updated_at
from growth_work_item_outcomes
where account_id = :account_id
  and website_id = :website_id
order by evaluation_date desc nulls last, updated_at desc
limit :limit;
```

Use as context and warning evidence. Do not let positive outcome rows override missing source refs.

#### `growth_publication_jobs`

Purpose: detect whether publication executor state exists for the same locale/market and action class.

Read shape:

```sql
select
  id,
  account_id,
  website_id,
  lane,
  action_class,
  status,
  target_table,
  target_path,
  success_metric,
  locale,
  market,
  updated_at
from growth_publication_jobs
where account_id = :account_id
  and website_id = :website_id
order by updated_at desc
limit :limit;
```

Use only as safety context. The auditor must not create, update, retry or dispatch publication jobs.

#### `funnel_events` and provider usage ledgers

If present, include aggregate counts/freshness only:

- `funnel_events`: recent event count, latest `occurred_at`, locale/market coverage, per [[ADR-029]].
- `seo_provider_usage` or similar ledger: recent provider run count/cost where available.

These are supporting evidence and should not be required for v1 PASS unless the action class explicitly depends on them in the implementation plan.

## 7. Profile/action requirement model

The auditor must reuse or mirror `requirementsForAction(...)` from `lib/growth/autonomy/profile-freshness-gate.ts`:

| Action class | Required profile types | Max age | Min confidence |
| --- | --- | ---: | ---: |
| `safe_apply` | `page_product`, `risk_policy` | page/risk: 1h | page: 0.70, risk: 0.95 |
| `content_publish` | `business`, `buyer`, `seo_market`, `page_product`, `risk_policy` | business/buyer: 30d, seo_market: 7d, page/risk: 1h | 0.75, 0.72, 0.70, 0.68, 0.95 |
| `transcreation_merge` | `business`, `buyer`, `seo_market`, `competitor`, `page_product`, `risk_policy` | business/buyer: 30d, seo_market/competitor: 7d, page/risk: 1h | 0.75, 0.72, 0.70, 0.65, 0.68, 0.95 |
| fallback/unknown | `risk_policy` | 1h | 0.95 |

Implementation may add CLI overrides, but report must show both default threshold and effective threshold.

## 8. Verdict model

### 8.1 Required verdict enum

The report must classify every audited locale/action/profile tuple using only these top-level verdicts:

- `PASS_AUTONOMOUS`
- `PASS_CANARY_ONLY`
- `FAIL_MISSING_PROFILE`
- `FAIL_STALE`
- `FAIL_LOCALE_MISMATCH`
- `FAIL_MISSING_SOURCE_REFS`
- `FAIL_PROVIDER_CACHE_EMPTY`
- `FAIL_LOW_CONFIDENCE`

### 8.2 Verdict precedence

Use deterministic precedence so reruns are stable:

1. `FAIL_MISSING_PROFILE`
2. `FAIL_LOCALE_MISMATCH`
3. `FAIL_MISSING_SOURCE_REFS`
4. `FAIL_PROVIDER_CACHE_EMPTY`
5. `FAIL_STALE`
6. `FAIL_LOW_CONFIDENCE`
7. `PASS_CANARY_ONLY`
8. `PASS_AUTONOMOUS`

A tuple can include multiple `reasons`, but the top-level verdict is the highest-precedence failure/warning.

### 8.3 PASS rules

`PASS_AUTONOMOUS` requires all of the following:

- Required profile row exists for the locale/market/profile type.
- Profile is not expired and age is within threshold.
- Profile confidence is at or above threshold.
- `source_signal_fact_ids` is non-empty.
- Every referenced signal fact exists or at least one direct referenced signal fact is valid and all missing refs are explained as non-blocking historical refs.
- Effective source-fact confidence is at or above profile/action threshold or a defined source-fact threshold in the implementation.
- Source facts are fresh and not expired.
- Source fact locale/market matches the audited locale/market or is explicitly market-neutral for a profile type that permits neutral evidence.
- Required provider cache family is non-empty and fresh when the profile/action depends on provider-backed evidence.
- Enabled `growth_agent_definitions` for the lane/action are locale/market-compatible.
- Profile source is not solely `neo_controlled_refresh` or another human/manual refresh with no machine-verifiable signal refs.

`PASS_CANARY_ONLY` is allowed when:

- All freshness/confidence/locale checks pass,
- but the source is manual/controlled (`neo_controlled_refresh`) or provider evidence is partial,
- and no blocking failure is present,
- and the tuple is safe only for read-only planning, QA canaries, or human-approved single-item execution.

`PASS_CANARY_ONLY` must not be used to bypass empty `source_signal_fact_ids` when `--require-source-refs=true`. Empty source refs produce `FAIL_MISSING_SOURCE_REFS` by default.

## 9. Provider dependency mapping

The implementation must declare an explicit mapping from profile/action to source/provider expectations. Initial v1 mapping:

| Profile type | Expected support | Required for `PASS_AUTONOMOUS`? | Notes |
| --- | --- | ---: | --- |
| `business` | `growth_signal_facts` and/or curated business profile run | yes source refs; provider cache optional | May be durable business knowledge but still needs traceable refs. |
| `buyer` | `growth_signal_facts`, funnel/GA4 when available | yes source refs; GA4 cache warning if empty | Empty GA4 should usually prevent autonomous marketing decisions, but not all buyer profiles are GA4-derived. |
| `seo_market` | DataForSEO/GSC/cache-backed signal facts | yes source refs and at least one fresh SEO provider cache | Empty GSC + empty DataForSEO blocks autonomous SEO market use. |
| `competitor` | DataForSEO competitor/cache-backed facts | yes source refs and fresh DataForSEO cache | Manual competitor facts can be canary-only. |
| `page_product` | product/page facts and recent validation | yes source refs | 1h max age per freshness gate. |
| `risk_policy` | policy/runbook profile with high confidence | yes source refs or policy-version trace | 0.95 min confidence; stale risk policy blocks all autonomous actions. |

The developer may refine mapping after inspecting actual row shapes, but must document any deviations in the implementation PR and keep no-false-autonomous-pass as invariant.

## 10. JSON report shape

Write `profile-source-auditor-report.json` with this top-level shape:

```ts
interface ProfileSourceAuditorReport {
  schema_version: 'growth-profile-source-auditor/v1';
  generated_at: string;
  mode: 'live-readonly' | 'fixture';
  account_id: string;
  website_id: string;
  requested_locales: string[];
  requested_markets: string[];
  requested_action_classes: string[];
  status: 'PASS' | 'PASS_WITH_CANARY_ONLY' | 'FAIL';
  safety: {
    readonly: true;
    writes_attempted: 0;
    provider_calls_attempted: 0;
    crons_modified: 0;
    dispatch_attempted: 0;
    secrets_redacted: true;
  };
  thresholds: Record<string, unknown>;
  rollup: {
    verdict_counts: Record<string, number>;
    autonomous_ready_locales: string[];
    canary_only_locales: string[];
    blocked_locales: string[];
    top_blockers: Array<{ reason: string; count: number }>;
  };
  sources: {
    growth_profiles: SourceAuditSummary;
    growth_signal_facts: SourceAuditSummary;
    growth_profile_runs: SourceAuditSummary;
    growth_gsc_cache: SourceAuditSummary;
    growth_ga4_cache: SourceAuditSummary;
    growth_dataforseo_cache: SourceAuditSummary;
    growth_agent_definitions: SourceAuditSummary;
    growth_work_item_outcomes?: SourceAuditSummary;
    growth_publication_jobs?: SourceAuditSummary;
    funnel_events?: SourceAuditSummary;
  };
  locale_audits: LocaleAudit[];
  action_audits: ActionAudit[];
  redaction: {
    fields_redacted: string[];
    sample_limit: number;
  };
  errors: Array<{ source: string; message: string; fatal: boolean }>;
}
```

Each `ActionAudit` must include:

```ts
interface ActionAudit {
  locale: string;
  market: string;
  action_class: string;
  verdict: Verdict;
  reasons: string[];
  required_profiles: ProfileAudit[];
  agent_definition_status: {
    enabled_compatible: number;
    enabled_mismatched: number;
    disabled: number;
    mismatches: Array<{ agent_id: string; lane?: string; locale?: string; market?: string }>;
  };
}
```

Each `ProfileAudit` must include:

```ts
interface ProfileAudit {
  locale: string;
  market: string;
  profile_type: string;
  subject_table?: string | null;
  subject_id?: string | null;
  subject_key?: string | null;
  verdict: Verdict;
  reasons: string[];
  profile_id?: string;
  confidence?: number;
  min_confidence: number;
  age_hours?: number;
  max_age_hours: number;
  valid_until?: string;
  source_signal_fact_ids_count: number;
  missing_source_signal_fact_ids: string[];
  source_fact_summary: {
    fresh: number;
    stale: number;
    low_confidence: number;
    locale_mismatch: number;
    sources: Record<string, number>;
  };
  provider_cache_summary: Record<string, {
    required: boolean;
    row_count: number;
    fresh_row_count: number;
    latest_at?: string | null;
    status: 'FRESH' | 'EMPTY' | 'STALE' | 'UNAVAILABLE' | 'NOT_REQUIRED';
  }>;
  latest_run?: {
    id: string;
    status?: string;
    source?: string;
    completed_at?: string | null;
    canary_only_reason?: string | null;
  };
}
```

## 11. Markdown report shape

Write `profile-source-auditor-report.md` with these sections:

1. Title and timestamp.
2. Executive rollup: overall status, locales blocked, locales canary-only, locales autonomous-ready.
3. Safety statement: read-only, no provider calls, no crons, no dispatch, secrets redacted.
4. Verdict count table.
5. Locale/action matrix table:
   - locale
   - market
   - action class
   - verdict
   - primary blocker
   - required profile failures
   - agent definition mismatch count
6. Profile detail tables grouped by locale:
   - profile type
   - profile id (shortened)
   - confidence vs threshold
   - age vs max age
   - source refs count
   - provider cache status
   - verdict
7. Source table health:
   - table
   - source status
   - row count
   - latest timestamp
   - freshness SLA
   - error/warning
8. Agent definition locale/market mismatch section.
9. Redacted samples section, limited by `--sample-limit`.
10. Developer implementation checklist.
11. QA acceptance checklist.
12. Tech-validator PLAN notes.

Markdown must be useful in terminal and GitHub. Avoid requiring screenshots or binary attachments.

## 12. Output status rollup

Top-level report status:

- `PASS`: every requested locale/action is `PASS_AUTONOMOUS`.
- `PASS_WITH_CANARY_ONLY`: no failures, but at least one tuple is `PASS_CANARY_ONLY`.
- `FAIL`: at least one tuple has a `FAIL_*` verdict.

Process exit behavior:

- Default: exit 0 even when status is `FAIL`; this is an audit/report generator.
- If `--fail-on` includes a verdict present in the report, exit 1 after writing artifacts.
- CLI/schema/config misuse exits 2.
- Unexpected runtime error exits 1 and still redacts secrets in stderr.

## 13. Implementation files

Required:

- `scripts/growth/profile-source-auditor.mjs` — CLI entrypoint and report renderer.
- `scripts/growth/fixtures/profile-source-auditor.fixture.json` — deterministic fixture covering PASS, canary and all required failures.
- `__tests__/scripts/growth/profile-source-auditor.test.ts` or equivalent Jest test — validates fixture verdicts and report schema.
- `package.json` — add `growth:profile-source-audit` script.

Recommended if logic becomes large:

- `lib/growth/auditing/profile-source-auditor.ts` — pure functions for grouping, scoring and verdicting.
- `lib/growth/auditing/profile-source-auditor-schema.ts` — report/CLI schemas.

The developer should keep the script Node-compatible with repo standards (`node` for `.mjs`, `tsx` only if TypeScript entrypoint is chosen). Follow existing script patterns in:

- `scripts/growth/provider-runner.ts`
- `scripts/growth/check-growth-operational-ssot.mjs`
- `scripts/seo/growth-cache-health-report.mjs`
- `scripts/seo/growth-provider-profile-registry.mjs`
- `lib/growth/autonomy/profile-freshness-gate.ts`
- `lib/growth/agentic/context-builder.ts`

## 14. Safety and redaction requirements

1. The Supabase client may use service role for reads, but all query builders must use `.select(...)`, `.eq(...)`, `.in(...)`, `.order(...)`, `.limit(...)`, `.range(...)` only.
2. No `.insert`, `.update`, `.upsert`, `.delete`, `.rpc` that mutates state, provider network call, `fetch` to external APIs, `child_process`, cron command, Kanban command or GitHub mutation is allowed in the auditor.
3. Add a static self-check that scans the script source for disallowed mutation methods and fails fixture tests if found.
4. Redact fields whose key matches `/token|secret|password|authorization|api[_-]?key|service[_-]?role|access[_-]?token|refresh[_-]?token/i`.
5. Redact string values that look like bearer/basic auth headers, JWTs, long API keys or URL query secrets.
6. Console summary must not print raw payloads.
7. Markdown samples must be summaries, not full payload dumps.
8. The auditor must not read Kanban task bodies as evidence. Kanban is dispatcher only; Supabase is SSOT.
9. The auditor must not classify `PASS_AUTONOMOUS` when `source_signal_fact_ids` are empty under default settings.
10. Locale/market mismatch must block autonomous verdicts for non-ES locales if enabled agent definitions remain `es-CO`-only.

## 15. Deterministic fixture acceptance

Fixture must contain at least these scenarios:

| Fixture case | Expected verdict |
| --- | --- |
| `en-US content_publish` with fresh profiles, valid source refs, fresh DataForSEO/GSC and matching agent definition | `PASS_AUTONOMOUS` |
| `pt-BR content_publish` with source `neo_controlled_refresh` but valid refs and partial provider cache | `PASS_CANARY_ONLY` |
| `fr-FR safe_apply` missing `risk_policy` profile | `FAIL_MISSING_PROFILE` |
| `de-DE content_publish` profile exists but `source_signal_fact_ids=[]` | `FAIL_MISSING_SOURCE_REFS` |
| `en-US transcreation_merge` competitor profile expired | `FAIL_STALE` |
| `pt-BR content_publish` enabled agent definition locale is `es-CO` | `FAIL_LOCALE_MISMATCH` |
| `fr-FR seo_market` requires GSC/DataForSEO but both required caches empty | `FAIL_PROVIDER_CACHE_EMPTY` |
| `de-DE risk_policy` confidence below `0.95` | `FAIL_LOW_CONFIDENCE` |

QA must be able to run fixture validation without live credentials.

## 16. Developer acceptance criteria

A developer implementation is acceptable when all are true:

- [ ] `npm run growth:profile-source-audit -- --fixture=scripts/growth/fixtures/profile-source-auditor.fixture.json --format=both --out-dir=artifacts/growth/profile-source-auditor-fixture` writes both JSON and Markdown reports.
- [ ] Fixture report contains all required verdict enum values at least once.
- [ ] No fixture case with empty `source_signal_fact_ids` returns `PASS_AUTONOMOUS` or `PASS_CANARY_ONLY` when `--require-source-refs=true`.
- [ ] Live default ColombiaTours run supports `--account-id`, `--website-id`, `--locales`, `--format`, `--stdout`, and `--out-dir`.
- [ ] Live run filters every supported table by account/website and handles optional missing tables/columns gracefully.
- [ ] Report includes `growth_profiles`, `growth_profile_runs`, provider cache summaries and `growth_agent_definitions` summaries.
- [ ] Agent definitions pinned to `es-CO` produce a locale mismatch failure for non-ES autonomous action audits.
- [ ] Empty required GSC/GA4/DataForSEO cache families produce `FAIL_PROVIDER_CACHE_EMPTY` where the profile/action mapping requires them.
- [ ] Secret-like keys and values are redacted in stdout, Markdown and JSON samples.
- [ ] The code contains no Supabase mutations, provider network calls, cron activation or Kanban dispatch.
- [ ] Unit/fixture tests pass with no `.env.local`.
- [ ] `npm run typecheck` and `npm run test -- --runInBand profile-source-auditor` or the repo-equivalent focused test command pass.
- [ ] `npm run tech-validator:code:quick` is clean or any unrelated baseline failures are documented with exact evidence.

## 17. QA acceptance criteria

QA must validate:

- [ ] Fixture mode can run in a clean checkout without Supabase credentials.
- [ ] JSON report parses and matches `schema_version='growth-profile-source-auditor/v1'`.
- [ ] Markdown report includes executive rollup, safety statement, verdict matrix, profile details, source health and agent mismatch sections.
- [ ] Every required verdict enum is represented by a fixture and appears in rollup counts.
- [ ] The `FAIL_MISSING_SOURCE_REFS` fixture proves no false autonomous pass with empty source refs.
- [ ] The `FAIL_LOCALE_MISMATCH` fixture proves non-ES locales fail when agent definitions are `es-CO`-only.
- [ ] The `FAIL_PROVIDER_CACHE_EMPTY` fixture proves required empty provider cache families block autonomous use.
- [ ] Redaction tests include keys named `access_token`, `refresh_token`, `service_role_key`, `authorization` and a JWT-like value.
- [ ] Static mutation guard fails if `.insert(`, `.update(`, `.upsert(`, `.delete(`, external provider fetches, cron commands or Kanban dispatch are introduced in the auditor file.
- [ ] Live ColombiaTours audit can be run read-only and produces an artifact path without printing credentials.

## 18. Tech-validator PLAN checklist

Tech-validator should PASS the plan only if:

- [ ] The implementation contract is read-only by default and has no v1 mutation mode.
- [ ] Supabase is the SSOT; Kanban task prose is not used as data evidence.
- [ ] `PASS_AUTONOMOUS` is impossible with empty `source_signal_fact_ids` by default.
- [ ] Locale/market checks cover both profiles and `growth_agent_definitions`.
- [ ] Provider cache empty/stale states are explicit and cannot be hidden by fresh manual profiles.
- [ ] Secret redaction is required in stdout, Markdown and JSON.
- [ ] Fixture mode covers every required verdict and can run without credentials.
- [ ] QA has concrete commands and expected outcomes.
- [ ] ADR references are consistent with Growth OS architecture and no ADR update is needed for v1 read-only auditing.

## 19. Handoff to implementation

Recommended developer sequence:

1. Build fixture and pure verdict function first.
2. Add JSON schema/report renderer.
3. Add CLI parser and safety-disallowed flag handling.
4. Add live Supabase read adapters with optional-column probing.
5. Add Markdown renderer.
6. Add redaction and static mutation guard tests.
7. Run fixture test, focused Jest test, typecheck and tech-validator quick gate.
8. Attach generated report artifact paths to the implementation task summary.

Do not start implementation until the PLAN gate task approves this SPEC.
