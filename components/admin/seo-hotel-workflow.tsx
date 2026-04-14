'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

const HOTEL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'h1',
    label: 'Título con destino',
    criterion: 'Nombre hotel + ciudad en ≤60 chars',
    status: 'unknown',
  },
  {
    id: 'h2',
    label: 'Meta description',
    criterion: 'Incluye precio desde, estrellas o amenidad clave en 120-160 chars',
    status: 'unknown',
  },
  {
    id: 'h3',
    label: 'Imagen principal',
    criterion: 'og:image definida, formato 1200x630',
    status: 'unknown',
  },
  {
    id: 'h4',
    label: 'Galería mínima',
    criterion: '≥5 fotos con alt text',
    status: 'unknown',
  },
  {
    id: 'h5',
    label: 'Star rating visible',
    criterion: 'Estrellas mostradas above-fold',
    status: 'unknown',
  },
  {
    id: 'h6',
    label: 'Precio desde visible',
    criterion: 'Precio visible en los primeros 100 words, no "consultar"',
    status: 'unknown',
  },
  {
    id: 'h7',
    label: 'Amenidades listadas',
    criterion: '≥8 amenidades con iconografía',
    status: 'unknown',
  },
  {
    id: 'h8',
    label: 'Check-in/check-out',
    criterion: 'Horarios visibles en la página',
    status: 'unknown',
  },
  {
    id: 'h9',
    label: 'Ubicación/mapa',
    criterion: 'Mapa o dirección visible',
    status: 'unknown',
  },
  {
    id: 'h10',
    label: 'JSON-LD LodgingBusiness',
    criterion: 'Schema LodgingBusiness con aggregateRating',
    status: 'unknown',
  },
  {
    id: 'h11',
    label: 'Reviews/Rating',
    criterion: 'Rating numérico visible, ≥10 reviews',
    status: 'unknown',
  },
  {
    id: 'h12',
    label: 'CTA claro',
    criterion: 'Botón "Reservar" o "Ver disponibilidad" above-fold',
    status: 'unknown',
  },
];

interface SeoHotelWorkflowProps {
  itemName: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoHotelWorkflow({ itemName, websiteId, seoPath, onClose }: SeoHotelWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="hotel"
      itemName={itemName}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={HOTEL_CHECKLIST}
    />
  );
}
