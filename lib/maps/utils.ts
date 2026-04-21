import type { MapMarker, MapMarkerKind, MarkerFilter } from '@/lib/maps/types';

const KIND_BASE_OFFSETS: Record<MapMarkerKind, { lat: number; lng: number }> = {
  destination: { lat: 0, lng: 0 },
  hotel: { lat: 0.004, lng: -0.004 },
  activity: { lat: -0.004, lng: 0.004 },
  service: { lat: 0.003, lng: 0.003 },
  stop: { lat: 0, lng: 0 },
  pkg: { lat: 0, lng: 0 },
};

const KIND_LABELS: Record<MapMarkerKind, string> = {
  destination: 'Destino',
  hotel: 'Hotel',
  activity: 'Actividad',
  service: 'Servicio',
  stop: 'Parada',
  pkg: 'Paquete',
};

export function mapKindLabel(kind: MapMarkerKind): string {
  return KIND_LABELS[kind];
}

export function classifyProductMarkerKind(productType?: string | null): MapMarkerKind {
  const normalized = String(productType || '').toLowerCase().trim();
  if (normalized === 'hotel') return 'hotel';
  if (normalized === 'activity') return 'activity';
  if (normalized === 'destination') return 'destination';
  return 'service';
}

export function filterMarkersByKind(markers: MapMarker[], filter: MarkerFilter): MapMarker[] {
  if (filter === 'all') return markers;
  return markers.filter((marker) => marker.kind === filter);
}

function hashToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashToUnit(input: string): number {
  return hashToUint32(input) / 0xffffffff;
}

/**
 * Returns deterministic fallback coordinates around a base point.
 * Used when products do not include exact lat/lng in the public RPC.
 */
export function deterministicOffsetCoordinates(
  baseLat: number,
  baseLng: number,
  seed: string,
  kind: MapMarkerKind
): { lat: number; lng: number } {
  const kindOffset = KIND_BASE_OFFSETS[kind];
  if (kind === 'destination') {
    return { lat: baseLat, lng: baseLng };
  }

  const angle = hashToUnit(`${seed}:angle`) * Math.PI * 2;
  const radius = 0.006 + hashToUnit(`${seed}:radius`) * 0.01;
  const lat = baseLat + kindOffset.lat + Math.sin(angle) * radius;
  const lng = baseLng + kindOffset.lng + Math.cos(angle) * radius;

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

