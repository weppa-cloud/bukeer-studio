'use client';

/**
 * editorial-v1 WAFlow — Step: Confirmation.
 *
 * Success screen — renders the pre-constructed WhatsApp message for
 * inspection + an "Abrir WhatsApp" fallback button (in case the auto-open
 * popup was blocked). Mirrors designer `step === "success"` markup.
 */

import { Icons } from '../../primitives/icons';
import { useWaflow, useWaflowApi } from '../provider';

export function WaflowStepConfirmation() {
  const { close, responseTime } = useWaflow();
  const { state } = useWaflowApi();

  const url = state.whatsappUrl || '#';
  const message = state.whatsappMessage || '';
  const ref = state.referenceCode || '';

  return (
    <div className="waf-success">
      <div className="waf-success-ic" aria-hidden="true">
        <Icons.check size={34} />
      </div>
      <h3>WhatsApp se abrió en una pestaña nueva.</h3>
      <p>
        Si no se abrió, toca el botón verde. Tu planner responde en promedio en{' '}
        {responseTime} y te escribe también desde nuestro lado.
      </p>
      {message ? <div className="waf-success-preview">{message}</div> : null}
      <div className="waf-success-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-wa">
          <Icons.whatsapp size={16} /> Abrir WhatsApp
        </a>
        <button type="button" className="btn-sec" onClick={close}>
          Seguir explorando
        </button>
      </div>
      {ref ? (
        <div className="waf-ref-badge">
          Ref: <b>{ref}</b>
        </div>
      ) : null}
    </div>
  );
}
