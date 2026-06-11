import { sanitizeInternalRedirect } from '@/lib/auth/safe-redirect';

describe('sanitizeInternalRedirect', () => {
  it('allows same-origin path redirects with query and hash', () => {
    expect(sanitizeInternalRedirect('/admin/products?city=cartagena#rates')).toBe(
      '/admin/products?city=cartagena#rates',
    );
  });

  it('rejects absolute and protocol-relative redirects', () => {
    expect(sanitizeInternalRedirect('https://evil.example/phish')).toBe('/dashboard');
    expect(sanitizeInternalRedirect('//evil.example/phish')).toBe('/dashboard');
  });

  it('rejects malformed or non-path values', () => {
    expect(sanitizeInternalRedirect('dashboard')).toBe('/dashboard');
    expect(sanitizeInternalRedirect('/admin\\evil')).toBe('/dashboard');
    expect(sanitizeInternalRedirect('/admin\u0000evil')).toBe('/dashboard');
  });
});
