# SPEC: Growth OS Hermes Primary Runtime MVE v0

## GitHub Tracking

- **Epic Issue**: [#521](https://github.com/weppa-cloud/bukeer-studio/issues/521)
- **Parent Epics**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310), [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441), [#460](https://github.com/weppa-cloud/bukeer-studio/issues/460), [#482](https://github.com/weppa-cloud/bukeer-studio/issues/482), [#494](https://github.com/weppa-cloud/bukeer-studio/issues/494)
- **Child Issues**: [#522](https://github.com/weppa-cloud/bukeer-studio/issues/522), [#523](https://github.com/weppa-cloud/bukeer-studio/issues/523), [#524](https://github.com/weppa-cloud/bukeer-studio/issues/524), [#525](https://github.com/weppa-cloud/bukeer-studio/issues/525), [#526](https://github.com/weppa-cloud/bukeer-studio/issues/526), [#527](https://github.com/weppa-cloud/bukeer-studio/issues/527), [#528](https://github.com/weppa-cloud/bukeer-studio/issues/528), [#529](https://github.com/weppa-cloud/bukeer-studio/issues/529), [#530](https://github.com/weppa-cloud/bukeer-studio/issues/530), [#531](https://github.com/weppa-cloud/bukeer-studio/issues/531), [#532](https://github.com/weppa-cloud/bukeer-studio/issues/532), [#533](https://github.com/weppa-cloud/bukeer-studio/issues/533)
- **Milestone**: ColombiaTours Hermes Primary Runtime MVE v0
- **Area**: growth + runtime + Hermes + agents + production tools + Bukeer Studio
- **Infographic**: [SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0.infographic.html](./SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0.infographic.html)

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-13
- **Status**: Accepted for execution — revised after Hermes-native architecture audit
- **Related Specs**: [[SPEC_GROWTH_OS_HERMES_CHIEF_OF_STAFF_SWARM]], [[SPEC_GROWTH_OS_HERMES_AGENT_CONTEXT_ISOLATION_9]], [[SPEC_GROWTH_OS_AUTONOMOUS_PRODUCTION_OPERATING_SYSTEM]], [[SPEC_GROWTH_OS_AGENTIC_ORCHESTRATOR_9_PLUS]], [[SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES]], [[SPEC_GROWTH_OS_SSOT_MODEL]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-009, ADR-010, ADR-012, ADR-013, ADR-016, ADR-018, ADR-019, ADR-020, ADR-021, ADR-029
- **Cross-repo impact**: Shared Supabase remains product/audit storage. Bukeer Flutter remains the admin/product owner for shared DB surfaces. Hermes does not own shared DB migrations directly.

## Summary

Migrate ColombiaTours Growth OS from the current Growth OS executor-led runtime to a **Hermes primary runtime** in one steel-thread release.

The MVE v0 goal is not to preserve every legacy Growth OS state machine. The goal is to prove one complete production path where Hermes owns:

- planning;
- task queue through native Hermes Kanban;
- board, task, dependency, run, event and execution state;
- profile-specific agents;
- skills as the execution units loaded by profiles;
- `/goal` as the autonomous multi-turn execution loop;
- `delegate_task` as the native handoff mechanism to skill-bound agents;
- memory and sessions;
- MCP tool calls;
- production publishing within account scope;
- telemetry and learning.

Supabase stops being the runtime queue. Supabase remains the product database, account boundary, audit ledger, snapshot store, rollback source and outcome store.

## Product Decision

The current live runtime is technically safe but too rigid for the desired operating model. Its `candidate -> work_item -> executor -> publication_job` chain creates many pre-ready states that block flow. For one production tenant and one production site, the fastest route to value is to let Hermes run the operating loop directly and push safety into narrowly-scoped production tools.

MVE v0 therefore makes this explicit:

```text
Hermes native Kanban is the canonical runtime queue.
One Hermes board represents one account/website operating scope.
Hermes profiles are the agent identities.
Hermes skills are the execution units.
Hermes cron, Kanban, /goal and delegate_task are the execution loop.
Hermes sessions/memory are the learning layer.
MCP Tool Safety Layer is the production security boundary.
Supabase persists product data, audit, snapshots, rollbacks and outcomes.
```

The runtime must maximize the Growth OS North Star:

```text
qualified trip requests / month
```

Every Hermes task that can affect production must declare the target surface,
baseline, expected impact, confidence, risk, allowed tool, success metric and
evaluation date. Hermes should optimize task ordering from these fields rather
than from arrival order alone.

## Non-Negotiable Runtime Posture

This spec intentionally supersedes the previous hybrid posture for the ColombiaTours MVE:

| Area | Previous state | MVE v0 target |
|---|---|---|
| Queue | `growth_work_items` | Hermes Kanban board |
| Task sessions | `growth_agent_task_sessions` | Hermes task runs/events |
| Orchestration loop | `run-growth-production-cycle.ts` | Hermes cron + `/goal` + `delegate_task` |
| Runtime decisions | Growth CEO Brain + decisions table | Hermes Chief profile + Kanban tasks |
| Execution unit | Growth agent code paths | Hermes skills loaded by profiles |
| Learning | Growth OS memories/skills + replay | Hermes profile memory/skills + product outcome evidence |
| Production mutation | Growth OS executor only | MCP tools through Safety Layer |
| Supabase role | Runtime + product + audit | Product + audit + rollback + outcomes |

The migration does not mean Hermes receives unrestricted DB credentials. Profiles and delegated agents must call MCP tools. The MCP Tool Safety Layer performs authorization, validation and writes. Service-role credentials live only in the tool host / safety layer, never in profiles or delegated subagents.

## MVE Definition

MVE v0 is complete when a single autonomous Hermes steel thread can run in production for ColombiaTours:

```text
Provider context profile read
-> Hermes Chief creates Kanban task
-> Chief executes `/goal` for the task
-> `delegate_task` spawns the skill-bound profile agent
-> agent receives tenant context + provider profile refs
-> agent uses profile memory and the bound skill
-> agent calls scoped MCP production tool
-> safety layer snapshots target
-> safety layer writes Supabase product row
-> safety layer performs smoke check
-> safety layer records audit/outcome seed
-> Hermes records task done and learns
-> Bukeer Studio shows the result
```

No human approval is required inside the v0 permitted action set. Human control exists as a kill switch, scope configuration and rollback, not as a per-task approval gate.

## Native Hermes Kanban Decision

MVE v0 uses the Kanban runtime that ships with Hermes. Bukeer Studio must not
reimplement Kanban state, leasing, dependencies or profile coordination.

Canonical rule:

```text
Hermes board/task/run/event state is canonical for runtime execution.
Bukeer Studio reads and mirrors it.
Supabase stores audit/outcome/snapshot records, not the work queue.
```

Board strategy:

| Scope | Rule |
|---|---|
| Board isolation | One board per account/website in v0: `colombiatours.travel`. |
| Tenant metadata | Tenant fields may be mirrored in task metadata, but they are not the primary isolation boundary. |
| Runtime state | Task status, dependencies, assignee, run events and leases live in Hermes. |
| Studio state | Studio displays a mirror and recovery controls, not a competing task board. |

This keeps the MVE aligned with Hermes' native strengths: durable Kanban,
profile sessions, handoffs, dependencies, retries, heartbeats and task history.

## Native Hermes Execution Decision

MVE v0 must maximize native Hermes infrastructure instead of rebuilding a
parallel agent runtime. The execution loop is:

```text
Hermes cron wakes the Chief profile
-> Chief reads the native board and provider/tenant context
-> Chief runs /goal for the selected task
-> Chief uses delegate_task for the lane profile
-> delegated profile loads its bound skill
-> profile calls scoped MCP tools
-> safety layer validates and writes product/audit data
-> outcome profile learns and schedules the next measurement
```

Runtime rules:

- skills are the execution unit, not custom Growth OS agent classes;
- profiles are identities that load allowed skills, tools, memories and budgets;
- `delegate_task` replaces custom dispatcher workers for lane handoff;
- `/goal` replaces bespoke multi-turn execution loops;
- Hermes cron replaces the 30-minute Growth OS production cycle;
- Kanban state remains in Hermes native storage;
- Supabase stores product data, evidence, snapshots, runtime health and
  rollback/outcome records, not Hermes sessions, memory or task queues.

Profile-to-skill bindings for v0:

| Hermes profile | Bound skill |
|---|---|
| `colombiatours-chief` | `bukeer-orchestrator` |
| `colombiatours-content` | `bukeer-content-creator` |
| `colombiatours-editor` | `bukeer-content-curator` |
| `colombiatours-transcreation` | `transcreator-es-en` |
| `colombiatours-technical-seo` | `bukeer-technical-remediation` |
| `colombiatours-risk` | `bukeer-risk-guardian` |
| `colombiatours-outcome` | `bukeer-outcome-analyst` |

The existing Neo skill set is migrated to the VPS under `~/.hermes/skills/`.
Each profile config must declare its skill bindings explicitly. A profile with
no skill binding is not production-capable.

## Growth Maximization Loop

Hermes should not merely execute a backlog. It should operate a closed growth
loop against the North Star:

```text
Objective
-> provider facts
-> scored tasks
-> profile execution
-> scoped MCP production tools
-> smoke/outcome
-> memory/skill update
-> next task improves
```

Task scoring inputs:

- expected lift to qualified trip requests;
- organic clicks or CTR opportunity;
- funnel conversion gap;
- content/transcreation coverage gap;
- technical SEO risk/opportunity;
- confidence from provider freshness and source quality;
- effort/risk level;
- rollback confidence;
- measurement window.

The Chief profile owns prioritization. Lane profiles may create tasks, but the
Chief is responsible for daily sequencing and for keeping low-impact work from
starving high-impact tasks.

V0 scoring formula:

```text
total_score =
  0.35 * expected_impact_score
+ 0.20 * confidence_score
+ 0.15 * provider_freshness_score
+ 0.15 * rollback_confidence_score
+ 0.10 * (100 - risk_score)
+ 0.05 * (100 - effort_score)
```

Scoring rules:

- scores are integers from 0 to 100;
- `expected_impact_score` estimates North Star contribution;
- `confidence_score` comes from evidence quality and provider agreement;
- `provider_freshness_score` comes from freshness thresholds below;
- `rollback_confidence_score` is high only when rollback payload is deterministic;
- `risk_score` penalizes public visibility, broad blast radius and weak evidence;
- `effort_score` penalizes slow or fragile work;
- ties are broken by lower risk, then higher provider freshness, then older task.

## V0 Autonomous Action Set

Hermes may perform these actions without approval when the MCP Tool Safety Layer accepts scope:

| Action | Tool | Production target | Required guardrails |
|---|---|---|---|---|
| Publish blog/content optimization | `hermes_publish_content` MCP tool | `website_blog_posts`, allowed SEO/content fields | account scope, field allowlist, snapshot, content depth, SEO checks, rollback |
| Apply safe SEO page patch | `hermes_apply_safe_seo_patch` MCP tool | `website_pages`, SEO metadata fields only | account scope, field allowlist, route smoke, snapshot, rollback |
| Merge transcreation | `hermes_merge_transcreation` MCP tool | `seo_transcreation_jobs`, localized SEO/content overlays | locale pair, quality threshold, hreflang-safe status, snapshot, rollback |
| Refresh provider context | `hermes_refresh_provider_context` | provider/profile cache tables | read/provider quotas, provenance, freshness |
| Read provider context pack | `hermes_read_provider_profile` | provider/profile cache tables | account scope, freshness, source refs, confidence |
| Create follow-up task | Hermes Kanban native | Hermes board | task schema, profile assignment, dependency refs |
| Record outcome | `hermes_record_outcome` MCP tool | audit/outcome tables | target refs, metric window, before/after refs |
| Roll back v0 mutation | `hermes_rollback_change` MCP tool | prior target row | rollback payload exists, same account/site, audit event |

V0 still blocks these actions:

- paid media mutation;
- pricing;
- availability;
- reservations;
- payments;
- bulk CRM mutation;
- outreach sends;
- experiment activation that changes ad spend or external systems.

Those are v1+ only unless a separate spec approves their tool contracts.

## Target Architecture

```text
VPS
  Hermes Agent
    profile: colombiatours-chief
    profile: colombiatours-content
    profile: colombiatours-editor
    profile: colombiatours-transcreation
    profile: colombiatours-technical-seo
    profile: colombiatours-risk
    profile: colombiatours-outcome
    Kanban DB
    session DB
    memory/skills
    cron schedules
    /goal execution loop
    delegate_task handoffs
    provider context readers

  Hermes MCP Tool Safety Layer
    account/site scope resolver
    profile tool allowlist
    tenant context injector
    schema validation
    field allowlists
    snapshot writer
    Supabase product writes
    smoke checks
    rollback writer
    audit/outcome writer

Supabase
  product content
  tenant/account config
  tenant context snapshots
  funnel events
  provider raw/cache/normalized facts
  MCP tool invocation audit
  snapshots
  outcomes
  runtime health
  rollback payloads

Bukeer Studio
  runtime status
  Hermes Kanban mirror
  profile + skill binding visibility
  kill switch
  audit/outcome views
  rollback actions
```

## Data Ownership

### Hermes-owned runtime state

Hermes owns these runtime concepts in its native storage:

- boards;
- cards/tasks;
- task dependencies;
- task runs;
- task events;
- handoffs;
- cron schedules;
- `/goal` run state;
- `delegate_task` handoffs;
- profile sessions;
- profile memory;
- profile skills;
- runtime retry state.

Supabase must not be required for Hermes to decide which task runs next.

### Hermes profiles and skills

Hermes profiles replace Growth OS agent instances. A profile is an identity and
policy envelope: model, budget, tool allowlist, provider allowlist, workspace
and skill bindings. A profile is not tenant context and is not product data.

Hermes skills replace Growth OS agent implementation classes. Skills live under
`~/.hermes/skills/` on the VPS and are loaded by profile config:

```yaml
profile: colombiatours-content
skills:
  - bukeer-content-creator
tools:
  - hermes_read_provider_profile
  - hermes_publish_content
```

The skill source can be synchronized from the Neo skill set, but production
execution reads the deployed skill copy on the VPS. Skill changes must be
versioned and auditable because a skill change changes runtime behavior.

### Tenant context hydration

Account-specific context is data, not Hermes profile config. Before the Chief
or any delegated profile executes a production-capable task, the orchestrator
hydrates a compact tenant context profile from Supabase-owned product data:

- account and website identity;
- public website URL and active locales;
- agency name, description, specialty and brand voice;
- target audience, known pains and unique selling points;
- planner/team information where available;
- competitors and market notes;
- current North Star objective;
- source refs and freshness timestamp.

The v0 implementation should avoid introducing a new `bukeer_tenants` source of
truth if existing `accounts`, `websites`, planner/team and service-channel
records already hold the data. If a durable context pack is needed for evidence,
store a derived `hermes_tenant_context_snapshots` row with source refs and hash.

Execution shape:

```text
Kanban task {account_id, website_id, target, skill}
-> orchestrator reads tenant context profile
-> orchestrator reads provider context profiles
-> /goal prompt receives tenant + provider context
-> delegate_task receives only the context needed for that skill
```

This prevents generic content. A transcreation skill, for example, should know
it is writing for ColombiaTours, the target market, brand voice, audience pains,
local expertise and active locales without hardcoding any of that into the
Hermes profile itself.

### Provider-owned information profiles

Provider profiles are compact, cited context packs generated from Supabase-held
provider data. They are not Hermes memory and they are not the runtime queue.

Each provider profile must include:

- `provider`;
- `account_id`;
- `website_id`;
- `locale`;
- `market`;
- `freshness_at`;
- `confidence`;
- `source_refs`;
- observations;
- opportunities;
- risks;
- suggested tasks.

V0 provider profiles:

| Provider profile | Source | Primary consumers |
|---|---|---|
| `dataforseo_profile` | DataForSEO raw/cache/normalized facts | Chief, content, technical SEO |
| `gsc_profile` | Google Search Console cache | Chief, content, technical SEO |
| `ga4_profile` | GA4 cache/normalized events | Chief, outcome |
| `clarity_profile` | Microsoft Clarity profile/cache | Chief, technical SEO, outcome |
| `funnel_events_profile` | `funnel_events` and dispatch ledgers | Chief, outcome, risk |
| `content_inventory_profile` | pages/posts/SEO inventory | Chief, content, technical SEO |
| `transcreation_profile` | TM/glossary/jobs/localized variants | Chief, transcreation |
| `crm_waflow_profile` | WAFlow/Chatwoot/CRM facts where available | Chief, outcome |

Profiles consume provider information selectively:

| Hermes profile | Provider context allowed in v0 |
|---|---|
| `colombiatours-chief` | Cross-provider summary, conflicts, priorities and North Star scoring |
| `colombiatours-content` | DataForSEO, GSC, content inventory and relevant outcome facts |
| `colombiatours-editor` | Content inventory, brand/quality memories and provider evidence cited by content |
| `colombiatours-transcreation` | Transcreation profile, TM/glossary, localized GSC/GA4 if present |
| `colombiatours-technical-seo` | GSC, Clarity, content inventory, sitemap/render facts |
| `colombiatours-risk` | Policies, forbidden surfaces, rollback history and tool invocation failures |
| `colombiatours-outcome` | Funnel events, GA4, CRM/WAFlow and prior mutation outcomes |

Hermes may summarize provider context into memory only after citing source refs
and preserving freshness. Fresh provider facts beat stale Hermes memory.

### Provider Freshness Thresholds

| Provider profile | Fresh when | Blocks production when |
|---|---:|---|
| `dataforseo_profile` | <= 7 days | content/SEO task depends on keyword, SERP, competitor or backlink evidence and profile is stale/missing |
| `gsc_profile` | <= 48 hours | task depends on clicks, impressions, CTR or query/page selection and profile is stale/missing |
| `ga4_profile` | <= 24 hours | task depends on sessions, engagement or conversion behavior and profile is stale/missing |
| `clarity_profile` | <= 20 hours | task depends on UX friction evidence and profile is stale/missing |
| `funnel_events_profile` | <= 15 minutes | task claims lead/conversion impact and funnel profile is stale/missing |
| `content_inventory_profile` | <= 24 hours | task targets a page/post and inventory is stale/missing |
| `transcreation_profile` | <= 24 hours | task creates or merges localized content and TM/glossary/job state is stale/missing |
| `crm_waflow_profile` | <= 30 minutes | task claims qualified-lead/quote/booking impact and CRM/WAFlow profile is stale/missing |
| `risk_profile` | <= 5 minutes | any production tool call if policy/kill-switch profile is stale/missing |

If a provider profile is stale but not required for the action, Hermes may
continue only when the task explicitly records why that provider is irrelevant.

### Supabase-owned product/audit state

Supabase continues to own:

- `websites`;
- public site pages/posts/sections;
- SEO metadata;
- transcreation tables;
- provider raw/cache/normalized facts;
- `funnel_events`;
- account/user/website scope;
- snapshots;
- rollback payloads;
- audit events;
- outcomes.

### Legacy Growth OS runtime tables

The following runtime tables are deprecated as active runtime infrastructure.
They must not be dropped during v0 cutover. They become historical ledgers,
read-only references, or temporary bridges until certification, rollback and
reporting needs are satisfied.

| Legacy table | MVE v0 replacement |
|---|---|
| `growth_agent_instances` | Hermes profiles |
| `growth_agent_definitions` | Hermes profile config + skill bindings |
| `growth_agent_runs` | Hermes sessions |
| `growth_agent_task_sessions` | Hermes Kanban tasks/runs |
| `growth_agent_memories` | Hermes memory plus cited product facts |
| `growth_agent_skills` | Hermes skills in `~/.hermes/skills/` |
| `growth_agent_tool_calls` | `hermes_tool_invocations` + MCP logs |
| `growth_agent_tool_permissions` | profile MCP tool allowlists |
| `growth_agent_wakeup_requests` | Hermes cron |
| `growth_agent_artifacts` | Hermes session outputs and evidence links |
| `growth_agent_change_sets` | `hermes_mutation_snapshots` |
| `growth_agent_context_manifests` | tenant/provider context injected at execution |
| `growth_agent_context_packs` | tenant/provider context snapshots |
| `growth_agent_replay_cases` | Hermes sessions/evals |
| `growth_agent_run_events` | Hermes sessions/events |
| `growth_agent_run_metrics` | Hermes sessions/outcome records |
| `growth_agent_runtime_state` | `hermes_runtime_health` |
| `growth_runtime_cycles` | Hermes cron |
| `growth_scheduler_heartbeats` | Hermes runtime/tool-host health |
| `growth_autonomy_policies` | skill guardrails + MCP safety policy |
| `growth_orchestrator_decisions` | Kanban task metadata + `/goal` judge output |
| `growth_profile_runs` | Hermes sessions |

These tables are not active runtime queues in v0. Any writer that still creates
or claims new work in them during certification is a cutover failure.

Product/provider tables remain because they are data, not runtime:

- `growth_profiles`;
- `growth_signal_facts`;
- provider caches such as `growth_dataforseo_cache`, GSC and GA4 caches;
- `growth_funnel_observability_v1`;
- `growth_content_briefs`;
- `growth_content_tasks`;
- `growth_inventory`;
- `growth_experiments`;
- `growth_human_reviews`;
- `growth_ai_reviews`.

Temporary historical/bridge tables may remain readable during cutover:

- `growth_publication_jobs`;
- `growth_work_items`;
- `growth_work_item_outcomes`;
- `growth_backlog_candidates`;
- `growth_backlog_items`;
- `growth_chief_of_staff_*`.

## MCP Tool Safety Layer Contract

MVE v0 should not build a parallel custom Tool Gateway or a suite of Next.js API
routes as the primary execution surface. Production actions are MCP tool
handlers registered into Hermes and wrapped by a thin safety layer.

The safety layer is still mandatory. It is the server-side boundary that owns
Zod validation, scope checks, idempotency, field allowlists, snapshots, smoke,
rollback and audit. Profiles and delegated agents receive no service-role key.

Implementation shape:

```text
Hermes profile / delegated skill
-> MCP tool call
-> thin safety validation
-> handler in lib/growth/hermes-tools/<action>.ts
-> Supabase product/audit/snapshot write
-> structured MCP result back to Hermes
```

Each MCP tool call must include:

- `account_id`;
- `website_id`;
- `actor_profile`;
- `actor_role`;
- `skill_name`;
- `tool_name`;
- `target_type`;
- `target_id` or `target_path`;
- `idempotency_key`;
- payload validated by Zod;
- Hermes task/card id;
- Hermes run/session id;
- risk level;
- proposed rollback strategy.

Safety layer responsibilities:

1. Resolve account/site and reject cross-tenant calls.
2. Hydrate tenant context and verify it matches the task scope.
3. Check global kill switch.
4. Check profile and skill allowlist for the requested MCP tool.
5. Validate payload schema from `@bukeer/website-contract`.
6. Enforce table and field allowlists.
7. Enforce idempotency constraints.
8. Snapshot the target before mutation.
9. Apply the mutation with service-role credentials in the tool host only.
10. Run smoke checks.
11. Store rollback payload.
12. Record audit and outcome seed.
13. Return structured success/failure to Hermes.

Failure must return machine-readable reasons. Hermes should learn and create a
follow-up task instead of retrying blindly.

### MCP Tool Handlers

V0 production tools are handlers, not primary Next.js route handlers:

| Handler | MCP tool |
|---|---|
| `lib/growth/hermes-tools/read-provider-profile.ts` | `hermes_read_provider_profile` |
| `lib/growth/hermes-tools/publish-content.ts` | `hermes_publish_content` |
| `lib/growth/hermes-tools/merge-transcreation.ts` | `hermes_merge_transcreation` |
| `lib/growth/hermes-tools/apply-safe-seo-patch.ts` | `hermes_apply_safe_seo_patch` |
| `lib/growth/hermes-tools/record-outcome.ts` | `hermes_record_outcome` |
| `lib/growth/hermes-tools/rollback-change.ts` | `hermes_rollback_change` |

If a diagnostic HTTP route is exposed for Bukeer Studio or manual operations,
it must call the same handler and return the standard API envelope. The route
is not the runtime boundary.

### Field Allowlists

| Tool | Target table | Allowed fields |
|---|---|---|
| `hermes_publish_content` | `website_blog_posts` | `title`, `slug`, `excerpt`, `content`, `seo_title`, `seo_description`, `seo_keywords`, `status`, `published_at`, `featured_image` |
| `hermes_publish_content` | `website_pages` | `seo_title`, `seo_description`, `seo_keywords`, `structured_data` |
| `hermes_apply_safe_seo_patch` | `website_pages` | `seo_title`, `seo_description`, `seo_keywords`, `canonical_url`, `robots`, `og_title`, `og_description`, `structured_data`, `hreflang_overrides` |
| `hermes_apply_safe_seo_patch` | `website_blog_posts` | `seo_title`, `seo_description`, `seo_keywords`, `canonical_url`, `robots`, `og_title`, `og_description` |
| `hermes_merge_transcreation` | `seo_transcreation_jobs` | localized overlay payload, metadata payload, quality status and publish-safe flags only |

Denied in v0 for every tool:

- pricing fields;
- availability fields;
- reservation/booking/payment fields;
- CRM lifecycle fields;
- ad/campaign/budget fields;
- arbitrary JSON paths outside the tool schema.

### Idempotency Constraints

Every tool invocation must carry `idempotency_key` and `input_hash`.

V0 unique dimensions:

| Tool | Unique dimensions |
|---|---|
| `hermes_publish_content` | `account_id`, `website_id`, `tool_name`, `target_table`, `target_id/target_path`, `input_hash` |
| `hermes_apply_safe_seo_patch` | `account_id`, `website_id`, `tool_name`, `target_table`, `target_id/target_path`, `input_hash` |
| `hermes_merge_transcreation` | `account_id`, `website_id`, `tool_name`, `source_entity_id`, `source_locale`, `target_locale`, `input_hash` |
| `hermes_record_outcome` | `account_id`, `website_id`, `hermes_task_id`, `metric_name`, `evaluation_at` |
| `hermes_rollback_change` | `account_id`, `website_id`, `mutation_snapshot_id` |

Conflict behavior is `return_existing` when the previous invocation succeeded,
and `reject` when the previous invocation is still running or failed without a
safe rollback status.

## Profile Model

V0 uses one profile fleet for ColombiaTours:

| Profile | Bound skill | Purpose | Autonomy | Tools |
|---|---|---|---|---|
| `colombiatours-chief` | `bukeer-orchestrator` | Owns daily loop, prioritization, task creation, coordination | Full v0 autonomy | read context, create tasks, assign profiles, record outcomes |
| `colombiatours-content` | `bukeer-content-creator` | Produces content and SEO improvements | Full v0 autonomy | read providers, draft, publish content via MCP tool |
| `colombiatours-editor` | `bukeer-content-curator` | Quality, brand, factual checks | Full v0 autonomy | review, approve internally, publish via MCP tool |
| `colombiatours-transcreation` | `transcreator-es-en` | Localized content and metadata | Full v0 autonomy | read glossary/TM, merge transcreation via MCP tool |
| `colombiatours-technical-seo` | `bukeer-technical-remediation` | Safe metadata/technical SEO patches | Full v0 autonomy | apply safe SEO patch via MCP tool |
| `colombiatours-risk` | `bukeer-risk-guardian` | Policy/scope evaluator | Advisory + blocking authority | block task, mark requires rollback, disable profile |
| `colombiatours-outcome` | `bukeer-outcome-analyst` | Measurement and learning | Full v0 autonomy over learning | read outcomes, write learning, create follow-ups |

All profiles share the ColombiaTours account/site scope but have distinct memory, skills and tools.

Profiles are not a complete security boundary. The security boundary is:

```text
Hermes board scope
+ profile tool allowlist
+ profile skill binding
+ explicit working directory/runtime config
+ MCP Tool Safety Layer scope checks
+ field allowlists
+ snapshot/smoke/rollback
```

This prevents the system from treating profile separation as a substitute for
server-side authorization.

## Native Kanban Operating Model

Hermes native Kanban is the primary runtime state.

V0 uses the Hermes-native task statuses:

```text
triage -> todo -> ready -> running -> done -> archived
                           |
                           -> blocked
```

Status rules:

- `triage`: task exists but needs classification, target selection or scoring.
- `todo`: task is classified and assigned, but dependencies are not satisfied.
- `ready`: dependencies are satisfied and the Chief `/goal` loop may claim it.
- `running`: a Hermes profile session claimed the task.
- `blocked`: MCP safety layer, profile, stale provider context or policy stopped execution.
- `done`: task completed, including successful production mutation, no-op decision or completed rollback.
- `archived`: task no longer participates in the active operating board.

Growth OS-specific execution details must not become extra Kanban statuses:

| Growth detail | Stored as |
|---|---|
| `verifying` | task metadata, comment, tool invocation status or audit event |
| `smoke_passed` | tool invocation result + mutation snapshot smoke result |
| `smoke_failed` | tool invocation result + task comment, usually followed by `blocked` or rollback |
| `rollback_required` | task metadata/comment + mutation snapshot status |
| `rolled_back` | rollback audit event + mutation snapshot status; task may be `done` or `archived` |
| `outcome_pending` | outcome record status, not Kanban status |

No separate `candidate`, `pre-ready`, `review_needed` or `publication_job` states are required in v0.

Every production-capable card must carry this metadata:

- `account_id`;
- `website_id`;
- `target_type`;
- `target_id` or `target_path`;
- `assigned_profile`;
- `skill_name`;
- `allowed_tool`;
- `provider_profile_refs`;
- `baseline`;
- `expected_impact`;
- `success_metric`;
- `evaluation_date`;
- `risk_level`;
- `rollback_strategy`;
- `idempotency_key`.

Hermes may create internal exploration tasks without all fields, but a task
cannot call a production MCP tool until this metadata exists.

## Steel Thread User Flow

### Flow 1: Autonomous content update

1. Chief reads provider context profiles for ColombiaTours.
2. Chief scores opportunities against qualified trip requests and creates a Kanban task.
3. Chief runs `/goal` and delegates to the content profile with `delegate_task`.
4. Content profile loads `bukeer-content-creator`, tenant context and provider refs.
5. Content profile calls `hermes_publish_content` as an MCP tool.
6. Safety layer validates scope, fields and content quality.
7. Safety layer snapshots current row.
8. Safety layer writes the update.
9. Safety layer performs smoke checks.
10. Safety layer records audit/outcome seed.
11. Hermes moves card to `Done`.
12. Outcome profile schedules measurement follow-up.

### Flow 2: Autonomous transcreation merge

1. Chief creates a localized content task.
2. Chief delegates to the transcreation profile with `delegate_task`.
3. Profile loads `transcreator-es-en` and reads glossary/TM/context.
4. Profile calls `hermes_merge_transcreation` as an MCP tool.
5. Safety layer validates locale pair, source entity and quality score.
6. Safety layer applies localized overlay/metadata.
7. Smoke verifies hreflang/sitemap-safe state.
8. Hermes records learning and marks done.

### Flow 3: Autonomous safe SEO patch

1. Technical SEO profile creates or receives task for a safe metadata patch.
2. Profile loads `bukeer-technical-remediation` and calls `hermes_apply_safe_seo_patch` as an MCP tool.
3. Safety layer validates allowed fields only.
4. Safety layer applies patch and smoke-checks route/render metadata.
5. Rollback payload is stored.
6. Card moves to `done`; rollback result is stored as audit/snapshot metadata, not as a custom Kanban status.

### Flow 4: Self-improvement

1. Outcome profile reviews applied tasks and MCP tool outcomes.
2. It writes Hermes memory/skill updates in the profile scope.
3. Future profile tasks cite the memory/skill in their run summary.
4. Bukeer Studio shows what changed and what behavior it affected.

## Bukeer Studio MVE UI

The MVE UI must be operational, not decorative:

- Hermes runtime status: running/stale/paused/error.
- Active profile fleet and tool allowlists.
- Kanban mirror with task title, profile, state, target, last event and risk.
- Recent tool invocations.
- Recent production mutations.
- Smoke and rollback status.
- Kill switch.
- Manual rollback button for v0 mutations.
- Link to Hermes task/session/run evidence.

Studio does not need to become the primary Kanban editor in v0. It must show enough evidence to operate and recover production.

## Migration Plan

### Phase 0: Freeze current executor queue

- Stop creating new Growth OS `growth_work_items`.
- Keep existing Growth OS daemon paused or in monitor-only mode.
- Keep all historical tables readable.
- Export current blocked queue summary as migration evidence.

### Phase 1: Install Hermes primary runtime

- Upgrade Hermes in the production container.
- Create the ColombiaTours profile fleet.
- Create the native Hermes board for the ColombiaTours account/website scope.
- Configure Hermes cron, `/goal` and `delegate_task`.
- Synchronize the Neo skill set into `~/.hermes/skills/`.
- Configure Hermes workspace, memory, profile skill bindings and MCP tools.
- Store runtime config outside Supabase runtime tables.

### Phase 1.5: Define VPS operation

- Run the runtime under `/opt/growth-os/current`.
- Keep the previous Growth OS executor available but set it to monitor-only or
  stopped during certification.
- Run Hermes runtime, MCP tool host and watchdog as supervised services.
- Use a single board id for ColombiaTours v0.
- Emit structured logs with `profile_name`, `hermes_board_id`,
  `hermes_task_id`, `tool_name`, `target_table`, `target_id/target_path`,
  `idempotency_key` and `status`.
- Do not mount Supabase service-role credentials into the Hermes process unless
  the process is the MCP tool host. Profiles and delegated subagents call scoped
  MCP tools only.

Suggested services:

| Service | Responsibility |
|---|---|
| `hermes-runtime` | Hermes cron, board selection, Chief `/goal` loop and `delegate_task` orchestration |
| `hermes-mcp-tool-host` | Scoped MCP tools, service-role writes, snapshots, smoke, rollback and audit |
| `hermes-watchdog` | Runtime/tool-host health, stale task detection, kill-switch enforcement and log summaries |

Required environment variables:

| Variable | Owner | Notes |
|---|---|---|
| `HERMES_BIN` | runtime | Hermes CLI path |
| `HERMES_BOARD_ID` | runtime/tool host | ColombiaTours board id |
| `HERMES_PROFILE_CONFIG_DIR` | runtime | Profile config path with skill bindings |
| `HERMES_SKILLS_DIR` | runtime | `~/.hermes/skills/` |
| `HERMES_MCP_CONFIG_PATH` | runtime/tool host | MCP server/tool registration config |
| `HERMES_TOOL_HOST_URL` | runtime | Local MCP tool host URL if split from runtime |
| `GROWTH_ACCOUNT_ID` | runtime/tool host | ColombiaTours account id |
| `GROWTH_WEBSITE_ID` | runtime/tool host | ColombiaTours website id |
| `GROWTH_WORKSPACE_ROOT` | all services | Repo/runtime root |
| `SUPABASE_SERVICE_ROLE_KEY` | tool host only | Never exposed to profiles or delegated agents |
| `NEXT_PUBLIC_SUPABASE_URL` | tool host only | Supabase project URL |
| `OPENROUTER_AUTH_TOKEN` or model provider key | runtime by need | No client exposure |

### Phase 2: Configure MCP Tool Safety Layer

- Implement v0 tools as MCP handlers under `lib/growth/hermes-tools/**`.
- Register handlers in the Hermes MCP config.
- Validate with Zod contracts in `@bukeer/website-contract`.
- Add field allowlists and account/site scope checks.
- Add idempotency constraints.
- Add snapshot, smoke, rollback and audit writer.
- Ensure service-role credentials live only in the MCP tool host.

### Phase 2.5: Build provider context profiles

- Implement read-only provider context tools.
- Normalize DataForSEO, GSC, GA4, Clarity, funnel, content inventory,
  transcreation and CRM/WAFlow facts into compact context packs.
- Include freshness, confidence and source refs in every provider profile.
- Enforce per-profile provider access.
- Block production tools when required provider context is stale or missing.

### Phase 3: Mirror product evidence to Supabase

- Add minimal audit tables or adapt existing ledgers for:
  - Hermes MCP tool invocation;
  - Hermes mutation snapshot;
  - Hermes tenant/provider context snapshots;
  - Hermes outcome seed or existing outcome table bridge;
  - Hermes runtime health;
  - Hermes rollback record.
- Do not mirror Hermes sessions, memory, cron jobs or Kanban items as active
  Supabase runtime state.

### Phase 4: Studio operator surface

- Add Hermes runtime status panel.
- Add Kanban mirror.
- Add tool invocation and mutation ledger.
- Add kill switch and rollback controls.

### Phase 5: Cutover

- Stop or pause the Growth OS executor writer, e.g. `docker stop growth-orchestrator`.
- Confirm any lease/restart system does not automatically re-enable the old writer.
- Start `hermes-runtime`, `hermes-mcp-tool-host` and `hermes-watchdog` on the VPS.
- Import v0 cron jobs with Hermes cron:
  - production cycle: `*/30 * * * *`;
  - Neo transcreation monitoring;
  - GSC/provider freshness monitor.
- Verify Hermes version, board id, profile configs, skill bindings, MCP config,
  tool-host health and kill-switch state.
- Execute one task from each v0 action class.
- Confirm no Growth OS queue state was required for execution.
- Rollback path: stop Hermes services, restore the previous executor mode and
  resume the old cycle only after confirming no Hermes mutation is mid-flight.

### Phase 6: Certification

- Certify 24h runtime:
  - no stuck Hermes tasks;
  - no cross-tenant reads/writes;
  - at least one content publish;
  - at least one transcreation merge;
  - at least one safe SEO patch;
  - at least one rollback or rollback dry-verify;
  - smoke checks passed;
  - outcome seed created;
  - learning changed a later task.
- Score the certification with the SMART production gates below. The release is
  not 100% production-ready unless every hard gate passes.

## Implementation Surface

Expected code areas:

- `runtime/growth-hermes/**`
- `scripts/growth/**`
- `lib/growth/hermes-tools/**`
- `lib/growth/hermes-mcp/**`
- `lib/growth/hermes-context/**`
- `lib/growth/chief-of-staff/**`
- `lib/growth/console/**`
- `app/api/growth/**` only for diagnostics/control-plane routes, not primary runtime execution
- `app/dashboard/[websiteId]/growth/**`
- `packages/website-contract/src/schemas/**`
- `supabase/migrations/**`
- `docs/runtime/**`
- `.github/workflows/**` if certification/daemon checks move to CI

The actual implementation may rename directories from `growth-hermes` to `hermes-runtime` if the old sidecar name becomes misleading.

Cloudflare/Next.js boundary:

- VPS-only Hermes runtime/tool-host code must not be imported into public
  `app/` routes or any module bundled into the Cloudflare Worker unless the
  module is Worker-compatible.
- Bukeer Studio should read Supabase mirrors or call a small diagnostic/control
  endpoint; it should not execute production mutation handlers directly inside
  the Worker bundle.
- Shared schemas live in `@bukeer/website-contract`; implementation-only tool
  host code stays in runtime/tool-host modules.

## Data Model Changes

Prefer minimal new tables. Do not add Supabase tables for Hermes sessions,
Kanban items, cron jobs, memory or task queues.

### `hermes_tool_invocations`

Records MCP tool calls and safety-layer decisions.

Required fields:

- `id`
- `account_id`
- `website_id`
- `hermes_task_id`
- `hermes_run_id`
- `profile_name`
- `skill_name`
- `tool_name`
- `target_type`
- `target_id`
- `target_path`
- `idempotency_key`
- `status`
- `input_hash`
- `result_payload`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`

### `hermes_mutation_snapshots`

Stores before/after/rollback payloads for production mutations.

Required fields:

- `id`
- `account_id`
- `website_id`
- `tool_invocation_id`
- `target_table`
- `target_id`
- `target_path`
- `before_snapshot`
- `after_payload`
- `rollback_payload`
- `smoke_result`
- `status`
- `created_at`
- `updated_at`

### `hermes_provider_profile_snapshots`

Records provider context packs served to Hermes.

Required fields:

- `id`
- `account_id`
- `website_id`
- `provider`
- `locale`
- `market`
- `freshness_at`
- `confidence`
- `source_refs`
- `profile_payload`
- `served_to_profile`
- `created_at`

### `hermes_tenant_context_snapshots`

Records derived tenant context packs injected into `/goal` and delegated skills.
This is a snapshot/evidence table, not a new product SSOT.

Required fields:

- `id`
- `account_id`
- `website_id`
- `hermes_task_id`
- `profile_name`
- `skill_name`
- `context_hash`
- `tenant_name`
- `website_url`
- `active_locales`
- `source_refs`
- `context_payload`
- `created_at`

### `hermes_runtime_health`

Records coarse runtime/tool-host health for operators.

Required fields:

- `id`
- `account_id`
- `website_id`
- `hermes_board_id`
- `hermes_version`
- `runtime_mode`
- `runtime_health`
- `active_profiles`
- `active_skills`
- `tool_host_status`
- `kill_switch_enabled`
- `last_heartbeat_at`
- `created_at`

### `hermes_outcome_records`

Records measurement follow-up seeds and evaluated outcomes.

Required fields:

- `id`
- `account_id`
- `website_id`
- `hermes_task_id`
- `tool_invocation_id`
- `metric_name`
- `baseline`
- `success_metric`
- `evaluation_at`
- `status`
- `result_payload`
- `created_at`
- `updated_at`

## Contracts

Contract-first schemas must be added before implementation:

- `HermesRuntimeConfigSchema`
- `HermesProfileConfigSchema`
- `HermesSkillNameSchema`
- `HermesSkillBindingSchema`
- `HermesKanbanMirrorSchema`
- `HermesFieldAllowlistSchema`
- `HermesIdempotencyConstraintSchema`
- `HermesMcpToolSafetyPolicySchema`
- `HermesToolInvocationSchema`
- `HermesMutationSnapshotSchema`
- `HermesToolResultSchema`
- `HermesPublishContentPayloadSchema`
- `HermesSafeSeoPatchPayloadSchema`
- `HermesTranscreationMergePayloadSchema`
- `HermesRollbackPayloadSchema`
- `HermesOutcomeRecordSchema`
- `HermesProviderProfileSchema`
- `HermesProviderProfileSnapshotSchema`
- `HermesTenantContextProfileSchema`
- `HermesTenantContextSnapshotSchema`
- `HermesRuntimeHealthSnapshotSchema`
- `HermesGrowthTaskScoringSchema`

## Permissions

V0 permission model:

```text
account_id + website_id + profile_name + tool_name + target_type + field allowlist
```

Rules:

- `colombiatours-chief` can create/assign tasks but cannot write product rows directly.
- Content/editor profiles can publish only content/SEO fields allowed by their tools.
- Technical SEO can patch only safe fields.
- Transcreation can merge only localized overlays/metadata.
- Risk profile can block tasks and disable profiles through a scoped kill switch.
- Outcome profile can write outcomes/learning but cannot mutate public content.
- No profile gets raw service-role access.
- No profile can read provider context outside its allowlist.
- No profile can promote stale provider context into durable memory without source refs.
- No delegated skill can call an MCP tool that is outside its profile binding.
- Tenant context is injected per task and must not be hardcoded into Hermes profile config.

## Observability

MVE v0 must expose:

- Hermes process health;
- Hermes cron and `/goal` health;
- `delegate_task` handoff evidence;
- MCP tool-host health;
- board/task counts by state;
- board/task scoring by expected North Star impact;
- profile-level last run and error;
- profile skill binding status;
- tenant context snapshot freshness;
- provider profile freshness and confidence;
- tool invocation success/failure;
- mutation count by tool;
- smoke failures;
- rollbacks;
- learning updates;
- stuck task detector;
- kill switch state.

## Rollback Strategy

Rollback has two layers:

1. **Mutation rollback**: each v0 production mutation stores a target-specific rollback payload and can be reverted by `hermes_rollback_change`.
2. **Runtime rollback**: pause Hermes primary runtime and restart the previous Growth OS executor in monitor/executor mode if needed.

The old Growth OS runtime tables are not deleted in v0.

## Acceptance Criteria

- [ ] Hermes Kanban is the only runtime queue used for new ColombiaTours growth tasks.
- [ ] The runtime uses native Hermes Kanban board/task/run/event state, not a custom Kanban implementation.
- [ ] The ColombiaTours board is scoped one-to-one to the account/website MVE boundary.
- [ ] Growth OS executor is disabled as a writer during primary runtime certification.
- [ ] Hermes profile fleet exists for chief, content, editor, transcreation, technical SEO, risk and outcome.
- [ ] Each Hermes profile has explicit skill bindings and the required skills exist under `~/.hermes/skills/` on the VPS.
- [ ] Hermes uses `/goal` and `delegate_task` for multi-turn task execution and lane handoff.
- [ ] Hermes can create, claim, execute and complete tasks without `growth_work_items`.
- [ ] Tenant context is hydrated from Supabase-owned account/website/team/product data and injected into `/goal`/delegated skills.
- [ ] Production-capable Kanban cards include target, baseline, expected impact, success metric, evaluation date, risk and idempotency.
- [ ] Chief profile prioritizes tasks by North Star impact, confidence, risk and measurement window.
- [ ] Provider context profiles exist for DataForSEO, GSC, GA4, Clarity, funnel events, content inventory, transcreation and CRM/WAFlow where data is available.
- [ ] Each Hermes profile receives only provider profiles allowed for its role.
- [ ] `hermes_publish_content` can publish a scoped production content change as an MCP tool handler.
- [ ] `hermes_merge_transcreation` can merge a scoped localized change as an MCP tool handler.
- [ ] `hermes_apply_safe_seo_patch` can apply a safe SEO production patch as an MCP tool handler.
- [ ] Every tool invocation records account/site/profile/task/run/tool/target/idempotency.
- [ ] Every production mutation stores before snapshot, after payload, smoke result and rollback payload.
- [ ] A rollback or dry rollback is proven for at least one v0 mutation.
- [ ] No Hermes profile or delegated subagent receives `SUPABASE_SERVICE_ROLE_KEY`; only the MCP tool host may use it.
- [ ] Cross-tenant or wrong-website tool invocation fails closed.
- [ ] Bukeer Studio shows runtime status, Kanban mirror, tool invocations, mutations and rollback controls.
- [ ] Hermes learning updates influence a later task and are visible in evidence.
- [ ] 24h production certification passes with no stuck tasks and no direct unscoped DB writes.

## Production Readiness SMART Gates

Epic #521 is 100% production only when all hard gates pass during one continuous
24h ColombiaTours window, with no P0/P1 open and evidence linked in #533.

### Gate 1: Primary Hermes runtime

- 24h with `hermes-runtime`, `hermes-mcp-tool-host` and `hermes-watchdog` active.
- `growth-orchestrator` writes no new work.
- 0 Hermes tasks stuck for more than 30 minutes.
- 0 duplicate executions for the same `idempotency_key`.

### Gate 2: Security and scope

- 100% of cross-tenant attempts are rejected.
- 100% of out-of-allowlist tool calls are rejected.
- 100% of forbidden fields are rejected.
- 0 profiles or delegated subagents receive `SUPABASE_SERVICE_ROLE_KEY`.
- Service-role access is visible only in `hermes-mcp-tool-host`.

### Gate 3: Supabase and audit

- The migration is applied from `bukeer-flutter`.
- 100% of `hermes_*` tables have RLS enabled.
- 100% of Hermes writes use `service_role`.
- 100% of authenticated reads are filtered through `user_roles`.
- 0 direct unaudited writes are detected.

### Gate 4: Productive tools

- 1 successful real `hermes_publish_content`.
- 1 successful real `hermes_merge_transcreation`.
- 1 successful real `hermes_apply_safe_seo_patch`.
- 100% of mutations include before snapshot, after payload, smoke result and rollback payload.
- 1 real rollback or dry-verify rollback is proven.

### Gate 5: Context and quality

- 100% of productive tasks include injected tenant context.
- 100% of productive tasks include provider refs or documented irrelevance.
- Required provider freshness is PASS.
- 0 publications use stale provider facts without documented override.

### Gate 6: Growth scoring

- 100% of productive cards include complete scoring.
- Every productive card includes baseline, expected impact, success metric and evaluation date.
- Chief profile orders the backlog by `total_score`.
- Outcome profile creates a measurement follow-up for every mutation.

### Gate 7: Studio control plane

- Studio shows runtime health, board, profiles, skills, provider freshness,
  tenant context, tool invocations, mutations and rollback.
- Kill switch is visible and tested.
- Manual rollback is visible for every v0 mutation.
- Chromium and mobile E2E pass via the session pool.

### Gate 8: Observability

- Logs include `profile_name`, `hermes_board_id`, `hermes_task_id`,
  `tool_name`, `target`, `idempotency_key` and `status`.
- Health heartbeat is fresh at least every 5 minutes.
- 0 smoke failures remain without rollback or block.
- 0 critical errors remain unclassified.

### Gate 9: 24h certification closeout

- P0 issues: 0.
- P1 issues: 0.
- Cross-tenant incidents: 0.
- Unscoped DB writes: 0.
- Stuck tasks: 0.
- Duplicated mutations: 0.
- Final report exists under `docs/growth-sessions/`.
- Evidence is linked in #533 and #521 checklist is updated.

Final score:

| Score | Meaning |
|---|---|
| 100% | All hard gates pass. Authorized as primary production runtime. |
| 95-99% | Only documented P2/P3 warnings remain; no hard gate fails. |
| <95% | Not authorized for primary production. |
| Any P0/P1 | Automatic NO-GO, regardless of score. |

## Edge Cases

- Hermes profile session dies while task is running: Kanban lease/heartbeat reclaims task or marks stale.
- Tool succeeds but smoke fails: safety layer rolls back or marks `rollback_required`; task moves to `blocked` if unresolved or `done` if rollback completed.
- Duplicate task attempts same target: safety-layer idempotency prevents double write.
- Hermes proposes forbidden field: safety layer rejects with `field_not_allowed`.
- Hermes proposes paid/pricing/availability change: safety layer rejects with `action_not_in_v0_scope`.
- Supabase write succeeds but audit write fails: safety layer treats action as failed and rollback path is required.
- Provider context is stale: Hermes may still publish only if payload does not depend on stale provider claims; otherwise task blocks.
- Provider profiles disagree: Chief creates a conflict-resolution task or chooses the freshest/highest-confidence source with citations.
- A profile attempts to use provider context outside its allowlist: provider context tool rejects the request.
- Studio cannot load Hermes board: runtime continues, but health panel marks mirror stale.

## Test Plan

Use session pool for app tests. Do not use port 3000 from agents.

Required checks:

- TypeScript contracts compile.
- Unit tests for each MCP Tool Safety Layer validator.
- Unit tests for profile-to-skill bindings and tenant context hydration.
- Unit tests for field allowlists and forbidden actions.
- Unit tests for provider profile access and freshness rules.
- Integration test for content publish with snapshot/smoke/rollback.
- Integration test for transcreation merge.
- Integration test for safe SEO patch.
- Integration test for wrong account/website rejection.
- E2E Studio test for Hermes runtime status, Kanban mirror and provider profile freshness.
- VPS smoke: Hermes version/profile/board/cron/tool-host health.
- 24h certification run against ColombiaTours production.

## Delivery Issues

GitHub is the SSOT for execution state. Child issues:

1. [#522 feat: Hermes profile fleet, skill bindings and VPS daemon](https://github.com/weppa-cloud/bukeer-studio/issues/522).
2. [#523 feat: native Hermes Kanban and /goal execution loop](https://github.com/weppa-cloud/bukeer-studio/issues/523).
3. [#524 feat: provider context profiles and read-only context tools](https://github.com/weppa-cloud/bukeer-studio/issues/524).
4. [#525 feat: Growth task scoring contract for North Star prioritization](https://github.com/weppa-cloud/bukeer-studio/issues/525).
5. [#526 feat: Hermes MCP tool scoping and thin safety layer](https://github.com/weppa-cloud/bukeer-studio/issues/526).
6. [#527 feat: publish_content MCP tool with snapshot smoke and rollback](https://github.com/weppa-cloud/bukeer-studio/issues/527).
7. [#528 feat: merge_transcreation MCP tool with locale quality gate](https://github.com/weppa-cloud/bukeer-studio/issues/528).
8. [#529 feat: safe_seo_patch MCP tool with field allowlist](https://github.com/weppa-cloud/bukeer-studio/issues/529).
9. [#530 feat: Hermes product mutation audit and snapshot mirror](https://github.com/weppa-cloud/bukeer-studio/issues/530).
10. [#531 feat: Bukeer Studio Hermes runtime control surface](https://github.com/weppa-cloud/bukeer-studio/issues/531).
11. [#532 feat: cutover script for Hermes primary runtime](https://github.com/weppa-cloud/bukeer-studio/issues/532).
12. [#533 test: 24h Hermes primary runtime production certification](https://github.com/weppa-cloud/bukeer-studio/issues/533).

## Open Questions

- Should v0 reuse existing `growth_*` audit tables where shape matches, or create clean `hermes_*` audit tables and bridge later?
- Should the v1 board boundary remain website-level or move to account-level for multi-site accounts? V0 uses one board for ColombiaTours account/website scope.
- Should the old Growth OS executor remain monitor-only during the first 24h, or be fully stopped?
- Should the risk profile be able to pause individual profiles automatically after repeated smoke failures?
- What exact public content fields count as safe for `hermes_publish_content` in v0?
- Which existing Bukeer account/website/planner fields are sufficient for tenant context, and which fields require a new onboarding capture flow?

## Out Of Scope

- Multi-tenant rollout beyond ColombiaTours.
- Paid media mutation.
- Pricing, availability, reservations, payments or CRM mutation.
- Dropping legacy Growth OS runtime tables during v0.
- Making Bukeer Studio the canonical editor for Hermes Kanban.
- Full historical migration of old blocked work items into Hermes tasks.
- Building a custom Tool Gateway as the primary runtime surface instead of MCP tool handlers.
- Building custom dispatcher/worker heartbeat infrastructure instead of Hermes cron, `/goal` and `delegate_task`.

## Architecture Review Notes

This spec is viable as an MVE, but implementation should treat the following as
design gates before coding production writes:

1. **Hermes alignment gate**: implementation must use native Hermes board/task
   statuses only: `triage`, `todo`, `ready`, `running`, `blocked`, `done`,
   `archived`. Growth-specific states such as smoke, verifying and rollback
   are metadata, tool results, comments, snapshots or outcomes.
2. **MCP safety-layer gate**: no production write is acceptable until the MCP
   tool host has account/site scope checks, profile/skill tool allowlists,
   Zod payload schemas,
   field allowlists, idempotency, before snapshots, smoke checks, rollback
   payloads and audit/outcome writes.
3. **Provider profile gate**: Hermes must prioritize from compact provider
   profiles with freshness, confidence and source refs. Stale or missing
   provider facts must block tasks that depend on those facts.
4. **North Star gate**: production-capable tasks must carry baseline, expected
   impact, success metric and evaluation date. Otherwise Hermes is only
   automating activity, not optimizing Growth OS.
5. **VPS operations gate**: the release must define how Hermes runtime,
   MCP tool host, cron, `/goal`, `delegate_task`, board selection, logs and
   process supervision run on the VPS, including one-board-per-account/website
   scoping.
6. **Recovery gate**: rollback must be operator-visible in Bukeer Studio before
   autonomous production writes are certified.
7. **Cutover gate**: Growth OS executor may remain monitor-only during the
   first 24h, but it must not be a writer for new work during primary runtime
   certification.
8. **Edge boundary gate**: VPS-only Hermes runtime/tool-host code must not be
   imported into Cloudflare Worker routes. Studio reads mirrors or calls
   diagnostic/control surfaces only.

## Tech Validator PLAN Result

Verdict: **PASS WITH WARNINGS** after applying the Hermes-native audit changes.

ADR compliance summary:

- ADR-003 Contract-first validation: PASS. New contracts cover profile skill
  bindings, MCP safety policy, tenant context, provider profiles, idempotency,
  tool invocations, snapshots, runtime health and outcomes.
- ADR-005 Security defense-in-depth: PASS. Service-role credentials are limited
  to the MCP tool host; profiles and delegated agents call scoped tools only.
- ADR-007 Edge-first delivery: PASS WITH WARNING. The Hermes tool host is VPS
  runtime code and must not leak into the Cloudflare Worker bundle.
- ADR-009 Multi-tenant routing/isolation: PASS. Scope is account + website +
  board, with tenant context hydrated from product data.
- ADR-010 Observability: PASS. Runtime health, tool-host status, context
  snapshots, invocations, smoke, rollback and outcomes are observable.
- ADR-012 API envelope: PASS. Any diagnostic HTTP surface must use the standard
  envelope; MCP tool results are structured separately.
- ADR-013 Tech-validator gate: PASS. Child issues remain `needs-tvb` for
  implementation-level TVBs.
- ADR-016 Provider caching: PASS. Provider profiles include freshness,
  confidence and source refs.
- ADR-029 Funnel Events SOT: PASS. Funnel events remain product/growth evidence,
  not Hermes runtime state.

## Final MVE Rule

MVE v0 is accepted only if the production path is real:

```text
Hermes decides.
Hermes executes through skill-bound profiles and scoped MCP tools.
Supabase persists product/audit/outcome.
Bukeer Studio observes and can recover.
Growth OS executor is not required for new work.
```
