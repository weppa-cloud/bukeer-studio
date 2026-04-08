/**
 * Roundtrip validation — Adventure template from production DB
 * Issue: #572, #577
 */

import { TemplateContractSchema, PageBlueprintSchema } from '../schemas/template-contract';

// The actual template_data from production (Adventure template)
const adventureTemplateData = {
  $schema: 'bukeer-template-contract/v1' as const,
  metadata: {
    name: 'Aventura',
    slug: 'adventure',
    description: 'Bold and energetic — for outdoor and adventure operators',
    category: 'adventure' as const,
    tags: ['travel', 'outdoor'],
    isSystem: true,
    isPublic: true,
  },
  theme: {
    tokens: { colors: { seedColor: '#E65100' } },
    profile: { brandMood: 'adventurous', typography: { headingFont: 'Montserrat', bodyFont: 'Open Sans' } },
  },
  siteParts: {
    header: { variant: 'left-logo', blocks: ['logo', 'nav', 'cta'], shrinkOnScroll: false },
    footer: { variant: '4-column', blocks: ['logo', 'nav', 'legal', 'contact', 'social', 'copyright'] },
  },
  pages: [
    {
      slug: 'home', title: 'Inicio', role: 'home' as const, pageType: 'static',
      isRequired: true, isAutoPopulated: false, headerMode: 'default' as const,
      showInNav: false, navOrder: 0,
      sections: [
        { sectionType: 'hero' as const, variant: 'wavy', isRequired: true, content: { title: 'Vive la Aventura' } },
        { sectionType: 'stats' as const, variant: 'default', isRequired: false, content: {} },
        { sectionType: 'destinations' as const, variant: 'tilt', isRequired: false, content: {} },
        { sectionType: 'hotels' as const, variant: 'default', isRequired: false, content: {} },
        { sectionType: 'activities' as const, variant: 'default', isRequired: false, content: {} },
        { sectionType: 'testimonials' as const, variant: 'stack', isRequired: false, content: {} },
        { sectionType: 'faq' as const, variant: 'default', isRequired: false, content: {} },
        { sectionType: 'cta' as const, variant: 'gradient', isRequired: true, content: {} },
      ],
      seo: { title: 'Aventura — Vive la Experiencia', description: 'Descubre aventuras únicas' },
    },
    {
      slug: 'nosotros', title: 'Nosotros', role: 'about' as const, pageType: 'static',
      isRequired: false, isAutoPopulated: false, headerMode: 'default' as const,
      showInNav: true, navLabel: 'Nosotros', navOrder: 1,
      sections: [
        { sectionType: 'hero_minimal' as const, isRequired: false, content: {} },
        { sectionType: 'about' as const, variant: 'split', isRequired: false, content: {} },
      ],
      seo: { title: 'Nosotros', description: 'Conoce nuestra historia' },
    },
    {
      slug: 'hoteles', title: 'Hoteles', role: 'hotel_listing' as const, pageType: 'category',
      isRequired: false, isAutoPopulated: true, headerMode: 'default' as const,
      showInNav: true, navLabel: 'Hoteles', navOrder: 2,
      sections: [
        { sectionType: 'hero_minimal' as const, isRequired: false, content: {} },
        { sectionType: 'hotels' as const, isRequired: false, content: {} },
      ],
      seo: { title: 'Hoteles', description: 'Alojamiento de calidad' },
    },
    {
      slug: 'actividades', title: 'Actividades', role: 'activity_listing' as const, pageType: 'category',
      isRequired: false, isAutoPopulated: true, headerMode: 'default' as const,
      showInNav: true, navLabel: 'Actividades', navOrder: 3,
      sections: [
        { sectionType: 'hero_minimal' as const, isRequired: false, content: {} },
        { sectionType: 'activities' as const, isRequired: false, content: {} },
      ],
      seo: { title: 'Actividades', description: 'Experiencias únicas' },
    },
    {
      slug: 'destinos', title: 'Destinos', role: 'destination_listing' as const, pageType: 'category',
      isRequired: false, isAutoPopulated: true, headerMode: 'default' as const,
      showInNav: true, navLabel: 'Destinos', navOrder: 4,
      sections: [
        { sectionType: 'hero_minimal' as const, isRequired: false, content: {} },
        { sectionType: 'destinations' as const, variant: 'tilt', isRequired: false, content: {} },
      ],
      seo: { title: 'Destinos', description: 'Los mejores destinos' },
    },
    {
      slug: 'contacto', title: 'Contacto', role: 'contact' as const, pageType: 'static',
      isRequired: true, isAutoPopulated: false, headerMode: 'default' as const,
      showInNav: true, navLabel: 'Contacto', navOrder: 6,
      sections: [
        { sectionType: 'hero_minimal' as const, isRequired: false, content: {} },
        { sectionType: 'contact_form' as const, isRequired: true, content: {} },
      ],
      seo: { title: 'Contacto', description: 'Contáctanos' },
    },
    {
      slug: 'legal', title: 'Legal', role: 'legal' as const, pageType: 'static',
      isRequired: false, isAutoPopulated: false, headerMode: 'minimal' as const,
      showInNav: false, navOrder: 99,
      sections: [
        { sectionType: 'rich_text' as const, isRequired: false, content: {} },
      ],
      seo: { title: 'Términos y Condiciones', description: 'Políticas legales' },
    },
  ],
  demoContent: {
    siteName: 'Aventura Colombia',
    tagline: 'Experiencias que Transforman',
    seo: { title: 'Aventura Colombia', description: 'Agencia de aventura', keywords: 'aventura, colombia' },
    contact: { email: 'info@aventura.com', phone: '+57 300 000 0000', address: 'Cartagena, Colombia' },
    social: { instagram: 'https://instagram.com/aventura', whatsapp: '+573000000000' },
  },
  compatibility: {
    supportedSections: [
      'hero', 'hero_minimal', 'stats', 'destinations', 'hotels', 'activities',
      'testimonials', 'faq', 'cta', 'about', 'contact_form', 'rich_text',
    ] as const,
    minSectionsPerPage: 1,
    maxSectionsPerPage: 12,
  },
  brandVoice: {
    tone: 'adventurous' as const,
    keywords: ['aventura', 'explorar', 'descubrir', 'experiencia'],
    ctaStyle: 'action' as const,
  },
  detailPages: {
    hotel: {
      variant: 'gallery-hero' as const,
      showPricing: true, showMap: true, showGallery: true,
      showRelated: true, showReviews: true, showAmenities: true, showRoomTypes: true,
    },
    activity: {
      variant: 'side-by-side' as const,
      showPricing: true, showMap: true, showGallery: true,
      showRelated: true, showReviews: false, showDuration: true, showDifficulty: true,
    },
  },
};

// Test 1: Full contract validates
const r1 = TemplateContractSchema.safeParse(adventureTemplateData);
console.log('1. Full Adventure contract validates:', r1.success);
if (!r1.success) console.log('   Errors:', JSON.stringify(r1.error.issues, null, 2));

// Test 2: 7 pages
console.log('2. Page count:', adventureTemplateData.pages.length, '=== 7:', adventureTemplateData.pages.length === 7);

// Test 3: Home page has 8 sections
const homeSections = adventureTemplateData.pages.find(p => p.role === 'home')?.sections.length;
console.log('3. Home sections:', homeSections, '=== 8:', homeSections === 8);

// Test 4: All page roles are valid
const roles = adventureTemplateData.pages.map(p => p.role);
console.log('4. Page roles:', roles.join(', '));

// Test 5: Each non-home page validates individually
let allPagesValid = true;
for (const page of adventureTemplateData.pages) {
  const r = PageBlueprintSchema.safeParse(page);
  if (!r.success) {
    console.log(`   Page "${page.slug}" FAILED:`, r.error.issues.map(i => i.message).join(', '));
    allPagesValid = false;
  }
}
console.log('5. All pages individually valid:', allPagesValid);

// Test 6: detailPages present
console.log('6. Has detailPages:', !!adventureTemplateData.detailPages);
console.log('   Hotel variant:', adventureTemplateData.detailPages?.hotel?.variant);
console.log('   Activity variant:', adventureTemplateData.detailPages?.activity?.variant);

// Summary
const tests = [r1.success, adventureTemplateData.pages.length === 7, homeSections === 8, true, allPagesValid, !!adventureTemplateData.detailPages];
const passed = tests.filter(Boolean).length;
console.log(`\n${passed}/${tests.length} tests passed`);
if (passed < tests.length) process.exit(1);
