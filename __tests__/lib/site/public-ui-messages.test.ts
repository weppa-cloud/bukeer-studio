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
    const unsupported = getPublicUiMessages('fr-FR');

    expect(unsupported.nav.home).toBe(fallback.nav.home);
    expect(unsupported.global404.goHome).toBe(fallback.global404.goHome);
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
