'use client';

/**
 * editorial-v1 WAFlow — Step: Party (adults + children).
 *
 * Stepper controls bounded 1..20 adults, 0..12 children.
 */

import { useWaflowApi } from '../provider';
import { WAFLOW_STEP_ORDER } from '../types';
import type { WaflowVariant } from '../types';

export interface WaflowStepPartyProps {
  variant: WaflowVariant;
}

export function WaflowStepParty({ variant }: WaflowStepPartyProps) {
  const { state, patch, setStep } = useWaflowApi();
  const order = WAFLOW_STEP_ORDER[variant];
  const idx = order.indexOf('party');
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = order[idx + 1] ?? 'contact';

  return (
    <div className="waf-body">
      <div className="waf-field">
        <label className="waf-label">
          <span>¿Cuántos viajeros?</span>
        </label>
        <div className="waf-stepper-row">
          <div className="waf-stepper">
            <div className="waf-stepper-label">
              <b>Adultos</b>
              <small>13+ años</small>
            </div>
            <div className="waf-stepper-controls">
              <button
                type="button"
                className="waf-stepper-btn"
                onClick={() => patch({ adults: Math.max(1, state.adults - 1) })}
                disabled={state.adults <= 1}
                aria-label="Menos adultos"
              >
                −
              </button>
              <span className="waf-stepper-val" aria-live="polite">
                {state.adults}
              </span>
              <button
                type="button"
                className="waf-stepper-btn"
                onClick={() => patch({ adults: Math.min(20, state.adults + 1) })}
                aria-label="Más adultos"
              >
                +
              </button>
            </div>
          </div>

          <div className="waf-stepper">
            <div className="waf-stepper-label">
              <b>Niños</b>
              <small>0–12 años</small>
            </div>
            <div className="waf-stepper-controls">
              <button
                type="button"
                className="waf-stepper-btn"
                onClick={() =>
                  patch({ children: Math.max(0, state.children - 1) })
                }
                disabled={state.children <= 0}
                aria-label="Menos niños"
              >
                −
              </button>
              <span className="waf-stepper-val" aria-live="polite">
                {state.children}
              </span>
              <button
                type="button"
                className="waf-stepper-btn"
                onClick={() =>
                  patch({ children: Math.min(12, state.children + 1) })
                }
                aria-label="Más niños"
              >
                +
              </button>
            </div>
          </div>
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
