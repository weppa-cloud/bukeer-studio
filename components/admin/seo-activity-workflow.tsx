'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

const ACTIVITY_CHECKLIST: ChecklistItem[] = [
  {
    id: 'a1',
    label: 'Título con destino y precio',
    criterion: 'actividad + destino + precio desde en ≤60 chars',
    status: 'unknown',
  },
  {
    id: 'a2',
    label: 'Incluye/No incluye visible',
    criterion: 'Bloque above-fold con iconografía ✅/❌',
    status: 'unknown',
  },
  {
    id: 'a3',
    label: 'Detalles prácticos',
    criterion: 'Duración, dificultad, edad recomendada, qué llevar',
    status: 'unknown',
  },
  {
    id: 'a4',
    label: 'Punto de encuentro',
    criterion: 'Dirección o mapa del meeting point visible',
    status: 'unknown',
  },
  {
    id: 'a5',
    label: 'Galería de la experiencia',
    criterion: '≥5 fotos con alt text descriptivo',
    status: 'unknown',
  },
  {
    id: 'a6',
    label: 'Itinerario/programa',
    criterion: 'Programa día visible (no oculto en acordeón)',
    status: 'unknown',
  },
  {
    id: 'a7',
    label: 'JSON-LD TouristAttraction',
    criterion: 'Schema con geo, name, description, image',
    status: 'unknown',
  },
  {
    id: 'a8',
    label: 'Precio desde visible',
    criterion: 'Precio above-fold, no "consultar precio"',
    status: 'unknown',
  },
  {
    id: 'a9',
    label: 'CTA reserva',
    criterion: 'Botón "Reservar" above-fold, color contrastante',
    status: 'unknown',
  },
  {
    id: 'a10',
    label: 'Meta description con precio',
    criterion: 'Precio desde X en meta description',
    status: 'unknown',
  },
];

interface SeoActivityWorkflowProps {
  itemId: string;
  itemName: string;
  itemUrl: string;
  locale: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoActivityWorkflow({
  itemId,
  itemName,
  itemUrl,
  locale,
  websiteId,
  seoPath,
  onClose,
}: SeoActivityWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="activity"
      itemId={itemId}
      itemName={itemName}
      itemUrl={itemUrl}
      locale={locale}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={ACTIVITY_CHECKLIST}
    />
  );
}
