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

  it('uses dedicated French and German dictionaries instead of Spanish fallback', () => {
    const french = getPublicUiMessages('fr-FR');
    const german = getPublicUiMessages('de-DE');

    expect(french.nav.packages).toBe('Forfaits');
    expect(french.footer.company).toBe('Agence');
    expect(french.searchPage.placeholder).toContain('forfaits');
    expect(french.nav.packages).not.toBe('Paquetes');

    expect(german.nav.destinations).toBe('Reiseziele');
    expect(german.footer.company).toBe('Agentur');
    expect(german.searchPage.title).toBe('Wonach suchen Sie?');
    expect(german.footer.company).not.toMatch(/Compania|Compañía/);
  });

  it('keeps Spanish and Portuguese search titles polished with punctuation and accents', () => {
    expect(getPublicUiMessages('es-CO').searchPage.title).toBe('¿Qué estás buscando?');
    expect(getPublicUiMessages('pt-BR').searchPage.title).toBe('O que você está procurando?');
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
