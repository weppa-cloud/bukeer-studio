'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

interface StickyCTABarProps {
  price?: number | string | null;
  currency?: string | null;
  whatsappUrl?: string | null;
  phone?: string | null;
  className?: string;
}

function formatStickyPrice(price?: number | string | null, currency?: string | null): string {
  if (price === null || price === undefined) {
    return 'Consultar';
  }

  const numericPrice = typeof price === 'number'
    ? price
    : Number(String(price).replace(/[^0-9.-]/g, ''));

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return 'Consultar';
  }

  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numericPrice);
  const symbol = currency === 'EUR' ? '€' : '$';
  const suffix = currency && !['USD', 'EUR'].includes(currency) ? ` ${currency}` : '';
  return `${symbol}${formatted}${suffix}`;
}

export function StickyCTABar({
  price,
  currency,
  whatsappUrl,
  phone,
  className,
}: StickyCTABarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const callHref = useMemo(() => {
    const cleanPhone = (phone ?? '').replace(/[^0-9+]/g, '');
    return cleanPhone ? `tel:${cleanPhone}` : null;
  }, [phone]);
  const priceLabel = formatStickyPrice(price, currency);

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

    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    if (!isMobile) {
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
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-screen-sm items-center gap-2 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          Desde <span className="text-primary">{priceLabel}</span>
        </p>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-text))' }}
          >
            WhatsApp
          </a>
        ) : null}

        {callHref ? (
          <a
            href={callHref}
            className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            Llamar
          </a>
        ) : null}
      </div>
    </aside>
  );
}

