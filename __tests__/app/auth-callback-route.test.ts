import { NextRequest } from 'next/server';
import { GET } from '@/app/(auth)/callback/route';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

jest.mock('@/lib/supabase/server-client', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockCreateSupabaseServerClient =
  createSupabaseServerClient as jest.MockedFunction<
    typeof createSupabaseServerClient
  >;

function request(url: string) {
  return new NextRequest(url);
}

describe('/auth/callback redirect policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects external redirect targets after OAuth callback', async () => {
    const response = await GET(
      request('https://studio.bukeer.com/auth/callback?redirect=https://evil.example/phish'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://studio.bukeer.com/dashboard');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('exchanges the code and keeps internal redirects', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({ data: {}, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as never);

    const response = await GET(
      request(
        'https://studio.bukeer.com/auth/callback?code=oauth-code&redirect=/admin/products?tab=hotels',
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
    expect(response.headers.get('location')).toBe(
      'https://studio.bukeer.com/admin/products?tab=hotels',
    );
  });
});
