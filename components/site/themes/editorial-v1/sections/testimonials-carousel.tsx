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

/** Extract YouTube video ID from standard watch URLs and short youtu.be URLs. */
function extractYouTubeId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  return null;
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

function VideoThumbnail({
  youtubeUrl,
  title,
}: {
  youtubeUrl: string;
  title: string;
}): ReactElement | null {
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return null;
  const thumbSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="tc-video-thumb"
      aria-label={`Watch video from ${title}`}
      style={{ display: 'block', position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}
    >
      <Image
        src={thumbSrc}
        alt={`Video testimonial from ${title}`}
        width={480}
        height={270}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      {/* Static play button overlay */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width={48}
          height={48}
          fill="white"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.55)" />
          <polygon points="19,15 36,24 19,33" fill="white" />
        </svg>
      </span>
    </a>
  );
}

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
        <VideoThumbnail youtubeUrl={item.youtubeUrl} title={item.name} />
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
            gap: 20,
          }}
        >
          {items.map((item, i) => (
            <ReviewCard key={`${item.name}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsCarouselSection;
