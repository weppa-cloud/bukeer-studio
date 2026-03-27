'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { SectionToolbar } from './section-toolbar';
import { getSectionLabel } from '@/lib/studio/section-fields';
import type { EditorSection } from '@/lib/studio/section-actions';

interface SectionPreviewProps {
  section: EditorSection;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

export function SectionPreview({
  section,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  children,
}: SectionPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(section.id);
    },
    [section.id, onSelect]
  );

  const showToolbar = isSelected || isHovered;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-section-id={section.id}
      data-section-type={section.sectionType}
      className={cn(
        'relative group transition-all duration-200',
        isDragging && 'opacity-60 z-50 scale-[1.02] shadow-2xl ring-2 ring-primary/40 rounded-lg',
        !section.isEnabled && 'opacity-40'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection / hover overlay — subtle highlight, no harsh borders */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none z-40 transition-all duration-150',
          isSelected
            ? 'ring-2 ring-primary/60 ring-inset bg-primary/[0.03]'
            : isHovered
              ? 'ring-1 ring-primary/20 ring-inset bg-primary/[0.02]'
              : ''
        )}
      />

      {/* Top bar: label + toolbar — centered, floating above section */}
      {showToolbar && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
          {/* Section type pill */}
          <div className={cn(
            'px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full shadow-lg backdrop-blur-sm',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/90 text-foreground border border-border/50'
          )}>
            {getSectionLabel(section.sectionType)}
            {!section.isEnabled && ' (hidden)'}
          </div>

          {/* Toolbar actions */}
          <SectionToolbar
            sectionId={section.id}
            isEnabled={section.isEnabled}
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onToggleVisibility={onToggleVisibility}
            onDelete={onDelete}
            dragListeners={listeners as Record<string, unknown>}
            dragAttributes={attributes as unknown as Record<string, unknown>}
          />
        </div>
      )}

      {/* Section content */}
      {children}
    </div>
  );
}
