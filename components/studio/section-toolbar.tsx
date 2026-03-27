'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

interface SectionToolbarProps {
  sectionId: string;
  isEnabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  destructive,
  children,
}: {
  onClick?: (e: React.MouseEvent) => void;
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
      aria-label={title}
      className={cn(
        'p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1',
        destructive
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

export function SectionToolbar({
  sectionId,
  isEnabled,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  dragListeners,
  dragAttributes,
}: SectionToolbarProps) {
  const stop = (fn: (id: string) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn(sectionId);
  };

  return (
    <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full shadow-lg px-1 py-0.5" role="toolbar" aria-label="Section actions">
      {/* Drag handle */}
      <button
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 rounded-md"
        title="Drag to reorder"
        aria-label="Drag to reorder section"
        aria-roledescription="draggable"
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-border/50" />

      <ToolbarButton onClick={stop(onMoveUp)} disabled={isFirst} title="Move up">
        <ChevronUp className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton onClick={stop(onMoveDown)} disabled={isLast} title="Move down">
        <ChevronDown className="w-3.5 h-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50" />

      <ToolbarButton onClick={stop(onDuplicate)} title="Duplicate">
        <Copy className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarButton onClick={stop(onToggleVisibility)} title={isEnabled ? 'Hide section' : 'Show section'}>
        {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50" />

      <ToolbarButton onClick={stop(onDelete)} title="Delete section" destructive>
        <Trash2 className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}
