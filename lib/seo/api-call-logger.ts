import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export interface SeoApiCallLogInput {
  websiteId: string;
  provider: string;
  endpoint: string;
  requestId: string;
  status: 'success' | 'error';
  rowCount?: number;
  estimatedCost?: number;
  latencyMs?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logSeoApiCall(input: SeoApiCallLogInput): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from('seo_api_calls').insert({
      website_id: input.websiteId,
      provider: input.provider,
      endpoint: input.endpoint,
      request_id: input.requestId,
      status: input.status,
      row_count: input.rowCount ?? 0,
      estimated_cost: input.estimatedCost ?? 0,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error('[seo.api_call_logger] failed', error);
  }
}
