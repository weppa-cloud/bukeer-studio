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
}

/**
 * Fetch travel planners (contacts) for a given account.
 * Only returns contacts with show_on_website=true and not soft-deleted.
 * Falls back to auth.users avatar_url when contact has no user_image.
 */
export async function getPlanners(accountId: string): Promise<PlannerData[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, last_name, user_image, user_rol, position, phone, phone2, user_id')
    .eq('account_id', accountId)
    .eq('show_on_website', true)
    .is('deleted_at', null)
    .order('name');

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

  return data.map(contact => ({
    id: contact.id,
    name: contact.name || '',
    lastName: contact.last_name || '',
    fullName: `${contact.name || ''} ${contact.last_name || ''}`.trim(),
    photo: contact.user_image || authPhotos[contact.id] || null,
    role: contact.user_rol,
    position: contact.position,
    phone: contact.phone || contact.phone2 || null,
    slug: slugify(`${contact.name || ''} ${contact.last_name || ''}`),
  }));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
