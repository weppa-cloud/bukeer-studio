import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  BookingFormModal,
  submitBookingLead,
} from '@/components/site/booking/booking-form-modal';
import type { LeadInput } from '@bukeer/website-contract';

const baseProduct = { id: '11111111-1111-4111-8111-111111111111', name: 'Tour Cartagena', slug: 'tour-cartagena' };
const baseWebsite = {
  content: {
    contact: { phone: '+57 300 111 2222' },
    locale: 'es-CO',
  },
};

function validPayload(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    product_id: baseProduct.id,
    name: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '+57 300 555 0001',
    date: '2026-05-01',
    pax: 2,
    option_id: null,
    locale: 'es-CO',
    source: 'website_booking_form',
    utm: undefined,
    consent_tos: true,
    consent_privacy: true,
    ...overrides,
  };
}

describe('BookingFormModal', () => {
  it('renders the dialog header and required fields when open', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BookingFormModal, {
        open: true,
        onClose: () => undefined,
        product: baseProduct,
        website: baseWebsite,
        selectedDate: '2026-05-01',
        pax: 2,
        optionId: null,
      })
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('Reservar por WhatsApp');
    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="phone"');
    expect(markup).toContain('name="consent_tos"');
    expect(markup).toContain('name="consent_privacy"');
  });

  it('does not render when open=false', () => {
    const markup = renderToStaticMarkup(
      React.createElement(BookingFormModal, {
        open: false,
        onClose: () => undefined,
        product: baseProduct,
        website: baseWebsite,
        selectedDate: '2026-05-01',
        pax: 2,
        optionId: null,
      })
    );
    expect(markup).toBe('');
  });
});

describe('submitBookingLead', () => {
  it('returns validation errors for invalid payloads without hitting fetch', async () => {
    const fetchFn = jest.fn();
    const outcome = await submitBookingLead({
      payload: validPayload({ email: 'not-an-email' }),
      phone: '+57 300 111 2222',
      productName: 'Tour Cartagena',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(outcome.kind).toBe('validation');
    if (outcome.kind === 'validation') {
      expect(outcome.fieldErrors.email).toBeDefined();
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('POSTs to /api/leads with a JSON body containing the parsed payload', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ lead_id: 'abcd' }), { status: 200 })
    );

    await submitBookingLead({
      payload: validPayload(),
      phone: '+57 300 111 2222',
      productName: 'Tour Cartagena',
      fetchFn: fetchFn as unknown as typeof fetch,
      buildUrl: () => 'https://wa.me/573001112222?text=ok',
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/leads');
    expect(init.method).toBe('POST');
    expect(
      (init.headers as Record<string, string>)['Content-Type']
    ).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.product_id).toBe(baseProduct.id);
    expect(body.email).toBe('ana@example.com');
    expect(body.pax).toBe(2);
    expect(body.consent_tos).toBe(true);
  });

  it('returns ok + a WhatsApp url on 200 responses (ready for window.open)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ lead_id: 'lead-xyz' }), { status: 200 })
    );
    const waUrl = 'https://wa.me/573001112222?text=hola';

    const outcome = await submitBookingLead({
      payload: validPayload(),
      phone: '+57 300 111 2222',
      productName: 'Tour Cartagena',
      fetchFn: fetchFn as unknown as typeof fetch,
      buildUrl: () => waUrl,
    });

    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok') {
      expect(outcome.leadId).toBe('lead-xyz');
      expect(outcome.whatsappUrl).toBe(waUrl);
    }
  });

  it('returns rate_limit on 429 responses', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'rl' }), { status: 429 })
    );

    const outcome = await submitBookingLead({
      payload: validPayload(),
      phone: '+57 300 111 2222',
      productName: 'Tour Cartagena',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(outcome.kind).toBe('rate_limit');
  });
});
