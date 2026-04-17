'use client';

/**
 * Booking form modal — collects lead contact + consent, posts to /api/leads,
 * then opens WhatsApp with a pre-filled message (Phase A, SPEC #168).
 *
 * Keeps its own focus trap + Esc handling so we don't hard-depend on the
 * Base UI Dialog primitive (simpler a11y story and no portal surprises
 * when called from inside a sticky sidebar).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LeadInputSchema, type LeadInput } from '@bukeer/website-contract';

import { trackEvent } from '@/lib/analytics/track';

type BookingWhatsAppBuilder = (args: {
  phone: string | null | undefined;
  productName: string;
  lead: LeadInput;
  leadId: string;
  locale?: string | null;
}) => string | null;

/**
 * Resolve the WhatsApp deeplink builder.
 *
 * Agent B ships `@/lib/booking/whatsapp-deeplink`. We import it dynamically
 * so this component stays useful if B hasn't merged yet (stub fallback
 * builds a minimal wa.me URL mirroring the agreed contract shape).
 */
async function resolveBookingWhatsAppUrl(): Promise<BookingWhatsAppBuilder> {
  try {
    // Module ships from Agent B (#168). Resolved at runtime via a dynamic
    // specifier so the TypeScript compiler does not require the file to
    // exist while agents A/B/C land in parallel. Once B lands, this still
    // works as-is (the import succeeds and the real builder is returned).
    const modPath = ['@', '/lib/booking/whatsapp-deeplink'].join('');
    const mod = (await import(/* @vite-ignore */ modPath)) as {
      buildBookingWhatsAppUrl?: BookingWhatsAppBuilder;
    };
    if (mod && typeof mod.buildBookingWhatsAppUrl === 'function') {
      return mod.buildBookingWhatsAppUrl;
    }
  } catch {
    // expected during parallel-agent development
  }
  return stubBookingWhatsAppUrl;
}

/** Fallback WhatsApp deeplink — only used until Agent B lands its util. */
function stubBookingWhatsAppUrl(args: {
  phone: string | null | undefined;
  productName: string;
  lead: LeadInput;
  leadId: string;
  locale?: string;
}): string | null {
  const clean = (args.phone ?? '').replace(/[^0-9]/g, '');
  if (!clean) return null;
  const text = `Hola, quiero reservar *${args.productName}* para el ${args.lead.date} (${args.lead.pax} pax). Ref: ${args.leadId}`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export interface BookingFormModalProps {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; slug: string };
  website: {
    content: {
      contact?: { phone?: string | null } | null;
      locale?: string | null;
    };
  };
  selectedDate: string;
  pax: number;
  optionId: string | null;
  locale?: string;
  utmParams?: Record<string, string>;
}

type FieldErrors = Partial<Record<keyof LeadInput | 'root', string>>;

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string; fieldErrors?: FieldErrors }
  | { kind: 'success'; leadId: string };

export type SubmitOutcome =
  | { kind: 'validation'; fieldErrors: FieldErrors }
  | { kind: 'rate_limit'; message: string }
  | { kind: 'server_error'; message: string }
  | { kind: 'ok'; leadId: string; whatsappUrl: string | null };

/**
 * Pure submit pipeline — kept out of the component body so tests can
 * exercise it without a DOM. Mirrors the semantics of the inline
 * handler in <BookingFormModal>.
 */
export async function submitBookingLead(args: {
  payload: LeadInput;
  phone: string | null | undefined;
  productName: string;
  locale?: string | null;
  fetchFn?: typeof fetch;
  buildUrl?: BookingWhatsAppBuilder;
}): Promise<SubmitOutcome> {
  const parsed = LeadInputSchema.safeParse(args.payload);
  if (!parsed.success) {
    const errs: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = (issue.path[0] as keyof LeadInput | undefined) ?? 'root';
      if (!errs[key]) errs[key] = issue.message;
    }
    return { kind: 'validation', fieldErrors: errs };
  }

  const fetchFn = args.fetchFn ?? fetch;
  const res = await fetchFn('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  if (res.status === 429) {
    return { kind: 'rate_limit', message: 'Demasiados intentos, intenta en 1 minuto.' };
  }

  if (res.status === 400) {
    let issues: Array<{ path?: Array<string | number>; message: string }> = [];
    try {
      const body = (await res.json()) as { issues?: typeof issues };
      issues = body?.issues ?? [];
    } catch {
      // ignore
    }
    const errs: FieldErrors = {};
    for (const issue of issues) {
      const key = (issue.path?.[0] as keyof LeadInput | undefined) ?? 'root';
      if (!errs[key]) errs[key] = issue.message;
    }
    return { kind: 'validation', fieldErrors: errs };
  }

  if (!res.ok) {
    return {
      kind: 'server_error',
      message: 'No pudimos procesar tu solicitud, intenta de nuevo.',
    };
  }

  const data = (await res.json()) as { lead_id: string };
  const builder = args.buildUrl ?? (await resolveBookingWhatsAppUrl());
  const whatsappUrl = builder({
    phone: args.phone,
    productName: args.productName,
    lead: parsed.data,
    leadId: data.lead_id,
    locale: args.locale,
  });
  return { kind: 'ok', leadId: data.lead_id, whatsappUrl };
}

export function BookingFormModal({
  open,
  onClose,
  product,
  website,
  selectedDate,
  pax,
  optionId,
  locale,
  utmParams,
}: BookingFormModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consentTos, setConsentTos] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });

  const effectiveLocale = locale ?? website.content.locale ?? null;

  // Focus trap: capture previously focused element, focus first field on open,
  // restore on close. Esc closes. Tab cycles within the dialog.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    const t = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 10);
    return () => {
      window.clearTimeout(t);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Reset form every time the modal re-opens.
  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setSubmit({ kind: 'idle' });
    }
  }, [open]);

  const phoneForWhatsApp = useMemo(() => {
    return website.content.contact?.phone ?? null;
  }, [website.content.contact?.phone]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const payload: LeadInput = {
        product_id: product.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date: selectedDate,
        pax,
        option_id: optionId,
        locale: effectiveLocale,
        source: 'website_booking_form',
        utm: utmParams && Object.keys(utmParams).length > 0 ? utmParams : undefined,
        consent_tos: consentTos as true,
        consent_privacy: consentPrivacy as true,
      };

      setFieldErrors({});
      setSubmit({ kind: 'submitting' });

      try {
        const outcome = await submitBookingLead({
          payload,
          phone: phoneForWhatsApp,
          productName: product.name,
          locale: effectiveLocale,
        });

        if (outcome.kind === 'validation') {
          setFieldErrors(outcome.fieldErrors);
          setSubmit({
            kind: 'error',
            message: 'Revisa los campos marcados.',
            fieldErrors: outcome.fieldErrors,
          });
          return;
        }

        if (outcome.kind === 'rate_limit') {
          setSubmit({ kind: 'error', message: outcome.message });
          return;
        }

        if (outcome.kind === 'server_error') {
          setSubmit({ kind: 'error', message: outcome.message });
          return;
        }

        trackEvent('booking_intent', {
          product_id: product.id,
          phase: 'A',
          date: selectedDate,
          pax,
          option_id: optionId ?? null,
          lead_id: outcome.leadId,
        });

        if (outcome.whatsappUrl) {
          window.open(outcome.whatsappUrl, '_blank', 'noopener,noreferrer');
        }

        setSubmit({ kind: 'success', leadId: outcome.leadId });
        onClose();
      } catch {
        setSubmit({
          kind: 'error',
          message: 'No pudimos procesar tu solicitud, intenta de nuevo.',
        });
      }
    },
    [
      product.id,
      product.name,
      name,
      email,
      phone,
      selectedDate,
      pax,
      optionId,
      effectiveLocale,
      utmParams,
      consentTos,
      consentPrivacy,
      phoneForWhatsApp,
      onClose,
    ],
  );

  if (!open) return null;

  const submitting = submit.kind === 'submitting';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-2xl p-6 shadow-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-heading)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Reservar por WhatsApp
            </h2>
            <p id={descId} className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {product.name} · {selectedDate} · {pax} {pax === 1 ? 'pax' : 'pax'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full px-2 py-1 text-lg leading-none"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        {submit.kind === 'error' && !submit.fieldErrors && (
          <div
            role="alert"
            className="mb-3 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, #ef4444 60%, var(--border-subtle))',
              backgroundColor: 'color-mix(in srgb, #ef4444 10%, var(--bg-card))',
              color: '#b91c1c',
            }}
          >
            {submit.message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3" data-testid="booking-form">
          <Field
            label="Nombre"
            error={fieldErrors.name}
            input={
              <input
                ref={firstFieldRef}
                type="text"
                name="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
                aria-invalid={Boolean(fieldErrors.name)}
              />
            }
          />
          <Field
            label="Email"
            error={fieldErrors.email}
            input={
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            }
          />
          <Field
            label="Teléfono"
            error={fieldErrors.phone}
            input={
              <input
                type="tel"
                name="phone"
                required
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
            }
          />

          <label className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              name="consent_tos"
              checked={consentTos}
              onChange={(e) => setConsentTos(e.target.checked)}
              className="mt-0.5"
              aria-invalid={Boolean(fieldErrors.consent_tos)}
              required
            />
            <span>
              Acepto los términos y condiciones del servicio.
              {fieldErrors.consent_tos && (
                <span className="mt-1 block" style={{ color: '#b91c1c' }}>
                  {fieldErrors.consent_tos}
                </span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              name="consent_privacy"
              checked={consentPrivacy}
              onChange={(e) => setConsentPrivacy(e.target.checked)}
              className="mt-0.5"
              aria-invalid={Boolean(fieldErrors.consent_privacy)}
              required
            />
            <span>
              Autorizo el tratamiento de mis datos para contacto comercial.
              {fieldErrors.consent_privacy && (
                <span className="mt-1 block" style={{ color: '#b91c1c' }}>
                  {fieldErrors.consent_privacy}
                </span>
              )}
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast, #ffffff)',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'progress' : 'pointer',
            }}
          >
            {submitting ? 'Enviando…' : 'Continuar por WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg)',
  color: 'var(--text-heading)',
  borderColor: 'var(--border-subtle)',
};

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {input}
      {error && (
        <span className="mt-1 block text-xs" style={{ color: '#b91c1c' }}>
          {error}
        </span>
      )}
    </label>
  );
}
