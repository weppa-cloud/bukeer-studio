'use client';

/**
 * editorial-v1 WAFlow — Step: Dates.
 *
 * "¿Cuándo te gustaría viajar?" chip picker. All variants.
 * Next step is always `party`.
 */

import { useWaflowApi } from '../provider';
import { WAFLOW_STEP_ORDER, WAFLOW_WHEN_OPTIONS } from '../types';
import type { WaflowVariant } from '../types';

export interface WaflowStepDatesProps {
  variant: WaflowVariant;
}

export function WaflowStepDates({ variant }: WaflowStepDatesProps) {
  const { state, patch, setStep } = useWaflowApi();
  const order = WAFLOW_STEP_ORDER[variant];
  const idx = order.indexOf('dates');
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = order[idx + 1] ?? 'contact';

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
