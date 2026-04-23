/**
 * Wave 1.1 plumbing — snapshot parity via unit test.
 *
 * We chose a UNIT test (simpler and hermetic) over an SSR integration
 * snapshot. The plumbing's non-regression guarantee for generic sites rests
 * entirely on `resolveTemplateSet` returning `null` for all current shapes.
 * The renderer uses that null to pick the exact same generic `Component`
 * path it used before the plumbing change (see render-section.tsx step 4b
 * and the conditional wrapper in app/site/[subdomain]/layout.tsx).
 *
 * Therefore: if `resolveTemplateSet` returns `null` for every realistic
 * generic-site shape (missing metadata, legacy v2 theme, null fields, etc.),
 * both the renderer and the layout skip the editorial path, which is
 * byte-identical to the pre-plumbing behavior.
 */

import {
  KNOWN_TEMPLATE_SETS,
  isKnownTemplateSet,
  resolveTemplateSet,
} from '@/lib/sections/template-set';

describe('KNOWN_TEMPLATE_SETS', () => {
  it('declares editorial-v1 as a known template set', () => {
    expect(KNOWN_TEMPLATE_SETS).toContain('editorial-v1');
  });
});

describe('isKnownTemplateSet', () => {
  it('accepts editorial-v1', () => {
    expect(isKnownTemplateSet('editorial-v1')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isKnownTemplateSet('editorial-v2')).toBe(false);
    expect(isKnownTemplateSet('foo')).toBe(false);
    expect(isKnownTemplateSet('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isKnownTemplateSet(undefined)).toBe(false);
    expect(isKnownTemplateSet(null)).toBe(false);
    expect(isKnownTemplateSet(123)).toBe(false);
    expect(isKnownTemplateSet({})).toBe(false);
  });
});

describe('resolveTemplateSet — parity with pre-plumbing (null outcomes)', () => {
  it('returns null for null/undefined input', () => {
    expect(resolveTemplateSet(null)).toBeNull();
    expect(resolveTemplateSet(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(resolveTemplateSet('string')).toBeNull();
    expect(resolveTemplateSet(42)).toBeNull();
  });

  it('returns null when theme is missing (website created without theme yet)', () => {
    expect(resolveTemplateSet({})).toBeNull();
    expect(resolveTemplateSet({ theme: null })).toBeNull();
    expect(resolveTemplateSet({ theme: undefined })).toBeNull();
  });

  it('returns null when profile is missing (legacy v2 theme shape)', () => {
    expect(resolveTemplateSet({ theme: {} })).toBeNull();
    expect(resolveTemplateSet({ theme: { tokens: {} } })).toBeNull();
    expect(resolveTemplateSet({ theme: { profile: null } })).toBeNull();
  });

  it('returns null when metadata is missing', () => {
    expect(
      resolveTemplateSet({ theme: { profile: {} } }),
    ).toBeNull();
    expect(
      resolveTemplateSet({ theme: { profile: { metadata: null } } }),
    ).toBeNull();
  });

  it('returns null when metadata.templateSet is missing', () => {
    expect(
      resolveTemplateSet({ theme: { profile: { metadata: {} } } }),
    ).toBeNull();
  });

  it('returns null when metadata.templateSet is an unknown value', () => {
    expect(
      resolveTemplateSet({
        theme: { profile: { metadata: { templateSet: 'editorial-v2' } } },
      }),
    ).toBeNull();
    expect(
      resolveTemplateSet({
        theme: { profile: { metadata: { templateSet: '' } } },
      }),
    ).toBeNull();
    expect(
      resolveTemplateSet({
        theme: { profile: { metadata: { templateSet: 123 } } },
      }),
    ).toBeNull();
  });
});

describe('resolveTemplateSet — opt-in', () => {
  it('returns editorial-v1 when declared in profile.metadata', () => {
    const website = {
      theme: {
        tokens: {},
        profile: {
          metadata: { templateSet: 'editorial-v1' },
        },
      },
    };
    expect(resolveTemplateSet(website)).toBe('editorial-v1');
  });

  it('ignores sibling metadata keys and still resolves', () => {
    const website = {
      theme: {
        profile: {
          metadata: {
            templateSet: 'editorial-v1',
            other: 'ignored',
            nested: { deeper: true },
          },
        },
      },
    };
    expect(resolveTemplateSet(website)).toBe('editorial-v1');
  });
});

describe('resolveTemplateSet — colombiatours fallback', () => {
  it('returns editorial-v1 for colombiatours when metadata is missing', () => {
    const website = {
      subdomain: 'colombiatours',
      theme: {
        tokens: {},
        profile: {},
      },
    };
    expect(resolveTemplateSet(website)).toBe('editorial-v1');
  });

  it('returns editorial-v1 for colombiatours when metadata.templateSet is invalid', () => {
    const website = {
      custom_domain: 'colombiatours.travel',
      theme: {
        profile: {
          metadata: { templateSet: 'editorial-v2' },
        },
      },
    };
    expect(resolveTemplateSet(website)).toBe('editorial-v1');
  });
});
