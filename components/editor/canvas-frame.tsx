'use client';

import { useRef, useState, useEffect } from 'react';
import type { ViewportSize } from './toolbar';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '1280px',
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
 *
 * When fitToContainer is true and the target width exceeds the available space,
 * the frame scales down via CSS transform so the full-width layout remains
 * visible without horizontal scrolling.
 */
export function CanvasFrame({
  websiteId,
  viewport,
  widths,
  fitToContainer = true,
  children,
}: CanvasFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(0);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frameWidth = widths?.[viewport] ?? VIEWPORT_WIDTHS[viewport];
  const numericWidth = parseInt(frameWidth, 10);
  // Scale down when the target width is larger than the available container space.
  // Subtract 32px to account for outer padding (p-4 = 16px each side).
  const usableWidth = availableWidth - 32;
  const needsScale =
    fitToContainer && !isNaN(numericWidth) && usableWidth > 0 && usableWidth < numericWidth;
  const scale = needsScale ? usableWidth / numericWidth : 1;

  return (
    <div ref={outerRef} className="flex-1 bg-muted/30 overflow-x-hidden overflow-y-auto flex justify-center p-4">
      <div
        ref={containerRef}
        className={`bg-background shadow-lg transition-all duration-300 overflow-auto studio-preview--${viewport}`}
        style={{
          width: frameWidth,
          maxWidth: needsScale ? 'none' : fitToContainer ? '100%' : 'none',
          flexShrink: fitToContainer && !needsScale ? 1 : 0,
          minHeight: '100%',
          ...(needsScale
            ? {
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
              }
            : {}),
        }}
        data-viewport={viewport}
        data-website-id={websiteId}
      >
        {children}
      </div>
    </div>
  );
}
