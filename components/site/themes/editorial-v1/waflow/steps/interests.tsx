'use client';

/**
 * editorial-v1 WAFlow — Step: Interests (variants A + B only).
 *
 * Interest chip multi-select with max 3. For variant B the chip set is
 * the per-destination override (WAFLOW_DEST_INTERESTS) when the slug is
 * recognised; otherwise falls back to WAFLOW_BASE_INTERESTS.
 */

import { useWaflowApi } from '../provider';
import {
  WAFLOW_BASE_INTERESTS,
  WAFLOW_DEST_INTERESTS,
  WAFLOW_STEP_ORDER,
} from '../types';
import type { WaflowConfig, WaflowVariant } from '../types';

export interface WaflowStepInterestsProps {
  variant: WaflowVariant;
  config: WaflowConfig;
}

export function WaflowStepInterests({ variant, config }: WaflowStepInterestsProps) {
  const { state, patch, setStep } = useWaflowApi();

  const slug =
    variant === 'B'
      ? config.destination?.slug
      : variant === 'D'
        ? config.pkg?.destinationSlug
        : null;
  const chips =
    (slug && WAFLOW_DEST_INTERESTS[slug]) || WAFLOW_BASE_INTERESTS;

  const toggleInterest = (k: string) => {
    const current = state.interests;
    if (current.includes(k)) {
      patch({ interests: current.filter((x) => x !== k) });
      return;
    }
    if (current.length >= 3) return;
    patch({ interests: [...current, k] });
  };

  const order = WAFLOW_STEP_ORDER[variant];
  const idx = order.indexOf('interests');
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = order[idx + 1] ?? 'contact';

  return (
    <div className="waf-body">
      <div className="waf-field">
        <label className="waf-label">
          <span>
            ¿Qué te interesa?{' '}
            <span style={{ color: 'var(--c-muted)', fontWeight: 500 }}>(máx. 3)</span>
          </span>
          <span className="opt">Opcional</span>
        </label>
        <div className="waf-chips">
          {chips.map((t) => {
            const on = state.interests.includes(t);
            const disabled = !on && state.interests.length >= 3;
            return (
              <button
                key={t}
                type="button"
                className={`waf-chip${on ? ' on' : ''}`}
                onClick={() => toggleInterest(t)}
                disabled={disabled}
              >
                {t}
              </button>
            );
          })}
        </div>
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
