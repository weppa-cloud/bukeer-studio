'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

const PACKAGE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'p1',
    label: 'Título con USP y duración',
    criterion: 'USP + duración + destino en ≤60 chars',
    status: 'unknown',
  },
  {
    id: 'p2',
    label: 'Precio desde visible',
    criterion: 'Precio visible above-fold, no "consultar precio"',
    status: 'unknown',
  },
  {
    id: 'p3',
    label: 'Itinerario día-a-día',
    criterion: 'Cada día con actividades visibles (no acordeón)',
    status: 'unknown',
  },
  {
    id: 'p4',
    label: 'Qué incluye/excluye',
    criterion: 'Lista clara con iconografía',
    status: 'unknown',
  },
  {
    id: 'p5',
    label: 'Imágenes del destino',
    criterion: '≥6 fotos de los destinos del paquete',
    status: 'unknown',
  },
  {
    id: 'p6',
    label: 'Nivel de dificultad',
    criterion: 'Badge de dificultad/tipo de viajero',
    status: 'unknown',
  },
  {
    id: 'p7',
    label: 'JSON-LD TouristTrip',
    criterion: 'Schema con itinerary, offers, price',
    status: 'unknown',
  },
  {
    id: 'p8',
    label: 'Reseñas/testimonios',
    criterion: '≥2 testimonios del paquete visible',
    status: 'unknown',
  },
  {
    id: 'p9',
    label: 'CTA whatsapp/contacto',
    criterion: 'CTA flotante o sticky en mobile',
    status: 'unknown',
  },
  {
    id: 'p10',
    label: 'Fechas disponibles',
    criterion: 'Calendario o próximas salidas visible',
    status: 'unknown',
  },
  {
    id: 'p11',
    label: 'Política de cancelación',
    criterion: 'Política visible en la página del paquete',
    status: 'unknown',
  },
];

interface SeoPackageWorkflowProps {
  itemName: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoPackageWorkflow({
  itemName,
  websiteId,
  seoPath,
  onClose,
}: SeoPackageWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="package"
      itemName={itemName}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={PACKAGE_CHECKLIST}
    />
  );
}
