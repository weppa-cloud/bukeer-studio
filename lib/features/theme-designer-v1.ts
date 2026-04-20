import type { ThemeV3 } from '@bukeer/website-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('features.theme-designer-v1');

const ThemeDesignerV1FlagResolutionSchema = z.object({
  enabled: z.boolean(),
  scope: z.enum(['website', 'account', 'default']).default('default'),
});

const ThemeV3Schema = z.object({
  tokens: z.record(z.string(), z.unknown()),
  profile: z.record(z.string(), z.unknown()),
});

export type ThemeDesignerV1FlagResolution = z.infer<typeof ThemeDesignerV1FlagResolutionSchema>;

export type ThemeSelectionSource =
  | 'website_theme_flag_on'
  | 'snapshot_fallback'
  | 'website_theme_default';

const DEFAULT_RESOLUTION: ThemeDesignerV1FlagResolution = {
  enabled: false,
  scope: 'default',
};

export async function resolveThemeDesignerV1Flag(
  supabase: SupabaseClient,
  accountId: string,
  websiteId: string | null = null,
): Promise<ThemeDesignerV1FlagResolution> {
  const { data, error } = await supabase.rpc('resolve_theme_designer_v1', {
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

  const parsed = ThemeDesignerV1FlagResolutionSchema.safeParse(data);
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

export function parseThemeSnapshot(snapshot: unknown): ThemeV3 | null {
  const parsed = ThemeV3Schema.safeParse(snapshot);
  if (!parsed.success) return null;
  return parsed.data as ThemeV3;
}

export function selectPublicThemeForDesignerFlag(params: {
  currentTheme: ThemeV3;
  snapshotTheme: unknown;
  flagResolution: ThemeDesignerV1FlagResolution;
}): { theme: ThemeV3; source: ThemeSelectionSource } {
  const { currentTheme, snapshotTheme, flagResolution } = params;

  if (flagResolution.enabled) {
    return { theme: currentTheme, source: 'website_theme_flag_on' };
  }

  const fallbackTheme = parseThemeSnapshot(snapshotTheme);
  if (fallbackTheme) {
    return { theme: fallbackTheme, source: 'snapshot_fallback' };
  }

  return { theme: currentTheme, source: 'website_theme_default' };
}
