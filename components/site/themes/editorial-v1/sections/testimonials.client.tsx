/**
 * editorial-v1 — Testimonials client leaf.
 *
 * Owns the selected-mini-item state for the designer's split layout
 * (featured quote on the left + selectable minis on the right). When
 * fewer than 2 reviews are present, the section server component
 * falls back to a single-column render and this client leaf is not
 * mounted.
 *
 * Accessibility:
 *  - Minis are rendered as `<button type="button">` so keyboard +
 *    screen readers advertise the toggling affordance.
 *  - Selected mini gets `aria-pressed="true"`.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface TestimonialItem {
  id?: string;
  name: string;
  avatar?: string | null;
  text?: string;
  rating?: number;
  location?: string;
  short?: string;
  pkg?: string;
  source?: string;
}

interface TestimonialsClientProps {
  testimonials: TestimonialItem[];
  locale?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');
}

function renderStars(rating: number, starsAriaSuffix: string) {
  const count = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return (
    <div className="stars" aria-label={`${count} ${starsAriaSuffix}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>{Icons.star({ size: 18 })}</span>
      ))}
    </div>
  );
}

function renderAvatar(t: TestimonialItem, size: number) {
  if (t.avatar) {
    return (
      <span className="av" style={{ width: size, height: size }}>
        <Image
          src={t.avatar}
          alt=""
          width={size}
          height={size}
          unoptimized
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      </span>
    );
  }
  return (
    <span className="av" style={{ width: size, height: size }}>
      {initials(t.name)}
    </span>
  );
}

export function TestimonialsClient({ testimonials, locale = 'es-CO' }: TestimonialsClientProps) {
  const editorialText = getPublicUiExtraTextGetter(locale);
  const [idx, setIdx] = useState(0);
  const featured = testimonials[idx] ?? testimonials[0];
  if (!featured) return null;

  return (
    <div className="testi">
      <article className="testi-big">
        <span className="quote-mark" aria-hidden="true">
          &ldquo;
        </span>
        {renderStars(featured.rating ?? 5, editorialText('editorialTestimonialsStarsAriaSuffix'))}
        <blockquote>
          {featured.text ? <span dangerouslySetInnerHTML={{ __html: sanitizeQuote(featured.text) }} /> : null}
        </blockquote>
        <div className="testi-author">
          {renderAvatar(featured, 48)}
          <div>
            <b>{featured.name}</b>
            <small>
              {[featured.location, featured.pkg].filter(Boolean).join(' · ')}
            </small>
          </div>
        </div>
      </article>

      <div className="testi-list" role="tablist" aria-label={editorialText('editorialTestimonialsListAria')}>
        {testimonials.map((t, i) => (
          <button
            type="button"
            key={t.id ?? `${t.name}-${i}`}
            className={`testi-mini ${i === idx ? 'active' : ''}`}
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
          >
            <div className="hdr">
              {renderAvatar(t, 32)}
              <div>
                <b>{t.name}</b>
                {t.location ? (
                  <>
                    <br />
                    <small>{t.location}</small>
                  </>
                ) : null}
              </div>
            </div>
            <p>&ldquo;{t.short ?? truncate(t.text ?? '', 140)}&rdquo;</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function truncate(str: string, n: number): string {
  if (str.length <= n) return str;
  return `${str.slice(0, n - 1).trimEnd()}…`;
}

const ALLOWED_QUOTE_TAGS = new Set(['em', 'br', 'strong']);
function sanitizeQuote(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, name) => {
      const tag = String(name).toLowerCase();
      if (!ALLOWED_QUOTE_TAGS.has(tag)) return '';
      const isClosing = match.startsWith('</');
      if (tag === 'br') return '<br>';
      return isClosing ? `</${tag}>` : `<${tag}>`;
    });
}

export default TestimonialsClient;
