'use client';

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
 *
 * NO scaling — the iframe renders at 100% zoom.
 * - Desktop (1440px): may overflow horizontally → parent scrolls
 * - Tablet (768px): fits most screens without scroll
 * - Mobile (375px): centered with space around
 *
 * The parent div scrolls both horizontally and vertically.
 */
export function CanvasFrame({
  websiteId,
  viewport,
  widths,
  children,
}: CanvasFrameProps) {
  const frameWidth = widths?.[viewport] ?? VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex-1 bg-muted/30 overflow-hidden flex justify-center p-4">
      <div
        className={`bg-background shadow-lg transition-[width] duration-300 h-full studio-preview--${viewport}`}
        style={{
          width: frameWidth,
          minWidth: frameWidth,
          flexShrink: 0,
        }}
        data-viewport={viewport}
        data-website-id={websiteId}
      >
        {children}
      </div>
    </div>
  );
}
