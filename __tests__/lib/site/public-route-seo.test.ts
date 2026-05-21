import { getLocalizedLegalLookupSlug } from '@/lib/site/legal-route-seo';

describe('localized legal route SEO helpers', () => {
  it('strips the public locale segment before looking up localized legal CMS rows', () => {
    expect(
      getLocalizedLegalLookupSlug({
        localizedPathname: '/fr/conditions-generales',
        languageSegment: 'fr',
      }),
    ).toBe('conditions-generales');
  });

  it('strips a locale-derived segment when middleware does not thread x-public-locale-segment into metadata', () => {
    expect(
      getLocalizedLegalLookupSlug({
        localizedPathname: '/fr/conditions-generales',
        languageSegment: null,
        resolvedLocale: 'fr-FR',
        defaultLocale: 'es-CO',
      }),
    ).toBe('conditions-generales');
  });

  it('keeps unprefixed/default legal paths lookupable', () => {
    expect(
      getLocalizedLegalLookupSlug({
        localizedPathname: '/terminos-y-condiciones',
        languageSegment: null,
      }),
    ).toBe('terminos-y-condiciones');
  });
});
