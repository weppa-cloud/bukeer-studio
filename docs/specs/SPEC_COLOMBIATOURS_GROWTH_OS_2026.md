# SPEC: ColombiaTours Growth Operating System 2026

## Status

- **Owner:** Growth + SEO + Performance + CRM/Planner operations
- **Epic:** [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
- **Pilot tenant:** ColombiaTours (`colombiatours.travel`)
- **Website id:** `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- **Status:** Implementation-ready operating spec
- **Last updated:** 2026-04-25

## Summary

ColombiaTours growth must be operated as a cross-channel Growth Operating
System, not as a standalone SEO project. The system aligns SEO, paid media,
WAFlow/WhatsApp, Chatwoot/CRM, planners, content, authority and reporting
around one North Star:

```text
qualified trip requests / month
```

The final business outcome is:

```text
confirmed bookings attributed to growth channels / month
```

The original SEO target remains a key input:

```text
593 organic clicks / 28d -> 5,930+ organic clicks / 28d in 12 months
```

Traffic is not the success condition. Growth is successful when qualified trip
requests, quote progression and confirmed bookings increase with measurable
source attribution.

## Operating Model

### Funnel

```text
Acquisition -> Activation -> Qualified Lead -> Quote Sent -> Booking -> Review/Referral
```

### Channel roles

| Channel | Role | Primary stage |
|---|---|---|
| SEO | Compounding non-brand acquisition by cluster and market | Acquisition |
| Google Ads | High-intent demand validation and capture | Acquisition |
| Meta | Latent demand, storytelling and remarketing | Acquisition / Activation |
| TikTok | Discovery and creator proof | Acquisition |
| WAFlow / WhatsApp | Lead activation and trip request capture | Activation |
| Chatwoot / CRM / planners | Qualification, quote and booking lifecycle | Revenue |
| Reviews / UGC / backlinks | Trust, authority and referral loops | Review / Referral |

### Weekly Growth Council

Cadence: Monday, 60 minutes.

Required output:

- North Star status.
- Active experiments reviewed.
- Completed experiments classified as `win`, `loss`, `inconclusive`,
  `scale` or `stop`.
- Maximum 5 active experiments selected for the next week.
- Owner, ship date, evaluation date and success metric assigned.
- Learning recorded in [#321](https://github.com/weppa-cloud/bukeer-studio/issues/321)
  or the weekly growth doc.

## GitHub Work Map

### Core Growth OS

| Issue | Purpose |
|---|---|
| [#329](https://github.com/weppa-cloud/bukeer-studio/issues/329) | North Star, AARRR funnel and governance cadence |
| [#311](https://github.com/weppa-cloud/bukeer-studio/issues/311) | Growth Inventory + AARRR Experiment Dashboard |
| [#321](https://github.com/weppa-cloud/bukeer-studio/issues/321) | Weekly Growth Council + reporting |

### Technical and SEO execution

| Issue | Purpose |
|---|---|
| [#312](https://github.com/weppa-cloud/bukeer-studio/issues/312) | Live technical audit top 100 URLs |
| [#313](https://github.com/weppa-cloud/bukeer-studio/issues/313) | P0/P1 technical remediation |
| [#314](https://github.com/weppa-cloud/bukeer-studio/issues/314) | Spanish priority content optimization |
| [#315](https://github.com/weppa-cloud/bukeer-studio/issues/315) | EN-US keyword universe |
| [#316](https://github.com/weppa-cloud/bukeer-studio/issues/316) | EN-US priority hubs |
| [#317](https://github.com/weppa-cloud/bukeer-studio/issues/317) | Mexico commercial funnel |
| [#318](https://github.com/weppa-cloud/bukeer-studio/issues/318) | EN-US safety and best-time clusters |
| [#319](https://github.com/weppa-cloud/bukeer-studio/issues/319) | Colombia destination entity graph |
| [#320](https://github.com/weppa-cloud/bukeer-studio/issues/320) | Planner/reviewer and source blocks |

### Conversion, paid and authority

| Issue | Purpose |
|---|---|
| [#322](https://github.com/weppa-cloud/bukeer-studio/issues/322) | Meta + Chatwoot conversion tracking |
| [#330](https://github.com/weppa-cloud/bukeer-studio/issues/330) | Organic CRO for WAFlow, WhatsApp CTA and planner routing |
| [#331](https://github.com/weppa-cloud/bukeer-studio/issues/331) | Paid media governance for Google Ads, Meta and TikTok |
| [#332](https://github.com/weppa-cloud/bukeer-studio/issues/332) | Google Ads enhanced conversions and offline lead stages |
| [#333](https://github.com/weppa-cloud/bukeer-studio/issues/333) | TikTok Events API and event deduplication |
| [#334](https://github.com/weppa-cloud/bukeer-studio/issues/334) | Digital PR, backlinks and authority pipeline |
| [#335](https://github.com/weppa-cloud/bukeer-studio/issues/335) | Local SEO, Google Business Profile and reviews operating model |

## Growth Inventory Contract

Issue [#311](https://github.com/weppa-cloud/bukeer-studio/issues/311) is the
source of truth for the Growth Command Center. It must include one row per
priority URL, campaign, cluster, market or experiment.

Minimum fields:

```text
source_url
canonical_url
locale
market
template_type
cluster
intent
funnel_stage
channel
gsc_clicks_28d
gsc_impressions_28d
gsc_ctr
gsc_avg_position
ga4_sessions_28d
ga4_engagement
waflow_opens
waflow_submits
whatsapp_clicks
qualified_leads
quotes_sent
bookings_confirmed
booking_value
gross_margin
hypothesis
experiment_id
ICE_score
RICE_score
success_metric
baseline_start
baseline_end
owner
owner_issue
change_shipped_at
evaluation_date
result
learning
next_action
technical_status
content_status
conversion_status
attribution_status
priority_score
```

Decision rule:

```text
No row moves to in_progress unless it has hypothesis, baseline, owner,
success_metric and evaluation_date.
```

## Event And Attribution Contract

### Minimum funnel events

```text
waflow_open
waflow_step_next
waflow_submit
whatsapp_cta_click
qualified_lead
quote_sent
booking_confirmed
review_submitted
referral_lead
```

### Attribution keys

```text
reference_code
session_key
utm_source
utm_medium
utm_campaign
utm_content
utm_term
gclid
gbraid
wbraid
fbclid
ttclid
source_url
page_path
event_id
```

### Platform requirements

- Meta must use Pixel + Conversions API dedupe via shared event id.
- Google Ads must support enhanced conversions for leads and offline stages.
- TikTok must use Pixel + Events API dedupe where the same event is sent from
  browser and server.
- Chatwoot/CRM is the source of truth for `qualified_lead`, `quote_sent` and
  `booking_confirmed`.

## Experiment Rules

### ICE for weekly execution

```text
ICE = Impact x Confidence x Ease
```

Use ICE for experiments expected to ship inside one week.

### RICE for multi-week bets

```text
RICE = Reach x Impact x Confidence / Effort
```

Use RICE for content clusters, paid channel buildout, authority campaigns and
tracking work that spans more than two weeks.

### Evaluation windows

| Work type | Minimum evaluation window |
|---|---:|
| Paid media | 7-14 days |
| SEO/content | 21-45 days |
| Technical SEO | Immediate validation + 7/28 day monitoring |
| CRM/planner SLA | Daily + weekly rollup |
| Authority/backlinks | 30-90 days |

## 90-Day Roadmap

### Days 1-15: foundations

- Update #310/#311/#321 as Growth OS artifacts.
- Run #329 to define North Star, AARRR funnel and governance cadence.
- Confirm WAFlow/WhatsApp/Chatwoot tracking path.
- Document campaign naming and UTM convention in #331.
- Keep #312/#313 as pre-scale technical gate.

### Days 16-45: quick wins

- Finish #312/#313 gate: `PASS`, `PASS-WITH-WATCH` or `BLOCKED`.
- Optimize top ES pages with position 5-15, low CTR or weak activation.
- Run first CRO experiments from #330.
- Launch first Google Ads non-brand tests only if #332 tracking is ready or
  clearly marked as measurement-limited.
- Start #334 authority prospecting.

### Days 46-90: controlled scale

- Execute EN-US keyword universe and first hubs from #315/#316.
- Activate Mexico commercial funnel from #317.
- Test Meta/TikTok remarketing and creator-style creative after #322/#333
  tracking guardrails.
- Add local SEO/reviews process from #335.
- Scale only experiments classified as `win` or `scale`.

## Acceptance Criteria

- #310 operates as Growth OS, not only SEO Epic.
- #311 includes inventory, AARRR funnel fields and experiment controls.
- #321 reports experiments, learnings and North Star movement weekly.
- #322 is linked as paid attribution dependency.
- Google Ads, Meta and TikTok tracking plans are documented.
- First Growth Council runs with 5 or fewer ICE-scored experiments.
- Dashboard/report includes clicks, sessions, WAFlow submits, qualified leads,
  quote sent, bookings and revenue when available.
- Every phase reports impact against baseline, not only tasks completed.

## Plan Compliance Report

Mode: `tech-validator` PLAN.

```text
Verdict: PASS WITH WARNINGS
Domain: growth | public-site | backend | analytics
Complexity: Complex
```

### ADR Compliance

| ADR | Verdict | Notes |
|---|---|---|
| ADR-001 Server-First Rendering | PASS | The Growth OS plan is mostly operational. Any future dashboard UI should default to Server Components and add client boundaries only for interactive filters/charts. |
| ADR-002 Error Handling | PASS WITH WARNING | Future tracking endpoints and reporting jobs must define structured error handling, retry states and non-blocking failure behavior before implementation. |
| ADR-003 Contract-First Validation | PASS WITH WARNING | The plan defines event and inventory contracts, but implementation must add Zod parsing for WAFlow, Chatwoot, ad platform and inventory payloads before any mutation. |
| ADR-004 State Management | PASS | The proposed source of truth is operational data plus GitHub issues/docs, not a new client global store. |
| ADR-005 Security Defense-in-Depth | PASS WITH WARNING | `gclid`, `fbclid`, `ttclid`, contact data and booking values require server-only secrets, RLS, redaction, consent posture and least-privilege access before paid scale. |
| ADR-006 AI Streaming | N/A | No AI streaming feature is proposed in this Growth OS spec. |
| ADR-007 Edge-First Delivery | PASS WITH WARNING | Future API work must avoid Node-only SDKs unless a route explicitly requires `runtime = 'nodejs'`; direct `fetch` and Web Crypto are preferred. |
| ADR-008 Monorepo Packages | PASS | No package boundary violation. Any shared event schemas that become cross-repo contracts should move into `@bukeer/website-contract`. |
| ADR-009 Multi-Tenant Routing | PASS WITH WARNING | Tracking and reporting must preserve `website_id`, tenant/domain and market segmentation so ColombiaTours data never contaminates other tenants. |
| ADR-010 Observability | PASS | The plan requires weekly reporting, event status and baseline comparison. Implementation should add structured logs for failed sends, orphan leads and attribution gaps. |
| ADR-011 Middleware Cache | PASS | The plan does not mutate middleware behavior. Future tracking scripts must not depend on middleware cache side effects. |
| ADR-012 API Response Envelope | PASS WITH WARNING | Any new API routes for reporting or conversions must use the standard success/error response envelope. |
| ADR-018 Webhook Idempotency | PASS WITH WARNING | Chatwoot, Meta, TikTok, Google offline conversion and booking events must dedupe by provider/event id before state changes or external sends. |
| ADR-019 Multi-locale URL Routing | PASS | The plan separates ES, EN and Mexico as decision dimensions, aligned with locale-aware routing. |
| ADR-020 hreflang Emission Policy | PASS | The plan keeps `hreflang` as a technical gate before multilingual content scale. |
| ADR-024 Booking V1 Pilot Scope | PASS | The plan respects WhatsApp/WAFlow as the primary pilot conversion path and does not force self-serve booking. |
| ADR-025 Studio/Flutter Field Ownership | PASS | The plan explicitly avoids mutating product truth tables from Studio growth workflows. |

### Design System / Tokens

Not applicable for the current plan because this spec introduces no UI. If a
dashboard is added later, it should reuse `components/ui/*`, Tailwind utilities
and theme CSS variables instead of custom primitives or hardcoded colors.

### Reusability Assessment

- Reuse existing WAFlow lead persistence and analytics helpers before creating
  new tracking surfaces.
- Reuse the Chatwoot/Meta conversion tracking spec in
  `SPEC_META_CHATWOOT_CONVERSIONS` for paid attribution implementation.
- Reuse GitHub issues as the execution state and this spec as the operating
  contract.
- Move shared event schemas into `@bukeer/website-contract` only when they
  become cross-repo contracts with Flutter or other services.

### Commit Context

Recent related work:

- `070a759f` — SEO organization author fallback on blogs.
- `0a2f89a5` — assigned package planner surfaced on public pages.
- `8a0f5961` — Mexico travel funnel block.
- `ca6ccb05` — ColombiaTours DataForSEO batch logging.
- `c1603872` — ColombiaTours DNS cutover to Worker.
- `82c08132` — DataForSEO MCP + SEO growth playbooks.

Current worktree notes:

- `docs/INDEX.md` is modified to index this spec.
- `docs/specs/SPEC_COLOMBIATOURS_GROWTH_OS_2026.md` is new.
- `.sessions/` and `docs/specs/SPEC_META_CHATWOOT_CONVERSIONS.md` were already
  present as untracked context and were not reverted.

### Recommendations Before Implementation

1. Treat #312/#313 and #322/#332/#333 as pre-scale gates for content and paid
   media.
2. Define Zod schemas for all persisted event payloads before API or webhook
   implementation.
3. Add privacy/redaction rules for identifiers, contact data and booking values
   before sending events to ad platforms.
4. Keep tenant, locale and market segmentation mandatory in every report.
5. Block any experiment from `in_progress` unless it has hypothesis, baseline,
   owner, success metric and evaluation date.

## Guardrails

- Do not scale content if #312/#313 is `BLOCKED`.
- Do not scale paid media without attribution guardrails.
- Do not aggregate ES, EN and Mexico for decisions unless the view is explicitly
  marked as aggregate.
- Do not use AI-generated thin content for final travel copy.
- Do not treat Bukeer SaaS and ColombiaTours B2C as the same roadmap.
- Do not mutate truth tables for products from Studio growth workflows.

## References

- Google Search Console Performance report:
  https://support.google.com/webmasters/answer/7576553
- Google Business Profile local ranking:
  https://support.google.com/business/answer/7091/improve-your-local-ranking-on-google
- Google Search Central Core Web Vitals:
  https://developers.google.com/search/docs/appearance/core-web-vitals
- Google Things to do Ads:
  https://developers.google.com/google-ads/api/docs/things-to-do-ads/overview
- Google Ads enhanced conversions for leads:
  https://support.google.com/google-ads/answer/11021502
- TikTok event deduplication:
  https://ads.tiktok.com/help/article/event-deduplication
