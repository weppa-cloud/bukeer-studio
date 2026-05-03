const LANDING_SECTION_ALIAS_MAP: Record<string, string> = {
  itinerary: 'itinerary_accordion',
  itinerario: 'itinerary_accordion',
  program: 'itinerary_accordion',
  programa: 'itinerary_accordion',
  'dia-a-dia': 'itinerary_accordion',
  'día-a-día': 'itinerary_accordion',
  daybyday: 'itinerary_accordion',
  pricing: 'pricing',
  prices: 'pricing',
  precio: 'pricing',
  precios: 'pricing',
  faq: 'faq',
  faqs: 'faq',
  contacto: 'contact',
  contact: 'contact',
};

export function isWhatsAppHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href);
}

export function normalizeLandingSectionHref(href: string | null | undefined): string {
  if (!href) return '#';
  if (!href.startsWith('#')) return href;

  const rawAnchor = href.slice(1).trim();
  if (!rawAnchor) return href;

  const normalizedAnchor = rawAnchor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `#${LANDING_SECTION_ALIAS_MAP[normalizedAnchor] || normalizedAnchor}`;
}
