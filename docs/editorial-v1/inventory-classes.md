# editorial-v1 — CSS Class Inventory

All distinct `className` values found in JSX files (prototype at `themes/references/claude design 1/project/`). Classes are used verbatim in the corresponding `.css` files listed in the header of each section. Classes expanded dynamically (`${x}`) are listed once per resolved value seen in code.

Legend for dynamic values:
- `.c-12-4 / .c-5-4 / .c-4 / .c-4-tall` — destination grid layout modifiers
- `.evt-{transporte|actividad|comida|alojamiento|libre}` — typed itinerary event
- `.evt-pill-{type}` — mini pill variant
- `.level-{leaf|amber|coral}` — activity difficulty colors
- `.co-map-{default|editorial|minimal|compact}` — map variant
- `.co-pin-{dest|stop|pkg}` — pin kind

---

## primitives.jsx — uses global + primitives styles (`styles.css`)

- `.scenic`
- `.scenic-sky`
- `.nav-logo`
- `.logo-tag`
- `.rating`

## sections.jsx — `styles.css`

- `.site-header` · `.site-header.scrolled`
- `.container`
- `.nav` · `.nav-links` · `.nav-link` · `.nav-link.active` · `.nav-right`
- `.icon-btn`
- `.btn` · `.btn-ink` · `.btn-sm` · `.btn-lg` · `.btn-primary` · `.btn-accent` · `.btn-outline` · `.btn-ghost`
- `.hero` · `.hero-media` · `.hero-inner` · `.hero-copy` · `.hero-eyebrow` · `.hero-cta` · `.hero-side-list` · `.hero-meta` · `.hero-search`
- `.display-xl` · `.display-md`
- `.eyebrow`
- `.lead` · `.body-md` · `.body-lg`
- `.dots` · `.dot` · `.dot.active`
- `.serif`
- `.field` · `.go` (hero search)
- `.trust` · `.trust-inner` · `.trust-label` · `.trust-logos`
- `.section` · `.section-head` · `.tools`
- `.view-toggle`
- `.dest-grid` · `.dest-card` · `.c-12-4` · `.c-5-4` · `.c-4` · `.c-4-tall`
- `.wash`
- `.top-tag`
- `.content` · `.cta-pill`
- `.dest-map-view` · `.dest-map-stage` · `.dest-map-side`
- `.dest-side-card` · `.dest-side-card.on` · `.dest-side-thumb` · `.dest-side-body` · `.region` · `.dest-side-num`
- `.explore-map-section` · `.explore-map-grid` · `.explore-map-copy` · `.explore-map-stage`
- `.region-legend` · `.region-legend-chip` · `.region-legend-chip.on`
- `.explore-hover-card` · `.explore-hover-card.on` · `.ehc-right`
- `.chip` · `.chip-white` · `.chip-ink` · `.chip-accent`
- `.filter-bar` · `.filter-tab` · `.filter-tab.active` · `.count`
- `.pack-grid` · `.pack-card` · `.pack-media` · `.badges` · `.heart` · `.heart.on` · `.pack-body` · `.pack-loc-row` · `.pack-loc` · `.pack-header` · `.pack-meta` · `.m` · `.pack-foot` · `.pack-price`
- `.stats-row` · `.stat` · `.stat-num` · `.stat-label`
- `.promise` · `.list` · `.feat` · `.ic`
- `.planners` · `.planner` · `.planner-avatar` · `.role` · `.langs` · `.lg`
- `.testi` · `.testi-big` · `.quote-mark` · `.testi-author` · `.av` · `.testi-list` · `.testi-mini` · `.testi-mini.active` · `.hdr`
- `.faq` · `.faq-list` · `.faq-item` · `.faq-item.open` · `.faq-q` · `.plus` · `.faq-a`
- `.cta-banner` · `.actions`
- `.site-footer` · `.footer-grid` · `.footer-brand` · `.logo-foot` · `.footer-col` · `.footer-news` · `.footer-bottom`
- `.wa-bubble`
- `.tweaks` · `.row` · `.swatches` · `.sw` · `.opts` (dev-only)
- `.modal-backdrop` · `.modal` · `.modal-hero` · `.close` · `.title-area` · `.modal-body` · `.modal-aside` · `.itinerary` · `.itin-day` · `.price-big`

## app_f1.jsx — reuses `styles.css` + adds F1 utilities in `styles.css`

- `.btn-wa-hero` (F1 WA CTA)
- `.dot-live` (live status dot)
- (also uses all classes above)

## details.jsx — `details.css`

- `.detail-hero` · `.wash` · `.meta` · `.chips` · `.gallery-toggle` · `.display-lg`
- `.overview-bar` · `.ov-item`
- `.gallery-strip` · `.gs-grid` · `.gs-tile` · `.gs-tile-0`..`.gs-tile-5` · `.gs-more`
- `.detail-body` · `.detail-main` · `.detail-rail`
- `.rail-price` · `.big` · `.rail-form` · `.fld` · `.rail-share` · `.rail-trust`
- `.highlights-grid` · `.hl-card`
- `.day-list` · `.day-list-v2` · `.day-card` · `.day-card.open` · `.day-head` · `.num` · `.day-summary` · `.chev` · `.day-body` · `.day-inner` · `.day-inner-v2` · `.day-timeline` · `.day-media`
- `.evt` · `.evt-transporte` · `.evt-actividad` · `.evt-comida` · `.evt-alojamiento` · `.evt-libre` · `.evt-time` · `.evt-dot` · `.evt-body`
- `.evt-pill` · `.evt-pill-transporte` · `.evt-pill-actividad` · `.evt-pill-comida` · `.evt-pill-alojamiento` · `.evt-pill-libre`
- `.route-map` · `.rm-head` · `.label` · `.rm-track` · `.rm-line` · `.rm-stop` · `.rm-dot`
- `.hotels-grid` · `.hotel-card` · `.h-media` · `.h-body` · `.h-head` · `.h-rating` · `.h-amen` · `.h-nights`
- `.flights-list` · `.flight-row` · `.f-ic` · `.f-route` · `.f-arrow` · `.f-meta`
- `.incl-grid` · `.incl-col` · `.incl-col.yes` · `.incl-col.no` · `.mark`
- `.price-table` · `.price-col` · `.price-col.featured` · `.price-col.selected` · `.pr` · `.per`
- `.trust-row` · `.trust-item`
- `.planner-detail` · `.planner-actions`
- `.mobile-bar`
- `.lightbox` · `.lb-close` · `.lb-stage` · `.lb-meta` · `.lb-nav`
- `.act-timeline` · `.act-timeline-block` · `.atb-label`
- `.meeting-map` · `.mm-map` · `.mm-pin` · `.mm-pulse` · `.mm-dot` · `.mm-chip` · `.mm-info` · `.mm-details`
- `.recs-grid` · `.rec-card`

## experiences.jsx — `experiences.css`

- `.exp-card` · `.exp-media` · `.exp-badges-left` · `.exp-badges-right` · `.heart` · `.heart.on` · `.exp-body` · `.exp-loc` · `.exp-title` · `.exp-sub` · `.exp-desc` · `.exp-rating` · `.exp-foot` · `.exp-dur` · `.exp-price`
- `.level-leaf` · `.level-amber` · `.level-coral`
- `.modal-overlay` · `.modal-close`
- `.exp-modal` · `.exp-modal-hero` · `.exp-modal-wash` · `.exp-modal-heroin` · `.exp-modal-loc` · `.exp-modal-meta` · `.exp-modal-body` · `.exp-modal-main` · `.exp-hl` · `.exp-modal-rail` · `.exp-modal-price` · `.exp-modal-notes`
- `.exp-cats` · `.exp-cat` · `.exp-cat.active`
- `.exp-featured` · `.exp-feat-media` · `.exp-feat-body` · `.exp-feat-meta`
- `.exp-toolbar` · `.exp-search` · `.exp-dur-tabs` · `.sort-sel`
- `.exp-filterbar` · `.exp-filter-group` · `.chip-filter` · `.chip-filter.on` · `.exp-range` · `.val`
- `.exp-count` · `.exp-grid`
- `.exp-cross` · `.exp-cross-body` · `.exp-cross-chips` · `.exp-cross-chip` · `.exp-cross-dot`
- `.exp-reviews` · `.exp-review` · `.exp-review-foot` · `.exp-review-link`
- `.exp-finalcta`

## blog.jsx — `blog.css`

- `.blog-featured` · `.blog-feat-media` · `.blog-feat-body` · `.blog-meta`
- `.blog-toolbar` · `.blog-cats` · `.blog-search`
- `.blog-grid` · `.blog-card` · `.blog-card-media` · `.blog-cat-tag` · `.blog-card-body`
- `.post-hero` · `.post-author-line`
- `.post-body` · `.post-rail` · `.post-share` · `.post-tags` · `.post-main`
- `.post-cta` · `.post-author-card` · `.post-related`

## planners.jsx — `planners.css`

- `.pl-intro` · `.stats` · `.s`
- `.pl-toolbar` · `.pl-tabs`
- `.pl-grid` · `.pl-card` · `.top` · `.av` · `.who` · `.body` · `.quote` · `.meta-row` · `.it` · `.tags` · `.tg` · `.langs-row` · `.lg` · `.foot` · `.avail`
- `.pl-match` · `.inner` · `.quiz` · `.opts` (planner-specific styles)
- `.pld-hero` · `.big-av` · `.grid` · `.kpis` · `.k`
- `.pld-body` · `.pld-main` · `.pld-rail`
- `.big-quote`
- `.chips-row` · `.c` (chip child)
- `.sig-card` · `.sig-media` · `.sig-body`
- `.hall-grid`
- `.facts` · `.fact` · `.num`
- `.review-card` · `.stars`
- `.avail-row` · `.resp`

## pages.jsx — `pages.css` (+ details.css for PackageDetail legacy)

- `.crumbs` · `.sep` · `.cur`
- `.page-hero`
- `.listing` · `.filters` · `.filter-group` · `.range`
- `.listing-top`
- `.search-big` · `.search-group` · `.sr-grid` · `.sr-card` · `.sr-media` · `.sr-body` · `.pr`
- `.contact-grid` · `.contact-info` · `.ways` · `.contact-way`
- `.contact-form` · `.form-row` · `.form-row.two` · `.type-chips`

## maps.jsx — `maps.css`

- `.co-map` · `.co-map-default` · `.co-map-editorial` · `.co-map-minimal` · `.co-map-compact` · `.co-map-svg`
- `.co-ocean`
- `.co-land` · `.co-land-stroke` · `.co-link-dash`
- `.co-ridge` · `.co-river`
- `.co-route` · `.co-route-shadow`
- `.co-pin` · `.co-pin.on` · `.co-pin-dest` · `.co-pin-stop` · `.co-pin-pkg` · `.co-pin-core` · `.co-pin-dot` · `.co-pin-halo` · `.co-pin-label` · `.co-pin-num`
- `.co-compass` · `.co-compass-ring` · `.co-compass-needle` · `.co-compass-n`
- `.country-chip` · `.country-chip-svg` · `.country-chip-land` · `.country-chip-halo` · `.country-chip-dot` · `.country-chip-text`
- `.itin-map` · `.im-head` · `.im-grid` · `.im-stage` · `.im-legend` · `.im-legend-title` · `.im-num` · `.im-chev` · `.im-foot` · `.dot.dot-route`
- `.listing-map-view` · `.listing-map-stage` · `.listing-map-cards` · `.lm-card` · `.lm-card.on` · `.lm-thumb` · `.lm-region` · `.lm-body` · `.lm-foot` · `.lm-chev`

## waflow.jsx — `waflow.css`

- `.waf-overlay` · `.waf-overlay.on` · `.waf-drawer` · `.waf-drawer.on`
- `.waf-head` · `.waf-head-bg` · `.waf-head-inner` · `.waf-head-top` · `.waf-head-eyebrow` · `.waf-head-title` · `.waf-head-sub`
- `.waf-pill-context`
- `.waf-close`
- `.waf-body`
- `.waf-field` · `.waf-label` · `.opt` · `.req`
- `.waf-chips` · `.waf-chip` · `.waf-chip.on` · `.waf-chip.compact` · `.checkmark`
- `.waf-chip-row`
- `.waf-stepper-row` · `.waf-stepper` · `.waf-stepper-label` · `.waf-stepper-controls` · `.waf-stepper-btn` · `.waf-stepper-val`
- `.waf-input-wrap` · `.waf-input-wrap.error` · `.waf-input` · `.waf-prefix` · `.flag` · `.chev`
- `.waf-country-dd` · `.waf-country-opt` · `.code`
- `.waf-error-msg`
- `.waf-foot` · `.waf-availability` · `.live` · `.dot` · `.resp` · `.waf-submit` · `.waf-skip` · `.waf-privacy`
- `.waf-success` · `.waf-success-ic` · `.waf-success-preview` · `.waf-success-actions` · `.waf-ref-badge` · `.btn-wa` · `.btn-sec`
- `.trust-bar-f1` · `.item` · `.dot-live`
- `.howit-f1` · `.head` · `.howit-steps` · `.howit-step` · `.howit-num` · `.meta` · `.howit-bottom`
- `.wa-fab-f1` · `.wa-fab-f1.on` · `.wa-fab-btn` · `.wa-fab-bubble` · `.wa-fab-close`

## switcher.jsx — `styles.css` (switcher section) or dedicated

- `.mkt-anchor` · `.mkt-pill` · `.mkt-pill.open` · `.mkt-pill.on-dark`
- `.mkt-flag` · `.mkt-code` · `.mkt-sep` · `.mkt-cur` · `.mkt-sym`
- `.mkt-pop` · `.mkt-pop-head` · `.mkt-pop-desc` · `.mkt-pop-sub` · `.mkt-pop-div` · `.mkt-pop-foot`
- `.mkt-chips` · `.mkt-chip` · `.mkt-chip.on` · `.mkt-chip.accent` · `.mkt-chip-flag` · `.mkt-chip-sym`
- `.mkt-seg` · `.mkt-seg-flag` · `.mkt-seg-code`
- `.mkt-list` · `.mkt-item` · `.mkt-item.on` · `.mkt-item-lead` · `.mkt-item-flag` · `.mkt-item-sym` · `.mkt-item-label` · `.mkt-item-hint` · `.mkt-item-dot`
- `.mkt-reload` · `.mkt-spinner`
- `.mkt-footer` · `.mkt-footer-select` · `.mkt-footer-flag` · `.mkt-footer-sym` · `.mkt-footer-text`

---

## Cross-cutting chip variants

- `.chip` base
- Color modifiers: `.chip-white`, `.chip-ink`, `.chip-accent`
- Level modifiers: `.level-leaf`, `.level-amber`, `.level-coral`
- `.chip-filter` + `.chip-filter.on` (used in listings, experiences, contact)

## Cross-cutting button variants

- `.btn` base
- Size: `.btn-sm`, `.btn-lg`
- Color: `.btn-primary`, `.btn-accent`, `.btn-ink`, `.btn-outline`, `.btn-ghost`
- Specific: `.btn-wa`, `.btn-wa-hero`, `.btn-sec`

## Typography utilities

- `.display-xl` · `.display-lg` · `.display-md`
- `.lead`
- `.body-lg` · `.body-md`
- `.eyebrow` · `.hero-eyebrow`
- `.serif`
- `.label` (used as small uppercase eyebrow)

## Layout utilities

- `.container`
- `.section` · `.section-head`
- `.grid` (ad-hoc in planner detail)
- `.tools`
- `.actions`

## CSS files in prototype (not inventoried)

`styles.css`, `details.css`, `experiences.css`, `blog.css`, `planners.css`, `pages.css`, `maps.css`, `waflow.css`. Each `.css` file contains the classes listed in the matching section above. Imports happen globally in the demo HTML — in the Next.js port, these should become scoped CSS Modules or a single `editorial-v1.css` token-driven sheet.
