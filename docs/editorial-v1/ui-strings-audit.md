# editorial-v1 UI strings audit

Scan date: 2026-04-20
Scope: `components/site/themes/editorial-v1/**/*.tsx`

This inventory catalogues user-facing Spanish strings that are **hardcoded as
component constants, UI chrome (aria-labels, placeholders, button labels, empty
states)**. Operator-authored content that lives in `section.content` is
explicitly excluded — those strings belong to the DB, not to the catalog.

Strings are being migrated into `lib/site/public-ui-extra-text.ts` under a
common `editorial*` prefix and resolved via
`getPublicUiExtraTextGetter('es-CO')` so future locales only need to add
overrides in one place.

## Migration table

| File | String (verbatim) | Catalog key | Notes |
|---|---|---|---|
| layout/site-header.tsx | `'Cotizar viaje'` (×2: desktop CTA + mobile CTA) | `editorialHeaderQuoteCta` | Primary nav CTA |
| layout/site-header.tsx | `'Destinos'` / `'Paquetes'` / `'Experiencias'` / `'Travel Planners'` / `'Blog'` | — (already exists as `nav.*` in `public-ui-messages`) | Use `getPublicUiMessages().nav` |
| layout/site-header.tsx | `'Principal'` (aria-label) | `editorialHeaderNavAria` |  |
| layout/site-header.tsx | `'Menú móvil'` (aria-label) | `editorialHeaderMobileMenuAria` | Preserves acute accent |
| layout/site-header.client.tsx | `'Abrir menú'` / `'Cerrar menú'` (defaults) | `editorialHeaderMenuOpen` / `editorialHeaderMenuClose` |  |
| layout/site-footer.tsx | `'Destinos'`, `'Viajar'`, `'Agencia'`, `'Recibe historias'` (column headings) | `editorialFooterCol*` (×4) |  |
| layout/site-footer.tsx | `'Ver todos'` (destinations footer link) | `editorialFooterViewAll` |  |
| layout/site-footer.tsx | `'Buscar'` (footer link) | `editorialFooterSearch` |  |
| layout/site-footer.tsx | `'tu@correo.com'` (placeholder) | `editorialFooterEmailPlaceholder` |  |
| layout/site-footer.tsx | `'Correo electrónico'` (sr-only label) | `editorialFooterEmailLabel` |  |
| layout/site-footer.tsx | `'Suscribirme'` (button) | `editorialFooterSubscribe` |  |
| layout/site-footer.tsx | `'Un correo al mes con rincones que nos enamoran y descuentos.'` | `editorialFooterNewsletterHint` |  |
| layout/site-footer.tsx | `'Viaja más hondo.'` (tagline fallback) | `editorialFooterTaglineFallback` |  |
| layout/site-footer.tsx | `'Somos un operador local…'` (about fallback) | `editorialFooterAboutFallback` |  |
| layout/site-footer.tsx | `'Privacidad'` / `'Términos'` / `'Política de cancelación'` (legal labels) | `editorialFooterLegal*` (×3) | Legacy overlap with `footer.terms` but kept short label here |
| sections/hero.tsx | `'DESCUBRE · VIVE · CONECTA'` (DEFAULT_EYEBROW) | `editorialHeroEyebrowFallback` |  |
| sections/hero.tsx | `'Destino del mes'` (DEFAULT_SIDE_LIST_LABEL) | `editorialHeroSideListLabel` |  |
| sections/hero.tsx | `'Imágenes destacadas'` (rotator aria-label) | `editorialHeroSlidesAria` |  |
| sections/hero-rotator.client.tsx | `'Presentando · '` prefix | `editorialHeroPresenting` |  |
| sections/hero-rotator.client.tsx | `'Seleccionar slide'` (dots aria-label) | `editorialHeroDotsAria` |  |
| sections/hero-rotator.client.tsx | `'Slide '` prefix (dot aria-label) | `editorialHeroSlidePrefix` |  |
| sections/hero-search.client.tsx | `'Caribe · Colombia'` (destino placeholder) | `editorialSearchPlaceholderDestino` |  |
| sections/hero-search.client.tsx | `'Octubre 2026 · 7 noches'` (fechas placeholder) | `editorialSearchPlaceholderFechas` |  |
| sections/hero-search.client.tsx | `'2 viajeros'` (viajeros placeholder) | `editorialSearchPlaceholderViajeros` |  |
| sections/hero-search.client.tsx | `'Buscar'` (cta default) | `editorialSearchSubmit` |  |
| sections/hero-search.client.tsx | `'Destino'` (label + aria) | `editorialSearchDestinoLabel` |  |
| sections/hero-search.client.tsx | `'Cuándo'` (label) | `editorialSearchWhenLabel` |  |
| sections/hero-search.client.tsx | `'Fechas de viaje'` (aria) | `editorialSearchFechasAria` |  |
| sections/hero-search.client.tsx | `'Viajeros'` (label + aria) | `editorialSearchViajerosLabel` |  |
| sections/packages.tsx | `'EXPERIENCIAS CURADAS'` (DEFAULT_EYEBROW) | `editorialPackagesEyebrowFallback` |  |
| sections/packages.tsx | `'Paquetes'` (DEFAULT_TITLE) | `editorialPackagesTitleFallback` |  |
| sections/packages.tsx / packages-filters.client.tsx | `'Todos'`, `'POPULAR'`, `'DESDE'`, `'Consultar'`, `'VER PAQUETE'`, `'Sin paquetes disponibles'` | `editorialPackagesAllTab`, `editorialPackagesPopular`, `editorialPackagesFromPrefix`, `editorialPackagesConsultPrice`, `editorialPackagesCtaFallback`, `editorialPackagesEmpty` |  |
| sections/packages-filters.client.tsx | `'Filtros de paquetes'` (tablist aria) | `editorialPackagesFiltersAria` |  |
| sections/packages-filters.client.tsx | `'Carrusel de paquetes'` (rail aria) | `editorialPackagesRailAria` |  |
| sections/destinations.tsx | `'RUTAS INCONFUNDIBLES'`, `'Destinos'`, `'Sin destinos disponibles.'` | `editorialDestinationsEyebrowFallback`, `editorialDestinationsTitleFallback`, `editorialDestinationsEmpty` |  |
| sections/destinations.tsx | `'Lista'`, `'Mapa'`, `'actividades'`, `'paquetes'` | `editorialDestinationsViewList`, `editorialDestinationsViewMap`, `editorialActivitiesWord`, `editorialPackagesWord` |  |
| sections/destinations-view-toggle.client.tsx | `'Vista de destinos'` (tablist aria) | `editorialDestinationsViewAria` |  |
| sections/destinations-map-view.client.tsx | `'Mapa interactivo de destinos en Colombia'` | `editorialDestinationsMapAriaFallback` |  |
| sections/explore-map.tsx | `'EXPLORA'`, `'Colombia, a tu ritmo'`, `'Ver todos los destinos'` | `editorialExploreEyebrowFallback`, `editorialExploreTitleFallback`, `editorialExploreCtaFallback` |  |
| sections/explore-map.tsx | Region labels `'Caribe'`, `'Andes'`, `'Selva'`, `'Pacífico'` + highlights | `editorialRegion*` (×4) + `editorialRegion*Highlight` (×4) | `ñ` + `í` preserved |
| sections/explore-map.client.tsx | `'Filtrar por región'` (tablist aria) | `editorialExploreFilterAria` |  |
| sections/explore-map.client.tsx | `'Ver paquetes'` (hover-card CTA) | `editorialExploreCardCta` |  |
| sections/explore-map.client.tsx | `'Mapa de Colombia — destinos por región'` | `editorialExploreMapAria` |  |
| sections/explore-map.client.tsx | `'paquete'` / `'paquetes'` (plural helper) | reuses `editorialPackagesWord` + `editorialPackageWord` (singular) |  |
| sections/faq.tsx | `'Preguntas frecuentes'` (DEFAULT_EYEBROW) | `editorialFaqEyebrowFallback` |  |
| sections/faq.tsx | `'Lo que nos preguntan antes de reservar.'` (DEFAULT_TITLE) | `editorialFaqTitleFallback` |  |
| sections/blog.tsx | `'BLOG'`, `'Historias desde adentro.'`, `'Ver todo el blog'`, `'Aún no hay historias.'` | `editorialBlogEyebrowFallback`, `editorialBlogTitleFallback`, `editorialBlogViewAll`, `editorialBlogNoPosts` |  |
| sections/planners.tsx | `'Tu planner'`, `'Una persona que te conoce de principio a fin.'`, `'Emparejamos tu perfil…'` | `editorialPlannersEyebrowFallback`, `editorialPlannersTitleFallback`, `editorialPlannersSubtitleFallback` |  |
| sections/planners.tsx | `'Ver todos'`, `'Diseñamos viajes hechos a tu medida, paso a paso.'`, `'Disponible'`, `'Ver perfil'`, `'WhatsApp'`, `'Agente de Viajes'`, `'Travel Planner'`, `'Operaciones'`, `'Gerente'`, `'Ventas'` | `editorialPlannersViewAll`, `editorialPlannersQuoteFallback`, `editorialPlannersAvailable`, `editorialPlannersViewProfile`, `editorialPlannersWhatsapp`, `editorialRoleAgent`, `editorialRolePlanner`, `editorialRoleOperations`, `editorialRoleManager`, `editorialRoleSales` |  |
| sections/planners.tsx | `'Aún no hay travel planners publicados.'` | `editorialPlannersEmpty` |  |
| sections/promise.tsx | `'Por qué nosotros'`, `'Un viaje bien hecho <em>se nota.</em>'` | `editorialPromiseEyebrowFallback`, `editorialPromiseTitleFallback` | Title preserves `<em>` markup verbatim |
| sections/testimonials.tsx / .client.tsx | `'Testimonios'`, `'El recuerdo después del viaje.'` | `editorialTestimonialsEyebrowFallback`, `editorialTestimonialsTitleFallback` |  |
| sections/testimonials.tsx / .client.tsx | `'de 5 estrellas'` (aria template suffix), `'reseñas verificadas'`, `'promedio'`, `'reseñas'`, `'Ver reseñas en Google'`, `'Otras reseñas'` (tablist aria) | `editorialTestimonialsStarsAriaSuffix`, `editorialTestimonialsVerifiedSuffix`, `editorialTestimonialsAverage`, `editorialTestimonialsReviews`, `editorialTestimonialsGoogleAria`, `editorialTestimonialsListAria` | `ñ` preserved |
| sections/trust-bar.tsx | `'Planners en línea'`, `'responden en ~'`, `'responden pronto'`, `'operador local certificado'`, `'rating promedio'`, `'viajeros recomendarían'`, `'años'`, `'satisfacción'`, `'Revisado por humanos'`, `'cada itinerario'`, `'Credibilidad y confianza'` (aria), `'reseñas verificadas'` | `editorialTrust*` (×12) | Preserves `í`, `ó`, `ñ` |
| sections/cta.tsx | `'Empieza hoy <em>tu viaje.</em>'`, `'Llamado a la acción'` (aria fallback) | `editorialCtaTitleFallback`, `editorialCtaAriaFallback` |  |
| sections/listing-map.tsx | `'Mapa de listado'` (aria fallback), `'Listado sincronizado con el mapa'` (cards aria) | `editorialListingMapAriaFallback`, `editorialListingMapCardsAria` |  |
| sections/planners-matchmaker.client.tsx | `'¿Con quién viajas?'` (fallback), `'¿A qué región vas?'`, `'¿Qué estilo de viaje?'` | `editorialMatchmakerGroupQuestion`, `editorialMatchmakerRegionQuestion`, `editorialMatchmakerStyleQuestion` |  |
| sections/planners-matchmaker.client.tsx | `'Match sugerido'` (fallback) | `editorialMatchmakerMatchLabel` |  |
| pages/blog-list.tsx | `'Blog'`, `'Historias'`, `'desde adentro.'`, `'Escrito por los planners…'`, `'Todo'` | `editorialBlogListEyebrow`, `editorialBlogListTitle`, `editorialBlogListEmphasis`, `editorialBlogListSubtitle`, `editorialBlogListAllTab` |  |
| pages/blog-list.tsx | `'Nada con esos criterios'`, `'Prueba otra categoría o palabra.'` | `editorialBlogEmptyHeading`, `editorialBlogEmptyBody` |  |
| pages/blog-list.tsx | `'Cargar más historias'`, `'Anterior'`, `'Siguiente'`, `'Leer artículo'`, `'min de lectura'`, `'Paginación del blog'` (nav aria) | `editorialBlogLoadMore`, `editorialBlogPrev`, `editorialBlogNext`, `editorialBlogReadCta`, `editorialBlogReadingSuffix`, `editorialBlogPaginationAria` |  |
| pages/blog-list-toolbar.client.tsx | `'Filtros del blog'` (toolbar aria), `'Buscar historias'` (input aria), `'Buscar historias…'` (placeholder) | `editorialBlogToolbarAria`, `editorialBlogSearchAria`, `editorialBlogSearchPlaceholder` |  |
| pages/blog-detail.tsx | `'Compartir'`, `'Etiquetas'`, `'Escrito por'`, `'¿Te gustaría vivirlo?'`, `'Diseñamos un viaje a tu medida'`, `'por esta región.'`, `'Cuéntale a nuestro equipo qué te interesa…'`, `'Planear mi viaje'`, `'WhatsApp'`, `'Sigue'`, `'leyendo.'`, `'Ver todo el blog'`, `'Diseña rutas en Colombia…'` | `editorialBlogShare`, `editorialBlogTags`, `editorialBlogAuthorEyebrow`, `editorialBlogCtaEyebrow`, `editorialBlogCtaTitlePrefix`, `editorialBlogCtaTitleEm`, `editorialBlogCtaBody`, `editorialBlogCtaPrimary`, `editorialBlogCtaWhatsapp`, `editorialBlogRelatedHeading`, `editorialBlogRelatedHeadingEm`, `editorialBlogRelatedCta`, `editorialBlogAuthorBioFallback` |  |
| pages/experiences.tsx | `'Experiencias'`, `'Actividades'`, `'para sumar a tu viaje.'`, `'Oficios, caminatas, cocina, mar, selva…'` | `editorialExperiencesEyebrow`, `editorialExperiencesTitle`, `editorialExperiencesEmphasis`, `editorialExperiencesSubtitle` |  |
| pages/experiences-grid.client.tsx | `'Duración'`, `'Región'`, `'Nivel'`, `'Limpiar todo'`, `'experiencias'` (count suffix), `'Nada con esos criterios'`, `'Ajusta los filtros o empieza de cero.'`, `'Limpiar filtros'`, `'Desde'` (price prefix) | `editorialExperiencesDurationLabel`, `editorialExperiencesRegionLabel`, `editorialExperiencesLevelLabel`, `editorialExperiencesClearAll`, `editorialExperiencesCountSuffix`, `editorialExperiencesEmptyHeading`, `editorialExperiencesEmptyBody`, `editorialExperiencesClearLabel`, `editorialExperiencesFromPrefix` |  |
| pages/experiences-grid.client.tsx | Category labels `'Todas'`, `'Aventura'`, `'Gastronomía'`, `'Cultura'`, `'Naturaleza'`, `'Mar'`, `'Bienestar'` | `editorialExperienceCategory*` (×7) | `í` preserved |
| pages/experiences-grid.client.tsx | Level labels `'Fácil'`, `'Moderado'`, `'Exigente'`, `'Intenso'` | `editorialExperienceLevel*` (×4) | `á` preserved |
| pages/experiences-grid.client.tsx | Duration buckets `'Cualquiera'`, `'Menos de 4h'`, `'Medio día'`, `'Día completo'`, `'Multi-día'` | `editorialExperienceDuration*` (×5) | `í` preserved |
| pages/planners-list.tsx | Hero + intro + stats copy (`HERO_*`, `INTRO_*`, `STATS_LABEL_*`) | `editorialPlannersListHero*`, `editorialPlannersListIntro*`, `editorialPlannersListStats*` | Verbatim from designer copy catalog |
| pages/planners-list.tsx | Matchmaker heading (`MATCH_HEADING.*`), toolbar copy, card copy | `editorialMatchmakerHeading*`, `editorialPlannersListToolbar*`, `editorialPlannersListCard*` | Duplicates `editorialPlannersViewProfile` etc when possible |
| pages/planner-detail.tsx | Entire `SECTION_COPY` map (bio, differentiators, specialties, regions, signature…rail) | `editorialPlannerDetail*` (×24) | Verbatim from designer |
| pages/package-detail.tsx | `'Inicio'`, `'Paquetes'`, `'Ruta del viaje'`, `'paradas'`, `'Día a día'`, `'Itinerario detallado'`, `'Hospedaje'`, `'Hoteles incluidos'`, `'Vuelos'`, `'Vuelos incluidos'` | `editorialBreadcrumbHome`, `editorialBreadcrumbPackages`, `editorialPackageMapTitle`, `editorialPackageStopsSuffix`, `editorialPackageTimelineEyebrow`, `editorialPackageTimelineTitle`, `editorialPackageHotelsEyebrow`, `editorialPackageHotelsTitle`, `editorialPackageFlightsEyebrow`, `editorialPackageFlightsTitle` |  |
| pages/activity-detail.tsx | `'Actividades'` (breadcrumb), `'Lo que vivirás'`, `'Momentos destacados'` | `editorialBreadcrumbActivities`, `editorialActivityHighlightsEyebrow`, `editorialActivityHighlightsTitle` | `á` preserved |
| pages/hotel-detail.tsx | `'Hoteles'` (breadcrumb), `'Amenidades'`, `'Lo que este hotel ofrece'`, `'Por qué elegirlo'`, `'Aspectos destacados'`, `'estrellas'` (aria suffix) | `editorialBreadcrumbHotels`, `editorialHotelAmenitiesEyebrow`, `editorialHotelAmenitiesTitle`, `editorialHotelHighlightsEyebrow`, `editorialHotelHighlightsTitle`, `editorialHotelStarsSuffix` |  |

## Strings intentionally NOT catalogued

- **Operator-authored content** already stored in DB (`section.content.title`,
  `website.content.siteName`, `blog_post.title`, etc.) — these flow through as
  props and the catalog never replaces them.
- **Visual chrome that is not user-facing language** — icon names, CSS class
  names, `data-testid` values, `data-screen-label`.
- **Error log strings** (console.warn / console.error) — not user-visible.
- **WhatsApp greeting templates** (`Hola ${firstName}, quiero organizar un
  viaje…`): these are user-visible, but intertwined with interpolated names.
  Deferred to a follow-up with a dedicated `formatWhatsAppGreeting()` helper.
- **Planner default bio / availability fallbacks** when they are long editorial
  fiction that the operator is expected to override with real copy — kept as
  code-level fallbacks for now but also added to the catalog so translators
  find them.
- **Breadcrumb labels sourced from dynamic data** (`siteTitleTrail`, planner
  `fullName`, post `title`, etc.) — data, not strings.

## Totals

- **Hardcoded strings audited:** ~205 across 22 editorial files.
- **Catalog keys added:** ~165 new `editorial*` keys (plus ~10 that already
  have equivalents in `public-ui-messages`).
- **Files migrated:** see commit log. The highest-signal call sites
  (`site-header.tsx`, `site-footer.tsx`, section defaults, search placeholders,
  blog-list chrome, experiences filters) were migrated verbatim. Long designer
  narrative copy (`planners-list.tsx`, `planner-detail.tsx`, `blog-detail.tsx`
  CTA block, `experiences.tsx` hero) was also catalogued so the next wave can
  swap the constants without further audit work.

## Analytics event names

Beyond strings, this audit also captures well-known analytics events fired by
editorial-v1 components (see `/lib/analytics/track.ts`):

| Event | Where it fires | Payload |
|---|---|---|
| `destination_card_click` | explore-map.client, destinations-map-view.client | `{ destination_id, destination_slug, surface | region | source }` |
| `package_card_click` | packages-filters.client | `{ packageId, slug }` |
| `region_filter_change` | explore-map.client, destinations-map-view.client | `{ region, destinationId? }` |
| `activity_card_click` | (reserved — not yet wired in editorial-v1) | `{ activitySlug, source? }` |
| `hotel_card_click` | (reserved) | `{ hotelSlug, source? }` |
| `itinerary_day_toggle` | (reserved) | `{ packageSlug, dayNumber, opened }` |
| `pricing_tier_select` | (inherited from p3/pricing-tiers) | `{ packageSlug, tierKey }` |
| `explore_map_pin_click` | (merged into `destination_card_click` w/ `surface: 'pin'`) | see above |
| `hero_search_submit` | (reserved — hero-search currently navigates only) | `{ destino, from, to, pax }` |
| `waflow_open`, `waflow_step_next`, `waflow_submit` | (inherited from p3/whatsapp-flow) | varies |
| `whatsapp_cta_click` | (base catalog event, inherited) | `{ source, packageSlug? }` |
| `matchmaker_submit` | (reserved — planners-matchmaker currently has no submit) | `{ group, region, style }` |

Events marked **reserved** are documented in `track.ts` JSDoc so adding them
later doesn't require a rename.
