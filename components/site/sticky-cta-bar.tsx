'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { trackEvent } from '@/lib/analytics/track';

interface StickyCTABarProps {
  price?: number | string | null;
  currency?: string | null;
  whatsappUrl?: string | null;
  phone?: string | null;
  className?: string;
  /** Optional analytics dimensions merged into whatsapp_cta_click / phone_cta_click events. */
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

export function StickyCTABar({
  price,
  currency,
  whatsappUrl,
  phone,
  className,
  analyticsContext,
}: StickyCTABarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const callHref = useMemo(() => {
    const cleanPhone = (phone ?? '').replace(/[^0-9+]/g, '');
    return cleanPhone ? `tel:${cleanPhone}` : null;
  }, [phone]);
  const priceLabel = formatPriceOrConsult(price, currency);

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > 200);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = 'calc(76px + env(safe-area-inset-bottom))';
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, []);

  if (!isVisible || (!whatsappUrl && !callHref)) {
    return null;
  }

  return (
    <aside
      role="complementary"
      aria-label="Acciones rápidas de contacto"
      className={clsx(
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-2 sm:px-6 sm:py-3">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground sm:text-sm">
          Desde <span className="text-primary">{priceLabel}</span>
        </p>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackEvent('sticky_cta_click', { ...(analyticsContext ?? {}), channel: 'whatsapp' });
              trackEvent('whatsapp_cta_click', { ...(analyticsContext ?? {}), location_context: 'sticky_bar' });
            }}
            className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold sm:px-5 sm:text-sm"
            style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-text))' }}
          >
            WhatsApp
          </a>
        ) : null}

        {callHref ? (
          <a
            href={callHref}
            onClick={() => {
              trackEvent('sticky_cta_click', { ...(analyticsContext ?? {}), channel: 'tel' });
              trackEvent('phone_cta_click', { ...(analyticsContext ?? {}), location_context: 'sticky_bar' });
            }}
            className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted sm:px-5 sm:text-sm"
          >
            Llamar
          </a>
        ) : null}
      </div>
    </aside>
  );
}
