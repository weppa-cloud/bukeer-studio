'use client';

/**
 * editorial-v1 WAFlow — Step: Contact.
 *
 * Single-step capture — date preference + name + country code + phone.
 * On submit we POST to /api/waflow/lead and redirect to WhatsApp with
 * a prefilled message that includes source URL + normalized phone.
 */

import { useCallback, useMemo, useState } from 'react';

import {
  WAFLOW_COUNTRIES,
  WAFLOW_WHEN_OPTIONS,
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

type ContactErrors = Partial<Record<'name' | 'phone', string>>;

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
      errs.phone = `Número inválido para ${country.name}. Revisa indicativo y número.`;
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const refPrefix = resolveRefPrefix(config);
    const ref = makeWaflowRef(refPrefix);
    const sourceUrl =
      typeof window !== 'undefined' ? window.location.href : null;

    const message = buildWaflowMessage({
      variant,
      name: state.name,
      country,
      phone: state.phone,
      destinationChoice: state.destinationChoice,
      destFull: config.destination?.name,
      when: state.when,
      pkgTitle: config.pkg?.title,
      pkgDays: config.pkg?.days ?? null,
      pkgNights: config.pkg?.nights ?? null,
      adults: state.adults,
      children: state.children,
      notes: state.notes,
      sourceUrl,
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
            phone: `${country.code}${state.phone.replace(/\D/g, '')}`,
            country: country.c,
            when: state.when,
            adults: state.adults,
            children: state.children,
            notes: state.notes || null,
            sourceUrl,
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
        <label className="waf-label">
          <span>¿Cuándo te gustaría viajar?</span>
          <span className="opt">Aprox</span>
        </label>
        <div className="waf-chip-row">
          {WAFLOW_WHEN_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              className={`waf-chip compact${state.when === w ? ' on' : ''}`}
              onClick={() => patch({ when: w })}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

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
          <select
            id="waf-country-inline"
            className="waf-prefix-select"
            value={state.countryCode}
            onChange={(e) => patch({ countryCode: e.target.value, phone: '' })}
            aria-label="Indicativo del país"
          >
            {WAFLOW_COUNTRIES.map((cn) => (
              <option key={cn.c} value={cn.c}>
                {cn.flag} {cn.code}
              </option>
            ))}
          </select>
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

      <div className="waf-step-nav">
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
