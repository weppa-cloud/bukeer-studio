import {
  buildMetaCapiRequest,
  buildMetaUserData,
  redactMetaProviderResponse,
  resolveMetaCapiConfig,
  sendMetaCapiRequest,
  sendMetaConversionEvent,
  sha256Hex,
} from '@/lib/meta/conversions-api';

describe('Meta Conversions API helpers', () => {
  beforeEach(() => {
    delete process.env.META_CHATWOOT_CONVERSIONS_ENABLED;
    delete process.env.META_PIXEL_ID;
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_API_VERSION;
    delete process.env.META_TEST_EVENT_CODE;
  });

  it('hashes normalized user data and preserves Meta browser identifiers', async () => {
    const userData = await buildMetaUserData({
      email: ' TEST@Example.COM ',
      phone: '+57 300 123 4567',
      firstName: ' Juan ',
      lastName: ' Pérez ',
      fbp: 'fb.1.1700000000.abc',
      fbc: 'fb.1.1700000123.FB123',
      clientIpAddress: '203.0.113.10',
      clientUserAgent: 'jest-agent',
    });

    expect(userData).toMatchObject({
      em: [await sha256Hex('test@example.com')],
      ph: [await sha256Hex('573001234567')],
      fn: [await sha256Hex('juan')],
      ln: [await sha256Hex('pérez')],
      fbp: 'fb.1.1700000000.abc',
      fbc: 'fb.1.1700000123.FB123',
      client_ip_address: '203.0.113.10',
      client_user_agent: 'jest-agent',
    });
  });

  it('builds a Meta CAPI request with event id, action source, custom data, and test code', async () => {
    const request = await buildMetaCapiRequest(
      {
        eventName: 'Lead',
        eventId: 'HOME-2504-ABCD:lead',
        eventTime: new Date('2026-04-25T12:00:00Z'),
        actionSource: 'website',
        eventSourceUrl: 'https://demo.bukeer.com/',
        userData: { email: 'lead@example.com' },
        customData: { content_name: 'Cartagena' },
      },
      { testEventCode: 'TEST123' },
    );

    expect(request).toMatchObject({
      test_event_code: 'TEST123',
      data: [
        {
          event_name: 'Lead',
          event_id: 'HOME-2504-ABCD:lead',
          event_time: 1777118400,
          action_source: 'website',
          event_source_url: 'https://demo.bukeer.com/',
          custom_data: { content_name: 'Cartagena' },
        },
      ],
    });
    expect(request.data[0].user_data.em).toEqual([await sha256Hex('lead@example.com')]);
  });

  it('adds messaging_channel at top level for business messaging events', async () => {
    const request = await buildMetaCapiRequest({
      eventName: 'ConversationContinued',
      eventId: 'HOME-2504-ABCD:chatwoot:ConversationContinued:123',
      eventTime: new Date('2026-04-25T12:00:00Z'),
      actionSource: 'business_messaging',
      messagingChannel: 'whatsapp',
      eventSourceUrl: 'https://demo.bukeer.com/',
      userData: { phone: '+57 300 123 4567' },
      customData: { reference_code: 'HOME-2504-ABCD' },
    });

    expect(request.data[0]).toMatchObject({
      event_name: 'ConversationContinued',
      event_id: 'HOME-2504-ABCD:chatwoot:ConversationContinued:123',
      action_source: 'business_messaging',
      messaging_channel: 'whatsapp',
      custom_data: { reference_code: 'HOME-2504-ABCD' },
    });
    expect(request.data[0].custom_data).not.toHaveProperty('messaging_channel');
  });

  it('resolves server-only Meta config from environment', () => {
    process.env.META_CHATWOOT_CONVERSIONS_ENABLED = 'true';
    process.env.META_PIXEL_ID = 'pixel-123';
    process.env.META_ACCESS_TOKEN = 'token-123';
    process.env.META_API_VERSION = 'v99.0';
    process.env.META_TEST_EVENT_CODE = 'TEST999';

    expect(resolveMetaCapiConfig()).toMatchObject({
      enabled: true,
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      apiVersion: 'v99.0',
      testEventCode: 'TEST999',
    });
  });

  it('redacts token-like keys from provider responses', () => {
    expect(
      redactMetaProviderResponse({
        events_received: 1,
        access_token: 'secret',
        nested: { token: 'secret-2', ok: true },
      }),
    ).toEqual({
      events_received: 1,
      access_token: '[redacted]',
      nested: { token: '[redacted]', ok: true },
    });
  });

  it('sends requests with direct fetch and redacts provider response body', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        events_received: 1,
        access_token: 'server-token',
      }),
    });
    const request = await buildMetaCapiRequest({
      eventName: 'Lead',
      eventId: 'HOME-2504-ABCD:lead',
      userData: {},
    });

    const response = await sendMetaCapiRequest(
      request,
      {
        enabled: true,
        pixelId: 'pixel-123',
        accessToken: 'server-token',
        apiVersion: 'v99.0',
        endpointBase: 'https://graph.example.test',
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.example.test/v99.0/pixel-123/events?access_token=server-token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(response).toEqual({
      ok: true,
      status: 200,
      body: {
        events_received: 1,
        access_token: '[redacted]',
      },
    });
  });

  it('skips conversion sends when config is disabled or incomplete', async () => {
    const fetchMock = jest.fn();

    const result = await sendMetaConversionEvent(
      {
        eventName: 'Lead',
        eventId: 'HOME-2504-ABCD:lead',
        userData: { email: 'lead@example.com' },
      },
      {
        config: { enabled: true, pixelId: null, accessToken: null },
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toContain('missing META_PIXEL_ID/META_ACCESS_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists a pending event log row and updates it after a successful send', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const updatedRows: Record<string, unknown>[] = [];

    const insertQuery = {
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'event-log-1' },
        error: null,
      }),
    };
    const updateQuery = {
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: null, error: null })),
    };
    const supabase = {
      from: jest.fn(() => ({
        insert: jest.fn((row: Record<string, unknown>) => {
          insertedRows.push(row);
          return insertQuery;
        }),
        update: jest.fn((row: Record<string, unknown>) => {
          updatedRows.push(row);
          return updateQuery;
        }),
      })),
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ events_received: 1 }),
    });

    const result = await sendMetaConversionEvent(
      {
        eventName: 'Lead',
        eventId: 'HOME-2504-ABCD:lead',
        eventTime: new Date('2026-04-25T12:00:00Z'),
        eventSourceUrl: 'https://demo.bukeer.com/',
        userData: { email: 'lead@example.com' },
        customData: { content_name: 'Cartagena' },
        accountId: '11111111-1111-1111-1111-111111111111',
        trace: { reference_code: 'HOME-2504-ABCD' },
      },
      {
        supabase,
        config: {
          enabled: true,
          pixelId: 'pixel-123',
          accessToken: 'server-token',
          endpointBase: 'https://graph.example.test',
        },
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    expect(result.status).toBe('sent');
    expect(insertedRows[0]).toMatchObject({
      provider: 'meta',
      event_name: 'Lead',
      event_id: 'HOME-2504-ABCD:lead',
      status: 'pending',
      account_id: '11111111-1111-1111-1111-111111111111',
      trace: {
        account_id: '11111111-1111-1111-1111-111111111111',
        reference_code: 'HOME-2504-ABCD',
      },
    });
    expect(updatedRows[0]).toMatchObject({
      status: 'sent',
      provider_response: { events_received: 1 },
      error: null,
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('provider', 'meta');
    expect(updateQuery.eq).toHaveBeenCalledWith('event_name', 'Lead');
    expect(updateQuery.eq).toHaveBeenCalledWith('event_id', 'HOME-2504-ABCD:lead');
  });
});
