/**
 * Logo — ColombiaTours.travel wordmark (port of designer `Logo` from
 * primitives.jsx). Supports light variant for header overlays and dark
 * variant for scrolled/solid backgrounds.
 *
 * When a tenant-supplied `imageUrl` is passed, renders an `<img>` (not
 * next/image so the src can be arbitrary remote without `images.domains`
 * configuration). Otherwise falls back to a font-display text wordmark
 * derived from `name`.
 */

import type { CSSProperties } from 'react';

export interface LogoProps {
  variant?: 'light' | 'dark';
  imageUrl?: string | null;
  name?: string;
  tagline?: string | null;
  showTagline?: boolean;
  className?: string;
}

export function Logo({
  variant = 'dark',
  imageUrl = null,
  name = 'ColombiaTours.travel',
  tagline = 'Operador local · desde 2011',
  showTagline = true,
  className,
}: LogoProps) {
  const tagStyle: CSSProperties = {};
  if (variant === 'light') {
    tagStyle.color = 'rgba(255,255,255,0.75)';
  }
  const wordmarkColor = variant === 'light' ? '#fff' : 'var(--c-ink)';

  return (
    <span
      className={`nav-logo${className ? ` ${className}` : ''}`}
      aria-label={name}
    >
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={imageUrl} alt={name} fetchPriority="low" decoding="async" />
      ) : (
        <span className="logo-wordmark" style={{ color: wordmarkColor }}>
          {name}
        </span>
      )}
      {showTagline && tagline ? (
        <span className="logo-tag" style={tagStyle}>
          {tagline}
        </span>
      ) : null}
    </span>
  );
}
