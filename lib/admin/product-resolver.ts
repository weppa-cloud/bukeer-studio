/**
 * W2 #216 — Product type resolver for Studio dashboard editors.
 *
 * Abstracts dual-table access for `/dashboard/[websiteId]/products/[slug]/*`
 * routes. Resolves a slug to either a `package_kits` row or an `activities`
 * row, preferring `package_kits` when both tables have a row with the same
 * slug under the same account (package precedence mirrors the existing
 * public URL namespace `/paquetes/[slug]` vs `/actividades/[slug]`).
 *
 * Hotels are intentionally NOT resolved here — per ADR-025 Hotels remain
 * Flutter-owner for the pilot and have no Studio editor surface.
 *
 * Related:
 *   - ADR-025 studio-flutter-field-ownership
 *   - #216 W2 AC-W2-10 (route + actions product-type-aware)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GalleryItem } from '@/components/admin/marketing/gallery-curator';

export type ProductEditorType = 'package' | 'activity';

export interface ProductEditorRow {
  id: string;
  account_id: string;
  slug: string;
  description: string | null;
  description_ai_generated: boolean | null;
  program_highlights: string[] | null;
  highlights_ai_generated: boolean | null;
  program_inclusions: string[] | null;
  program_exclusions: string[] | null;
  program_notes: string | null;
  program_meeting_info: string | null;
  program_gallery: GalleryItem[] | null;
  cover_image_url: string | null;
  video_url: string | null;
  video_caption: string | null;
  last_edited_by_surface: string | null;
}

export interface ResolvedProduct {
  productType: ProductEditorType;
  row: ProductEditorRow;
}

type ResolveMode = 'marketing' | 'content';

interface ResolveInput {
  accountId: string;
  slug: string;
  mode: ResolveMode;
}

const MARKETING_COLUMNS =
  'id, account_id, slug, description, description_ai_generated, program_highlights, highlights_ai_generated, program_inclusions, program_exclusions, program_notes, program_meeting_info, program_gallery, cover_image_url, video_url, video_caption, last_edited_by_surface';

const CONTENT_COLUMNS =
  'id, account_id, slug, video_url, video_caption, last_edited_by_surface';

export async function resolveProductRow(
  supabase: SupabaseClient,
  input: ResolveInput,
): Promise<ResolvedProduct | null> {
  const { accountId, slug, mode } = input;
  const columns = mode === 'marketing' ? MARKETING_COLUMNS : CONTENT_COLUMNS;

  const { data: pkg } = await supabase
    .from('package_kits')
    .select(columns)
    .eq('slug', slug)
    .eq('account_id', accountId)
    .maybeSingle();

  if (pkg) {
    return { productType: 'package', row: normalize(pkg as unknown as Record<string, unknown>) };
  }

  const { data: act } = await supabase
    .from('activities')
    .select(columns)
    .eq('slug', slug)
    .eq('account_id', accountId)
    .maybeSingle();

  if (act) {
    return { productType: 'activity', row: normalize(act as unknown as Record<string, unknown>) };
  }

  return null;
}

/**
 * Maps the typed DB columns into the common editor row shape. The marketing
 * editors receive the same field names regardless of product type — mismatches
 * between `package_kits` / `activities` column names (e.g. activities legacy
 * `inclutions`/`exclutions` typos) are bridged here as NULL-coalescing reads:
 * new parity columns shipped in migration 20260502031000 take precedence;
 * legacy typo'd columns stay on the row for Flutter back-compat (see ADR-025).
 */
function normalize(row: Record<string, unknown>): ProductEditorRow {
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    slug: String(row.slug ?? ''),
    description: (row.description as string | null) ?? null,
    description_ai_generated: (row.description_ai_generated as boolean | null) ?? null,
    program_highlights: (row.program_highlights as string[] | null) ?? null,
    highlights_ai_generated: (row.highlights_ai_generated as boolean | null) ?? null,
    program_inclusions: (row.program_inclusions as string[] | null) ?? null,
    program_exclusions: (row.program_exclusions as string[] | null) ?? null,
    program_notes: (row.program_notes as string | null) ?? null,
    program_meeting_info: (row.program_meeting_info as string | null) ?? null,
    program_gallery: (row.program_gallery as GalleryItem[] | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    video_url: (row.video_url as string | null) ?? null,
    video_caption: (row.video_caption as string | null) ?? null,
    last_edited_by_surface: (row.last_edited_by_surface as string | null) ?? null,
  };
}

/**
 * Public URL prefix for the product type — used by `revalidatePath`.
 */
export function publicPathPrefix(productType: ProductEditorType): '/paquetes' | '/actividades' {
  return productType === 'package' ? '/paquetes' : '/actividades';
}

/**
 * `website_product_pages.product_type` discriminator value.
 */
export function pageProductTypeValue(productType: ProductEditorType): 'package' | 'activity' {
  return productType;
}
