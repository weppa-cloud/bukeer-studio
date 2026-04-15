'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

const DESTINATION_CHECKLIST: ChecklistItem[] = [
  {
    id: 'd1',
    label: 'H1 con keyword + TOC',
    criterion: 'H1 con keyword destino + tabla de contenidos',
    status: 'unknown',
  },
  {
    id: 'd2',
    label: '≥1500 palabras',
    criterion: 'Word count ≥1500 para pillar page autoridad',
    status: 'unknown',
  },
  {
    id: 'd3',
    label: 'Secciones cluster',
    criterion: 'Links internos a hoteles, actividades, paquetes del destino',
    status: 'unknown',
  },
  {
    id: 'd4',
    label: 'Mapa interactivo',
    criterion: 'Mapa embebido o coordenadas visibles',
    status: 'unknown',
  },
  {
    id: 'd5',
    label: 'Imagen hero 1200x630',
    criterion: 'Foto representativa del destino above-fold',
    status: 'unknown',
  },
  {
    id: 'd6',
    label: 'FAQ del destino',
    criterion: '≥5 preguntas frecuentes del destino',
    status: 'unknown',
  },
  {
    id: 'd7',
    label: 'JSON-LD TouristDestination',
    criterion: 'Schema con geo, name, description, image',
    status: 'unknown',
  },
  {
    id: 'd8',
    label: 'Breadcrumb',
    criterion: 'Colombia > Destino en breadcrumb visible',
    status: 'unknown',
  },
  {
    id: 'd9',
    label: 'Cuando ir/clima',
    criterion: 'Sección de mejor época para visitar',
    status: 'unknown',
  },
  {
    id: 'd10',
    label: 'CTA a productos',
    criterion: 'Cards de hoteles/tours disponibles al final',
    status: 'unknown',
  },
];

interface SeoDestinationWorkflowProps {
  itemId: string;
  itemName: string;
  itemUrl: string;
  locale: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoDestinationWorkflow({
  itemId,
  itemName,
  itemUrl,
  locale,
  websiteId,
  seoPath,
  onClose,
}: SeoDestinationWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="destination"
      itemId={itemId}
      itemName={itemName}
      itemUrl={itemUrl}
      locale={locale}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={DESTINATION_CHECKLIST}
    />
  );
}
