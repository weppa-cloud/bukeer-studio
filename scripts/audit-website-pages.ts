/**
 * Audit custom pages + websites.content for a pilot website.
 *
 * Emits markdown report to stdout. Reproduces the audit landed under
 * EPIC #262 child-5 (#267) so future pilots can re-run.
 *
 * Usage: `npx tsx scripts/audit-website-pages.ts <website_id>`
 *        (defaults to colombiatours pilot).
 */

import { createClient } from '@supabase/supabase-js';
import process from 'node:process';

const PILOT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const PILOT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';

const websiteId = process.argv[2] ?? PILOT_WEBSITE_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: pages, error: pagesErr } = await client
    .from('website_pages')
    .select('id, slug, title, page_type, locale, is_published, intro_content, sections, hero_config, seo_title, seo_description, seo_keywords')
    .eq('website_id', websiteId)
    .eq('page_type', 'custom')
    .order('slug');
  if (pagesErr) throw pagesErr;

  const { data: websiteRow, error: wErr } = await client
    .from('websites')
    .select('id, subdomain, default_locale, supported_locales, content')
    .eq('id', websiteId)
    .single();
  if (wErr) throw wErr;

  const contentBytes = websiteRow.content ? JSON.stringify(websiteRow.content).length : 0;

  console.log(`# Website page audit — ${websiteRow.subdomain} (${websiteId})\n`);
  console.log(`- default_locale: ${websiteRow.default_locale}`);
  console.log(`- supported_locales: ${JSON.stringify(websiteRow.supported_locales)}`);
  console.log(`- content JSONB size (text): ${contentBytes} bytes`);
  console.log(`- custom pages: ${pages?.length ?? 0}\n`);

  console.log('## Custom pages\n');
  console.log('| Slug | Published | Locale | Intro (chars) | Sections (blocks) | Hero image | SEO meta | Keywords |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const p of pages ?? []) {
    const introChars = typeof (p.intro_content as { text?: string } | null)?.text === 'string'
      ? String((p.intro_content as { text: string }).text).length
      : 0;
    const sections = Array.isArray(p.sections) ? p.sections.length : 0;
    const heroCfg = p.hero_config as { image?: string; backgroundImage?: string } | null;
    const heroImage = heroCfg ? Boolean(heroCfg.image || heroCfg.backgroundImage) : false;
    const keywords = Array.isArray(p.seo_keywords) ? p.seo_keywords.length : 0;
    const seoOk = Boolean(p.seo_title) && Boolean(p.seo_description);
    console.log(
      `| \`${p.slug}\` | ${p.is_published ? '✅' : '❌'} | ${p.locale} | ${introChars} | ${sections} | ${heroImage ? '✅' : '❌'} | ${seoOk ? '✅' : '❌'} | ${keywords} |`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
