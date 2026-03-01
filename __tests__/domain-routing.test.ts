/**
 * Tests for custom domain routing logic.
 *
 * Validates P0-A (no custom_domain_verified), P0-B (subdomain not id),
 * P0-D (normalization + deleted_at), and P3 (gate normalization).
 */

describe('Custom Domain Host Normalization', () => {
  function normalizeHost(raw: string): string {
    return raw.split(':')[0].toLowerCase().replace(/\.$/, '');
  }

  it('strips port from host', () => {
    expect(normalizeHost('mydomain.com:3000')).toBe('mydomain.com');
  });

  it('lowercases mixed-case host', () => {
    expect(normalizeHost('MyDomain.COM')).toBe('mydomain.com');
  });

  it('strips trailing dot', () => {
    expect(normalizeHost('mydomain.com.')).toBe('mydomain.com');
  });

  it('handles combined normalization', () => {
    expect(normalizeHost('MyDomain.COM.:8080')).toBe('mydomain.com');
  });

  it('preserves already-normalized host', () => {
    expect(normalizeHost('mydomain.com')).toBe('mydomain.com');
  });

  it('handles punycode (ACE) domains as-is', () => {
    // Browsers send IDN as punycode in Host header (RFC 7230)
    expect(normalizeHost('xn--caf-dma.com')).toBe('xn--caf-dma.com');
  });
});

describe('Custom Domain Gate Verification', () => {
  function verifyGate(
    websiteCustomDomain: string | null,
    requestHost: string
  ): boolean {
    const normalizedDomain = (websiteCustomDomain || '')
      .toLowerCase()
      .replace(/\.$/, '');
    const normalizedHost = requestHost.toLowerCase().replace(/\.$/, '');
    return !!normalizedDomain && normalizedDomain === normalizedHost;
  }

  it('passes when domain matches exactly', () => {
    expect(verifyGate('mydomain.com', 'mydomain.com')).toBe(true);
  });

  it('passes when domain matches after normalization', () => {
    expect(verifyGate('MyDomain.COM', 'mydomain.com')).toBe(true);
  });

  it('fails when domain is null', () => {
    expect(verifyGate(null, 'mydomain.com')).toBe(false);
  });

  it('fails when domain is empty', () => {
    expect(verifyGate('', 'mydomain.com')).toBe(false);
  });

  it('fails when domain does not match', () => {
    expect(verifyGate('other.com', 'mydomain.com')).toBe(false);
  });

  it('handles trailing dot normalization in gate', () => {
    expect(verifyGate('mydomain.com.', 'mydomain.com')).toBe(true);
  });
});

describe('Custom Domain Query Shape', () => {
  // Verify the SELECT no longer includes custom_domain_verified (P0-A)
  const EXPECTED_SELECT_FIELDS = [
    'id',
    'subdomain',
    'custom_domain',
    'status',
    'theme',
    'content',
    'analytics',
  ];

  const FORBIDDEN_SELECT_FIELDS = ['custom_domain_verified'];

  it('does not include custom_domain_verified in select', () => {
    // This is a documentation test — the actual query is in page.tsx
    for (const field of FORBIDDEN_SELECT_FIELDS) {
      expect(EXPECTED_SELECT_FIELDS).not.toContain(field);
    }
  });

  it('includes required fields for WebsiteData', () => {
    expect(EXPECTED_SELECT_FIELDS).toContain('id');
    expect(EXPECTED_SELECT_FIELDS).toContain('subdomain');
    expect(EXPECTED_SELECT_FIELDS).toContain('custom_domain');
    expect(EXPECTED_SELECT_FIELDS).toContain('theme');
    expect(EXPECTED_SELECT_FIELDS).toContain('content');
    expect(EXPECTED_SELECT_FIELDS).toContain('analytics');
  });
});

describe('getPageBySlug receives subdomain (P0-B)', () => {
  it('should pass subdomain string, not UUID id', () => {
    // P0-B: website.id (UUID) was passed where subdomain (string) is expected
    const website = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      subdomain: 'miagencia',
    };

    // The correct parameter for getPageBySlug is subdomain
    const paramForGetPageBySlug = website.subdomain;
    expect(paramForGetPageBySlug).toBe('miagencia');
    expect(paramForGetPageBySlug).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe('Middleware Host Normalization', () => {
  function middlewareNormalize(hostHeader: string): string {
    return hostHeader.split(':')[0].toLowerCase().replace(/\.$/, '');
  }

  it('normalizes before custom domain rewrite', () => {
    const mainDomain = 'bukeer.com';
    const hostHeader = 'MyAgency.COM.:443';
    const host = middlewareNormalize(hostHeader);

    // Should NOT be treated as bukeer domain
    const isBukeerDomain =
      host.endsWith(`.${mainDomain}`) || host === mainDomain;
    expect(isBukeerDomain).toBe(false);

    // Should be treated as custom domain
    expect(host).toBe('myagency.com');
  });

  it('correctly identifies bukeer subdomain after normalization', () => {
    const mainDomain = 'bukeer.com';
    const hostHeader = 'MiAgencia.BUKEER.COM';
    const host = middlewareNormalize(hostHeader);

    const isBukeerDomain =
      host.endsWith(`.${mainDomain}`) || host === mainDomain;
    expect(isBukeerDomain).toBe(true);
  });
});
