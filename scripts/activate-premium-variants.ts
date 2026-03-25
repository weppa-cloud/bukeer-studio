/**
 * Script to activate premium variants for colombiatours
 * Run with: npx tsx scripts/activate-premium-variants.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzlxbpicdcdvxvdcvgas.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/activate-premium-variants.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function activatePremiumVariants() {
  console.log('Activating premium variants for colombiatours...\n');

  // Get website ID
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id')
    .eq('subdomain', 'colombiatours')
    .single();

  if (websiteError || !website) {
    console.error('Website not found:', websiteError);
    return;
  }

  console.log('Website ID:', website.id);

  const updates = [
    { section_type: 'hero', variant: 'parallax', description: 'Scroll parallax effect' },
    { section_type: 'destinations', variant: 'tilt', description: '3D tilt cards on hover' },
    { section_type: 'testimonials', variant: 'infinite', description: 'Infinite marquee animation' },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('website_sections')
      .update({ variant: update.variant })
      .eq('website_id', website.id)
      .eq('section_type', update.section_type);

    if (error) {
      console.error(`❌ ${update.section_type}: ${error.message}`);
    } else {
      console.log(`✅ ${update.section_type} → ${update.variant} (${update.description})`);
    }
  }

  // Verify updates
  console.log('\n--- Verification ---');
  const { data: sections } = await supabase
    .from('website_sections')
    .select('section_type, variant')
    .eq('website_id', website.id)
    .in('section_type', ['hero', 'destinations', 'testimonials']);

  console.table(sections);
}

activatePremiumVariants();
