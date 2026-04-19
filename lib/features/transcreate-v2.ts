import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('features.transcreate-v2');

const TranscreateV2FlagResolutionSchema = z.object({
  enabled: z.boolean(),
  locales: z.array(z.string().min(2).max(16)).default([]),
  scope: z.enum(['website', 'default']).default('default'),
});

export type TranscreateV2FlagResolution = z.infer<typeof TranscreateV2FlagResolutionSchema>;

const DEFAULT_RESOLUTION: TranscreateV2FlagResolution = {
  enabled: false,
  locales: [],
  scope: 'default',
};

export async function resolveTranscreateV2Flag(
  supabase: SupabaseClient,
  websiteId: string,
  targetLocale: string,
): Promise<TranscreateV2FlagResolution> {
  if (typeof (supabase as { rpc?: unknown }).rpc !== 'function') {
    return DEFAULT_RESOLUTION;
  }

  const { data, error } = await supabase.rpc('resolve_transcreate_v2_flag', {
    p_website_id: websiteId,
    p_target_locale: targetLocale,
  });

  if (error) {
    log.error('rpc_resolve_failed', {
      website_id: websiteId,
      target_locale: targetLocale,
      error: error.message,
    });
    return DEFAULT_RESOLUTION;
  }

  const parsed = TranscreateV2FlagResolutionSchema.safeParse(data);
  if (!parsed.success) {
    log.error('rpc_resolve_parse_failed', {
      website_id: websiteId,
      target_locale: targetLocale,
      issues: parsed.error.issues,
    });
    return DEFAULT_RESOLUTION;
  }

  return parsed.data;
}

export function isTranscreateV2EnabledForLocale(flag: TranscreateV2FlagResolution): boolean {
  return flag.enabled;
}
