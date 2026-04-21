/**
 * editorial-v1 FAQ section.
 *
 * Port of designer `Faq` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Split layout:
 *  - Left column: eyebrow + h2 (with `<span class="serif">` emphasis that
 *    comes through as italic-serif when authored) + helper body + optional
 *    WhatsApp CTA.
 *  - Right column: accordion list of question/answer pairs.
 *
 * The interactive accordion is delegated to the tiny `FaqClient` leaf so the
 * rest of this section stays server-rendered (good for SEO — questions and
 * answers are in the initial HTML).
 *
 * Content contract (normalized):
 *   eyebrow?:     string
 *   title?:       string         — may contain `<em>` (verbatim)
 *   helperText?:  string         — body paragraph under the title
 *   ctaLabel?:    string         — optional WhatsApp or "hablar con planner"
 *   ctaUrl?:      string         — supports `{{whatsapp}}` magic token.
 *   faqs:         Array<{ question: string; answer: string }>
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';

import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { FaqClient, type FaqItem } from './faq.client';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

export interface EditorialFaqSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface FaqContent {
  eyebrow?: string;
  title?: string;
  helperText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  faqs?: FaqItem[];
  questions?: FaqItem[];
}

const DEFAULT_EYEBROW_KEY = 'editorialFaqEyebrowFallback';
const DEFAULT_TITLE_KEY = 'editorialFaqTitleFallback';

const ALLOWED_TITLE_TAGS = new Set(['em', 'br']);
function sanitizeTitle(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, name) => {
      const tag = String(name).toLowerCase();
      if (!ALLOWED_TITLE_TAGS.has(tag)) return '';
      const isClosing = match.startsWith('</');
      if (tag === 'br') return '<br>';
      return isClosing ? `</${tag}>` : `<${tag}>`;
    });
}

function resolveWhatsAppHref(website: WebsiteData, fallback: string): string {
  const raw = website.content?.social?.whatsapp || '';
  if (!raw) return fallback;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : fallback;
}

function resolveCtaHref(
  href: string | undefined,
  website: WebsiteData,
  basePath: string,
): string {
  if (!href) return `${basePath}/#cta`;
  if (/^(https?:|mailto:|tel:|wa\.me)/.test(href)) return href;
  if (href === '{{whatsapp}}' || href === 'whatsapp') {
    return resolveWhatsAppHref(website, `${basePath}/#cta`);
  }
  if (href.startsWith('#') || href.startsWith('/')) return `${basePath}${href}`;
  return href;
}

export function FaqSection({
  section,
  website,
}: EditorialFaqSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as FaqContent;

  // Accept `faqs` or `questions` alias; normalize entries.
  const rawFaqs = Array.isArray(content.faqs)
    ? content.faqs
    : Array.isArray(content.questions)
    ? content.questions
    : [];

  const faqs: FaqItem[] = rawFaqs
    .filter(
      (f): f is FaqItem =>
        !!f &&
        typeof f.question === 'string' &&
        f.question.trim().length > 0 &&
        typeof f.answer === 'string' &&
        f.answer.trim().length > 0,
    )
    .map((f) => ({
      question: localizeEditorialText(website, f.question.trim()),
      answer: localizeEditorialText(website, f.answer.trim()),
    }));

  if (faqs.length === 0) return null;

  const basePath = getBasePath(website.subdomain, false);
  const eyebrow = localizeEditorialText(
    website,
    content.eyebrow?.trim() || editorialText(DEFAULT_EYEBROW_KEY),
  );
  const sanitizedTitle = sanitizeTitle(
    localizeEditorialText(website, content.title)
    || localizeEditorialText(website, editorialText(DEFAULT_TITLE_KEY)),
  );
  const helperText = localizeEditorialText(website, content.helperText?.trim() || '');
  const ctaLabel = localizeEditorialText(website, content.ctaLabel?.trim() || '');
  const ctaHref = ctaLabel ? resolveCtaHref(content.ctaUrl, website, basePath) : '';

  return (
    <section
      className="ev-section ev-faq"
      data-screen-label="FAQ"
      aria-label={eyebrow}
    >
      <div className="ev-container">
        <div className="faq">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
              className="display-md"
              style={{ marginTop: 12 }}
              dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
            />
            {helperText ? (
              <p className="body-md" style={{ marginTop: 24, maxWidth: '30ch' }}>
                {helperText}
              </p>
            ) : null}
            {ctaLabel ? (
              <a
                href={ctaHref}
                className="btn btn-outline"
                style={{ marginTop: 16 }}
              >
                {Icons.whatsapp({ size: 16 })}
                {ctaLabel}
              </a>
            ) : null}
          </div>
          <FaqClient faqs={faqs} />
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
