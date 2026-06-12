import { getPackagesListingCopy } from '@/lib/site/packages-listing-copy';

describe('getPackagesListingCopy', () => {
  it('returns explicit fr-FR package listing metadata without Spanish leak markers', () => {
    const copy = getPackagesListingCopy('ColombiaTours', 'fr-FR');
    const serialized = JSON.stringify(copy).toLowerCase();

    expect(copy.title).toBe('Forfaits voyage');
    expect(copy.description).toBe(
      'Découvrez les forfaits voyage sélectionnés par ColombiaTours. Des séjours complets et personnalisés.',
    );
    expect(copy.packagesSegment).toBe('forfaits');
    expect(copy.packagesLabel).toBe('Forfaits');
    expect(copy.homeLabel).toBe('Accueil');
    expect(serialized).not.toContain('paquetes');
    expect(serialized).not.toContain('experiencias únicas');
    expect(serialized).not.toContain('paquetes a');
  });

  it('preserves Spanish defaults for es-CO routes', () => {
    const copy = getPackagesListingCopy('ColombiaTours', 'es-CO');

    expect(copy.title).toBe('Paquetes de Viaje');
    expect(copy.packagesSegment).toBe('paquetes');
    expect(copy.packagesLabel).toBe('Paquetes');
  });
});
