import { normalizeLanguageCode } from '@/lib/site/currency';

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
  };
}

const ES_MESSAGES: PublicUiMessages = {
  nav: {
    home: 'Inicio',
    destinations: 'Destinos',
    packages: 'Paquetes',
    experiences: 'Experiencias',
    about: 'Nosotros',
    advisory: 'Asesoría',
    hotels: 'Hoteles',
    blog: 'Blog',
  },
  header: {
    menuAria: 'Menú',
    advisoryAria: 'Asesoría',
    planMyTrip: 'Planear mi viaje',
    planMyTripWhatsapp: 'Planear mi viaje por WhatsApp',
    callNow: 'Llamar ahora',
    preferences: 'Preferencias',
    customizeExperience: 'Personaliza tu experiencia',
    language: 'Idioma',
    currency: 'Moneda',
    languageCurrencyCustomizationAria: 'Personalización de idioma y moneda',
    customizationSrOnly: 'Personalización',
    siteLanguageAria: 'Idioma del sitio',
    siteCurrencyAria: 'Moneda del sitio',
  },
  footer: {
    rightsReserved: 'Todos los derechos reservados.',
    createdWithBukeer: 'Creado con Bukeer',
    planTripTitle: 'Planifiquemos tu viaje por Colombia',
    planTripSubtitle: 'Itinerarios, hoteles y actividades en una sola asesoría.',
    followUs: 'Síguenos para descubrir nuevas rutas y experiencias.',
    followUsSubtitle: 'Síguenos para descubrir nuevas rutas y experiencias.',
    talkWhatsapp: 'Hablar por WhatsApp',
    requestAdvisory: 'Solicitar asesoría',
    explore: 'Explora',
    company: 'Compañía',
    help: 'Ayuda',
    legal: 'Legal',
    reviews: 'Reseñas',
    faq: 'Preguntas frecuentes',
    planTrip: 'Planear viaje',
    terms: 'Términos y Condiciones',
    privacy: 'Política de Privacidad',
    cancellation: 'Política de Cancelación',
    navigation: 'Navegación',
    contact: 'Contacto',
  },
  languageSwitcher: {
    selectLanguageAria: 'Seleccionar idioma',
  },
  mobileStickyBar: {
    call: 'Llamar',
  },
};

const EN_MESSAGES: PublicUiMessages = {
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
  },
};

export function getPublicUiMessages(localeLike: string | null | undefined): PublicUiMessages {
  const language = normalizeLanguageCode(localeLike) ?? 'es';
  return language === 'en' ? EN_MESSAGES : ES_MESSAGES;
}
