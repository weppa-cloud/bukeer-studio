import { createHash } from 'node:crypto'

export type AudienceIdentityInput = {
  email?: string | null
  phone?: string | null
  externalId?: string | null
  defaultCountryCode?: string
}

export type AudienceHashedIdentity = {
  emailSha256?: string
  phoneSha256?: string
  externalIdSha256?: string
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function normalizeEmail(value?: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase()
  return normalized || undefined
}

export function normalizePhone(value?: string | null, defaultCountryCode?: string): string | undefined {
  const raw = value?.trim()
  if (!raw) return undefined

  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return undefined

  if (hasPlus) return `+${digits}`

  const countryDigits = defaultCountryCode?.replace(/\D/g, '')
  if (countryDigits && digits.length === 10) {
    return `+${countryDigits}${digits}`
  }

  return digits
}

export function hashAudienceIdentity(input: AudienceIdentityInput): AudienceHashedIdentity {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone, input.defaultCountryCode)
  const externalId = input.externalId?.trim()

  return {
    ...(email ? { emailSha256: sha256Hex(email) } : {}),
    ...(phone ? { phoneSha256: sha256Hex(phone) } : {}),
    ...(externalId ? { externalIdSha256: sha256Hex(externalId.toLowerCase()) } : {}),
  }
}

export function hasUsableIdentity(identity: AudienceHashedIdentity): boolean {
  return Boolean(identity.emailSha256 || identity.phoneSha256 || identity.externalIdSha256)
}
