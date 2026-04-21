/**
 * editorial-v1 Contact section.
 *
 * Simple centered contact CTA section. Derives the WhatsApp URL from
 * `website.content.social.whatsapp`. Renders null when no WhatsApp number
 * is configured — there is nothing actionable to show without it.
 *
 * Content contract:
 *   title?:    string  — section heading
 *   subtitle?: string  — body copy below the heading
 *
 * Server component. No client JS.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { Icons } from '../primitives/icons';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

export interface EditorialContactSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface ContactContent {
  title?: string;
  subtitle?: string;
}

function buildWhatsAppHref(website: WebsiteData): string | null {
  const raw = website.content?.social?.whatsapp || '';
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function ContactSection({
  section,
  website,
}: EditorialContactSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as ContactContent;

  const whatsappHref = buildWhatsAppHref(website);
  if (!whatsappHref) return null;

  const title = localizeEditorialText(
    website,
    content.title?.trim() || editorialText('editorialCtaTitleFallback'),
  );
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');

  // Display the raw WhatsApp number as the link label
  const rawNumber = (website.content?.social?.whatsapp || '').trim();

  return (
    <section
      className="ev-section ev-contact"
      data-screen-label="Contact"
      aria-label={title}
    >
      <div className="ev-container">
        <div
          style={{
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <h2 className="display-md" style={{ margin: 0 }}>
            {title}
          </h2>

          {subtitle ? (
            <p className="body-lg" style={{ margin: 0, color: 'var(--c-ink-2, #6b7280)' }}>
              {subtitle}
            </p>
          ) : null}

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent btn-lg"
            style={{ gap: 8, display: 'inline-flex', alignItems: 'center' }}
            aria-label={`Contact via WhatsApp${rawNumber ? ` ${rawNumber}` : ''}`}
          >
            {Icons.whatsapp({ size: 20 })}
            {rawNumber
              ? rawNumber
              : editorialText('editorialCtaAriaFallback')}
          </a>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
