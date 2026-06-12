import {
  assertApplyApproved,
  buildGoogleCustomerMatchPayload,
  buildMetaCustomAudiencePayload,
  partitionAudienceDiff,
  redactAudienceSyncError,
} from '@/lib/growth/audiences/connectors'

describe('audience sync connector helpers', () => {
  const identities = [
    { emailSha256: 'e'.repeat(64), phoneSha256: 'p'.repeat(64), externalIdSha256: 'x'.repeat(64) },
    { emailSha256: 'a'.repeat(64) },
  ]

  it('blocks apply without explicit approval token', () => {
    expect(() => assertApplyApproved('dry_run')).not.toThrow()
    expect(() => assertApplyApproved('validate')).not.toThrow()
    expect(() => assertApplyApproved('apply')).toThrow('approval_token')
    expect(() => assertApplyApproved('apply', 'approved-token-123456')).not.toThrow()
  })

  it('partitions audience diffs deterministically', () => {
    expect(partitionAudienceDiff(['b', 'a', 'c'], ['c', 'd', 'a'])).toEqual({
      adds: ['b'],
      removes: ['d'],
      unchanged: ['a', 'c'],
    })
  })

  it('builds Google Customer Match add and remove payloads separately', () => {
    const addPayload = buildGoogleCustomerMatchPayload({
      userListResourceName: 'customers/123/userLists/456',
      operation: 'add',
      identities,
      validateOnly: true,
      consentGranted: true,
    })
    const removePayload = buildGoogleCustomerMatchPayload({
      userListResourceName: 'customers/123/userLists/456',
      operation: 'remove',
      identities: [identities[0]],
    })

    expect(addPayload.validateOnly).toBe(true)
    expect(addPayload.consent).toEqual({ adUserData: 'GRANTED', adPersonalization: 'GRANTED' })
    expect(addPayload.operations).toHaveLength(2)
    expect(addPayload.operations[0]).toHaveProperty('create')
    expect(addPayload.operations[0]).not.toHaveProperty('remove')
    expect(removePayload.operations[0]).toHaveProperty('remove')
    expect(removePayload.operations[0]).not.toHaveProperty('create')
  })

  it('builds Meta custom audience payloads with hashed identifier schema only', () => {
    const payload = buildMetaCustomAudiencePayload({
      audienceId: '23800000000000000',
      operation: 'add',
      identities,
    })

    expect(payload.schema).toEqual(['EMAIL_SHA256', 'PHONE_SHA256', 'EXTERN_ID'])
    expect(payload.data).toHaveLength(2)
    expect(payload.data[0]).toEqual(['e'.repeat(64), 'p'.repeat(64), 'x'.repeat(64)])
  })

  it('redacts provider errors before persistence', () => {
    const redacted = redactAudienceSyncError(
      new Error(`failed for user@example.com +57 310 555 1234 ${'a'.repeat(64)}`)
    )

    expect(redacted).toContain('[email-redacted]')
    expect(redacted).toContain('[phone-redacted]')
    expect(redacted).toContain('[sha256-redacted]')
    expect(redacted).not.toContain('user@example.com')
  })
})
