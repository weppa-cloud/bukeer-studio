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
import { WaflowCTAButton } from '../waflow/cta-button';
import { editorialHtml } from '../primitives/rich-heading';

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
          <h2
            className="display-md"
            style={{ margin: 0 }}
            dangerouslySetInnerHTML={editorialHtml(title)}
          />
          {subtitle ? (
            <p
              className="body-lg"
              style={{ margin: 0, color: 'var(--c-ink-2, #6b7280)' }}
              dangerouslySetInnerHTML={editorialHtml(subtitle)}
            />
          ) : null}

          <WaflowCTAButton
            variant="A"
            fallbackHref={whatsappHref}
            className="btn btn-accent btn-lg"
            ariaLabel={`Contact via WhatsApp${rawNumber ? ` ${rawNumber}` : ''}`}
            // Keep visual parity with previous anchor.
            // `WaflowCTAButton` renders a button when provider is mounted.
            // Fallback remains an anchor if WAFlow is unavailable.
          >
            {Icons.whatsapp({ size: 20 })}
            {rawNumber
              ? rawNumber
              : editorialText('editorialCtaAriaFallback')}
          </WaflowCTAButton>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
