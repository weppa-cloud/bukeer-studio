'use client';

/**
 * editorial-v1 WAFlow — Step: Confirmation.
 *
 * Success screen — renders the pre-constructed WhatsApp message for
 * inspection + an "Abrir WhatsApp" fallback button (in case the auto-open
 * popup was blocked). Mirrors designer `step === "success"` markup.
 */

import { Icons } from '../../primitives/icons';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { useWaflow, useWaflowApi } from '../provider';

export function WaflowStepConfirmation() {
  const { close, responseTime, locale } = useWaflow();
  const { state } = useWaflowApi();
  const text = getPublicUiExtraTextGetter(locale);

  const url = state.whatsappUrl || '#';
  const message = state.whatsappMessage || '';
  const ref = state.referenceCode || '';

  return (
    <div className="waf-success">
      <div className="waf-success-ic" aria-hidden="true">
        <Icons.check size={34} />
      </div>
      <h3>{text('waflowConfirmationTitle')}</h3>
      <p>
        {text('waflowConfirmationBodyPrefix')} {responseTime}{' '}
        {text('waflowConfirmationBodySuffix')}
      </p>
      {message ? <div className="waf-success-preview">{message}</div> : null}
      <div className="waf-success-actions">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa"
          onClick={() => trackEvent('whatsapp_cta_click', {
            location_context: 'waflow_confirmation',
            reference_code: ref,
            variant: state.variant,
          })}
        >
          <Icons.whatsapp size={16} /> {text('waflowOpenWhatsapp')}
        </a>
        <button type="button" className="btn-sec" onClick={close}>
          {text('waflowKeepExploring')}
        </button>
      </div>
      {ref ? (
        <div className="waf-ref-badge">
          {text('waflowRefLabel')} <b>{ref}</b>
        </div>
      ) : null}
    </div>
  );
}
