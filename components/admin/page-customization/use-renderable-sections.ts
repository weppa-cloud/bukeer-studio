export type ProductType = 'activity' | 'hotel' | 'transfer' | 'destination' | 'package';

export interface RenderableSection {
  key: string;
  label: string;
  description: string;
}

const COMMON_SECTIONS: RenderableSection[] = [
  { key: 'hero', label: 'Hero', description: 'Cabecera con imagen + título + CTAs' },
  { key: 'highlights', label: 'Highlights', description: 'Grid de beneficios destacados' },
  { key: 'gallery', label: 'Galería', description: 'Imágenes del producto' },
  { key: 'description', label: 'Descripción', description: 'Texto largo del producto' },
  { key: 'include_exclude', label: 'Incluye / No incluye', description: 'Listas paralelas' },
  { key: 'faq', label: 'FAQ', description: 'Preguntas frecuentes' },
  { key: 'trust', label: 'Trust badges', description: 'RNT, certificaciones, años' },
  { key: 'reviews', label: 'Google reviews', description: 'Si el website lo tiene habilitado' },
  { key: 'similar', label: 'Productos similares', description: 'Carousel de 3 productos' },
  { key: 'final_cta', label: 'CTA final', description: '¿Listo para vivir esta experiencia?' },
];

const ACTIVITY_SPECIFIC: RenderableSection[] = [
  { key: 'recommendations', label: 'Recomendaciones', description: 'Lista de tips' },
  { key: 'program_timeline', label: 'Programa', description: 'Timeline vertical con horarios' },
  { key: 'circuit_map_activity', label: 'Mapa del circuito', description: '≥2 paradas geocodificables' },
  { key: 'options_table', label: 'Tabla de opciones', description: 'Precios por unidad/temporada' },
];

const PACKAGE_SPECIFIC: RenderableSection[] = [
  { key: 'circuit_map_package', label: 'Mapa de la ruta', description: 'Ciudades del itinerario' },
  { key: 'day_by_day', label: 'Día a día', description: 'Itinerario por tipo de producto' },
];

const HOTEL_SPECIFIC: RenderableSection[] = [
  { key: 'amenities_grid', label: 'Amenities', description: 'Grid de servicios del hotel' },
  { key: 'room_types', label: 'Tipos de habitación', description: 'Tarifas por tipo' },
];

const MEETING_POINT: RenderableSection = {
  key: 'meeting_point',
  label: 'Punto de encuentro',
  description: 'Mapa con pin + dirección',
};

export function useRenderableSections(productType: ProductType): RenderableSection[] {
  const typeSections = (() => {
    switch (productType) {
      case 'activity':
        return ACTIVITY_SPECIFIC;
      case 'package':
        return PACKAGE_SPECIFIC;
      case 'hotel':
        return HOTEL_SPECIFIC;
      case 'transfer':
      case 'destination':
        return [];
      default:
        return [];
    }
  })();

  return [...COMMON_SECTIONS.slice(0, 4), ...typeSections, MEETING_POINT, ...COMMON_SECTIONS.slice(4)];
}
