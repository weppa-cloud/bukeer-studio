/**
 * Eyebrow — uppercase kicker label (e.g. "DESCUBRE · VIVE · CONECTA",
 * "OPERADOR LOCAL · 14 AÑOS", "DESTINOS").
 *
 * Matches the `.eyebrow` designer class. Renders the leading 1px underline
 * accent via CSS `::before`. Server component.
 *
 * Accepts optional `tone='dark' | 'light'` — dark is default ink color;
 * light is for hero overlays (`.hero-eyebrow` in the scoped CSS).
 */

import type { ElementType, ReactNode } from 'react';

export interface EyebrowProps {
  children: ReactNode;
  tone?: 'dark' | 'light';
  className?: string;
  as?: ElementType;
}

export function Eyebrow({
  children,
  tone = 'dark',
  className,
  as = 'span',
}: EyebrowProps) {
  const Tag = as as ElementType;
  const classes = ['eyebrow'];
  if (tone === 'light') classes.push('hero-eyebrow');
  if (className) classes.push(className);
  return <Tag className={classes.join(' ')}>{children}</Tag>;
}
