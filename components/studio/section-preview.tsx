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
        'relative group transition-all',
        isDragging && 'opacity-50 z-50',
        !section.isEnabled && 'opacity-40'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection / hover border overlay */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none z-40 border-2 transition-colors',
          isSelected
            ? 'border-primary bg-primary/5'
            : isHovered
              ? 'border-primary/30'
              : 'border-transparent'
        )}
      />

      {/* Section type label */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-7 left-4 z-50 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-t">
          {getSectionLabel(section.sectionType)}
          {!section.isEnabled && ' (hidden)'}
        </div>
      )}

      {/* Floating toolbar */}
      {showToolbar && (
        <div className="absolute -top-7 right-4 z-50">
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
