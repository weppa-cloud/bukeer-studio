/**
 * Tests for rate limiting logic.
 * Validates tier limits, daily cost caps, and cleanup.
 */

// Mock Supabase before imports
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

import { checkRateLimit, recordCost, cleanupStaleEntries } from '@/lib/ai/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMockChain(data: any = null) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      then: jest.fn(),
    };
    mockFrom.mockReturnValue(chain);
    return chain;
  }

  it('allows request when under limit', async () => {
    const chain = setupMockChain(null);
    // First call: check rate limit window (no existing entry)
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Second call (via .then): daily cost check
    chain.then.mockImplementationOnce((cb: any) =>
      cb({ data: [], error: null })
    );

    const result = await checkRateLimit('account-123', 'editor');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks request when rate exceeded', async () => {
    const chain = setupMockChain();
    const windowStart = new Date().toISOString();
    // Return existing entry at limit
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: 'r1', request_count: 20, window_start: windowStart },
      error: null,
    });

    const result = await checkRateLimit('account-123', 'editor');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Rate limit exceeded');
  });

  it('blocks when daily cost cap exceeded', async () => {
    const chain = setupMockChain();
    // Under request limit
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: 'r1', request_count: 1, window_start: new Date().toISOString() },
      error: null,
    });
    // Daily cost over cap
    chain.then.mockImplementationOnce((cb: any) =>
      cb({ data: [{ cost_usd: 3.0 }, { cost_usd: 2.5 }], error: null })
    );

    const result = await checkRateLimit('account-123', 'editor');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily cost cap');
  });

  it('uses correct limits for public tier', async () => {
    const chain = setupMockChain();
    const windowStart = new Date().toISOString();
    // 5 requests = public limit
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: 'r1', request_count: 5, window_start: windowStart },
      error: null,
    });

    const result = await checkRateLimit('ip:1.2.3.4', 'public');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('5 req/min');
  });
});

describe('recordCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates cost on existing entry', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'r1', cost_usd: 0.003 },
                error: null,
              }),
            }),
          }),
        }),
      }),
      update: updateMock,
    });

    await recordCost('account-123', 0.01);
    const calledWith = updateMock.mock.calls[0][0];
    expect(calledWith.cost_usd).toBeCloseTo(0.013, 6);
  });
});

describe('cleanupStaleEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes entries older than 48h', async () => {
    const selectMock = jest.fn().mockResolvedValue({
      data: [{ id: '1' }, { id: '2' }],
      error: null,
    });
    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: selectMock,
        }),
      }),
    });

    const count = await cleanupStaleEntries();
    expect(count).toBe(2);
    expect(mockFrom).toHaveBeenCalledWith('ai_rate_limits');
  });

  it('returns 0 when no stale entries', async () => {
    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const count = await cleanupStaleEntries();
    expect(count).toBe(0);
  });
});
