# ColombiaTours Keyword, Market, And Product Research

Date: 2026-05-11
Account: Google Ads customer `1261189646` / ColombiaTours
Decision mode: accelerated tests, optimized for qualified CRM lead.

## Executive Readout

The best near-term growth path is not opening many countries at once. It is to tighten and scale the markets already showing signal:

1. **Mexico multidestination/todo incluido** remains the main acquisition engine.
2. **Spain premium/multidestination + Cartagena/Eje Cafetero** is the strongest quality surprise after the latest campaign updates.
3. **Chile** should stay as a low-budget validation test, especially `paquetes a colombia desde chile` and San Andres, but it is unlikely to deliver 10 qualified leads/day alone.
4. **USA** has real commercial search volume and premium upside, but prior spend produced poor search terms. Reopen only with exact-match packages/luxury terms and strict negatives.
5. **Santander/San Gil/Barichara** is the clearest underserved product gap by volume, but it is not ready for Ads because intent is mostly informational and ColombiaTours does not yet have a package-led landing.

Primary KPI: qualified CRM opportunity, not Google Ads legacy conversion count. A qualified lead means useful `waflow_submit`, real WhatsApp conversation, `crm_quote_sent`, `qualified`, or `proposal_sent`.

## Evidence Used

- Google Ads MCP read-only queries for 2026-05-04 through 2026-05-11:
  - MX: 1,986 impressions, 293 clicks, COP 474.2k, 7 conversions, 13 all conversions.
  - ES: 615 impressions, 114 clicks, COP 385.7k, 7 conversions, 18 all conversions.
  - US: 194 impressions, 22 clicks, COP 129.9k, 0 conversions.
  - CL: 240 impressions, 30 clicks, COP 86.3k, 0 conversions.
- Google Ads search terms and keyword performance:
  - Strong live signals: `paquete de viaje a colombia` in MX, `agencias de viajes colombia` / `agencia viajes colombia` in ES, `tour eje cafetero` in ES.
  - Waste/risk terms: competitor/opinion terms, day tours from Medellin, generic agency terms, `2x1`, flights/hotel-only searches.
- DataForSEO keyword overview across Mexico, Spain, Chile, United States, Canada, Argentina, and Peru.
- Landing smoke via `curl`:
  - All tested key landings returned `200` and had WhatsApp/WAFlow references.
  - `/paquetes/gran-tour-colombia-15-dias-bogota-eje-cafetero-medellin-y-santa-marta` returned `200` and WhatsApp references but the simple H1 extraction did not find a visible `<h1>` in the static HTML. Treat as a landing QA watch item.
- Supabase MCP was unavailable during this run (`Transport closed`), so CRM/funnel validation should be refreshed before any budget scale decision.

## Market Findings

| Market | Readout | Decision |
|---|---|---|
| Mexico | Highest volume and current conversion signal. `viajes a colombia` has 9,900/mo, `viaje a colombia desde mexico` 1,300/mo, `viaje a colombia todo incluido` 1,300/mo. | Keep as engine. Expand exact/phrase around converting package/organized-trip terms. |
| Spain | Lower raw volume than Mexico but current Ads quality is promising. `viajes a colombia` 3,600/mo, `desde españa` 720/mo, `viajes organizados` 260/mo. | Keep active, test premium/multidestino and Eje Cafetero carefully. |
| Chile | Real but constrained volume. `paquetes a colombia` 1,000/mo, `viaje a colombia desde chile` 480/mo, `paquetes a colombia desde chile` 210/mo. | Keep COP 30k/day test; do not expect scale alone. |
| USA | Commercial package terms have 720/mo each, but CPC is high and previous traffic was polluted. Luxury/private has low volume but high ticket. | Reopen only as exact-match micro-test after confirming EN landing copy and tracking. |
| Canada | Similar to USA but smaller: package terms around 260/mo, lower CPC than US. | Defer until USA proves clean lead quality. |
| Argentina | `paquetes a colombia` 1,300/mo and `desde argentina` 480/mo, CPC low. Quality/ticket risk needs a market-specific landing. | Prepare landing/copy, do not activate yet. |
| Peru | Some volume but weaker than Argentina/Mexico/Chile. | Defer. |

## Product And Destination Findings

| Product/Destination | Demand | Product Fit | Decision |
|---|---:|---|---|
| Multidestino Colombia | Very high in Mexico and solid in Spain/Chile. | Ready. | P1 paid acquisition. |
| Cartagena | Strong destination awareness; `viajar a cartagena de indias` Spain 590/mo, US packages 480/mo. | Ready, but phrase terms can go informational. | Keep exact/phrase with package modifiers. |
| San Andres | Chile has `paquetes a san andres colombia` 720/mo; Mexico low in current sampled phrase but product exists. | Ready. | Useful controlled test, heavy negatives against `2x1`, flight+hotel, cheap. |
| Eje Cafetero | Small volume in Spain, but live Ads showed conversions on `tour eje cafetero`. | Ready but landing/package alignment must be watched. | Keep small test. |
| Medellin/Guatape | Current US/ES terms attracted day-tour/local traffic. | Partial fit. | Avoid broad destination terms; use package/5-day exact only. |
| Santander/San Gil/Barichara | Very high discovery volume: `san gil colombia` Mexico 9,900/mo, Spain 6,600/mo, US 1,600/mo; `barichara colombia` US 5,400/mo. | Not ready: no package-led landing. | Build landing first; SEO first, Ads later. |
| Santa Marta/Tayrona | Product exists, but sampled paid demand was not strong enough to launch now. | Partial. | Reserve for SEO and future EN nature campaign. |
| Amazon | Commercial terms exist but very low volume in sampled markets. | Partial. | SEO/niche only. |
| Birding/Coffee EN | US has `colombia birding tours` 210/mo and `colombia coffee tour` 320/mo. | Needs specialist landing/product proof. | Good future niche, not immediate Ads. |

## Prioritized Experiments

### 1. MX Multidestino/Todo Incluido Optimization

- Campaign: `MX_Multidestino_y_Caribe_2026_05`
- Budget: keep current COP 85k/day until 72h clean CRM evidence, then +20-30%.
- Keywords:
  - exact/phrase `paquete de viaje a colombia`
  - exact/phrase `viaje organizado a colombia`
  - exact/phrase `viajes a colombia desde mexico`
  - exact only `viaje a colombia todo incluido`
- Landing: `/agencia-de-viajes-a-colombia-para-mexicanos`
- Pause gate: COP 120k spend on any term without qualified CRM lead or clean WhatsApp conversation.

### 2. ES Premium Multidestino + Eje Cafetero

- Campaign: `ES_Cartagena_Medellin_2026_05`
- Budget: COP 40k/day current; allow COP 50k/day only if CRM lead quality stays acceptable.
- Keywords:
  - exact/phrase `viajes organizados a colombia`
  - exact/phrase `viaje a colombia desde españa`
  - exact `agencia viajes colombia`
  - exact/phrase `tour eje cafetero`
- Landings:
  - `/agencia-de-viajes-a-colombia-para-espanoles`
  - `/eje-cafetero`
- Watch: agency terms can become local-agency noise; Eje can become Parque del Cafe/info traffic.

### 3. Chile Controlled Validation

- Campaign: `CL_Search_Colombia_SanAndres_2026_05`
- Budget: COP 30k/day, max COP 50k/day after a qualified lead.
- Keywords:
  - exact/phrase `paquetes a colombia desde chile`
  - exact/phrase `viaje a colombia desde chile`
  - exact `paquetes a san andres colombia`
  - phrase `san andres todo incluido`
- Landings:
  - `/viajes-a-colombia-desde-chile`
  - `/san-andres-4-dias`
- Gate: do not scale if search terms trend to `2x1`, flight+hotel, or cheap offers.

### 4. USA Exact Packages Micro-Test

- Campaign: `US_Florida_NY_Colombia_Packages_2026_05`
- Status: keep paused until user explicitly approves reactivation.
- Budget: COP 80k/day max.
- Keywords:
  - exact `colombia travel packages`
  - exact `colombia vacation packages`
  - exact `colombia tour packages`
  - exact `colombia luxury travel`
  - exact `colombia luxury tours`
- Landing: `/en/colombia-travel-packages`
- Gate: pause after COP 120k if no WAFlow submit/qualified WhatsApp; exclude `day trip`, `guatape day`, `jardin`, `cheap`, `flights`, `hotels`, `columbia`.

### 5. Argentina Prep, Not Activation

- Opportunity: `paquetes a colombia` 1,300/mo; `viaje a colombia desde argentina` 480/mo.
- Blocker: no Argentina-specific copy, likely budget/currency quality risk.
- Action: create `/viajes-a-colombia-desde-argentina` before Ads.

### 6. Santander/San Gil/Barichara Product Gap

- Opportunity: high discovery volume and low CPC.
- Blocker: intent is not yet package/commercial enough and no landing exists.
- Action: build a package-led page before paid traffic:
  - Suggested URL: `/santander-san-gil-barichara`
  - Copy angle: Colombia adventure + heritage route, private itinerary, not local day tour.
  - Initial channel: SEO/GSC and maybe exact paid after landing proves CTA engagement.

## Required Negatives

Keep and extend account-level negatives around:

- Flight-only: `vuelos`, `aerolineas`, `tiquetes`, `flight`, `airline`.
- Accommodation-only: `hotel`, `hostel`, `airbnb`, `booking`, `trivago`.
- Low-budget: `barato`, `gratis`, `2x1`, `ofertas`, `low cost`, `mochilero`.
- Off-topic: `empleo`, `trabajo`, `visa`, `pasaporte`, `requisitos`, `mapa`, `clima`.
- USA local tours: `day trip`, `guatape day`, `jardin day`, `walking tour`.
- Competitor/OTA: `despegar`, `exoticca`, `logitravel`, `kayak`, `skyscanner`, `baquianos`, `ole colombia opiniones`.

## Activation Gates

- Use exact/phrase only. No broad match in this phase.
- Every active landing must preserve `gclid/utm` and emit `whatsapp_cta_click` or `waflow_submit`.
- Any experiment pauses at COP 120k spend without qualified CRM lead, unless a human seller marks the conversation as promising.
- Scale only after:
  - clean `gclid` or UTM trace;
  - seller-confirmed useful conversation;
  - CPL CRM trending near COP 40k-60k, or premium ticket justifies higher CPL;
  - no search-term pollution.

## Next Implementation Steps

1. Refresh Supabase CRM/funnel readout when MCP is stable, especially `funnel_events`, `waflow_leads`, CRM request stage and confirmed itineraries by `gclid/reference_code`.
2. Import the CSV matrix into the Growth OS workboard or keep it as the campaign planning SSOT for this sprint.
3. Apply negatives discovered in the latest search-term readout if not already present:
   - `ole colombia opiniones`
   - `servitravel colombia`
   - `agencias medellin`
   - `agencia de viajes en cali colombia`
   - `day trip to jardin from medellin`
   - `tour guatape medellin`
   - `city tour medellin`
   - `baquianos travel`
   - `new blue cartagena de indias`
4. Create the Santander/San Gil/Barichara landing before any paid test on that cluster.
5. Keep USA paused until the EN landing is reviewed for premium/private positioning and exact-only campaign setup is approved.
