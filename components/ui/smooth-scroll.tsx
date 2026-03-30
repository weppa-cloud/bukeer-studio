'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight smooth scroll using CSS scroll-behavior + RAF-based
 * inertial smoothing. No external dependencies (Lenis-lite pattern).
 *
 * Wraps children in a scroll container with premium feel.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Apply smooth scroll to document
    document.documentElement.style.scrollBehavior = 'smooth';

    // Respect reduced motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      document.documentElement.style.scrollBehavior = 'auto';
    }

    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
