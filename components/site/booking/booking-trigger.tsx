'use client';

/**
 * Sidebar booking trigger (SPEC #168 — Phase A).
 *
 * Composes the inline datepicker, a pax stepper, an optional option selector,
 * and a "Reservar por WhatsApp" CTA that opens <BookingFormModal>. Captures
 * UTM params from the URL on mount and forwards them to the lead payload.
 *
 * Renders only for activity/package products. Anything else returns null so
 * the parent layout stays stable.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ProductData } from '@bukeer/website-contract';

import { formatPriceOrConsult } from '@/lib/products/format-price';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

import { DatePicker } from './date-picker';
import { BookingFormModal } from './booking-form-modal';

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export interface BookingTriggerProps {
  product: ProductData;
  website: WebsiteData;
  className?: string;
}

function captureUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const v = params.get(key);
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function BookingTrigger({ product, website, className = '' }: BookingTriggerProps) {
  // Phase A scope: only activity + package drive a date-based lead capture.
  if (product.type !== 'activity' && product.type !== 'package') {
    return null;
  }

  return <BookingTriggerInner product={product} website={website} className={className} />;
}

function BookingTriggerInner({
  product,
  website,
  className,
}: {
  product: ProductData;
  website: WebsiteData;
  className: string;
}) {
  const options = Array.isArray(product.options) ? product.options : [];
  const hasOptions = options.length > 0;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pax, setPax] = useState<number>(1);
  const [optionId, setOptionId] = useState<string | null>(hasOptions ? options[0].id : null);
  const [modalOpen, setModalOpen] = useState(false);
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  useEffect(() => {
    setUtmParams(captureUtmParams());
  }, []);

  const locale = (website.content as unknown as { locale?: string } | undefined)?.locale;
  const uiMessages = getPublicUiMessages(locale ?? 'es-CO');

  const priceLabel = useMemo(() => {
    const raw = typeof product.price === 'string' ? Number(product.price) : product.price;
    const num = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    if (num === null) {
      return uiMessages.bookingWidget.priceConsultPerPerson;
    }
    return `${uiMessages.bookingWidget.priceFromPerPersonPrefix} ${formatPriceOrConsult(num, product.currency)} ${uiMessages.bookingWidget.priceFromPerPersonSuffix}`;
  }, [product.price, product.currency, uiMessages.bookingWidget.priceConsultPerPerson, uiMessages.bookingWidget.priceFromPerPersonPrefix, uiMessages.bookingWidget.priceFromPerPersonSuffix]);

  const canSubmit = Boolean(selectedDate);

  const handleOpen = () => {
    if (!selectedDate) return;
    setModalOpen(true);
  };

  return (
    <aside
      className={`rounded-2xl border p-5 space-y-4 ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-heading)',
      }}
      aria-label={uiMessages.bookingWidget.reserveExperience}
    >
      <header className="space-y-1">
        <h3 className="text-base font-semibold">{uiMessages.bookingWidget.reserveExperience}</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary, var(--text-heading))' }}>
          {priceLabel}
        </p>
      </header>

      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary, var(--text-heading))' }}>
          {uiMessages.bookingWidget.dateLabel}
        </span>
        <DatePicker value={selectedDate} onChange={setSelectedDate} locale={locale ?? 'es-CO'} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary, var(--text-heading))' }}>
          {uiMessages.bookingWidget.peopleLabel}
        </span>
        <div
          className="inline-flex items-center gap-2 rounded-full border px-2 py-1"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => setPax((p) => Math.max(1, p - 1))}
            disabled={pax <= 1}
            aria-label={uiMessages.bookingWidget.removePersonAria}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm disabled:opacity-40"
            style={{ color: 'var(--text-heading)' }}
          >
            −
          </button>
          <span className="min-w-[2ch] text-center text-sm font-medium" aria-live="polite">
            {pax}
          </span>
          <button
            type="button"
            onClick={() => setPax((p) => Math.min(20, p + 1))}
            disabled={pax >= 20}
            aria-label={uiMessages.bookingWidget.addPersonAria}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm disabled:opacity-40"
            style={{ color: 'var(--text-heading)' }}
          >
            +
          </button>
        </div>
      </div>

      {hasOptions && (
        <div>
          <label
            htmlFor="booking-option"
            className="mb-1 block text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-secondary, var(--text-heading))' }}
          >
              {uiMessages.bookingWidget.optionLabel}
            </label>
          <select
            id="booking-option"
            value={optionId ?? ''}
            onChange={(e) => setOptionId(e.target.value || null)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text-heading)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        disabled={!canSubmit}
        className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-contrast, #ffffff)',
          opacity: canSubmit ? 1 : 0.55,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
        aria-disabled={!canSubmit}
      >
        {uiMessages.bookingWidget.reserveByWhatsapp}
      </button>

      {!canSubmit && (
        <p className="text-center text-xs" style={{ color: 'var(--text-secondary, var(--text-heading))' }}>
          {uiMessages.bookingWidget.selectDatePrompt}
        </p>
      )}

      {modalOpen && selectedDate && (
        <BookingFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          product={{ id: product.id, name: product.name, slug: product.slug }}
          website={{
            content: {
              contact: website.content?.contact
                ? { phone: website.content.contact.phone ?? null }
                : null,
              locale,
            },
          }}
          selectedDate={selectedDate}
          pax={pax}
          optionId={optionId}
          locale={locale}
          utmParams={utmParams}
        />
      )}
    </aside>
  );
}
