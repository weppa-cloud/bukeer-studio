'use client';

import type { CSSProperties, ReactNode } from 'react';

import { normalizeLandingSectionHref, isWhatsAppHref } from '@/lib/utils/cta-links';
import { WhatsAppIntentButton } from '@/components/site/whatsapp-intent-button';

interface ContextualCtaLinkProps {
  href?: string | null;
  phone?: string | null;
  productName?: string | null;
  location?: string | null;
  refCode?: string | number | null;
  label?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  analyticsLocation?: string;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

export function ContextualCtaLink({
  href,
  phone,
  productName,
  location,
  refCode,
  label,
  children,
  className,
  style,
  analyticsLocation,
  analyticsContext,
}: ContextualCtaLinkProps) {
  if (!href) return null;

  const normalizedHref = normalizeLandingSectionHref(href);
  const content = children ?? label;

  if (phone && isWhatsAppHref(href)) {
    return (
      <WhatsAppIntentButton
        phone={phone}
        productName={productName}
        location={location}
        refCode={refCode}
        label={label}
        className={className}
        analyticsLocation={analyticsLocation}
        analyticsContext={analyticsContext}
      >
        {content}
      </WhatsAppIntentButton>
    );
  }

  const isExternal = /^(https?:|mailto:|tel:)/i.test(normalizedHref);

  return (
    <a
      href={normalizedHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={className}
      style={style}
    >
      {content}
    </a>
  );
}
