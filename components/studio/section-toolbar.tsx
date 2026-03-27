'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveUp(sectionId);
  }, [sectionId, onMoveUp]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveDown(sectionId);
  }, [sectionId, onMoveDown]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(sectionId);
  }, [sectionId, onDuplicate]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility(sectionId);
  }, [sectionId, onToggleVisibility]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(sectionId);
  }, [sectionId, onDelete]);

  return (
    <div className="flex items-center gap-0.5 bg-background border rounded-lg shadow-md p-0.5">
      {/* Drag handle */}
      <button
        className="p-1.5 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground"
        title="Drag to reorder"
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Move up */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={isFirst}
        onClick={handleMoveUp}
        title="Move up"
      >
        <ChevronUp className="w-4 h-4" />
      </Button>

      {/* Move down */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={isLast}
        onClick={handleMoveDown}
        title="Move down"
      >
        <ChevronDown className="w-4 h-4" />
      </Button>

      {/* Duplicate */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleDuplicate}
        title="Duplicate"
      >
        <Copy className="w-4 h-4" />
      </Button>

      {/* Toggle visibility */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleToggle}
        title={isEnabled ? 'Hide section' : 'Show section'}
      >
        {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={handleDelete}
        title="Delete section"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
