import { normalizeLanguageCode } from '@/lib/site/currency';

export const DEFAULT_PUBLIC_UI_LOCALE = 'es-CO' as const;
export const SUPPORTED_PUBLIC_UI_LOCALES = ['es-CO', 'en-US', 'pt-BR', 'fr-FR', 'de-DE'] as const;
export type SupportedPublicUiLocale = (typeof SUPPORTED_PUBLIC_UI_LOCALES)[number];

export interface PublicUiMessages {
  nav: {
    home: string;
    destinations: string;
    packages: string;
    experiences: string;
    about: string;
    advisory: string;
    hotels: string;
    blog: string;
  };
  header: {
    menuAria: string;
    advisoryAria: string;
    planMyTrip: string;
    planMyTripWhatsapp: string;
    callNow: string;
    preferences: string;
    customizeExperience: string;
    language: string;
    currency: string;
    languageCurrencyCustomizationAria: string;
    customizationSrOnly: string;
    siteLanguageAria: string;
    siteCurrencyAria: string;
    whatsappAria: string;
  };
  footer: {
    rightsReserved: string;
    createdWithBukeer: string;
    planTripTitle: string;
    planTripSubtitle: string;
    followUs: string;
    followUsSubtitle: string;
    talkWhatsapp: string;
    requestAdvisory: string;
    explore: string;
    company: string;
    help: string;
    legal: string;
    reviews: string;
    faq: string;
    planTrip: string;
    terms: string;
    privacy: string;
    cancellation: string;
    navigation: string;
    contact: string;
  };
  languageSwitcher: {
    selectLanguageAria: string;
  };
  mobileStickyBar: {
    call: string;
    whatsapp: string;
    email: string;
  };
  global404: {
    title: string;
    body: string;
    goHome: string;
  };
  globalError: {
    title: string;
    body: string;
    tryAgain: string;
  };
  site404: {
    title: string;
    body: string;
    backHome: string;
    contactUs: string;
  };
  siteError: {
    title: string;
    body: string;
    tryAgain: string;
  };
  contactForm: {
    titleDefault: string;
    subtitleDefault: string;
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    successTitle: string;
    successBody: string;
    nameLabel: string;
    messageLabel: string;
    sendMessage: string;
    sending: string;
    genericError: string;
    rateLimitError: string;
  };
  quoteForm: {
    requestQuote: string;
    selectedProduct: string;
    fullNameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    checkInLabel: string;
    checkOutLabel: string;
    adultsLabel: string;
    childrenLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    submitQuote: string;
    submitting: string;
    submitWhatsapp: string;
    successTitle: string;
    successBody: string;
    sendAnother: string;
    privacyNotice: string;
    requestError: string;
    connectionError: string;
    whatsappGreeting: string;
    whatsappInterested: string;
    whatsappDestination: string;
    whatsappDates: string;
    whatsappDate: string;
    whatsappTravelers: string;
    whatsappNotes: string;
    whatsappMyDetails: string;
    whatsappThanks: string;
    adultSingular: string;
    adultPlural: string;
    childSingular: string;
    childPlural: string;
  };
  bookingForm: {
    closeAria: string;
    title: string;
    invalidFields: string;
    rateLimit: string;
    serverError: string;
    reviewFields: string;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    consentTos: string;
    consentPrivacy: string;
    submitting: string;
    continueWhatsapp: string;
  };
  blogListing: {
    title: string;
    heroDescription: string;
    allCategories: string;
    noPosts: string;
    previous: string;
    next: string;
    pageLabel: string;
    ofLabel: string;
  };
  blogPost: {
    notFoundTitle: string;
    breadcrumbHome: string;
    breadcrumbBlog: string;
    readingTimeSuffix: string;
    backToBlog: string;
    shareLabel: string;
    shareTwitterAria: string;
    shareFacebookAria: string;
    shareWhatsappAria: string;
  };
  searchPage: {
    eyebrow: string;
    title: string;
    placeholder: string;
    noResultsPrefix: string;
    noResultsSuffix: string;
    noResultsHint: string;
    resultSingular: string;
    resultPlural: string;
    resultFor: string;
    initialHint: string;
    destinationLabel: string;
    hotelLabel: string;
    activityLabel: string;
    transferLabel: string;
    packageLabel: string;
    destinationsCategory: string;
    hotelsCategory: string;
    activitiesCategory: string;
    packagesCategory: string;
  };
  legalPages: {
    siteNotFoundTitle: string;
    breadcrumbHome: string;
    backHome: string;
    termsTitle: string;
    termsDescriptionPrefix: string;
    privacyTitle: string;
    privacyDescriptionPrefix: string;
    cancellationTitle: string;
    cancellationDescriptionPrefix: string;
  };
  bookingWidget: {
    reserveExperience: string;
    priceConsultPerPerson: string;
    priceFromPerPersonPrefix: string;
    priceFromPerPersonSuffix: string;
    dateLabel: string;
    peopleLabel: string;
    removePersonAria: string;
    addPersonAria: string;
    optionLabel: string;
    reserveByWhatsapp: string;
    selectDatePrompt: string;
  };
  datePicker: {
    next60Days: string;
    selectDateAria: string;
  };
  stickyCta: {
    quickActionsAria: string;
    fromLabel: string;
    whatsapp: string;
    call: string;
  };
  productDetail: {
    galleryTitle: string;
    openGalleryAria: string;
    openFullscreenLabel: string;
    fromLabel: string;
    whatsappLabel: string;
    searchPanelAria: string;
    searchTitle: string;
    searchSubtitle: string;
    searchQueryLabel: string;
    checkInLabel: string;
    checkOutLabel: string;
    adultsLabel: string;
    childrenLabel: string;
    searchButton: string;
    viewAllLabel: string;
    sidebarWhatsappLabel: string;
    sidebarCallLabel: string;
    pricingOptionsTitle: string;
    pricingSelectionAria: string;
    relatedEyebrow: string;
    relatedTitle: string;
    relatedPrevAria: string;
    relatedPrevButton: string;
    relatedNextAria: string;
    relatedNextButton: string;
    relatedListAria: string;
  };
  whatsappFlow: {
    fabLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    requiredContactError: string;
    submitError: string;
    selectedTierPrefix: string;
    travelDateLabel: string;
    adultsLabel: string;
    childrenLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    continueButton: string;
    nameLabel: string;
    emailOptionalLabel: string;
    phoneLabel: string;
    backButton: string;
    submitButton: string;
    submittingButton: string;
    successTitle: string;
    referenceLabel: string;
    openWhatsappButton: string;
    closeButton: string;
    variants: Record<'A' | 'B' | 'D', { title: string; subtitle: string }>;
  };
}

const ES_CO_MESSAGES: PublicUiMessages = {
  nav: {
    home: 'Inicio',
    destinations: 'Destinos',
    packages: 'Paquetes',
    experiences: 'Experiencias',
    about: 'Nosotros',
    advisory: 'Asesoria',
    hotels: 'Hoteles',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menu',
    advisoryAria: 'Asesoria',
    planMyTrip: 'Planear mi viaje',
    planMyTripWhatsapp: 'Planear mi viaje por WhatsApp',
    callNow: 'Agendar Llamada',
    preferences: 'Preferencias',
    customizeExperience: 'Personaliza tu experiencia',
    language: 'Idioma',
    currency: 'Moneda',
    languageCurrencyCustomizationAria: 'Personalizacion de idioma y moneda',
    customizationSrOnly: 'Personalizacion',
    siteLanguageAria: 'Idioma del sitio',
    siteCurrencyAria: 'Moneda del sitio',
    whatsappAria: 'Abrir WhatsApp',
  },
  footer: {
    rightsReserved: 'Todos los derechos reservados.',
    createdWithBukeer: 'Creado con Bukeer',
    planTripTitle: 'Planifiquemos tu viaje por Colombia',
    planTripSubtitle: 'Itinerarios, hoteles y actividades en una sola asesoria.',
    followUs: 'Siguenos para descubrir nuevas rutas y experiencias.',
    followUsSubtitle: 'Siguenos para descubrir nuevas rutas y experiencias.',
    talkWhatsapp: 'Hablar por WhatsApp',
    requestAdvisory: 'Solicitar asesoria',
    explore: 'Explora',
    company: 'Compania',
    help: 'Ayuda',
    legal: 'Legal',
    reviews: 'Resenas',
    faq: 'Preguntas frecuentes',
    planTrip: 'Planear viaje',
    terms: 'Terminos y Condiciones',
    privacy: 'Politica de Privacidad',
    cancellation: 'Politica de Cancelacion',
    navigation: 'Navegacion',
    contact: 'Contacto',
  },
  languageSwitcher: {
    selectLanguageAria: 'Seleccionar idioma',
  },
  mobileStickyBar: {
    call: 'Agendar Llamada',
    whatsapp: 'WhatsApp',
    email: 'Correo',
  },
  global404: {
    title: 'Pagina no encontrada',
    body: 'La pagina que buscas no existe o fue movida.',
    goHome: 'Ir al inicio',
  },
  globalError: {
    title: 'Algo salio mal',
    body: 'Ocurrio un error inesperado. Intenta recargar la pagina.',
    tryAgain: 'Intentar de nuevo',
  },
  site404: {
    title: 'Pagina no encontrada',
    body: 'Lo sentimos, la pagina que buscas no existe o fue movida.',
    backHome: 'Volver al inicio',
    contactUs: 'Contactanos',
  },
  siteError: {
    title: 'Algo salio mal',
    body: 'Lo sentimos, ocurrio un error inesperado. Intenta recargar la pagina.',
    tryAgain: 'Intentar de nuevo',
  },
  contactForm: {
    titleDefault: 'Contactanos',
    subtitleDefault: 'Estamos aqui para ayudarte a planificar tu proximo viaje',
    emailLabel: 'Email',
    phoneLabel: 'Telefono',
    addressLabel: 'Direccion',
    successTitle: 'Mensaje enviado',
    successBody: 'Nos pondremos en contacto contigo pronto.',
    nameLabel: 'Nombre',
    messageLabel: 'Mensaje',
    sendMessage: 'Enviar mensaje',
    sending: 'Enviando...',
    genericError: 'Error al enviar el mensaje. Intenta de nuevo.',
    rateLimitError: 'Has enviado demasiados mensajes. Intenta de nuevo mas tarde.',
  },
  quoteForm: {
    requestQuote: 'Solicitar cotizacion',
    selectedProduct: 'Producto seleccionado:',
    fullNameLabel: 'Nombre completo *',
    emailLabel: 'Email *',
    phoneLabel: 'Telefono / WhatsApp',
    checkInLabel: 'Fecha de llegada',
    checkOutLabel: 'Fecha de salida',
    adultsLabel: 'Adultos',
    childrenLabel: 'Ninos',
    notesLabel: 'Comentarios adicionales',
    notesPlaceholder: 'Alguna preferencia o solicitud especial?',
    namePlaceholder: 'Tu nombre',
    emailPlaceholder: 'tu@email.com',
    phonePlaceholder: '+57 300 123 4567',
    submitQuote: 'Solicitar cotizacion',
    submitting: 'Enviando...',
    submitWhatsapp: 'Enviar por WhatsApp',
    successTitle: 'Solicitud enviada',
    successBody: 'Hemos recibido tu solicitud de cotizacion. Te contactaremos pronto.',
    sendAnother: 'Enviar otra solicitud',
    privacyNotice: 'Al enviar, aceptas que te contactemos para responder tu solicitud.',
    requestError: 'Error al enviar la solicitud',
    connectionError: 'Error de conexion. Por favor intenta de nuevo.',
    whatsappGreeting: 'Hola',
    whatsappInterested: 'Estoy interesado en cotizar:',
    whatsappDestination: 'Destino',
    whatsappDates: 'Fechas',
    whatsappDate: 'Fecha',
    whatsappTravelers: 'Viajeros',
    whatsappNotes: 'Notas',
    whatsappMyDetails: 'Mis datos:',
    whatsappThanks: 'Gracias!',
    adultSingular: 'adulto',
    adultPlural: 'adultos',
    childSingular: 'nino',
    childPlural: 'ninos',
  },
  bookingForm: {
    closeAria: 'Cerrar',
    title: 'Reservar por WhatsApp',
    invalidFields: 'Revisa los campos marcados.',
    rateLimit: 'Demasiados intentos, intenta en 1 minuto.',
    serverError: 'No pudimos procesar tu solicitud, intenta de nuevo.',
    reviewFields: 'Revisa los campos marcados.',
    nameLabel: 'Nombre',
    emailLabel: 'Email',
    phoneLabel: 'Telefono',
    consentTos: 'Acepto los terminos y condiciones del servicio.',
    consentPrivacy: 'Autorizo el tratamiento de mis datos para contacto comercial.',
    submitting: 'Enviando...',
    continueWhatsapp: 'Continuar por WhatsApp',
  },
  blogListing: {
    title: 'Blog',
    heroDescription: 'Descubre las ultimas novedades, guias de viaje y consejos para tu proxima aventura',
    allCategories: 'Todos',
    noPosts: 'No hay publicaciones disponibles',
    previous: 'Anterior',
    next: 'Siguiente',
    pageLabel: 'Pagina',
    ofLabel: 'de',
  },
  blogPost: {
    notFoundTitle: 'Post no encontrado',
    breadcrumbHome: 'Inicio',
    breadcrumbBlog: 'Blog',
    readingTimeSuffix: 'min de lectura',
    backToBlog: 'Volver al blog',
    shareLabel: 'Compartir:',
    shareTwitterAria: 'Compartir en Twitter',
    shareFacebookAria: 'Compartir en Facebook',
    shareWhatsappAria: 'Compartir en WhatsApp',
  },
  searchPage: {
    eyebrow: 'Buscar',
    title: 'Que estas buscando?',
    placeholder: 'Destinos, hoteles, actividades, paquetes...',
    noResultsPrefix: 'Sin resultados para',
    noResultsSuffix: '',
    noResultsHint: 'Intenta con otros terminos o explora nuestras categorias',
    resultSingular: 'resultado',
    resultPlural: 'resultados',
    resultFor: 'para',
    initialHint: 'Escribe para buscar entre todos nuestros productos',
    destinationLabel: 'Destino',
    hotelLabel: 'Hotel',
    activityLabel: 'Actividad',
    transferLabel: 'Traslado',
    packageLabel: 'Paquete',
    destinationsCategory: 'Destinos',
    hotelsCategory: 'Hoteles',
    activitiesCategory: 'Actividades',
    packagesCategory: 'Paquetes',
  },
  legalPages: {
    siteNotFoundTitle: 'Sitio no encontrado',
    breadcrumbHome: 'Inicio',
    backHome: 'Volver al inicio',
    termsTitle: 'Terminos y Condiciones',
    termsDescriptionPrefix: 'Terminos y condiciones de',
    privacyTitle: 'Politica de Privacidad',
    privacyDescriptionPrefix: 'Politica de privacidad de',
    cancellationTitle: 'Politica de Cancelacion',
    cancellationDescriptionPrefix: 'Politica de cancelacion de',
  },
  bookingWidget: {
    reserveExperience: 'Reservar esta experiencia',
    priceConsultPerPerson: 'Consulta precio por persona',
    priceFromPerPersonPrefix: 'Desde',
    priceFromPerPersonSuffix: 'por persona',
    dateLabel: 'Fecha',
    peopleLabel: 'Personas',
    removePersonAria: 'Quitar persona',
    addPersonAria: 'Anadir persona',
    optionLabel: 'Opcion',
    reserveByWhatsapp: 'Reservar por WhatsApp',
    selectDatePrompt: 'Selecciona una fecha para continuar.',
  },
  datePicker: {
    next60Days: 'Proximos 60 dias',
    selectDateAria: 'Selecciona una fecha',
  },
  stickyCta: {
    quickActionsAria: 'Acciones rapidas de contacto',
    fromLabel: 'Desde',
    whatsapp: 'WhatsApp',
    call: 'Agendar Llamada',
  },
  productDetail: {
    galleryTitle: 'Galeria',
    openGalleryAria: 'Abrir galeria en pantalla completa',
    openFullscreenLabel: 'Ver en pantalla completa',
    fromLabel: 'Desde',
    whatsappLabel: 'WhatsApp',
    searchPanelAria: 'Panel de busqueda',
    searchTitle: 'Buscar disponibilidad',
    searchSubtitle: 'Ajusta fechas y viajeros para continuar en el buscador.',
    searchQueryLabel: 'Destino o experiencia',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    adultsLabel: 'Adultos',
    childrenLabel: 'Ninos',
    searchButton: 'Buscar',
    viewAllLabel: 'Ver todos',
    sidebarWhatsappLabel: 'WhatsApp',
    sidebarCallLabel: 'Agendar Llamada',
    pricingOptionsTitle: 'Opciones de tarifa',
    pricingSelectionAria: 'Seleccion de tarifa',
    relatedEyebrow: 'Relacionados',
    relatedTitle: 'Tambien te puede interesar',
    relatedPrevAria: 'Slide anterior',
    relatedPrevButton: 'Anterior',
    relatedNextAria: 'Siguiente slide',
    relatedNextButton: 'Siguiente',
    relatedListAria: 'Productos relacionados',
  },
  whatsappFlow: {
    fabLabel: 'Cotizar por WhatsApp',
    dialogTitle: 'Flujo de WhatsApp',
    dialogDescription: 'Comparte tus datos y te enviamos una propuesta personalizada.',
    requiredContactError: 'Completa nombre y telefono para continuar.',
    submitError: 'No fue posible iniciar el flujo.',
    selectedTierPrefix: 'Tarifa seleccionada:',
    travelDateLabel: 'Fecha tentativa',
    adultsLabel: 'Adultos',
    childrenLabel: 'Ninos',
    notesLabel: 'Comentarios',
    notesPlaceholder: 'Ej: prefiero hotel frente al mar',
    continueButton: 'Continuar',
    nameLabel: 'Nombre completo',
    emailOptionalLabel: 'Correo (opcional)',
    phoneLabel: 'Telefono',
    backButton: 'Atras',
    submitButton: 'Enviar por WhatsApp',
    submittingButton: 'Enviando...',
    successTitle: 'Solicitud registrada',
    referenceLabel: 'Referencia:',
    openWhatsappButton: 'Abrir WhatsApp',
    closeButton: 'Cerrar',
    variants: {
      A: {
        title: 'Asesoria express',
        subtitle: 'Te enviamos una propuesta por WhatsApp con base en tus preferencias.',
      },
      B: {
        title: 'Propuesta en minutos',
        subtitle: 'Priorizamos tarifas y horarios para que tomes una decision rapida.',
      },
      D: {
        title: 'Viaje disenado a medida',
        subtitle: 'Cuanto mas contexto compartas, mejor adaptamos el itinerario.',
      },
    },
  },
};

const EN_US_MESSAGES: PublicUiMessages = {
  nav: {
    home: 'Home',
    destinations: 'Destinations',
    packages: 'Packages',
    experiences: 'Experiences',
    about: 'About',
    advisory: 'Travel Advice',
    hotels: 'Hotels',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menu',
    advisoryAria: 'Travel Advice',
    planMyTrip: 'Plan My Trip',
    planMyTripWhatsapp: 'Plan My Trip on WhatsApp',
    callNow: 'Call Now',
    preferences: 'Preferences',
    customizeExperience: 'Customize your experience',
    language: 'Language',
    currency: 'Currency',
    languageCurrencyCustomizationAria: 'Language and currency customization',
    customizationSrOnly: 'Customization',
    siteLanguageAria: 'Site language',
    siteCurrencyAria: 'Site currency',
    whatsappAria: 'Open WhatsApp',
  },
  footer: {
    rightsReserved: 'All rights reserved.',
    createdWithBukeer: 'Built with Bukeer',
    planTripTitle: 'Let us plan your trip across Colombia',
    planTripSubtitle: 'Itineraries, hotels, and activities in one advisory session.',
    followUs: 'Follow us to discover new routes and experiences.',
    followUsSubtitle: 'Follow us to discover new routes and experiences.',
    talkWhatsapp: 'Chat on WhatsApp',
    requestAdvisory: 'Request Advice',
    explore: 'Explore',
    company: 'Company',
    help: 'Help',
    legal: 'Legal',
    reviews: 'Reviews',
    faq: 'FAQ',
    planTrip: 'Plan your trip',
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    cancellation: 'Cancellation Policy',
    navigation: 'Navigation',
    contact: 'Contact',
  },
  languageSwitcher: {
    selectLanguageAria: 'Select language',
  },
  mobileStickyBar: {
    call: 'Call',
    whatsapp: 'WhatsApp',
    email: 'Email',
  },
  global404: {
    title: 'Page not found',
    body: 'The page you are looking for does not exist or has been moved.',
    goHome: 'Go home',
  },
  globalError: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Please try reloading the page.',
    tryAgain: 'Try again',
  },
  site404: {
    title: 'Page not found',
    body: 'Sorry, the page you are looking for does not exist or has moved.',
    backHome: 'Back to home',
    contactUs: 'Contact us',
  },
  siteError: {
    title: 'Something went wrong',
    body: 'Sorry, an unexpected error occurred. Please try reloading the page.',
    tryAgain: 'Try again',
  },
  contactForm: {
    titleDefault: 'Contact us',
    subtitleDefault: 'We are here to help you plan your next trip',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    addressLabel: 'Address',
    successTitle: 'Message sent',
    successBody: 'We will contact you soon.',
    nameLabel: 'Name',
    messageLabel: 'Message',
    sendMessage: 'Send message',
    sending: 'Sending...',
    genericError: 'Error sending the message. Please try again.',
    rateLimitError: 'Too many messages sent. Please try again later.',
  },
  quoteForm: {
    requestQuote: 'Request quote',
    selectedProduct: 'Selected product:',
    fullNameLabel: 'Full name *',
    emailLabel: 'Email *',
    phoneLabel: 'Phone / WhatsApp',
    checkInLabel: 'Check-in date',
    checkOutLabel: 'Check-out date',
    adultsLabel: 'Adults',
    childrenLabel: 'Children',
    notesLabel: 'Additional comments',
    notesPlaceholder: 'Any preference or special request?',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@email.com',
    phonePlaceholder: '+1 555 123 4567',
    submitQuote: 'Request quote',
    submitting: 'Sending...',
    submitWhatsapp: 'Send via WhatsApp',
    successTitle: 'Request sent',
    successBody: 'We received your quote request. We will contact you soon.',
    sendAnother: 'Send another request',
    privacyNotice: 'By submitting, you agree we may contact you about your request.',
    requestError: 'Error sending request',
    connectionError: 'Connection error. Please try again.',
    whatsappGreeting: 'Hello',
    whatsappInterested: 'I am interested in getting a quote for:',
    whatsappDestination: 'Destination',
    whatsappDates: 'Dates',
    whatsappDate: 'Date',
    whatsappTravelers: 'Travelers',
    whatsappNotes: 'Notes',
    whatsappMyDetails: 'My details:',
    whatsappThanks: 'Thank you!',
    adultSingular: 'adult',
    adultPlural: 'adults',
    childSingular: 'child',
    childPlural: 'children',
  },
  bookingForm: {
    closeAria: 'Close',
    title: 'Book via WhatsApp',
    invalidFields: 'Please review the highlighted fields.',
    rateLimit: 'Too many attempts, try again in 1 minute.',
    serverError: 'We could not process your request, please try again.',
    reviewFields: 'Please review the highlighted fields.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    consentTos: 'I accept the service terms and conditions.',
    consentPrivacy: 'I authorize the processing of my data for commercial contact.',
    submitting: 'Sending...',
    continueWhatsapp: 'Continue on WhatsApp',
  },
  blogListing: {
    title: 'Blog',
    heroDescription: 'Discover the latest news, travel guides, and tips for your next adventure',
    allCategories: 'All',
    noPosts: 'No posts available',
    previous: 'Previous',
    next: 'Next',
    pageLabel: 'Page',
    ofLabel: 'of',
  },
  blogPost: {
    notFoundTitle: 'Post not found',
    breadcrumbHome: 'Home',
    breadcrumbBlog: 'Blog',
    readingTimeSuffix: 'min read',
    backToBlog: 'Back to blog',
    shareLabel: 'Share:',
    shareTwitterAria: 'Share on Twitter',
    shareFacebookAria: 'Share on Facebook',
    shareWhatsappAria: 'Share on WhatsApp',
  },
  searchPage: {
    eyebrow: 'Search',
    title: 'What are you looking for?',
    placeholder: 'Destinations, hotels, activities, packages...',
    noResultsPrefix: 'No results for',
    noResultsSuffix: '',
    noResultsHint: 'Try other terms or explore our categories',
    resultSingular: 'result',
    resultPlural: 'results',
    resultFor: 'for',
    initialHint: 'Type to search across all our products',
    destinationLabel: 'Destination',
    hotelLabel: 'Hotel',
    activityLabel: 'Activity',
    transferLabel: 'Transfer',
    packageLabel: 'Package',
    destinationsCategory: 'Destinations',
    hotelsCategory: 'Hotels',
    activitiesCategory: 'Activities',
    packagesCategory: 'Packages',
  },
  legalPages: {
    siteNotFoundTitle: 'Site not found',
    breadcrumbHome: 'Home',
    backHome: 'Back to home',
    termsTitle: 'Terms and Conditions',
    termsDescriptionPrefix: 'Terms and conditions for',
    privacyTitle: 'Privacy Policy',
    privacyDescriptionPrefix: 'Privacy policy for',
    cancellationTitle: 'Cancellation Policy',
    cancellationDescriptionPrefix: 'Cancellation policy for',
  },
  bookingWidget: {
    reserveExperience: 'Book this experience',
    priceConsultPerPerson: 'Contact us for price per person',
    priceFromPerPersonPrefix: 'From',
    priceFromPerPersonSuffix: 'per person',
    dateLabel: 'Date',
    peopleLabel: 'People',
    removePersonAria: 'Remove person',
    addPersonAria: 'Add person',
    optionLabel: 'Option',
    reserveByWhatsapp: 'Book on WhatsApp',
    selectDatePrompt: 'Select a date to continue.',
  },
  datePicker: {
    next60Days: 'Next 60 days',
    selectDateAria: 'Select a date',
  },
  stickyCta: {
    quickActionsAria: 'Quick contact actions',
    fromLabel: 'From',
    whatsapp: 'WhatsApp',
    call: 'Call',
  },
  productDetail: {
    galleryTitle: 'Gallery',
    openGalleryAria: 'Open gallery in fullscreen',
    openFullscreenLabel: 'View fullscreen',
    fromLabel: 'From',
    whatsappLabel: 'WhatsApp',
    searchPanelAria: 'Search panel',
    searchTitle: 'Search availability',
    searchSubtitle: 'Adjust dates and travelers to continue in search.',
    searchQueryLabel: 'Destination or experience',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    adultsLabel: 'Adults',
    childrenLabel: 'Children',
    searchButton: 'Search',
    viewAllLabel: 'View all',
    sidebarWhatsappLabel: 'WhatsApp',
    sidebarCallLabel: 'Call',
    pricingOptionsTitle: 'Pricing options',
    pricingSelectionAria: 'Pricing selection',
    relatedEyebrow: 'Related',
    relatedTitle: 'You may also like',
    relatedPrevAria: 'Previous slide',
    relatedPrevButton: 'Previous',
    relatedNextAria: 'Next slide',
    relatedNextButton: 'Next',
    relatedListAria: 'Related products',
  },
  whatsappFlow: {
    fabLabel: 'Quote on WhatsApp',
    dialogTitle: 'WhatsApp flow',
    dialogDescription: 'Share your details and we will send a personalized proposal.',
    requiredContactError: 'Complete name and phone to continue.',
    submitError: 'Unable to start the flow.',
    selectedTierPrefix: 'Selected tier:',
    travelDateLabel: 'Estimated date',
    adultsLabel: 'Adults',
    childrenLabel: 'Children',
    notesLabel: 'Comments',
    notesPlaceholder: 'Example: oceanfront hotel preferred',
    continueButton: 'Continue',
    nameLabel: 'Full name',
    emailOptionalLabel: 'Email (optional)',
    phoneLabel: 'Phone',
    backButton: 'Back',
    submitButton: 'Send via WhatsApp',
    submittingButton: 'Sending...',
    successTitle: 'Request submitted',
    referenceLabel: 'Reference:',
    openWhatsappButton: 'Open WhatsApp',
    closeButton: 'Close',
    variants: {
      A: {
        title: 'Express advisory',
        subtitle: 'We will send a WhatsApp proposal based on your preferences.',
      },
      B: {
        title: 'Proposal in minutes',
        subtitle: 'We prioritize rates and schedules for a quick decision.',
      },
      D: {
        title: 'Tailor-made trip',
        subtitle: 'The more context you share, the better we tailor the itinerary.',
      },
    },
  },
};

const PT_BR_MESSAGES: PublicUiMessages = {
  nav: {
    home: 'Inicio',
    destinations: 'Destinos',
    packages: 'Pacotes',
    experiences: 'Experiencias',
    about: 'Sobre nos',
    advisory: 'Consultoria',
    hotels: 'Hoteis',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menu',
    advisoryAria: 'Consultoria de viagem',
    planMyTrip: 'Planejar minha viagem',
    planMyTripWhatsapp: 'Planejar minha viagem no WhatsApp',
    callNow: 'Ligar agora',
    preferences: 'Preferencias',
    customizeExperience: 'Personalize sua experiencia',
    language: 'Idioma',
    currency: 'Moeda',
    languageCurrencyCustomizationAria: 'Personalizacao de idioma e moeda',
    customizationSrOnly: 'Personalizacao',
    siteLanguageAria: 'Idioma do site',
    siteCurrencyAria: 'Moeda do site',
    whatsappAria: 'Abrir WhatsApp',
  },
  footer: {
    rightsReserved: 'Todos os direitos reservados.',
    createdWithBukeer: 'Criado com Bukeer',
    planTripTitle: 'Vamos planejar sua viagem pela Colombia',
    planTripSubtitle: 'Roteiros, hoteis e atividades em uma unica consultoria.',
    followUs: 'Siga-nos para descobrir novas rotas e experiencias.',
    followUsSubtitle: 'Siga-nos para descobrir novas rotas e experiencias.',
    talkWhatsapp: 'Falar no WhatsApp',
    requestAdvisory: 'Solicitar consultoria',
    explore: 'Explorar',
    company: 'Empresa',
    help: 'Ajuda',
    legal: 'Legal',
    reviews: 'Avaliacoes',
    faq: 'FAQ',
    planTrip: 'Planejar viagem',
    terms: 'Termos e Condicoes',
    privacy: 'Politica de Privacidade',
    cancellation: 'Politica de Cancelamento',
    navigation: 'Navegacao',
    contact: 'Contato',
  },
  languageSwitcher: {
    selectLanguageAria: 'Selecionar idioma',
  },
  mobileStickyBar: {
    call: 'Ligar',
    whatsapp: 'WhatsApp',
    email: 'Email',
  },
  global404: {
    title: 'Pagina nao encontrada',
    body: 'A pagina que voce procura nao existe ou foi movida.',
    goHome: 'Ir para inicio',
  },
  globalError: {
    title: 'Algo deu errado',
    body: 'Ocorreu um erro inesperado. Tente recarregar a pagina.',
    tryAgain: 'Tentar novamente',
  },
  site404: {
    title: 'Pagina nao encontrada',
    body: 'Desculpe, a pagina que voce procura nao existe ou foi movida.',
    backHome: 'Voltar ao inicio',
    contactUs: 'Fale conosco',
  },
  siteError: {
    title: 'Algo deu errado',
    body: 'Desculpe, ocorreu um erro inesperado. Tente recarregar a pagina.',
    tryAgain: 'Tentar novamente',
  },
  contactForm: {
    titleDefault: 'Fale conosco',
    subtitleDefault: 'Estamos aqui para ajudar a planejar sua proxima viagem',
    emailLabel: 'Email',
    phoneLabel: 'Telefone',
    addressLabel: 'Endereco',
    successTitle: 'Mensagem enviada',
    successBody: 'Entraremos em contato em breve.',
    nameLabel: 'Nome',
    messageLabel: 'Mensagem',
    sendMessage: 'Enviar mensagem',
    sending: 'Enviando...',
    genericError: 'Erro ao enviar mensagem. Tente novamente.',
    rateLimitError: 'Muitas mensagens enviadas. Tente novamente mais tarde.',
  },
  quoteForm: {
    requestQuote: 'Solicitar cotacao',
    selectedProduct: 'Produto selecionado:',
    fullNameLabel: 'Nome completo *',
    emailLabel: 'Email *',
    phoneLabel: 'Telefone / WhatsApp',
    checkInLabel: 'Data de chegada',
    checkOutLabel: 'Data de saida',
    adultsLabel: 'Adultos',
    childrenLabel: 'Criancas',
    notesLabel: 'Comentarios adicionais',
    notesPlaceholder: 'Alguma preferencia ou solicitacao especial?',
    namePlaceholder: 'Seu nome',
    emailPlaceholder: 'voce@email.com',
    phonePlaceholder: '+55 11 99999 9999',
    submitQuote: 'Solicitar cotacao',
    submitting: 'Enviando...',
    submitWhatsapp: 'Enviar pelo WhatsApp',
    successTitle: 'Solicitacao enviada',
    successBody: 'Recebemos sua solicitacao de cotacao. Entraremos em contato em breve.',
    sendAnother: 'Enviar outra solicitacao',
    privacyNotice: 'Ao enviar, voce aceita que entraremos em contato para responder sua solicitacao.',
    requestError: 'Erro ao enviar solicitacao',
    connectionError: 'Erro de conexao. Tente novamente.',
    whatsappGreeting: 'Ola',
    whatsappInterested: 'Tenho interesse em solicitar cotacao para:',
    whatsappDestination: 'Destino',
    whatsappDates: 'Datas',
    whatsappDate: 'Data',
    whatsappTravelers: 'Viajantes',
    whatsappNotes: 'Notas',
    whatsappMyDetails: 'Meus dados:',
    whatsappThanks: 'Obrigado!',
    adultSingular: 'adulto',
    adultPlural: 'adultos',
    childSingular: 'crianca',
    childPlural: 'criancas',
  },
  bookingForm: {
    closeAria: 'Fechar',
    title: 'Reservar pelo WhatsApp',
    invalidFields: 'Revise os campos destacados.',
    rateLimit: 'Muitas tentativas, tente novamente em 1 minuto.',
    serverError: 'Nao conseguimos processar sua solicitacao, tente novamente.',
    reviewFields: 'Revise os campos destacados.',
    nameLabel: 'Nome',
    emailLabel: 'Email',
    phoneLabel: 'Telefone',
    consentTos: 'Aceito os termos e condicoes do servico.',
    consentPrivacy: 'Autorizo o tratamento dos meus dados para contato comercial.',
    submitting: 'Enviando...',
    continueWhatsapp: 'Continuar no WhatsApp',
  },
  blogListing: {
    title: 'Blog',
    heroDescription: 'Descubra as ultimas novidades, guias de viagem e dicas para sua proxima aventura',
    allCategories: 'Todos',
    noPosts: 'Nenhuma publicacao disponivel',
    previous: 'Anterior',
    next: 'Proximo',
    pageLabel: 'Pagina',
    ofLabel: 'de',
  },
  blogPost: {
    notFoundTitle: 'Post nao encontrado',
    breadcrumbHome: 'Inicio',
    breadcrumbBlog: 'Blog',
    readingTimeSuffix: 'min de leitura',
    backToBlog: 'Voltar ao blog',
    shareLabel: 'Compartilhar:',
    shareTwitterAria: 'Compartilhar no Twitter',
    shareFacebookAria: 'Compartilhar no Facebook',
    shareWhatsappAria: 'Compartilhar no WhatsApp',
  },
  searchPage: {
    eyebrow: 'Buscar',
    title: 'O que voce esta procurando?',
    placeholder: 'Destinos, hoteis, atividades, pacotes...',
    noResultsPrefix: 'Sem resultados para',
    noResultsSuffix: '',
    noResultsHint: 'Tente outros termos ou explore nossas categorias',
    resultSingular: 'resultado',
    resultPlural: 'resultados',
    resultFor: 'para',
    initialHint: 'Digite para buscar em todos os nossos produtos',
    destinationLabel: 'Destino',
    hotelLabel: 'Hotel',
    activityLabel: 'Atividade',
    transferLabel: 'Traslado',
    packageLabel: 'Pacote',
    destinationsCategory: 'Destinos',
    hotelsCategory: 'Hoteis',
    activitiesCategory: 'Atividades',
    packagesCategory: 'Pacotes',
  },
  legalPages: {
    siteNotFoundTitle: 'Site nao encontrado',
    breadcrumbHome: 'Inicio',
    backHome: 'Voltar ao inicio',
    termsTitle: 'Termos e Condicoes',
    termsDescriptionPrefix: 'Termos e condicoes de',
    privacyTitle: 'Politica de Privacidade',
    privacyDescriptionPrefix: 'Politica de privacidade de',
    cancellationTitle: 'Politica de Cancelamento',
    cancellationDescriptionPrefix: 'Politica de cancelamento de',
  },
  bookingWidget: {
    reserveExperience: 'Reservar esta experiencia',
    priceConsultPerPerson: 'Consulte o preco por pessoa',
    priceFromPerPersonPrefix: 'Desde',
    priceFromPerPersonSuffix: 'por pessoa',
    dateLabel: 'Data',
    peopleLabel: 'Pessoas',
    removePersonAria: 'Remover pessoa',
    addPersonAria: 'Adicionar pessoa',
    optionLabel: 'Opcao',
    reserveByWhatsapp: 'Reservar no WhatsApp',
    selectDatePrompt: 'Selecione uma data para continuar.',
  },
  datePicker: {
    next60Days: 'Proximos 60 dias',
    selectDateAria: 'Selecione uma data',
  },
  stickyCta: {
    quickActionsAria: 'Acoes rapidas de contato',
    fromLabel: 'Desde',
    whatsapp: 'WhatsApp',
    call: 'Ligar',
  },
  productDetail: {
    galleryTitle: 'Galeria',
    openGalleryAria: 'Abrir galeria em tela cheia',
    openFullscreenLabel: 'Ver em tela cheia',
    fromLabel: 'Desde',
    whatsappLabel: 'WhatsApp',
    searchPanelAria: 'Painel de busca',
    searchTitle: 'Buscar disponibilidade',
    searchSubtitle: 'Ajuste datas e viajantes para continuar na busca.',
    searchQueryLabel: 'Destino ou experiencia',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    adultsLabel: 'Adultos',
    childrenLabel: 'Criancas',
    searchButton: 'Buscar',
    viewAllLabel: 'Ver todos',
    sidebarWhatsappLabel: 'WhatsApp',
    sidebarCallLabel: 'Ligar',
    pricingOptionsTitle: 'Opcoes de tarifa',
    pricingSelectionAria: 'Selecao de tarifa',
    relatedEyebrow: 'Relacionados',
    relatedTitle: 'Tambem pode interessar',
    relatedPrevAria: 'Slide anterior',
    relatedPrevButton: 'Anterior',
    relatedNextAria: 'Proximo slide',
    relatedNextButton: 'Proximo',
    relatedListAria: 'Produtos relacionados',
  },
  whatsappFlow: {
    fabLabel: 'Cotar no WhatsApp',
    dialogTitle: 'Fluxo de WhatsApp',
    dialogDescription: 'Compartilhe seus dados e enviaremos uma proposta personalizada.',
    requiredContactError: 'Preencha nome e telefone para continuar.',
    submitError: 'Nao foi possivel iniciar o fluxo.',
    selectedTierPrefix: 'Tarifa selecionada:',
    travelDateLabel: 'Data estimada',
    adultsLabel: 'Adultos',
    childrenLabel: 'Criancas',
    notesLabel: 'Comentarios',
    notesPlaceholder: 'Ex: prefiro hotel em frente ao mar',
    continueButton: 'Continuar',
    nameLabel: 'Nome completo',
    emailOptionalLabel: 'Email (opcional)',
    phoneLabel: 'Telefone',
    backButton: 'Voltar',
    submitButton: 'Enviar pelo WhatsApp',
    submittingButton: 'Enviando...',
    successTitle: 'Solicitacao registrada',
    referenceLabel: 'Referencia:',
    openWhatsappButton: 'Abrir WhatsApp',
    closeButton: 'Fechar',
    variants: {
      A: {
        title: 'Consultoria expressa',
        subtitle: 'Enviaremos uma proposta no WhatsApp com base nas suas preferencias.',
      },
      B: {
        title: 'Proposta em minutos',
        subtitle: 'Priorizamos tarifas e horarios para uma decisao rapida.',
      },
      D: {
        title: 'Viagem sob medida',
        subtitle: 'Quanto mais contexto voce compartilhar, melhor o roteiro.',
      },
    },
  },
};

const FR_FR_MESSAGES: PublicUiMessages = mergeWithFallback(EN_US_MESSAGES, {
  nav: {
    home: 'Accueil',
    destinations: 'Destinations',
    packages: 'Forfaits',
    experiences: 'Expériences',
    about: 'À propos',
    advisory: 'Conseil',
    hotels: 'Hôtels',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menu',
    advisoryAria: 'Conseil voyage',
    planMyTrip: 'Planifier mon voyage',
    planMyTripWhatsapp: 'Planifier mon voyage sur WhatsApp',
    callNow: 'Appeler maintenant',
    preferences: 'Préférences',
    customizeExperience: 'Personnalisez votre expérience',
    language: 'Langue',
    currency: 'Devise',
    languageCurrencyCustomizationAria: 'Personnalisation de la langue et de la devise',
    customizationSrOnly: 'Personnalisation',
    siteLanguageAria: 'Langue du site',
    siteCurrencyAria: 'Devise du site',
    whatsappAria: 'Ouvrir WhatsApp',
  },
  footer: {
    rightsReserved: 'Tous droits réservés.',
    createdWithBukeer: 'Créé avec Bukeer',
    planTripTitle: 'Planifions votre voyage en Colombie',
    planTripSubtitle: 'Itinéraires, hôtels et activités en un seul conseil.',
    followUs: 'Suivez-nous pour découvrir de nouveaux itinéraires et expériences.',
    followUsSubtitle: 'Suivez-nous pour découvrir de nouveaux itinéraires et expériences.',
    talkWhatsapp: 'Parler sur WhatsApp',
    requestAdvisory: 'Demander un conseil',
    explore: 'Explorer',
    company: 'Entreprise',
    help: 'Aide',
    legal: 'Mentions légales',
    reviews: 'Avis',
    faq: 'FAQ',
    planTrip: 'Planifier le voyage',
    terms: 'Conditions générales',
    privacy: 'Politique de confidentialité',
    cancellation: "Politique d'annulation",
    navigation: 'Navigation',
    contact: 'Contact',
  },
  mobileStickyBar: {
    call: 'Appeler',
    whatsapp: 'WhatsApp',
    email: 'Email',
  },
  global404: {
    title: 'Page introuvable',
    body: "La page que vous cherchez n'existe pas ou a été déplacée.",
    goHome: "Retour à l'accueil",
  },
  site404: {
    title: 'Page introuvable',
    body: "Désolé, la page que vous cherchez n'existe pas ou a été déplacée.",
    backHome: "Retour à l'accueil",
    contactUs: 'Nous contacter',
  },
  contactForm: {
    titleDefault: 'Contactez-nous',
    subtitleDefault: 'Nous sommes là pour vous aider à planifier votre prochain voyage',
    emailLabel: 'Email',
    phoneLabel: 'Téléphone',
    addressLabel: 'Adresse',
    successTitle: 'Message envoyé',
    successBody: 'Nous vous contacterons bientôt.',
    nameLabel: 'Nom',
    messageLabel: 'Message',
    sendMessage: 'Envoyer le message',
    sending: 'Envoi...',
    genericError: "Erreur lors de l'envoi du message. Veuillez réessayer.",
    rateLimitError: 'Trop de messages envoyés. Veuillez réessayer plus tard.',
  },
  searchPage: {
    eyebrow: 'Recherche',
    title: 'Que cherchez-vous ?',
    placeholder: 'Destinations, hôtels, activités, forfaits...',
    noResultsPrefix: 'Aucun résultat pour',
    noResultsSuffix: '',
    noResultsHint: 'Essayez d’autres termes ou explorez nos catégories',
    resultSingular: 'résultat',
    resultPlural: 'résultats',
    resultFor: 'pour',
    initialHint: 'Tapez pour rechercher dans tous nos produits',
    destinationLabel: 'Destination',
    hotelLabel: 'Hôtel',
    activityLabel: 'Activité',
    transferLabel: 'Transfert',
    packageLabel: 'Forfait',
    destinationsCategory: 'Destinations',
    hotelsCategory: 'Hôtels',
    activitiesCategory: 'Activités',
    packagesCategory: 'Forfaits',
  },
  legalPages: {
    siteNotFoundTitle: 'Site introuvable',
    breadcrumbHome: 'Accueil',
    backHome: "Retour à l'accueil",
    termsTitle: 'Conditions générales',
    termsDescriptionPrefix: 'Conditions générales de',
    privacyTitle: 'Politique de confidentialité',
    privacyDescriptionPrefix: 'Politique de confidentialité de',
    cancellationTitle: "Politique d'annulation",
    cancellationDescriptionPrefix: "Politique d'annulation de",
  },
  stickyCta: {
    quickActionsAria: 'Actions de contact rapides',
    fromLabel: 'À partir de',
    whatsapp: 'WhatsApp',
    call: 'Appeler',
  },
  productDetail: {
    galleryTitle: 'Galerie',
    openGalleryAria: 'Ouvrir la galerie en plein écran',
    openFullscreenLabel: 'Voir en plein écran',
    fromLabel: 'À partir de',
    whatsappLabel: 'WhatsApp',
    searchPanelAria: 'Panneau de recherche',
    searchTitle: 'Rechercher la disponibilité',
    searchSubtitle: 'Ajustez les dates et les voyageurs pour continuer la recherche.',
    searchQueryLabel: 'Destination ou expérience',
    checkInLabel: 'Arrivée',
    checkOutLabel: 'Départ',
    adultsLabel: 'Adultes',
    childrenLabel: 'Enfants',
    searchButton: 'Rechercher',
    viewAllLabel: 'Voir tout',
    sidebarWhatsappLabel: 'WhatsApp',
    sidebarCallLabel: 'Appeler',
    pricingOptionsTitle: 'Options tarifaires',
    pricingSelectionAria: 'Sélection du tarif',
    relatedEyebrow: 'Associés',
    relatedTitle: 'Vous aimerez aussi',
    relatedPrevAria: 'Diapositive précédente',
    relatedPrevButton: 'Précédent',
    relatedNextAria: 'Diapositive suivante',
    relatedNextButton: 'Suivant',
    relatedListAria: 'Produits associés',
  },
});

const DE_DE_MESSAGES: PublicUiMessages = mergeWithFallback(EN_US_MESSAGES, {
  nav: {
    home: 'Startseite',
    destinations: 'Reiseziele',
    packages: 'Pakete',
    experiences: 'Erlebnisse',
    about: 'Über uns',
    advisory: 'Beratung',
    hotels: 'Hotels',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menü',
    advisoryAria: 'Reiseberatung',
    planMyTrip: 'Meine Reise planen',
    planMyTripWhatsapp: 'Meine Reise per WhatsApp planen',
    callNow: 'Jetzt anrufen',
    preferences: 'Einstellungen',
    customizeExperience: 'Erlebnis anpassen',
    language: 'Sprache',
    currency: 'Währung',
    languageCurrencyCustomizationAria: 'Sprache und Währung anpassen',
    customizationSrOnly: 'Anpassung',
    siteLanguageAria: 'Websitesprache',
    siteCurrencyAria: 'Websitewährung',
    whatsappAria: 'WhatsApp öffnen',
  },
  footer: {
    rightsReserved: 'Alle Rechte vorbehalten.',
    createdWithBukeer: 'Erstellt mit Bukeer',
    planTripTitle: 'Planen wir Ihre Kolumbienreise',
    planTripSubtitle: 'Routen, Hotels und Aktivitäten in einer Beratung.',
    followUs: 'Folgen Sie uns für neue Routen und Erlebnisse.',
    followUsSubtitle: 'Folgen Sie uns für neue Routen und Erlebnisse.',
    talkWhatsapp: 'Auf WhatsApp schreiben',
    requestAdvisory: 'Beratung anfragen',
    explore: 'Entdecken',
    company: 'Unternehmen',
    help: 'Hilfe',
    legal: 'Rechtliches',
    reviews: 'Bewertungen',
    faq: 'FAQ',
    planTrip: 'Reise planen',
    terms: 'Allgemeine Geschäftsbedingungen',
    privacy: 'Datenschutzrichtlinie',
    cancellation: 'Stornierungsbedingungen',
    navigation: 'Navigation',
    contact: 'Kontakt',
  },
  mobileStickyBar: {
    call: 'Anrufen',
    whatsapp: 'WhatsApp',
    email: 'E-Mail',
  },
  global404: {
    title: 'Seite nicht gefunden',
    body: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
    goHome: 'Zur Startseite',
  },
  site404: {
    title: 'Seite nicht gefunden',
    body: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
    backHome: 'Zur Startseite',
    contactUs: 'Kontakt aufnehmen',
  },
  contactForm: {
    titleDefault: 'Kontaktieren Sie uns',
    subtitleDefault: 'Wir helfen Ihnen gerne bei der Planung Ihrer nächsten Reise',
    emailLabel: 'E-Mail',
    phoneLabel: 'Telefon',
    addressLabel: 'Adresse',
    successTitle: 'Nachricht gesendet',
    successBody: 'Wir melden uns bald bei Ihnen.',
    nameLabel: 'Name',
    messageLabel: 'Nachricht',
    sendMessage: 'Nachricht senden',
    sending: 'Wird gesendet...',
    genericError: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.',
    rateLimitError: 'Zu viele Nachrichten gesendet. Bitte versuchen Sie es später erneut.',
  },
  searchPage: {
    eyebrow: 'Suche',
    title: 'Wonach suchen Sie?',
    placeholder: 'Reiseziele, Hotels, Aktivitäten, Pakete...',
    noResultsPrefix: 'Keine Ergebnisse für',
    noResultsSuffix: '',
    noResultsHint: 'Versuchen Sie andere Begriffe oder entdecken Sie unsere Kategorien',
    resultSingular: 'Ergebnis',
    resultPlural: 'Ergebnisse',
    resultFor: 'für',
    initialHint: 'Tippen Sie, um alle Produkte zu durchsuchen',
    destinationLabel: 'Reiseziel',
    hotelLabel: 'Hotel',
    activityLabel: 'Aktivität',
    transferLabel: 'Transfer',
    packageLabel: 'Paket',
    destinationsCategory: 'Reiseziele',
    hotelsCategory: 'Hotels',
    activitiesCategory: 'Aktivitäten',
    packagesCategory: 'Pakete',
  },
  legalPages: {
    siteNotFoundTitle: 'Website nicht gefunden',
    breadcrumbHome: 'Startseite',
    backHome: 'Zur Startseite',
    termsTitle: 'Allgemeine Geschäftsbedingungen',
    termsDescriptionPrefix: 'Allgemeine Geschäftsbedingungen für',
    privacyTitle: 'Datenschutzrichtlinie',
    privacyDescriptionPrefix: 'Datenschutzrichtlinie für',
    cancellationTitle: 'Stornierungsbedingungen',
    cancellationDescriptionPrefix: 'Stornierungsbedingungen für',
  },
  stickyCta: {
    quickActionsAria: 'Schnelle Kontaktaktionen',
    fromLabel: 'Ab',
    whatsapp: 'WhatsApp',
    call: 'Anrufen',
  },
  productDetail: {
    galleryTitle: 'Galerie',
    openGalleryAria: 'Galerie im Vollbild öffnen',
    openFullscreenLabel: 'Vollbild anzeigen',
    fromLabel: 'Ab',
    whatsappLabel: 'WhatsApp',
    searchPanelAria: 'Suchbereich',
    searchTitle: 'Verfügbarkeit suchen',
    searchSubtitle: 'Passen Sie Daten und Reisende an, um die Suche fortzusetzen.',
    searchQueryLabel: 'Reiseziel oder Erlebnis',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    adultsLabel: 'Erwachsene',
    childrenLabel: 'Kinder',
    searchButton: 'Suchen',
    viewAllLabel: 'Alle anzeigen',
    sidebarWhatsappLabel: 'WhatsApp',
    sidebarCallLabel: 'Anrufen',
    pricingOptionsTitle: 'Preisoptionen',
    pricingSelectionAria: 'Preisauswahl',
    relatedEyebrow: 'Ähnlich',
    relatedTitle: 'Das könnte Ihnen auch gefallen',
    relatedPrevAria: 'Vorherige Folie',
    relatedPrevButton: 'Zurück',
    relatedNextAria: 'Nächste Folie',
    relatedNextButton: 'Weiter',
    relatedListAria: 'Ähnliche Produkte',
  },
});

const MESSAGES_BY_LOCALE: Record<SupportedPublicUiLocale, PublicUiMessages> = {
  'es-CO': ES_CO_MESSAGES,
  'en-US': EN_US_MESSAGES,
  'pt-BR': PT_BR_MESSAGES,
  'fr-FR': FR_FR_MESSAGES,
  'de-DE': DE_DE_MESSAGES,
};

function mapLocaleToken(localeLike: string | null | undefined): SupportedPublicUiLocale {
  const normalized = (localeLike ?? '').trim();
  if (normalized.includes('-')) {
    const exact = SUPPORTED_PUBLIC_UI_LOCALES.find((locale) => locale.toLowerCase() === normalized.toLowerCase());
    if (exact) return exact;
  }

  const language = normalizeLanguageCode(normalized) ?? 'es';
  if (language === 'en') return 'en-US';
  if (language === 'pt') return 'pt-BR';
  if (language === 'fr') return 'fr-FR';
  if (language === 'de') return 'de-DE';
  return DEFAULT_PUBLIC_UI_LOCALE;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeWithFallback<T extends object>(
  fallback: T,
  selected: Partial<T>,
  path = '',
  missing: string[] = [],
): T {
  const fallbackRecord = fallback as Record<string, unknown>;
  const selectedRecord = selected as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(fallbackRecord)) {
    const nextPath = path ? `${path}.${key}` : key;
    const fallbackValue = fallbackRecord[key];
    const selectedValue = selectedRecord[key];

    if (isPlainObject(fallbackValue)) {
      output[key] = mergeWithFallback(
        fallbackValue,
        (isPlainObject(selectedValue) ? selectedValue : {}) as Partial<typeof fallbackValue>,
        nextPath,
        missing,
      );
      continue;
    }

    if (selectedValue === undefined || selectedValue === null) {
      output[key] = fallbackValue;
      missing.push(nextPath);
    } else {
      output[key] = selectedValue;
    }
  }

  return output as T;
}

export function resolvePublicUiLocale(localeLike: string | null | undefined): SupportedPublicUiLocale {
  return mapLocaleToken(localeLike);
}

export function getPublicUiMessages(localeLike: string | null | undefined): PublicUiMessages {
  return getPublicUiMessagesWithOverrides(localeLike);
}

export function getPublicUiMessagesWithOverrides(
  localeLike: string | null | undefined,
  overrides?: Partial<Record<SupportedPublicUiLocale, Partial<PublicUiMessages>>>,
): PublicUiMessages {
  const locale = mapLocaleToken(localeLike);
  const fallback = MESSAGES_BY_LOCALE[DEFAULT_PUBLIC_UI_LOCALE];
  const selected = overrides?.[locale] ?? MESSAGES_BY_LOCALE[locale];
  const missing: string[] = [];
  const merged = mergeWithFallback(fallback, selected, '', missing);

  if (process.env.NODE_ENV !== 'production' && missing.length > 0) {
    console.warn('[public-ui-messages:fallback]', {
      locale,
      fallbackLocale: DEFAULT_PUBLIC_UI_LOCALE,
      missingKeys: missing,
    });
  }

  return merged;
}

export function formatPublicDate(
  value: Date | string,
  localeLike: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = resolvePublicUiLocale(localeLike);
  return new Intl.DateTimeFormat(locale, options ?? {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatPublicCurrency(
  amount: number,
  currencyCode: string,
  localeLike: string | null | undefined,
): string {
  const locale = resolvePublicUiLocale(localeLike);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}
