'use client';

/**
 * editorial-v1 WAFlow — Step: Contact.
 *
 * Single-step capture — date preference + name + country code + phone.
 * On submit we POST to /api/waflow/lead and redirect to WhatsApp with
 * a prefilled message. The customer's phone stays in the lead record.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

import {
  WAFLOW_COUNTRIES,
  WAFLOW_WHEN_OPTIONS,
} from '../types';
import type { WaflowConfig, WaflowCountry, WaflowVariant } from '../types';
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

const FREQUENT_COUNTRY_CODES = ['CO', 'US', 'MX', 'ES', 'PA', 'EC', 'PE', 'CL'];

const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  US: ['usa', 'eeuu', 'ee.uu', 'estados unidos', 'united states', 'estados unidos de america'],
  GB: ['uk', 'reino unido', 'gran bretana', 'great britain', 'united kingdom', 'inglaterra'],
  MX: ['mexico', 'méxico'],
};

function normalizeCountrySearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+]+/gu, ' ')
    .trim();
}

function countrySearchText(country: WaflowCountry): string {
  const aliases = COUNTRY_ALIASES[country.c] ?? [];
  return normalizeCountrySearch([
    country.name,
    country.c,
    country.code,
    country.code.replace('+', ''),
    ...aliases,
  ].join(' '));
}

export function getWaflowCountryOptions(
  countries: readonly WaflowCountry[] = WAFLOW_COUNTRIES,
): WaflowCountry[] {
  const frequent = FREQUENT_COUNTRY_CODES
    .map((code) => countries.find((country) => country.c === code))
    .filter((country): country is WaflowCountry => Boolean(country));
  const frequentSet = new Set(frequent.map((country) => country.c));
  const rest = countries.filter((country) => !frequentSet.has(country.c));
  return [...frequent, ...rest];
}

export function filterWaflowCountries(
  query: string,
  countries: readonly WaflowCountry[] = getWaflowCountryOptions(),
): WaflowCountry[] {
  const normalized = normalizeCountrySearch(query);
  if (!normalized) return [...countries];
  return countries.filter((country) => countrySearchText(country).includes(normalized));
}

export function parseWaflowInternationalPhone(value: string): {
  countryCode: string;
  nationalNumber: string;
} | null {
  if (!value.trim().startsWith('+')) return null;
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.country) return null;
  return {
    countryCode: parsed.country,
    nationalNumber: parsed.nationalNumber,
  };
}

interface CountryPhoneComboboxProps {
  selected: WaflowCountry;
  onSelect: (country: WaflowCountry) => void;
  disabled?: boolean;
}

function CountryPhoneCombobox({ selected, onSelect, disabled }: CountryPhoneComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const countries = useMemo(() => getWaflowCountryOptions(), []);
  const filtered = useMemo(() => filterWaflowCountries(query, countries), [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div className="waf-country" ref={rootRef}>
      <button
        type="button"
        className="waf-country-trigger"
        aria-label={`Cambiar país, seleccionado ${selected.name} ${selected.code}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current);
          setQuery('');
        }}
        disabled={disabled}
      >
        <span className="waf-country-flag" aria-hidden="true">{selected.flag}</span>
        <span className="waf-country-name">{selected.name}</span>
        <span className="waf-country-code">{selected.code}</span>
        <span className="waf-country-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="waf-country-popover">
          <label className="sr-only" htmlFor="waf-country-search">
            Buscar país o indicativo
          </label>
          <input
            id="waf-country-search"
            ref={searchRef}
            className="waf-country-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar país o indicativo"
            autoComplete="off"
          />
          <div className="waf-country-list" role="listbox" aria-label="Países">
            {filtered.length > 0 ? (
              filtered.map((country) => (
                <button
                  key={country.c}
                  type="button"
                  className={`waf-country-option${country.c === selected.c ? ' selected' : ''}`}
                  role="option"
                  aria-selected={country.c === selected.c}
                  onClick={() => {
                    onSelect(country);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="waf-country-option-main">
                    <span aria-hidden="true">{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                  <span className="waf-country-option-code">{country.code}</span>
                </button>
              ))
            ) : (
              <div className="waf-country-empty">No encontramos ese país</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
      errs.phone = `Revisa el número para ${country.name} (${country.code}).`;
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

  const handlePhoneChange = useCallback(
    (value: string) => {
      const parsed = parseWaflowInternationalPhone(value);
      if (parsed) {
        patch({
          countryCode: parsed.countryCode,
          phone: parsed.nationalNumber,
        });
      } else {
        patch({ phone: value });
      }
      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
    },
    [errors.phone, patch],
  );

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
        <div className={`waf-input-wrap waf-phone-wrap${errors.phone ? ' error' : ''}`}>
          <CountryPhoneCombobox
            selected={country}
            onSelect={(nextCountry) => {
              patch({ countryCode: nextCountry.c });
              if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
            }}
            disabled={loading}
          />
          <input
            id="waf-phone"
            className="waf-input"
            type="tel"
            value={phoneFmt}
            onChange={(e) => handlePhoneChange(e.target.value)}
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
