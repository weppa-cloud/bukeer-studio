import { z } from 'zod';
import {
  buildPlatformGoalPlan,
  compileDesiredPlatformGoals,
} from './desired-state';
import {
  isPlatformGoalDestination,
  type EventDestinationMappingRow,
  type PlatformGoalBindingRow,
  type PlatformGoalDestination,
  type PlatformGoalPlan,
  type ProviderReadiness,
} from './types';

type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export const PlatformGoalRequestSchema = z.object({
  website_id: z.string().uuid(),
  platforms: z
    .array(z.string())
    .optional()
    .default(['google_ads', 'ga4', 'meta', 'clarity'])
    .transform((values, ctx) => {
      const unique = [...new Set(values)];
      const invalid = unique.filter((value) => !isPlatformGoalDestination(value));
      if (invalid.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported platform(s): ${invalid.join(', ')}`,
        });
        return z.NEVER;
      }
      return unique as PlatformGoalDestination[];
    }),
});

export interface PlatformGoalTenantContext {
  accountId: string;
  websiteId: string;
}

interface SeoIntegrationRow {
  provider: string;
  status: string | null;
  property_id?: string | null;
  project_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface WebsiteAnalyticsRow {
  analytics?: Record<string, unknown> | null;
}

interface AccountChannelContractRow {
  config?: Record<string, unknown> | null;
  credentials_encrypted?: Record<string, unknown> | null;
  is_active?: boolean | null;
  service_channels?: { code?: string | null } | null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function providerConnected(status: string | null | undefined): boolean {
  return status === 'connected' || status === 'configured';
}

function googleAdsFromEnv(): ProviderReadiness {
  const customerId = readString(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const developerToken = readString(process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  return {
    destination: 'google_ads',
    connected: Boolean(customerId && developerToken),
    platformAccountId: customerId,
    reason: customerId && developerToken ? undefined : 'missing_google_ads_config',
  };
}

async function resolveProviderReadiness(input: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
}): Promise<Partial<Record<PlatformGoalDestination, ProviderReadiness>>> {
  const [integrationsResult, websiteResult, contractsResult] = await Promise.all([
    input.supabase
      .from('seo_integrations')
      .select('provider,status,property_id,project_id,metadata')
      .eq('website_id', input.websiteId)
      .in('provider', ['ga4', 'clarity']),
    input.supabase
      .from('websites')
      .select('analytics')
      .eq('id', input.websiteId)
      .maybeSingle(),
    input.supabase
      .from('account_channel_contracts')
      .select('config,credentials_encrypted,is_active,service_channels(code)')
      .eq('account_id', input.accountId)
      .eq('is_active', true),
  ]);

  const integrations = (integrationsResult.data ?? []) as SeoIntegrationRow[];
  const website = (websiteResult.data ?? null) as WebsiteAnalyticsRow | null;
  const contracts = (contractsResult.data ?? []) as AccountChannelContractRow[];
  const byProvider = new Map(integrations.map((row) => [row.provider, row]));

  const ga4 = byProvider.get('ga4');
  const clarity = byProvider.get('clarity');
  const metaContract = contracts.find((row) => row.service_channels?.code === 'meta_capi');
  const analytics = website?.analytics ?? {};
  const pixelId =
    readString(analytics.facebook_pixel_id) ??
    readString(metaContract?.config?.pixel_id) ??
    readString(metaContract?.config?.facebook_pixel_id);
  const hasMetaToken = Boolean(
    readString(metaContract?.credentials_encrypted?.meta_access_token) ??
      readString(metaContract?.credentials_encrypted?.access_token) ??
      readString(metaContract?.credentials_encrypted?.conversions_api_access_token),
  );

  return {
    google_ads: googleAdsFromEnv(),
    ga4: {
      destination: 'ga4',
      connected: Boolean(ga4 && providerConnected(ga4.status) && ga4.property_id),
      platformAccountId: ga4?.property_id ?? null,
      reason: ga4?.property_id ? undefined : 'missing_ga4_property',
    },
    clarity: {
      destination: 'clarity',
      connected: Boolean(clarity && providerConnected(clarity.status) && clarity.project_id),
      platformAccountId: clarity?.project_id ?? null,
      reason: clarity?.project_id ? undefined : 'missing_clarity_project',
    },
    meta: {
      destination: 'meta',
      connected: Boolean(pixelId && hasMetaToken),
      platformAccountId: pixelId,
      reason: pixelId && hasMetaToken ? undefined : 'missing_meta_pixel_or_capi_token',
    },
    meta_messaging: {
      destination: 'meta_messaging',
      connected: Boolean(pixelId && hasMetaToken),
      platformAccountId: pixelId,
      reason: pixelId && hasMetaToken ? undefined : 'missing_meta_pixel_or_capi_token',
    },
  };
}

async function insertDryRunAudit(input: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  userId?: string;
  plan: PlatformGoalPlan;
}): Promise<string | null> {
  const { data, error } = await input.supabase
    .from('platform_goal_sync_runs')
    .insert({
      account_id: input.accountId,
      website_id: input.websiteId,
      run_type: 'dry_run',
      status: input.plan.summary.blocked > 0 ? 'blocked' : 'completed',
      platforms: input.plan.platforms,
      plan_hash: input.plan.planHash,
      actor_user_id: input.userId ?? null,
      dry_run: true,
      desired_count: input.plan.summary.desired,
      create_count: input.plan.summary.create,
      update_count: input.plan.summary.update,
      keep_count: input.plan.summary.keep,
      warning_count: input.plan.summary.warn,
      blocked_count: input.plan.summary.blocked,
      plan: input.plan,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    const message = error.message ?? '';
    const tableMissing =
      (error as { code?: string }).code === '42P01' || message.toLowerCase().includes('does not exist');
    if (tableMissing) return null;
    throw error;
  }
  return (data as { id?: string } | null)?.id ?? null;
}

export async function buildPlatformGoalDryRun(input: {
  supabase: SupabaseLike;
  tenant: PlatformGoalTenantContext;
  platforms: PlatformGoalDestination[];
  userId?: string;
  writeAudit?: boolean;
}): Promise<{ plan: PlatformGoalPlan; runId: string | null }> {
  const [mappingsResult, bindingsResult, providers] = await Promise.all([
    input.supabase
      .from('event_destination_mapping')
      .select('funnel_event_name,destination,destination_event_name,value_field,enabled,tenant_overrides,notes')
      .in('destination', input.platforms),
    input.supabase
      .from('platform_goal_bindings')
      .select('*')
      .eq('account_id', input.tenant.accountId)
      .or(`website_id.eq.${input.tenant.websiteId},website_id.is.null`)
      .in('destination', input.platforms),
    resolveProviderReadiness({
      supabase: input.supabase,
      accountId: input.tenant.accountId,
      websiteId: input.tenant.websiteId,
    }),
  ]);

  if (mappingsResult.error) throw mappingsResult.error;
  if (bindingsResult.error) {
    const message = bindingsResult.error.message ?? '';
    const tableMissing =
      (bindingsResult.error as { code?: string }).code === '42P01' ||
      message.toLowerCase().includes('does not exist');
    if (!tableMissing) throw bindingsResult.error;
  }

  const desired = compileDesiredPlatformGoals({
    accountId: input.tenant.accountId,
    websiteId: input.tenant.websiteId,
    mappings: (mappingsResult.data ?? []) as EventDestinationMappingRow[],
    providers,
    platforms: input.platforms,
  });

  const plan = buildPlatformGoalPlan({
    accountId: input.tenant.accountId,
    websiteId: input.tenant.websiteId,
    desired,
    bindings: ((bindingsResult.data ?? []) as PlatformGoalBindingRow[]) ?? [],
  });

  const runId = input.writeAudit
    ? await insertDryRunAudit({
        supabase: input.supabase,
        accountId: input.tenant.accountId,
        websiteId: input.tenant.websiteId,
        userId: input.userId,
        plan,
      })
    : null;

  return { plan, runId };
}

