import type { MapMarker } from '@/lib/maps/types';
import {
  classifyProductMarkerKind,
  deterministicOffsetCoordinates,
  filterMarkersByKind,
  toFiniteNumber,
} from '@/lib/maps/utils';

describe('maps utils', () => {
  it('returns deterministic fallback coordinates for same seed and kind', () => {
    const first = deterministicOffsetCoordinates(10.393, -75.483, 'pkg-1:service', 'service');
    const second = deterministicOffsetCoordinates(10.393, -75.483, 'pkg-1:service', 'service');

    expect(first).toEqual(second);
  });

  it('returns different fallback coordinates for different ids', () => {
    const first = deterministicOffsetCoordinates(10.393, -75.483, 'pkg-1:service', 'service');
    const second = deterministicOffsetCoordinates(10.393, -75.483, 'pkg-2:service', 'service');

    expect(first).not.toEqual(second);
  });

  it('classifies product type into marker kind', () => {
    expect(classifyProductMarkerKind('hotel')).toBe('hotel');
    expect(classifyProductMarkerKind('activity')).toBe('activity');
    expect(classifyProductMarkerKind('transfer')).toBe('service');
    expect(classifyProductMarkerKind('package')).toBe('service');
    expect(classifyProductMarkerKind('')).toBe('service');
  });

  it('filters markers by selected kind', () => {
    const markers: MapMarker[] = [
      { id: '1', label: 'A', kind: 'hotel', lat: 1, lng: 1 },
      { id: '2', label: 'B', kind: 'activity', lat: 2, lng: 2 },
      { id: '3', label: 'C', kind: 'service', lat: 3, lng: 3 },
    ];

    expect(filterMarkersByKind(markers, 'all')).toHaveLength(3);
    expect(filterMarkersByKind(markers, 'hotel').map((m) => m.id)).toEqual(['1']);
    expect(filterMarkersByKind(markers, 'activity').map((m) => m.id)).toEqual(['2']);
    expect(filterMarkersByKind(markers, 'service').map((m) => m.id)).toEqual(['3']);
  });

  it('parses finite numbers and rejects invalid values', () => {
    expect(toFiniteNumber(5.2)).toBe(5.2);
    expect(toFiniteNumber('8.55')).toBe(8.55);
    expect(toFiniteNumber('')).toBeNull();
    expect(toFiniteNumber('NaN')).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
  });
});

