import {
  resolvePublicUiLocale,
  type SupportedPublicUiLocale,
} from '@/lib/site/public-ui-messages';

const BASE_EXTRA_TEXTS = {
  plannersBackHome: 'Volver al inicio',
  plannersPlanTrip: 'Planear mi viaje',
  plannersAbout: 'Sobre',
  plannersSpecialty: 'Especialidad',
  plannersTravelPlannerIn: 'Travel Planner en',
  plannersVisitWebsite: 'Visitar sitio web',
  academyNameLabel: 'Nombre',
  academyNamePlaceholder: 'Tu nombre',
  academyEmailLabel: 'Correo Electronico',
  academyEmailPlaceholder: 'tu@agencia.com',
  academyHeroBadge: 'Nuevo Curso Gratuito',
  academyHeroTitlePrefix: 'Rompe tu',
  academyHeroTitleEmphasis: 'Excel',
  academyHeroSubtitle:
    'Deja de operar a ciegas. Aprende a sistematizar tu agencia de viajes y recupera tu libertad en 4 modulos practicos.',
  academyHeroStart: 'Empezar Curso Gratis',
  academyHeroSyllabus: 'Ver Temario ↓',
  academyHeroBonusLabel: 'Bonus:',
  academyHeroBonusDescription:
    'Incluye Plantilla Maestra de Cotizacion + Calculadora de Costos',
  activityCircuitMapTitle: 'Recorrido de la actividad',
  activityScheduleProgram: 'Programa',
  activityScheduleViewDetail: 'Ver detalle completo →',
  circuitMapSimplifiedView: 'Vista de circuito simplificada.',
  itineraryViewHotel: 'Ver hotel →',
  mediaCloseVideo: 'Cerrar video',
  mediaImageGallery: 'Galeria de imagenes',
  mediaCloseGallery: 'Cerrar galeria',
  mediaPrevImage: 'Imagen anterior',
  mediaNextImage: 'Imagen siguiente',
  meetingPointGooglePlaceId: 'Google place id:',
  moduleCardModule: 'Modulo',
  moduleCardClasses: 'Clases',
  optionsTableOption: 'Opcion',
  optionsTableMode: 'Modalidad',
  optionsTableDetails: 'Detalles',
  optionsTableRefund: 'Reembolso',
  optionsTablePrice: 'Precio',
  optionsTableMin: 'Min.',
  optionsTableMax: 'Max.',
  optionsTableSchedules: 'horarios',
  packageCircuitMapTitle: 'Circuito del viaje',
  productVideoOpenAria: 'Ver video (abre en nueva pestana)',
  productVideoLabel: 'Ver video',
  productVideoAria: 'Ver video del producto',
  googleLabel: 'Google',
  reviewsViewOnGoogle: 'Ver resenas en Google',
  sectionActivitiesViewAll: 'Ver todas las actividades',
  sectionActivitiesCurated: 'Experiencias Curadas',
  sectionFrom: 'Desde',
  sectionViewActivity: 'Ver actividad',
  sectionBlogViewAllArrow: 'Ver todos →',
  sectionBlogNoPosts: 'No hay publicaciones disponibles',
  sectionBlogViewAllPosts: 'Ver todos los posts',
  sectionComparisonIncluded: 'Incluido',
  sectionComparisonNotIncluded: 'No incluido',
  sectionComparisonTitle: 'Comparativa',
  sectionComparisonFeatures: 'Caracteristicas',
  sectionComparisonBukeer: 'Bukeer',
  sectionCountdownTitle: 'Cuenta regresiva',
  sectionWhatsapp: 'WhatsApp',
  sectionActivitiesWord: 'actividades',
  sectionPackagesWord: 'paquetes',
  sectionDestinationsNoData: 'No hay destinos configurados',
  sectionDestinationsViewAll: 'Ver todos los destinos',
  sectionGuarantees: 'Garantias',
  sectionScroll: 'scroll',
  sectionHotelsViewAll: 'Ver todos los hoteles',
  sectionHotelsSelected: 'Estancias Seleccionadas',
  sectionViewHotel: 'Ver hotel',
  sectionInclusionsTitle: 'Incluye y no incluye',
  sectionIncludes: 'Incluye',
  sectionExcludes: 'No incluye',
  sectionItineraryTitle: 'Itinerario',
  sectionItineraryIncludesTonight: 'Incluye esta noche',
  sectionItineraryAccommodation: 'Alojamiento:',
  sectionNewsletterEmailPlaceholder: 'tu@email.com',
  sectionNewsletterSuccess:
    'Gracias por suscribirte. Pronto recibiras nuestras novedades.',
  sectionPackagesViewAll: 'Ver todos los paquetes',
  sectionPackagesCircuit: 'Circuito:',
  sectionViewPackage: 'Ver paquete',
  sectionPlannersViewProfile: 'Ver perfil',
  sectionPricingRecommended: 'Recomendado',
  sectionPricingTitle: 'Precios y paquetes',
  sectionTestimonialsViewGoogle: 'Ver en Google',
  sectionTestimonialsOfFive: 'de 5 estrellas',
  sectionTestimonialsTitle: 'Testimonios',
  sectionTrustTitle: 'Confianza y certificaciones',
  sectionTrustReviewsSuffix: 'resenas)',
  sectionTrustSsl: 'Pago seguro SSL',
} as const;

export type PublicUiExtraTextKey = keyof typeof BASE_EXTRA_TEXTS;

const EN_US_OVERRIDES: Partial<Record<PublicUiExtraTextKey, string>> = {};
const PT_BR_OVERRIDES: Partial<Record<PublicUiExtraTextKey, string>> = {};

const EXTRA_TEXTS_BY_LOCALE: Record<
  SupportedPublicUiLocale,
  Record<PublicUiExtraTextKey, string>
> = {
  'es-CO': { ...BASE_EXTRA_TEXTS },
  'en-US': { ...BASE_EXTRA_TEXTS, ...EN_US_OVERRIDES },
  'pt-BR': { ...BASE_EXTRA_TEXTS, ...PT_BR_OVERRIDES },
};

export function getPublicUiExtraText(
  localeLike: string | null | undefined,
  key: PublicUiExtraTextKey,
): string {
  const locale = resolvePublicUiLocale(localeLike);
  return EXTRA_TEXTS_BY_LOCALE[locale][key];
}

export function getPublicUiExtraTextGetter(localeLike: string | null | undefined) {
  const locale = resolvePublicUiLocale(localeLike);
  const dictionary = EXTRA_TEXTS_BY_LOCALE[locale];
  return (key: PublicUiExtraTextKey): string => dictionary[key];
}
