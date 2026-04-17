jest.mock('@/lib/seo/server-auth', () => ({
  requireWebsiteAccess: jest.fn().mockResolvedValue({
    accountId: 'acc-1',
    userId: 'user-1',
  }),
}));

jest.mock('@/lib/supabase/service-role', () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/seo/decision-grade-sync', () => ({
  enqueueDecisionGradeSync: jest.fn().mockResolvedValue({ requestId: null }),
}));

jest.mock('@/lib/ai/llm-provider', () => ({
  getEditorModel: jest.fn().mockReturnValue('mock-model'),
}));

jest.mock('@/lib/seo/transcreate-workflow', () => ({
  collectSourceFieldsForPage: jest.fn(),
  prepareDraftWithTM: jest.fn(),
}));

jest.mock('@/lib/seo/transcreate-rate-limit', () => ({
  checkTranscreateRateLimit: jest.fn(),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { collectSourceFieldsForPage, prepareDraftWithTM } from '@/lib/seo/transcreate-workflow';
import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

function mockKeywordCandidatesAdmin() {
  const keywordQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'cand-1',
          keyword: 'cartagena tours',
          seasonality_status: 'stable',
          serp_top_competitors: [],
          source: 'seo_keyword_candidates.live',
          fetched_at: new Date().toISOString(),
          confidence: 'live',
          decision_grade_ready: true,
          priority_score: 100,
        },
      ],
      error: null,
    }),
  };

  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'seo_keyword_candidates') return keywordQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

describe('/api/seo/content-intelligence/transcreate/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns TM-derived output and skips LLM when TM coverage is exact', async () => {
    const admin = mockKeywordCandidatesAdmin();
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(admin);
    (collectSourceFieldsForPage as jest.Mock).mockResolvedValue({
      title: 'Paquete Caribe',
      seoTitle: 'Paquete Caribe 5 días',
    });
    (prepareDraftWithTM as jest.Mock).mockResolvedValue({
      payload: {
        title: 'Caribbean Package',
        seoTitle: 'Best Caribbean Package',
        seoDescription: 'Discover the best package in the Caribbean.',
        targetKeyword: 'caribbean package',
      },
      tmHits: [
        { field: 'title', similarity: 1, sourceText: 'Paquete Caribe', targetText: 'Caribbean Package' },
        { field: 'seoTitle', similarity: 1, sourceText: 'Paquete Caribe 5 días', targetText: 'Best Caribbean Package' },
      ],
      glossaryPromptBlock: '',
    });

    const mod = await import('@/app/api/seo/content-intelligence/transcreate/stream/route');
    const response = await mod.POST(
      request({
        websiteId: '11111111-1111-4111-8111-111111111111',
        sourceContentId: '22222222-2222-4222-8222-222222222222',
        pageType: 'package',
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        sourceKeyword: 'paquete caribe',
      }),
    );

    const text = await response.text();
    const parsed = JSON.parse(text);
    expect(response.status).toBe(200);
    expect(parsed.meta_title).toBeDefined();
    expect(streamText).not.toHaveBeenCalled();
  });

  it('calls streamText when TM coverage is incomplete', async () => {
    const admin = mockKeywordCandidatesAdmin();
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(admin);
    (collectSourceFieldsForPage as jest.Mock).mockResolvedValue({
      title: 'Paquete Caribe',
      seoTitle: 'Paquete Caribe 5 días',
    });
    (prepareDraftWithTM as jest.Mock).mockResolvedValue({
      payload: {},
      tmHits: [{ field: 'title', similarity: 0.8, sourceText: 'Paquete Caribe', targetText: 'Caribbean Package' }],
      glossaryPromptBlock: 'Bukeer -> Bukeer',
    });
    (checkTranscreateRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date(Date.now() + 60_000),
    });
    (streamText as jest.Mock).mockReturnValue({
      toTextStreamResponse: () =>
        new Response('{"meta_title":"A","meta_desc":"B","slug":"a","h1":"A","keywords":["a"]}'),
    });

    const mod = await import('@/app/api/seo/content-intelligence/transcreate/stream/route');
    const response = await mod.POST(
      request({
        websiteId: '11111111-1111-4111-8111-111111111111',
        sourceContentId: '22222222-2222-4222-8222-222222222222',
        pageType: 'package',
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        sourceKeyword: 'paquete caribe',
      }),
    );

    expect(response.status).toBe(200);
    expect(streamText).toHaveBeenCalled();
  });
});
