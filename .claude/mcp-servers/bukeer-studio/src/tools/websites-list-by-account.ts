import type { z } from 'zod';
import { ListWebsitesByAccountSchema } from '../schemas.js';
import { getSupabaseAdmin } from '../supabase.js';

export const InputSchema = ListWebsitesByAccountSchema;

const SELECT =
  'id, account_id, subdomain, name, theme, locale, language, supported_locales, default_locale';

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('websites')
    .select(SELECT)
    .eq('account_id', input.accountId)
    .order('subdomain', { ascending: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data ?? [];
}
