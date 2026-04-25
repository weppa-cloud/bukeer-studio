'use client';

import { type MouseEvent, type ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics/track';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';

interface WhatsAppIntentButtonProps {
  phone?: string | null;
  productName?: string | null;
  location?: string | null;
  refCode?: string | number | null;
  className?: string;
  label?: string;
  children?: ReactNode;
  analyticsLocation?: string;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

interface WhatsAppIntentInterceptorProps {
  phone?: string | null;
  productName?: string | null;
  location?: string | null;
  refCode?: string | number | null;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
  children: ReactNode;
}

function buildLegacyWhatsAppUrl({
  phone,
  productName,
  location,
  refCode,
}: Pick<WhatsAppIntentButtonProps, 'phone' | 'productName' | 'location' | 'refCode'>) {
  if (!phone) return null;
  const sourceUrl = typeof window !== 'undefined' ? window.location.href : '';
  const message = [
    'Hola, quiero planear este viaje por WhatsApp.',
    '',
    productName ? `Interés: *${productName}*` : null,
    location ? `Destino: ${location}` : null,
    sourceUrl ? `Enlace: ${sourceUrl}` : null,
    refCode ? `Referencia: ${String(refCode)}` : null,
  ].filter(Boolean).join('\n');

  return buildWhatsAppUrl({
    phone,
    productName,
    location,
    ref: refCode,
    customMessage: message,
  });
}

function openLegacyWhatsApp(
  args: Pick<WhatsAppIntentButtonProps, 'phone' | 'productName' | 'location' | 'refCode'>,
) {
  const url = buildLegacyWhatsAppUrl(args);
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * @deprecated Use `components/site/themes/editorial-v1/waflow/cta-button`
 * for modal-based WhatsApp flows. This legacy wrapper opens WhatsApp
 * directly so the retired generic modal never renders.
 */
export function WhatsAppIntentButton({
  phone,
  productName,
  location,
  refCode,
  className,
  label = 'Continuar por WhatsApp',
  children,
  analyticsLocation,
  analyticsContext,
}: WhatsAppIntentButtonProps) {
  if (!phone) return null;

  const handleClick = () => {
    trackEvent('whatsapp_cta_click', {
      product_name: productName ?? null,
      location_context: analyticsLocation ?? 'legacy_direct',
      ref: refCode ? String(refCode) : null,
      ...(analyticsContext ?? {}),
    });
    openLegacyWhatsApp({ phone, productName, location, refCode });
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children ?? label}
    </button>
  );
}

/**
 * @deprecated Use `WaflowLandingInterceptor` for editorial landing pages.
 * This legacy interceptor opens WhatsApp directly and no longer renders the
 * retired generic modal.
 */
export function WhatsAppIntentInterceptor({
  phone,
  productName,
  location,
  refCode,
  analyticsContext,
  children,
}: WhatsAppIntentInterceptorProps) {
  const openDirectFrom = (source: string) => {
    trackEvent('whatsapp_cta_click', {
      product_name: productName ?? null,
      location_context: source,
      ref: refCode ? String(refCode) : null,
      ...(analyticsContext ?? {}),
    });
    openLegacyWhatsApp({ phone, productName, location, refCode });
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!phone) return;
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (!anchor || anchor.dataset.noWaModal === 'true') return;

    const href = (anchor.getAttribute('href') || '').trim().toLowerCase();
    const text = (anchor.textContent || '').trim().toLowerCase();
    const shouldIntercept =
      href.startsWith('tel:') ||
      href.includes('wa.me/') ||
      href.includes('api.whatsapp.com/') ||
      /whatsapp|habla con asesor|llamar/.test(text);
    if (!shouldIntercept) return;

    event.preventDefault();
    event.stopPropagation();
    openDirectFrom('legacy_interceptor');
  };

  return <div onClickCapture={onClickCapture}>{children}</div>;
}
