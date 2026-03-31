'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from 'lucide-react';
import type { EditorSection } from '@/lib/studio/section-actions';

interface SectionRect {
  id: string;
  type: string;
  top: number;
  height: number;
  enabled: boolean;
  isFirst: boolean;
  isLast: boolean;
}

interface SectionOverlayProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  sections: EditorSection[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSection: () => void;
  /** Increment this when iframe content changes (e.g. after load/save) */
  iframeLoadKey?: number;
}

function getSectionLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SectionOverlay({
  iframeRef,
  sections,
  selectedSectionId,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  onAddSection,
  iframeLoadKey = 0,
}: SectionOverlayProps) {
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const recalcRects = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;

    const sectionEls = doc.querySelectorAll('section[data-section-id]');
    if (sectionEls.length === 0) return;

    const newRects: SectionRect[] = [];

    sectionEls.forEach((el) => {
      const id = el.getAttribute('data-section-id')!;
      const type = el.getAttribute('data-section-type') || el.getAttribute('id') || 'unknown';
      // offsetTop gives position relative to the document, not viewport
      const htmlEl = el as HTMLElement;
      const editorSection = sections.find((s) => s.id === id || s.sectionType === type);

      newRects.push({
        id,
        type,
        top: htmlEl.offsetTop,
        height: htmlEl.offsetHeight,
        enabled: editorSection?.isEnabled ?? true,
        isFirst: false,
        isLast: false,
      });
    });

    // Mark first/last
    if (newRects.length > 0) {
      newRects[0].isFirst = true;
      newRects[newRects.length - 1].isLast = true;
    }

    setRects(newRects);
  }, [iframeRef, sections]);

  // Recalculate on iframe load and scroll
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: MutationObserver | null = null;

    const setupListeners = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc?.body) return;

        doc.addEventListener('scroll', recalcRects, { passive: true });

        observer = new MutationObserver(() => {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(recalcRects);
        });
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
      } catch {
        // Cross-origin — ignore
      }
    };

    const handleLoad = () => {
      // Wait for images/layout to settle
      setTimeout(() => {
        recalcRects();
        setupListeners();
      }, 500);
    };

    iframe.addEventListener('load', handleLoad);

    // Poll until iframe content is available (handles race condition with ref)
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      pollCount++;
      if (pollCount > 30) { clearInterval(pollInterval); return; } // 15s max
      try {
        const doc = iframe.contentDocument;
        if (doc?.readyState === 'complete' && doc.querySelectorAll('section[data-section-id]').length > 0) {
          clearInterval(pollInterval);
          recalcRects();
          setupListeners();
        }
      } catch { /* cross-origin */ }
    }, 500);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      clearInterval(pollInterval);
      cancelAnimationFrame(rafRef.current);
      observer?.disconnect();
      try {
        iframe.contentDocument?.removeEventListener('scroll', recalcRects);
      } catch { /* ignore */ }
    };
  }, [iframeRef, recalcRects]);

  // Recalculate when sections change or iframe reloads
  useEffect(() => {
    // Delay to let iframe content settle
    const timer = setTimeout(recalcRects, 600);
    return () => clearTimeout(timer);
  }, [sections, iframeLoadKey, recalcRects]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => recalcRects();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recalcRects]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ overflow: 'hidden' }}
    >
      {rects.map((rect) => {
        const isSelected = selectedSectionId === rect.id ||
          (selectedSectionId && sections.find(s => s.id === selectedSectionId)?.sectionType === rect.type);
        const isHovered = hoveredId === rect.id;
        const showToolbar = isSelected || isHovered;

        return (
          <div
            key={rect.id}
            className="absolute left-0 right-0 pointer-events-auto cursor-pointer"
            style={{
              top: `${rect.top}px`,
              height: `${rect.height}px`,
            }}
            onMouseEnter={() => setHoveredId(rect.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={(e) => { e.stopPropagation(); onSelect(rect.id); }}
          >
            {/* Selection/hover outline */}
            <div
              className={cn(
                'absolute inset-0 transition-all duration-150 pointer-events-none',
                isSelected
                  ? 'ring-2 ring-inset ring-blue-500/60 bg-blue-500/[0.03]'
                  : isHovered
                    ? 'ring-2 ring-inset ring-blue-400/40 bg-blue-400/[0.02]'
                    : ''
              )}
            />

            {/* Section label — always visible on left edge for selected/hovered */}
            {showToolbar && (
              <div className="absolute top-2 left-2 z-50 flex items-center gap-1 pointer-events-auto">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded shadow-md whitespace-nowrap">
                  {getSectionLabel(rect.type)}
                </span>
              </div>
            )}

            {/* Floating toolbar — top-right corner */}
            {showToolbar && (
              <div className="absolute top-2 right-2 z-50 flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-1 py-0.5 pointer-events-auto">
                <OverlayButton
                  onClick={(e) => { e.stopPropagation(); onMoveUp(rect.id); }}
                  disabled={rect.isFirst}
                  title="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </OverlayButton>
                <OverlayButton
                  onClick={(e) => { e.stopPropagation(); onMoveDown(rect.id); }}
                  disabled={rect.isLast}
                  title="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </OverlayButton>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                <OverlayButton
                  onClick={(e) => { e.stopPropagation(); onDuplicate(rect.id); }}
                  title="Duplicate"
                >
                  <Copy className="w-3 h-3" />
                </OverlayButton>
                <OverlayButton
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(rect.id); }}
                  title={rect.enabled ? 'Hide' : 'Show'}
                >
                  {rect.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </OverlayButton>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                <OverlayButton
                  onClick={(e) => { e.stopPropagation(); onDelete(rect.id); }}
                  title="Delete"
                  destructive
                >
                  <Trash2 className="w-3 h-3" />
                </OverlayButton>
              </div>
            )}
          </div>
        );
      })}

      {/* Add section button at bottom */}
      <div
        className="absolute left-0 right-0 pointer-events-auto flex items-center justify-center py-6 px-8"
        style={{ top: `${rects.length > 0 ? rects[rects.length - 1].top + rects[rects.length - 1].height + 16 : 0}px` }}
      >
        <div className="flex-1 border-t border-dashed border-blue-300/50" />
        <button
          onClick={onAddSection}
          className="mx-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-white/90 dark:bg-slate-900/90 border border-dashed border-blue-300 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Section
        </button>
        <div className="flex-1 border-t border-dashed border-blue-300/50" />
      </div>
    </div>
  );
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
