'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

function getTodayDateInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatSelectedDate(value: string): string {
  if (!value) return 'Flexible';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Flexible';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

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
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [pax, setPax] = useState(2);
  const [notes, setNotes] = useState('');
  const minDate = useMemo(() => getTodayDateInputValue(), []);

  if (!phone) return null;

  const openModal = () => {
    trackEvent('whatsapp_cta_click', {
      product_name: productName ?? null,
      location_context: analyticsLocation ?? 'modal_trigger',
      ref: refCode ? String(refCode) : null,
      ...(analyticsContext ?? {}),
    });
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const onSubmit = () => {
    const sourceUrl = typeof window !== 'undefined' ? window.location.href : '';
    const message = [
      'Hola, quiero planear este viaje por WhatsApp.',
      '',
      productName ? `Interés: *${productName}*` : null,
      location ? `Destino: ${location}` : null,
      `Fecha tentativa: ${formatSelectedDate(date)}`,
      `Personas: ${pax}`,
      notes.trim().length > 0 ? `Notas: ${notes.trim()}` : null,
      sourceUrl ? `Enlace: ${sourceUrl}` : null,
      refCode ? `Referencia: ${String(refCode)}` : null,
    ].filter(Boolean).join('\n');

    const url = buildWhatsAppUrl({
      phone,
      productName,
      location,
      ref: refCode,
      customMessage: message,
    });
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {children ?? label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Planear por WhatsApp</h3>
                <p className="mt-1 text-sm text-muted-foreground">Cuéntanos fecha y personas para prepararte una propuesta.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Fecha</span>
                <input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Personas</span>
                <select
                  value={pax}
                  onChange={(event) => setPax(Number(event.target.value))}
                  className="h-11 rounded-xl border border-border bg-background px-3"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                    <option key={value} value={value}>
                      {value} {value === 1 ? 'persona' : 'personas'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Notas (opcional)</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: viaje en familia, interés en hoteles boutique"
                  className="rounded-xl border border-border bg-background px-3 py-2"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-text))' }}
            >
              {label}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
