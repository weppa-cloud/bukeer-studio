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

jest.mock('@/lib/seo/transcreate-workflow', () => ({
  applyTranscreateJob: jest.fn(),
  reviewTranscreateJob: jest.fn(),
  prepareDraftWithTM: jest.fn(),
}));

jest.mock('@/lib/seo/transcreate-rate-limit', () => ({
  checkTranscreateRateLimit: jest.fn(),
}));

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { prepareDraftWithTM } from '@/lib/seo/transcreate-workflow';
import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';
import { NextRequest } from 'next/server';

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

function buildAdminMock(capture: { jobInsert?: Record<string, unknown> }) {
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

  const transcreateInsert = {
    insert: jest.fn().mockImplementation((payload: Record<string, unknown>) => {
      capture.jobInsert = payload;
      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'job-1',
              status: 'draft',
              source_locale: payload.source_locale,
              target_locale: payload.target_locale,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      };
    }),
  };

  const localizedVariants = {
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'seo_keyword_candidates') return keywordQuery;
      if (table === 'seo_transcreation_jobs') return transcreateInsert;
      if (table === 'seo_localized_variants') return localizedVariants;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('/api/seo/content-intelligence/transcreate create_draft with AI payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when aiOutput does not satisfy contract', async () => {
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(buildAdminMock({}));

    const mod = await import('@/app/api/seo/content-intelligence/transcreate/route');
    const response = await mod.POST(
      request({
        action: 'create_draft',
        websiteId: '11111111-1111-4111-8111-111111111111',
        sourceContentId: '22222222-2222-4222-8222-222222222222',
        pageType: 'package',
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        draftSource: 'ai',
        aiOutput: { meta_title: 'Missing required fields' },
      }),
    );

    expect(response.status).toBe(400);
  });

  it('maps AI output to dual payload and sets ai flags on insert', async () => {
    const capture: { jobInsert?: Record<string, unknown> } = {};
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(buildAdminMock(capture));
    (checkTranscreateRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date(Date.now() + 60_000),
    });
    (prepareDraftWithTM as jest.Mock).mockImplementation(async (input: { draft: Record<string, unknown> }) => ({
      payload: input.draft,
      tmHits: [],
      glossaryPromptBlock: '',
    }));

    const mod = await import('@/app/api/seo/content-intelligence/transcreate/route');
    const response = await mod.POST(
      request({
        action: 'create_draft',
        websiteId: '11111111-1111-4111-8111-111111111111',
        sourceContentId: '22222222-2222-4222-8222-222222222222',
        pageType: 'package',
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        sourceKeyword: 'paquete caribe',
        draftSource: 'ai',
        aiModel: 'openai/gpt-5',
        aiOutput: {
          meta_title: 'Best Caribbean Package',
          meta_desc: 'Explore the Caribbean with curated departures and local guides.',
          slug: 'best-caribbean-package',
          h1: 'Best Caribbean Package',
          keywords: ['caribbean package', 'colombia tours'],
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(checkTranscreateRateLimit).toHaveBeenCalled();
    expect(capture.jobInsert?.ai_generated).toBe(true);
    expect(capture.jobInsert?.ai_model).toBe('openai/gpt-5');
    expect(capture.jobInsert?.schema_version).toBe('2.0');
    expect(capture.jobInsert?.payload_v2).toBeDefined();

    const payload = capture.jobInsert?.payload as Record<string, unknown>;
    expect(payload.meta_title).toBe('Best Caribbean Package');
    expect(payload.meta_desc).toBeDefined();
    expect(payload.h1).toBe('Best Caribbean Package');
    expect(payload.schema_version).toBe('2.0');
    expect(payload.payload_v2).toBeDefined();
    expect(payload.seoTitle).toBe('Best Caribbean Package');
    expect(payload.seoDescription).toBeDefined();
    expect(payload.title).toBe('Best Caribbean Package');
    expect(payload.targetKeyword).toBe('caribbean package');
  });

  it('accepts keywords string by normalizing aiOutput before persistence', async () => {
    const capture: { jobInsert?: Record<string, unknown> } = {};
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(buildAdminMock(capture));
    (checkTranscreateRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date(Date.now() + 60_000),
    });
    (prepareDraftWithTM as jest.Mock).mockImplementation(async (input: { draft: Record<string, unknown> }) => ({
      payload: input.draft,
      tmHits: [],
      glossaryPromptBlock: '',
    }));

    const mod = await import('@/app/api/seo/content-intelligence/transcreate/route');
    const response = await mod.POST(
      request({
        action: 'create_draft',
        websiteId: '11111111-1111-4111-8111-111111111111',
        sourceContentId: '22222222-2222-4222-8222-222222222222',
        pageType: 'page',
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        draftSource: 'ai',
        sourceKeyword: 'cartagena 4 dias 3 noches',
        aiOutput: {
          meta_title: 'Cartagena 4 Days',
          meta_desc: 'Discover Cartagena in 4 days.',
          slug: 'cartagena-4-days',
          h1: 'Cartagena 4 Days',
          keywords: 'cartagena 4 days 3 nights',
        },
      }),
    );

    expect(response.status).toBe(200);
    const payload = capture.jobInsert?.payload as Record<string, unknown>;
    expect(payload.keywords).toEqual(['cartagena 4 days 3 nights']);
    expect(payload.targetKeyword).toBe('cartagena 4 days 3 nights');
    expect(capture.jobInsert?.schema_version).toBe('2.0');
    expect(capture.jobInsert?.payload_v2).toBeDefined();
  });
});
