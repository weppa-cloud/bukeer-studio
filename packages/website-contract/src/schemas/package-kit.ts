/**
 * Package Kit contract schemas — issue #210.
 *
 * The canonical `slug` for a package_kit is a kebab-case string, unique per
 * account. During Phase 1/2 of #210 it is `nullable` to tolerate rows that
 * have not been backfilled yet (or have an unslugifiable name). Phase 3 will
 * tighten the DB to `NOT NULL` and we will drop `.nullable()` here then.
 */

import { z } from 'zod';

/**
 * Kebab-case slug pattern. Mirrors the DB CHECK constraint
 * `package_kits_slug_format` so app-layer validation fails fast before an
 * UPDATE reaches Postgres.
 */
export const PACKAGE_KIT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Zod schema for `package_kits.slug`. Nullable until Phase 3 (#210) makes
 * the column NOT NULL. Empty strings are rejected via `min(1)`.
 */
export const PackageKitSlugSchema = z
  .string()
  .min(1)
  .regex(PACKAGE_KIT_SLUG_REGEX, 'kebab-case only')
  .nullable();

export type PackageKitSlug = z.infer<typeof PackageKitSlugSchema>;
