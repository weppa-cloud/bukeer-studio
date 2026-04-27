---
session_id: "2026-05-04-en-us-keyword-universe"
date: 2026-05-04
agent: "A4 SEO Content Lead"
scope: "keyword-universe"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 315
locale: en-US
market: US
last_updated: 2026-05-04
status_live_mcp_pull: PARTIAL
data_sources:
  - "DataForSEO MCP snapshot 2026-04-25 (EN/US keyword overview, SERP competitors, ranked-keywords gap) — see docs/growth-sessions/2026-04-25-1027-colombiatours-growth-dataforseo-batch.md"
  - "GSC mcp__search_console snapshot 2026-04-24 (28d, sc-domain:colombiatours.travel) — EN subdomain queries"
  - "GA4 property 294486074 snapshot 2026-04-24 (28d) — EN landing-page sessions"
  - "Last verified ColombiaTours EN crawl 2026-04-24 (production) for current ranking baseline"
  - "Estimated US-market inference for rows missing live MCP confirmation (flagged per row)"
related_issues: [310, 312, 315, 316, 317, 319, 320, 321, 337]
related_adrs: [019, 020, 021]
---

# EN-US Keyword Universe — ColombiaTours (W3, #315)

## 0. Source provenance summary

| Source | Rows | How to refresh |
|---|---:|---|
| DataForSEO live (2026-04-25 snapshot) | 22 | `mcp__dataforseo__keywords_for_keywords` + `mcp__dataforseo__serp_organic_live_advanced` (US, en) — re-pull before Friday review |
| GSC live (2026-04-24 snapshot, EN subdomain) | 14 | `mcp__search_console__searchanalytics.query` filtering `https://en.colombiatours.travel/*` |
| `estimated_us_market_inference` | 47 | Need live DataForSEO pull next session — volumes are bracketed estimates from peer-keyword extrapolation, not authoritative |
| Competitor extrapolation (`gate1travel`, `exoticca`, `goway`, `landedtravel`) | 5 | DataForSEO `mcp__dataforseo__competitors_domain_live` for each |
| **Total keywords scaffolded** | **88** | |

**Honesty note:** Bracketed `[~xxx]` volumes in the table are estimates inferred from cluster peers and US travel-search patterns — they exist so the prioritization is operable today, not because the live SERP API was queried for that exact term. Every estimate is flagged in the `Source` column. Live MCP re-pull required before any of these are committed to a content brief.

---

## 1. Objective

Grow ColombiaTours organic EN-US sessions from **0 → 1,500 / 28d** within 12 months (90D milestone: 0 → 250) and reach **20+ top-10 US-market keywords** (90D milestone: 5+). Programme also feeds 90D Objective 2 by giving the link-acquisition workstream (#321) a defensible content surface to pitch publishers and tour-aggregator partners.

Underlying assumption: legacy `en.colombiatours.travel` subdomain content is **cannibalizing** authority (see audit P0 #5). The plan migrates EN traffic to path-prefix routing (`/en/...`) per [[ADR-019]], and uses TM + transcreation per [[ADR-021]] to avoid literal MT.

---

## 2. Seed clusters (10)

Each cluster maps to a content lane with a defined intent profile and a US-traveler psychographic. The cluster ID is referenced in the keyword table.

| Cluster ID | Cluster | Primary intent | US-traveler driver | Target template |
|---|---|---|---|---|
| C1 | **Destinations — Caribbean coast (Cartagena + Tayrona + Santa Marta + San Andres)** | Informational + commercial | "Beach + colonial culture, Spanish OK" | destination hub + multi-day package |
| C2 | **Destinations — Andean cities (Bogota + Medellin + Eje Cafetero / Coffee Triangle)** | Informational + commercial | "Urban + culture + coffee experience" | destination hub + city-pair package |
| C3 | **Destinations — Pacific + Amazon (Nuqui, Bahia Solano, Leticia)** | Informational | "Off-the-beaten-path eco" | long-form guide + niche package |
| C4 | **Trip types — Luxury / Honeymoon** | Commercial | "Private guides, boutique stays, no risk" | luxury package landing + curated itineraries |
| C5 | **Trip types — Adventure / Active** | Commercial | "Trekking Lost City, paragliding, diving" | adventure package + outfitter cred |
| C6 | **Trip types — Family + Multi-gen** | Commercial | "Safe, English-speaking, kid-friendly" | family package + safety FAQ |
| C7 | **Trip types — Eco / Wildlife / Birding** | Informational + commercial | "Top-3 birding country, sustainable" | eco package + species guide |
| C8 | **Authority — Safety + practical (visa, currency, water, scams)** | Informational | "Is it safe? Do I need shots? Tap water?" | trust hub + planner-reviewed FAQ |
| C9 | **Authority — Best time to visit + climate** | Informational | "When to go without rain or crowds" | month-by-month planner + interactive table |
| C10 | **Commercial — Tours / Packages / Itineraries from US** | Transactional | "All-inclusive from US, 7-14 days" | package matrix + cost calculator |

---

## 3. Keyword table (88 keywords)

Columns:
- **kw** — keyword (EN, US market).
- **cluster** — see seed cluster IDs.
- **intent** — `info`, `nav`, `comm`, `trans`.
- **vol** — monthly US search volume. `[~N]` = estimate, `N` = DataForSEO 2026-04-25 verified.
- **kd** — difficulty 0-100 (DFS scale). `[~N]` = estimate.
- **prio** — priority score (1-5, see scoring rubric below).
- **rank** — current ColombiaTours US rank as of 2026-04-25. `nr` = not ranked top 100. `subdom` = ranks via `en.colombiatours.travel` (cannibalization risk).
- **action** — `create | update | merge | prune | transcreate`.
- **template** — `dest-hub | pkg-detail | guide | landing | blog | faq | matrix`.
- **tm-source** — existing ES page (relative path) if applicable.
- **note** — transcreation/cultural delta or top blocker.
- **src** — `dfs` (DataForSEO live), `gsc` (GSC live), `est` (estimated_us_market_inference), `comp` (competitor extrapolation).

### Scoring rubric

`prio = (intent_weight × volume_band × strike_distance) / kd_band`
- intent_weight: trans=4, comm=3, info=2, nav=1
- volume_band: ≥2k=3, 500-2k=2, <500=1
- strike_distance: rank 11-30 = 3, rank 31-100 = 2, nr = 1, rank 1-10 = 0 (already won)
- kd_band: ≤25=1, 26-50=2, 51-75=3, ≥76=4
- score capped at 5.

### Tier A — High priority (prio 4-5)

| # | kw | cluster | intent | vol | kd | prio | rank | action | template | tm-source | note | src |
|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|
| 1 | is colombia safe to travel | C8 | info | 4400 | 26 | 5 | nr | create | guide | `/blog/es-seguro-viajar-a-colombia-2026` (if exists; else commission ES first) | US safety bar = State Dept Travel Advisory (currently L2). Frame around neighborhoods, not country. Cite official source. | dfs |
| 2 | best time to visit colombia | C9 | info | 2400 | [~28] | 5 | nr | create | guide | `/mejor-epoca-para-viajar-a-colombia-mes-a-mes/` | US travelers care about hurricane season Caribbean (Aug-Nov). ES version emphasizes Andean rainy season. Add 12-mo table + climate map. | dfs |
| 3 | colombia tour packages | C10 | comm | 720 | [~45] | 5 | subdom~32 | create | matrix | `/paquetes` (ES list) + `/los-mejores-paquetes-de-viajes-a-colombia/` | Pricing in USD, departure ex-MIA/JFK/LAX, English-speaking guides as default. Include "trip protection / cancellation" block (US-mandatory mental model). | dfs |
| 4 | colombia tours from us | C10 | trans | [~210] | [~38] | 5 | nr | create | landing | none (new) | Net-new commercial landing — explicit "from US" signals departure-city pricing, English support, ESTA/visa not required for US passport. | est |
| 5 | colombia itinerary | C10 | info+comm | 480 | [~32] | 5 | subdom~58 | create | guide | `/arma-tu-plan-colombia/` | Transcreate planner format. Add 7-day, 10-day, 14-day variants. ES focuses on "armar plan", US wants pre-built itineraries with day-by-day. | dfs |
| 6 | medellin colombia tours | C2 | comm | 880 | [~58] | 4 | subdom~47 | create | dest-hub | `/destinos/medellin/` (if exists) | US travelers know Pablo Escobar narrative — address head-on (Comuna 13 transformation), don't dodge. Pair with safety. | dfs |
| 7 | cartagena colombia travel | C1 | info | 1000 | 11 | 5 | subdom~22 | transcreate | dest-hub | `/destinos/cartagena/` | Lowest KD in cluster — easiest top-10 win. US travelers expect "Old City + Rosario Islands" pairing. Cruise-port mention. | dfs |
| 8 | guatape antioquia | C2 | info+comm | 22200 | [~22] | 5 | subdom~55 | transcreate | dest-hub + day-trip | `/guatape-antioquia-colombia/` | US searchers often spell it "Guatapé" with accent. Day-trip-from-Medellin angle. El Peñol climb is the visual hook. | dfs |
| 9 | san andres island | C1 | info | 22200 | [~30] | 5 | subdom~65 | transcreate | dest-hub | `/destinos/san-andres/` | US searchers think "Caribbean diving + cheap escape" — emphasize 7-color sea + duty-free. Note flights via Bogota/Medellin. | dfs |
| 10 | eje cafetero colombia | C2 | comm | 1600 | [~25] | 5 | subdom~40 | transcreate | dest-hub | `/destinos/eje-cafetero/` (if exists) | US searchers also use "coffee triangle colombia" + "salento colombia". Need both surfaces. Coffee-farm-stay angle is unique vs ES "haciendas cafeteras". | dfs |
| 11 | coffee triangle colombia | C2 | info+comm | [~880] | [~30] | 5 | nr | create | dest-hub | merge with C2 eje-cafetero hub | Sister-keyword to #10 — same hub, secondary H1 / FAQ section. | est |
| 12 | colombia vacation packages | C10 | trans | [~590] | [~42] | 5 | nr | create | matrix | merge with #3 matrix | "Vacation" is US English (vs UK "holiday"). H1 alt-form + meta. | est |
| 13 | best places to visit in colombia | C1+C2 | info | [~1900] | [~30] | 5 | subdom~75 (`tourist places of colombia`) | create | guide | `/los-10-mejores-lugares-turisticos-de-colombia/` | US listicle convention: 10 places with photo-first. Embed map. Add "Reviewed by Bukeer planner — Apr 2026". | est+dfs |
| 14 | tayrona national park | C1 | info | [~1200] | [~25] | 4 | subdom~45 | transcreate | dest-hub | `/destinos/tayrona/` | US travelers want concrete logistics: shuttle from Santa Marta, entrance fee, hiking time. Health: bring cash COP, no ATM. | est |
| 15 | lost city trek colombia | C5 | comm | [~880] | [~30] | 4 | nr | create | pkg-detail | new | "Ciudad Perdida" — US searchers use English. 4-5d trek with operator. Mandatory guide is positive credential, not friction. | est |
| 16 | luxury colombia tours | C4 | trans | [~390] | [~38] | 4 | nr | create | landing | none | US luxury bar = Belmond Cartagena, Casa Pestagua, private guides. Lead with $5k+ per person framing — qualifies traffic. | est |
| 17 | family vacation colombia | C6 | comm | [~320] | [~32] | 4 | nr | create | landing | none | US family travel anxiety = food safety + medical access. Frame: bottled water default, hospitals in Cartagena/Medellin. | est |
| 18 | colombia honeymoon packages | C4 | trans | [~210] | [~28] | 4 | nr | create | landing | none | Cartagena + Tayrona + Eje Cafetero is the honeymoon triangle. Pair with private cooking class + sailboat day. | est |
| 19 | colombia birding tours | C7 | comm | [~210] | [~22] | 4 | nr | create | landing | none | Colombia = #1 country by bird species (1,966). Audubon-quality cred. Endemic-rich routes: Cauca Valley + Santa Marta. | est |
| 20 | colombia adventure tours | C5 | comm | [~390] | [~40] | 4 | subdom~62 | create | landing | none | Pair Lost City + paragliding Medellin + diving San Andres + rafting San Gil. Use "operator-led, fully insured" trust marker. | est |

### Tier B — Medium priority (prio 3)

| # | kw | cluster | intent | vol | kd | prio | rank | action | template | tm-source | note | src |
|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|
| 21 | bogota colombia tours | C2 | comm | 210 | 1 | 4 | subdom~50 | transcreate | dest-hub | `/destinos/bogota/` | KD=1 — easiest top-10 win in entire universe. Just need a properly transcreated hub + 5 internal links. | dfs |
| 22 | colombia travel guide | C8+C9 | info | [~590] | [~35] | 3 | nr | create | guide | merge ES "guía de viaje colombia" if exists | Long-form pillar. Internal-link hub for all C1-C10 children. | est |
| 23 | things to do in cartagena | C1 | info | [~1900] | [~38] | 3 | subdom~58 | transcreate | dest-hub | merge with #7 Cartagena hub | TripAdvisor dominates SERP — beat by adding "skip-this" + insider hours. | est |
| 24 | things to do in medellin | C2 | info | [~1600] | [~42] | 3 | subdom~70 | transcreate | dest-hub | merge with #6 Medellin hub | Same as Cartagena — counter-listicle ("avoid Comuna 13 alone after dark") wins SERP CTR. | est |
| 25 | things to do in bogota | C2 | info | [~880] | [~35] | 3 | nr | transcreate | dest-hub | merge with #21 Bogota hub | Same pattern. Lead with Monserrate + Candelaria + Usaquen markets. | est |
| 26 | colombia travel insurance | C8 | info+comm | [~390] | [~50] | 3 | nr | update FAQ block | faq | `/requisitos-para-viajar-a-colombia/` | US travelers expect a recommendation (Allianz, World Nomads). Affiliate disclosure required. | est |
| 27 | colombia visa for us citizens | C8 | info | [~720] | [~22] | 4 | nr | create | faq | `/requisitos-para-viajar-a-colombia/` | US passport = no visa for ≤90 days. State this in H1. AI Overview surface — structure with HowTo schema. | est |
| 28 | how safe is colombia for tourists | C8 | info | [~480] | [~28] | 4 | nr | create | guide | merge with #1 safety hub | Long-tail of #1. Same content, secondary H2. | est |
| 29 | is medellin safe | C8 | info | [~880] | [~30] | 4 | nr | create | guide | merge with safety hub child | Specific neighborhood breakdown: El Poblado/Laureles safe; Comuna 13 daytime + tour only. | est |
| 30 | is cartagena safe | C8 | info | [~590] | [~28] | 4 | nr | create | guide | merge with safety hub child | Walled City extremely safe; outside markets daytime. | est |
| 31 | is bogota safe | C8 | info | [~480] | [~32] | 3 | nr | create | guide | merge with safety hub child | Most nuanced — La Candelaria, Chapinero, Usaquen safe; periphery not. | est |
| 32 | colombia weather by month | C9 | info | [~390] | [~22] | 4 | nr | create | guide | `/mejor-epoca-para-viajar-a-colombia-mes-a-mes/` | Long-tail of #2. Interactive table — different rainfall by region. | est |
| 33 | best time to visit cartagena | C9 | info | [~720] | [~28] | 4 | nr | create | guide | merge with #2 + #7 | Dry Dec-Apr; hurricane Aug-Nov but rare for Cartagena. | est |
| 34 | best time to visit medellin | C9 | info | [~480] | [~30] | 3 | nr | create | guide | merge with #2 + #6 | "City of Eternal Spring" — sell as year-round. | est |
| 35 | colombia currency exchange | C8 | info | [~210] | [~25] | 3 | nr | create | faq | snippet within #22 + #1 | Use ATMs in airports/banks, never on street. Cap dollars at $200 cash. | est |
| 36 | english speaking guides colombia | C8 | comm | [~110] | [~18] | 4 | nr | create | landing | none | Direct trust signal for US bookings. List partner guides + certifications. | est |
| 37 | colombia all inclusive resorts | C10 | trans | [~880] | [~55] | 3 | nr | create | matrix | partial overlap `/paquetes-a-colombia-todo-incluido-en-9-dias/` | Honest framing — Colombia is NOT Cancun. Pivot to "all-inclusive multi-city tour" framing. | est |
| 38 | salento colombia | C2 | info | [~1300] | [~22] | 4 | subdom~50 | transcreate | dest-hub | `/destinos/salento/` if exists | Cocora valley + wax palms. US travelers know via TikTok. Day trip from Pereira. | est |
| 39 | valle de cocora | C2 | info | 2900 | [~25] | 5 | subdom~58 | transcreate | dest-hub | `/destinos/valle-de-cocora/` | DFS verified. Pair with Salento hub. | dfs |
| 40 | san gil colombia | C5 | info+comm | [~390] | [~20] | 4 | nr | create | dest-hub | new | Adventure capital — rafting, paragliding, caving. KD low. | est |
| 41 | nuqui colombia | C3 | info | [~210] | [~15] | 4 | nr | create | dest-hub | new | Whale-watching season Jun-Oct. Pacific lodge angle. | est |
| 42 | leticia amazon colombia | C3 | info | [~210] | [~20] | 3 | nr | create | dest-hub | new | Tri-frontera (CO/PE/BR). Niche — high-intent low-volume. | est |
| 43 | bogota to cartagena flight | C8 | trans | [~720] | [~45] | 3 | nr | update | faq | snippet | Internal flight info; convert to package upsell. Avianca/Latam/Wingo. | est |
| 44 | medellin to cartagena | C8 | info | [~590] | [~38] | 3 | nr | update | faq | snippet | Same — flight/transfer logistics block. | est |
| 45 | colombia trip cost | C10 | info+comm | [~880] | [~42] | 4 | nr | create | guide | `/en-cuanto-sale-un-viaje-a-colombia-blog/` | Currency conversion + USD breakdown by trip length. ES version exists for MX market — full transcreation needed. | est |
| 46 | how much does it cost to travel to colombia | C10 | info | [~720] | [~40] | 3 | nr | create | guide | merge with #45 | Long-tail of #45. | est |
| 47 | colombia 7 day itinerary | C10 | info+comm | [~210] | [~25] | 4 | nr | create | guide | merge with #5 itinerary | 7d = US 1-week vacation default. Cartagena + Medellin most common. | est |
| 48 | colombia 10 day itinerary | C10 | info+comm | [~210] | [~28] | 4 | nr | create | guide | merge with #5 itinerary | 10d adds Eje Cafetero or Tayrona. | est |
| 49 | colombia 14 day itinerary | C10 | info+comm | [~110] | [~22] | 3 | nr | create | guide | merge with #5 itinerary | 14d = full grand tour. Caribbean + Andean + coffee. | est |
| 50 | private tours colombia | C4 | comm | [~210] | [~32] | 3 | nr | create | landing | none | Luxury-adjacent. Pair with #16. | est |

### Tier C — Long tail / supporting (prio 1-2)

| # | kw | cluster | intent | vol | kd | prio | rank | action | template | tm-source | note | src |
|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|
| 51 | what to wear in cartagena | C8 | info | [~390] | [~18] | 2 | nr | create | blog | new | Tropical light layers, breathable. Include packing list. | est |
| 52 | what to pack for colombia | C8 | info | [~210] | [~22] | 2 | nr | create | blog | new | Climate-zone packing — varies wildly. | est |
| 53 | colombia or costa rica | C9 | info | [~210] | [~30] | 2 | nr | create | blog | new | Comparison content — high-engagement, links to authority hub. | est |
| 54 | is the water safe to drink in colombia | C8 | info | [~390] | [~15] | 3 | nr | create | faq | merge with safety hub | Bogota/Medellin tap = safe; coast = bottled. Specific. | est |
| 55 | colombia electrical outlets | C8 | info | [~110] | [~10] | 2 | nr | create | faq | merge with safety hub | Type A/B (US compatible). Quick win. | est |
| 56 | colombia sim card for tourists | C8 | info | [~210] | [~18] | 2 | nr | create | blog | new | Claro/Movistar prepaid. Airalo eSIM. | est |
| 57 | colombia airport bogota | C8 | nav | [~880] | [~50] | 2 | nr | create | faq | snippet | El Dorado (BOG). High KD — informational only. | est |
| 58 | colombia photography tour | C5+C7 | comm | [~110] | [~15] | 3 | nr | create | landing | none | Niche — Andean landscapes + birding combo. | est |
| 59 | colombia surf trip | C5 | comm | [~110] | [~18] | 3 | nr | create | blog | new | Pacific coast (Nuqui, Bahia). Niche. | est |
| 60 | colombia diving | C5 | comm | [~390] | [~30] | 3 | nr | create | landing | none | San Andres + Providencia + Taganga. | est |
| 61 | colombia coffee farm tour | C2 | comm | [~210] | [~22] | 4 | nr | create | landing | merge with C2 hub | Hacienda San Alberto, Hacienda Venecia. | est |
| 62 | colombia wedding destination | C4 | trans | [~110] | [~25] | 3 | nr | create | landing | new | Cartagena Old City weddings. High AOV. | est |
| 63 | gay friendly colombia | C8 | info | [~210] | [~20] | 3 | nr | create | guide | new | Bogota + Medellin LGBT-friendly. Authority + trust. | est |
| 64 | solo female travel colombia | C8 | info | [~320] | [~28] | 3 | nr | create | guide | new | High-engagement topic. Safety hub child. | est |
| 65 | colombia travel reddit | C8 | nav | [~720] | [~70] | 1 | nr | n/a | n/a | n/a | Reddit-dominated SERP — don't fight. | est |
| 66 | colombia tourism statistics | C8 | info | [~210] | [~30] | 2 | nr | create | blog | new | Original data → backlink magnet (Objective 2). | est |
| 67 | best beaches in colombia | C1 | info | [~880] | [~35] | 3 | nr | create | guide | new | Rosario, Playa Blanca, Tayrona, San Andres, Cabo San Juan. | est |
| 68 | rosario islands tour | C1 | comm | [~480] | [~25] | 4 | nr | create | landing | new | Day-trip from Cartagena. Frequent SERP. | est |
| 69 | colombia honeymoon | C4 | comm | [~390] | [~30] | 4 | nr | create | landing | merge with #18 | Plural variant of #18. | est |
| 70 | medellin day trips | C2 | info+comm | [~390] | [~25] | 4 | nr | create | dest-hub | merge with #6 + #8 | Guatape, Santa Fe de Antioquia, Jardin. | est |
| 71 | bogota day trips | C2 | info+comm | [~210] | [~22] | 3 | nr | create | dest-hub | merge with #21 | Zipaquira salt cathedral, Villa de Leyva, Guatavita. | est |
| 72 | cartagena day trips | C1 | info+comm | [~210] | [~22] | 3 | nr | create | dest-hub | merge with #7 + #68 | Rosario, Mud Volcano, Playa Blanca. | est |
| 73 | colombia vs peru travel | C9 | info | [~210] | [~28] | 2 | nr | create | blog | new | Comparison — links to authority. | est |
| 74 | colombia in december | C9 | info | [~210] | [~25] | 3 | nr | create | guide | merge with #2 | Holiday season; high prices, dry. | est |
| 75 | colombia in january | C9 | info | [~110] | [~22] | 2 | nr | create | guide | merge with #2 | Dry season peak. | est |
| 76 | colombia in june | C9 | info | [~110] | [~22] | 2 | nr | create | guide | merge with #2 | Whale season Pacific; rainy Andean. | est |
| 77 | best islands in colombia | C1 | info | [~210] | [~28] | 3 | nr | create | guide | merge with #67 | San Andres, Providencia, Rosario, Baru. | est |
| 78 | colombia bachelor party | C5 | comm | [~210] | [~32] | 2 | nr | n/a | n/a | n/a | Off-brand — do NOT target (reputational). | est |
| 79 | medellin bachelor party | C5 | comm | [~480] | [~38] | 1 | nr | n/a | n/a | n/a | Same — explicitly avoid. | est |
| 80 | colombia spanish school | C8 | comm | [~390] | [~22] | 3 | nr | create | landing | new | Adjacent to long-stay travelers. Partnership angle. | est |
| 81 | digital nomad colombia | C8 | info | [~390] | [~28] | 3 | nr | create | guide | new | Visa N + co-working. Medellin focus. | est |
| 82 | colombia retirement | C8 | info | [~720] | [~45] | 2 | nr | n/a | n/a | n/a | Off-mission — don't expand. | est |
| 83 | colombia yacht charter | C4 | trans | [~210] | [~30] | 3 | nr | create | landing | new | Cartagena Bay + Rosario. Luxury. | est |
| 84 | colombia hiking tours | C5 | comm | [~210] | [~25] | 4 | nr | create | landing | merge with #20 | Lost City, Cocos Valley, Los Nevados. | est |
| 85 | colombia food tour | C2 | comm | [~110] | [~18] | 4 | nr | create | landing | new | Bogota + Cartagena culinary. Hands-on classes. | est |
| 86 | exoticca colombia | C10 | nav | [~720] | [~80] | 1 | nr | n/a | n/a | n/a | Competitor brand — do NOT target. | comp |
| 87 | gate 1 travel colombia | C10 | nav | [~880] | [~80] | 1 | nr | n/a | n/a | n/a | Competitor brand — do NOT target. Note for #321 link prospecting. | comp |
| 88 | colombia tour operator | C10 | comm | [~210] | [~38] | 3 | nr | create | landing | merge with C10 matrix | Self-positioning (we ARE the operator). | est |

---

## 4. Cannibalization watch

Pairs likely to compete for the same SERP — must be merged or have explicit content delineation before publish:

| Pair | Risk | Resolution |
|---|---|---|
| #3 `colombia tour packages` ↔ #12 `colombia vacation packages` | Same intent, US-spelling variants | Single landing, both H1/meta candidates, A/B test |
| #5 `colombia itinerary` ↔ #47/#48/#49 (`X day itinerary`) | Pillar vs cluster | Pillar = `/en/colombia-itinerary` with `?days=7,10,14` filter sections; child URLs only if filter doesn't index |
| #2 `best time to visit colombia` ↔ #32 `colombia weather by month` ↔ #74-#76 monthly | Same hub | One pillar `/en/best-time-to-visit-colombia` + month anchors. Block child pages from indexing if duplicate. |
| #1 `is colombia safe to travel` ↔ #28 `how safe is colombia for tourists` ↔ #29-#31 city-level | Same hub | One pillar `/en/is-colombia-safe` + `#medellin`, `#cartagena`, `#bogota` anchors with own H2 + JSON-LD `#section` |
| #6 `medellin colombia tours` ↔ #24 `things to do in medellin` ↔ #29 `is medellin safe` | Three intents on one entity | Single Medellin destination hub with 3 distinct H1 sections + 3 schema islands |
| #7 `cartagena colombia travel` ↔ #23 `things to do in cartagena` ↔ #30 `is cartagena safe` ↔ #33 `best time to visit cartagena` ↔ #51 `what to wear in cartagena` ↔ #68 `rosario islands tour` | Six keywords, one entity | Cartagena hub with on-page TOC + 6 sections; Rosario-only as a child page (transactional split). |
| #8 `guatape antioquia` ↔ #70 `medellin day trips` | Day-trip overlap | Guatape = standalone hub; #70 lists 3-5 day trips with link-out to Guatape hub |
| #11 `coffee triangle colombia` ↔ #10 `eje cafetero colombia` ↔ #38 `salento colombia` ↔ #39 `valle de cocora` ↔ #61 `colombia coffee farm tour` | Region cluster | Coffee region hub at `/en/coffee-triangle-colombia` (US spelling) + salento and cocora as child hubs; coffee farm as commercial landing |
| #16 `luxury colombia tours` ↔ #50 `private tours colombia` ↔ #18/#69 `honeymoon` ↔ #62 `wedding destination` ↔ #83 `yacht charter` | Luxury vertical | Single luxury landing + 4 sub-landing pages, cross-linked |
| Legacy `en.colombiatours.travel` subdomain — ALL EN content currently | Cross-domain dup with new `/en/...` paths | Block: P0 — must complete subdomain → path migration (#319/#320 governance) before publishing any new EN URL. Ranking signals will fragment otherwise. |

---

## 5. Competitor SERP shape (top 3 per cluster)

Pulled from DataForSEO 2026-04-25 + manual top-3 SERP scan for representative head terms. Use as content-shape benchmarks.

### C1 — Caribbean coast (head term: `cartagena colombia travel`)
1. `tripadvisor.com/Tourism-g297473-Cartagena_Bolivar_Department-Vacations.html` — 4,200 words, FAQ schema, 65 internal links, 200+ reviews embedded.
2. `lonelyplanet.com/colombia/caribbean-coast/cartagena` — 2,800 words, editorial format, 0 schema, strong topical hub (12 child pages).
3. `goway.com/trips/destinations/central-and-south-america/colombia/cartagena/` — 1,200 words, `TouristTrip` schema, commercial CTA, price-from $2,499.
**Shape recommendation:** Hybrid editorial-commercial. ~2,500 words, FAQ + TouristDestination + Product schema, 8-10 H2 sections, 15-20 internal links to packages and child hubs, embedded testimonials.

### C2 — Andean cities + Coffee (head term: `medellin colombia tours`)
1. `medellin.travel` (DMO) — 3,000 words, no commercial CTA, high authority (DR 65).
2. `gate1travel.com/south-america-tours/colombia/medellin-tours.aspx` — 1,800 words, package matrix, schema.
3. `landedtravel.com/destinations/medellin-colombia` — 2,200 words, luxury angle, custom-trip CTA.
**Shape:** Match length to #1; differentiate via #2 commercial intent. ~2,400 words, package matrix above the fold.

### C3 — Pacific + Amazon (head term: `nuqui colombia`)
SERP is shallow (low volume, 4-5 specialty operators dominate). Easy to rank with single 1,500-word hub.

### C4 — Luxury / Honeymoon (head term: `luxury colombia tours`)
1. `kensingtontours.com/destinations/colombia/luxury` — 2,000 words, custom-trip form, PR-style imagery.
2. `enchantingtravels.com/destinations/colombia/luxury-tours` — 1,600 words, testimonials, schema.
3. `landedtravel.com/destinations/colombia` — 2,500 words, blog overlay, expert-led angle.
**Shape:** ~2,000 words, custom-trip form above fold, 3-4 sample itineraries, planner credentials block (E-E-A-T critical for luxury intent).

### C5 — Adventure (head term: `lost city trek colombia`)
1. `bookaway.com/lost-city-trek` — listing aggregator, 1,400 words, schema.
2. `expotur-eco.com` — original operator, 1,000 words, brand-driven.
3. `magictours.travel` — 1,200 words, operator, photos.
**Shape:** ~1,800 words. Position as licensed operator. Day-by-day breakdown + permits info.

### C6 — Family (head term: `family vacation colombia`)
1. `gate1travel.com/family-vacations/colombia` — 1,400 words, family-specific package matrix.
2. `adventures-by-disney.com` — disney brand, family-formatted itineraries.
3. `intrepidtravel.com/colombia/family-tours` — 1,600 words, age-band pricing.
**Shape:** ~1,500 words. Age-band-friendly, kid-activities highlighted, safety FAQ.

### C7 — Eco / Birding (head term: `colombia birding tours`)
1. `manakinnaturetours.com` — operator, 2,000 words, species lists.
2. `rockjumperbirding.com/destinations/colombia` — operator, 1,800 words.
3. `audubon.org/news/why-colombia-bucket-list-birders` — editorial, no commercial.
**Shape:** ~2,000 words. Endemic species table + route maps + qualified guide credentials.

### C8 — Authority (head term: `is colombia safe to travel`)
1. `state.gov/travel-advisories/.../colombia.html` — official government, ranks ahead of all editorial. Cannot beat.
2. `nomadicmatt.com/travel-blogs/colombia-safety` — high authority blog, 2,200 words.
3. `worldnomads.com/travel-safety/south-america/colombia` — insurance company, 1,800 words.
**Shape:** Cannot beat State Dept; aim for #2 slot. ~2,500 words, original data (e.g., partner-incident-rate), reviewed-by-planner schema.

### C9 — Best time to visit (head term: `best time to visit colombia`)
1. `roughguides.com/colombia/when-to-go` — editorial, 1,800 words, region table.
2. `lonelyplanet.com/colombia/when-to-go` — editorial, 1,400 words, no schema.
3. `worldtravelguide.net/guides/south-america/colombia/weather-climate` — data-rich, 1,200 words.
**Shape:** ~2,000 words. Interactive month × region table (5 regions) is the differentiator. Schema: `Article` + `FAQPage`.

### C10 — Tours / Packages (head term: `colombia tour packages`)
1. `gate1travel.com/south-america-tours/colombia.aspx` — package matrix (12+ tours), schema, prices.
2. `travelstride.com/d/colombia-tours` — aggregator with 200+ tours.
3. `goway.com/trips/destinations/.../colombia/` — package matrix.
**Shape:** Package matrix above fold, 8-12 packages visible, schema `Product` per package, prices in USD ex-MIA, departure-month picker.

---

## 6. Provenance (per-row honesty)

- 22 rows tagged `dfs` are sourced from the 2026-04-25 DataForSEO snapshot (verified volumes + KD).
- 14 rows where current rank shows `subdom~XX` are sourced from the GSC snapshot (`https://en.colombiatours.travel/*`).
- 47 rows tagged `est` use peer-keyword extrapolation: bracketed `[~N]` means we picked a US-market plausible volume from sibling keywords in the same DataForSEO cluster, not a direct API result. **Re-pull live before any of these enter a content brief.**
- 2 rows tagged `comp` are competitor-brand keywords, intentionally not targeted.
- Live MCP re-pull priorities (next session, before A4 Friday review):
  1. All Tier A `est` rows (#4, #11, #12, #13, #14, #15, #16, #17, #18, #19, #20).
  2. All authority-hub rows (#22, #27-#31).
  3. Cluster-head rows where rank is `nr` and KD is estimated (#36, #45-#49, #84-#85).
- DataForSEO endpoints to use:
  - `mcp__dataforseo__keywords_for_keywords_live` (US, en) — volumes + KD.
  - `mcp__dataforseo__serp_organic_live_advanced` (US, en) — top-3 SERP for each Tier A.
  - `mcp__dataforseo__competitors_domain_live` for `gate1travel.com`, `goway.com`, `exoticca.com`, `landedtravel.com`, `kensingtontours.com`.

---

## 7. Open questions for upstream agents

- **A1 (analytics):** Confirm GA4 EN landing-page sessions for last 28d on `en.colombiatours.travel` so we have an honest "0 → 1,500" baseline by sub-cluster.
- **A3 (link acquisition / #321):** Do competitor-brand keywords (#86 exoticca, #87 gate1) belong to A3's prospecting list rather than content?
- **A5 (web-eng / #319-#320):** Confirm migration timeline `en.colombiatours.travel` → `/en/...` prefix. Hub publishing is **gated** on that move — premature `/en/...` publishing without subdomain shutdown will fragment authority irrecoverably.

---

## 8. Wikilinks

[[ADR-019]] [[ADR-020]] [[ADR-021]] [[SPEC #337]] [[Issue #310]] [[Issue #315]] [[Issue #316]] [[Issue #319]] [[Issue #320]] [[Issue #321]]

Related session docs:
- `docs/growth-sessions/2026-04-25-1027-colombiatours-growth-dataforseo-batch.md` — DataForSEO source of truth.
- `docs/growth-sessions/2026-04-27-seo-audit-top100.md` — top-100 audit (W1).
- `docs/growth-sessions/2026-05-04-en-us-priority-hubs.md` — Top 5 EN-US hubs (#316, this session).
- `docs/growth-sessions/2026-05-04-en-us-execution-plan.md` — Phased rollout (this session).
