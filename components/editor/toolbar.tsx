'use client';

import { StudioBadgeStatus, StudioButton, StudioTopbar } from '@/components/studio/ui/primitives';

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
    <StudioTopbar
      left={(
        <>
          <span className="font-semibold text-sm text-[var(--studio-text)]">{websiteSubdomain ?? 'Editor'}</span>
          {websiteStatus ? <StudioBadgeStatus status={websiteStatus === 'published' ? 'published' : 'draft'} /> : null}
          {saveStatus === 'saved' ? <StudioBadgeStatus status="saved" /> : null}
          {saveStatus === 'error' ? <StudioBadgeStatus status="error" /> : null}
        </>
      )}
      center={(
        <div className="flex items-center gap-1 bg-[var(--studio-panel)] rounded-lg p-1 border border-[var(--studio-border)]">
          {viewports.map((vp) => (
            <button
              key={vp}
              onClick={() => onViewportChange(vp)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentViewport === vp
                  ? 'bg-[var(--studio-bg-elevated)] border border-[var(--studio-border)] text-[var(--studio-text)]'
                  : 'text-[var(--studio-text-muted)]'
              }`}
              title={VIEWPORT_LABELS[vp]}
              type="button"
            >
              {VIEWPORT_ICONS[vp]}
            </button>
          ))}
        </div>
      )}
      right={(
        <>
          {(onUndo || onRedo) && (
            <>
              <StudioButton onClick={onUndo} disabled={!canUndo} size="sm" variant="ghost">
                Undo
              </StudioButton>
              <StudioButton onClick={onRedo} disabled={!canRedo} size="sm" variant="ghost">
                Redo
              </StudioButton>
            </>
          )}
          {onSaveAsTemplate ? (
            <StudioButton onClick={onSaveAsTemplate} variant="outline" size="sm">
              Guardar plantilla
            </StudioButton>
          ) : null}
          <StudioButton onClick={onPreview} variant="outline" size="sm">
            Vista previa
          </StudioButton>
          <StudioButton onClick={onSaveDraft} disabled={isSaving} variant="outline" size="sm">
            {isSaving ? 'Guardando...' : 'Guardar borrador'}
          </StudioButton>
          <StudioButton onClick={onPublish} disabled={isPublishing} size="sm">
            {isPublishing ? 'Publicando...' : 'Publicar'}
          </StudioButton>
        </>
      )}
    />
  );
}
