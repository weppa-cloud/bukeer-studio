import type {
  MarketingFieldName,
  StudioEditorV2FlagResolution,
} from '@bukeer/website-contract';
import { StudioEditorV2FlagResolutionSchema } from '@bukeer/website-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('features.studio-editor-v2');

const DEFAULT_RESOLUTION: StudioEditorV2FlagResolution = {
  enabled: false,
  fields: [],
  scope: 'default',
};

export async function resolveStudioEditorV2Flag(
  supabase: SupabaseClient,
  accountId: string,
  websiteId: string | null = null,
): Promise<StudioEditorV2FlagResolution> {
  const { data, error } = await supabase.rpc('resolve_studio_editor_v2', {
    p_account_id: accountId,
    p_website_id: websiteId,
  });

  if (error) {
    log.error('rpc_resolve_failed', {
      account_id: accountId,
      website_id: websiteId,
      error: error.message,
    });
    return DEFAULT_RESOLUTION;
  }

  const parsed = StudioEditorV2FlagResolutionSchema.safeParse(data);
  if (!parsed.success) {
    log.error('rpc_resolve_parse_failed', {
      account_id: accountId,
      website_id: websiteId,
      issues: parsed.error.issues,
    });
    return DEFAULT_RESOLUTION;
  }

  return parsed.data;
}

export function isStudioFieldEnabled(
  resolution: StudioEditorV2FlagResolution,
  field: MarketingFieldName,
): boolean {
  if (resolution.fields.includes(field)) return true;
  if (resolution.enabled) return true;
  return false;
}

export function whichSurface(
  resolution: StudioEditorV2FlagResolution,
  field: MarketingFieldName,
): 'studio' | 'flutter' {
  return isStudioFieldEnabled(resolution, field) ? 'studio' : 'flutter';
}
