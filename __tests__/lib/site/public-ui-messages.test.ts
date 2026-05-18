import {
  DEFAULT_PUBLIC_UI_LOCALE,
  getPublicUiMessages,
  getPublicUiMessagesWithOverrides,
  resolvePublicUiLocale,
} from '@/lib/site/public-ui-messages';

describe('public-ui-messages', () => {
  it('resolves known locales', () => {
    expect(resolvePublicUiLocale('en-US')).toBe('en-US');
    expect(resolvePublicUiLocale('pt-BR')).toBe('pt-BR');
    expect(resolvePublicUiLocale('es-CO')).toBe('es-CO');
  });

  it('falls back to default locale for unsupported tokens', () => {
    const fallback = getPublicUiMessages(DEFAULT_PUBLIC_UI_LOCALE);
    const unsupported = getPublicUiMessages('it-IT');

    expect(unsupported.nav.home).toBe(fallback.nav.home);
    expect(unsupported.global404.goHome).toBe(fallback.global404.goHome);
  });

  it('localizes priority French and German public chrome instead of falling back to Spanish', () => {
    const fr = getPublicUiMessages('fr-FR');
    const de = getPublicUiMessages('de-DE');

    expect(fr.nav.home).toBe('Accueil');
    expect(fr.footer.planTrip).toBe('Planifier le voyage');
    expect(fr.searchPage.placeholder).toBe('Destinations, hôtels, activités, forfaits...');
    expect(fr.productDetail.searchButton).toBe('Rechercher');

    expect(de.nav.home).toBe('Startseite');
    expect(de.footer.planTrip).toBe('Reise planen');
    expect(de.searchPage.placeholder).toBe('Reiseziele, Hotels, Aktivitäten, Pakete...');
    expect(de.productDetail.searchButton).toBe('Suchen');
  });

  it('falls back missing nested keys to default locale and logs warning in non-production', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const withMissingKeys = getPublicUiMessagesWithOverrides('en-US', {
      'en-US': {
        nav: {
          home: 'Home',
        },
      } as any,
    });

    expect(withMissingKeys.nav.home).toBe('Home');
    expect(withMissingKeys.nav.destinations).toBe('Destinos');
    expect(warnSpy).toHaveBeenCalledWith(
      '[public-ui-messages:fallback]',
      expect.objectContaining({ locale: 'en-US', fallbackLocale: 'es-CO' }),
    );

    warnSpy.mockRestore();
  });
});
