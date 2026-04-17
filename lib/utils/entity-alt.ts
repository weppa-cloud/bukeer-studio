/**
 * SEO-optimized, locale-aware alt text for entity images that lack a dedicated
 * alt field (destinations, hotels, packages, blog posts, planners, itinerary days).
 */

type EntityType = 'destination' | 'hotel' | 'package' | 'blog' | 'planner' | 'day';

type Template = (name: string, agency: string) => string;

const TEMPLATES: Record<EntityType, Record<string, Template>> = {
  destination: {
    es: (n, a) => `Destino turístico ${n} en Colombia — ${a}`,
    en: (n, a) => `${n} tourist destination in Colombia — ${a}`,
    pt: (n, a) => `Destino turístico ${n} na Colômbia — ${a}`,
  },
  hotel: {
    es: (n, a) => `Hotel ${n} en Colombia — ${a}`,
    en: (n, a) => `${n} hotel in Colombia — ${a}`,
    pt: (n, a) => `Hotel ${n} na Colômbia — ${a}`,
  },
  package: {
    es: (n, a) => `Paquete turístico ${n} — ${a}`,
    en: (n, a) => `${n} travel package — ${a}`,
    pt: (n, a) => `Pacote turístico ${n} — ${a}`,
  },
  blog: {
    es: (n) => `Imagen destacada: ${n}`,
    en: (n) => `Featured image: ${n}`,
    pt: (n) => `Imagem destacada: ${n}`,
  },
  planner: {
    es: (n, a) => `Asesor de viajes ${n} — ${a}`,
    en: (n, a) => `Travel advisor ${n} — ${a}`,
    pt: (n, a) => `Consultor de viagens ${n} — ${a}`,
  },
  day: {
    es: (n) => `Itinerario — ${n}`,
    en: (n) => `Itinerary — ${n}`,
    pt: (n) => `Itinerário — ${n}`,
  },
};

export function buildEntityAlt(
  type: EntityType,
  name: string,
  locale: string,
  agencyName = '',
): string {
  const lang = locale.split('-')[0];
  const t = TEMPLATES[type]?.[lang] ?? TEMPLATES[type]?.['es'];
  return t ? t(name, agencyName) : name;
}
