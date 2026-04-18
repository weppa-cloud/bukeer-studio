import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AiCostEventInput, AiSpendSummary } from '@bukeer/website-contract';

/**
 * AI cost ledger — writes per-request cost events to ai_cost_events.
 * Complements lib/ai/rate-limit.ts: rate-limit enforces throttle, ledger records spend.
 * Both are called by every AI route (editor, public-chat, seo-transcreate, etc.).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function logAiCostEvent(input: AiCostEventInput): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('log_ai_cost_event', {
    p_account_id: input.account_id,
    p_website_id: input.website_id ?? null,
    p_user_id: input.user_id ?? null,
    p_feature: input.feature,
    p_route: input.route,
    p_model: input.model,
    p_input_tokens: input.input_tokens,
    p_output_tokens: input.output_tokens,
    p_cost_usd: input.cost_usd,
    p_status: input.status ?? 'ok',
    p_rate_limit_key: input.rate_limit_key ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('[cost-ledger] log_ai_cost_event failed', error);
    return null;
  }

  return typeof data === 'string' ? data : null;
}

export async function getAccountAiSpend(
  accountId: string,
  period: 'day' | 'month' = 'month',
): Promise<AiSpendSummary | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_account_ai_spend', {
    p_account_id: accountId,
    p_period: period,
  });

  if (error || !data) {
    console.error('[cost-ledger] get_account_ai_spend failed', error);
    return null;
  }

  return data as AiSpendSummary;
}

/**
 * Budget guard — returns true if account is at/over alert threshold.
 * Call BEFORE dispatching expensive AI calls; short-circuit with 402-ish response.
 */
export async function isBudgetThresholdHit(accountId: string): Promise<boolean> {
  const summary = await getAccountAiSpend(accountId, 'month');
  return summary?.alert_threshold_hit ?? false;
}

export async function isOverBudget(accountId: string): Promise<boolean> {
  const summary = await getAccountAiSpend(accountId, 'month');
  return summary?.over_limit ?? false;
}
