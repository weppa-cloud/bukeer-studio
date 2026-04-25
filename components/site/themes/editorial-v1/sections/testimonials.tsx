/**
 * editorial-v1 Testimonials section.
 *
 * Port of designer `Testimonials` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Split layout:
 *  - Left: featured Google-style review card (big quote, star row, author).
 *  - Right: 2–4 mini review cards the user can click to swap into the
 *    featured slot (delegated to `TestimonialsClient`).
 *
 * Dynamic data: `content.testimonials` is hydrated from Google reviews by
 * `lib/sections/hydrate-sections.ts` (step 4). The hydrator also sets
 * `content.averageRating`, `content.totalReviews`, and `content.googleMapsUrl`.
 * When fewer than 2 reviews are available the client leaf is skipped and we
 * render a single full-width featured card.
 *
 * Server component — only the interactive switcher is a client leaf.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { PublicUiExtraTextKey } from '@/lib/site/public-ui-extra-text';

import { Eyebrow } from '../primitives/eyebrow';
import { editorialHtml } from '../primitives/rich-heading';
import { Icons } from '../primitives/icons';
import {
  TestimonialsClient,
  type TestimonialItem,
} from './testimonials.client';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

export interface EditorialTestimonialsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface TestimonialsContent {
  eyebrow?: string;
  title?: string;
  testimonials?: TestimonialItem[];
  averageRating?: number | null;
  totalReviews?: number | null;
  googleMapsUrl?: string | null;
}

function renderSingleFeatured(
  t: TestimonialItem,
  editorialText: (key: PublicUiExtraTextKey) => string,
): ReactElement {
  return (
    <article className="testi-big" style={{ maxWidth: 880, margin: '0 auto' }}>
      <span className="quote-mark" aria-hidden="true">
        &ldquo;
      </span>
      <div className="stars" role="img" aria-label={`${t.rating ?? 5} ${editorialText('editorialTestimonialsStarsAriaSuffix')}`}>
        {Array.from({ length: Math.max(1, Math.min(5, Math.round(t.rating ?? 5))) }).map((_, i) => (
          <span key={i}>{Icons.star({ size: 18 })}</span>
        ))}
      </div>
      <blockquote>{t.text ?? ''}</blockquote>
      <div className="testi-author">
        <span
          className="av"
          style={{ width: 48, height: 48 }}
          aria-hidden="true"
        >
          {t.name
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n.charAt(0).toUpperCase())
            .join('')}
        </span>
        <div>
          <b>{t.name}</b>
          <small>{[t.location, t.pkg].filter(Boolean).join(' · ')}</small>
        </div>
      </div>
    </article>
  );
}

export function TestimonialsSection({
  section,
  website,
}: EditorialTestimonialsSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const locale = (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale || website.default_locale || website.content?.locale || 'es-CO';
  const content = (section.content || {}) as TestimonialsContent;

  const raw = Array.isArray(content.testimonials) ? content.testimonials : [];
  const testimonials: TestimonialItem[] = raw
    .filter((t): t is TestimonialItem => !!t && typeof t.name === 'string' && (t.text ?? '').length > 0)
    .slice(0, 5);

  if (testimonials.length === 0) return null;

  const eyebrow = localizeEditorialText(
    website,
    content.eyebrow?.trim() || editorialText('editorialTestimonialsEyebrowFallback'),
  );
  const title = localizeEditorialText(
    website,
    content.title?.trim() || editorialText('editorialTestimonialsTitleFallback'),
  );

  const rating = typeof content.averageRating === 'number' ? content.averageRating : undefined;
  const total = typeof content.totalReviews === 'number' ? content.totalReviews : undefined;

  const ratingChipLabel =
    rating !== undefined && total !== undefined
      ? `${rating.toFixed(1)} · ${total.toLocaleString(locale)} ${editorialText('editorialTestimonialsVerifiedSuffix')}`
      : rating !== undefined
      ? `${rating.toFixed(1)} ${editorialText('editorialTestimonialsAverage')}`
      : total !== undefined
      ? `${total.toLocaleString(locale)} ${editorialText('editorialTestimonialsReviews')}`
      : null;

  return (
    <section
      className="ev-section ev-testimonials"
      data-screen-label="Testimonials"
      aria-label={eyebrow}
    >
      <div className="ev-container">
        <header className="ev-section-head">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
              className="display-md"
              dangerouslySetInnerHTML={editorialHtml(title) ?? undefined}
            />
          </div>
          {ratingChipLabel ? (
            <div className="tools">
              {content.googleMapsUrl ? (
                <a
                  className="chip chip-ink"
                  href={content.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${editorialText('editorialTestimonialsGoogleAria')} (${ratingChipLabel})`}
                >
                  {Icons.star({ size: 12 })} {ratingChipLabel}
                </a>
              ) : (
                <span className="chip chip-ink">
                  {Icons.star({ size: 12 })} {ratingChipLabel}
                </span>
              )}
            </div>
          ) : null}
        </header>

        {testimonials.length >= 2 ? (
          <TestimonialsClient testimonials={testimonials} locale={locale} />
        ) : (
          renderSingleFeatured(testimonials[0], editorialText)
        )}
      </div>
    </section>
  );
}

export default TestimonialsSection;
