/**
 * Fetches schedule_data and slug for an activity by id.
 * Used by ItineraryItemRenderer variant 'Actividades'.
 */

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { ScheduleEntrySchema, type ScheduleEntry } from '@bukeer/website-contract';

export interface ActivityDetails {
  schedule_data: ScheduleEntry[];
  slug: string | null;
}

export async function getActivityDetails(
  activityId: string
): Promise<ActivityDetails | null> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from('activities')
      .select('schedule_data, slug')
      .eq('id', activityId)
      .single();

    if (error || !data) {
      return null;
    }

    const rawSchedule = Array.isArray(data.schedule_data) ? data.schedule_data : [];
    const scheduleResult = ScheduleEntrySchema.array().safeParse(rawSchedule);
    const schedule_data = scheduleResult.success ? scheduleResult.data : [];

    const slug = typeof data.slug === 'string' && data.slug.length > 0
      ? data.slug
      : null;

    return { schedule_data, slug };
  } catch {
    return null;
  }
}
