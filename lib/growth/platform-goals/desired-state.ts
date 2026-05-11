import crypto from 'node:crypto';
import {
  isPlatformGoalDestination,
  type DesiredPlatformGoal,
  type EventDestinationMappingRow,
  type PlatformGoalBindingRow,
  type PlatformGoalDesiredStatus,
  type PlatformGoalDestination,
  type PlatformGoalPlan,
  type PlatformGoalPlanItem,
  type PlatformGoalPlanSummary,
  type ProviderReadiness,
} from './types';

const PRIMARY_EVENTS = new Set([
  'waflow_submit',
  'crm_lead_stage_qualified',
  'chatwoot_label_qualified',
  'crm_quote_sent',
  'crm_booking_confirmed',
]);

const DIAGNOSTIC_EVENTS = new Set([
  'pageview',
  'waflow_open',
  'waflow_step_next',
  'waflow_validation_error',
  'waflow_abandon',
]);

const GOOGLE_ADS_NAME_PREFIX = 'Bukeer';

function destinationStatus(
  eventName: string,
  destination: PlatformGoalDestination,
  enabled: boolean,
): PlatformGoalDesiredStatus {
  if (!enabled) return 'disabled';
  if (destination === 'clarity') return 'diagnostic';
  if (DIAGNOSTIC_EVENTS.has(eventName)) return 'diagnostic';
  if (destination === 'ga4') {
    return PRIMARY_EVENTS.has(eventName) ? 'primary' : 'observation';
  }
  if (destination === 'google_ads') {
    if (eventName === 'whatsapp_cta_click') return 'secondary';
    return PRIMARY_EVENTS.has(eventName) ? 'primary' : 'observation';
  }
  if (destination === 'meta' || destination === 'meta_messaging') {
    return PRIMARY_EVENTS.has(eventName) ? 'primary' : 'observation';
  }
  return PRIMARY_EVENTS.has(eventName) ? 'secondary' : 'observation';
}

function platformGoalName(eventName: string, destination: PlatformGoalDestination, destinationEventName: string): string {
  if (destination === 'google_ads') return `${GOOGLE_ADS_NAME_PREFIX} ${destinationEventName}`;
  if (destination === 'ga4') return destinationEventName;
  if (destination === 'meta' || destination === 'meta_messaging') return `${destinationEventName} (${eventName})`;
  if (destination === 'clarity') return `clarity_context:${eventName}`;
  return `${destination}:${destinationEventName}`;
}

function providerForDestination(
  destination: PlatformGoalDestination,
  providers: Partial<Record<PlatformGoalDestination, ProviderReadiness>>,
): ProviderReadiness {
  return providers[destination] ?? {
    destination,
    connected: false,
    platformAccountId: null,
    reason: 'provider_not_configured',
  };
}

export function compileDesiredPlatformGoals(input: {
  accountId: string;
  websiteId: string;
  mappings: EventDestinationMappingRow[];
  providers: Partial<Record<PlatformGoalDestination, ProviderReadiness>>;
  platforms?: PlatformGoalDestination[];
}): DesiredPlatformGoal[] {
  const platformSet = input.platforms?.length ? new Set(input.platforms) : null;

  return input.mappings
    .filter((mapping) => isPlatformGoalDestination(mapping.destination))
    .filter((mapping) => !platformSet || platformSet.has(mapping.destination as PlatformGoalDestination))
    .map((mapping) => {
      const destination = mapping.destination as PlatformGoalDestination;
      const provider = providerForDestination(destination, input.providers);
      const desiredStatus = destinationStatus(mapping.funnel_event_name, destination, mapping.enabled);
      return {
        accountId: input.accountId,
        websiteId: input.websiteId,
        canonicalEventName: mapping.funnel_event_name,
        destination,
        destinationEventName: mapping.destination_event_name,
        platformGoalName: platformGoalName(
          mapping.funnel_event_name,
          destination,
          mapping.destination_event_name,
        ),
        desiredStatus,
        valueField: mapping.value_field,
        enabled: mapping.enabled,
        provider,
      };
    });
}

function bindingKey(eventName: string, destination: PlatformGoalDestination): string {
  return `${eventName}::${destination}`;
}

function planItemFor(desired: DesiredPlatformGoal, binding?: PlatformGoalBindingRow): PlatformGoalPlanItem {
  if (!desired.provider.connected) {
    return {
      canonicalEventName: desired.canonicalEventName,
      destination: desired.destination,
      destinationEventName: desired.destinationEventName,
      platformGoalName: desired.platformGoalName,
      desiredStatus: desired.desiredStatus,
      liveStatus: binding?.live_status ?? 'unknown',
      syncStatus: 'blocked',
      action: 'blocked',
      reason: desired.provider.reason ?? 'provider_not_connected',
      platformAccountId: desired.provider.platformAccountId,
      platformGoalId: binding?.platform_goal_id ?? null,
      ...(binding?.id && { bindingId: binding.id }),
      enabled: desired.enabled,
    };
  }

  if (!binding) {
    return {
      canonicalEventName: desired.canonicalEventName,
      destination: desired.destination,
      destinationEventName: desired.destinationEventName,
      platformGoalName: desired.platformGoalName,
      desiredStatus: desired.desiredStatus,
      liveStatus: 'missing',
      syncStatus: desired.desiredStatus === 'disabled' ? 'watch' : 'watch',
      action: desired.desiredStatus === 'disabled' ? 'warn' : 'create',
      reason: desired.desiredStatus === 'disabled' ? 'disabled_goal_not_bound' : 'missing_binding',
      platformAccountId: desired.provider.platformAccountId,
      platformGoalId: null,
      enabled: desired.enabled,
    };
  }

  const wrongStatus = binding.desired_status !== desired.desiredStatus;
  const wrongName = binding.destination_event_name !== desired.destinationEventName;
  const wrongAccount =
    desired.provider.platformAccountId &&
    binding.platform_account_id &&
    desired.provider.platformAccountId !== binding.platform_account_id;

  if (wrongStatus || wrongName || wrongAccount || binding.sync_status !== 'healthy') {
    return {
      canonicalEventName: desired.canonicalEventName,
      destination: desired.destination,
      destinationEventName: desired.destinationEventName,
      platformGoalName: desired.platformGoalName,
      desiredStatus: desired.desiredStatus,
      liveStatus: binding.live_status,
      syncStatus: wrongAccount ? 'blocked' : 'watch',
      action: wrongAccount ? 'blocked' : 'update',
      reason: wrongAccount
        ? 'platform_account_mismatch'
        : wrongStatus
          ? 'desired_status_drift'
          : wrongName
            ? 'destination_event_name_drift'
            : 'binding_not_healthy',
      platformAccountId: desired.provider.platformAccountId ?? binding.platform_account_id,
      platformGoalId: binding.platform_goal_id,
      ...(binding.id && { bindingId: binding.id }),
      enabled: desired.enabled,
    };
  }

  return {
    canonicalEventName: desired.canonicalEventName,
    destination: desired.destination,
    destinationEventName: desired.destinationEventName,
    platformGoalName: desired.platformGoalName,
    desiredStatus: desired.desiredStatus,
    liveStatus: binding.live_status,
    syncStatus: 'healthy',
    action: 'keep',
    reason: 'binding_healthy',
    platformAccountId: desired.provider.platformAccountId ?? binding.platform_account_id,
    platformGoalId: binding.platform_goal_id,
    ...(binding.id && { bindingId: binding.id }),
    enabled: desired.enabled,
  };
}

function summarize(items: PlatformGoalPlanItem[]): PlatformGoalPlanSummary {
  return {
    desired: items.length,
    create: items.filter((item) => item.action === 'create').length,
    update: items.filter((item) => item.action === 'update').length,
    keep: items.filter((item) => item.action === 'keep').length,
    warn: items.filter((item) => item.action === 'warn').length,
    blocked: items.filter((item) => item.action === 'blocked').length,
    healthy: items.filter((item) => item.syncStatus === 'healthy').length,
    watch: items.filter((item) => item.syncStatus === 'watch').length,
  };
}

export function hashPlatformGoalPlan(input: Omit<PlatformGoalPlan, 'planHash'>): string {
  const stable = JSON.stringify({
    accountId: input.accountId,
    websiteId: input.websiteId,
    platforms: input.platforms,
    items: input.items.map((item) => ({
      canonicalEventName: item.canonicalEventName,
      destination: item.destination,
      desiredStatus: item.desiredStatus,
      action: item.action,
      reason: item.reason,
      platformAccountId: item.platformAccountId,
      platformGoalId: item.platformGoalId,
    })),
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

export function buildPlatformGoalPlan(input: {
  accountId: string;
  websiteId: string;
  desired: DesiredPlatformGoal[];
  bindings: PlatformGoalBindingRow[];
  generatedAt?: string;
}): PlatformGoalPlan {
  const bindings = new Map(
    input.bindings.map((binding) => [
      bindingKey(binding.canonical_event_name, binding.destination),
      binding,
    ]),
  );
  const items = input.desired.map((goal) =>
    planItemFor(goal, bindings.get(bindingKey(goal.canonicalEventName, goal.destination))),
  );
  const base = {
    accountId: input.accountId,
    websiteId: input.websiteId,
    platforms: [...new Set(input.desired.map((goal) => goal.destination))].sort(),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    summary: summarize(items),
    items,
  };
  return {
    ...base,
    planHash: hashPlatformGoalPlan(base),
  };
}

