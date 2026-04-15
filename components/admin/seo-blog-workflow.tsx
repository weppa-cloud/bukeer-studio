'use client';

import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';
import { resolveBlogStatus } from '@/lib/seo/blog-status';

const BLOG_CHECKLIST: ChecklistItem[] = [
  {
    id: 'b1',
    label: 'Respuesta directa',
    criterion: 'Párrafo respuesta 40-60 palabras en primeros 100 words',
    status: 'unknown',
  },
  {
    id: 'b2',
    label: '≥1200 palabras',
    criterion: 'Word count ≥1200 para posts de blog',
    status: 'unknown',
  },
  {
    id: 'b3',
    label: 'H2s con variantes keyword',
    criterion: '≥3 H2s con variantes de la keyword target',
    status: 'unknown',
  },
  {
    id: 'b4',
    label: 'Imágenes con alt text',
    criterion: '≥3 imágenes con alt text descriptivo',
    status: 'unknown',
  },
  {
    id: 'b5',
    label: 'Internal links',
    criterion: '≥3 links internos a productos/destinos relevantes',
    status: 'unknown',
  },
  {
    id: 'b6',
    label: 'CTA en el cuerpo',
    criterion: 'Al menos 1 CTA contextual dentro del contenido',
    status: 'unknown',
  },
  {
    id: 'b7',
    label: 'Meta title con keyword',
    criterion: 'Keyword target en los primeros 60 chars del title',
    status: 'unknown',
  },
  {
    id: 'b8',
    label: 'Meta description atractiva',
    criterion: 'Beneficio claro + CTA en meta description',
    status: 'unknown',
  },
  {
    id: 'b9',
    label: 'Schema Article',
    criterion: 'JSON-LD Article con datePublished, author, image',
    status: 'unknown',
  },
  {
    id: 'b10',
    label: 'dateModified reciente',
    criterion: 'dateModified en JSON-LD ≤ 6 meses',
    status: 'unknown',
  },
];

function BlogStatusBadge({ score }: { score: number }) {
  const status = resolveBlogStatus(score);

  if (status === 'keeper') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        Keeper — mantener y crecer
      </span>
    );
  }

  if (status === 'optimize') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Optimize — actualizar contenido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
      Prune — evaluar eliminar o redirigir
    </span>
  );
}

interface SeoBlogWorkflowProps {
  itemId: string;
  itemName: string;
  itemUrl: string;
  locale: string;
  websiteId: string;
  seoPath: string;
  score: number;
  onClose: () => void;
}

export function SeoBlogWorkflow({
  itemId,
  itemName,
  itemUrl,
  locale,
  websiteId,
  seoPath,
  score,
  onClose,
}: SeoBlogWorkflowProps) {
  return (
    <SeoWorkflowPanel
      itemType="blog"
      itemId={itemId}
      itemName={itemName}
      itemUrl={itemUrl}
      locale={locale}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={BLOG_CHECKLIST}
      headerExtra={<BlogStatusBadge score={score} />}
    />
  );
}
