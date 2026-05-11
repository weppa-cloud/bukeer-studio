import {
  buildPlatformGoalPlan,
  compileDesiredPlatformGoals,
} from '@/lib/growth/platform-goals/desired-state';
import type {
  EventDestinationMappingRow,
  PlatformGoalBindingRow,
  ProviderReadiness,
} from '@/lib/growth/platform-goals/types';

const accountId = '9fc24733-b127-4184-aa22-12f03b98927a';
const websiteId = '894545b7-73ca-4dae-b76a-da5b6a3f8441';

const providers: Record<string, ProviderReadiness> = {
  google_ads: {
    destination: 'google_ads',
    connected: true,
    platformAccountId: '1261189646',
  },
  ga4: {
    destination: 'ga4',
    connected: true,
    platformAccountId: '294486074',
  },
  meta: {
    destination: 'meta',
    connected: false,
    platformAccountId: '361881980826384',
    reason: 'missing_meta_pixel_or_capi_token',
  },
};

const mappings: EventDestinationMappingRow[] = [
  {
    funnel_event_name: 'waflow_submit',
    destination: 'google_ads',
    destination_event_name: 'waflow_submit',
    value_field: null,
    enabled: true,
  },
  {
    funnel_event_name: 'crm_booking_confirmed',
    destination: 'google_ads',
    destination_event_name: 'booking_confirmed',
    value_field: 'value_amount',
    enabled: true,
  },
  {
    funnel_event_name: 'waflow_abandon',
    destination: 'ga4',
    destination_event_name: 'waflow_abandon',
    value_field: null,
    enabled: true,
  },
  {
    funnel_event_name: 'waflow_submit',
    destination: 'meta',
    destination_event_name: 'Lead',
    value_field: null,
    enabled: true,
  },
];

describe('platform goal desired state', () => {
  it('compiles canonical mapping rows into tenant platform goals', () => {
    const desired = compileDesiredPlatformGoals({
      accountId,
      websiteId,
      mappings,
      providers,
    });

    expect(desired).toHaveLength(4);
    expect(desired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalEventName: 'waflow_submit',
          destination: 'google_ads',
          platformGoalName: 'Bukeer waflow_submit',
          desiredStatus: 'primary',
        }),
        expect.objectContaining({
          canonicalEventName: 'waflow_abandon',
          destination: 'ga4',
          desiredStatus: 'diagnostic',
        }),
      ]),
    );
  });

  it('plans create/update/blocked work from bindings and provider readiness', () => {
    const desired = compileDesiredPlatformGoals({
      accountId,
      websiteId,
      mappings,
      providers,
    });
    const bindings: PlatformGoalBindingRow[] = [
      {
        id: 'binding-1',
        account_id: accountId,
        website_id: websiteId,
        canonical_event_name: 'waflow_submit',
        destination: 'google_ads',
        platform_account_id: '1261189646',
        platform_goal_id: '123',
        platform_goal_name: 'Bukeer waflow_submit',
        destination_event_name: 'waflow_submit',
        desired_status: 'secondary',
        live_status: 'secondary',
        sync_status: 'healthy',
        drift_reason: null,
      },
    ];

    const plan = buildPlatformGoalPlan({
      accountId,
      websiteId,
      desired,
      bindings,
      generatedAt: '2026-05-11T12:30:00.000Z',
    });

    expect(plan.summary).toMatchObject({
      desired: 4,
      create: 2,
      update: 1,
      blocked: 1,
    });
    expect(plan.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalEventName: 'waflow_submit',
          destination: 'google_ads',
          action: 'update',
          reason: 'desired_status_drift',
        }),
        expect.objectContaining({
          canonicalEventName: 'waflow_submit',
          destination: 'meta',
          action: 'blocked',
          reason: 'missing_meta_pixel_or_capi_token',
        }),
      ]),
    );
    expect(plan.planHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

