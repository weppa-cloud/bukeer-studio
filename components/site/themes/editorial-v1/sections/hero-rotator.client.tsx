'use client';

/**
 * Hero slide rotator — client leaf for the editorial-v1 hero.
 *
 * Owns the active slide index (auto-advances every `intervalMs`, default
 * 6500ms to mirror the designer prototype), exposes `pause on hover` via the
 * wrapping element, and honours `prefers-reduced-motion` (when on, rotation
 * is disabled — the first slide stays visible).
 *
 * Because this leaf renders the actual slide stack, it has to mount
 * after first paint. Parent server component owns the first-frame SSR image
 * (`data-ssr-hero-frame`) so LCP stays crawlable and paintable without JS.
 * After hydration this leaf overlays the rotating layers and controls.
 *
 * It also renders the dot indicators + the `NN / NN` counter inside the
 * `.hero-meta` strip so the same state drives both the image layer and the
 * navigation. The counter and dots match the designer layout exactly.
 */

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { supabaseImageUrl } from '@/lib/images/supabase-transform';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface HeroRotatorSlide {
  imageUrl?: string | null;
  city?: string;
  alt?: string;
  /** Optional extra label shown in the meta strip (defaults to `city`). */
  region?: string;
}

export interface HeroRotatorProps {
  slides: HeroRotatorSlide[];
  intervalMs?: number;
  ariaLabel?: string;
  locale?: string | null;
}

const DEFAULT_INTERVAL_MS = 6500;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroRotator({
  slides,
  intervalMs = DEFAULT_INTERVAL_MS,
  ariaLabel,
  locale,
}: HeroRotatorProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const total = slides.length;
  const [hasHydratedAfterPaint, setHasHydratedAfterPaint] = useState(false);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHasHydratedAfterPaint(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  useEffect(() => {
    if (total <= 1) return;
    if (reducedRef.current) return;
    if (paused) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % total);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [total, paused, intervalMs]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return;
      setIdx(i);
    },
    [total],
  );

  const onEnter = useCallback(() => setPaused(true), []);
  const onLeave = useCallback(() => setPaused(false), []);

  if (!hasHydratedAfterPaint || total === 0) {
    return null;
  }

  const activeSlide = slides[idx];

  return (
    <>
      <div
        className="hero-media"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        aria-label={ariaLabel}
      >
        <div
          key={idx}
          style={heroLayerStyle}
          aria-hidden="false"
        >
          {activeSlide?.imageUrl ? (
            <Image
              src={supabaseImageUrl(activeSlide.imageUrl, { width: 1000, quality: 70 })}
              alt={activeSlide.alt || activeSlide.city || ''}
              fill
              loading="lazy"
              fetchPriority="low"
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="scenic" />
          )}
        </div>
      </div>
      <div className="hero-meta" aria-live="polite">
        <span className="hero-meta-label">
          {activeSlide?.region || activeSlide?.city
            ? `${editorialText('editorialHeroPresenting')} · ${activeSlide.region || activeSlide.city}`
            : ''}
        </span>
        <div className="dots" role="tablist" aria-label={editorialText('editorialHeroDotsAria')}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`dot${i === idx ? ' active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`${editorialText('editorialHeroSlidePrefix')} ${i + 1}`}
              aria-selected={i === idx}
              role="tab"
            />
          ))}
        </div>
        <span className="hero-meta-counter">
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </>
  );
}

const heroLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 1,
  transition: 'opacity 900ms ease',
  pointerEvents: 'none',
};
