import {
  evolucionFontImportCss,
  evolucionFontImports,
  evolucionThemeMetadata,
  getEvolucionThemeCss,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';

describe('admin-next Evolución theme bridge', () => {
  it('uses the Evolución preset compiled by theme-sdk', () => {
    expect(evolucionThemeMetadata.presetSlug).toBe('evolucion');
    expect(evolucionThemeMetadata.presetName).toBe('Evolución');
    expect(evolucionThemeMetadata.inputHash).toEqual(expect.any(String));
    expect(evolucionThemeMetadata.outputHash).toEqual(expect.any(String));
  });

  it('maps compiled M3 variables into the admin-next shell aliases', () => {
    const light = getEvolucionThemeStyle('light');
    const dark = getEvolucionThemeStyle('dark');

    expect(light['--primary' as keyof typeof light]).toBe(
      `hsl(${light['--bukeer-structural' as keyof typeof light]})`
    );
    expect(dark['--foreground' as keyof typeof dark]).toBe(
      `hsl(${dark['--bukeer-on-surface' as keyof typeof dark]})`
    );
    expect(dark['--bukeer-on-surface-color' as keyof typeof dark]).toBe(
      dark['--foreground' as keyof typeof dark]
    );
    expect(light['--bukeer-surface-rail' as keyof typeof light]).toBe(
      light['--surface-container-lowest' as keyof typeof light]
    );
    expect(light['--font-heading' as keyof typeof light]).toContain('Outfit');
    expect(light['--font-body' as keyof typeof light]).toContain('Readex Pro');
    expect(dark['--background' as keyof typeof dark]).not.toBe(
      light['--background' as keyof typeof light]
    );
    expect(light['--color-background' as keyof typeof light]).toBe(
      light['--background' as keyof typeof light]
    );
    expect(dark['--color-card' as keyof typeof dark]).toBe(
      dark['--card' as keyof typeof dark]
    );
    expect(dark['--color-background' as keyof typeof dark]).not.toBe(
      light['--color-background' as keyof typeof light]
    );
  });

  it('exposes compiled font imports and css for the Admin Next layout', () => {
    expect(evolucionFontImports.join('\n')).toContain('Outfit');
    expect(evolucionFontImports.join('\n')).toContain('Readex+Pro');
    expect(evolucionFontImportCss).toContain('@import url("');
    expect(evolucionFontImportCss).toContain('Readex+Pro');
    expect(getEvolucionThemeCss('light')).toContain('--font-heading');
    expect(getEvolucionThemeCss('dark')).toContain('--bukeer-surface-rail');
  });
});
