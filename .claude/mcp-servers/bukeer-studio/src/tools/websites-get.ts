import type { z } from 'zod';
import { GetWebsiteSchema } from '../schemas.js';
import { getSupabaseAdmin } from '../supabase.js';

export const InputSchema = GetWebsiteSchema;

const SELECT =
  'id, account_id, subdomain, name, theme, locale, language, supported_locales, default_locale';

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  const admin = getSupabaseAdmin();
  const query = admin.from('websites').select(SELECT);
  const { data, error } = await (input.byId
    ? query.eq('id', input.byId).maybeSingle()
    : query.eq('subdomain', input.bySubdomain!).maybeSingle());
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) throw new Error('Website not found.');
  return data;
}
