import type { AudienceHashedIdentity } from './identity'

export type AudienceDestination = 'google_ads_customer_match' | 'meta_custom_audiences'
export type AudienceSyncMode = 'dry_run' | 'validate' | 'apply' | 'reconcile'
export type AudienceOperation = 'add' | 'remove'

export type AudienceDiff = {
  adds: string[]
  removes: string[]
  unchanged: string[]
}

export type GoogleCustomerMatchPayload = {
  userListResourceName: string
  operation: AudienceOperation
  validateOnly: boolean
  consent: {
    adUserData: 'GRANTED' | 'DENIED' | 'UNSPECIFIED'
    adPersonalization: 'GRANTED' | 'DENIED' | 'UNSPECIFIED'
  }
  operations: Array<{
    create?: { userIdentifiers: Array<Record<string, string>> }
    remove?: { userIdentifiers: Array<Record<string, string>> }
  }>
}

export type MetaCustomAudiencePayload = {
  audienceId: string
  operation: AudienceOperation
  schema: Array<'EMAIL_SHA256' | 'PHONE_SHA256' | 'EXTERN_ID'>
  data: string[][]
}

export function assertApplyApproved(mode: AudienceSyncMode, approvalToken?: string | null): void {
  if (mode === 'apply' && (!approvalToken || approvalToken.length < 16)) {
    throw new Error('CRM audience apply requires an explicit approval_token')
  }
}

export function partitionAudienceDiff(currentKeys: Iterable<string>, previousKeys: Iterable<string>): AudienceDiff {
  const current = new Set(currentKeys)
  const previous = new Set(previousKeys)
  const adds = [...current].filter((key) => !previous.has(key)).sort()
  const removes = [...previous].filter((key) => !current.has(key)).sort()
  const unchanged = [...current].filter((key) => previous.has(key)).sort()
  return { adds, removes, unchanged }
}

function toGoogleUserIdentifiers(identity: AudienceHashedIdentity): Array<Record<string, string>> {
  const identifiers: Array<Record<string, string>> = []
  if (identity.emailSha256) identifiers.push({ hashedEmail: identity.emailSha256 })
  if (identity.phoneSha256) identifiers.push({ hashedPhoneNumber: identity.phoneSha256 })
  if (identity.externalIdSha256) identifiers.push({ thirdPartyUserId: identity.externalIdSha256 })
  return identifiers
}

export function buildGoogleCustomerMatchPayload(options: {
  userListResourceName: string
  operation: AudienceOperation
  identities: AudienceHashedIdentity[]
  validateOnly?: boolean
  consentGranted?: boolean
}): GoogleCustomerMatchPayload {
  const operations = options.identities
    .map((identity) => toGoogleUserIdentifiers(identity))
    .filter((userIdentifiers) => userIdentifiers.length > 0)
    .map((userIdentifiers) => ({
      [options.operation === 'add' ? 'create' : 'remove']: { userIdentifiers },
    })) as GoogleCustomerMatchPayload['operations']

  const consentValue = options.consentGranted === false ? 'DENIED' : 'GRANTED'

  return {
    userListResourceName: options.userListResourceName,
    operation: options.operation,
    validateOnly: options.validateOnly ?? false,
    consent: {
      adUserData: consentValue,
      adPersonalization: consentValue,
    },
    operations,
  }
}

export function buildMetaCustomAudiencePayload(options: {
  audienceId: string
  operation: AudienceOperation
  identities: AudienceHashedIdentity[]
}): MetaCustomAudiencePayload {
  const schema: MetaCustomAudiencePayload['schema'] = ['EMAIL_SHA256', 'PHONE_SHA256', 'EXTERN_ID']
  const data = options.identities
    .map((identity) => [identity.emailSha256 ?? '', identity.phoneSha256 ?? '', identity.externalIdSha256 ?? ''])
    .filter((row) => row.some(Boolean))

  return {
    audienceId: options.audienceId,
    operation: options.operation,
    schema,
    data,
  }
}

export function redactAudienceSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/[A-Fa-f0-9]{64}/g, '[sha256-redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email-redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone-redacted]')
}
