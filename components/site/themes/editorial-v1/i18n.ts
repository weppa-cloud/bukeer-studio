import type { WebsiteData } from '@/lib/supabase/get-website';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

type WebsiteLocaleCarrier = WebsiteData & {
  resolvedLocale?: string | null;
  default_locale?: string | null;
};

function resolveEditorialLocale(website?: WebsiteData | null): string {
  return (
    (website as WebsiteLocaleCarrier | null | undefined)?.resolvedLocale
    ?? (website as WebsiteLocaleCarrier | null | undefined)?.default_locale
    ?? 'es-CO'
  );
}

export function getEditorialTextGetter(website?: WebsiteData | null) {
  return getPublicUiExtraTextGetter(resolveEditorialLocale(website));
}

const EN_EDITORIAL_COPY_OVERRIDES: Record<string, string> = {
  'Planners en línea · responden en ~3 min': 'Planners online · reply in about 3 min',
  'Planners en línea': 'Planners online',
  'responden en ~3 min': 'reply in about 3 min',
  'Operador local · 14 años en Colombia': 'Local operator · 14 years in Colombia',
  'Operador local desde 2011': 'Local operator since 2011',
  'Colombia<br><em>como la cuenta</em><br>quien la camina.':
    'Colombia<br><em>told by</em><br>those who walk it.',
  'Colombia como la cuenta quien la camina.': 'Colombia, told by those who walk it.',
  'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.':
    'Journeys designed with local guides, family-run fincas, and places beyond guidebooks. From the Caribbean to the Amazon.',
  'Planea mi viaje': 'Plan my trip',
  'Planea mi viaje por WhatsApp': 'Plan my trip on WhatsApp',
  'Planear por WhatsApp': 'Plan on WhatsApp',
  'Ver experiencias': 'View experiences',
  'Ocho Colombias, <em>un mismo viaje.</em>': 'Eight Colombias, <em>one journey.</em>',
  'Ocho Colombias, <em>ocho ritmos.</em>': 'Eight Colombias, <em>eight rhythms.</em>',
  'Ocho Colombias <em>en un mismo viaje.</em>': 'Eight Colombias <em>in one journey.</em>',
  'Ocho Colombias <em>un mismo viaje.</em>': 'Eight Colombias <em>one journey.</em>',
  'Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo.':
    'From the seven-color sea to the La Guajira desert. Each region with its own guides, flavors, and pace.',
  'Itinerarios pensados, <em>listos para ajustarse a ti.</em>':
    'Thoughtful itineraries, <em>ready to adapt to you.</em>',
  'Itinerarios pensados <em>listos para ajustarse a ti.</em>':
    'Thoughtful itineraries <em>ready to adapt to you.</em>',
  'Filtramos categorías con logística resuelta sin prisa ni afán.':
    'Curated categories with logistics solved, no rush required.',
  'Un país <em>en cada región.</em>': 'A country <em>in every region.</em>',
  'Del Caribe al Amazonas, de los Andes al Pacífico. Trazá rutas por región.':
    'From the Caribbean to the Amazon, from the Andes to the Pacific. Explore by region.',
  'Ver paquetes': 'View packages',
  'Descubre Colombia con expertos locales': 'Discover Colombia with local experts',
  'Descubre Colombia con expertos locales.': 'Discover Colombia with local experts.',
  'Paquetes': 'Packages',
  'Destinos': 'Destinations',
  'Experiencias': 'Experiences',
  'Actividades': 'Activities',
  'Nosotros': 'About us',
  'Sobre nosotros': 'About us',
  'Contacto': 'Contact',
  'Hoteles boutique': 'Boutique hotels',
  'Luna de miel': 'Honeymoon',
  'Grupos y corporativo': 'Groups and corporate',
  'Nuestros planners': 'Our planners',
  'Prensa': 'Press',
  'Por qué ColombiaTours': 'Why ColombiaTours',
  'Hablar con un planner': 'Talk to a planner',
  'Operador local, no intermediario': 'Local operator, not a middleman',
  'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.': 'We are the agency. No handoffs or last-minute surprises.',
  'Viaje asegurado de punta a punta': 'Insured trip from end to end',
  'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.': 'Medical assistance, cancellation coverage and 24/7 support in Spanish, English and French.',
  'Turismo con impacto': 'Travel with impact',
  'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.': 'Family-run stays, community guides and lower-footprint operations.',
  'Un viaje bien hecho <em>se nota.</em>': 'A well-crafted trip <em>shows.</em>',
  'No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado.':
    'We do not sell slots: we design journeys. Every route is reviewed by a local planner who knows it by walking it.',
  'Cotizar con un planner': 'Get a quote with a planner',
  'Una persona que te conoce de principio a fin.':
    'One person who knows your trip end to end.',
  'Una persona que te conoce <em>de principio a fin.</em>':
    'One person who knows your trip <em>end to end.</em>',
  'Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas.':
    'We match your profile with the planner who knows your region or experience best.',
  'El recuerdo <em>después</em> del viaje.': 'The memory <em>after</em> the trip.',
  'El recuerdo <em>después</em> del viaje': 'The memory <em>after</em> the trip',
  'Lo que nos preguntan antes de reservar.': 'What travelers ask before booking.',
  'Lo que nos preguntan antes de reservar': 'What travelers ask before booking',
  '¿No encuentras la respuesta? Escribe a tu planner — respondemos en <2h hábiles.':
    'Did not find your answer? Message your planner — we reply in <2 business hours.',
  'Chat por WhatsApp': 'Chat on WhatsApp',
  '¿Es seguro viajar a Colombia hoy?': 'Is it safe to travel to Colombia today?',
  '¿Qué incluye el precio del paquete?': 'What is included in the package price?',
  '¿Puedo personalizar el itinerario?': 'Can I customize the itinerary?',
  '¿Cómo se paga la reserva?': 'How do I pay for the booking?',
  '¿Qué pasa si tengo que cancelar?': 'What happens if I need to cancel?',
  '¿Necesito vacunas o visa?': 'Do I need vaccines or a visa?',
  'Tu Colombia, <em>en 3 pasos.</em>': 'Your Colombia, <em>in 3 steps.</em>',
  'Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres.':
    'Tell us what you are looking for, get a proposal in 24h with 2-3 route options, and fine-tune it with your planner.',
  'Chat WhatsApp': 'WhatsApp chat',
  'Responden en ~3 min · Planner humano': 'Replies in about 3 min · Human planner',
};

const FR_EDITORIAL_COPY_OVERRIDES: Record<string, string> = {
  'Planners en línea · responden en ~3 min': 'Conseillers en ligne · réponse en ~3 min',
  'Planners en línea': 'Conseillers en ligne',
  'responden en ~3 min': 'réponse en ~3 min',
  'Operador local · 14 años en Colombia': 'Opérateur local · 14 ans en Colombie',
  'Operador local desde 2011': 'Opérateur local depuis 2011',
  'Colombia<br><em>como la cuenta</em><br>quien la camina.': 'La Colombie<br><em>racontée</em><br>par celles et ceux qui la parcourent.',
  'Colombia como la cuenta quien la camina.': 'La Colombie racontée par celles et ceux qui la parcourent.',
  'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.': 'Itinéraires conçus avec des guides locaux, des fincas familiales et des lieux absents des guides. Des Caraïbes à l’Amazonie.',
  'Planea mi viaje': 'Planifier mon voyage',
  'Planea mi viaje por WhatsApp': 'Planifier mon voyage sur WhatsApp',
  'Planear por WhatsApp': 'Planifier sur WhatsApp',
  'Ver paquetes': 'Voir les forfaits',
  'Descubre Colombia con expertos locales': 'Découvrez la Colombie avec des experts locaux',
  'Descubre Colombia con expertos locales.': 'Découvrez la Colombie avec des experts locaux.',
  'Paquetes': 'Forfaits',
  'Destinos': 'Destinations',
  'Experiencias': 'Expériences',
  'Actividades': 'Activités',
  'Nosotros': 'À propos',
  'Sobre nosotros': 'À propos',
  'Contacto': 'Contact',
  'Hoteles boutique': 'Hôtels boutique',
  'Luna de miel': 'Voyage de noces',
  'Grupos y corporativo': 'Groupes et entreprises',
  'Nuestros planners': 'Nos conseillers',
  'Prensa': 'Presse',
  'Por qué ColombiaTours': 'Pourquoi ColombiaTours',
  'Hablar con un planner': 'Parler à un conseiller',
  'Operador local, no intermediario': 'Opérateur local, sans intermédiaire',
  'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.': 'Nous sommes l’agence. Pas d’intermédiaires ni de mauvaises surprises de dernière minute.',
  'Viaje asegurado de punta a punta': 'Voyage assuré de bout en bout',
  'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.': 'Assistance médicale, couverture annulation et support 24/7 en espagnol, anglais et français.',
  'Turismo con impacto': 'Tourisme à impact',
  'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.': 'Hébergements familiaux, guides issus des communautés et opérations à faible empreinte.',
};

const DE_EDITORIAL_COPY_OVERRIDES: Record<string, string> = {
  'Planners en línea · responden en ~3 min': 'Planner online · Antwort in ~3 Min.',
  'Planners en línea': 'Planner online',
  'responden en ~3 min': 'Antwort in ~3 Min.',
  'Operador local · 14 años en Colombia': 'Lokaler Veranstalter · 14 Jahre in Kolumbien',
  'Operador local desde 2011': 'Lokaler Veranstalter seit 2011',
  'Colombia<br><em>como la cuenta</em><br>quien la camina.': 'Kolumbien<br><em>erzählt von</em><br>denen, die es bereisen.',
  'Colombia como la cuenta quien la camina.': 'Kolumbien, erzählt von denen, die es bereisen.',
  'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.': 'Reisen, gestaltet mit lokalen Guides, familiengeführten Fincas und Orten abseits der Reiseführer. Von der Karibik bis zum Amazonas.',
  'Planea mi viaje': 'Meine Reise planen',
  'Planea mi viaje por WhatsApp': 'Meine Reise per WhatsApp planen',
  'Planear por WhatsApp': 'Per WhatsApp planen',
  'Ver paquetes': 'Pakete ansehen',
  'Descubre Colombia con expertos locales': 'Entdecken Sie Kolumbien mit lokalen Experten',
  'Descubre Colombia con expertos locales.': 'Entdecken Sie Kolumbien mit lokalen Experten.',
  'Paquetes': 'Pakete',
  'Destinos': 'Reiseziele',
  'Experiencias': 'Erlebnisse',
  'Actividades': 'Aktivitäten',
  'Nosotros': 'Über uns',
  'Sobre nosotros': 'Über uns',
  'Contacto': 'Kontakt',
  'Hoteles boutique': 'Boutique-Hotels',
  'Luna de miel': 'Flitterwochen',
  'Grupos y corporativo': 'Gruppen und Firmenreisen',
  'Nuestros planners': 'Unsere Planner',
  'Prensa': 'Presse',
  'Por qué ColombiaTours': 'Warum ColombiaTours',
  'Hablar con un planner': 'Mit einem Planner sprechen',
  'Operador local, no intermediario': 'Lokaler Veranstalter, kein Vermittler',
  'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.': 'Wir sind die Agentur. Keine Umwege und keine Überraschungen in letzter Minute.',
  'Viaje asegurado de punta a punta': 'Abgesicherte Reise von Anfang bis Ende',
  'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.': 'Medizinische Assistenz, Stornoschutz und 24/7-Betreuung auf Spanisch, Englisch und Französisch.',
  'Turismo con impacto': 'Reisen mit Wirkung',
  'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.': 'Familiengeführte Unterkünfte, Community-Guides und emissionsärmere Abläufe.',
};

const PT_EDITORIAL_COPY_OVERRIDES: Record<string, string> = {
  'Planners en línea · responden en ~3 min': 'Planners online · respondem em ~3 min',
  'Planners en línea': 'Planners online',
  'responden en ~3 min': 'respondem em ~3 min',
  'Operador local · 14 años en Colombia': 'Agência local · 14 anos na Colômbia',
  'Operador local desde 2011': 'Agência local desde 2011',
  'Colombia<br><em>como la cuenta</em><br>quien la camina.': 'Colômbia<br><em>contada por</em><br>quem a percorre.',
  'Colombia como la cuenta quien la camina.': 'Colômbia contada por quem a percorre.',
  'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.': 'Roteiros desenhados com guias locais, fincas familiares e lugares fora dos guias. Do Caribe à Amazônia.',
  'Planea mi viaje': 'Planejar minha viagem',
  'Planea mi viaje por WhatsApp': 'Planejar minha viagem pelo WhatsApp',
  'Planear por WhatsApp': 'Planejar pelo WhatsApp',
  'Ver paquetes': 'Ver pacotes',
  'Descubre Colombia con expertos locales': 'Descubra a Colômbia com especialistas locais',
  'Descubre Colombia con expertos locales.': 'Descubra a Colômbia com especialistas locais.',
  'Paquetes': 'Pacotes',
  'Destinos': 'Destinos',
  'Experiencias': 'Experiências',
  'Actividades': 'Atividades',
  'Nosotros': 'Sobre nós',
  'Sobre nosotros': 'Sobre nós',
  'Contacto': 'Contato',
  'Hoteles boutique': 'Hotéis boutique',
  'Luna de miel': 'Lua de mel',
  'Grupos y corporativo': 'Grupos e corporativo',
  'Nuestros planners': 'Nossos planners',
  'Prensa': 'Imprensa',
  'Por qué ColombiaTours': 'Por que ColombiaTours',
  'Hablar con un planner': 'Falar com um planner',
  'Operador local, no intermediario': 'Operadora local, sem intermediários',
  'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.': 'Somos a agência. Sem triangulações nem surpresas de última hora.',
  'Viaje asegurado de punta a punta': 'Viagem protegida de ponta a ponta',
  'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.': 'Assistência médica, cobertura de cancelamento e atendimento 24/7 em espanhol, inglês e francês.',
  'Turismo con impacto': 'Turismo com impacto',
  'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.': 'Hospedagens familiares, guias das comunidades e operações de baixa pegada.',
};

const EDITORIAL_COPY_OVERRIDES_BY_LOCALE: Array<[
  prefix: string,
  overrides: Record<string, string>,
]> = [
  ['en', EN_EDITORIAL_COPY_OVERRIDES],
  ['fr', FR_EDITORIAL_COPY_OVERRIDES],
  ['de', DE_EDITORIAL_COPY_OVERRIDES],
  ['pt', PT_EDITORIAL_COPY_OVERRIDES],
];

const EN_EDITORIAL_FRAGMENT_OVERRIDES: Array<[from: string, to: string]> = [
  ['Ocho Colombias', 'Eight Colombias'],
  ['en un mismo viaje', 'in one journey'],
  ['Itinerarios pensados', 'Thoughtful itineraries'],
  ['listos para ajustarse a ti', 'ready to adapt to you'],
  ['Un país', 'A country'],
  ['en cada región', 'in every region'],
  ['Una persona que te conoce', 'One person who knows your trip'],
  ['de principio a fin', 'end to end'],
  ['El recuerdo', 'The memory'],
  ['después', 'after'],
  ['Lo que nos preguntan antes de reservar', 'What travelers ask before booking'],
];

export function localizeEditorialText(
  website: WebsiteData | null | undefined,
  value: string | null | undefined,
): string {
  const raw = (value ?? '').toString();
  if (!raw) return '';
  const locale = resolveEditorialLocale(website).toLowerCase();
  const exactOverrides = EDITORIAL_COPY_OVERRIDES_BY_LOCALE.find(([prefix]) =>
    locale.startsWith(prefix),
  )?.[1];
  const exact = exactOverrides?.[raw];
  if (exact) return exact;

  if (!locale.startsWith('en')) return raw;

  let localized = raw;
  for (const [from, to] of EN_EDITORIAL_FRAGMENT_OVERRIDES) {
    localized = localized.replaceAll(from, to);
  }
  return localized;
}
