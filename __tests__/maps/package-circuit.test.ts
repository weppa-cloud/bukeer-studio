import { formatCircuitStops, getPackageCircuitStops, withCoords } from '@/lib/products/package-circuit';

describe('package circuit helpers', () => {
  it('uses itinerary items as primary source when they include known cities', () => {
    const stops = getPackageCircuitStops({
      itineraryItems: [
        { day: 1, title: 'Llegada a Bogota' },
        { day: 2, title: 'Vuelo a Cartagena' },
      ],
      name: 'Plan Colombia',
      destination: 'Medellin',
    });

    expect(stops).toEqual(['Bogota', 'Cartagena']);
  });

  it('falls back to package name when itinerary items are not present', () => {
    const stops = getPackageCircuitStops({
      name: 'Aventura Medellin Cartagena y Santa Marta',
    });

    expect(stops).toEqual(['Medellin', 'Cartagena', 'Santa Marta']);
  });

  it('formats circuit stops with truncation suffix', () => {
    const label = formatCircuitStops(['Bogota', 'Medellin', 'Cartagena', 'Santa Marta'], 3);
    expect(label).toBe('Bogota \u2192 Medellin \u2192 Cartagena +1');
  });

  it('maps known cities to coordinates preserving order', () => {
    const mapped = withCoords(['Pereira', 'Salento', 'Ciudad Inventada', 'Cartagena']);

    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toMatchObject({ city: 'Pereira', day: 1 });
    expect(mapped[1]).toMatchObject({ city: 'Salento', day: 2 });
    expect(mapped[2]).toMatchObject({ city: 'Cartagena', day: 4 });
  });
});
