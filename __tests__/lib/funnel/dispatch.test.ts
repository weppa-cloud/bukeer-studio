import { triggerDispatch } from '@/lib/funnel/dispatch';

describe('lib/funnel/dispatch — triggerDispatch', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('returns a no-op result when FUNNEL_DISPATCH_SYNC is unset', async () => {
    delete process.env.FUNNEL_DISPATCH_SYNC;
    const fetchSpy = jest.fn();
    const result = await triggerDispatch('event-123', { fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(result).toEqual({ invoked: false, reason: 'env_disabled' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a no-op result when FUNNEL_DISPATCH_SYNC=false', async () => {
    process.env.FUNNEL_DISPATCH_SYNC = 'false';
    const fetchSpy = jest.fn();
    const result = await triggerDispatch('event-123', { fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(result.invoked).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('invokes fetch with the dispatch-funnel-event URL when sync mode is forced', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ dispatched: 1, skipped: 0, failed: 0 }),
    });

    const result = await triggerDispatch('event-abc', {
      forceSync: true,
      endpoint: 'https://stub.functions.supabase.co/dispatch-funnel-event',
      serviceRoleKey: 'test-key',
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(result).toEqual({ invoked: true, reason: 'invoked', status: 200 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://stub.functions.supabase.co/dispatch-funnel-event');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
    });
    expect(JSON.parse(init.body)).toEqual({ funnel_event_id: 'event-abc' });
  });

  it('returns missing_config when forceSync but no endpoint/key configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = jest.fn();
    const result = await triggerDispatch('event-xyz', {
      forceSync: true,
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    expect(result).toEqual({ invoked: false, reason: 'missing_config' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('captures fetch errors and returns a structured result', async () => {
    const fetchSpy = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await triggerDispatch('event-err', {
      forceSync: true,
      endpoint: 'https://stub.functions.supabase.co/dispatch-funnel-event',
      serviceRoleKey: 'test-key',
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    expect(result.invoked).toBe(false);
    expect(result.reason).toBe('fetch_error');
    expect(result.error).toBe('network down');
  });
});
