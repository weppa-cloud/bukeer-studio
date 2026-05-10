/**
 * Growth — Microsoft Clarity aggregate client
 *
 * Read-only aggregate export helper for UX friction profiles. This module
 * intentionally rejects recording/session payloads and PII-shaped dimensions.
 */

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const CLARITY_ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const ALLOWED_DIMENSIONS = new Set(['url', 'device', 'country', 'source', 'medium', 'campaign']);
const BLOCKED_DIMENSIONS = new Set(['userId', 'sessionId', 'email', 'ip', 'recordingUrl', 'playbackUrl']);

export interface ClarityTenantScope {
  account_id: string;
  website_id: string;
}

export interface ClarityAggregateInput extends ClarityTenantScope {
  numOfDays: number;
  dimensions: string[];
  dryRun?: boolean;
}

export interface ClarityAggregatePlan extends ClarityTenantScope {
  profileId: 'clarity_ux_friction_v1';
  endpoint: string;
  query: {
    numOfDays: number;
    dimensions: string[];
  };
  dryRun: boolean;
}

export interface ClarityAggregateMetric {
  name: string;
  value: number | string | null;
}

export interface ClarityAggregateRow {
  dimensions: Record<string, string>;
  metrics: ClarityAggregateMetric[];
}

export interface ClarityAggregateResult {
  plan: ClarityAggregatePlan;
  rows: ClarityAggregateRow[];
  fetchedAt: string;
  source: 'live' | 'mock';
}

export class ClarityClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ClarityIntegrationRow {
  account_id: string;
  website_id: string;
  project_id: string | null;
  api_token: string | null;
}

export function buildClarityAggregatePlan(input: ClarityAggregateInput): ClarityAggregatePlan {
  if (!Number.isInteger(input.numOfDays) || input.numOfDays < 1 || input.numOfDays > 3) {
    throw new ClarityClientError('INVALID_WINDOW', 'Clarity aggregate window must be 1-3 days', 400, {
      numOfDays: input.numOfDays,
    });
  }
  if (!Array.isArray(input.dimensions) || input.dimensions.length === 0 || input.dimensions.length > 3) {
    throw new ClarityClientError('INVALID_DIMENSIONS', 'Clarity aggregate dimensions must contain 1-3 values', 400, {
      count: input.dimensions?.length ?? 0,
    });
  }
  const invalid = input.dimensions.filter((dimension) => {
    const normalized = dimension.trim();
    return !ALLOWED_DIMENSIONS.has(normalized) || BLOCKED_DIMENSIONS.has(normalized);
  });
  if (invalid.length > 0) {
    throw new ClarityClientError('PII_OR_RECORDING_DIMENSION_BLOCKED', 'Clarity dimensions must be aggregate non-PII fields', 400, {
      invalid,
    });
  }
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    profileId: 'clarity_ux_friction_v1',
    endpoint: CLARITY_ENDPOINT,
    query: {
      numOfDays: input.numOfDays,
      dimensions: input.dimensions.map((dimension) => dimension.trim()),
    },
    dryRun: input.dryRun ?? true,
  };
}

async function loadClarityIntegration(scope: ClarityTenantScope): Promise<ClarityIntegrationRow | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_integrations')
    .select('account_id,website_id,project_id,api_token')
    .eq('account_id', scope.account_id)
    .eq('website_id', scope.website_id)
    .eq('provider', 'clarity')
    .maybeSingle();
  if (error) {
    throw new ClarityClientError('INTEGRATION_READ_FAILED', 'Unable to load Clarity integration', 500, error.message);
  }
  return (data as ClarityIntegrationRow | null) ?? null;
}

function normalizeClarityRows(payload: unknown, dimensions: string[]): ClarityAggregateRow[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];
  return rows.map((row) => {
    const source = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const dimensionValues = dimensions.reduce<Record<string, string>>((acc, dimension) => {
      const value = source[dimension];
      acc[dimension] = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      return acc;
    }, {});
    const metrics = Object.entries(source)
      .filter(([key]) => !dimensions.includes(key) && !BLOCKED_DIMENSIONS.has(key))
      .map(([name, value]) => ({
        name,
        value: typeof value === 'number' || typeof value === 'string' || value === null ? value : null,
      }));
    return { dimensions: dimensionValues, metrics };
  });
}

export async function runClarityAggregateProfile(plan: ClarityAggregatePlan): Promise<ClarityAggregateResult> {
  if (plan.dryRun) {
    return { plan, rows: [], fetchedAt: new Date().toISOString(), source: 'mock' };
  }
  const integration = await loadClarityIntegration(plan);
  if (!integration?.api_token || !integration.project_id) {
    return { plan, rows: [], fetchedAt: new Date().toISOString(), source: 'mock' };
  }
  const params = new URLSearchParams({
    projectId: integration.project_id,
    numOfDays: String(plan.query.numOfDays),
    dimensions: plan.query.dimensions.join(','),
  });
  const response = await fetch(`${plan.endpoint}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${integration.api_token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => [])) as unknown;
  if (!response.ok) {
    if (response.status === 429) throw new ClarityClientError('RATE_LIMIT', 'Clarity rate limited', 429, json);
    throw new ClarityClientError('UPSTREAM_ERROR', 'Clarity aggregate export failed', response.status >= 500 ? 502 : response.status, json);
  }
  return {
    plan,
    rows: normalizeClarityRows(json, plan.query.dimensions),
    fetchedAt: new Date().toISOString(),
    source: 'live',
  };
}
