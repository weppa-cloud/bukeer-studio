jest.mock('@/lib/seo/server-auth', () => ({
  requireWebsiteAccess: jest.fn().mockResolvedValue({
    accountId: 'acc-1',
    userId: 'user-1',
  }),
}));

jest.mock('@/lib/supabase/service-role', () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/seo/transcreate-workflow', () => ({
  applyTranscreateJob: jest.fn(),
  reviewTranscreateJob: jest.fn(),
}));

jest.mock('@/lib/features/transcreate-v2', () => ({
  resolveTranscreateV2Flag: jest.fn(),
  isTranscreateV2EnabledForLocale: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { applyTranscreateJob, reviewTranscreateJob } from '@/lib/seo/transcreate-workflow';
import {
  isTranscreateV2EnabledForLocale,
  resolveTranscreateV2Flag,
} from '@/lib/features/transcreate-v2';

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

function buildAdminMock(targetLocaleByJob: Array<{ id: string; target_locale: string }>) {
  const jobsLookup = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: targetLocaleByJob,
      error: null,
    }),
  };

  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'seo_transcreation_jobs') return jobsLookup;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('/api/seo/translations/bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards selected fields to apply workflow', async () => {
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(
      buildAdminMock([{ id: '11111111-1111-4111-8111-111111111111', target_locale: 'en-US' }]),
    );
    (resolveTranscreateV2Flag as jest.Mock).mockResolvedValue({ enabled: true, locales: ['en-US'] });
    (isTranscreateV2EnabledForLocale as jest.Mock).mockReturnValue(true);
    (applyTranscreateJob as jest.Mock).mockResolvedValue({
      ok: true,
      job: {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'applied',
        updatedAt: new Date().toISOString(),
      },
    });

    const mod = await import('@/app/api/seo/translations/bulk/route');
    const response = await mod.POST(
      request({
        websiteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        jobIds: ['11111111-1111-4111-8111-111111111111'],
        action: 'apply',
        fields: ['meta_title', 'faq', 'hero_subtitle'],
      }),
    );

    expect(response.status).toBe(200);
    expect(resolveTranscreateV2Flag).toHaveBeenCalledWith(
      expect.anything(),
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'en-US',
    );
    expect(applyTranscreateJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: '11111111-1111-4111-8111-111111111111',
        fullContractEnabled: true,
        selectedFields: ['meta_title', 'faq', 'hero_subtitle'],
      }),
    );
  });

  it('runs review action without apply workflow', async () => {
    (createSupabaseServiceRoleClient as jest.Mock).mockReturnValue(buildAdminMock([]));
    (reviewTranscreateJob as jest.Mock).mockResolvedValue({
      ok: true,
      job: {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'reviewed',
        updatedAt: new Date().toISOString(),
      },
    });

    const mod = await import('@/app/api/seo/translations/bulk/route');
    const response = await mod.POST(
      request({
        websiteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        jobIds: ['11111111-1111-4111-8111-111111111111'],
        action: 'review',
      }),
    );

    expect(response.status).toBe(200);
    expect(reviewTranscreateJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: '11111111-1111-4111-8111-111111111111',
      }),
    );
    expect(applyTranscreateJob).not.toHaveBeenCalled();
    expect(resolveTranscreateV2Flag).not.toHaveBeenCalled();
  });
});
