# editorial-v1 — Component Inventory

Prototype source: `themes/references/claude design 1/project/` (React + Babel standalone, no bundler). This inventory maps every component discovered across the JSX files so that multiple coder agents can port each in parallel to `components/site/themes/editorial-v1/`.

Dynamic data shapes consumed throughout (see `data.jsx`):

- `DESTINATIONS` — `{ id, name, tag, subtitle, emphasis?, region, scene }` (8 items)
- `PACKAGES` — `{ id, title, subtitle, loc, days, nights, group, price, currency, rating, reviews, badges[], type, dest, includes[], itinerary[{d,t,b}] }` (6 items)
- `ACTIVITIES` — `{ id, title, subtitle, loc, region, cat, level, bucket, dur, durMin, price, rating, reviews, badges[], desc, highlights[], includes[], time, dest }` (14 items)
- `PLANNERS` — `{ id, name, role, base, langs[], years, av, regions[], specialties[], styles[], rating, reviews, trips, response, quote, bio, hallmarks[pkgId], signature{title,note}, funFacts[], availability, destScene }` (6 items)
- `PLANNER_REVIEWS` — `{ id, plId, name, origin, pkg, rating, txt }` (6 items)
- `TESTIMONIALS` — `{ id, name, origin, pkg, short, long, rating }` (4 items)
- `FAQ` — `{ q, a }` (6 items)
- `BLOG_POSTS` — `{ id, cat, title, emphasis, excerpt, author, authorRole, date, read, scene, tags[], featured?, body[{t,c}] }` (6 items)
- `scene` — `{ bg: cssGradient, layers: [{type:"rect"|"circle", style: CSSProperties}] }`

---

## Primitives (`primitives.jsx` + cross-cutting UI)

| Name | Source | Props | Used by | CSS classes | Behaviors |
|---|---|---|---|---|---|
| `Ic` (icon set) | primitives.jsx:5–31 | `{ s?: number, fill?: string }` per icon; 24 icons: `search, arrow, arrowUpRight, calendar, pin, users, clock, heart, star, globe, whatsapp, close, plus, check, menu, grid, map, leaf, shield, sparkle, compass, award, ig, fb, tiktok` | everywhere | inline SVG, no classes | stroke=1.7; fill=currentColor; stateless |
| `Scenic` | primitives.jsx:33–45 | `{ scene, className? }` | Hero, PackageCard, dest cards, blog media, gallery, lightbox, modal hero | `.scenic`, `.scenic-sky`, dynamic layer divs | Renders gradient bg + N absolute-positioned layers (rect/circle) from `scene.layers[]` |
| `Logo` | primitives.jsx:47–58 | `{ light?: boolean, tagline?: boolean }` | Header, Footer | `.nav-logo`, `.logo-tag` | Uses `assets/logo.png`; tagline: "Operador local · desde 2011" |
| `Rating` | primitives.jsx:60–67 | `{ value: number, count?: number, size?: number = 14 }` | Cards, detail headers, reviews | `.rating` | Star + decimal value + parenthesized count |
| `Crumbs` | pages.jsx:4–17 | `{ trail: {label,page?}[], onNav }` | PageHero, detail pages | `.crumbs`, `.sep`, `.cur` | Last item is non-clickable current |
| `PageHero` | pages.jsx:20–33 | `{ eyebrow, title, emphasis?, subtitle?, scene, trail, onNav }` | PackagesListing, ExperiencesPage, PlannersList, BlogList, SearchPage, ContactPage | `.page-hero`, `.container`, `.display-lg`, `.eyebrow`, `.hero-eyebrow` | Scene bg + gradient wash overlay |
| `CountryChip` | maps.jsx:287–305 | `{ destId, region }` | Package cards (listing, similar, packages section) | `.country-chip`, `.country-chip-svg`, `.country-chip-land`, `.country-chip-halo`, `.country-chip-dot`, `.country-chip-text` | Tiny SVG of Colombia with dot at destination |
| `MarketSwitcher` | switcher.jsx:46–126 | `{ onDark?: boolean, groupStyle?: 'compact'\|'chips'\|'segmented' }` | SiteHeader, SiteHeaderF1 | `.mkt-anchor`, `.mkt-pill`, `.mkt-flag`, `.mkt-code`, `.mkt-sep`, `.mkt-cur`, `.mkt-sym`, `.mkt-pop*`, `.mkt-reload`, `.mkt-spinner` | Popover; localStorage keys `bukeer.site.lang`, `bukeer.site.currency`; ESC + outside click close; fake SSR reload spinner 1.4s |
| `SwGroup` | switcher.jsx:129–195 | `{ kind:'lang'\|'cur', groupStyle, value, onChange }` | MarketSwitcher internal | `.mkt-chips`, `.mkt-chip`, `.mkt-chip-flag`, `.mkt-chip-sym`, `.mkt-seg`, `.mkt-seg-flag`, `.mkt-seg-code`, `.mkt-list`, `.mkt-item*` | Three layout modes |
| `SwCaret` | switcher.jsx:36–43 | `{ open }` | MarketSwitcher | inline SVG | Rotates 180° when open |
| `FooterSwitcher` | switcher.jsx:198–241 | — | Footer | `.mkt-footer`, `.mkt-footer-select`, `.mkt-footer-flag`, `.mkt-footer-sym`, `.mkt-footer-text` | Two native `<select>`s for lang + currency |
| `LOCALES` | switcher.jsx:6–14 | 7 locales: es/en/pt/fr/de/it/nl | — | — | Static array |
| `CURRENCIES` | switcher.jsx:16–22 | 5: COP/USD/EUR/MXN/BRL | — | — | Static array |

### Detail-page shared primitives (`details.jsx`)

| Name | Source | Props | Used by | CSS classes | Behaviors |
|---|---|---|---|---|---|
| `GalleryStrip` | details.jsx:11–27 | `{ scene, count=6, onOpen }` | PackageDetailV2, ActivityDetail | `.gallery-strip`, `.gs-grid`, `.gs-tile`, `.gs-tile-{i}`, `.gs-more` | Last tile shows "Ver N fotos" overlay |
| `RouteMap` | details.jsx:30–49 | `{ stops: {name, nights}[] }` | PackageDetailV2 | `.route-map`, `.rm-head`, `.label`, `.rm-track`, `.rm-line`, `.rm-stop`, `.rm-dot` | Horizontal linear itinerary |
| `TrustBadges` | details.jsx:52–72 | — | PackageDetailV2, ActivityDetail | `.trust-row`, `.trust-item`, `.ic` | 4 badges: "RNT vigente", "4.9/5 · 3,200 reseñas", "Protocolos de seguridad", "Guías certificados" |
| `DayEvent` | details.jsx:90–102 | `{ e: {t, time, title, note?} }` | PackageDetailV2, ActivityDetail | `.evt`, `.evt-{t}`, `.evt-time`, `.evt-dot`, `.evt-body` | Event types: `transporte, actividad, comida, alojamiento, libre` (ES labels) |
| `HotelCard` | details.jsx:105–124 | `{ h: {name,city,category,rating,amenities[],nights}, scene }` | PackageDetailV2 | `.hotel-card`, `.h-media`, `.h-body`, `.h-head`, `.h-rating`, `.h-amen`, `.h-nights` | — |
| `buildItinerary(pkg)` | details.jsx:130–167 | helper | PackageDetailV2 | — | Synthesizes typed days + hotels + flights from pkg.itinerary + pkg.nights |
| `buildActivityTimeline(a)` | details.jsx:546–577 | helper | ActivityDetail | — | Returns block[] by `bucket` (multi-day / short / full-day) |
| `EVENT_ICONS` / `EVENT_LABELS` | details.jsx:75–88 | constants | DayEvent | — | Maps event type → icon + ES label |

### Maps primitives (`maps.jsx`)

| Name | Source | Props | Used by | CSS classes | Behaviors |
|---|---|---|---|---|---|
| `ColombiaMap` | maps.jsx:148–282 | `{ pins, route?, variant:'default'\|'editorial'\|'minimal'\|'compact', showLabels, showRidges, showRivers, hoveredId, onHover, onPinClick, height, ariaLabel }` | Destinations map view, ExploreMap, ListingMap, ItineraryMap | `.co-map`, `.co-map-{variant}`, `.co-map-svg`, `.co-land`, `.co-land-stroke`, `.co-ocean`, `.co-link-dash`, `.co-ridge`, `.co-river`, `.co-route`, `.co-route-shadow`, `.co-pin`, `.co-pin-core`, `.co-pin-dot`, `.co-pin-halo`, `.co-pin-label`, `.co-pin-num`, `.co-pin-{kind}`, `.co-compass`, `.co-compass-ring`, `.co-compass-needle`, `.co-compass-n` | Custom SVG silhouette (NOT a real map) 800×1000 viewBox; equirectangular projection; 3 Andes ridges; 3 rivers; San Andrés + Providencia drawn as circles with dotted link; hatch pattern on `editorial` variant |
| `project({lat,lng})` | maps.jsx:47–53 | helper | internal | — | Linear projection against `MAP_BOX` |
| `findGeoKey(name)` | maps.jsx:452–466 | helper | ItineraryMap | — | Fuzzy match destination name to `GEO` key |
| `RegionalMiniMap` | maps.jsx:310–320 | `{ pins, height=280 }` | (available; not used in prototype) | — | ColombiaMap with `variant="minimal"` |
| `ItineraryMap` | maps.jsx:326–387 | `{ stops, pkgTitle }` | PackageDetailV2 | `.itin-map`, `.im-head`, `.im-grid`, `.im-stage`, `.im-legend`, `.im-legend-title`, `.im-num`, `.im-chev`, `.im-foot`, `.dot.dot-route` | Geographic route map with legend list; static copy: "Ruta en el mapa", "Paradas del viaje", "Ruta estimada · los traslados se ajustan según vuelos y clima" |
| `ListingMap` | maps.jsx:394–450 | `{ packages, onOpenDetail, hover, setHover }` | PackagesListing | `.listing-map-view`, `.listing-map-stage`, `.listing-map-cards`, `.lm-card`, `.lm-thumb`, `.lm-region`, `.lm-body`, `.lm-foot`, `.lm-chev` | Map + scrollable cards synced with hover |
| `GEO` / `MAP_BOX` / `COLOMBIA_PATH` / `SAN_ANDRES_ISLANDS` / `ANDES_RIDGES` / `RIVERS` | maps.jsx:12–135 | constants | ColombiaMap | — | Geographic data (28 keyed places) + hand-built SVG path |

### WhatsApp Flow primitives (`waflow.jsx`)

| Name | Source | Props | Used by | CSS classes | Behaviors |
|---|---|---|---|---|---|
| `WAFlowProvider` | waflow.jsx:111–133 | `{ children }` | AppF1 root | — | Context; manages `open`, `config`; auto-mounts WAFlowDrawer + WAFab |
| `useWAFlow()` | waflow.jsx:8 | — | all CTAs in F1 | — | Returns `{ open, config, openFlow, closeFlow }` |
| `WAFlowDrawer` | waflow.jsx:138–542 | `{ open, config:{variant,destination?,pkg?}, onClose }` | WAFlowProvider | `.waf-overlay`, `.waf-drawer`, `.waf-head`, `.waf-head-bg`, `.waf-head-inner`, `.waf-head-top`, `.waf-head-eyebrow`, `.waf-head-title`, `.waf-head-sub`, `.waf-pill-context`, `.waf-close`, `.waf-body`, `.waf-field`, `.waf-label`, `.waf-chips`, `.waf-chip`, `.waf-chip-row`, `.waf-chip.compact`, `.waf-stepper-row`, `.waf-stepper`, `.waf-stepper-label`, `.waf-stepper-controls`, `.waf-stepper-btn`, `.waf-stepper-val`, `.waf-input-wrap`, `.waf-input`, `.waf-prefix`, `.waf-country-dd`, `.waf-country-opt`, `.waf-error-msg`, `.waf-foot`, `.waf-availability`, `.waf-submit`, `.waf-skip`, `.waf-privacy`, `.waf-success`, `.waf-success-ic`, `.waf-success-preview`, `.waf-success-actions`, `.waf-ref-badge`, `.btn-wa`, `.btn-sec` | Right-side drawer modal; variants A/B/D; ESC close; resets on open; validates phone length per country; builds WA message + url; stores leads in localStorage `waLeads`; opens `wa.me/${WA_BUSINESS_NUMBER}` in new tab after 450ms; generates 8-char ref `{PREFIX}-{DDMM}-{XXXX}` |
| `TrustBarF1` | waflow.jsx:547–558 | — | HeroF1, DestinationPageF1 | `.trust-bar-f1`, `.item`, `.dot-live`, `.ic` | 4 items (copy below) |
| `HowItWorks` | waflow.jsx:563–614 | `{ onOpen }` | AppF1 home, DestinationPageF1 | `.howit-f1`, `.head`, `.howit-steps`, `.howit-step`, `.howit-num`, `.meta`, `.howit-bottom`, `.eyebrow` | 3 steps (copy below) |
| `WAFab` | waflow.jsx:619–658 | `{ onOpen }` | WAFlowProvider | `.wa-fab-f1`, `.wa-fab-btn`, `.wa-fab-bubble`, `.wa-fab-close` | Appears after scroll > 50vh OR after 20s; bubble auto-hides after 8s |
| `buildWAMessage(...)` | waflow.jsx:64–100 | helper | WAFlowDrawer | — | Variant-specific WA message template |
| `validatePhone(phone, country)` | waflow.jsx:103–106 | helper | WAFlowDrawer | — | length match |
| `makeRef(prefix)` | waflow.jsx:56–61 | helper | WAFlowDrawer | — | `{PREFIX}-{DDMM}-{4-char uppercase}` |
| `COUNTRIES` | waflow.jsx:14–28 | 13 countries | WAFlowDrawer | — | — |
| `BASE_INTERESTS` / `DEST_INTERESTS` | waflow.jsx:31–41 | — | WAFlowDrawer | — | Per-destination chips override |
| `WHEN_OPTIONS` / `PKG_ADJUST` | waflow.jsx:43–53 | — | WAFlowDrawer | — | — |
| `WA_BUSINESS_NUMBER` / `WA_RESPONSE_TIME` | waflow.jsx:11–12 | constants | WAFlowDrawer, HowItWorks, WAFab | — | `573001234567`, `"3 min"` |

---

## Sections (home)

Two home variants: baseline (`app.jsx` + `sections.jsx`) and **Fase 1** (`app_f1.jsx`). The editorial-v1 template should be built on the **F1 variant** where present (it is the designer's final layout).

| Name | Source | Props | Children | Dynamic data | Classes | Behaviors |
|---|---|---|---|---|---|---|
| `SiteHeader` | sections.jsx:5–39 | `{ onOpen, onNav, current }` | `Logo`, `MarketSwitcher`, `Ic.search`, `Ic.arrow` | — | `.site-header`, `.site-header.scrolled`, `.container`, `.nav`, `.nav-links`, `.nav-link`, `.nav-link.active`, `.nav-right`, `.icon-btn`, `.btn`, `.btn-ink`, `.btn-sm` | Scroll listener adds `.scrolled` when `scrollY > 20`. CTA "Cotizar viaje". |
| `SiteHeaderF1` | app_f1.jsx:136–170 | `{ onOpen, onNav, current }` | same as above | — | same + `.btn-wa-hero`-ish inline WA CTA | Same scroll behavior; CTA "Planea mi viaje" with WhatsApp icon |
| `Hero` | sections.jsx:42–104 | `{ onSearch }` | `Scenic`, `Ic.arrow`, `HeroSearch` | `DESTINATIONS[0,3,4,2]` as slides | `.hero`, `.hero-media`, `.hero-inner`, `.hero-copy`, `.hero-eyebrow`, `.display-xl`, `.lead`, `.hero-cta`, `.hero-side-list .item`, `.hero-meta`, `.dots`, `.dot`, `.dot.active` | Auto slide every 6500ms; side list (01–04); dots + fraction (01/04) |
| `HeroF1` | app_f1.jsx:173–237 | `{ onOpen }` | `Scenic`, `Ic.whatsapp`, `Ic.arrow` | same | same classes + `.btn-wa-hero` | Same carousel; no hero search; green-dot "Responden en ~3 min" |
| `HeroSearch` | sections.jsx:106–129 | `{ onGo }` | `Ic.search` | — | `.hero-search`, `.field`, `.go` | Three pseudo-fields (Destino/Cuándo/Viajeros) + Buscar button |
| `Trust` | sections.jsx:132–148 | — | — | — | `.trust`, `.trust-inner`, `.trust-label`, `.trust-logos` | Static badge row |
| `TrustBarF1` | waflow.jsx:547–558 | — | `Ic.shield`, `Ic.users`, `Ic.star` | — | `.trust-bar-f1` | Replaces `Trust` in F1 |
| `Destinations` | sections.jsx:151–246 | — | `ColombiaMap`, `Scenic`, `Ic.grid`, `Ic.pin`, `Ic.arrowUpRight` | `DESTINATIONS` (8) | `.section`, `.section-head`, `.tools`, `.view-toggle`, `.dest-grid`, `.dest-card`, `.c-12-4`, `.c-5-4`, `.c-4`, `.c-4-tall`, `.wash`, `.top-tag`, `.content`, `.cta-pill`, `.dest-map-view`, `.dest-map-stage`, `.dest-map-side`, `.dest-side-card`, `.dest-side-card.on`, `.dest-side-thumb`, `.dest-side-body`, `.region`, `.dest-side-num` | List/Map view toggle; layout = `["c-12-4","c-5-4","c-4","c-4","c-4-tall","c-4","c-4","c-4"]` (first big, fifth tall); hover on map side-card syncs with pin |
| `DestinationsF1` | app_f1.jsx:240–331 | `{ onNav }` | same | same | same | Same as above + onclick routes to `"destination"` page |
| `ExploreMap` | sections.jsx:249–338 | `{ onNav }` | `ColombiaMap`, `Scenic`, `Ic.arrow` | DESTINATIONS filtered by region | `.explore-map-section`, `.explore-map-grid`, `.explore-map-copy`, `.explore-map-stage`, `.region-legend`, `.region-legend-chip`, `.region-legend-chip.on`, `.explore-hover-card`, `.explore-hover-card.on`, `.ehc-right` | Only in non-F1 home; filter chips (all/Caribe/Andes/Selva); hover card appears with dest details |
| `Packages` | sections.jsx:341–422 | `{ onOpen }` | `Scenic`, `Rating`, `CountryChip`, `Ic.heart`, `Ic.calendar`, `Ic.users`, `Ic.arrow` | `PACKAGES` | `.filter-bar`, `.filter-tab`, `.filter-tab.active`, `.count`, `.pack-grid`, `.pack-card`, `.pack-media`, `.badges`, `.heart`, `.heart.on`, `.pack-body`, `.pack-loc-row`, `.pack-loc`, `.pack-header`, `.pack-meta`, `.m`, `.pack-foot`, `.pack-price` | Type tabs: all / playa / aventura / cultura / naturaleza with counts; save (heart) state local; footer CTA "Ver los 42 paquetes" |
| `Stats` | sections.jsx:425–450 | — | — | — | `.stats-row`, `.stat`, `.stat-num`, `.stat-label` | 4 static KPIs (copy below) |
| `Promise` | sections.jsx:453–489 | — | `Ic.pin`, `Ic.shield`, `Ic.leaf`, `Ic.sparkle`, `Ic.arrow` | — | `.promise`, `.list`, `.feat`, `.ic` | Dark band; 4 feature rows; CTA routes to `#/planners` |
| `PlannersSection` | sections.jsx:492–530 | `{ onNav }` | — | `PLANNERS.slice(0,4)` | `.planners`, `.planner`, `.planner-avatar`, `.role`, `.langs`, `.lg` | 4 planner cards, click → planner detail |
| `Testimonials` | sections.jsx:533–581 | — | `Ic.star` | `TESTIMONIALS` (4) | `.testi`, `.testi-big`, `.quote-mark`, `.testi-author`, `.av`, `.testi-list`, `.testi-mini`, `.testi-mini.active`, `.chip-ink` | One "big" testimonial + list of minis (select to swap); long quote is HTML via `dangerouslySetInnerHTML` |
| `Faq` | sections.jsx:584–615 | — | `Ic.plus`, `Ic.whatsapp` | `FAQ` (6) | `.faq`, `.faq-list`, `.faq-item`, `.faq-item.open`, `.faq-q`, `.plus`, `.faq-a` | Accordion (one open at a time) |
| `CtaBanner` | sections.jsx:618–638 | `{ onOpen }` | `Ic.arrow`, `Ic.whatsapp` | — | `.cta-banner`, `.actions` | Dark CTA band |
| `CtaBannerF1` | app_f1.jsx:447–466 | `{ onOpen }` | `Ic.whatsapp`, `Ic.arrow` | — | same + `.btn-wa-hero` | F1 equivalent; only WhatsApp CTA |
| `Footer` | sections.jsx:641–713 | `{ onNav }` | `Logo`, `Ic.ig`, `Ic.fb`, `Ic.tiktok`, `Ic.arrow`, `FooterSwitcher` | — | `.site-footer`, `.footer-grid`, `.footer-brand`, `.logo-foot`, `.footer-col`, `.footer-news`, `.footer-bottom` | 5 cols (brand + 3 nav + newsletter) + bottom line + locale/currency row |
| `Whatsapp` | sections.jsx:716–722 | — | `Ic.whatsapp` | — | `.wa-bubble` | Floating WhatsApp bubble (used in baseline app) |
| `Tweaks` | sections.jsx:725–768 | `{ open, tweaks, setTweaks }` | — | — | `.tweaks`, `.row`, `.swatches`, `.sw`, `.opts` | Dev/editor overlay (palette, density, sticky CTA). NOT to port to production. Posts messages to `window.parent`. |
| `PackageModal` | sections.jsx:771–842 | `{ pkg, onClose }` | `Scenic`, `Ic.close`, `Ic.check`, `Rating`, `Ic.arrow`, `Ic.whatsapp` | `pkg` | `.modal-backdrop`, `.modal`, `.modal-hero`, `.wash`, `.close`, `.title-area`, `.modal-body`, `.itinerary`, `.itin-day`, `.modal-aside`, `.price-big` | Superseded in current app by `PackageDetailV2` full-page. Keep for reference; NOT required in editorial-v1 port. |
| `PackageDetailF1Wrapper` | app_f1.jsx:473–481 | `{ pkg, onNav }` | `PackageDetailV2`, `PkgStickyWA` | `pkg` | — | Wraps detail with sticky WA bar (F1-only) |
| `PkgStickyWA` | app_f1.jsx:483–512 | `{ pkg, onOpen }` | `Ic.whatsapp`, `Ic.arrow` | `pkg` | inline styles only | Appears after `scrollY > 500`; slides up from bottom |

### F1 app router (`app_f1.jsx`) — orchestration only

Component `AppF1` / `AppF1Inner`: reads hash, switches between pages (`home, listing, detail, activity, search, contact, blog, post, experiences, planners, planner, destination`). Wires CTAs to `openFlow({variant: "A"|"B"|"D"})`. Sets `document.documentElement.dataset.palette / density` from tweaks.

`DestinationPageF1` (app_f1.jsx:334–444) — destination landing page: hero with Scenic + overlay + planner-availability chip; `TrustBarF1`; related packages grid (filtered by `p.dest.id`); `HowItWorks`; final dark CTA section.

---

## Detail pages (`details.jsx`, `pages.jsx`)

| Name | Source | Props | Children | Dynamic data | Classes | Behaviors |
|---|---|---|---|---|---|---|
| `PackageDetailV2` | details.jsx:173–540 | `{ pkg, onNav }` | `Scenic`, `Crumbs`, `Rating`, `GalleryStrip`, `ItineraryMap`, `RouteMap`, `DayEvent`, `HotelCard`, `TrustBadges`, `Ic.*` | `pkg`, `PACKAGES` (similar), `PLANNERS[0]` (assigned) | `.detail-hero`, `.wash`, `.gallery-toggle`, `.overview-bar`, `.ov-item`, `.detail-body`, `.detail-main`, `.highlights-grid`, `.hl-card`, `.day-list.day-list-v2`, `.day-card`, `.day-card.open`, `.day-head`, `.num`, `.day-summary`, `.evt-pill`, `.evt-pill-{t}`, `.chev`, `.day-body`, `.day-inner-v2`, `.day-timeline`, `.day-media`, `.hotels-grid`, `.flights-list`, `.flight-row`, `.f-ic`, `.f-route`, `.f-arrow`, `.f-meta`, `.incl-grid`, `.incl-col.yes`, `.incl-col.no`, `.mark`, `.price-table`, `.price-col`, `.price-col.featured`, `.price-col.selected`, `.pr`, `.per`, `.planner-detail`, `.planner-actions`, `.pack-grid`, `.pack-card`, `.detail-rail`, `.rail-price`, `.big`, `.rail-form`, `.fld`, `.rail-share`, `.rail-trust`, `.mobile-bar`, `.lightbox`, `.lb-close`, `.lb-stage`, `.lb-meta`, `.lb-nav` | State: `openDay, openFaq, tier, pax, month, saved, lightbox`. Sections in order: HERO → OVERVIEW BAR → GALLERY STRIP → ItineraryMap → RouteMap (linear) → INTRO → HIGHLIGHTS (6) → ITINERARY accordion (typed events per day) → HOTELS → FLIGHTS (conditional) → INCLUDE/EXCLUDE → PRICING TIERS → TRUST → FAQ → PLANNER → SIMILAR. Sticky right rail + mobile bottom bar + lightbox. |
| `PackageDetail` (legacy) | pages.jsx:229–501 | `{ pkg, onNav }` | simpler set | same as V2 but no maps, no flights, no hotels | subset of V2 | Simpler legacy version — **do NOT port**; V2 is canonical. |
| `ActivityDetail` | details.jsx:579–877 | `{ act, onNav }` | `Scenic`, `Crumbs`, `Rating`, `GalleryStrip`, `DayEvent`, `TrustBadges`, `ExpCard`, `Ic.*` | `act`, `ACTIVITIES` (similar) | shares `.detail-hero`, `.overview-bar`, `.detail-body`, `.detail-main`, `.highlights-grid`, `.hl-card`; plus `.act-timeline`, `.act-timeline-block`, `.atb-label`, `.meeting-map`, `.mm-map`, `.mm-pin`, `.mm-pulse`, `.mm-dot`, `.mm-chip`, `.mm-info`, `.mm-details`, `.recs-grid`, `.rec-card`, `.exp-grid` | State: `paxA, dateA, optA, saved, lightbox, openFaq`. Sections: HERO → OVERVIEW → GALLERY → INTRO + HIGHLIGHTS → TIMELINE (block[]) → MEETING POINT MAP → OPTIONS (3 tiers) → INCLUDE/EXCLUDE → RECOMMENDATIONS (4 cards: Ropa/Llevar/No llevar/Nivel) → TRUST → FAQ (4, contextual per level) → SIMILAR. Sticky rail (free or priced). |
| `PackagesListing` | pages.jsx:36–226 | `{ onNav, onOpenDetail }` | `PageHero`, `Scenic`, `Rating`, `CountryChip`, `ListingMap`, `Ic.*` | `PACKAGES`, `DESTINATIONS` | `.listing`, `.filters`, `.filter-group`, `.chip-filter`, `.chip-filter.on`, `.range`, `.val`, `.listing-top`, `.sort-sel`, `.view-toggle` | Filters: destinations multi, types multi, days ≤ n, price ≤ n, months multi; list/map view; sort: popular/priceAsc/priceDesc/duration/rating; empty state |
| `SearchPage` | pages.jsx:504–593 | `{ onNav, onOpenDetail }` | `PageHero`, `Scenic`, `Ic.search` | `DESTINATIONS`, `PACKAGES`, `ACTIVITIES` | `.search-big`, `.search-group`, `.sr-grid`, `.sr-card`, `.sr-media`, `.sr-body`, `.pr` | Inline search; three result groups (Destinos/Paquetes/Actividades); empty state with quote |
| `ContactPage` | pages.jsx:596–705 | `{ onNav }` | `PageHero`, `Ic.whatsapp`, `Ic.globe`, `Ic.pin`, `Ic.check`, `Ic.arrow` | — | `.contact-grid`, `.contact-info`, `.ways`, `.contact-way`, `.ic`, `.contact-form`, `.form-row`, `.form-row.two`, `.type-chips`, `.chip-filter` | Form with 4 type chips (paquete/personalizado/grupo/info); basic fields + message; success state with check icon |

---

## Other pages

### Experiences (`experiences.jsx`)

| Name | Source | Props | Children | Dynamic data | Classes | Behaviors |
|---|---|---|---|---|---|---|
| `ExperiencesPage` | experiences.jsx:146–371 | `{ onNav }` | `PageHero`, `ExpCard`, `Scenic`, `Rating`, `Ic.*` | `ACTIVITIES`, `EXP_CATS`, `DUR_BUCKETS`, `LEVEL_LABELS`, `EXP_REVIEWS` | `.exp-cats`, `.exp-cat`, `.exp-cat.active`, `.exp-featured`, `.exp-feat-media`, `.exp-feat-body`, `.exp-feat-meta`, `.exp-toolbar`, `.exp-search`, `.exp-dur-tabs`, `.sort-sel`, `.exp-filterbar`, `.exp-filter-group`, `.chip-filter`, `.exp-range`, `.exp-count`, `.exp-grid`, `.exp-cross`, `.exp-cross-body`, `.exp-cross-chips`, `.exp-cross-chip`, `.exp-cross-dot`, `.exp-reviews`, `.exp-review`, `.exp-review-foot`, `.exp-review-link`, `.exp-finalcta` | Filters: category (7), duration bucket (5), level multi (3), regions multi, price range [0–500], query text, sort popular/rating/priceAsc/Desc/duration; featured = first Imprescindible; cross-sell + featured reviews + final CTA |
| `ExpCard` | experiences.jsx:33–72 | `{ a, saved, onToggleSave, onOpen }` | `Scenic`, `Rating`, `Ic.*` | activity | `.exp-card`, `.exp-media`, `.exp-badges-left`, `.exp-badges-right`, `.heart`, `.heart.on`, `.exp-body`, `.exp-loc`, `.exp-title`, `.exp-sub`, `.exp-desc`, `.exp-rating`, `.exp-foot`, `.exp-dur`, `.exp-price`, `.level-leaf`, `.level-amber`, `.level-coral` | Heart toggle; clicking opens activity |
| `ExpModal` | experiences.jsx:75–143 | `{ a, onClose, onNav }` | `Scenic`, `Rating`, `Ic.*` | activity | `.modal-overlay`, `.exp-modal`, `.modal-close`, `.exp-modal-hero`, `.exp-modal-wash`, `.exp-modal-heroin`, `.exp-modal-loc`, `.exp-modal-meta`, `.exp-modal-body`, `.exp-modal-main`, `.exp-hl`, `.exp-modal-rail`, `.exp-modal-price`, `.exp-modal-notes` | Legacy; superseded by `ActivityDetail`. Keep for parity only. |
| `EXP_CATS`, `DUR_BUCKETS`, `LEVEL_LABELS`, `LEVEL_COLORS`, `EXP_REVIEWS` | experiences.jsx:4–30 | constants | — | — | — | See data catalog |

### Blog (`blog.jsx`)

| Name | Source | Props | Children | Dynamic data | Classes | Behaviors |
|---|---|---|---|---|---|---|
| `BlogList` | blog.jsx:140–241 | `{ onNav, onOpenPost }` | `PageHero`, `Scenic`, `Ic.*` | `BLOG_POSTS` | `.blog-featured`, `.blog-feat-media`, `.blog-feat-body`, `.blog-meta`, `.blog-toolbar`, `.blog-cats`, `.blog-search`, `.blog-grid`, `.blog-card`, `.blog-card-media`, `.blog-cat-tag`, `.blog-card-body` | Featured article + category tabs (`"all"` + distinct cats) with counts + search; grid of cards; empty state; fmt date `es-CO` `dd mmm yyyy` |
| `BlogPost` | blog.jsx:244–358 | `{ post, onNav, onOpenPost }` | `Scenic`, `Crumbs`, `Ic.*` | `post`, `BLOG_POSTS`, `PLANNERS` (avatar lookup) | `.post-hero`, `.wash`, `.post-author-line`, `.av`, `.post-body`, `.post-rail`, `.post-share`, `.post-tags`, `.post-main`, `.post-cta`, `.post-author-card`, `.post-related` | Renders body blocks: `h2, h3, p, quote, ul`; h2 uses `dangerouslySetInnerHTML` (contains `<em>`); related = same cat or fallback 3; CTA inviting to contact |
| `BLOG_POSTS` | blog.jsx:4–137 | 6 posts | — | — | — | See static copy catalog |

### Planners (`planners.jsx`)

| Name | Source | Props | Children | Dynamic data | Classes | Behaviors |
|---|---|---|---|---|---|---|
| `PlannersList` | planners.jsx:4–157 | `{ onNav, onOpenPlanner }` | `PageHero`, `Ic.*` | `PLANNERS`, `DESTINATIONS` | `.pl-intro`, `.stats`, `.s`, `.pl-toolbar`, `.pl-tabs`, `.filter-tab`, `.pl-grid`, `.pl-card`, `.top`, `.av`, `.who`, `.body`, `.quote`, `.meta-row`, `.it`, `.tags`, `.tg`, `.langs-row`, `.lg`, `.foot`, `.avail`, `.dot`, `.pl-match`, `.inner`, `.quiz`, `.opts`, `.opts button.on` | Region tabs filter (label→match), sort (non-functional); match-maker quiz: region × style → suggests planners by `styles` |
| `PlannerDetail` | planners.jsx:160–375 | `{ planner, onNav, onOpenDetail }` | `Scenic`, `Crumbs`, `Ic.*` | planner, `DESTINATIONS`, `PLANNER_REVIEWS`, `PACKAGES` | `.pld-hero`, `.big-av`, `.grid`, `.kpis`, `.k`, `.pld-body`, `.pld-main`, `.big-quote`, `.chips-row`, `.sig-card`, `.sig-media`, `.sig-body`, `.hall-grid`, `.facts`, `.fact`, `.review-card`, `.stars`, `.pld-rail`, `.avail-row`, `.resp` | Hero with avatar + kpis; large quote; bio; specialties + regions chips; signature trip card; other packages; fun facts; reviews grid; sticky rail with response time + CTAs; "Otros planners" grid |

---

## WhatsApp Flow (`waflow.jsx`) — in Other primitives above

See Primitives section — already inventoried (`WAFlowProvider`, `WAFlowDrawer`, `TrustBarF1`, `HowItWorks`, `WAFab`).

---

## CSS files (skim only — NOT inventoried)

Exist at: `styles.css` (global/base), `details.css`, `experiences.css`, `blog.css`, `planners.css`, `pages.css`, `maps.css`, `waflow.css`. Classes resolve against these files; see `inventory-classes.md` for the grouped class map.

---

# Static copy catalog (for content seeding)

All copy is in **Spanish (es-CO)** unless noted. Copy verbatim — will be seeded into DB.

### Header (`SiteHeader`, `SiteHeaderF1`)
- Nav links: `Destinos`, `Paquetes`, `Experiencias`, `Travel Planners`, `Blog`
- CTA baseline: `Cotizar viaje`
- CTA F1: `Planea mi viaje` (with WhatsApp icon, green bg `#25D366`)
- Logo tagline: `Operador local · desde 2011`
- Logo alt: `ColombiaTours.travel`

### Hero (baseline `Hero`)
- eyebrow: `Operador local · 14 años en Colombia`
- title (multiline): `Colombia` / `<em>como la cuenta</em>` / `quien la camina.`
- subtitle (lead): `Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.`
- CTAs: `Planea mi viaje`, `Ver paquetes`
- Side eyebrow: `Destino del mes`
- Side list items:
  - `01 · Cartagena · Caribe`
  - `02 · Tayrona · Sierra`
  - `03 · Eje Cafetero · Andes`
  - `04 · Medellín · Antioquia`
- Meta footer: `Presentando · {region}` · dots · `{index} / {total}` (zero-padded)

### HeroSearch (baseline)
- Field labels: `Destino`, `Cuándo`, `Viajeros`
- Defaults: `Caribe · Colombia`, `Octubre 2026 · 7 noches`, `2 viajeros`
- CTA: `Buscar`

### Hero F1 (`HeroF1`)
- Same eyebrow, title, subtitle as baseline.
- CTA: `Planea mi viaje por WhatsApp`
- Live status: `Responden en ~3 min` (green dot)

### Trust (baseline `Trust`)
- Label: `Reconocidos por`
- Logos: `ProColombia`, `ANATO`, `Travellers' Choice`, `MinCIT`, `Rainforest`, `RNT 83412`

### TrustBarF1
- Items:
  - `Planners en línea · responden en ~3 min` (live dot)
  - `RNT 83412 · Operador local desde 2011` (shield)
  - `Revisado por humanos · cada itinerario` (users)
  - `4.9/5 · 3,200+ reseñas verificadas` (star)

### Destinations (`Destinations`, `DestinationsF1`)
- eyebrow: `Destinos`
- title: `Ocho Colombias <serif>en un mismo viaje.</serif>`
- body: `Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo.`
- toggle labels: `Lista`, `Mapa`
- (dest names, regions, subtitles all come from `DESTINATIONS` data — see Destinations data below)

### ExploreMap (baseline only)
- eyebrow: `Explora Colombia`
- title: `Un país <serif>en cada región.</serif>`
- subtitle: `Del Caribe al Amazonas, de los Andes al Pacífico. Pasa el cursor por el mapa para ver a dónde puedes ir — o filtra por región.`
- Region filter labels: `Todos`, `Caribe`, `Andes`, `Selva`
- CTAs: `Ver paquetes`, `Buscar destino`
- Hover card action: `Ver paquetes`

### Packages (home section)
- eyebrow: `Paquetes`
- title: `Itinerarios pensados, <serif>listos para ajustarse a ti.</serif>`
- Tabs: `Todos`, `Playa`, `Aventura`, `Cultura`, `Naturaleza`
- Card CTA: `Ver ruta`
- Card meta: `{days} días / {nights} noches`, `{group}`, `Desde · por persona`, `{currency}{price}`
- Footer CTA: `Ver los 42 paquetes`

### HowItWorks (F1)
- eyebrow: `Cómo funciona`
- title (multiline): `Tu viaje <em>en 3 pasos,</em>` / `sin formularios largos.`
- subtitle: `Dejamos atrás los PDFs con precios genéricos. Hoy diseñamos contigo por WhatsApp — rápido como mensajear a un amigo, pero con la mano de un planner experto.`
- Steps:
  - `01. Cuéntanos en 30 segundos.` / `Destino, fechas aproximadas y quiénes viajan. Nada de formularios largos — 5 campos, chips para tocar.` / meta: `30 segundos`
  - `02. WhatsApp con un humano.` / `Un planner de carne y hueso te escribe. Usa IA para ser rápido; revisa cada propuesta antes de enviártela.` / meta: `Responde en 3 min`
  - `03. Propuesta en 24h.` / `Recibes 2–3 rutas posibles con precio, hoteles y actividades. Ajustas con tu planner hasta que sea tuya.` / meta: `En 24h hábiles`
- Bottom CTA: `Empezar por WhatsApp`
- Bottom meta: `Sin costo · sin compromiso · respuesta en ~3 min`

### Stats (home `Stats`)
- `12.4k+` — `viajeros en 14 años`
- `4.9/5` — `promedio en 3,200 reseñas`
- `96%` — `recomendaría a un amigo`
- `32` — `destinos únicos en Colombia`

### Promise (baseline)
- eyebrow: `Por qué ColombiaTours`
- title: `Un viaje bien hecho <em>se nota.</em>`
- body: `No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado.`
- CTA: `Hablar con un planner`
- Features:
  - pin — `Operador local, no intermediario` — `Somos la agencia. Sin triangulaciones ni sorpresas de último momento.`
  - shield — `Viaje asegurado de punta a punta` — `Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.`
  - leaf — `Turismo con impacto` — `Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.`
  - sparkle — `Diseño a tu medida` — `Tu planner asignado ajusta itinerario, hoteles y ritmo hasta que sea exactamente tu viaje.`

### PlannersSection (home)
- eyebrow: `Tu planner`
- title: `Una persona <serif>que te conoce</serif> de principio a fin.`
- body: `Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas.`
- CTA: `Ver todos`
- Card bottom: `{years} años diseñando viajes a medida.`

### Testimonials
- eyebrow: `Testimonios`
- title: `El recuerdo <serif>después del viaje.</serif>`
- Chip: `4.9 · 3,218 reseñas verificadas`
- (quotes come from `TESTIMONIALS` data)

### FAQ
- eyebrow: `Preguntas frecuentes`
- title: `Lo que <serif>nos preguntan</serif> antes de reservar.`
- body: `¿No encuentras la respuesta? Escribe a tu planner — respondemos en <2h hábiles.`
- CTA: `Chat por WhatsApp`
- Q/A pairs (6):
  - Q: `¿Es seguro viajar a Colombia hoy?` / A: `Sí. Nuestros destinos son áreas turísticas consolidadas, con protocolos de seguridad y guías locales certificados. Hacemos monitoreo permanente y ajustamos rutas si hace falta.`
  - Q: `¿Qué incluye el precio del paquete?` / A: `Alojamiento, traslados terrestres/aéreos especificados, tours guiados, entradas a parques y desayunos. Revisa la ficha de cada paquete — marcamos con check lo incluido y con dash lo opcional.`
  - Q: `¿Puedo personalizar el itinerario?` / A: `Todos los paquetes son punto de partida. Tu planner asignado puede agregar días, cambiar hoteles, sumar actividades o reemplazar destinos. Sin costo por ajustar antes de confirmar.`
  - Q: `¿Cómo se paga la reserva?` / A: `30% para confirmar, saldo 30 días antes del viaje. Aceptamos tarjeta internacional, PSE, transferencia y, para USA/EU, también PayPal y link de pago.`
  - Q: `¿Qué pasa si tengo que cancelar?` / A: `Cancelación flexible hasta 45 días antes (reembolso 90%). Entre 45 y 15 días, 50%. Menos de 15 días, el anticipo queda como crédito de viaje por 12 meses.`
  - Q: `¿Necesito vacunas o visa?` / A: `La mayoría de pasaportes no requiere visa por menos de 90 días. Fiebre amarilla es recomendada (no obligatoria) para Amazonas y Pacífico. Te enviamos la checklist exacta según tu nacionalidad.`

### CTA band (`CtaBanner`, `CtaBannerF1`)
- eyebrow: `Empieza hoy`
- title: `Tu Colombia, <em>en 3 pasos.</em>`
- body baseline: `Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres.`
- body F1: `Cuéntanos qué buscas en 30 segundos. Tu planner te escribe por WhatsApp con propuesta en 24h.`
- CTAs baseline: `Planea mi viaje`, `Chat WhatsApp`
- CTA F1: `Planea mi viaje`

### Footer
- Brand headline: `Viaja más hondo.`
- Brand body: `Somos un operador local con sede en Medellín. Diseñamos viajes por Colombia desde 2011, con guías locales y alojamientos familiares.`
- Col "Destinos": `Cartagena`, `Eje Cafetero`, `Tayrona`, `San Andrés`, `Amazonas`, `Ver todos`
- Col "Viajar": `Paquetes`, `Buscar`, `Hoteles boutique`, `Luna de miel`, `Grupos y corporativo`
- Col "Agencia": `Sobre nosotros`, `Nuestros planners`, `Blog`, `Prensa`, `Contacto`
- Col "Recibe historias": heading `Recibe historias` / body `Un correo al mes con rincones que nos enamoran y descuentos.` / placeholder `tu@correo.com` / CTA `Suscribirme`
- Bottom line: `© 2026 ColombiaTours.travel · RNT 83412 · NIT 900.xxx.xxx-9`
- Bottom links: `Privacidad`, `Términos`, `Política de cancelación`
- Preferences row: title `Preferencias` / body `Elige tu idioma y la moneda en que quieres ver los precios.`

### PageHero (generic)
- Per-page copy:
  - **Packages listing** — eyebrow `Catálogo` / title `Paquetes <em>por toda Colombia.</em>` / subtitle `Itinerarios diseñados por planners locales. Ajustables, flexibles, punto de partida para tu viaje.`
  - **Experiences** — `Experiencias` / `Actividades <em>para sumar a tu viaje.</em>` / `Oficios, caminatas, cocina, mar, selva. Reservables sueltas o como add-on a cualquier paquete.`
  - **Blog** — `Blog` / `Historias <em>desde adentro.</em>` / `Escrito por los planners que caminan Colombia todos los meses. Guías, itinerarios, oficios y rincones.`
  - **Planners** — `Nuestros planners` / `Una persona <em>que conoce su tierra.</em>` / `Seis especialistas locales. Cada uno con una región, un oficio y 5–11 años diseñando viajes a medida por Colombia.`
  - **Search** — `Buscar` / `¿Adónde <em>te llevamos?</em>` / `Busca por destino, paquete, actividad o pregunta.`
  - **Contact** — `Contacto` / `Cuéntanos <em>qué sueñas.</em>` / `Un planner te responde en <2 horas hábiles con una primera propuesta.`

### PackagesListing
- Filter headings: `Filtros`, `Destino`, `Tipo de viaje`, `Duración (días)`, `Precio máx (USD)`, `Mes de salida`
- Sort options: `Ordenar: Más populares`, `Precio · menor a mayor`, `Precio · mayor a menor`, `Duración · más largos`, `Mejor calificados`
- Clear label: `Limpiar`
- Empty state: title `Ningún paquete con esos filtros` / body `Prueba ensanchando el rango o limpiando filtros.` / CTA `Limpiar filtros`
- Card meta: `Desde · por persona`, `Ver`
- Load more: `Cargar más`

### Package detail (`PackageDetailV2`)
- Gallery toggle: `Ver 24 fotos`
- Overview bar labels: `Duración`, `Destinos`, `Grupo`, `Dificultad` (`Moderada`), `Mejor época` (`Dic – Abr`), `Idiomas` (`ES · EN · FR`)
- Intro h2: `Un viaje que <em>sabe a Colombia.</em>`
- Intro body (dynamic): `Este paquete recorre {pkg.subtitle.toLowerCase()} en {pkg.days} días hechos a la medida del viajero que quiere ver, comer, caminar y quedarse un rato más. Nada de listas infinitas: paramos donde hay que parar, caminamos cuando hay que caminar, y dejamos espacio para lo que nadie planea pero todo mundo recuerda.`
- Highlights (6 cards):
  - sparkle · `Ruta a ritmo humano` · `Ni carrera ni relleno.`
  - users · `Guías que viven allá` · `Conocen personas, no solo lugares.`
  - leaf · `Hoteles con historia` · `Fincas y boutiques, no cadenas.`
  - shield · `Asistencia 24/7` · `Planner respondiendo en menos de 2h.`
  - compass · `Logística resuelta` · `Todo coordinado, un contacto.`
  - award · `12 años, 3,200 reseñas` · `RNT vigente, seguros verificados.`
- Itinerary h2: `Itinerario <em>día a día</em>` / body `Cada día con horario, transporte, comidas y alojamiento. Todo ajustable por tu planner.`
- Hotels h2: `Alojamientos <em>seleccionados</em>` / body `Hoteles boutique y fincas curadas por tu planner. Se pueden subir o bajar de categoría sin cambiar el resto del viaje.`
- Flights h2: `Vuelos <em>domésticos</em>` / body `Incluidos en el paquete. Horarios confirmados al cotizar.`
- Include h2: `Qué <em>incluye y no</em> incluye` / cols: `Incluido en el precio`, `No incluido`
- Included (8): `Traslados aeropuerto ↔ hotel (privados)`, `{N} noches de alojamiento en hotel boutique`, `Vuelos domésticos especificados`, `Tours guiados en cada destino`, `Entradas a parques y sitios`, `Desayuno diario · 2 cenas de bienvenida/despedida`, `Asistencia telefónica 24/7 en español e inglés`, `Seguro médico básico`
- Excluded (6): `Vuelos internacionales`, `Comidas no especificadas`, `Bebidas alcohólicas`, `Propinas a guías y conductores`, `Gastos personales`, `Seguro de cancelación opcional (+6% del total)`
- Pricing h2: `Opciones <em>de precio</em>` / body `Elige la línea que mejor te acomode — tu planner puede mezclar hoteles entre categorías.`
- Tiers:
  - `Esencial` — `Hoteles 3★ bien ubicados`, `Traslados compartidos`, `Tours grupales` (0.85× price)
  - `Clásico` (featured) — `Hoteles 4★ boutique`, `Traslados privados`, `Tours privados con guía` (1× price)
  - `Premium` — `Hoteles 5★ destacados`, `Chofer privado todo el viaje`, `Cenas en restaurantes curados` (1.45× price)
- Per row: `por persona · habitación doble`
- Tier CTA: `Elegir {tier}`
- Trust h2: `Viaja <em>con respaldo</em>`
- FAQ h2: `Preguntas <em>frecuentes</em>` (5 Q/A):
  - `¿Qué nivel de forma física necesito?` / `Para este paquete basta con caminatas cortas de hasta 2h. Las rutas más exigentes son opcionales y siempre con guía.`
  - `¿Es apto para niños?` / `Sí, desde los 6 años. Tenemos variantes familiares con habitaciones conectadas y actividades adaptadas.`
  - `¿Qué pasa si hay mal tiempo?` / `Ofrecemos plan B por día. Si una actividad debe cancelarse por clima, se reprograma o se reembolsa ese tramo.`
  - `¿Puedo extender el viaje?` / `Totalmente. Al momento de confirmar, tu planner te propone extensiones (Amazonía, Pacífico, San Andrés).`
  - `¿Cómo es el proceso de reserva?` / `Reservas con 30% de anticipo, el saldo 30 días antes. Firmamos contrato digital y recibes documento de viaje consolidado 2 semanas antes.`
- Planner h2: `Tu planner <em>asignado</em>`
- Planner quote template (dynamic): `"{pkg.dest.name} es mi territorio. Conozco el chef que hace el mejor plato, al guía que sabe la historia real, y los rincones donde la gente local todavía va."`
- Planner actions: `WhatsApp`, `Ver perfil`
- Similar h2: `Paquetes <em>similares</em>`
- Rail: eyebrow `Desde · por persona` / meta `{days} días · hab. doble · temp. media`
- Rail form labels: `Fecha salida`, `Viajeros`, `Categoría`
- Rail months: `Oct 2026`, `Nov 2026`, `Dic 2026`, `Ene 2027`, `Feb 2027`, `Mar 2027`
- Rail CTAs: `Solicitar cotización`, `Chat directo`
- Rail share: `Guardar` / `Compartir` (Guardado when active)
- Rail trust (3): `Cancelación flexible 45d antes`, `Sin cargo por reservar`, `Contrato digital`
- Mobile bar: `Desde`, CTA `Cotizar`
- Lightbox meta: `Foto {i} de 24`

### TrustBadges (shared)
- `RNT vigente` — `Registro Nacional de Turismo · MinCIT`
- `4.9/5 · 3,200 reseñas` — `Google, Tripadvisor, Trustpilot`
- `Protocolos de seguridad` — `Verificados en cada destino`
- `Guías certificados` — `Todos con seguro y bilingües`

### RouteMap
- Label: `Ruta del viaje`
- Meta: `{N} paradas · recorrido completo`

### ItineraryMap
- Label: `Ruta en el mapa`
- Meta: `{N} paradas · {nights} noches`
- Legend title: `Paradas del viaje`
- Footer: `Ruta estimada · los traslados se ajustan según vuelos y clima`

### ActivityDetail
- Gallery toggle: `Ver 12 fotos`
- Overview bar: `Duración`, `Salida`, `Nivel`, `Idiomas` (`ES · EN`), `Grupo` (`Hasta 10`), `Reseñas`
- Intro h2: `Qué esperar <em>de esta experiencia.</em>`
- Timeline h2: `Programa <em>paso a paso</em>` / body `Tiempos aproximados — ajustables por clima y ritmo del grupo.`
- Meeting h2: `Punto de <em>encuentro</em>` / meeting-chip `Meeting point`
- Meeting info: label `Dirección` / body `Encuentro con tu guía en el punto acordado. Te enviamos la ubicación exacta con indicaciones al confirmar la reserva.`
- Meeting details (3):
  - clock · `Llegada: 10 min antes de las {act.time}`
  - compass · `Cómo llegar: taxi, Uber o caminando`
  - users · `Tu guía lleva camiseta de ColombiaTours`
- Options h2: `Opciones <em>disponibles</em>`
- Options:
  - `Compartida` — `Grupo de hasta 10`, `Transporte compartido`, `Guía general` (0.8×)
  - `Regular` (featured) — `Grupo de hasta 6`, `Traslado desde hotel`, `Guía especializado` (1×)
  - `Privada` — `Solo tu grupo`, `Horario personalizable`, `Guía senior` (1.8×)
- Per: `por persona`
- Option CTA: `Elegir` / `Seleccionada`
- Include h2: `Qué <em>incluye</em>`
- Excluded (always 4): `Traslado desde/al hotel (opcional)`, `Propinas al guía`, `Bebidas extra`, `Gastos personales`
- Recommendations h2: `Recomendaciones <em>para el día</em>`
- Recs (4):
  - `Ropa` — `Cómoda y por capas. Zapatos cerrados con agarre.`
  - `Llevar` — `Agua, cámara, protector solar y repelente.`
  - `No llevar` — `Valores innecesarios ni zapatos nuevos.`
  - `Nivel` — `{level label} · apto si puedes caminar a paso medio.`
- Trust h2: `Con <em>respaldo</em>`
- FAQ h2: `Preguntas <em>frecuentes</em>` (4 contextual per level):
  - `¿Se puede cancelar?` / `Sí. Cancelación gratuita hasta 48h antes. Después de ese plazo, se retiene 50%.`
  - `¿Qué pasa si llueve?` / `La experiencia se realiza con lluvia ligera. Si la lluvia es fuerte, se reprograma sin costo.`
  - `¿Incluye recogida en hotel?` / `Sí, si tu hotel está dentro del radio urbano del meeting point. De lo contrario, acuerdan punto cercano.`
  - `¿Los niños pueden participar?` / exigente: `No recomendado para menores de 14 años por nivel físico.` · else: `Sí, desde los 7 años con acompañante.`
- Similar h2: `Experiencias <em>similares</em>`
- Rail price label: `Desde · por persona`
- Rail select labels: `Fecha` (options `Próxima disponibilidad`, `Mañana`, `Este fin de semana`, `Próxima semana`, `Elegir fecha…`), `Personas`, `Opción`
- Rail CTAs: `Reservar experiencia`, `Sumar a un paquete`
- Rail trust: `Cancelación hasta 48h antes`, `Guía bilingüe certificado`, `Grupos pequeños`
- Price free: `Gratis`
- Mobile bar: `Desde`, CTA `Reservar`

### Experiences page
- Category tiles (from `EXP_CATS`):
  - `Todas` · `14 experiencias`
  - `Aventura` · `caminar, volar, escalar`
  - `Gastronomía` · `cocina, café, mercados`
  - `Cultura` · `música, historia, pueblos`
  - `Naturaleza` · `fauna y selva`
  - `Mar` · `buceo y navegación`
  - `Bienestar` · `retiros y silencio`
- Duration buckets (`DUR_BUCKETS`): `Cualquiera`, `Menos de 4h`, `Medio día`, `Día completo`, `Multi-día`
- Level labels: `Fácil`, `Moderado`, `Exigente`
- Featured chip: `Imprescindible del mes`
- Featured meta labels: `Duración`, `Salida`, `Nivel`, `Desde`
- Featured CTA: `Ver detalles`
- Toolbar search placeholder: `Buscar experiencias…`
- Sort options: `Más populares`, `Mejor calificadas`, `Precio · menor a mayor`, `Precio · mayor a menor`, `Duración · más cortas`
- Filter group labels: `Región`, `Nivel`, `Precio máx`
- Clear: `Limpiar todo`
- Count: `{N} de {total} experiencias`
- Empty: title `Nada con esos criterios` / body `Ajusta los filtros o empieza de cero.` / CTA `Limpiar filtros`
- Cross-sell:
  - label `Cross-sell`
  - title `Sumá cualquier experiencia <em>a un paquete.</em>`
  - body `Si ya elegiste un paquete, tu planner asignado puede agregar estas actividades al itinerario sin complicaciones — ajustando horarios, traslados y comidas.`
  - CTA `Ver paquetes`
- Reviews:
  - title `Reseñas <serif>destacadas.</serif>` / label `Últimos 30 días`
  - EXP_REVIEWS (3): see data
- Final CTA:
  - label `No encuentras lo tuyo`
  - title `Diseñamos experiencias <em>a medida.</em>`
  - body `Si tu idea no está en el catálogo, cuéntanos. Un planner local la arma en 24h.`
  - CTA `Contarle a un planner`

### Blog
- Card CTA: `Leer artículo`
- Load more: `Cargar más historias`
- Search placeholder: `Buscar historias…`
- Filter "all" label: `Todo`
- Empty: `Nada con esos criterios` / `Prueba otra categoría o palabra.`
- Detail rail: `Compartir`, `Etiquetas`
- Detail CTA block:
  - label `¿Te gustaría vivirlo?`
  - title `Diseñamos un viaje a tu medida <em>por esta región.</em>`
  - body `Cuéntale a {author.firstName} qué te interesa y recibe una propuesta en 24h.`
  - CTAs `Planear mi viaje`, `WhatsApp`
- Author card: label `Escrito por` / body `{authorRole}. Diseña rutas en Colombia para viajeros que quieren ir más hondo que la guía.` / CTA `Ver perfil`
- Related: title `Sigue <serif>leyendo.</serif>` / CTA `Ver todo el blog`

### Planners
- Intro (list):
  - eyebrow `Por qué un planner local`
  - title `No somos un motor de reservas — <em>somos seis personas</em> que han caminado Colombia.`
  - body `Cuando reservas con nosotros, no hablas con un call center. Te emparejamos con la persona que vive en la región donde quieres ir, habla tu idioma, y conoce a los chefs, guías, y familias que harán tu viaje distinto al de los demás.`
  - Stats: `6` `Planners locales` · `4.97/5` `Reseñas promedio` · `939` `Viajes diseñados`
- Tabs: `Todos`, `Caribe` (key `Cartagena`), `Eje Cafetero`, `Amazonas / Pacífico` (key `Amazonas`), `Aventura` (key `Sierra Nevada`), `Medellín`, `Pacífico Sur` (key `Cali`)
- Sort helper: `{N} planners · ordenar por reseñas`
- Card availability prefix: from `planner.availability`
- Matchmaker:
  - eyebrow `Encuentra tu planner`
  - title `Dinos qué buscas <em>y te emparejamos</em> en 30 segundos.`
  - body `No todos los planners hacen todas las regiones. Cuéntanos dónde quieres ir y qué te mueve — nosotros sabemos quién firma ese viaje.`
  - CTA `Hablar con mi match`
  - Labels: `¿A qué región vas?` / `¿Qué estilo de viaje?` / `Match sugerido`
  - Regions: `Caribe`, `Andes`, `Amazonas`, `Pacífico`, `Aventura`
  - Styles: `Cultura`, `Aventura`, `Naturaleza`, `Gastronomía`, `Boutique`
- Detail page:
  - Sections h2: `Sobre <em>{firstName}</em>`, `Lo que <em>hace diferente</em>` (sub-labels `Especialidades`, `Regiones`), `Viaje <em>firma</em>` (label `ITINERARIO DESTACADO`), `Otros paquetes <em>que diseña</em>`, `Detalles <em>personales</em>`, `Lo que dicen <em>viajeros de {firstName}</em>`, `Otros <em>planners</em>`
  - Signature chip: `Firma de {firstName}`
  - Signature CTAs: `Ver itinerario`, `Pedirle a {firstName}`
  - Rail: `Hablar con`, resp labels `Tiempo de respuesta`, `Desde`, `Idiomas`, CTAs `Escribir a {firstName}`, `Pedir propuesta`, body `Sin compromiso · Primera propuesta en <2h hábiles`
  - Availability fallback: `Disponible`

### Search
- Input placeholder: `Cartagena, Eje Cafetero, caminata...`
- Button: `Buscar`
- Groups: `Destinos`, `Paquetes`, `Actividades` (each with `Ver todos/todas →`)
- Empty state: `Nada para "{query}"` / `Prueba con otra palabra, o mira lo más buscado abajo.`

### Contact
- h2: `Tres formas <em>de escribirnos.</em>`
- body: `Siempre responde una persona — no un bot ni un formulario en cola. Si quieres hablar antes de escribir, el WhatsApp es el camino más rápido.`
- Ways:
  - WhatsApp: `+57 310 123 4567 · Responde en <15 min`
  - Email: `hola@colombiatours.travel` · `Correo · respuesta en <2h hábiles`
  - Address: `Cr 43A #14-52, El Poblado` · `Medellín, Colombia · Lun–Vie 9:00–18:00`
- Form:
  - title: `Cuéntanos de tu viaje`
  - hint: `Campos con * son necesarios — el resto nos ayuda a ajustar mejor.`
  - Type chips: `Un paquete específico`, `Algo a la medida`, `Grupo / corporativo`, `Información general`
  - Field labels: `Nombre *`, `Correo *`, `Teléfono / WhatsApp`, `Viajeros`, `Fechas aproximadas`, `Presupuesto por persona`, `Cuéntanos más (opcional)`
  - Placeholders: `Tu nombre`, `tu@correo.com`, `+57 310 ...`, `Oct – Nov 2026`, `Qué te interesa, con quién viajas, si es aniversario, primera vez en Colombia, etc.`
  - Travelers options: `1 persona`, `2 personas`, `3–4 personas`, `5+ personas`
  - Budget options: `< $1,000 USD`, `$1,000 – $2,000`, `$2,000 – $4,000`, `$4,000+`, `Flexible`
  - CTA: `Enviar mensaje` · hint `Respondemos en <2h hábiles`
  - Success: title `¡Enviado!` / body `Mariana o alguien del equipo te escribe en las próximas 2 horas hábiles.` / CTA `Enviar otro`

### WhatsApp Flow (`WAFlowDrawer`)
- Live eyebrow: `Planners en línea ahora` (with green dot)
- Variant A: title `Cuéntanos <em>qué sueñas.</em>` / subtitle `Te contactamos en WhatsApp con un planner humano. Respondemos en promedio en 3 min.`
- Variant B: title `Viaja a <em>{destination.name}</em>.` / subtitle `Cuéntanos los detalles básicos y tu planner te arma una propuesta en 24h.` / pill `📍 {name} · {region}`
- Variant D: title `<em>{pkg.title}</em> — hazlo tuyo.` / subtitle `Ajustamos fechas, hoteles y actividades hasta que sea el viaje que quieres.` / pill `📦 {title} · {days}D/{nights}N · desde {currency}{price}`
- Field labels:
  - `¿Ya tienes un destino en mente?` (opt)
  - `¿Cuándo te gustaría viajar?` (aprox)
  - `¿Cuántos viajeros?`
  - `¿Qué te interesa?` + sublabel `(máx. 3)` (opt)
  - `¿Quieres ajustar algo del paquete?` (opt, variant D)
  - `Tu nombre` (req)
  - `Tu WhatsApp` (req)
- Variant A destination chips: `Cartagena`, `Eje Cafetero`, `Tayrona`, `San Andrés`, `Amazonas`, `No sé aún`
- When options (`WHEN_OPTIONS`): `Este mes`, `Próximo mes`, `En 2–3 meses`, `En 6 meses`, `Fin de año`, `Flexible`
- Steppers: `Adultos` (`13+ años`) / `Niños` (`0–12 años`)
- Base interests (`BASE_INTERESTS`): `Relax`, `Aventura`, `Cultura`, `Gastronomía`, `Naturaleza`, `Familiar`
- Per-dest interests (`DEST_INTERESTS`):
  - cartagena: `Relax, Playa, Historia, Gastronomía, Vida nocturna, Familiar`
  - san-andres: `Playa, Buceo, Relax, Familiar, Gastronomía, Aventura`
  - eje-cafetero: `Naturaleza, Aventura, Café, Cultura, Avistamiento, Familiar`
  - tayrona: `Aventura, Playa, Naturaleza, Senderismo, Cultura, Relax`
  - medellin: `Cultura, Gastronomía, Vida nocturna, Arte urbano, Naturaleza, Familiar`
  - guatape: `Naturaleza, Aventura, Relax, Familiar, Cultura, Gastronomía`
  - desierto: `Aventura, Cultura, Naturaleza, Off-grid, Etnoturismo, Familiar`
  - amazonas: `Naturaleza, Aventura, Etnoturismo, Avistamiento, Cultura, Familiar`
- Package adjust (`PKG_ADJUST`): `Está perfecto así`, `Agregar días`, `Cambiar hotel`, `Agregar actividades`, `Cambiar fechas`
- Error messages: `Escribe tu nombre`, `Número de {len} dígitos para {country.name}`, `Cuéntanos algo: destino, fechas o un interés`
- Input placeholders: `Juan Pérez` · CO phone `300 123 4567` · else `número`
- Footer:
  - Live pill: `Planners en línea` / `Responden en ~3 min`
  - Submit copy by variant: A `Continuar en WhatsApp` · B `Planear mi viaje a {destination.name}` · D `Continuar con este paquete`
  - Skip link: `Prefiero contarlo en el chat →`
  - Privacy: `Tu número se usa solo para este viaje. Sin spam. Sin llamadas automáticas.`
- Success step:
  - eyebrow: `Conectando`
  - title: `WhatsApp se abrió en una pestaña nueva.`
  - body: `Si no se abrió, toca el botón verde. Tu planner responde en promedio en 3 min y te escribe también desde nuestro lado.`
  - CTAs: `Abrir WhatsApp`, `Seguir explorando`
  - Ref badge prefix: `Ref: {sessionRef}`
- Quick-skip messages:
  - A: `¡Hola! Quiero planear un viaje por Colombia 👋\n\n#ref: {ref}`
  - B: `¡Hola! Quiero planear un viaje a {destination.name} 👋\n\n#ref: {ref}`
  - D: `¡Hola! Me interesa el paquete "{pkg.title}" 👋\n\n#ref: {ref}`
- WA message bodies (per variant) — see waflow.jsx:64–100 for templates (emojis: 👋 📍 📅 👥 ✨ 📦 🛠️).

### WAFab (Floating WA button)
- Bubble: `¿Planeas un viaje?` / `Chatea con un planner — responde en ~3 min`
- Close: `×`

### DestinationPageF1 (F1)
- Back link: `← Volver a destinos`
- Hero title (dynamic): `{destination.name}` + optional `<em>{emphasis}</em>`
- Hero subtitle (dynamic): `{destination.tag}. Desde {destination.subtitle.split('·')[1].trim()} de experiencias diseñadas con guías locales.`
- CTA: `Planear mi viaje a {destination.name}`
- Availability: `Planner experto en {destination.region} en línea`
- Related h2: `Paquetes en {destination.name}` / `Itinerarios <serif>para empezar.</serif>` / body `Puntos de partida para tu viaje. Tu planner los ajusta contigo.`
- Final dark CTA:
  - eyebrow `¿Listo?`
  - title `{destination.name} te espera.`
  - body `Cuéntanos cuándo y con quiénes vas. En 30 segundos te ponemos con un planner que conoce {destination.region} al dedillo.`
  - CTA `Empezar por WhatsApp`

### PkgStickyWA (F1 bottom bar on package detail)
- Label: `Desde · por persona`
- CTA: `Continuar por WhatsApp`

### Tweaks panel (dev-only, skip for production)
- Palettes (4): caribe, andes, selva, cafe
- Densities: snug, roomy, airy
- Sticky CTA: On / Off

### MarketSwitcher popover
- Head: `Personaliza tu <em>experiencia</em>`
- Desc: `Idioma del sitio y moneda de precios.`
- Sublabels: `Idioma`, `Moneda`
- Foot: `Guardado en este navegador`
- Reload message: `Cargando en {L.native}…`

---

# Data catalog (for DB seeding)

### DESTINATIONS (8)
| id | name | emphasis | tag | subtitle | region |
|---|---|---|---|---|---|
| cartagena | Cartagena | de Indias | Caribe colonial | Ciudad amurallada · 3–5 días | Caribe |
| san-andres | San Andrés | & Providencia | Mar de 7 colores | Isla · 4–6 días | Caribe |
| eje-cafetero | Eje Cafetero | — | Paisaje cultural | Quindío · Salento · 3 días | Andes |
| tayrona | Tayrona | — | Selva · costa | Santa Marta · 2–4 días | Caribe |
| medellin | Medellín | — | Ciudad primavera | Antioquia · 2–3 días | Andes |
| guatape | Guatapé | — | Peñón · embalse | Antioquia · 1–2 días | Andes |
| desierto | La Guajira | — | Desierto · mar | Cabo de la Vela · 4 días | Caribe |
| amazonas | Amazonas | — | Leticia · selva | Amazonas · 4–6 días | Selva |

(Each has a `scene: { bg, layers[] }` — gradient + placeholder shapes; will be replaced by real imagery. See data.jsx for exact layer specs.)

### PACKAGES (6)
| id | title | subtitle | loc | d/n | group | price | badges | type | dest |
|---|---|---|---|---|---|---|---|---|---|
| p1 | Caribe Esencial | Cartagena · Islas del Rosario · San Andrés | Caribe Colombiano | 7/6 | 2–8 pax | 1890 USD | [Más vendido] | playa | cartagena |
| p2 | Cafeteros & Cocora | Salento · Valle de Cocora · Filandia | Eje Cafetero | 5/4 | 2–6 pax | 1290 USD | [Eco] | cultura | eje-cafetero |
| p3 | Aventura Tayrona | Santa Marta · Minca · Parque Tayrona | Sierra Nevada | 6/5 | 2–10 pax | 1490 USD | [Aventura] | aventura | tayrona |
| p4 | Medellín Vibrante | Comuna 13 · Guatapé · Botero | Antioquia | 4/3 | 2–8 pax | 890 USD | [City] | cultura | medellin |
| p5 | Guajira Ancestral | Riohacha · Cabo de la Vela · Punta Gallinas | Alta Guajira | 5/4 | 4–12 pax | 1390 USD | [Off-grid] | aventura | desierto |
| p6 | Amazonas Profundo | Leticia · Puerto Nariño · Tarapoto | Trapecio Amazónico | 5/4 | 2–8 pax | 1590 USD | [Eco, Comunidad] | naturaleza | amazonas |

Full itineraries + includes — see `data.jsx:135–252`.

### ACTIVITIES (14)
Each entry has id, title, subtitle, loc, region, cat, level, bucket, dur, durMin, price, rating, reviews, badges[], desc, highlights[], includes[], time, dest. See `data.jsx:254–409` (ids `a1–a14`).

Categories: `aventura`, `mar`, `gastronomia`, `naturaleza`, `cultura`, `bienestar`.
Levels: `fácil`, `moderado`, `exigente`.
Buckets: `short`, `half-day`, `full-day`, `multi-day`.

### PLANNERS (6)
| id | name | role | base | langs | years | rating | specialties | styles |
|---|---|---|---|---|---|---|---|---|
| pl1 | Mariana Vélez | Especialista Caribe | Cartagena | ES, EN, FR | 8 | 4.98 | Lunas de miel, Familias, Gastronomía | boutique, cultura, playa |
| pl2 | Andrés Restrepo | Eje Cafetero & Andes | Salento, Quindío | ES, EN | 11 | 4.97 | Café de especialidad, Senderismo, Grupos pequeños | naturaleza, cultura, aventura |
| pl3 | Luisa Carrizosa | Amazonas & Pacífico | Leticia, Amazonas | ES, EN, PT | 6 | 4.99 | Avistamiento de ballenas, Selva con comunidad, Fotografía | naturaleza, ecoturismo, cultura |
| pl4 | Juan David Ortiz | Aventura & Trekking | Santa Marta | ES, EN, DE | 9 | 4.96 | Multi-día trekking, Ciudad Perdida, Aventura exigente | aventura, naturaleza |
| pl5 | Camila Duarte | Medellín & Antioquia | Medellín | ES, EN, IT | 7 | 4.94 | City breaks, Arte urbano, Gastronomía paisa | cultura, gastronomia, boutique |
| pl6 | Esteban Caicedo | Cali & Pacífico Sur | Cali | ES, EN | 5 | 4.95 | Salsa y música, Gastronomía pacífica, Afrocultura | cultura, gastronomia |

Each has: bio, quote, hallmarks (pkg ids), signature {title,note}, funFacts[3], availability, destScene. Full copy in `data.jsx:411–538`.

### PLANNER_REVIEWS (6)
6 reviews attributed via `plId`, each with {name, origin, pkg, rating, txt}. See `data.jsx:540–553`.

### TESTIMONIALS (4)
Home testimonials with `short` + `long` (long contains `<em>` HTML). See `data.jsx:555–580`.

### FAQ (6)
See data section "FAQ" above.

### BLOG_POSTS (6)
| id | cat | title | author | date | read |
|---|---|---|---|---|---|
| cartagena-secretos | Guías | Cartagena más allá de la ciudad amurallada | Mariana Vélez | 2026-03-28 | 7 |
| cocora-caminata | Aventura | Caminar el Valle de Cocora sin turistas | Andrés Restrepo | 2026-03-14 | 6 |
| amazonas-primer-viaje | Naturaleza | Tu primer viaje al Amazonas colombiano | Luisa Carrizosa | 2026-02-25 | 10 |
| cafe-de-origen | Cultura | El café colombiano que no llega al supermercado | Andrés Restrepo | 2026-02-10 | 8 |
| tayrona-pueblito | Aventura | Ascenso a Pueblito en el Parque Tayrona | Juan David Ortiz | 2026-01-22 | 9 |
| san-andres-buceo | Naturaleza | Buceo en San Andrés para principiantes | Mariana Vélez | 2026-01-08 | 6 |

Full body arrays (h2/h3/p/quote/ul blocks) in `blog.jsx:4–137`. First post is marked `featured: true`.

### EXP_REVIEWS (3) — `experiences.jsx:26–30`
- r1 (a1) Emma S., Londres — `Salir a las 6am nos dio el valle para nosotros solos. El guía sabía el nombre de cada planta.`
- r2 (a2) Julien P., Lyon — `El velero era pequeño, no éramos 40 — marca la diferencia. Cholón de ensueño.`
- r3 (a7) Ava K., NYC — `El mercado de Bazurto es un espectáculo. La cazuela que cocinamos fue mejor que la de cualquier restaurante.`

---

## Structural notes & surprises

1. **Two app roots coexist**: `app.jsx` (baseline with Hero+search, ExploreMap, Trust logos) and `app_f1.jsx` (Fase 1 with WhatsApp-first flow, replacing search hero + ExploreMap + Trust with `HeroF1` + `TrustBarF1` + `DestinationsF1` + `HowItWorks`). Editorial-v1 template should ship both variants, or choose F1 as primary (recommended).
2. **`PackageDetail` legacy in `pages.jsx:229–501`** is superseded by `PackageDetailV2` in `details.jsx:173–540` — do NOT port the legacy one.
3. **`ExpModal` (experiences.jsx:75–143)** is the legacy drawer; production uses `ActivityDetail` full page. Only port `ExpModal` if you need parity.
4. **`PackageModal` in `sections.jsx:771–842`** is a legacy modal — not invoked from home `Packages` (clicks now route to detail page via `onOpen`). Skip for production port.
5. **`Tweaks` panel** is a dev-only overlay bridged via `window.parent.postMessage`. Do not port.
6. **`ColombiaMap` is NOT a real map library** — it's a hand-built SVG illustration (path `COLOMBIA_PATH` in maps.jsx:61–108). The template ships the same illustration; no Mapbox/Leaflet needed.
7. **`Scenic`** renders gradient-only CSS placeholders. Real imagery will replace these later; template must accept an optional `image` prop or fallback to scene.
8. **F1 Destinations map-view variant** uses `ColombiaMap` with hover sync between side cards and pins — keep parity.
9. **`Logo` depends on `assets/logo.png`** — seed a placeholder SVG in `components/site/themes/editorial-v1/assets/` until real asset provided.
10. **All icons (`Ic.*`) are inline SVG** — no external icon library. Port them as a single `Ic` record/module.
11. **Breadcrumb-aware pages** use `Crumbs` with `{label, page?}` trail; the last item has no `page` prop (rendered as `<span className="cur">`).
12. **All CTAs in F1** funnel through `useWAFlow().openFlow({variant: "A"|"B"|"D"})` — variants tracked per entry point.
13. **Lead storage** in `WAFlowDrawer` uses `localStorage.setItem("waLeads", ...)` — in production must go to Supabase.
14. **Phone number `WA_BUSINESS_NUMBER = "573001234567"`** is a placeholder; must be env-driven.
15. **`Object.assign(window, {...})`** exports at the bottom of each file — a Babel-standalone pattern. Port target uses ES modules, so drop these.
16. **`const useState = _dUseState` aliasing** at top of `details.jsx:4` is a workaround for Babel-standalone multi-file React; remove when porting.
17. **Market switcher has TWO UIs** (header pill + footer selects) — both read/write `localStorage` keys `bukeer.site.lang` and `bukeer.site.currency`. Integrate with Studio's existing i18n + currency preferences.
