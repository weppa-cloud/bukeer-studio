import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';

function buildSupabaseMock(result: { data: Array<{ created_at: string }>; count: number }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };

  return {
    from: jest.fn().mockReturnValue(chain),
  } as any;
}

describe('checkTranscreateRateLimit', () => {
  it('allows when below daily limit', async () => {
    const supabase = buildSupabaseMock({
      data: [
        { created_at: new Date(Date.now() - 1_000).toISOString() },
        { created_at: new Date(Date.now() - 2_000).toISOString() },
      ],
      count: 2,
    });

    const result = await checkTranscreateRateLimit('w1', 'en-US', supabase);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8);
    expect(result.resetAt instanceof Date).toBe(true);
  });

  it('blocks when daily limit reached and computes reset from first row', async () => {
    const first = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    const supabase = buildSupabaseMock({
      data: Array.from({ length: 10 }).map((_, i) => ({
        created_at: new Date(first.getTime() + i * 60_000).toISOString(),
      })),
      count: 10,
    });

    const result = await checkTranscreateRateLimit('w1', 'en-US', supabase);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt.toISOString()).toBe(
      new Date(first.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    );
  });
});
