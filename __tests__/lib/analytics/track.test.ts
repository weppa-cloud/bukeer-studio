import { trackEvent, safeTrack } from '@/lib/analytics/track';

/**
 * These tests run in the default jest `node` environment. We simulate a
 * browser by assigning a minimal `window` stub onto `globalThis` for the
 * duration of each test. Avoids pulling in `jest-environment-jsdom`.
 */

type GtagFn = (...args: unknown[]) => void;

interface MockWindow {
  gtag?: GtagFn;
  dataLayer?: unknown[];
}

function setWindow(stub: MockWindow | undefined) {
  if (stub === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = undefined;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      location: {
        href: 'https://demo.bukeer.com/current?x=1',
        pathname: '/current',
        search: '?x=1',
      },
      ...stub,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      title: 'Demo page',
      referrer: 'https://referrer.example/',
    };
  }
}

describe('trackEvent', () => {
  let gtagMock: jest.Mock;
  let windowStub: MockWindow;

  beforeEach(() => {
    gtagMock = jest.fn();
    windowStub = { gtag: gtagMock, dataLayer: [] };
    setWindow(windowStub);
  });

  afterEach(() => {
    setWindow(undefined);
  });

  it('invokes window.gtag with event name and params when available', () => {
    trackEvent('whatsapp_cta_click', {
      product_id: 'p1',
      product_type: 'activity',
      product_name: 'City Tour',
      tenant_subdomain: 'demo',
      location_context: 'hero',
    });

    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'whatsapp_cta_click',
      expect.objectContaining({
        product_id: 'p1',
        product_type: 'activity',
        product_name: 'City Tour',
        tenant_subdomain: 'demo',
        location_context: 'hero',
        page_path: '/current?x=1',
      }),
    );
  });

  it('strips null and undefined values before dispatching', () => {
    trackEvent('cal_booking_click', {
      product_id: 'p1',
      tenant_subdomain: null,
      location_context: undefined,
      active: true,
    });

    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'cal_booking_click',
      expect.objectContaining({
        product_id: 'p1',
        active: true,
      }),
    );
  });

  it('falls back to dataLayer.push when gtag is absent', () => {
    const dataLayer: unknown[] = [];
    setWindow({ dataLayer });

    trackEvent('whatsapp_cta_click', { product_id: 'p2' });

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual(expect.objectContaining({
      event: 'whatsapp_cta_click',
      product_id: 'p2',
      page_path: '/current?x=1',
    }));
  });

  it('never throws when gtag throws internally', () => {
    setWindow({
      gtag: () => {
        throw new Error('boom');
      },
    });

    expect(() => trackEvent('whatsapp_cta_click', { product_id: 'p1' })).not.toThrow();
  });

  it('is safe when params are omitted entirely', () => {
    expect(() => trackEvent('whatsapp_cta_click')).not.toThrow();
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'whatsapp_cta_click',
      expect.objectContaining({ page_path: '/current?x=1' }),
    );
  });

  describe('safeTrack', () => {
    it('returns a handler that fires the event when invoked', () => {
      const handler = safeTrack('phone_cta_click', { product_id: 'p3' });
      expect(gtagMock).not.toHaveBeenCalled();
      handler();
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'phone_cta_click',
        expect.objectContaining({ product_id: 'p3' }),
      );
    });
  });
});

describe('trackEvent — SSR safety', () => {
  it('is a no-op and does not throw when window is undefined', () => {
    setWindow(undefined);
    expect(() => trackEvent('whatsapp_cta_click', { product_id: 'p1' })).not.toThrow();
  });
});
