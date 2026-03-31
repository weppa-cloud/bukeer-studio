'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SECTION_TYPES } from '@bukeer/website-contract';
import type { SectionTypeValue } from '@bukeer/website-contract';

const SECTION_CATEGORIES: Record<string, { label: string; types: SectionTypeValue[] }> = {
  hero: {
    label: 'Hero',
    types: ['hero', 'hero_image', 'hero_video', 'hero_minimal'],
  },
  content: {
    label: 'Contenido',
    types: ['text', 'rich_text', 'text_image', 'about'],
  },
  features: {
    label: 'Características',
    types: ['features', 'features_grid'],
  },
  travel: {
    label: 'Viajes',
    types: ['destinations', 'hotels', 'activities'],
  },
  social: {
    label: 'Social Proof',
    types: ['testimonials', 'testimonials_carousel', 'logo_cloud', 'partners'],
  },
  data: {
    label: 'Datos',
    types: ['stats', 'gallery', 'gallery_grid', 'pricing'],
  },
  conversion: {
    label: 'Conversión',
    types: ['cta', 'cta_banner', 'newsletter', 'contact_form'],
  },
  interactive: {
    label: 'Interactivo',
    types: ['faq', 'faq_accordion'],
  },
  blog: {
    label: 'Blog',
    types: ['blog_grid'],
  },
};

const SECTION_LABELS: Partial<Record<SectionTypeValue, string>> = {
  hero: 'Hero',
  hero_image: 'Hero con imagen',
  hero_video: 'Hero con video',
  hero_minimal: 'Hero minimal',
  text: 'Texto',
  rich_text: 'Texto enriquecido',
  text_image: 'Texto + imagen',
  about: 'Acerca de',
  features: 'Características',
  features_grid: 'Grid de features',
  destinations: 'Destinos',
  hotels: 'Hoteles',
  activities: 'Actividades',
  testimonials: 'Testimonios',
  testimonials_carousel: 'Carrusel testimonios',
  logo_cloud: 'Logos partners',
  partners: 'Partners',
  stats: 'Estadísticas',
  gallery: 'Galería',
  gallery_grid: 'Galería grid',
  pricing: 'Precios',
  cta: 'Call to Action',
  cta_banner: 'Banner CTA',
  newsletter: 'Newsletter',
  contact_form: 'Formulario contacto',
  faq: 'FAQ',
  faq_accordion: 'FAQ acordeón',
  blog_grid: 'Grid de blog',
};

interface DraggableSectionItemProps {
  sectionType: SectionTypeValue;
}

function DraggableSectionItem({ sectionType }: DraggableSectionItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${sectionType}`,
    data: { sectionType, source: 'palette' },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        px-3 py-2 text-sm rounded-md border cursor-grab
        hover:bg-muted/50 hover:border-primary/30 transition-colors
        ${isDragging ? 'opacity-50 border-primary' : 'border-border'}
      `}
    >
      {SECTION_LABELS[sectionType] ?? sectionType}
    </div>
  );
}

interface SectionPaletteProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Sidebar palette with draggable section types.
 * Sections are organized by category.
 */
export function SectionPalette({ isOpen, onToggle }: SectionPaletteProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('hero');

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-10 h-10 flex items-center justify-center border-r bg-background hover:bg-muted"
        title="Abrir catálogo de secciones"
      >
        +
      </button>
    );
  }

  return (
    <div className="w-64 border-r bg-background overflow-y-auto shrink-0">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Secciones</span>
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          &times;
        </button>
      </div>

      <div className="p-2 space-y-1">
        {Object.entries(SECTION_CATEGORIES).map(([key, category]) => (
          <div key={key}>
            <button
              onClick={() =>
                setExpandedCategory(expandedCategory === key ? null : key)
              }
              className="w-full px-2 py-1.5 text-sm font-medium text-left hover:bg-muted rounded-md flex items-center justify-between"
            >
              <span>{category.label}</span>
              <span className="text-xs text-muted-foreground">
                {expandedCategory === key ? '−' : '+'}
              </span>
            </button>

            {expandedCategory === key && (
              <div className="pl-2 space-y-1 mt-1">
                {category.types.map((type) => (
                  <DraggableSectionItem key={type} sectionType={type} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
