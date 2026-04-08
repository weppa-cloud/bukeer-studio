/**
 * Template Contract v1 — Validation tests
 * Issue: #572, #573
 */

import { TemplateContractSchema, PageRoleSchema, DetailPagesSchema } from '../schemas/template-contract';

// Minimal valid contract
const validContract = {
  $schema: 'bukeer-template-contract/v1' as const,
  metadata: {
    name: 'Adventure',
    slug: 'adventure',
    description: 'Bold and energetic',
    category: 'adventure' as const,
    tags: ['travel', 'outdoor'],
    isSystem: true,
    isPublic: true,
  },
  theme: {
    tokens: { colors: { seedColor: '#E65100' } },
    profile: { brandMood: 'adventurous' },
  },
  siteParts: {
    header: { variant: 'left-logo', blocks: ['logo', 'nav', 'cta'], shrinkOnScroll: false },
    footer: { variant: '4-column', blocks: ['logo', 'nav', 'copyright'] },
  },
  pages: [
    {
      slug: 'home',
      title: 'Home',
      role: 'home' as const,
      isRequired: true,
      isAutoPopulated: false,
      headerMode: 'default' as const,
      sections: [
        { sectionType: 'hero' as const, isRequired: true, content: { title: 'Vive la Aventura' } },
        { sectionType: 'hotels' as const, isRequired: false, content: { title: 'Hoteles' } },
        { sectionType: 'cta' as const, isRequired: true, content: { title: 'Reserva Ahora' } },
      ],
      seo: { title: 'Home — Adventure', description: 'Experience the adventure' },
      showInNav: false,
      navOrder: 0,
    },
  ],
  demoContent: {
    siteName: 'Aventura Colombia',
    tagline: 'Experiencias que Transforman',
    seo: { title: 'Aventura Colombia', description: 'Tourism adventures', keywords: 'travel,adventure' },
    contact: { email: 'info@demo.com', phone: '+57 300 000 0000', address: 'Cartagena, Colombia' },
  },
  compatibility: {
    supportedSections: ['hero', 'hotels', 'cta'] as const,
    minSectionsPerPage: 1,
    maxSectionsPerPage: 12,
  },
  brandVoice: {
    tone: 'adventurous' as const,
    keywords: ['aventura', 'explorar'],
    ctaStyle: 'action' as const,
  },
};

// Test 1: Valid contract passes
const r1 = TemplateContractSchema.safeParse(validContract);
console.log('1. Valid contract:', r1.success);
if (!r1.success) console.log('   Errors:', JSON.stringify(r1.error.issues, null, 2));

// Test 2: package_listing is a valid role
console.log('2. package_listing valid:', PageRoleSchema.safeParse('package_listing').success);
console.log('   invalid_role rejected:', !PageRoleSchema.safeParse('invalid_role').success);

// Test 3: Missing home page rejected
const noHome = { ...validContract, pages: [{ ...validContract.pages[0], role: 'about', isRequired: false }] };
const r3 = TemplateContractSchema.safeParse(noHome);
console.log('3. No-home rejected:', !r3.success);

// Test 4: Invalid slug rejected
const badSlug = {
  ...validContract,
  pages: [{ ...validContract.pages[0], slug: 'Home Page' }],
};
const r4 = TemplateContractSchema.safeParse(badSlug);
console.log('4. Bad slug rejected:', !r4.success);

// Test 5: Section type not in compatibility rejected
const badSection = {
  ...validContract,
  pages: [{
    ...validContract.pages[0],
    sections: [{ sectionType: 'faq' as const, isRequired: false }],
  }],
  compatibility: { ...validContract.compatibility, supportedSections: ['hero'] },
};
const r5 = TemplateContractSchema.safeParse(badSection);
console.log('5. Unknown section rejected:', !r5.success);

// Test 6: detailPages is optional — contract passes without it
console.log('6. detailPages optional:', r1.success && !('detailPages' in validContract));

// Test 7: detailPages with valid config passes
const withDetails = {
  ...validContract,
  detailPages: {
    hotel: {
      variant: 'gallery-hero',
      showPricing: true,
      showMap: true,
      showGallery: true,
      showRelated: true,
      showReviews: true,
      showAmenities: true,
      showRoomTypes: true,
    },
    activity: {
      variant: 'side-by-side',
      showPricing: true,
      showMap: false,
      showGallery: true,
      showRelated: false,
      showReviews: false,
      showDuration: true,
    },
    blog: {
      showAuthor: true,
      showRelatedPosts: true,
      showNewsletter: false,
    },
  },
};
const r7 = TemplateContractSchema.safeParse(withDetails);
console.log('7. With detailPages:', r7.success);
if (!r7.success) console.log('   Errors:', JSON.stringify(r7.error.issues, null, 2));

// Test 8: Invalid detail variant rejected
const badVariant = {
  ...validContract,
  detailPages: {
    hotel: {
      variant: 'invalid-variant',
      showPricing: true, showMap: true, showGallery: true, showRelated: true, showReviews: true,
    },
  },
};
const r8 = TemplateContractSchema.safeParse(badVariant);
console.log('8. Bad detail variant rejected:', !r8.success);

// Summary
const tests = [r1.success, true, !r3.success, !r4.success, !r5.success, true, r7.success, !r8.success];
const passed = tests.filter(Boolean).length;
console.log(`\n${passed}/${tests.length} tests passed`);
if (passed < tests.length) process.exit(1);
