'use client';

import { useRef } from 'react';
import type { ViewportSize } from './toolbar';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

interface CanvasFrameProps {
  websiteId: string;
  viewport: ViewportSize;
  widths?: Partial<Record<ViewportSize, string>>;
  fitToContainer?: boolean;
  children: React.ReactNode;
}

/**
 * Canvas frame with responsive preview.
 * Wraps editor content in a viewport-simulating container.
 * In embedded mode, this wraps the section list directly (no iframe-in-iframe).
 * In standalone mode, this could use an iframe for true isolation.
 */
export function CanvasFrame({
  websiteId,
  viewport,
  widths,
  fitToContainer = true,
  children,
}: CanvasFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameWidth = widths?.[viewport] ?? VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex-1 bg-muted/30 overflow-auto flex justify-center p-4">
      <div
        ref={containerRef}
        className={`bg-background shadow-lg transition-all duration-300 overflow-auto studio-preview--${viewport}`}
        style={{
          width: frameWidth,
          maxWidth: fitToContainer ? '100%' : 'none',
          flexShrink: fitToContainer ? 1 : 0,
          minHeight: '100%',
        }}
        data-viewport={viewport}
        data-website-id={websiteId}
      >
        {children}
      </div>
    </div>
  );
}
