/**
 * Contract tests for `package_kits.slug` — issue #210 Phase 1C.
 *
 * Mirrors the DB CHECK constraint `package_kits_slug_format`:
 *   slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *
 * Keeps app-layer rejection in sync with the DB so invalid slugs never round
 * trip to Postgres (fast-fail in the Studio server action layer).
 */

import {
  PACKAGE_KIT_SLUG_REGEX,
  PackageKitSlugSchema,
} from '@bukeer/website-contract';

describe('PackageKitSlugSchema (#210)', () => {
  it('accepts single-character slug', () => {
    expect(PackageKitSlugSchema.safeParse('a').success).toBe(true);
  });

  it('accepts kebab-case slug with digits', () => {
    expect(PackageKitSlugSchema.safeParse('cartagena-5-dias').success).toBe(true);
  });

  it('accepts all-numeric segment', () => {
    expect(PackageKitSlugSchema.safeParse('2024-trip').success).toBe(true);
  });

  it('accepts null during Phase 1/2 transition', () => {
    expect(PackageKitSlugSchema.safeParse(null).success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(PackageKitSlugSchema.safeParse('').success).toBe(false);
  });

  it('rejects strings with spaces', () => {
    expect(PackageKitSlugSchema.safeParse('Cartagena 5 dias').success).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(PackageKitSlugSchema.safeParse('CAPS').success).toBe(false);
    expect(PackageKitSlugSchema.safeParse('Mixed-Case').success).toBe(false);
  });

  it('rejects leading hyphen', () => {
    expect(PackageKitSlugSchema.safeParse('-leading').success).toBe(false);
  });

  it('rejects trailing hyphen', () => {
    expect(PackageKitSlugSchema.safeParse('trailing-').success).toBe(false);
  });

  it('rejects consecutive hyphens', () => {
    expect(PackageKitSlugSchema.safeParse('double--hyphen').success).toBe(false);
  });

  it('rejects non-ASCII / accented characters', () => {
    expect(PackageKitSlugSchema.safeParse('cartagena-5-días').success).toBe(false);
  });

  it('rejects underscores', () => {
    expect(PackageKitSlugSchema.safeParse('under_score').success).toBe(false);
  });

  it('exports regex that matches schema behavior', () => {
    // The regex constant is exported for reuse by Flutter-side validators
    // (ported manually) and Studio generators. Verify parity.
    expect(PACKAGE_KIT_SLUG_REGEX.test('cartagena-5-dias')).toBe(true);
    expect(PACKAGE_KIT_SLUG_REGEX.test('Bad Slug')).toBe(false);
  });
});
