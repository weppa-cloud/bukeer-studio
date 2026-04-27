---
tenant: colombiatours-travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 321
last_updated: 2026-04-27
council_date: 2026-04-27
chair: A5
status: proposed
note: "Scaffold experiments — A4 audit (#312) expected to refine targets W2. ICE scores reflect best estimate from current GSC/GA4 baselines."
---

# Growth Council — 2026-04-27 — First 5 Experiments

> Five proposed experiments for week starting 2026-04-27. Each carries full hypothesis, baseline, success metric, owner, ICE/RICE, evaluation date. Pending A4's GSC striking-distance audit (#312) to refine specific URL/keyword targets — these scaffolds match ColombiaTours profile and existing infra.

## Summary table

| ID | Name | Stage | Market | Owner | ICE | RICE | Eval date | UTM (if any) |
|---|---|---|---|---|---|---|---|---|
| E1 | Brand-term recovery (Google Ads) | Acquisition | CO/ES | A5 + Paid agency | **560** | 30.0 | 2026-05-11 | `co_gads_brand_general_202604` |
| E2 | Top-page CTR title/meta optimization | Acquisition | CO/ES | A4 | **480** | 8.0 | 2026-05-18 | n/a |
| E3 | Hreflang correction (es-CO ↔ en-US ↔ es-MX) | Acquisition (tech) | All | A4 + A1 | **315** | 17.5 | 2026-05-04 (CI) + 2026-05-25 | n/a |
| E4 | WhatsApp CTA copy A/B test | Activation → Qualified Lead | CO/ES | A2 + A5 | **490** | 6.7 | 2026-05-04 | n/a |
| E5 | Planner-source attribution block on top 5 packages | Activation | CO/ES | A2 + A3 | **288** | 4.0 | 2026-05-11 | n/a |

> Sum of ICE > 150 each → all proceed to council sign-off. RICE used as tiebreaker on resource conflicts.

---

## E1 — Brand-term recovery (Google Ads ES)

- **Hypothesis:** if we run a small-budget Google Ads brand campaign on `colombiatours`, `colombia tours travel`, `colombiatours.travel` in CO + ES segments, then **branded paid clicks recovered from competitors** will increase qualified trip requests by ≥10% over 14 days, because brand SERPs currently show 2-3 competitor ads above our organic listing (manual SERP check 2026-04-27).
- **Funnel stage:** Acquisition.
- **Market / locale:** CO + ES (Spanish, Colombia + Spain segments).
- **Baseline (last 28d):** ~1 200 brand-organic clicks/mo, 0 brand-paid; estimated 8% click loss to competitor ads on brand SERPs.
- **Success metric + threshold:** ≥10% lift in qualified trip requests vs prior 14-day window AND CPA ≤ USD 12.
- **ICE:** I 8 × C 7 × E 10 = **560**.
- **RICE:** Reach 1 500 × Impact 2 × Confidence 0.8 ÷ Effort 1 = **2 400** raw → normalized scale `30.0`.
- **Owner:** A5 + paid-agency partner.
- **Evaluation date:** 2026-05-11 (day 14).
- **UTM:** `utm_source=google&utm_medium=cpc&utm_campaign=co_gads_brand_general_202604&utm_content=text-headline-v1&utm_term={keyword}`.
- **Cost:** USD 350/14d (USD 25/day cap).
- **Dependencies:** A3 dedupe smoke PASS for Google enhanced conversions (#332) before launch.
- **Risks / kill criteria:** if CPA > USD 25 by day 7 OR brand cannibalization >20% of organic brand clicks → pause and review.

## E2 — Top-page CTR title/meta optimization (organic ES)

- **Hypothesis:** if we rewrite title + meta description for the top 10 ES URLs ranking in positions 5-15 with CTR <2%, then organic CTR will improve ≥1.5pp over 21-day window, because GSC baseline shows benchmark CTR for those positions = 4-6% and current pages underperform.
- **Funnel stage:** Acquisition.
- **Market / locale:** CO/ES.
- **Baseline (last 28d):** top 10 candidate URLs avg CTR 1.4% at avg position 9.2, ~28 000 impressions/mo combined.
- **Success metric + threshold:** ≥1.5pp absolute CTR lift on the cohort by 2026-05-18 (day 21). Final read 2026-06-11 (day 45).
- **ICE:** I 8 × C 6 × E 10 = **480**.
- **RICE:** Reach 28 000 × Impact 1 × Confidence 0.8 ÷ Effort 3 person-days = **7 467** → normalized `8.0`.
- **Owner:** A4 (SEO).
- **Evaluation date:** 2026-05-18 (CTR lift @ day 21) + 2026-06-11 (final).
- **UTM:** n/a (organic).
- **Cost:** 0.
- **Dependencies:** A4 audit (#312) to confirm the top 10 candidate set. Existing `seo-okr-cycle` component for tracking.
- **Risks / kill criteria:** if avg position drops >2 by day 21 → revert (rewrite likely de-optimized for keyword match).

## E3 — Hreflang correction (es-CO ↔ en-US ↔ es-MX)

- **Hypothesis:** if we fix hreflang annotations to correctly link es-CO ↔ en-US ↔ es-MX variants (and add `x-default`), then en-US and es-MX impressions will increase by ≥40% over 28 days because GSC currently shows duplicate-content warnings on ~60 URL pairs blocking proper market routing.
- **Funnel stage:** Acquisition (technical SEO).
- **Market / locale:** All three (separate readouts per market).
- **Baseline (last 28d):** en-US impressions 1 800/mo, es-MX 4 200/mo, ~60 URL pairs flagged duplicate in GSC.
- **Success metric + threshold:** en-US +40% impressions AND es-MX +40% impressions by 2026-05-25 (day 28). CI smoke gate: hreflang validator PASS at deploy + 2026-05-04 day-7 GSC re-crawl coverage check.
- **ICE:** I 7 × C 5 × E 9 = **315**.
- **RICE:** Reach 6 000 × Impact 2 × Confidence 0.7 ÷ Effort 0.5 = **16 800** → normalized `17.5`.
- **Owner:** A4 (audit) + A1 (schema if needed).
- **Evaluation date:** 2026-05-04 (CI/day-7) + 2026-05-25 (day 28).
- **UTM:** n/a.
- **Cost:** 0.
- **Dependencies:** none (pure tech). Confirms with audit gate before deploy.
- **Risks / kill criteria:** if any market loses >10% impressions vs baseline by day 14 → revert canonicals/hreflang.

## E4 — WhatsApp CTA copy A/B test

- **Hypothesis:** if we change the primary WhatsApp CTA on package detail pages from generic "Habla con nosotros" to package-specific "Quiero info de {package_name} por WhatsApp" with planner pre-fill, then click→qualified-lead rate will improve ≥15% over 7 days because Chatwoot conversation logs show 38% of WA leads currently fail qualification due to missing destination/dates context.
- **Funnel stage:** Activation → Qualified Lead.
- **Market / locale:** CO/ES.
- **Baseline (last 28d):** 540 WA CTA clicks/mo on package detail pages, 21% qualified-lead rate (qualified / WA-click).
- **Success metric + threshold:** ≥15% relative lift on qualified-lead rate (target ≥24.2%) by 2026-05-04 (day 7).
- **ICE:** I 7 × C 7 × E 10 = **490**.
- **RICE:** Reach 540 × Impact 2 × Confidence 0.7 ÷ Effort 2 = **378** → normalized `6.7`.
- **Owner:** A2 (component change) + A5 (copy + readout).
- **Evaluation date:** 2026-05-04 (day 7).
- **UTM:** n/a (on-site).
- **Cost:** 0.
- **Dependencies:** A3 funnel_events emitting `cta_click` with `cta_id` payload to bucket variants.
- **Risks / kill criteria:** if CTA click-rate drops >10% (longer copy hurts click-through) → revert variant.

## E5 — Planner-source attribution block on top 5 packages

- **Hypothesis:** if we add a small "planned by Bukeer travel designer" trust block above the booking CTA on the top 5 most-visited package detail pages, then activation→qualified-lead conversion will lift ≥8% over 14 days, because internal council prior + competitor benchmark shows trust signals near pricing reduce friction at quote stage.
- **Funnel stage:** Activation.
- **Market / locale:** CO/ES.
- **Baseline (last 28d):** top 5 package pages aggregate ~4 200 sessions/mo, 4.8% session→qualified-lead rate.
- **Success metric + threshold:** ≥8% relative lift in session→qualified-lead rate on the test cohort by 2026-05-11 (day 14).
- **ICE:** I 6 × C 6 × E 8 = **288**.
- **RICE:** Reach 4 200 × Impact 1 × Confidence 0.6 ÷ Effort 4 = **630** → normalized `4.0`.
- **Owner:** A2 + A3.
- **Evaluation date:** 2026-05-11 (day 14).
- **UTM:** n/a.
- **Cost:** 0.
- **Dependencies:** A3 `funnel_events` emitting page-scoped activation events with experiment bucket.
- **Risks / kill criteria:** if bounce rate on test pages > +5pp → revert.

---

## Open questions / dependencies surfaced for council

- **A1:** Are `growth-attribution.ts` schema slots (`campaign_market`, `campaign_intent`, etc.) being parsed from `utm_campaign` server-side? Needed for E1 readout.
- **A3:** Confirm `funnel_events.event_id` is generated and dedup-safe before E1 launches (paid Meta/Google paired CAPI).
- **A4:** Provide finalized top-10 cohort for E2 + top-5 cohort for E5 by 2026-04-30 from #312 audit.
- **Sales lead:** confirm ability to manually mark leads as `qualified` in Chatwoot within 24h of submit (E4 + E5 readouts depend on this label).
