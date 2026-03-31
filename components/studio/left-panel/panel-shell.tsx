'use client';

import { cn } from '@/lib/utils';
import { SectionsGrid } from './sections-grid';
import { Navigator } from './navigator';
import { ThemeQuickEditor } from './theme-quick-editor';
import {
  LayoutGrid,
  Layers,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { EditorSection } from '@/lib/studio/section-actions';
import type { SectionTypeValue } from '@bukeer/website-contract';
import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type LeftPanelMode = 'sections' | 'layers' | 'theme' | 'ai';

interface LeftPanelShellProps {
  mode: LeftPanelMode;
  onModeChange: (mode: LeftPanelMode) => void;
  collapsed: boolean;
  // Section actions
  onAddSection: (type: SectionTypeValue) => void;
  // Navigator props
  sections: EditorSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  // Theme
  currentSeedColor?: string;
  onPresetSelect?: (presetId: string, seedColor: string) => void;
  // AI slot
  aiContent?: ReactNode;
  className?: string;
}

// ============================================================================
// Tab config
// ============================================================================

const TABS: { id: LeftPanelMode; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'sections', icon: LayoutGrid, label: 'Elements' },
  { id: 'layers', icon: Layers, label: 'Layers' },
  { id: 'theme', icon: Palette, label: 'Theme' },
  { id: 'ai', icon: Sparkles, label: 'AI' },
];

// ============================================================================
// Component
// ============================================================================

export function LeftPanelShell({
  mode,
  onModeChange,
  collapsed,
  onAddSection,
  sections,
  selectedSectionId,
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  currentSeedColor,
  onPresetSelect,
  aiContent,
  className,
}: LeftPanelShellProps) {
  return (
    <div
      className={cn(
        'flex border-r border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] transition-all duration-300',
        collapsed
          ? 'w-0 min-w-0 max-w-0 overflow-hidden opacity-0 border-r-0'
          : 'w-[280px] min-w-[280px] max-w-[280px]',
        className
      )}
    >
      {/* Vertical icon tabs */}
      <div className="w-11 shrink-0 flex flex-col items-center gap-1 pt-2 border-r border-[var(--studio-border)] bg-[color-mix(in_srgb,var(--studio-panel)_60%,transparent)]">
        {TABS.map((tab) => {
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              title={tab.label}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-md transition-all',
                isActive
                  ? 'bg-[color-mix(in_srgb,var(--studio-primary)_18%,transparent)] text-[var(--studio-primary)]'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[color-mix(in_srgb,var(--studio-text)_8%,transparent)]'
              )}
            >
              <tab.icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {mode === 'sections' && <SectionsGrid onAddSection={onAddSection} />}

        {mode === 'layers' && (
          <Navigator
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelect={onSelectSection}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onToggleVisibility={onToggleVisibility}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        )}

        {mode === 'theme' && (
          <ThemeQuickEditor
            currentSeedColor={currentSeedColor}
            onPresetSelect={onPresetSelect}
          />
        )}

        {mode === 'ai' && (
          aiContent ?? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <Sparkles className="w-8 h-8 text-[var(--studio-text-muted)] mb-3" />
              <p className="text-xs text-[var(--studio-text-muted)]">AI assistant available in the right panel</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
