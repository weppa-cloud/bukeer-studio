import { formatDestinationProductCounts } from '@/components/maps/shared-marker';

describe('formatDestinationProductCounts', () => {
  it('formats destination popup counts in Spanish by default', () => {
    expect(formatDestinationProductCounts({ hotelCount: 2, activityCount: 5 })).toBe(
      'Hoteles: 2 · Actividades: 5',
    );
  });

  it('formats destination popup counts in pt-BR without Spanish chrome', () => {
    expect(formatDestinationProductCounts({ hotelCount: 2, activityCount: 5 }, 'pt-BR')).toBe(
      'Hotéis: 2 · Atividades: 5',
    );
  });
});
