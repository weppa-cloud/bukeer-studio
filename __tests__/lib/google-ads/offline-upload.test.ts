/**
 * F2 / EPIC #419 — Google Ads offline upload client unit tests.
 */

import {
  buildOfflineConversionRequest,
  buildUserIdentifiers,
  isGoogleAdsConfigured,
  redactGoogleAdsProviderResponse,
  resolveGoogleAdsConfig,
  sendOfflineConversionUpload,
  sha256Hex,
} from '@/lib/google-ads/offline-upload';

describe('Google Ads offline upload helpers', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_ADS_OFFLINE_UPLOAD_ENABLED;
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    delete process.env.GOOGLE_ADS_CUSTOMER_ID;
  });

  it('hashes email lowercased + trimmed and emits a FIRST_PARTY identifier', async () => {
    const ids = await buildUserIdentifiers({ email: '  TEST@Example.COM ' });
    expect(ids).toHaveLength(1);
    expect(ids[0].hashedEmail).toBe(await sha256Hex('test@example.com'));
    expect(ids[0].userIdentifierSource).toBe('FIRST_PARTY');
  });

  it('preserves leading + on phones (E.164) and strips other punctuation', async () => {
    const ids = await buildUserIdentifiers({ phone: '+57 (300) 123-4567' });
    expect(ids[0].hashedPhoneNumber).toBe(await sha256Hex('+573001234567'));
  });

  it('groups address fields under addressInfo and hashes name parts', async () => {
    const ids = await buildUserIdentifiers({
      firstName: 'Juan',
      lastName: 'Pérez',
      city: 'Bogota',
      countryCode: 'co',
    });
    expect(ids).toHaveLength(1);
    expect(ids[0].addressInfo).toEqual({
      hashedFirstName: await sha256Hex('juan'),
      hashedLastName: await sha256Hex('pérez'),
      city: 'Bogota',
      countryCode: 'CO',
    });
  });

  it('builds an upload request with the resource path and click id', async () => {
    const request = await buildOfflineConversionRequest(
      {
        gclid: 'TEST-GCLID-123',
        conversionActionId: '987654321',
        conversionDateTime: '2026-05-03T10:00:00-05:00',
        conversionValue: 1500,
        currencyCode: 'COP',
        orderId: 'booking-abc',
        userIdentifiers: { email: 'lead@example.com' },
      },
      { customerId: '1112223333' },
    );

    expect(request.customerId).toBe('1112223333');
    expect(request.conversions).toHaveLength(1);
    const c = request.conversions[0];
    expect(c.conversionAction).toBe(
      'customers/1112223333/conversionActions/987654321',
    );
    expect(c.gclid).toBe('TEST-GCLID-123');
    expect(c.conversionValue).toBe(1500);
    expect(c.currencyCode).toBe('COP');
    expect(c.orderId).toBe('booking-abc');
    expect(c.userIdentifiers).toBeDefined();
    expect(c.userIdentifiers![0].hashedEmail).toBe(
      await sha256Hex('lead@example.com'),
    );
  });

  it('isGoogleAdsConfigured requires enabled + dev token + customer id', () => {
    expect(
      isGoogleAdsConfigured(
        resolveGoogleAdsConfig({
          enabled: true,
          developerToken: 'tok',
          customerId: '123',
        }),
      ),
    ).toBe(true);
    expect(isGoogleAdsConfigured(resolveGoogleAdsConfig({ enabled: true }))).toBe(
      false,
    );
    expect(
      isGoogleAdsConfigured(
        resolveGoogleAdsConfig({
          enabled: false,
          developerToken: 'tok',
          customerId: '123',
        }),
      ),
    ).toBe(false);
  });

  it('redacts secret-looking keys in provider responses', () => {
    const redacted = redactGoogleAdsProviderResponse({
      results: [{ resourceName: 'x' }],
      developer_token: 'leak-me',
      nested: { access_token: 'also-leak' },
    });
    expect(redacted).toMatchObject({
      developer_token: '[redacted]',
      nested: { access_token: '[redacted]' },
    });
  });
});

describe('sendOfflineConversionUpload', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_ADS_OFFLINE_UPLOAD_ENABLED;
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_CUSTOMER_ID;
  });

  it('skips with no_click_id when none of gclid/gbraid/wbraid is present', async () => {
    const result = await sendOfflineConversionUpload({
      conversionActionId: '987654321',
      conversionDateTime: '2026-05-03T10:00:00-05:00',
    });
    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toBe('no_click_id');
  });

  it('skips when Google Ads is not configured (and never calls fetch)', async () => {
    const fetchImpl = jest.fn();
    const result = await sendOfflineConversionUpload(
      {
        gclid: 'G123',
        conversionActionId: '987654321',
        conversionDateTime: '2026-05-03T10:00:00-05:00',
      },
      {
        config: { enabled: false, customerId: '111', developerToken: 't' },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toMatch(/disabled or missing/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns sent (stubbed) when configured but no accessToken provided', async () => {
    const result = await sendOfflineConversionUpload(
      {
        gclid: 'G123',
        conversionActionId: '987654321',
        conversionDateTime: '2026-05-03T10:00:00-05:00',
      },
      {
        config: { enabled: true, customerId: '111', developerToken: 'tok' },
      },
    );
    expect(result.status).toBe('sent');
    expect(result.providerResponse?.status).toBe(202);
    expect(result.providerResponse?.body).toMatchObject({ stub: true });
  });

  it('calls fetch and returns sent on 200', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ resourceName: 'x' }] }),
      text: async () => '',
    } as unknown as Response);
    const result = await sendOfflineConversionUpload(
      {
        gclid: 'G123',
        conversionActionId: '987654321',
        conversionDateTime: '2026-05-03T10:00:00-05:00',
      },
      {
        config: {
          enabled: true,
          customerId: '111',
          developerToken: 'tok',
          loginCustomerId: '222',
        },
        fetchImpl: fetchImpl as unknown as typeof fetch,
        accessToken: 'oauth-bearer-token',
      },
    );
    expect(result.status).toBe('sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer oauth-bearer-token');
    expect(init.headers['developer-token']).toBe('tok');
    expect(init.headers['login-customer-id']).toBe('222');
  });

  it('returns failed with error message on non-2xx', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'bad request' } }),
      text: async () => '',
    } as unknown as Response);
    const result = await sendOfflineConversionUpload(
      {
        gclid: 'G123',
        conversionActionId: '987654321',
        conversionDateTime: '2026-05-03T10:00:00-05:00',
      },
      {
        config: { enabled: true, customerId: '111', developerToken: 'tok' },
        fetchImpl: fetchImpl as unknown as typeof fetch,
        accessToken: 'oauth',
      },
    );
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/HTTP 400/);
  });
});
