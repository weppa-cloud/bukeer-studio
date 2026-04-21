'use client';

/**
 * editorial-v1 WAFlow — Step: Country.
 *
 * Country picker that drives the phone-input prefix + the validation
 * length (different per-ISO). All variants.
 */

import { useWaflowApi } from '../provider';
import { WAFLOW_COUNTRIES, WAFLOW_STEP_ORDER } from '../types';
import type { WaflowVariant } from '../types';

export interface WaflowStepCountryProps {
  variant: WaflowVariant;
}

export function WaflowStepCountry({ variant }: WaflowStepCountryProps) {
  const { state, patch, setStep } = useWaflowApi();

  const order = WAFLOW_STEP_ORDER[variant];
  const idx = order.indexOf('country');
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = order[idx + 1] ?? 'contact';

  return (
    <div className="waf-body">
      <div className="waf-field">
        <label className="waf-label" htmlFor="waf-country-select">
          <span>¿Desde dónde nos escribes?</span>
        </label>
        <select
          id="waf-country-select"
          className="waf-select"
          value={state.countryCode}
          onChange={(e) => patch({ countryCode: e.target.value, phone: '' })}
        >
          {WAFLOW_COUNTRIES.map((cn) => (
            <option key={cn.c} value={cn.c}>
              {cn.flag} {cn.name} ({cn.code})
            </option>
          ))}
        </select>
      </div>

      <div className="waf-step-nav">
        {prev ? (
          <button
            type="button"
            className="waf-btn-secondary"
            onClick={() => setStep(prev)}
          >
            Atrás
          </button>
        ) : null}
        <button
          type="button"
          className="waf-submit"
          onClick={() => setStep(next)}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
