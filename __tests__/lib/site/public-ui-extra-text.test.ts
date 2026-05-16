import {
  getPublicUiExtraText,
  getPublicUiExtraTextGetter,
  type PublicUiExtraTextKey,
} from '@/lib/site/public-ui-extra-text';

/**
 * The editorial-v1 template set relies on a large set of `editorial*` keys
 * resolved via `getPublicUiExtraText('es-CO', key)`. Component-level migration
 * assumes every referenced key exists; if a migration typo slips through,
 * the renderer would emit `undefined` on the page. This test keeps the full
 * list of editorial keys in sync.
 */
const EDITORIAL_KEYS: PublicUiExtraTextKey[] = [
  'editorialHeaderQuoteCta',
  'editorialHeaderNavAria',
  'editorialHeaderMobileMenuAria',
  'editorialHeaderMenuOpen',
  'editorialHeaderMenuClose',
  'editorialFooterColDestinos',
  'editorialFooterColViajar',
  'editorialFooterColAgencia',
  'editorialFooterColNewsletter',
  'editorialFooterViewAll',
  'editorialFooterSearch',
  'editorialFooterEmailPlaceholder',
  'editorialFooterEmailLabel',
  'editorialFooterSubscribe',
  'editorialFooterNewsletterHint',
  'editorialFooterTaglineFallback',
  'editorialFooterAboutFallback',
  'editorialFooterLegalPrivacy',
  'editorialFooterLegalTerms',
  'editorialFooterLegalCancellation',
  'editorialHeroEyebrowFallback',
  'editorialHeroSideListLabel',
  'editorialHeroSlidesAria',
  'editorialHeroPresenting',
  'editorialHeroDotsAria',
  'editorialHeroSlidePrefix',
  'editorialSearchPlaceholderDestino',
  'editorialSearchPlaceholderFechas',
  'editorialSearchPlaceholderViajeros',
  'editorialSearchSubmit',
  'editorialSearchDestinoLabel',
  'editorialSearchWhenLabel',
  'editorialSearchFechasAria',
  'editorialSearchViajerosLabel',
  'editorialPackagesEyebrowFallback',
  'editorialPackagesTitleFallback',
  'editorialPackagesAllTab',
  'editorialPackagesPopular',
  'editorialPackagesFromPrefix',
  'editorialPackagesConsultPrice',
  'editorialPackagesCtaFallback',
  'editorialPackagesEmpty',
  'editorialPackagesFiltersAria',
  'editorialPackagesRailAria',
  'editorialPackagesWord',
  'editorialPackageWord',
  'editorialDestinationsEyebrowFallback',
  'editorialDestinationsTitleFallback',
  'editorialDestinationsEmpty',
  'editorialDestinationsViewList',
  'editorialDestinationsViewMap',
  'editorialDestinationsViewAria',
  'editorialDestinationsMapAriaFallback',
  'editorialActivitiesWord',
  'editorialExploreEyebrowFallback',
  'editorialExploreTitleFallback',
  'editorialExploreCtaFallback',
  'editorialExploreFilterAria',
  'editorialExploreCardCta',
  'editorialExploreMapAria',
  'editorialRegionCaribe',
  'editorialRegionAndes',
  'editorialRegionSelva',
  'editorialRegionPacifico',
  'editorialRegionCaribeHighlight',
  'editorialRegionAndesHighlight',
  'editorialRegionSelvaHighlight',
  'editorialRegionPacificoHighlight',
  'editorialFaqEyebrowFallback',
  'editorialFaqTitleFallback',
  'editorialFaqOpenLabel',
  'editorialFaqCloseLabel',
  'editorialBlogEyebrowFallback',
  'editorialBlogTitleFallback',
  'editorialBlogViewAll',
  'editorialBlogNoPosts',
  'editorialPlannersEyebrowFallback',
  'editorialPlannersTitleFallback',
  'editorialPlannersSubtitleFallback',
  'editorialPlannersViewAll',
  'editorialPlannersQuoteFallback',
  'editorialPlannersAvailable',
  'editorialPlannersViewProfile',
  'editorialPlannersWhatsapp',
  'editorialPlannersEmpty',
  'editorialRoleAgent',
  'editorialRolePlanner',
  'editorialRoleOperations',
  'editorialRoleManager',
  'editorialRoleSales',
  'editorialMatchmakerGroupQuestion',
  'editorialMatchmakerRegionQuestion',
  'editorialMatchmakerStyleQuestion',
  'editorialMatchmakerMatchLabel',
  'editorialMatchmakerCta',
  'editorialPromiseEyebrowFallback',
  'editorialPromiseTitleFallback',
  'editorialCtaTitleFallback',
  'editorialCtaAriaFallback',
  'editorialTestimonialsEyebrowFallback',
  'editorialTestimonialsTitleFallback',
  'editorialTestimonialsStarsAriaSuffix',
  'editorialTestimonialsVerifiedSuffix',
  'editorialTestimonialsAverage',
  'editorialTestimonialsReviews',
  'editorialTestimonialsGoogleAria',
  'editorialTestimonialsListAria',
  'editorialTrustLiveLabel',
  'editorialTrustResponsePrefix',
  'editorialTrustResponseFallback',
  'editorialTrustCertified',
  'editorialTrustRatingAverage',
  'editorialTrustRecommendation',
  'editorialTrustYearsSuffix',
  'editorialTrustSatisfactionSuffix',
  'editorialTrustHumanReview',
  'editorialTrustHumanReviewBody',
  'editorialTrustAriaLabel',
  'editorialTrustVerifiedSuffix',
  'editorialListingMapAriaFallback',
  'editorialListingMapCardsAria',
  'editorialBlogListEyebrow',
  'editorialBlogListTitle',
  'editorialBlogListEmphasis',
  'editorialBlogListSubtitle',
  'editorialBlogListAllTab',
  'editorialBlogEmptyHeading',
  'editorialBlogEmptyBody',
  'editorialBlogLoadMore',
  'editorialBlogPrev',
  'editorialBlogNext',
  'editorialBlogReadCta',
  'editorialBlogReadingSuffix',
  'editorialBlogPaginationAria',
  'editorialBlogToolbarAria',
  'editorialBlogSearchAria',
  'editorialBlogSearchPlaceholder',
  'editorialBlogShare',
  'editorialBlogTags',
  'editorialBlogAuthorEyebrow',
  'editorialBlogCtaEyebrow',
  'editorialBlogCtaTitlePrefix',
  'editorialBlogCtaTitleEm',
  'editorialBlogCtaBody',
  'editorialBlogCtaPrimary',
  'editorialBlogCtaWhatsapp',
  'editorialBlogRelatedHeading',
  'editorialBlogRelatedHeadingEm',
  'editorialBlogRelatedCta',
  'editorialBlogAuthorBioFallback',
  'editorialExperiencesEyebrow',
  'editorialExperiencesTitle',
  'editorialExperiencesEmphasis',
  'editorialExperiencesSubtitle',
  'editorialExperiencesDurationLabel',
  'editorialExperiencesRegionLabel',
  'editorialExperiencesLevelLabel',
  'editorialExperiencesClearAll',
  'editorialExperiencesCountSuffix',
  'editorialExperiencesEmptyHeading',
  'editorialExperiencesEmptyBody',
  'editorialExperiencesClearLabel',
  'editorialExperiencesFromPrefix',
  'editorialExperienceCategoryAll',
  'editorialExperienceCategoryAdventure',
  'editorialExperienceCategoryGastronomy',
  'editorialExperienceCategoryCulture',
  'editorialExperienceCategoryNature',
  'editorialExperienceCategorySea',
  'editorialExperienceCategoryWellness',
  'editorialExperienceLevelEasy',
  'editorialExperienceLevelModerate',
  'editorialExperienceLevelDemanding',
  'editorialExperienceLevelIntense',
  'editorialExperienceDurationAny',
  'editorialExperienceDurationShort',
  'editorialExperienceDurationHalfDay',
  'editorialExperienceDurationFullDay',
  'editorialExperienceDurationMultiDay',
  'editorialPlannersListHeroEyebrow',
  'editorialPlannersListHeroTitle',
  'editorialPlannersListHeroEmphasis',
  'editorialPlannersListHeroSubtitle',
  'editorialPlannersListIntroEyebrow',
  'editorialPlannersListIntroTitlePart1',
  'editorialPlannersListIntroTitleEm',
  'editorialPlannersListIntroTitlePart2',
  'editorialPlannersListIntroBody',
  'editorialPlannersListStatsPlanners',
  'editorialPlannersListStatsRating',
  'editorialPlannersListStatsTrips',
  'editorialPlannersListSingular',
  'editorialPlannersListPlural',
  'editorialPlannersListSortBy',
  'editorialPlannersListSortByValue',
  'editorialPlannersListCardViewProfile',
  'editorialPlannersListCardAvailable',
  'editorialPlannersListCardYearsSuffix',
  'editorialMatchmakerHeadingEyebrow',
  'editorialMatchmakerHeadingTitle',
  'editorialMatchmakerHeadingTitleEm',
  'editorialMatchmakerHeadingBody',
  'editorialMatchmakerHeadingCta',
  'editorialMatchmakerSubmit',
  'editorialPlannerDetailBio',
  'editorialPlannerDetailDifferentiators',
  'editorialPlannerDetailDifferentiatorsEm',
  'editorialPlannerDetailSpecialtiesLabel',
  'editorialPlannerDetailRegionsLabel',
  'editorialPlannerDetailSignature',
  'editorialPlannerDetailSignatureEm',
  'editorialPlannerDetailSignatureSubLabel',
  'editorialPlannerDetailHallmarks',
  'editorialPlannerDetailHallmarksEm',
  'editorialPlannerDetailFacts',
  'editorialPlannerDetailFactsEm',
  'editorialPlannerDetailReviewsTitle',
  'editorialPlannerDetailReviewsEm',
  'editorialPlannerDetailOtherPlanners',
  'editorialPlannerDetailOtherPlannersEm',
  'editorialPlannerDetailKpiExperience',
  'editorialPlannerDetailKpiTrips',
  'editorialPlannerDetailKpiRating',
  'editorialPlannerDetailKpiLanguages',
  'editorialPlannerDetailRailSpeakWith',
  'editorialPlannerDetailRailResponseTime',
  'editorialPlannerDetailRailFrom',
  'editorialPlannerDetailRailLanguages',
  'editorialPlannerDetailRailPrimaryCta',
  'editorialPlannerDetailRailSecondaryCta',
  'editorialPlannerDetailRailFootnote',
  'editorialPlannerDetailSignaturePrimaryCta',
  'editorialPlannerDetailSignatureSecondaryCta',
  'editorialPlannerDetailSignatureChip',
  'editorialPlannerDetailBioFallback',
  'editorialPlannerDetailDefaultResponse',
  'editorialBreadcrumbHome',
  'editorialBreadcrumbPackages',
  'editorialBreadcrumbActivities',
  'editorialBreadcrumbHotels',
  'editorialBreadcrumbBlog',
  'editorialPackageMapTitle',
  'editorialPackageStopsSuffix',
  'editorialPackageTimelineEyebrow',
  'editorialPackageTimelineTitle',
  'editorialPackageHotelsEyebrow',
  'editorialPackageHotelsTitle',
  'editorialPackageFlightsEyebrow',
  'editorialPackageFlightsTitle',
  'editorialActivityHighlightsEyebrow',
  'editorialActivityHighlightsTitle',
  'editorialHotelAmenitiesEyebrow',
  'editorialHotelAmenitiesTitle',
  'editorialHotelHighlightsEyebrow',
  'editorialHotelHighlightsTitle',
  'editorialHotelStarsSuffix',
  'editorialShareLabel',
  'editorialSaveLabel',
  'editorialLoadMore',
  'editorialFilterAll',
  'editorialEmptyResults',
  'editorialNextStep',
  'editorialPrevStep',
  'editorialSubmitLead',
  'editorialVerifySMS',
];

describe('public-ui-extra-text (editorial-v1 catalog)', () => {
  it('resolves every editorial key for es-CO to a non-empty string', () => {
    for (const key of EDITORIAL_KEYS) {
      const value = getPublicUiExtraText('es-CO', key);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('preserves Spanish diacritics verbatim for flagship labels', () => {
    expect(getPublicUiExtraText('es-CO', 'editorialHeaderMobileMenuAria')).toBe(
      'Menú móvil',
    );
    expect(getPublicUiExtraText('es-CO', 'editorialRegionPacifico')).toBe(
      'Pacífico',
    );
    expect(getPublicUiExtraText('es-CO', 'editorialSearchWhenLabel')).toBe(
      'Cuándo',
    );
    expect(getPublicUiExtraText('es-CO', 'editorialTestimonialsReviews')).toBe(
      'reseñas',
    );
    expect(
      getPublicUiExtraText('es-CO', 'editorialFooterLegalCancellation'),
    ).toBe('Política de cancelación');
  });

  it('exposes a bound getter for server components', () => {
    const getter = getPublicUiExtraTextGetter('es-CO');
    expect(getter('editorialHeaderQuoteCta')).toBe('Cotizar viaje');
    expect(getter('editorialSearchSubmit')).toBe('Buscar');
    expect(getter('editorialPackagesCtaFallback')).toBe('VER PAQUETE');
  });

  it('localizes priority PT/FR/DE editorial chrome and product-listing labels', () => {
    expect(getPublicUiExtraText('pt-BR', 'editorialHeaderQuoteCta')).toBe('Solicitar cotação');
    expect(getPublicUiExtraText('pt-BR', 'editorialFooterSearch')).toBe('Buscar');
    expect(getPublicUiExtraText('pt-BR', 'editorialPackagesCountSeparator')).toBe('de');
    expect(getPublicUiExtraText('pt-BR', 'editorialHotelsCityLabel')).toBe('Cidade');
    expect(getPublicUiExtraText('pt-BR', 'waflowFabTitle')).toBe('Planejando uma viagem?');

    expect(getPublicUiExtraText('fr-FR', 'editorialHeaderQuoteCta')).toBe('Demander un devis');
    expect(getPublicUiExtraText('fr-FR', 'editorialFooterSearch')).toBe('Rechercher');
    expect(getPublicUiExtraText('fr-FR', 'editorialPackagesCountSeparator')).toBe('sur');
    expect(getPublicUiExtraText('fr-FR', 'editorialHotelsCityLabel')).toBe('Ville');
    expect(getPublicUiExtraText('fr-FR', 'waflowFabTitle')).toBe('Vous planifiez un voyage ?');

    expect(getPublicUiExtraText('de-DE', 'editorialHeaderQuoteCta')).toBe('Reiseangebot anfragen');
    expect(getPublicUiExtraText('de-DE', 'editorialFooterSearch')).toBe('Suchen');
    expect(getPublicUiExtraText('de-DE', 'editorialPackagesCountSeparator')).toBe('von');
    expect(getPublicUiExtraText('de-DE', 'editorialHotelsCityLabel')).toBe('Stadt');
    expect(getPublicUiExtraText('de-DE', 'waflowFabTitle')).toBe('Planen Sie eine Reise?');
  });

  it('resolves en-US overrides and falls back to es-CO for unsupported locales', () => {
    const esValue = getPublicUiExtraText('es-CO', 'editorialPackagesCtaFallback');
    expect(getPublicUiExtraText('en-US', 'editorialPackagesCtaFallback')).toBe(
      'VIEW PACKAGE',
    );
    expect(getPublicUiExtraText('it-IT', 'editorialPackagesCtaFallback')).toBe(
      esValue,
    );
  });
});
