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
  'Operador local · 14 años en Colombia': 'Local operator · 14 years in Colombia',
  'Colombia<br><em>como la cuenta</em><br>quien la camina.':
    'Colombia<br><em>told by</em><br>those who walk it.',
  'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.':
    'Journeys designed with local guides, family-run fincas, and places beyond guidebooks. From the Caribbean to the Amazon.',
  'Planea mi viaje': 'Plan my trip',
  'Ver experiencias': 'View experiences',
  'Ocho Colombias, <em>un mismo viaje.</em>': 'Eight Colombias, <em>one journey.</em>',
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
};

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
  const locale = resolveEditorialLocale(website);
  if (!locale.toLowerCase().startsWith('en')) return raw;

  const exact = EN_EDITORIAL_COPY_OVERRIDES[raw];
  if (exact) return exact;

  let localized = raw;
  for (const [from, to] of EN_EDITORIAL_FRAGMENT_OVERRIDES) {
    localized = localized.replaceAll(from, to);
  }
  return localized;
}
