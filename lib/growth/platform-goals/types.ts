export const PLATFORM_GOAL_DESTINATIONS = [
  'google_ads',
  'ga4',
  'meta',
  'meta_messaging',
  'clarity',
  'tiktok',
  'linkedin',
] as const;

export type PlatformGoalDestination = (typeof PLATFORM_GOAL_DESTINATIONS)[number];

export type PlatformGoalDesiredStatus =
  | 'primary'
  | 'secondary'
  | 'observation'
  | 'diagnostic'
  | 'disabled';

export type PlatformGoalLiveStatus =
  | PlatformGoalDesiredStatus
  | 'missing'
  | 'unknown';

export type PlatformGoalSyncStatus = 'healthy' | 'watch' | 'blocked' | 'unknown';

export type PlatformGoalAction = 'create' | 'update' | 'keep' | 'warn' | 'blocked';

export interface EventDestinationMappingRow {
  funnel_event_name: string;
  destination: string;
  destination_event_name: string;
  value_field: string | null;
  enabled: boolean;
  tenant_overrides?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface PlatformGoalBindingRow {
  id?: string;
  account_id: string;
  website_id: string | null;
  canonical_event_name: string;
  destination: PlatformGoalDestination;
  platform_account_id: string | null;
  platform_goal_id: string | null;
  platform_goal_name: string;
  destination_event_name: string | null;
  desired_status: PlatformGoalDesiredStatus;
  live_status: PlatformGoalLiveStatus;
  sync_status: PlatformGoalSyncStatus;
  drift_reason: string | null;
  config?: Record<string, unknown> | null;
  last_synced_at?: string | null;
  last_verified_at?: string | null;
}

export interface ProviderReadiness {
  destination: PlatformGoalDestination;
  connected: boolean;
  platformAccountId: string | null;
  reason?: string;
}

export interface DesiredPlatformGoal {
  accountId: string;
  websiteId: string | null;
  canonicalEventName: string;
  destination: PlatformGoalDestination;
  destinationEventName: string;
  platformGoalName: string;
  desiredStatus: PlatformGoalDesiredStatus;
  valueField: string | null;
  enabled: boolean;
  provider: ProviderReadiness;
}

export interface PlatformGoalPlanItem {
  canonicalEventName: string;
  destination: PlatformGoalDestination;
  destinationEventName: string;
  platformGoalName: string;
  desiredStatus: PlatformGoalDesiredStatus;
  liveStatus: PlatformGoalLiveStatus;
  syncStatus: PlatformGoalSyncStatus;
  action: PlatformGoalAction;
  reason: string;
  platformAccountId: string | null;
  platformGoalId: string | null;
  bindingId?: string;
  enabled: boolean;
}

export interface PlatformGoalPlanSummary {
  desired: number;
  create: number;
  update: number;
  keep: number;
  warn: number;
  blocked: number;
  healthy: number;
  watch: number;
}

export interface PlatformGoalPlan {
  accountId: string;
  websiteId: string;
  platforms: PlatformGoalDestination[];
  generatedAt: string;
  planHash: string;
  summary: PlatformGoalPlanSummary;
  items: PlatformGoalPlanItem[];
}

export function isPlatformGoalDestination(value: string): value is PlatformGoalDestination {
  return (PLATFORM_GOAL_DESTINATIONS as readonly string[]).includes(value);
}

