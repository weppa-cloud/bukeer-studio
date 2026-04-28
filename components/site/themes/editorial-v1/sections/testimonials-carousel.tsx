/**
 * editorial-v1 Testimonials Carousel section.
 *
 * Handles `testimonials_carousel` DB section type — a DIFFERENT content
 * schema from the `testimonials` type (Google-review hydrated). This type
 * carries manually authored items with optional YouTube video thumbnails,
 * star ratings, source labels, and market/date metadata.
 *
 * Design:
 *  - Section header: h2 from title + subtitle paragraph
 *  - 2-column card grid (desktop) / 1-col (mobile)
 *  - Each card: star row, quote text, author line, date/market
 *  - Video items: YouTube thumbnail with play-button overlay (static, no JS)
 *  - Initials avatar when no avatar image is provided
 *
 * Server component. No client JS.
 */

import type { ReactElement } from 'react';
import Image from 'next/image';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { Icons } from '../primitives/icons';
import { Eyebrow } from '../primitives/eyebrow';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

export interface EditorialTestimonialsCarouselSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface TestimonialsCarouselItem {
  name: string;
  text: string;
  avatar?: string;
  rating?: number;
  source?: string;
  dateLabel?: string;
  market?: string;
  youtubeUrl?: string;
}

interface TestimonialsCarouselContent {
  title?: string;
  subtitle?: string;
  items?: TestimonialsCarouselItem[];
}

function StarRow({ rating }: { rating: number }): ReactElement {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="stars" aria-label={`${clamped} stars`}>
      {Array.from({ length: clamped }).map((_, i) => (
        <span key={i} style={{ color: 'var(--c-accent, #f59e0b)' }}>
          {Icons.star({ size: 14 })}
        </span>
      ))}
    </div>
  );
}

function InitialsAvatar({ name }: { name: string }): ReactElement {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      className="av"
      style={{ width: 40, height: 40, flexShrink: 0 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

import { VideoThumbnailClient } from './video-thumbnail.client';

function ReviewCard({
  item,
}: {
  item: TestimonialsCarouselItem;
}): ReactElement {
  const hasRating = typeof item.rating === 'number' && item.rating > 0;
  const meta = [item.dateLabel, item.market].filter(Boolean).join(' · ');

  return (
    <article
      className="tc-card"
      style={{
        background: 'var(--c-surface, #fff)',
        border: '1px solid var(--c-border, #e5e7eb)',
        borderRadius: 12,
        padding: '20px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {item.youtubeUrl ? (
        <VideoThumbnailClient youtubeUrl={item.youtubeUrl} title={item.name} />
      ) : null}

      {hasRating ? <StarRow rating={item.rating!} /> : null}

      <blockquote
        className="body-md"
        style={{ margin: 0, fontStyle: 'italic', color: 'var(--c-ink, #111)' }}
      >
        &ldquo;{item.text}&rdquo;
      </blockquote>

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 'auto',
        }}
      >
        {item.avatar ? (
          <Image
            src={item.avatar}
            alt={item.name}
            width={40}
            height={40}
            style={{ borderRadius: '50%', objectFit: 'cover', width: 40, height: 40, flexShrink: 0 }}
          />
        ) : (
          <InitialsAvatar name={item.name} />
        )}
        <div>
          <b className="label" style={{ display: 'block' }}>
            {item.name}
          </b>
          {meta ? (
            <small style={{ color: 'var(--c-ink-2, #6b7280)', fontSize: '0.8rem' }}>
              {meta}
            </small>
          ) : null}
          {item.source === 'google' ? (
            <small
              style={{
                display: 'block',
                color: 'var(--c-ink-2, #6b7280)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Google
            </small>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

export function TestimonialsCarouselSection({
  section,
  website,
}: EditorialTestimonialsCarouselSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as TestimonialsCarouselContent;

  const items: TestimonialsCarouselItem[] = Array.isArray(content.items)
    ? content.items.filter(
        (item): item is TestimonialsCarouselItem =>
          !!item && typeof item.name === 'string' && (item.text ?? '').length > 0,
      )
    : [];

  if (items.length === 0) return null;

  const title = localizeEditorialText(website, content.title?.trim() || '');
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');
  const hasVideos = items.some((item) => !!item.youtubeUrl);

  return (
    <section
      className="ev-section ev-testimonials-carousel"
      data-screen-label="TestimonialsCarousel"
      aria-label={title || editorialText('editorialTestimonialsEyebrowFallback')}
    >
      <div className="ev-container">
        {title ? (
          <header className="ev-section-head" style={{ marginBottom: 32 }}>
            <div>
              <Eyebrow>{editorialText('editorialTestimonialsEyebrowFallback')}</Eyebrow>
              <h2 className="display-md">{title}</h2>
              {subtitle ? <p className="body-lg" style={{ marginTop: 8 }}>{subtitle}</p> : null}
            </div>
          </header>
        ) : null}

        <div className={hasVideos ? 'tc-track tc-track--videos' : 'tc-track'}>
          {items.map((item, i) => (
            <ReviewCard key={`${item.name}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsCarouselSection;
