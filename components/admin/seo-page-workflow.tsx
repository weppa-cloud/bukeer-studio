'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

const PAGE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'pg1',
    label: 'Title alineado a intención',
    criterion: 'Title con keyword primaria y beneficio claro',
    status: 'unknown',
  },
  {
    id: 'pg2',
    label: 'Meta description con CTA',
    criterion: 'Meta description de 120-160 chars con CTA',
    status: 'unknown',
  },
  {
    id: 'pg3',
    label: 'Estructura H1/H2',
    criterion: 'H1 único + H2 temáticos por sección',
    status: 'unknown',
  },
  {
    id: 'pg4',
    label: 'Internal linking',
    criterion: 'Al menos 3 enlaces internos contextuales',
    status: 'unknown',
  },
  {
    id: 'pg5',
    label: 'Schema WebPage',
    criterion: 'JSON-LD WebPage válido',
    status: 'unknown',
  },
];

interface SeoPageWorkflowProps {
  itemId: string;
  itemName: string;
  itemUrl: string;
  locale: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoPageWorkflow({
  itemId,
  itemName,
  itemUrl,
  locale,
  websiteId,
  seoPath,
  onClose,
}: SeoPageWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="page"
      itemId={itemId}
      itemName={itemName}
      itemUrl={itemUrl}
      locale={locale}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={PAGE_CHECKLIST}
    />
  );
}
