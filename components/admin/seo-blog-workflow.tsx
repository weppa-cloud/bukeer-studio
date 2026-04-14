'use client';

import { useState } from 'react';
import { SeoWorkflowPanel, type ChecklistItem } from './seo-workflow-panel';

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

function computeScore(checklist: ChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  const points = checklist.reduce((acc, item) => {
    if (item.status === 'pass') return acc + 1;
    if (item.status === 'warning') return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((points / checklist.length) * 100);
}

function BlogStatusBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        🏆 Keeper — mantener y crecer
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        🔧 Optimize — actualizar contenido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
      ✂️ Prune — evaluar eliminar o redirigir
    </span>
  );
}

interface SeoBlogWorkflowProps {
  itemName: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
}

export function SeoBlogWorkflow({
  itemName,
  websiteId,
  seoPath,
  onClose,
}: SeoBlogWorkflowProps) {
  const [checklist] = useState<ChecklistItem[]>(BLOG_CHECKLIST);
  const score = computeScore(checklist);

  return (
    <SeoWorkflowPanel
      itemType="blog"
      itemName={itemName}
      websiteId={websiteId}
      seoPath={seoPath}
      onClose={onClose}
      checklist={checklist}
      headerExtra={<BlogStatusBadge score={score} />}
    />
  );
}
