import { createHash } from 'node:crypto'
import {
  hashAudienceIdentity,
  hasUsableIdentity,
  normalizeEmail,
  normalizePhone,
  sha256Hex,
} from '@/lib/growth/audiences/identity'

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

describe('audience identity hashing', () => {
  it('normalizes email before SHA-256 hashing', () => {
    expect(normalizeEmail('  Test.User+CRM@Example.COM ')).toBe('test.user+crm@example.com')
    expect(sha256Hex('test.user+crm@example.com')).toBe(hash('test.user+crm@example.com'))
  })

  it('normalizes phone to E.164 when country code is provided', () => {
    expect(normalizePhone('(310) 555-1234', '57')).toBe('+573105551234')
    expect(normalizePhone('+1 (212) 555-0100')).toBe('+12125550100')
  })

  it('hashes email, phone, and external id byte-for-byte', () => {
    const identity = hashAudienceIdentity({
      email: ' Buyer@Example.com ',
      phone: '(310) 555-1234',
      defaultCountryCode: '57',
      externalId: ' CONTACT-123 ',
    })

    expect(identity).toEqual({
      emailSha256: hash('buyer@example.com'),
      phoneSha256: hash('+573105551234'),
      externalIdSha256: hash('contact-123'),
    })
    expect(hasUsableIdentity(identity)).toBe(true)
  })

  it('detects unusable empty identities', () => {
    expect(hashAudienceIdentity({})).toEqual({})
    expect(hasUsableIdentity({})).toBe(false)
  })
})
