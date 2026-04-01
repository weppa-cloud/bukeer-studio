'use client';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SECTION_ICONS, SECTION_LABELS } from './sections-grid';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  LayoutGrid,
} from 'lucide-react';
import type { EditorSection } from '@/lib/studio/section-actions';
import type { SectionTypeValue } from '@bukeer/website-contract';

// ============================================================================
// Navigator item
// ============================================================================

interface NavigatorItemProps {
  section: EditorSection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function NavigatorItem({
  section,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: NavigatorItemProps) {
  const Icon = SECTION_ICONS[section.sectionType as SectionTypeValue] ?? LayoutGrid;
  const label = SECTION_LABELS[section.sectionType as SectionTypeValue]
    ?? section.sectionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors',
        'hover:bg-[color-mix(in_srgb,var(--studio-primary)_8%,transparent)]',
        isSelected && 'bg-[color-mix(in_srgb,var(--studio-primary)_14%,transparent)] border-l-2 border-l-[var(--studio-primary)]',
        !section.isEnabled && 'opacity-50',
        isDragging && 'opacity-50 ring-2 ring-blue-500 z-50'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Icon + label (clickable) */}
      <button
        type="button"
        className="flex items-center gap-2 flex-1 min-w-0 text-left py-0.5"
        onClick={() => onSelect(section.id)}
      >
        <Icon className="w-3.5 h-3.5 text-[var(--studio-text-muted)] shrink-0" />
        <span className="text-xs text-[var(--studio-text)] truncate">{label}</span>
      </button>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => onToggleVisibility(section.id)}
          className="p-0.5 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          title={section.isEnabled ? 'Hide' : 'Show'}
        >
          {section.isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(section.id)}
          className="p-0.5 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(section.id)}
          className="p-0.5 rounded text-[var(--studio-text-muted)] hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Navigator panel
// ============================================================================

interface NavigatorProps {
  sections: EditorSection[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function Navigator({
  sections,
  selectedSectionId,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  className,
}: NavigatorProps) {
  const sectionIds = sections.map((s) => s.id);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider">
          Layers ({sections.length})
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-3 space-y-0.5">
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {sections.map((section) => (
              <NavigatorItem
                key={section.id}
                section={section}
                isSelected={selectedSectionId === section.id}
                onSelect={onSelect}
                onToggleVisibility={onToggleVisibility}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>

          {sections.length === 0 && (
            <p className="text-xs text-[var(--studio-text-muted)] text-center py-8">
              No sections yet. Drag an element from the panel.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
