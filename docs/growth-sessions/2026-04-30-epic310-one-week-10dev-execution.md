---
session_id: "2026-04-30-epic310-one-week-10dev-execution"
tenant: colombiatours-travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
scope: growth-os-execution-sprint
created_at: 2026-04-30
status: active
---

# EPIC #310 One-Week Execution Plan — 10 Developers

## Council Decision

Council accepts #312/#313 as `PASS-WITH-WATCH accepted`.

Technical evidence:

- DataForSEO post-P1 crawl: `04300334-1574-0216-0000-c57a3723c41d`.
- Crawl size: 952 pages.
- Diff vs previous postfix crawl: 519 resolved, 0 regressed.
- Residual P0 disposition:
  - 18 hidden EN wrong-locale 404 accepted.
  - 3 provider fetch transient rows accepted as watch.
  - 0 manual P0 blockers.
- Active technical watch: `https://colombiatours.travel/actividades/panaca-ingresos`.

#310 is now a technical PASS candidate, not closed. The remaining objective is to make Growth OS operationally certifiable.

## One-Week Goal

By the end of the week, #310 should be `PASS-WITH-WATCH operativo` with:

- technical SEO accepted by Council;
- EN quality gate operational;
- tracking and attribution evidence table published;
- `growth_inventory` clean enough for Council decisions;
- maximum 5 active experiments with source, baseline, owner, metric and evaluation date;
- GitHub issues updated as SSOT.

## Team Allocation

| Dev    | Lane                | Issues                 | Goal                                                             | Deliverable                                   |
| ------ | ------------------- | ---------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Dev 1  | Tech performance    | #312, #313             | Close or downgrade Panaca performance watch                      | Evidence or patch + production smoke          |
| Dev 2  | EN quality QA       | #315                   | Audit 13 review-ready EN URLs                                    | Publishable/retranslate/do-not-publish matrix |
| Dev 3  | EN sitemap/hreflang | #314, #315             | Allow only approved EN URLs into sitemap/hreflang                | Policy update or blocker note                 |
| Dev 4  | GSC CTR             | #311, #321, #314       | Pick decision-grade CTR experiment                               | Baseline + 1 experiment                       |
| Dev 5  | GA4/CRO             | #311, #321, #322       | Pick activation experiment                                       | Baseline + 1 experiment                       |
| Dev 6  | Tracking            | #322, #330, #332, #333 | Validate Lead, WhatsApp CTA, itinerary_confirmed, Meta CAPI      | PASS/WATCH/BLOCKED table                      |
| Dev 7  | Inventory           | #311, #321             | Clean stale queued/blocked rows and enforce decision-grade rows  | Dry-run/apply cleanup + counts                |
| Dev 8  | Authority/local     | #334, #335             | Convert DataForSEO Backlinks/Business Data into P1 baseline plan | Provider profile + first baseline criteria    |
| Dev 9  | AI/GEO              | #310, #337             | Confirm AI search/LLM visibility lane requirements               | GEO facts/inventory plan                      |
| Dev 10 | Release/validator   | all                    | Validate issues, docs, CI, smoke and Council criteria            | Certification note                            |

## Active Experiment Cap

Council may approve at most 5 active experiments:

1. Panaca performance watch/remediation.
2. EN quality pilot for 13 review-ready URLs.
3. GSC high-impression / low-CTR batch.
4. GA4 landing activation gap.
5. WAFlow / itinerary_confirmed attribution traceability.

Everything else remains backlog or watch.

## Acceptance Criteria

| Area          | Criteria                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Technical SEO | #312/#313 accepted; no active P0 blocker from current crawl; Panaca watch has owner/date                   |
| EN quality    | 13 URLs classified; no unapproved EN URL enters sitemap/hreflang                                           |
| Tracking      | Lead, WhatsApp CTA, itinerary_confirmed and Meta CAPI have evidence; Chatwoot may remain blocked by secret |
| Inventory     | Current task rows are not blocked; stale rows have cleanup decision; Council sees decision-grade rows only |
| Council       | 5 or fewer active experiments, all with source/baseline/owner/metric/date                                  |
| GitHub SSOT   | #310/#311/#312/#313/#314/#315/#321/#322 updated                                                            |

## Blockers

- Do not implement Wompi/Purchase in this sprint.
- Do not bulk-publish EN content without quality gate.
- Do not launch paid scale without tracking smoke.
- Do not treat WATCH rows as experiments without source, baseline, owner, metric and evaluation date.
- Do not run another full DataForSEO crawl unless Council asks for confirmation after fixes.

## Certification Target

Recommended final state:

- #310: `PASS-WITH-WATCH operativo`, not closed.
- #312/#313: closable or closed-with-watch depending on Panaca decision.
- #314/#315: active EN quality lane, not broad content scale.
- #321: Council running 5-or-fewer experiments.
- #322: partially pass; purchase/Wompi remains explicitly out of scope.
