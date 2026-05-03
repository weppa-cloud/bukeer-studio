---
session_id: "2026-05-04-en-us-priority-hubs"
date: 2026-05-04
agent: "A4 SEO Content Lead"
scope: "priority-hubs"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 316
locale: en-US
market: US
last_updated: 2026-05-04
status_live_mcp_pull: PARTIAL
related_issues: [310, 315, 316, 317, 319, 320, 321, 337]
related_adrs: [019, 020, 021]
gating_dependencies:
  - "ADR-019 path-prefix EN routing fully migrated (#319/#320 close)"
  - "Legacy `en.colombiatours.travel` subdomain decommissioned or reciprocally hreflang-locked"
  - "TM bootstrap (#317) seeded with at least the 5 hub source-ES rows"
---

# EN-US Priority Hubs — Top 5 (W3, #316)

## URL pattern decision

Per [[ADR-019]] (multi-locale path-prefix routing) and confirmed via `lib/seo/locale-routing.ts`:
- **Default locale** is the site `default_locale` (currently `es-CO`) → no prefix.
- **EN-US** is served via path prefix `/en/<route>`, where the middleware strips `/en` before Next.js rewrite and sets `x-public-locale: en-US`.
- Category segments translate via `CATEGORY_CANONICAL_SEGMENT` (e.g. `/en/packages/X` rewrites to `/site/<sub>/paquetes/X`). Both Spanish and English segments are accepted.
- **Subdomain `en.colombiatours.travel` is legacy WordPress** — must be migrated/decommissioned (gated on #319/#320). Do NOT publish a hub on `/en/...` until the corresponding subdomain page is 301'd or hreflang-paired.

For the 5 hubs below: `URL slug` is the canonical `/en/...` path. If transcreation source page already exists in ES, the hub MUST emit reciprocal `<link rel="alternate" hreflang="..."/>` per [[ADR-020]].

---

## Hub selection rationale

Selected from the keyword universe (#315) using:
1. Highest priority score (Tier A, prio 5).
2. Cluster diversity — hit at least 4 of the 10 seed clusters in the first wave.
3. Existing TM source available (avoids cold-start translation cost).
4. Direct path to qualified-trip-request conversion (90D Objective 1).
5. Lowest KD-to-volume ratio for fastest visible win.

Final 5 (in publishing order):

| Rank | Hub | Cluster | Primary KW | Secondary KWs | Why first |
|---|---|---|---|---|---|
| 1 | **Cartagena destination hub** | C1 | `cartagena colombia travel` (DFS 1,000 KD 11) | #23, #30, #33, #51, #68 | Lowest KD top-10 win in universe (KD 11) + #1 US tourist entity in Colombia + ES TM exists |
| 2 | **Is Colombia Safe pillar** | C8 | `is colombia safe to travel` (DFS 4,400 KD 26) | #28, #29, #30, #31 | Highest-volume authority topic; gates US conversion psychology; backlink magnet |
| 3 | **Best Time to Visit Colombia** | C9 | `best time to visit colombia` (DFS 2,400 KD ~28) | #2, #32, #33, #34, #74-#76 | High-volume informational pillar; ES TM is mature (`/mejor-epoca-...`); month-by-month hub feeds AI Overview |
| 4 | **Colombia Tour Packages from US** | C10 | `colombia tour packages` (DFS 720 KD ~45) | #4, #12, #45-#49 | Primary commercial conversion surface; net-new asset; closes the Tier A funnel |
| 5 | **Coffee Triangle / Eje Cafetero hub** | C2 | `eje cafetero colombia` (DFS 1,600 KD ~25) | #11, #38, #39, #61, #70 | Region cluster; pairs with destination + commercial; ES TM exists |

---

## Hub 1 — Cartagena Destination Hub

| Field | Value |
|---|---|
| **URL slug** | `/en/destinations/cartagena` |
| **Category route** | Rewrites to `/site/colombiatours/destinos/cartagena` per ADR-019 amendment 2026-04-19 |
| **Cluster** | C1 — Caribbean coast |
| **Primary intent** | Informational + commercial |
| **Target keyword** | `cartagena colombia travel` (DFS 1,000 SV / KD 11) |
| **Secondary KWs** | #23 things to do in cartagena, #30 is cartagena safe, #33 best time to visit cartagena, #51 what to wear in cartagena, #68 rosario islands tour |
| **TM source** | `/destinos/cartagena/` (ES) — existing destination page; locale alternate via hreflang |
| **Hypothesis** | A transcreated 2,500-word hub combining editorial + commercial intent + Old City photo grid + Rosario day-trip CTA reaches top-10 for `cartagena colombia travel` in 30-45d due to KD=11. |
| **Baseline (2026-05-04)** | 0 EN-US sessions on path-prefix URL (page does not exist yet). Subdomain equivalent ranks ~22 with negligible CTR. |
| **90D forecast** | Top-10 by D45; 200-300 EN sessions/28d by D90; 8-12 qualified package-detail click-throughs/wk |
| **Eval window** | 21d (CTR/rank delta) → 45d (rank stabilization) |

### Transcreation deltas (US vs ES)

US travelers care about ES audience cares about
--- ---
Safety in Old City vs Bocagrande/Getsemaní (specific neighborhoods) Vuelos Bogota↔Cartagena horario y tarifa
Cruise-port arrival logistics (cruise terminal → Old City) Festividades nacionales y puentes
Heat + humidity ("how hot in July?") + dress code Mejor zona para hospedarse según presupuesto
Walled City history + Spanish colonial context Recomendaciones gastronómicas locales
Tipping culture (US default 15-20% — adjust to local 10%) Conexiones a islas y precios COP
English-spoken tour guides + cooking classes Restaurantes con menú del día
Rosario Islands day trip (vs full island stay) Eventos culturales locales

**Do NOT literal-translate:**
- ES "centro histórico" → "Old City" (US convention) NOT "historic center"
- ES "salsa" remains "salsa" but add genre note (champeta = local genre, US doesn't know)
- "Bocagrande" left untranslated — proper noun
- Currency anchors: NEVER show only COP — always pair with USD (e.g., "tour COP 180,000 / ~$45 USD")

### Page outline

```
H1: Cartagena Travel Guide — Old City, Beaches, Rosario Islands
   meta: "Plan your Cartagena trip with our 2026 guide: Old City walking routes, Rosario Islands day trips, where to stay (Bocagrande vs Getsemaní), and safety tips for US travelers."

[Hero] photo carousel (5 originals) — Old City clock tower, Rosario beach, Getsemaní street art, Castillo San Felipe, Café del Mar sunset

[Quick facts box]
   · Best time: Dec-Apr (dry, no hurricanes)
   · From US: ~5h direct from MIA/JFK; ~7h from LAX
   · Currency: COP (~4,000/USD); cards widely accepted
   · Safety level: very safe in tourist zones; State Dept Level 2 country
   · Language: Spanish; English in tourist areas

H2: When to Visit Cartagena → anchor for #33 best time
   - Month-by-month rainfall + temp table
   - High season (Dec-Apr) vs shoulder (May-Jun, Sep-Nov)
   - "Hurricane season" reality check (rare for Cartagena)

H2: Where to Stay → anchor for #23 things to do
   - Old City (Walled City) — colonial boutique hotels
   - Getsemaní — hip + budget-friendly
   - Bocagrande — high-rise beach resorts
   - Quick comparison table

H2: Top 10 Things to Do in Cartagena → anchor for #23
   1. Walking the Walled City (free, self-guided + map)
   2. Rosario Islands day trip (link to Hub Sub-page)
   3. Castillo de San Felipe de Barajas
   4. Cooking class with local chef
   5. Sunset at Café del Mar
   6. Mud Volcano (El Totumo)
   7. Getsemaní street art tour
   8. Salsa night at Café Havana
   9. Day trip to Playa Blanca (Baru)
   10. Palenque cultural tour

H2: Is Cartagena Safe? → anchor for #30 (linked to Hub 2 pillar)
   - Walled City: extremely safe day + night
   - Bocagrande: safe; touristy
   - Outside markets: daytime only, with guide
   - Common scams + how to avoid

H2: What to Wear in Cartagena → anchor for #51
   - Heat + humidity packing list
   - Old City stone streets — comfortable shoes
   - Cover-up for churches

H2: Getting to Cartagena from the US → anchor for trans intent
   - Direct flights (Avianca, Wingo, Latam from MIA/JFK; American from MIA)
   - CTG airport → city (taxi $15 USD; Uber unreliable)
   - No visa for US passport, ≤90 days

H2: Sample Cartagena Itineraries
   - 3 days (Old City + Rosario)
   - 5 days (+ Tayrona pairing)
   - 7 days (+ Mompox or Santa Marta)

H2: Cartagena Travel FAQ
   - 8-10 FAQs covering safety, water, ATMs, tipping, language, weather

[CTA block]
   - Browse Cartagena packages → /en/packages?destination=cartagena
   - Talk to a Bukeer planner → planner-form
```

### Internal-link targets (15-20)

- Hub 2 (`/en/is-colombia-safe`) from "Is Cartagena Safe?" section
- Hub 3 (`/en/best-time-to-visit-colombia`) from "When to Visit"
- Hub 4 (`/en/colombia-tour-packages`) from CTA block
- Hub 5 (`/en/destinations/coffee-triangle`) from "Sample Itineraries → 7 days"
- 4-6 package-detail pages: `/en/packages/cartagena-essential-4-days`, `/en/packages/cartagena-tayrona-7-days`, etc.
- Activity pages: `/en/activities/rosario-islands-tour`, `/en/activities/cooking-class-cartagena`
- Companion blog: `/en/blog/cartagena-vs-medellin`
- Authority blog: `/en/blog/colombia-currency-tips`

### Schema types

- `TouristDestination` (top-level)
- `BreadcrumbList`
- `FAQPage` (8-10 Q&A)
- `Article` with `dateModified` and `reviewedBy` Person (real Bukeer planner — Caro Hidalgo per audit doc)
- Speakable spec for hero summary

### Authority assets to embed

- 5+ original Bukeer-credit photos (Old City, Rosario, Getsemaní, Castillo, sunset).
- Original data table: 12-month avg temp + rainfall + USD price index for 4-star hotel (proprietary research).
- Embedded planner block ("Reviewed by Caro Hidalgo, Bukeer travel planner — last updated 2026-05-04").
- Linked PDF "Cartagena packing checklist" (downloadable lead-magnet).
- 1-2 customer testimonials with photo + Trustpilot/Google review snippet.

---

## Hub 2 — Is Colombia Safe (Authority Pillar)

| Field | Value |
|---|---|
| **URL slug** | `/en/is-colombia-safe` (no trailing /, no `for-tourists` — matches conversational query) |
| **Cluster** | C8 — Authority |
| **Primary intent** | Informational |
| **Target keyword** | `is colombia safe to travel` (DFS 4,400 SV / KD 26) |
| **Secondary KWs** | #28 how safe is colombia for tourists, #29 is medellin safe, #30 is cartagena safe, #31 is bogota safe, #54 is the water safe to drink |
| **TM source** | `/blog/es-seguro-viajar-a-colombia/` (verify exists in ES blog before transcreation; if not, commission ES first per ADR-021 — never invent source TM) |
| **Hypothesis** | A planner-reviewed 2,500-word safety pillar with neighborhood-level breakdowns (vs national-level) and original incident-rate data ranks top-3 below State Dept advisory in 60-90d, capturing 400+ EN sessions/28d. |
| **Baseline (2026-05-04)** | 0 EN sessions on `/en/...`; subdomain has no equivalent; State Dept dominates SERP. |
| **90D forecast** | Top-5 by D60; 300-500 EN sessions/28d by D90; safety pillar = entry point for ~30% of all EN traffic (US conversion psychology gateway) |
| **Eval window** | 30d (initial rank) → 60d (top-5 stabilization) |

### Transcreation deltas (US vs ES)

US travelers care about ES audience NOT typical
--- ---
"Is it safer than Mexico?" comparison (US default mental model) Comparativa con países latinos vecinos
State Dept Travel Advisory level (currently 2 / "Exercise increased caution") Concepto no aplicable
Specific cities + specific neighborhoods (El Poblado vs Comuna 13) Ciudades a nivel general
Tap-water reality (Bogota/Medellin yes; coast bottled) En general "no se toma agua del grifo"
Petty crime patterns (cell-phone snatching, scopolamine) En grandes urbes ya conocido
"No dar papaya" cultural concept — translate + explain Concepto interno conocido
US passport visa-free 90d Visa según pasaporte
Travel insurance recommendations (Allianz, World Nomads, Faye) Generalmente menos énfasis

**Do NOT literal-translate:** ES "no dar papaya" → US: phrase + parenthetical explanation ("don't make yourself a target — flashy electronics, lone wandering at night"). Avoid the literal "don't give papaya."

### Page outline

```
H1: Is Colombia Safe to Travel? A Planner's Honest 2026 Assessment
   meta: "Is Colombia safe in 2026? Yes — for most US travelers in tourist zones. We break down State Dept advisories, neighborhood-level safety in Bogota, Medellin, Cartagena, and what 'no dar papaya' really means."

[Trust signal block]
   · Reviewed by [Bukeer planner name + photo + planner ID]
   · Last updated: 2026-05-04
   · Cited sources: U.S. Dept of State (link), Migración Colombia (link), Bukeer trip data (X trips, Y travelers, Z incidents)

H2: The Short Answer
   - Yes, Colombia is safe for most US travelers in tourist zones.
   - State Dept Level 2 (same as France, UK, Italy).
   - 100% of 1,200+ Bukeer US travelers in past 24 months returned safely.

H2: State Department Travel Advisory — Plain English
   - Quote from advisory + link
   - Which regions are Level 4 (do not travel) — and why no tourist needs them anyway

H2: City-by-City Safety
   H3: Is Medellin Safe? → anchor for #29
       - El Poblado, Laureles, Envigado: very safe
       - Comuna 13: daytime + tour only
       - Centro: daytime, no flashy items
   H3: Is Cartagena Safe? → anchor for #30
       - Walled City + Bocagrande: very safe
       - Outside markets daytime only
   H3: Is Bogota Safe? → anchor for #31
       - Chapinero, Usaquén, Zona G, Candelaria daytime: safe
       - La Candelaria at night: avoid
       - Periphery: don't venture
   H3: Coastal towns (Santa Marta, Tayrona, San Andres)
   H3: Coffee Region (Salento, Manizales, Armenia)

H2: Common Scams + How to Avoid
   - Cell-phone snatching from outdoor cafes
   - Scopolamine ("burundanga") — never accept drinks/food from strangers
   - Fake taxi (use Uber/Cabify in Bogota; in Cartagena use hotel-arranged)
   - ATM skimmers — use airport/bank ATMs only

H2: "No Dar Papaya" — The Cultural Rule
   - Direct translation
   - What it means in practice: don't display valuables, don't wander alone at night, don't carry passport (carry photocopy)

H2: Is the Water Safe to Drink? → anchor for #54
   - Bogota + Medellin: yes (treated municipal)
   - Caribbean coast + smaller towns: bottled
   - Restaurants: ice from purified is fine

H2: Health + Vaccinations
   - No mandatory; CDC recommends Hep A, Typhoid, Yellow Fever (if Amazon/Pacific)
   - Mosquito-borne risk (low in cities; bring DEET for jungle)
   - Altitude in Bogota (8,660 ft / 2,640 m)

H2: Travel Insurance for Colombia
   - Recommended providers (Allianz, World Nomads, Faye)
   - Specifically check: medical evac, adventure-sport coverage if Lost City trek

H2: Solo Female Travel in Colombia → anchor for #64
   - Cities very welcoming
   - Group tours for off-the-beaten path
   - Curated solo-traveler resources

H2: LGBT+ Travel Safety → anchor for #63
   - Bogota, Medellin, Cartagena very LGBT-friendly
   - Smaller towns more conservative; PDA discretion

H2: Safety FAQ
   - 10 FAQs schema-marked

[CTA block]
   - Talk to a planner about your specific itinerary safety →
   - Browse safety-vetted Colombia packages → /en/colombia-tour-packages
```

### Internal-link targets (20+)

- Hub 1 Cartagena → "Is Cartagena Safe?"
- Hub 5 Coffee Triangle → "Coffee Region"
- Hub 4 Packages → CTA
- Each city safety H3 links to that city's destination hub
- Insurance providers: external (mark `rel="sponsored"` only if affiliate)
- State Dept: external `rel="external"` (no nofollow — authoritative citation)
- Trip-cost guide (`/en/colombia-trip-cost`)
- Visa FAQ (`/en/colombia-visa-for-us-citizens`)

### Schema types

- `Article` with `reviewedBy` Person (planner) — critical for E-E-A-T
- `FAQPage` (10 Q&A)
- `BreadcrumbList`
- `Speakable` for short answer

### Authority assets

- **Original data:** Bukeer trip-incident-rate (e.g., "1,200 US travelers, 24 months, 0 serious incidents") — backlink magnet.
- Planner photo + bio + LinkedIn link (real human, real credentials).
- Embedded interactive map: city-level safety overlay.
- Citations: State Dept (current advisory link), CDC vaccine page, Migración Colombia visa page.
- Quotes from 2-3 customer Trustpilot reviews mentioning safety.

---

## Hub 3 — Best Time to Visit Colombia

| Field | Value |
|---|---|
| **URL slug** | `/en/best-time-to-visit-colombia` |
| **Cluster** | C9 — Authority weather/timing |
| **Primary intent** | Informational |
| **Target keyword** | `best time to visit colombia` (DFS 2,400 SV / KD ~28) |
| **Secondary KWs** | #2 best time, #32 colombia weather by month, #33 cartagena best time, #34 medellin best time, #74-#76 monthly variants |
| **TM source** | `/mejor-epoca-para-viajar-a-colombia-mes-a-mes/` (ES, exists per audit) |
| **Hypothesis** | A pillar with interactive month × region table + AI-Overview-friendly structured Q&A reaches top-5 in 45-60d, capturing 250-400 EN sessions/28d and triggering AI Overview citations. |
| **Baseline (2026-05-04)** | 0 EN sessions on path; ES version has 78 sessions/28d (validates topic demand). |
| **90D forecast** | Top-5 by D45; 200-350 EN sessions/28d by D90 |
| **Eval window** | 21d (rank first move) → 45d (stabilization) |

### Transcreation deltas

US travelers care about ES audience cares about
--- ---
Hurricane season (Aug-Nov, Caribbean) Temporada lluviosa Andina (Abr-May, Oct-Nov)
US holiday alignment (Memorial Day, July 4, Labor Day, Thanksgiving) Puentes festivos colombianos
"Shoulder season" pricing concept Comparación con baja/alta temporada
Whale season Pacific (Jun-Oct) Avistamiento ballenas (mismo)
Spring break + summer vacation windows N/A — vacaciones son Dic-Ene
Festivals as travel triggers (Carnaval Barranquilla, Feria Cali) Festivales como evento social, no necesariamente travel-trigger

### Page outline

```
H1: Best Time to Visit Colombia — Month-by-Month Guide (2026)
   meta: "When is the best time to visit Colombia? December–April for dry weather across most regions, but here's the full month-by-month breakdown by destination."

[TL;DR box]
   · Best overall: Dec–Apr (dry season nationwide)
   · Best for shoulder pricing: May, Sep
   · Best for Pacific whales: Jul–Oct
   · Avoid: Holy Week (high prices, locals travel), late-Dec holidays (premium pricing)

H2: Colombia's Climate in One Paragraph
   - Equatorial → no traditional 4 seasons
   - Two rainy + two dry windows annually
   - Altitude defines temperature, not month

H2: Month-by-Month Quick Verdict
   - Interactive table: rows = Jan-Dec, columns = 5 regions (Andes, Caribbean, Pacific, Amazon, Llanos)
   - Each cell: temp range / rainfall / "go or no-go" emoji-free symbol

H2: Best Time by Destination
   H3: Cartagena → anchor for #33
       - Dec-Apr ideal; May-Jun shoulder; Aug-Nov rare hurricane
   H3: Medellin → anchor for #34
       - Year-round ("City of Eternal Spring")
   H3: Bogota
       - Dry Dec-Mar, Jun-Aug
   H3: Coffee Triangle (Salento, Manizales)
       - Dec-Mar, Jul-Aug
   H3: Tayrona + Santa Marta
       - Same window as Cartagena; closed Feb (indigenous restoration)
   H3: San Andres
       - Year-round; avoid Sep-Oct (rain)
   H3: Pacific (Nuqui, Bahia Solano)
       - Whale season Jun-Oct = the reason to go
   H3: Amazon (Leticia)
       - High water Apr-May (canoe access); low water Aug-Sep (beaches + hiking)

H2: Colombia by Month — Detailed → anchors for #74-#76 + others
   H3: Colombia in January → child anchor
   H3: Colombia in February
   ... [12 sub-sections]

H2: Festivals + Events Worth Timing Around
   - Carnaval de Barranquilla (Feb/Mar)
   - Feria de las Flores Medellin (Aug)
   - Feria de Cali (Dec 25-30)
   - Hay Festival Cartagena (Jan)

H2: Best Time to Avoid Crowds + High Prices
   - Avoid: Holy Week (Semana Santa), Dec 20-Jan 15
   - Best value: May, Sep, early Nov

H2: Best Time FAQ
   - 8-10 FAQs schema-marked
```

### Internal-link targets

- Each destination H3 → that destination's hub
- Hub 4 packages → CTA
- Trip-cost guide (#45)
- Festival blog posts (each festival)
- "When to book" companion guide

### Schema

- `Article` + `reviewedBy`
- `FAQPage`
- `Table` markup for month × region
- `BreadcrumbList`

### Authority assets

- Original interactive table (12 months × 5 regions) — bespoke data viz.
- Climate data sourced from IDEAM (Colombian meteorological institute) — cite source.
- 12 hero photos, 1 per month showing a representative destination/event.
- Planner-reviewed badge.

---

## Hub 4 — Colombia Tour Packages from US

| Field | Value |
|---|---|
| **URL slug** | `/en/colombia-tour-packages` |
| **Cluster** | C10 — Commercial |
| **Primary intent** | Transactional |
| **Target keyword** | `colombia tour packages` (DFS 720 SV / KD ~45) |
| **Secondary KWs** | #4 colombia tours from us, #12 colombia vacation packages, #45 colombia trip cost, #47-#49 X-day itineraries, #88 colombia tour operator |
| **TM source** | `/paquetes` (ES list) + `/los-mejores-paquetes-de-viajes-a-colombia/` (ES blog round-up) |
| **Hypothesis** | A package matrix landing with USD pricing, departure-from-US framing, and 8-12 visible packages converts at 2-3% (planner contact form) and reaches top-15 by D60 / top-10 by D90. |
| **Baseline (2026-05-04)** | 0 EN sessions on path; ES sister `/los-mejores-paquetes-...` ranks pos 29.7 with 1.75% CTR. |
| **90D forecast** | 150-250 EN sessions/28d by D90; 4-8 qualified leads/wk; top-15 by D60 |
| **Eval window** | 30d (top-30) → 60d (top-15) → 90d (top-10 stretch) |

### Transcreation deltas

US travelers care about ES audience cares about
--- ---
USD pricing (NEVER COP-only) Pesos colombianos / pesos mexicanos
Departure city pricing (ex-MIA, ex-JFK, ex-LAX) Salida desde Bogotá / Ciudad de México
"All-inclusive" definition (US: meals + drinks + tours; Colombia: NOT typical resort all-incl) Todo incluido = paquete cerrado
Trip protection / insurance call-out Seguro de viaje (mismo)
English-speaking guides as default Guías en español (default)
Visa-free for US passport (≤90d) Requisitos según pasaporte
TSA + customs return logistics N/A
Booking confidence: cancellation policy + travel insurance link Reembolso + cláusulas legales

### Page outline

```
H1: Colombia Tour Packages from the US — 2026 Custom + All-Inclusive Trips
   meta: "Browse Colombia tour packages from $1,500 USD. 7-, 10-, 14-day itineraries: Cartagena, Medellin, Coffee Triangle. English-speaking guides, USD pricing, US-friendly support. Talk to a planner."

[Hero CTA bar]
   · "Find your trip" filter: days (7/10/14), interest (beach/culture/coffee/adventure), budget ($, $$, $$$)
   · Departure month picker
   · "Talk to a planner" button

[Trust strip]
   · 1,200+ US travelers since 2023
   · 4.9★ Trustpilot (XXX reviews)
   · IATA-licensed operator
   · USD pricing + no hidden fees

H2: Featured Colombia Tour Packages
   - 8-12 package cards, each with:
     · Photo
     · Name + duration
     · Cities + map
     · Price from $X USD/person
     · "What's included / not included" tooltip
     · "View itinerary" CTA → /en/packages/<slug>

H2: Packages by Length
   H3: 7-Day Colombia Tours → anchor for #47
   H3: 10-Day Colombia Tours → anchor for #48
   H3: 14-Day Colombia Grand Tours → anchor for #49

H2: Packages by Style
   H3: All-Inclusive (with our definition disclaimer)
   H3: Luxury (link to /en/luxury-colombia-tours)
   H3: Family (link to /en/family-vacation-colombia)
   H3: Adventure (link to /en/colombia-adventure-tours)
   H3: Honeymoon (link to /en/colombia-honeymoon-packages)

H2: How Much Does a Colombia Trip Cost? → anchor for #45
   - 7d budget: $1,500-2,500 / mid: $2,500-4,500 / luxury: $5,000+
   - Breakdown: international flight + in-country flight + hotel + tours + meals
   - Currency tips (USD vs COP)
   - Link to deep-dive cost guide

H2: What's Included in a Bukeer Package
   - In-country flights, transfers, hotels, breakfasts, guided tours, English guides, 24/7 support
   - NOT included: international flights, travel insurance, lunches/dinners (most), tips

H2: Why Travel Colombia with Bukeer
   - Local Colombian operator (vs US reseller markup)
   - English-speaking planners + on-trip support
   - 1,200+ US travelers, 4.9★
   - Custom itineraries (not just fixed groups)

H2: Booking + Trip Protection
   - Cancellation policy summary
   - Travel insurance recommendations (linked to Hub 2 insurance section)
   - Payment options (USD wire, credit card, bank-to-bank)

H2: FAQ — US Travelers
   - 10 FAQs: visa, vaccinations, language, currency, safety, English guides, etc.

[Final CTA]
   - "Get a custom itinerary" planner-form
   - "Browse all packages" → package list page
```

### Internal-link targets (25+)

- Every package card → `/en/packages/<slug>`
- All other 4 hubs (Cartagena, Safety, Best-time, Coffee)
- Trip cost guide (#45)
- Each style sub-landing (luxury/family/adventure/honeymoon)
- Visa FAQ
- Insurance recommendation (Hub 2)
- Trustpilot external link

### Schema

- `ItemList` + `Product` for each package card
- `Offer` with `priceCurrency: USD`
- `BreadcrumbList`
- `FAQPage`
- `Organization` (TravelAgency)

### Authority assets

- Real package photos (Bukeer-credit, NO stock).
- Trustpilot widget (real reviews).
- IATA license number visible in trust strip.
- Planner photos + names in "Talk to a planner" block.
- Map showing all destinations covered.
- 2-3 video testimonials from US customers (lift CR).

---

## Hub 5 — Coffee Triangle (Eje Cafetero) Destination Hub

| Field | Value |
|---|---|
| **URL slug** | `/en/destinations/coffee-triangle` |
| **Cluster** | C2 — Andean cities + coffee |
| **Primary intent** | Informational + commercial |
| **Target keyword** | `eje cafetero colombia` (DFS 1,600 SV / KD ~25) + `coffee triangle colombia` (estimated ~880 SV) |
| **Secondary KWs** | #11, #38 salento, #39 valle de cocora (DFS 2,900), #61 coffee farm tour, #70 medellin day trips |
| **TM source** | `/destinos/eje-cafetero/` (ES, verify exists) — if not, treat as net-new with ES audit input |
| **Hypothesis** | A region hub combining "Coffee Triangle" (US name) + "Eje Cafetero" (proper noun) + child anchors for Salento, Cocora, Manizales, Pereira, Armenia ranks top-15 in 45d, top-10 by D90. |
| **Baseline (2026-05-04)** | 0 EN sessions on path; subdomain ranks ~40 for ES variant; #39 Cocora has 2,900 SV with subdom~58. |
| **90D forecast** | 200-300 EN sessions/28d by D90; top-10 for `eje cafetero colombia` and `valle de cocora` |
| **Eval window** | 21d → 45d → 90d |

### Transcreation deltas

US travelers care about ES audience cares about
--- ---
"Coffee Triangle" naming convention (TikTok-driven) "Eje Cafetero" / "Triángulo del Café"
Coffee farm STAY (overnight at hacienda) Visita guiada de día
Wax palm height + endemic species detail Belleza paisajística general
Day-trip-from-Medellin framing (#70) Alternativas de transporte intermunicipal
"Salento vibes" — TikTok-popularized boutique town Salento como destino tradicional
Specialty coffee + cupping experiences Café como producto, no experiencia

### Page outline

```
H1: Colombia's Coffee Triangle — Eje Cafetero Travel Guide
   meta: "Visit Colombia's Coffee Triangle: hike Cocora Valley wax palms, stay on a working coffee farm, explore Salento. 4-day itinerary, how to get from Medellin or Bogota."

[Quick facts]
   · Region: Departments of Caldas, Quindío, Risaralda
   · Best base: Salento (boutique) or Filandia (quieter)
   · Closest airports: Pereira (PEI), Armenia (AXM), Manizales (MZL)
   · From Medellin: 1h flight or 6h drive; from Bogota: 45min flight
   · UNESCO World Heritage: Coffee Cultural Landscape (since 2011)

H2: Where Is the Coffee Triangle?
   - Map embed
   - 3 main cities: Manizales, Pereira, Armenia
   - 3 boutique towns: Salento, Filandia, Salamina

H2: Top Things to Do
   1. Hike Cocora Valley wax palms (#39 anchor)
   2. Stay overnight on a working coffee finca
   3. Salento walking tour + Tejo game
   4. Coffee tour with cupping experience (#61 anchor)
   5. Termales de Santa Rosa (hot springs)
   6. Los Nevados National Park (high-altitude hike)
   7. Quindío Botanical Garden

H2: Salento — The Coffee Triangle's Most Beloved Town → anchor for #38
   - Colorful streets, balconies, Calle Real
   - Departure point for Cocora Valley
   - Where to stay (boutique haciendas)

H2: Valle de Cocora + Wax Palms → anchor for #39
   - The hike (5-6h loop, moderate)
   - When to go (early AM mist photo)
   - How to get there from Salento (6 AM jeep)

H2: Best Coffee Farm Tours → anchor for #61
   - Hacienda San Alberto (premium, single-origin)
   - Hacienda Venecia (working farm, overnight stay)
   - El Ocaso (rustic, near Salento)

H2: Where to Stay
   - Salento boutique
   - Hacienda farm-stays
   - Pereira business hotels (less recommended for tourists)

H2: How to Get to the Coffee Triangle
   - From Medellin (#70 anchor): 1h flight (Avianca, Latam) or 6h scenic drive
   - From Bogota: 45min flight or 8h drive
   - From Cartagena: connect via Bogota or Medellin

H2: Best Time to Visit
   - Dec-Mar, Jul-Aug for dry weather
   - Avoid Apr-May rains for hiking

H2: Sample 4-Day Coffee Triangle Itinerary

H2: Coffee Triangle FAQ
```

### Internal-link targets (15+)

- Hub 1 Cartagena → "From Cartagena" connection
- Hub 2 Safety → general safety
- Hub 3 Best-time → "Best Time" section
- Hub 4 Packages → CTA
- Medellin destination hub → #70 anchor
- Cocora detail page (if standalone)
- Salento detail page (if standalone)
- Coffee farm activity pages (#61 children)
- Los Nevados activity page

### Schema

- `TouristDestination` (region-level)
- `BreadcrumbList`
- `FAQPage`
- `Article` + `reviewedBy`
- `Place` for Salento, Cocora, Manizales sub-sections

### Authority assets

- Original photos: wax palms, Salento street, hacienda, coffee farmer.
- Original infographic: bean-to-cup process at a Colombian farm.
- Customer testimonial focused on coffee-farm-stay experience.
- UNESCO listing reference + link.
- Planner-reviewed badge.

---

## Provenance + uncertainty

- All 5 hubs anchor on keywords from Tier A of #315 keyword universe.
- Volumes for #1, #2, #4 head terms (`is colombia safe to travel`, `best time to visit colombia`, `colombia tour packages`) and #7 `cartagena colombia travel`, #10 `eje cafetero colombia`, #39 `valle de cocora` are from DataForSEO 2026-04-25 — verified.
- KD values for hubs 2-4 are estimates; need refresh before final brief commit.
- Forecast ranges are derived from cluster-peer benchmarks (Bukeer historical ES blog ranking velocity). Not promises — eval at D21/D45/D90.
- Every hub assumes ES TM source exists OR ES authoring is ordered first per ADR-021. Three of five (Cartagena, Best-time, Eje Cafetero) have ES sources confirmed via prior audit; "Is Colombia Safe" pillar requires ES source verification before transcreation kickoff.

---

## Open questions for upstream agents

- **A1 (analytics):** Set up GSC + GA4 segmentation by `/en/...` path before publish so D21 eval is honest (zero baseline confirmable).
- **A3 (link acquisition / #321):** Hubs 2 (safety with original incident data) and 5 (coffee triangle UNESCO + original infographic) are the natural backlink-bait artifacts. Coordinate outreach pitch.
- **A5 (web-eng / #319-#320):** Confirm subdomain → path migration timeline. Without it, hubs publish into a fragmented authority pool.
- **A2 (TM/glossary / #317):** Bootstrap glossary for: "Coffee Triangle", "Old City", "no dar papaya", "City of Eternal Spring", USD-paired pricing format. Lock terms before transcreation drafting.

---

## Wikilinks

[[ADR-019]] [[ADR-020]] [[ADR-021]] [[SPEC #337]] [[Issue #310]] [[Issue #315]] [[Issue #316]] [[Issue #317]] [[Issue #319]] [[Issue #320]] [[Issue #321]]

Related:
- `docs/growth-sessions/2026-05-04-en-us-keyword-universe.md` — keyword source
- `docs/growth-sessions/2026-05-04-en-us-execution-plan.md` — phased rollout
- `docs/growth-sessions/2026-04-27-seo-audit-top100.md` — baseline audit
