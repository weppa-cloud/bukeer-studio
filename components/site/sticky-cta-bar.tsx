'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { convertCurrencyAmount, type CurrencyConfig } from '@/lib/site/currency';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';
import { WhatsAppIntentButton } from '@/components/site/whatsapp-intent-button';
import { WaflowCTAButton } from '@/components/site/themes/editorial-v1/waflow/cta-button';
import type { WaflowPackageContext, WaflowPrefill } from '@/components/site/themes/editorial-v1/waflow/types';

interface StickyCTABarProps {
  price?: number | string | null;
  currency?: string | null;
  preferredCurrency?: string | null;
  currencyConfig?: CurrencyConfig | null;
  whatsappUrl?: string | null;
  phone?: string | null;
  className?: string;
  sentinelId?: string;
  /** Optional analytics dimensions merged into whatsapp_cta_click / phone_cta_click events. */
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
  whatsappLabel?: string;
  hidePrice?: boolean;
  onWhatsappClick?: (() => void) | null;
  callUrl?: string | null;
  callLabel?: string;
  openWhatsappAsModal?: boolean;
  whatsappProductName?: string | null;
  whatsappLocation?: string | null;
  whatsappRefCode?: string | number | null;
  openCallAsWhatsappModal?: boolean;
  openWhatsappAsWaflow?: boolean;
  waflowPackage?: WaflowPackageContext | null;
  waflowPrefill?: WaflowPrefill | null;
}

export function StickyCTABar({
  price,
  currency,
  preferredCurrency,
  currencyConfig,
  whatsappUrl,
  phone,
  className,
  sentinelId = 'detail-sticky-sentinel',
  analyticsContext,
  whatsappLabel,
  hidePrice = false,
  onWhatsappClick = null,
  callUrl = null,
  callLabel,
  openWhatsappAsModal = false,
  whatsappProductName = null,
  whatsappLocation = null,
  whatsappRefCode = null,
  openCallAsWhatsappModal = false,
  openWhatsappAsWaflow = false,
  waflowPackage = null,
  waflowPrefill = null,
}: StickyCTABarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const callHref = useMemo(() => {
    if (callUrl && callUrl.trim().length > 0) return callUrl.trim();
    const cleanPhone = (phone ?? '').replace(/[^0-9+]/g, '');
    return cleanPhone ? `tel:${cleanPhone}` : null;
  }, [phone, callUrl]);
  const effectiveCurrency = preferredCurrency ?? currency ?? null;
  const convertedPrice = convertCurrencyAmount(price, currency, effectiveCurrency, currencyConfig ?? null);
  const priceLabel = formatPriceOrConsult(convertedPrice, effectiveCurrency ?? currency);
  const uiMessages = getPublicUiMessages('es-CO');
  const resolvedWhatsappLabel = whatsappLabel?.trim() || uiMessages.stickyCta.whatsapp;
  const resolvedCallLabel = callLabel?.trim() || uiMessages.stickyCta.call;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sentinel = document.getElementById(sentinelId);

    if (sentinel && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // Sticky bar is visible when the hero sentinel is no longer in viewport.
          setIsVisible(!entry.isIntersecting);
        },
        { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
      );

      observer.observe(sentinel);
      return () => observer.disconnect();
    }

    const onScroll = () => setIsVisible(window.scrollY > 220);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sentinelId]);

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

  if (!whatsappUrl && !callHref && !onWhatsappClick) {
    return null;
  }

  return (
    <aside
      role="complementary"
      aria-label={uiMessages.stickyCta.quickActionsAria}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        prefersReducedMotion ? '' : 'transition-transform duration-300 ease-out',
        isVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-2 sm:px-6 sm:py-3">
        {!hidePrice ? (
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground sm:text-sm">
            {uiMessages.stickyCta.fromLabel} <span className="text-primary">{priceLabel}</span>
          </p>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        {whatsappUrl || onWhatsappClick ? (
          onWhatsappClick ? (
            <button
              type="button"
              onClick={() => {
                trackEvent('sticky_cta_click', { ...(analyticsContext ?? {}), channel: 'whatsapp' });
                trackEvent('whatsapp_cta_click', { ...(analyticsContext ?? {}), location_context: 'sticky_bar' });
                onWhatsappClick();
              }}
              className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold sm:px-5 sm:text-sm"
              style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-text))' }}
            >
              {resolvedWhatsappLabel}
            </button>
          ) : openWhatsappAsWaflow && waflowPackage ? (
            <WaflowCTAButton
              variant="D"
              pkg={waflowPackage}
              prefill={waflowPrefill ?? undefined}
              fallbackHref={whatsappUrl ?? undefined}
              className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold sm:px-5 sm:text-sm"
            >
              {resolvedWhatsappLabel}
            </WaflowCTAButton>
          ) : openWhatsappAsModal ? (
            <WhatsAppIntentButton
              phone={phone}
              productName={whatsappProductName}
              location={whatsappLocation}
              refCode={whatsappRefCode}
              label={resolvedWhatsappLabel}
              analyticsLocation="sticky_bar"
              analyticsContext={analyticsContext}
              className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold sm:px-5 sm:text-sm"
            />
          ) : (
            <a
              href={whatsappUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent('sticky_cta_click', { ...(analyticsContext ?? {}), channel: 'whatsapp' });
                trackEvent('whatsapp_cta_click', { ...(analyticsContext ?? {}), location_context: 'sticky_bar' });
              }}
              className="inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold sm:px-5 sm:text-sm"
              style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-text))' }}
            >
              {resolvedWhatsappLabel}
            </a>
          )
        ) : null}

        {callHref ? (
          openWhatsappAsWaflow && waflowPackage ? (
            <WaflowCTAButton
              variant="D"
              pkg={waflowPackage}
              prefill={waflowPrefill ?? undefined}
              fallbackHref={whatsappUrl ?? undefined}
              className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted sm:px-5 sm:text-sm"
            >
              {resolvedCallLabel}
            </WaflowCTAButton>
          ) : openCallAsWhatsappModal ? (
            <WhatsAppIntentButton
              phone={phone}
              productName={whatsappProductName}
              location={whatsappLocation}
              refCode={whatsappRefCode}
              label={resolvedCallLabel}
              analyticsLocation="sticky_bar_call"
              analyticsContext={analyticsContext}
              className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted sm:px-5 sm:text-sm"
            />
          ) : (
            <a
              href={callHref}
              target={callHref.startsWith('http') ? '_blank' : undefined}
              rel={callHref.startsWith('http') ? 'noopener noreferrer' : undefined}
              onClick={() => {
                trackEvent('sticky_cta_click', { ...(analyticsContext ?? {}), channel: 'tel' });
                trackEvent('phone_cta_click', { ...(analyticsContext ?? {}), location_context: 'sticky_bar' });
              }}
              className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted sm:px-5 sm:text-sm"
            >
              {resolvedCallLabel}
            </a>
          )
        ) : null}
      </div>
    </aside>
  );
}
