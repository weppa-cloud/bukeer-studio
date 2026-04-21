import { z } from 'zod';

/**
 * Editorial v1 brand claims — dynamic aggregates surfaced on editorial
 * landing sections (hero, trust_bar, about, stats, planners).
 *
 * Produced by the `public.get_brand_claims(p_account_id uuid)` SQL RPC.
 * Every field is nullable because the backing data may be missing for a
 * given account (e.g. no Google reviews connected, no founded_year set).
 */
export const BrandClaimsSchema = z.object({
  /** Years since the agency was founded (now - accounts.founded_year). */
  yearsInOperation: z.number().int().min(0).max(200).nullable(),
  /** Distinct destinations present in the account catalog. */
  totalDestinations: z.number().int().min(0).nullable(),
  /** Total package kits belonging to the account. */
  totalPackages: z.number().int().min(0).nullable(),
  /** Total activities belonging to the account. */
  totalActivities: z.number().int().min(0).nullable(),
  /** Google Reviews average rating (0-5). */
  avgRating: z.number().min(0).max(5).nullable(),
  /** Google Reviews total review count. */
  totalReviews: z.number().int().min(0).nullable(),
  /** Satisfaction percentage derived from avg rating (avg × 20, clamped 0-100). */
  satisfactionPct: z.number().int().min(0).max(100).nullable(),
  /** Confirmed bookings linked to the account. */
  totalBookings: z.number().int().min(0).nullable(),
  /** Planners (contacts with show_on_website=true) attached to the account. */
  totalPlanners: z.number().int().min(0).nullable(),
  /** Future: average rating across planners; currently always null. */
  plannersAvgRating: z.number().min(0).max(5).nullable(),
});

export type BrandClaims = z.infer<typeof BrandClaimsSchema>;

/**
 * Row shape returned by the `get_brand_claims` RPC. Snake-case to mirror the
 * Postgres OUT-columns; callers normalise into `BrandClaims` via
 * `brandClaimsRowToClaims`.
 */
export const BrandClaimsRowSchema = z.object({
  years_in_operation: z.number().int().nullable(),
  total_destinations: z.number().int().nullable(),
  total_packages: z.number().int().nullable(),
  total_activities: z.number().int().nullable(),
  avg_rating: z.union([z.number(), z.string()]).nullable(),
  total_reviews: z.number().int().nullable(),
  satisfaction_pct: z.number().int().nullable(),
  total_bookings: z.number().int().nullable(),
  total_planners: z.number().int().nullable(),
  planners_avg_rating: z.union([z.number(), z.string()]).nullable(),
});

export type BrandClaimsRow = z.infer<typeof BrandClaimsRowSchema>;

/**
 * Normalise the raw RPC row into the camel-case `BrandClaims` contract.
 * Numeric casts tolerate Postgres returning numerics as strings.
 */
export function brandClaimsRowToClaims(row: BrandClaimsRow): BrandClaims {
  const numOrNull = (v: number | string | null): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  return {
    yearsInOperation: row.years_in_operation,
    totalDestinations: row.total_destinations,
    totalPackages: row.total_packages,
    totalActivities: row.total_activities,
    avgRating: numOrNull(row.avg_rating),
    totalReviews: row.total_reviews,
    satisfactionPct: row.satisfaction_pct,
    totalBookings: row.total_bookings,
    totalPlanners: row.total_planners,
    plannersAvgRating: numOrNull(row.planners_avg_rating),
  };
}

/**
 * Minimal featured destination shape consumed by editorial hero "Destino del mes".
 * Source: `destination_seo_overrides` rows with `is_featured = true`.
 */
export const FeaturedDestinationSchema = z.object({
  slug: z.string().min(1),
  headline: z.string().nullable(),
  tagline: z.string().nullable(),
  heroImageUrl: z.string().url().nullable(),
  featuredOrder: z.number().int().nullable(),
  customDescription: z.string().nullable().optional(),
  customSeoTitle: z.string().nullable().optional(),
});

export type FeaturedDestination = z.infer<typeof FeaturedDestinationSchema>;
