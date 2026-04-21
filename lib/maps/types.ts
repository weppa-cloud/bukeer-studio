export type MapMarkerKind =
  | 'destination'
  | 'hotel'
  | 'activity'
  | 'service'
  | 'stop'
  | 'pkg';

export type MapViewportPreset = 'colombia' | 'destination-detail';
export type MapRenderMode = 'auto' | 'croquis';

export interface MapMarker {
  id: string;
  label: string;
  kind: MapMarkerKind;
  lat: number;
  lng: number;
  slug?: string;
  meta?: Record<string, unknown>;
}

export type MarkerFilter = 'all' | MapMarkerKind;
