'use client';

import { useRef, useState, useEffect, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { getSectionComponent } from '@/lib/sections/section-registry';
import { normalizeContent } from '@/lib/sections/normalize-content';
import { SiteThemeScope } from './site-theme-scope';
import { SectionWrapper } from './section-wrapper';
import type { EditorSection } from '@/lib/studio/section-actions';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { ViewportSize } from '@/components/editor/toolbar';

// ============================================================================
// Constants
// ============================================================================

const VIEWPORT_PX: Record<ViewportSize, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

// ============================================================================
// Drop zone between sections (visible during drag)
// ============================================================================

function CanvasDropZone({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex items-center justify-center py-2 transition-all duration-150',
        isOver ? 'py-4' : ''
      )}
    >
      <div
        className={cn(
          'w-full h-0.5 rounded-full transition-all duration-150',
          isOver
            ? 'h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
            : 'bg-blue-400/30'
        )}
      />
      {isOver && (
        <span className="absolute px-2 py-0.5 text-[9px] font-semibold bg-blue-500 text-white rounded-full shadow-md whitespace-nowrap z-10">
          Drop here
        </span>
      )}
    </div>
  );
}

// ============================================================================
// EditorSection → WebsiteSection converter
// ============================================================================

function toWebsiteSection(s: EditorSection): WebsiteSection {
  return {
    id: s.id,
    section_type: s.sectionType,
    variant: s.variant ?? '',
    display_order: s.displayOrder,
    is_enabled: s.isEnabled,
    config: s.config,
    content: s.content,
  };
}

// ============================================================================
// SectionCanvas
// ============================================================================

interface SectionCanvasProps {
  sections: EditorSection[];
  website: WebsiteData | null;
  viewport: ViewportSize;
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  isDraggingNewSection?: boolean;
  className?: string;
}

export function SectionCanvas({
  sections,
  website,
  viewport,
  selectedSectionId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  isDraggingNewSection = false,
  className,
}: SectionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale based on container width vs viewport target
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.clientWidth - 32; // account for padding
      const targetWidth = VIEWPORT_PX[viewport];
      setScale(Math.min(1, containerWidth / targetWidth));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewport]);

  const targetWidth = VIEWPORT_PX[viewport];
  const sectionIds = sections.map((s) => s.id);

  // Build WebsiteData with safe defaults for section components
  const websiteData = website ? {
    ...website,
    content: {
      siteName: '',
      siteDescription: '',
      social: {},
      account: {},
      analytics: {},
      featured_products: { destinations: [], hotels: [], activities: [] },
      ...((website.content ?? {}) as unknown as Record<string, unknown>),
    },
    sections: sections.map(toWebsiteSection),
  } as unknown as WebsiteData : {
    id: '',
    subdomain: '',
    status: 'draft',
    theme: null,
    content: {
      siteName: '',
      siteDescription: '',
      social: {},
      account: {},
      analytics: {},
      featured_products: { destinations: [], hotels: [], activities: [] },
    },
    sections: [],
  } as unknown as WebsiteData;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 bg-muted/30 overflow-y-auto overflow-x-hidden flex justify-center p-4',
        className
      )}
    >
      {/* Scaler: renders at target width, scales down to fit container */}
      <div
        className="bg-background shadow-lg will-change-transform"
        style={{
          width: `${targetWidth}px`,
          transformOrigin: 'top center',
          transform: scale < 1 ? `scale(${scale})` : undefined,
          // Compensate container height for the scaled content
          marginBottom: scale < 1 ? `calc((${scale} - 1) * 100%)` : undefined,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <SiteThemeScope theme={website?.theme as Record<string, unknown> | undefined}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {sections.map((section, index) => {
              // Render section component directly — skip Zod validation
              // so new/empty sections render with component fallbacks
              const Component = getSectionComponent(section.sectionType);
              const wsSection = toWebsiteSection(section);
              const normalizedSection = {
                ...wsSection,
                content: normalizeContent(wsSection.content),
                config: normalizeContent(wsSection.config),
              };

              return (
                <Fragment key={section.id}>
                  {isDraggingNewSection && (
                    <CanvasDropZone id={`drop-at-${index}`} />
                  )}

                  <SectionWrapper
                    section={section}
                    isSelected={selectedSectionId === section.id}
                    isFirst={index === 0}
                    isLast={index === sections.length - 1}
                    onSelect={onSelect}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onDuplicate={onDuplicate}
                    onToggleVisibility={onToggleVisibility}
                    onDelete={onDelete}
                  >
                    {Component ? (
                      <section
                        id={section.sectionType}
                        data-section-id={section.id}
                        data-section-type={section.sectionType}
                      >
                        <Component
                          section={normalizedSection as unknown as WebsiteSection}
                          website={websiteData}
                        />
                      </section>
                    ) : (
                      <div className="p-8 bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                        Unknown section type: <code>{section.sectionType}</code>
                      </div>
                    )}
                  </SectionWrapper>
                </Fragment>
              );
            })}

            {/* Drop zone at the end */}
            {isDraggingNewSection && (
              <CanvasDropZone id={`drop-at-${sections.length}`} />
            )}
          </SortableContext>

          {/* Empty state */}
          {sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
              <p className="text-lg font-medium">No sections yet</p>
              <p className="text-sm mt-1">Drag an element from the left panel to get started</p>
            </div>
          )}
        </SiteThemeScope>
      </div>
    </div>
  );
}
