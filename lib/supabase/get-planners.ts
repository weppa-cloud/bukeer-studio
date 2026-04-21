import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export interface PlannerData {
  id: string;
  name: string;
  lastName: string;
  fullName: string;
  photo: string | null;
  role: string | null;
  position: string | null;
  phone: string | null;
  slug: string;
  /**
   * Editorial-v1 — per-planner editorial quote (nullable).
   * Source: `contacts.quote` (added in migration 20260503000110).
   */
  quote: string | null;
  bio: string | null;
  specialty: string | null;
  /**
   * ISO-639-1 language code for the planner (fallback 'es').
   * Source: `contacts.language`.
   */
  language: string | null;
  translations?: Record<string, Record<string, unknown>>;
  // Planner profile fields (matrix PD-02..PD-07, migration planner_profile_columns_on_contacts)
  tripsCount: number | null;
  ratingAvg: number | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  regions: string[] | null;
  locationName: string | null;
  languages: string[] | null;
  signaturePackageId: string | null;
  personalDetails: Record<string, unknown> | null;
}

/**
 * Fetch travel planners (contacts) for a given account.
 * Only returns contacts with show_on_website=true and not soft-deleted.
 * Falls back to auth.users avatar_url when contact has no user_image.
 */
function resolvePlannerTranslationOverlay(
  translations: unknown,
  locale: string | null | undefined
): Record<string, unknown> | null {
  if (!translations || typeof translations !== 'object' || !locale) return null;
  const rows = translations as Record<string, unknown>;
  const exact = rows[locale];
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) {
    return exact as Record<string, unknown>;
  }
  const lang = locale.split('-')[0]?.toLowerCase();
  if (!lang) return null;
  for (const [key, value] of Object.entries(rows)) {
    if (!key.toLowerCase().startsWith(`${lang}-`)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function pickTranslatedString(overlay: Record<string, unknown> | null, keys: string[]): string | null {
  if (!overlay) return null;
  for (const key of keys) {
    const value = overlay[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export async function getPlanners(
  accountId: string,
  options: { locale?: string } = {}
): Promise<PlannerData[]> {
  const supabase = createSupabaseServiceRoleClient();
  const primary = await supabase
    .from('contacts')
    .select('id, name, last_name, user_image, user_rol, position, phone, phone2, user_id, quote, bio, specialty, language, translations, trips_count, rating_avg, years_experience, specialties, regions, location_name, languages, signature_package_id, personal_details')
    .eq('account_id', accountId)
    .eq('show_on_website', true)
    .is('deleted_at', null)
    .order('name');

  const fallback = primary.error
    ? await supabase
      .from('contacts')
      .select('id, name, last_name, user_image, user_rol, position, phone, phone2, user_id, quote, language, trips_count, rating_avg, years_experience, specialties, regions, location_name, languages, signature_package_id, personal_details')
      .eq('account_id', accountId)
      .eq('show_on_website', true)
      .is('deleted_at', null)
      .order('name')
    : null;

  const data = primary.data ?? fallback?.data;
  const error = primary.error ?? fallback?.error;
  if (error || !data) return [];

  // For contacts without user_image, fetch avatar from auth.users metadata
  const needsAuthPhoto = data.filter((c) => !c.user_image && c.user_id);
  const authPhotos: Record<string, string> = {};

  if (needsAuthPhoto.length > 0) {
    await Promise.all(
      needsAuthPhoto.map(async (contact) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(contact.user_id);
          const meta = authUser?.user?.user_metadata;
          const avatarUrl = meta?.avatar_url || meta?.picture;
          if (avatarUrl) authPhotos[contact.id] = avatarUrl;
        } catch {
          // Individual lookup failure is non-fatal
        }
      })
    );
  }

  return data.map(contact => {
    const row = contact as typeof contact & {
      quote?: string | null;
      bio?: string | null;
      specialty?: string | null;
      language?: string | null;
      translations?: Record<string, unknown> | null;
      trips_count?: number | null;
      rating_avg?: number | string | null;
      years_experience?: number | null;
      specialties?: string[] | null;
      regions?: string[] | null;
      location_name?: string | null;
      languages?: string[] | null;
      signature_package_id?: string | null;
      personal_details?: Record<string, unknown> | null;
    };
    const locale = options.locale ?? null;
    const overlay = resolvePlannerTranslationOverlay(row.translations, locale);
    const translatedBio = pickTranslatedString(overlay, ['bio']);
    const translatedSpecialty = pickTranslatedString(overlay, ['specialty']);
    const ratingRaw = row.rating_avg;
    const ratingAvg = ratingRaw == null ? null : typeof ratingRaw === 'number' ? ratingRaw : Number(ratingRaw);
    return {
      id: contact.id,
      name: contact.name || '',
      lastName: contact.last_name || '',
      fullName: `${contact.name || ''} ${contact.last_name || ''}`.trim(),
      photo: contact.user_image || authPhotos[contact.id] || null,
      role: contact.user_rol,
      position: contact.position,
      phone: contact.phone || contact.phone2 || null,
      slug: slugify(`${contact.name || ''} ${contact.last_name || ''}`),
      quote: row.quote ?? null,
      bio: translatedBio ?? row.bio ?? null,
      specialty: translatedSpecialty ?? row.specialty ?? null,
      language: row.language ?? null,
      translations: row.translations
        ? {
            ...(row.translations as Record<string, Record<string, unknown>>),
            ...(overlay && locale ? { [locale]: overlay } : {}),
          }
        : undefined,
      tripsCount: row.trips_count ?? null,
      ratingAvg: Number.isFinite(ratingAvg) ? (ratingAvg as number) : null,
      yearsExperience: row.years_experience ?? null,
      specialties: row.specialties ?? null,
      regions: row.regions ?? null,
      locationName: row.location_name ?? null,
      languages: row.languages ?? null,
      signaturePackageId: row.signature_package_id ?? null,
      personalDetails: row.personal_details ?? null,
    };
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
