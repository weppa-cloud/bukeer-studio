import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function seedTestData() {
  // Create test account if not exists
  const { data: account } = await supabase
    .from('accounts')
    .upsert({
      id: 'e2e-test-account',
      name: 'E2E Test Agency',
    }, { onConflict: 'id' })
    .select()
    .single();

  // Create test website
  const { data: website } = await supabase
    .from('websites')
    .upsert({
      id: 'e2e-test-website',
      account_id: account?.id,
      subdomain: 'e2e-test',
      status: 'draft',
      template_id: 'blank',
      theme: {
        tokens: { colors: { seedColor: '#1976D2' } },
        profile: { brandMood: 'corporate' },
      },
      content: {
        siteName: 'E2E Test Site',
        tagline: 'Testing made easy',
        seo: { title: 'E2E Test', description: 'Test site', keywords: '' },
        contact: { email: 'test@test.com', phone: '', address: '' },
        social: {},
      },
      featured_products: { destinations: [], hotels: [], activities: [], transfers: [] },
      sections: [],
    }, { onConflict: 'id' })
    .select()
    .single();

  return { account, website };
}

export async function cleanupTestData() {
  await supabase.from('websites').delete().eq('id', 'e2e-test-website');
}
