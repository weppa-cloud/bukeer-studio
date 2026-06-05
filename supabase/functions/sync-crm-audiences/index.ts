import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

type SyncMode = 'dry_run' | 'validate' | 'apply' | 'reconcile'
type Destination = 'google_ads_customer_match' | 'meta_custom_audiences'
type Operation = 'add' | 'remove'

type SyncRequest = {
  account_id?: string
  audience_code?: string
  audience_codes?: string[]
  destination?: Destination
  destinations?: Destination[]
  mode?: SyncMode
  approval_token?: string
  execute_provider?: boolean
  run_ids?: string[]
}

type QueuedRunInput = {
  run_id: string
  audience_code: string
  destination: Destination
  mode: SyncMode
}

type SyncRun = {
  id: string
  account_id: string
  audience_id: string
  destination: Destination
  mode: SyncMode
  status: string
  dry_run: boolean
  approval_token_hash?: string | null
  crm_audience_definitions?: { code?: string | null; name?: string | null } | null
}

type DestinationBinding = {
  id: string
  account_id: string
  audience_id: string
  destination: Destination
  platform_account_id?: string | null
  platform_audience_id?: string | null
  platform_audience_name: string
  status: string
  metadata?: Record<string, unknown> | null
}

type ChannelContract = {
  config?: Record<string, unknown> | null
  credentials_encrypted?: Record<string, unknown> | null
  service_channels?: { code?: string | null } | null
}

type AudienceIdentity = {
  membership_id: string
  email_sha256?: string | null
  phone_sha256?: string | null
  external_id_sha256?: string | null
}

type ProviderContext = {
  run: SyncRun
  binding: DestinationBinding
  contract: ChannelContract
  identities: AudienceIdentity[]
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
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

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readString(source: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function redactError(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error)
  return message
    .replace(/[A-Fa-f0-9]{64}/g, '[sha256-redacted]')
    .replace(/EA[A-Za-z0-9_-]{40,}/g, '[meta-token-redacted]')
    .replace(/ya29\.[A-Za-z0-9._-]+/g, '[google-token-redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email-redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone-redacted]')
}

function stripId(value?: string | null): string | undefined {
  return value?.replace(/\D/g, '') || undefined
}

function hasGoogleContactIdentity(identity: AudienceIdentity): boolean {
  return Boolean(identity.email_sha256 || identity.phone_sha256)
}

function hasMetaIdentity(identity: AudienceIdentity): boolean {
  return Boolean(identity.email_sha256 || identity.phone_sha256 || identity.external_id_sha256)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

async function updateRun(supabase: ReturnType<typeof createClient>, runId: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('crm_audience_sync_runs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw error
}

async function loadRunsByIds(supabase: ReturnType<typeof createClient>, runIds: string[]): Promise<SyncRun[]> {
  if (runIds.length === 0) return []
  const { data, error } = await supabase
    .from('crm_audience_sync_runs')
    .select('id,account_id,audience_id,destination,mode,status,dry_run,approval_token_hash,crm_audience_definitions(code,name)')
    .in('id', runIds)
  if (error) throw error
  return (data ?? []) as SyncRun[]
}

async function loadProviderContext(supabase: ReturnType<typeof createClient>, run: SyncRun): Promise<ProviderContext> {
  const [{ data: binding, error: bindingError }, { data: contracts, error: contractError }] = await Promise.all([
    supabase
      .from('crm_audience_destination_bindings')
      .select('id,account_id,audience_id,destination,platform_account_id,platform_audience_id,platform_audience_name,status,metadata')
      .eq('account_id', run.account_id)
      .eq('audience_id', run.audience_id)
      .eq('destination', run.destination)
      .maybeSingle(),
    supabase
      .from('account_channel_contracts')
      .select('config,credentials_encrypted,service_channels(code)')
      .eq('account_id', run.account_id)
      .eq('is_active', true),
  ])
  if (bindingError) throw bindingError
  if (contractError) throw contractError
  if (!binding) throw new Error(`missing_destination_binding_${run.destination}`)

  const contract = ((contracts ?? []) as ChannelContract[]).find((row) => row.service_channels?.code === run.destination)
  if (!contract) throw new Error(`missing_active_channel_contract_${run.destination}`)

  const activeMembershipIds = await loadActiveMembershipIds(supabase, run.audience_id)
  const identities = await loadIdentitiesForMemberships(supabase, run.audience_id, activeMembershipIds)

  return {
    run,
    binding: binding as DestinationBinding,
    contract,
    identities,
  }
}

async function loadActiveMembershipIds(supabase: ReturnType<typeof createClient>, audienceId: string): Promise<string[]> {
  const ids: string[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('crm_audience_memberships')
      .select('id')
      .eq('audience_id', audienceId)
      .eq('is_active', true)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ id: string }>
    ids.push(...rows.map((row) => row.id))
    if (rows.length < pageSize) break
    from += pageSize
  }
  return ids
}

async function loadIdentitiesForMemberships(
  supabase: ReturnType<typeof createClient>,
  audienceId: string,
  membershipIds: string[],
): Promise<AudienceIdentity[]> {
  if (membershipIds.length === 0) return []
  const identities: AudienceIdentity[] = []
  for (const ids of chunk(membershipIds, 500)) {
    const { data, error } = await supabase
      .from('crm_audience_member_identities')
      .select('membership_id,email_sha256,phone_sha256,external_id_sha256')
      .eq('audience_id', audienceId)
      .in('membership_id', ids)
    if (error) throw error
    identities.push(...((data ?? []) as AudienceIdentity[]))
  }
  return identities
}

async function loadProviderSyncedMembershipIds(
  supabase: ReturnType<typeof createClient>,
  run: SyncRun,
): Promise<Set<string>> {
  const added = new Set<string>()
  const removed = new Set<string>()
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('crm_audience_sync_events')
      .select('membership_id,operation,status,provider_code')
      .eq('account_id', run.account_id)
      .eq('audience_id', run.audience_id)
      .eq('provider_code', run.destination)
      .in('operation', ['add', 'remove'])
      .eq('status', 'completed')
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ membership_id?: string | null; operation: Operation }>
    for (const row of rows) {
      if (!row.membership_id) continue
      if (row.operation === 'add') added.add(row.membership_id)
      if (row.operation === 'remove') removed.add(row.membership_id)
    }
    if (rows.length < pageSize) break
    from += pageSize
  }
  for (const id of removed) added.delete(id)
  return added
}

async function insertSyncEvents(
  supabase: ReturnType<typeof createClient>,
  input: {
    run: SyncRun
    operation: 'add' | 'remove' | 'skip' | 'validate' | 'reconcile'
    status: 'completed' | 'failed' | 'skipped'
    identities?: AudienceIdentity[]
    reason?: string
    metadata?: Record<string, unknown>
  },
) {
  const identities = input.identities ?? [undefined]
  for (const rows of chunk(identities, 500)) {
    const payload = rows.map((identity) => ({
      run_id: input.run.id,
      account_id: input.run.account_id,
      audience_id: input.run.audience_id,
      membership_id: identity?.membership_id ?? null,
      operation: input.operation,
      status: input.status,
      reason: input.reason ?? null,
      provider_code: input.run.destination,
      metadata: input.metadata ?? {},
    }))
    const { error } = await supabase.from('crm_audience_sync_events').insert(payload)
    if (error) throw error
  }
}

async function googleAccessToken(contract: ChannelContract): Promise<string> {
  const credentials = readRecord(contract.credentials_encrypted)
  const clientId = readString(credentials, 'client_id')
  const clientSecret = readString(credentials, 'client_secret')
  const refreshToken = readString(credentials, 'refresh_token')
  if (!clientId || !clientSecret || !refreshToken) throw new Error('missing_google_ads_oauth_config')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || typeof body.access_token !== 'string') {
    throw new Error(`google_ads_oauth_failed_${response.status}`)
  }
  return body.access_token
}

function googleConfig(contract: ChannelContract, binding: DestinationBinding) {
  const config = readRecord(contract.config)
  const credentials = readRecord(contract.credentials_encrypted)
  const customerId = stripId(readString(config, 'customer_id') ?? binding.platform_account_id)
  const loginCustomerId = stripId(readString(config, 'login_customer_id'))
  const developerToken = readString(credentials, 'developer_token')
  const apiVersion = readString(config, 'api_version') ?? 'v24'
  if (!customerId) throw new Error('missing_google_ads_customer_id')
  if (!developerToken) throw new Error('missing_google_ads_developer_token')
  return { customerId, loginCustomerId, developerToken, apiVersion }
}

async function googleFetch(
  contract: ChannelContract,
  binding: DestinationBinding,
  path: string,
  body: Record<string, unknown>,
) {
  const cfg = googleConfig(contract, binding)
  const accessToken = await googleAccessToken(contract)
  const response = await fetch(`https://googleads.googleapis.com/${cfg.apiVersion}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': cfg.developerToken,
      ...(cfg.loginCustomerId ? { 'login-customer-id': cfg.loginCustomerId } : {}),
    },
    body: JSON.stringify(body),
  })
  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    const message = responseBody?.error?.message ?? `google_ads_api_http_${response.status}`
    const details = responseBody?.error?.details ? ` details=${JSON.stringify(responseBody.error.details)}` : ''
    throw new Error(`${message}${details}`)
  }
  return responseBody
}

async function validateGoogle(context: ProviderContext) {
  const cfg = googleConfig(context.contract, context.binding)
  const response = await googleFetch(
    context.contract,
    context.binding,
    `customers/${cfg.customerId}/googleAds:searchStream`,
    { query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' },
  )
  return {
    provider: 'google_ads_customer_match',
    api_version: cfg.apiVersion,
    customer_id: cfg.customerId,
    read_ok: true,
    rows_returned: Array.isArray(response) ? response.reduce((sum, batch) => sum + (batch.results?.length ?? 0), 0) : 0,
  }
}

async function searchGoogleUserList(context: ProviderContext): Promise<{ resourceName: string; id?: string } | null> {
  const cfg = googleConfig(context.contract, context.binding)
  const escapedName = context.binding.platform_audience_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const response = await googleFetch(
    context.contract,
    context.binding,
    `customers/${cfg.customerId}/googleAds:searchStream`,
    {
      query: `SELECT user_list.id, user_list.name, user_list.resource_name FROM user_list WHERE user_list.name = '${escapedName}' LIMIT 1`,
    },
  )
  const result = Array.isArray(response) ? response.flatMap((batch) => batch.results ?? [])[0] : null
  const userList = result?.userList
  if (!userList?.resourceName) return null
  return { resourceName: userList.resourceName, id: String(userList.id ?? '').replace(/\D/g, '') || undefined }
}

async function ensureGoogleUserList(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  const cfg = googleConfig(context.contract, context.binding)
  if (context.binding.platform_audience_id) {
    const id = stripId(context.binding.platform_audience_id)
    return { resourceName: `customers/${cfg.customerId}/userLists/${id}`, id }
  }

  const existing = await searchGoogleUserList(context)
  if (existing) {
    await updateBindingMapped(supabase, context.binding.id, existing.id ?? null, {
      google_resource_name: existing.resourceName,
      mapped_by: 'name_lookup',
    })
    return existing
  }

  const response = await googleFetch(
    context.contract,
    context.binding,
    `customers/${cfg.customerId}/userLists:mutate`,
    {
      operations: [{
        create: {
          name: context.binding.platform_audience_name,
          description: `CRM audience projection for ${context.run.crm_audience_definitions?.code ?? context.run.audience_id}. No campaign targeting by this worker.`,
          membershipLifeSpan: '540',
          crmBasedUserList: { uploadKeyType: 'CONTACT_INFO' },
        },
      }],
      validateOnly: false,
    },
  )
  const resourceName = response?.results?.[0]?.resourceName
  if (!resourceName) throw new Error('google_user_list_create_missing_resource_name')
  const id = String(resourceName).split('/').pop()
  await updateBindingMapped(supabase, context.binding.id, id ?? null, {
    google_resource_name: resourceName,
    mapped_by: 'created_by_worker',
  })
  return { resourceName, id }
}

function googleUserData(identity: AudienceIdentity) {
  const userIdentifiers: Array<Record<string, string>> = []
  if (identity.email_sha256) userIdentifiers.push({ hashedEmail: identity.email_sha256 })
  if (identity.phone_sha256) userIdentifiers.push({ hashedPhoneNumber: identity.phone_sha256 })
  return { userIdentifiers }
}

async function uploadGoogleCustomerMatch(
  context: ProviderContext,
  userListResourceName: string,
  operation: Operation,
  identities: AudienceIdentity[],
) {
  if (identities.length === 0) return null
  const cfg = googleConfig(context.contract, context.binding)
  const createJobBody: Record<string, unknown> = {
    job: {
      type: 'CUSTOMER_MATCH_USER_LIST',
      customerMatchUserListMetadata: {
        userList: userListResourceName,
        ...(operation === 'add'
          ? { consent: { adUserData: 'GRANTED', adPersonalization: 'GRANTED' } }
          : {}),
      },
    },
  }
  const createJob = await googleFetch(
    context.contract,
    context.binding,
    `customers/${cfg.customerId}/offlineUserDataJobs:create`,
    createJobBody,
  )
  const jobResourceName = createJob?.resourceName
  if (!jobResourceName) throw new Error('google_offline_job_missing_resource_name')

  const operations = identities.map((identity) => ({
    [operation === 'add' ? 'create' : 'remove']: googleUserData(identity),
  }))
  const addOperations = await googleFetch(
    context.contract,
    context.binding,
    `${jobResourceName}:addOperations`,
    { operations, enablePartialFailure: true },
  )
  if (addOperations?.partialFailureError) {
    throw new Error(addOperations.partialFailureError.message ?? 'google_offline_job_partial_failure')
  }
  const runJob = await googleFetch(context.contract, context.binding, `${jobResourceName}:run`, {})
  return { job_resource_name: jobResourceName, run_response: runJob }
}

function metaConfig(contract: ChannelContract, binding: DestinationBinding) {
  const config = readRecord(contract.config)
  const credentials = readRecord(contract.credentials_encrypted)
  const adAccountId = stripId(readString(config, 'ad_account_id') ?? binding.platform_account_id)
  const accessToken = readString(credentials, 'access_token') ?? readString(credentials, 'meta_access_token')
  const apiVersion = readString(config, 'api_version') ?? 'v21.0'
  if (!adAccountId) throw new Error('missing_meta_ad_account_id')
  if (!accessToken) throw new Error('missing_meta_access_token')
  return { adAccountId, accessToken, apiVersion }
}

async function metaFetch(
  contract: ChannelContract,
  binding: DestinationBinding,
  path: string,
  options: { method?: string; params?: Record<string, string>; form?: Record<string, string> } = {},
) {
  const cfg = metaConfig(contract, binding)
  const params = new URLSearchParams({ access_token: cfg.accessToken, ...(options.params ?? {}) })
  const response = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${path}?${params.toString()}`, {
    method: options.method ?? 'GET',
    headers: options.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: options.form ? new URLSearchParams(options.form).toString() : undefined,
  })
  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    const message = responseBody?.error?.message ?? `meta_api_http_${response.status}`
    const code = responseBody?.error?.code ? ` code=${responseBody.error.code}` : ''
    const type = responseBody?.error?.type ? ` type=${responseBody.error.type}` : ''
    throw new Error(`${message}${code}${type}`)
  }
  return responseBody
}

async function validateMeta(context: ProviderContext) {
  const cfg = metaConfig(context.contract, context.binding)
  const response = await metaFetch(context.contract, context.binding, `act_${cfg.adAccountId}`, {
    params: { fields: 'id,account_status,name' },
  })
  return {
    provider: 'meta_custom_audiences',
    api_version: cfg.apiVersion,
    ad_account_id: cfg.adAccountId,
    read_ok: true,
    account_status: response?.account_status ?? null,
  }
}

async function findMetaAudience(context: ProviderContext): Promise<{ id: string } | null> {
  const cfg = metaConfig(context.contract, context.binding)
  let after: string | undefined
  for (let page = 0; page < 10; page += 1) {
    const response = await metaFetch(context.contract, context.binding, `act_${cfg.adAccountId}/customaudiences`, {
      params: {
        fields: 'id,name,subtype',
        limit: '100',
        ...(after ? { after } : {}),
      },
    })
    const match = (response?.data ?? []).find((audience: { name?: string }) => audience.name === context.binding.platform_audience_name)
    if (match?.id) return { id: match.id }
    after = response?.paging?.cursors?.after
    if (!after) break
  }
  return null
}

async function ensureMetaAudience(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  if (context.binding.platform_audience_id) return { id: context.binding.platform_audience_id }

  const existing = await findMetaAudience(context)
  if (existing) {
    await updateBindingMapped(supabase, context.binding.id, existing.id, { mapped_by: 'name_lookup' })
    return existing
  }

  const cfg = metaConfig(context.contract, context.binding)
  const response = await metaFetch(context.contract, context.binding, `act_${cfg.adAccountId}/customaudiences`, {
    method: 'POST',
    form: {
      name: context.binding.platform_audience_name,
      subtype: 'CUSTOM',
      description: `CRM audience projection for ${context.run.crm_audience_definitions?.code ?? context.run.audience_id}. No ad set targeting by this worker.`,
      customer_file_source: 'USER_PROVIDED_ONLY',
    },
  })
  if (!response?.id) throw new Error('meta_custom_audience_create_missing_id')
  await updateBindingMapped(supabase, context.binding.id, response.id, { mapped_by: 'created_by_worker' })
  return { id: response.id }
}

function metaPayload(identities: AudienceIdentity[]) {
  return {
    schema: ['EMAIL_SHA256', 'PHONE_SHA256', 'EXTERN_ID'],
    data: identities.map((identity) => [
      identity.email_sha256 ?? '',
      identity.phone_sha256 ?? '',
      identity.external_id_sha256 ?? '',
    ]),
  }
}

async function uploadMetaCustomAudience(context: ProviderContext, audienceId: string, operation: Operation, identities: AudienceIdentity[]) {
  if (identities.length === 0) return null
  const method = operation === 'add' ? 'POST' : 'DELETE'
  const responses = []
  for (const batch of chunk(identities, 5000)) {
    responses.push(await metaFetch(context.contract, context.binding, `${audienceId}/users`, {
      method,
      form: { payload: JSON.stringify(metaPayload(batch)) },
    }))
  }
  return { batches: responses.length, responses }
}

async function updateBindingMapped(
  supabase: ReturnType<typeof createClient>,
  bindingId: string,
  platformAudienceId: string | null,
  metadataPatch: Record<string, unknown>,
) {
  const { data: existing } = await supabase
    .from('crm_audience_destination_bindings')
    .select('metadata')
    .eq('id', bindingId)
    .maybeSingle()
  const metadata = { ...readRecord((existing as { metadata?: unknown } | null)?.metadata), ...metadataPatch }
  const { error } = await supabase
    .from('crm_audience_destination_bindings')
    .update({
      platform_audience_id: platformAudienceId,
      status: 'active',
      metadata,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bindingId)
  if (error) throw error
}

async function computeDiff(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  const providerUsable = context.run.destination === 'google_ads_customer_match'
    ? context.identities.filter(hasGoogleContactIdentity)
    : context.identities.filter(hasMetaIdentity)
  const skipped = context.identities.filter((identity) => !providerUsable.some((usable) => usable.membership_id === identity.membership_id))
  const previousSynced = await loadProviderSyncedMembershipIds(supabase, context.run)
  const activeById = new Map(providerUsable.map((identity) => [identity.membership_id, identity]))
  const adds = providerUsable.filter((identity) => !previousSynced.has(identity.membership_id))
  const removes: AudienceIdentity[] = []
  for (const membershipId of previousSynced) {
    if (!activeById.has(membershipId)) removes.push({ membership_id: membershipId })
  }
  return { providerUsable, adds, removes, skipped }
}

async function executeValidate(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  const provider = context.run.destination === 'google_ads_customer_match'
    ? await validateGoogle(context)
    : await validateMeta(context)
  await insertSyncEvents(supabase, {
    run: context.run,
    operation: 'validate',
    status: 'completed',
    metadata: provider,
  })
  await updateRun(supabase, context.run.id, {
    status: 'completed',
    started_at: context.run.status === 'running' ? undefined : new Date().toISOString(),
    finished_at: new Date().toISOString(),
    response_summary: provider,
    errors: 0,
  })
  return provider
}

async function executeApply(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  if (!context.run.approval_token_hash) throw new Error('apply_run_missing_approval_hash')
  const diff = await computeDiff(supabase, context)
  const platformAudience = context.run.destination === 'google_ads_customer_match'
    ? await ensureGoogleUserList(supabase, context)
    : await ensureMetaAudience(supabase, context)

  const addResponse = context.run.destination === 'google_ads_customer_match'
    ? await uploadGoogleCustomerMatch(context, (platformAudience as { resourceName: string }).resourceName, 'add', diff.adds)
    : await uploadMetaCustomAudience(context, (platformAudience as { id: string }).id, 'add', diff.adds)
  const removeResponse = context.run.destination === 'google_ads_customer_match'
    ? await uploadGoogleCustomerMatch(context, (platformAudience as { resourceName: string }).resourceName, 'remove', diff.removes)
    : await uploadMetaCustomAudience(context, (platformAudience as { id: string }).id, 'remove', diff.removes)

  if (diff.adds.length) {
    await insertSyncEvents(supabase, {
      run: context.run,
      operation: 'add',
      status: 'completed',
      identities: diff.adds,
      metadata: { platform_audience_id: (platformAudience as { id?: string }).id ?? null },
    })
  }
  if (diff.removes.length) {
    await insertSyncEvents(supabase, {
      run: context.run,
      operation: 'remove',
      status: 'completed',
      identities: diff.removes,
      metadata: { platform_audience_id: (platformAudience as { id?: string }).id ?? null },
    })
  }
  if (diff.skipped.length) {
    await insertSyncEvents(supabase, {
      run: context.run,
      operation: 'skip',
      status: 'skipped',
      identities: diff.skipped,
      reason: context.run.destination === 'google_ads_customer_match' ? 'missing_email_or_phone_for_contact_info_list' : 'missing_usable_identity',
    })
  }

  const summary = {
    provider: context.run.destination,
    platform_audience_id: (platformAudience as { id?: string }).id ?? (platformAudience as { resourceName?: string }).resourceName ?? null,
    adds: diff.adds.length,
    removes: diff.removes.length,
    skips: diff.skipped.length,
    usable_identities: diff.providerUsable.length,
    add_response: summarizeProviderResponse(addResponse),
    remove_response: summarizeProviderResponse(removeResponse),
  }
  await updateRun(supabase, context.run.id, {
    status: 'completed',
    finished_at: new Date().toISOString(),
    adds: diff.adds.length,
    removes: diff.removes.length,
    skips: diff.skipped.length,
    errors: 0,
    response_summary: summary,
  })
  return summary
}

function summarizeProviderResponse(response: unknown) {
  if (!response) return null
  const record = readRecord(response)
  return {
    job_resource_name: readString(record, 'job_resource_name'),
    batches: typeof record.batches === 'number' ? record.batches : undefined,
    has_response: true,
  }
}

async function executeReconcile(supabase: ReturnType<typeof createClient>, context: ProviderContext) {
  const expectedActive = context.run.destination === 'google_ads_customer_match'
    ? context.identities.filter(hasGoogleContactIdentity).length
    : context.identities.filter(hasMetaIdentity).length
  let provider: Record<string, unknown>
  if (context.run.destination === 'google_ads_customer_match') {
    const cfg = googleConfig(context.contract, context.binding)
    const userListId = stripId(context.binding.platform_audience_id)
    if (!userListId) throw new Error('missing_google_platform_audience_id_for_reconcile')
    const response = await googleFetch(context.contract, context.binding, `customers/${cfg.customerId}/googleAds:searchStream`, {
      query: `SELECT user_list.id, user_list.name, user_list.size_for_search, user_list.size_for_display, user_list.membership_status FROM user_list WHERE user_list.id = ${userListId}`,
    })
    const result = Array.isArray(response) ? response.flatMap((batch) => batch.results ?? [])[0]?.userList ?? null : null
    provider = { provider: context.run.destination, expected_active: expectedActive, user_list: result }
  } else {
    const audienceId = context.binding.platform_audience_id
    if (!audienceId) throw new Error('missing_meta_platform_audience_id_for_reconcile')
    const response = await metaFetch(context.contract, context.binding, audienceId, {
      params: { fields: 'id,name,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,operation_status' },
    })
    provider = { provider: context.run.destination, expected_active: expectedActive, custom_audience: response }
  }
  await insertSyncEvents(supabase, {
    run: context.run,
    operation: 'reconcile',
    status: 'completed',
    metadata: provider,
  })
  await updateRun(supabase, context.run.id, {
    status: 'completed',
    finished_at: new Date().toISOString(),
    response_summary: provider,
    errors: 0,
  })
  return provider
}

async function executeProviderRuns(supabase: ReturnType<typeof createClient>, runs: SyncRun[]) {
  const results = []
  for (const run of runs) {
    if (!['queued', 'running'].includes(run.status)) {
      results.push({ run_id: run.id, skipped: true, reason: `status_${run.status}` })
      continue
    }
    await updateRun(supabase, run.id, { status: 'running', started_at: new Date().toISOString() })
    try {
      const context = await loadProviderContext(supabase, { ...run, status: 'running' })
      const result = run.mode === 'validate'
        ? await executeValidate(supabase, context)
        : run.mode === 'apply'
          ? await executeApply(supabase, context)
          : run.mode === 'reconcile'
            ? await executeReconcile(supabase, context)
            : { provider: run.destination, dry_run: true }
      results.push({ run_id: run.id, ok: true, mode: run.mode, destination: run.destination, result })
    } catch (error) {
      const detail = redactError(error)
      await updateRun(supabase, run.id, {
        status: 'failed',
        finished_at: new Date().toISOString(),
        errors: 1,
        error: detail,
      })
      results.push({ run_id: run.id, ok: false, mode: run.mode, destination: run.destination, error: detail })
    }
  }
  return results
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
    const runIds = normalizeList<string>(undefined, payload.run_ids, [])

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    })

    const dryRun = mode !== 'apply'
    const materializationResults = []
    const queuedRuns: QueuedRunInput[] = []

    if (runIds.length === 0) {
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
    }

    const runsToExecute = payload.execute_provider
      ? await loadRunsByIds(supabase, runIds.length ? runIds : queuedRuns.map((run) => run.run_id))
      : []
    const providerResults = payload.execute_provider
      ? await executeProviderRuns(supabase, runsToExecute)
      : []

    return jsonResponse({
      ok: true,
      account_id: accountId,
      mode,
      dry_run: dryRun,
      execute_provider: Boolean(payload.execute_provider),
      materialization: materializationResults,
      queued_runs: queuedRuns,
      provider_results: providerResults,
    })
  } catch (error) {
    return jsonResponse({ error: 'sync_crm_audiences_failed', detail: redactError(error) }, 500)
  }
})
