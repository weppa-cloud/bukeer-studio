import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

type SyncMode = 'dry_run' | 'validate' | 'apply' | 'reconcile'
type Destination = 'google_ads_customer_match' | 'meta_custom_audiences'

type SyncRequest = {
  account_id?: string
  audience_code?: string
  audience_codes?: string[]
  destination?: Destination
  destinations?: Destination[]
  mode?: SyncMode
  approval_token?: string
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required`)
  }
  return value.trim()
}

function normalizeList<T extends string>(single: T | undefined, multiple: T[] | undefined, fallback: T[]): T[] {
  const values = multiple?.length ? multiple : single ? [single] : fallback
  return [...new Set(values)]
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/[A-Fa-f0-9]{64}/g, '[sha256-redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email-redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone-redacted]')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalSecret = Deno.env.get('CRM_AUDIENCE_SYNC_INTERNAL_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'missing_supabase_service_config' }, 500)
    }

    const authorization = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const internalAuthorization = req.headers.get('x-internal-secret')
    const authorized = authorization === serviceRoleKey || (internalSecret && internalAuthorization === internalSecret)
    if (!authorized) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const payload = (await req.json().catch(() => ({}))) as SyncRequest
    const accountId = requireString(payload.account_id, 'account_id')
    const mode = payload.mode ?? 'dry_run'
    if (!['dry_run', 'validate', 'apply', 'reconcile'].includes(mode)) {
      return jsonResponse({ error: 'unsupported_mode', mode }, 400)
    }
    if (mode === 'apply' && (!payload.approval_token || payload.approval_token.length < 16)) {
      return jsonResponse({ error: 'approval_token_required_for_apply' }, 400)
    }

    const destinations = normalizeList<Destination>(payload.destination, payload.destinations, [
      'google_ads_customer_match',
      'meta_custom_audiences',
    ])
    const audienceCodes = normalizeList<string>(payload.audience_code, payload.audience_codes, [])

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    })

    const dryRun = mode !== 'apply'
    const materializationResults = []

    if (audienceCodes.length === 0) {
      const { data, error } = await supabase.rpc('refresh_crm_audience_memberships', {
        p_account_id: accountId,
        p_audience_code: null,
        p_dry_run: dryRun,
      })
      if (error) throw error
      materializationResults.push(...(data ?? []))
    } else {
      for (const audienceCode of audienceCodes) {
        const { data, error } = await supabase.rpc('refresh_crm_audience_memberships', {
          p_account_id: accountId,
          p_audience_code: audienceCode,
          p_dry_run: dryRun,
        })
        if (error) throw error
        materializationResults.push(...(data ?? []))
      }
    }

    const codesToQueue = audienceCodes.length > 0
      ? audienceCodes
      : [...new Set(materializationResults.map((result: { audience_code: string }) => result.audience_code))]

    const queuedRuns = []
    for (const audienceCode of codesToQueue) {
      for (const destination of destinations) {
        const { data: runId, error } = await supabase.rpc('queue_crm_audience_sync', {
          p_account_id: accountId,
          p_audience_code: audienceCode,
          p_destination: destination,
          p_mode: mode,
          p_approval_token: payload.approval_token ?? null,
        })
        if (error) throw error
        queuedRuns.push({ run_id: runId, audience_code: audienceCode, destination, mode })
      }
    }

    // Provider uploads are deliberately not linked to campaigns/ad sets here. A worker can consume queued
    // runs, resolve account_channel_contracts, and upload hashed identities after explicit apply approval.
    return jsonResponse({
      ok: true,
      account_id: accountId,
      mode,
      dry_run: dryRun,
      materialization: materializationResults,
      queued_runs: queuedRuns,
    })
  } catch (error) {
    return jsonResponse({ error: 'sync_crm_audiences_failed', detail: redactError(error) }, 500)
  }
})
