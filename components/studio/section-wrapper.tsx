'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import type { EditorSection } from '@/lib/studio/section-actions';

interface SectionWrapperProps {
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

function getSectionLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function OverlayButton({
  onClick,
  disabled,
  title,
  destructive,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        destructive
          ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      )}
    >
      {children}
    </button>
  );
}

export function SectionWrapper({
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
}: SectionWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showToolbar = isSelected || isHovered;
  const isDisabled = !section.isEnabled;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group cursor-pointer',
        isDragging && 'opacity-50 ring-2 ring-inset ring-blue-500/60',
        isDisabled && 'opacity-50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(section.id);
      }}
    >
      {/* Selection/hover outline */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-150 pointer-events-none z-10',
          isSelected
            ? 'ring-2 ring-inset ring-blue-500/60 bg-blue-500/[0.03]'
            : isHovered
              ? 'ring-2 ring-inset ring-blue-400/40 bg-blue-400/[0.02]'
              : ''
        )}
      />

      {/* Drag handle — top-left, appears on hover */}
      {showToolbar && (
        <div
          className="absolute top-2 left-2 z-50 flex items-center gap-1 pointer-events-auto"
        >
          <button
            className="flex items-center justify-center w-6 h-6 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-md cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded shadow-md whitespace-nowrap">
            {getSectionLabel(section.sectionType)}
          </span>
        </div>
      )}

      {/* Floating toolbar — top-right corner */}
      {showToolbar && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-1 py-0.5 pointer-events-auto">
          <OverlayButton
            onClick={(e) => { e.stopPropagation(); onMoveUp(section.id); }}
            disabled={isFirst}
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </OverlayButton>
          <OverlayButton
            onClick={(e) => { e.stopPropagation(); onMoveDown(section.id); }}
            disabled={isLast}
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </OverlayButton>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <OverlayButton
            onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </OverlayButton>
          <OverlayButton
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
            title={section.isEnabled ? 'Hide' : 'Show'}
          >
            {section.isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </OverlayButton>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <OverlayButton
            onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
            title="Delete"
            destructive
          >
            <Trash2 className="w-3 h-3" />
          </OverlayButton>
        </div>
      )}

      {/* Section content */}
      {children}
    </div>
  );
}
