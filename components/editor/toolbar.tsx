'use client';

import { useCallback } from 'react';

export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface ToolbarProps {
  websiteSubdomain?: string;
  websiteStatus?: string;
  currentViewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onSaveAsTemplate?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

const VIEWPORT_ICONS: Record<ViewportSize, string> = {
  desktop: '🖥️',
  tablet: '📱',
  mobile: '📲',
};

const VIEWPORT_LABELS: Record<ViewportSize, string> = {
  desktop: 'Escritorio',
  tablet: 'Tablet',
  mobile: 'Móvil',
};

export function Toolbar({
  websiteSubdomain,
  websiteStatus,
  currentViewport,
  onViewportChange,
  onSaveDraft,
  onPublish,
  onPreview,
  onSaveAsTemplate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSaving,
  isPublishing,
  saveStatus = 'idle',
}: ToolbarProps) {
  const viewports: ViewportSize[] = ['desktop', 'tablet', 'mobile'];

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      {/* Left: Site info */}
      <div className="flex items-center gap-3">
        <span className="font-medium text-sm">
          {websiteSubdomain ?? 'Editor'}
        </span>
        {websiteStatus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              websiteStatus === 'published'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {websiteStatus === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        )}
      </div>

      {/* Center: Viewport switcher */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {viewports.map((vp) => (
          <button
            key={vp}
            onClick={() => onViewportChange(vp)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currentViewport === vp
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
            title={VIEWPORT_LABELS[vp]}
          >
            {VIEWPORT_ICONS[vp]}
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo / Redo */}
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-30"
              title="Undo (⌘Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
              </svg>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-30"
              title="Redo (⌘⇧Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
              </svg>
            </button>
          </div>
        )}

        {/* Save status indicator */}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-600 mr-2">&#10003; Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs text-red-500 mr-2">Save failed</span>
        )}

        {onSaveAsTemplate && (
          <button
            onClick={onSaveAsTemplate}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Guardar como plantilla
          </button>
        )}
        <button
          onClick={onPreview}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
        >
          Vista previa
        </button>
        <button
          onClick={onSaveDraft}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar borrador'}
        </button>
        <button
          onClick={onPublish}
          disabled={isPublishing}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPublishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}
