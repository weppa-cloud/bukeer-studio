/**
 * editorial-v1 Text + Image — 2-column split section.
 *
 * Left/right image position controlled by `content.imagePosition` ('left' | 'right',
 * default 'right'). Alternating positions across consecutive sections creates
 * visual rhythm.
 *
 * Mobile: image stacks above text (CSS order controlled by ev-text-image class).
 *
 * Content contract:
 *   eyebrow?:        string
 *   headline:        string
 *   body:            string
 *   image:           string  (URL)
 *   imagePosition?:  'left' | 'right'   (default 'right')
 *   ctaText?:        string
 *   ctaUrl?:         string
 *
 * Server component. No state, no interactivity.
 */

import type { ReactElement } from 'react';
import Image from 'next/image';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { localizeEditorialText } from '../i18n';
import { Eyebrow } from '../primitives/eyebrow';

export interface EditorialTextImageSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface TextImageContent {
  eyebrow?: string;
  headline?: string;
  body?: string;
  image?: string;
  imagePosition?: 'left' | 'right';
  ctaText?: string;
  ctaUrl?: string;
}

export function TextImageSection({
  section,
  website,
}: EditorialTextImageSectionProps): ReactElement | null {
  const content = (section.content || {}) as TextImageContent;

  const headline = localizeEditorialText(website, content.headline?.trim() || '');
  const body = localizeEditorialText(website, content.body?.trim() || '');
  const image = content.image?.trim() || '';

  if (!headline && !image) return null;

  const eyebrow = localizeEditorialText(website, content.eyebrow?.trim() || '');
  const ctaText = localizeEditorialText(website, content.ctaText?.trim() || '');
  const ctaUrl = content.ctaUrl?.trim() || '#';
  const imagePosition = content.imagePosition === 'left' ? 'left' : 'right';

  return (
    <section
      className={`ev-section ev-text-image ev-text-image--${imagePosition}`}
      data-screen-label="TextImage"
    >
      <div className="ev-container">
        <div className="text-image-grid">
          {/* Text column */}
          <div className="text-image-copy">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {headline ? (
              <h2 className="headline-lg">{headline}</h2>
            ) : null}
            {body ? <p className="body-lg">{body}</p> : null}
            {ctaText ? (
              <a href={ctaUrl} className="btn btn-primary">
                {ctaText}
              </a>
            ) : null}
          </div>

          {/* Image column */}
          {image ? (
            <div className="text-image-media">
              <Image
                src={image}
                alt={headline || eyebrow || ''}
                width={600}
                height={450}
                className="text-image-img"
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default TextImageSection;
