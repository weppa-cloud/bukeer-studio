jest.mock('@/lib/supabase/service-role', () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}));

import {
  buildDataForSeoAuthorityFallbackProfilePlan,
  buildDataForSeoHistoricalTrendProfilePlan,
  buildDataForSeoOnPageProfilePlan,
  buildDataForSeoSerpLabsProfilePlan,
  runDataForSeoProfile,
} from '@/lib/growth/dataforseo-client';
import {
  buildGscDateTrendQuery,
  buildGscIndexabilityHealthPlan,
  runGscIndexabilityHealth,
} from '@/lib/growth/gsc-client';
import {
  buildGa4AdminGovernancePlan,
  buildGa4BatchReportPlan,
  buildGa4PivotReportPlan,
  buildGa4RealtimeSmokePlan,
  runGa4ProviderPlan,
} from '@/lib/growth/ga4-client';
import {
  buildClarityAggregatePlan,
  runClarityAggregateProfile,
} from '@/lib/growth/clarity-client';

const scope = {
  account_id: 'acct_1',
  website_id: 'web_1',
};

describe('growth provider client profile helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('gates DataForSEO full, historical and broad paid profiles in dry-run mode', async () => {
    const onPageFull = buildDataForSeoOnPageProfilePlan({
      ...scope,
      target: 'https://example.com',
      mode: 'full',
    });

    expect(onPageFull.profileId).toBe('dfs_onpage_full_comparable_v3');
    expect(onPageFull.costMode).toBe('approval_required');
    expect(onPageFull.blockedReason).toContain('requires explicit approval');

    const run = await runDataForSeoProfile(onPageFull);
    expect(run.status).toBe('blocked');
    expect(global.fetch).not.toHaveBeenCalled();

    const historical = buildDataForSeoHistoricalTrendProfilePlan({
      ...scope,
      market: 'CO',
      keywords: ['colombia tours'],
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
    });
    expect(historical.profileId).toBe('dfs_historical_trends_v1');
    expect(historical.costMode).toBe('approval_required');

    const authority = buildDataForSeoAuthorityFallbackProfilePlan({
      ...scope,
      targetDomain: 'https://colombiatours.travel/',
      competitorDomains: ['competitor.example'],
    });
    expect(authority.endpoint).toContain('domain_intersection');
    expect(authority.body).toEqual([
      expect.objectContaining({
        target1: 'colombiatours.travel',
        targets: ['competitor.example'],
      }),
    ]);
  });

  it('builds bounded DataForSEO changed URL and SERP/Labs plans', () => {
    const changed = buildDataForSeoOnPageProfilePlan({
      ...scope,
      target: 'https://example.com',
      mode: 'changed',
      changedUrls: ['https://example.com/a', 'https://example.com/b'],
    });
    expect(changed.profileId).toBe('dfs_onpage_changed_urls_v1');
    expect(changed.body).toEqual([
      expect.objectContaining({
        max_crawl_pages: 2,
        start_url: 'https://example.com/a',
      }),
    ]);

    expect(() =>
      buildDataForSeoSerpLabsProfilePlan({
        ...scope,
        market: 'CO',
        tier: 'secondary',
        keywords: Array.from({ length: 51 }, (_, index) => `keyword ${index}`),
      }),
    ).toThrow('Keyword cap is 50');

    const serp = buildDataForSeoSerpLabsProfilePlan({
      ...scope,
      market: 'CO',
      tier: 'primary',
      keywords: ['viajes colombia'],
    });
    expect(serp.profileId).toBe('dfs_serp_labs_primary_v1');
    expect(serp.endpoint).toContain('keyword_ideas');
  });

  it('builds GSC date trends and URL Inspection health without network on dry-run', async () => {
    const trend = buildGscDateTrendQuery({
      ...scope,
      startDate: '2026-04-01',
      endDate: '2026-04-28',
      dimensions: ['page', 'device'],
    });
    expect(trend.dimensions).toEqual(['date', 'page', 'device']);

    const plan = buildGscIndexabilityHealthPlan({
      ...scope,
      urls: ['https://example.com/a'],
      includeSitemaps: true,
      includeSites: true,
    });
    const result = await runGscIndexabilityHealth(plan);
    expect(result.status).toBe('planned');
    expect(global.fetch).not.toHaveBeenCalled();

    expect(() =>
      buildGscIndexabilityHealthPlan({
        ...scope,
        urls: Array.from({ length: 51 }, (_, index) => `https://example.com/${index}`),
      }),
    ).toThrow('sample cap is 50');
  });

  it('builds GA4 admin, batch, pivot and realtime smoke plans with request caps', async () => {
    const admin = buildGa4AdminGovernancePlan(scope);
    expect(admin.checks).toEqual(['key_events', 'audiences', 'data_streams']);

    const batch = buildGa4BatchReportPlan({
      ...scope,
      requests: [
        {
          startDate: '2026-04-01',
          endDate: '2026-04-28',
          metrics: ['sessions'],
          dimensions: ['landingPagePlusQueryString'],
        },
      ],
    });
    expect(batch.profileId).toBe('ga4_batch_funnel_v1');

    const pivot = buildGa4PivotReportPlan({
      ...scope,
      startDate: '2026-04-01',
      endDate: '2026-04-28',
      metrics: ['sessions'],
      dimensions: ['sessionSourceMedium'],
      pivots: [{ fieldNames: ['sessionSourceMedium'], limit: 10 }],
    });
    expect(pivot.profileId).toBe('ga4_pivot_funnel_v1');

    const realtime = buildGa4RealtimeSmokePlan(scope);
    const run = await runGa4ProviderPlan(realtime);
    expect(run.status).toBe('planned');
    expect(global.fetch).not.toHaveBeenCalled();

    expect(() =>
      buildGa4BatchReportPlan({
        ...scope,
        requests: Array.from({ length: 6 }, () => ({
          startDate: '2026-04-01',
          endDate: '2026-04-28',
          metrics: ['sessions'],
        })),
      }),
    ).toThrow('batch request cap is 5');
  });

  it('enforces Clarity aggregate privacy and request-window constraints', async () => {
    const plan = buildClarityAggregatePlan({
      ...scope,
      numOfDays: 3,
      dimensions: ['url', 'device', 'source'],
    });
    expect(plan.profileId).toBe('clarity_ux_friction_v1');
    expect(plan.query.dimensions).toEqual(['url', 'device', 'source']);

    const result = await runClarityAggregateProfile(plan);
    expect(result.source).toBe('mock');
    expect(global.fetch).not.toHaveBeenCalled();

    expect(() =>
      buildClarityAggregatePlan({
        ...scope,
        numOfDays: 4,
        dimensions: ['url'],
      }),
    ).toThrow('1-3 days');

    expect(() =>
      buildClarityAggregatePlan({
        ...scope,
        numOfDays: 1,
        dimensions: ['url', 'device', 'country', 'source'],
      }),
    ).toThrow('1-3 values');

    expect(() =>
      buildClarityAggregatePlan({
        ...scope,
        numOfDays: 1,
        dimensions: ['url', 'email'],
      }),
    ).toThrow('non-PII');
  });
});
