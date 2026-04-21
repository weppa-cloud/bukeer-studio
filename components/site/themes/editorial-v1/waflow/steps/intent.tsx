'use client';

/**
 * editorial-v1 WAFlow — Step: Intent (Variant A only).
 *
 * Surfaces a short chip picker "¿Ya tienes un destino en mente?" that
 * pre-fills `destinationChoice` for the downstream message template.
 * Optional — the user can skip to dates without picking.
 *
 * Copy catalog: docs/editorial-v1/copy-catalog.md (section "WhatsApp Flow").
 */

import { useWaflowApi } from '../provider';

const DESTINATION_SUGGESTIONS = [
  'Cartagena',
  'Eje Cafetero',
  'Tayrona',
  'San Andrés',
  'Amazonas',
  'No sé aún',
];

export function WaflowStepIntent() {
  const { state, patch, setStep } = useWaflowApi();

  return (
    <div className="waf-body">
      <div className="waf-field">
        <label className="waf-label">
          <span>¿Ya tienes un destino en mente?</span>
          <span className="opt">Opcional</span>
        </label>
        <div className="waf-chips">
          {DESTINATION_SUGGESTIONS.map((d) => {
            const selected = state.destinationChoice === d;
            return (
              <button
                key={d}
                type="button"
                className={`waf-chip${selected ? ' on' : ''}`}
                onClick={() =>
                  patch({ destinationChoice: selected ? '' : d })
                }
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="waf-field">
        <button
          type="button"
          className="waf-submit"
          onClick={() => setStep('dates')}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
