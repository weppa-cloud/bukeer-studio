'use client';

/**
 * editorial-v1 WAFlow — Step: Contact.
 *
 * Final data-entry step — name + phone (required), email + notes
 * (optional). On submit we POST to /api/waflow/lead which upserts the
 * lead + returns a referenceCode. We then build the WhatsApp URL
 * client-side (pure helper) and advance to the confirmation step.
 */

import { useCallback, useMemo, useState } from 'react';

import {
  WAFLOW_COUNTRIES,
  WAFLOW_STEP_ORDER,
} from '../types';
import type { WaflowConfig, WaflowVariant } from '../types';
import {
  buildWaflowMessage,
  buildWaflowUrl,
  makeWaflowRef,
  resolveRefPrefix,
  validateWaflowPhone,
} from '../message';
import { useWaflow, useWaflowApi } from '../provider';

export interface WaflowStepContactProps {
  variant: WaflowVariant;
  config: WaflowConfig;
  subdomain?: string;
}

type ContactErrors = Partial<Record<'name' | 'phone' | 'context', string>>;

export function WaflowStepContact({
  variant,
  config,
  subdomain,
}: WaflowStepContactProps) {
  const { state, patch, setStep } = useWaflowApi();
  const { businessNumber } = useWaflow();
  const [errors, setErrors] = useState<ContactErrors>({});
  const [loading, setLoading] = useState(false);

  const country = useMemo(
    () =>
      WAFLOW_COUNTRIES.find((c) => c.c === state.countryCode) ||
      WAFLOW_COUNTRIES[0],
    [state.countryCode],
  );

  const order = WAFLOW_STEP_ORDER[variant];
  const idx = order.indexOf('contact');
  const prev = idx > 0 ? order[idx - 1] : null;

  const submitLabel = useMemo(() => {
    if (variant === 'A') return 'Continuar en WhatsApp';
    if (variant === 'B')
      return `Planear mi viaje a ${config.destination?.name ?? ''}`.trim();
    return 'Continuar con este paquete';
  }, [variant, config]);

  const handleSubmit = useCallback(async () => {
    const errs: ContactErrors = {};
    if (!state.name.trim() || state.name.trim().length < 2) {
      errs.name = 'Escribe tu nombre';
    }
    if (!validateWaflowPhone(state.phone, country)) {
      errs.phone = `Número de ${country.len} dígitos para ${country.name}`;
    }
    if (variant === 'A') {
      const hasContext =
        state.destinationChoice.trim() ||
        state.interests.length > 0 ||
        state.when !== 'Flexible';
      if (!hasContext) {
        errs.context = 'Cuéntanos algo: destino, fechas o un interés';
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const refPrefix = resolveRefPrefix(config);
    const ref = makeWaflowRef(refPrefix);

    const message = buildWaflowMessage({
      variant,
      name: state.name,
      country,
      phone: state.phone,
      destinationChoice: state.destinationChoice,
      destFull: config.destination?.name,
      when: state.when,
      adults: state.adults,
      children: state.children,
      interests: state.interests,
      adjust: state.adjust,
      pkgTitle: config.pkg?.title,
      pkgDays: config.pkg?.days ?? null,
      pkgNights: config.pkg?.nights ?? null,
      ref,
    });

    const url = buildWaflowUrl(businessNumber || country.code.replace('+', ''), message);

    try {
      await fetch('/api/waflow/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: state.sessionKey,
          subdomain,
          variant,
          step: 'confirmation',
          referenceCode: ref,
          submitted: true,
          payload: {
            name: state.name.trim(),
            email: state.email.trim() || null,
            phone: `${country.code}${state.phone.replace(/\D/g, '')}`,
            country: country.c,
            when: state.when,
            adults: state.adults,
            children: state.children,
            interests: state.interests,
            adjust: state.adjust,
            notes: state.notes || null,
            destinationSlug: config.destination?.slug ?? null,
            destinationName: config.destination?.name ?? null,
            packageSlug: config.pkg?.slug ?? null,
            packageTitle: config.pkg?.title ?? null,
            packageTier: config.pkg?.tier ?? null,
          },
        }),
      });
    } catch {
      // Swallow — we still want to redirect to WhatsApp even if the lead
      // upsert failed. The client has the URL already.
    }

    patch({
      referenceCode: ref,
      whatsappUrl: url,
      whatsappMessage: message,
    });
    setLoading(false);
    setStep('confirmation');

    // Auto-open WhatsApp in a new tab after a short beat. The user can
    // always click the button again from the confirmation step.
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.open(url, '_blank', 'noopener');
      }, 450);
    }
  }, [
    businessNumber,
    config,
    country,
    patch,
    setStep,
    state,
    subdomain,
    variant,
  ]);

  const phoneFmt = state.phone.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ').trim();

  return (
    <div className="waf-body">
      <div className="waf-field">
        <label className="waf-label" htmlFor="waf-name">
          <span>Tu nombre</span>
          <span className="req">Requerido</span>
        </label>
        <div className={`waf-input-wrap${errors.name ? ' error' : ''}`}>
          <input
            id="waf-name"
            className="waf-input"
            type="text"
            value={state.name}
            onChange={(e) => {
              patch({ name: e.target.value });
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="Juan Pérez"
            autoComplete="given-name"
          />
        </div>
        {errors.name ? <div className="waf-error-msg">{errors.name}</div> : null}
      </div>

      <div className="waf-field">
        <label className="waf-label" htmlFor="waf-phone">
          <span>Tu WhatsApp</span>
          <span className="req">Requerido</span>
        </label>
        <div className={`waf-input-wrap${errors.phone ? ' error' : ''}`}>
          <span className="waf-prefix" aria-hidden="true">
            <span className="flag">{country.flag}</span>
            <span>{country.code}</span>
          </span>
          <input
            id="waf-phone"
            className="waf-input"
            type="tel"
            value={phoneFmt}
            onChange={(e) => {
              patch({ phone: e.target.value });
              if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
            }}
            placeholder={country.c === 'CO' ? '300 123 4567' : 'número'}
            inputMode="numeric"
            autoComplete="tel"
          />
        </div>
        {errors.phone ? <div className="waf-error-msg">{errors.phone}</div> : null}
      </div>

      <div className="waf-field">
        <label className="waf-label" htmlFor="waf-email">
          <span>Email</span>
          <span className="opt">Opcional</span>
        </label>
        <div className="waf-input-wrap">
          <input
            id="waf-email"
            className="waf-input"
            type="email"
            value={state.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>
      </div>

      {errors.context ? (
        <div className="waf-error-msg" style={{ marginTop: -10, marginBottom: 12 }}>
          {errors.context}
        </div>
      ) : null}

      <div className="waf-step-nav">
        {prev ? (
          <button
            type="button"
            className="waf-btn-secondary"
            onClick={() => setStep(prev)}
            disabled={loading}
          >
            Atrás
          </button>
        ) : null}
        <button
          type="button"
          className="waf-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Enviando…' : submitLabel}
        </button>
      </div>
      <div className="waf-privacy">
        Tu número se usa solo para este viaje. Sin spam. Sin llamadas automáticas.
      </div>
    </div>
  );
}
