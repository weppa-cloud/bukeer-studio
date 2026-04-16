'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Layer, Map, Marker, NavigationControl, Popup, Source, type MapRef } from '@vis.gl/react-maplibre';
import { COLOMBIA_BOUNDARY_GEOJSON } from '@/components/maps/colombia-boundary';
import { RouteMap } from '@/components/ui/route-map';
import type { MapMarker, MapMarkerKind, MapViewportPreset, MarkerFilter } from '@/lib/maps/types';
import { filterMarkersByKind, mapKindLabel } from '@/lib/maps/utils';

interface DestinationMapProps {
  markers: MapMarker[];
  height?: number;
  className?: string;
  viewportPreset?: MapViewportPreset;
  showFilters?: boolean;
  showLegend?: boolean;
}

const DEV_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
type ProductFilterKind = 'hotel' | 'activity' | 'service';

const MARKER_COLORS: Record<MapMarkerKind, string> = {
  destination: '#0f766e',
  hotel: '#2563eb',
  activity: '#16a34a',
  service: '#9333ea',
};

interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const COLOMBIA_VIEWPORT_BOUNDS: ViewportBounds = {
  minLat: -4.8,
  maxLat: 13.8,
  minLng: -81.85,
  maxLng: -66.8,
};

function resolveMapStyleUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  const token = process.env.NEXT_PUBLIC_MAP_STYLE_TOKEN?.trim();

  if (raw) {
    if (token && raw.includes('{token}')) {
      return raw.replaceAll('{token}', token);
    }
    return raw;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_STYLE_URL;
  }

  return null;
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

function mapCenter(markers: MapMarker[], viewportPreset: MapViewportPreset): { lat: number; lng: number; zoom: number } {
  if (markers.length === 0) {
    return { lat: 4.5709, lng: -74.2973, zoom: viewportPreset === 'colombia' ? 4.6 : 8 };
  }

  const avgLat = markers.reduce((acc, marker) => acc + marker.lat, 0) / markers.length;
  const avgLng = markers.reduce((acc, marker) => acc + marker.lng, 0) / markers.length;

  return {
    lat: avgLat,
    lng: avgLng,
    zoom: viewportPreset === 'colombia' ? 4.8 : 8.2,
  };
}

function computeViewportBounds(markers: MapMarker[], viewportPreset: MapViewportPreset): ViewportBounds {
  if (viewportPreset === 'colombia' || markers.length === 0) {
    return COLOMBIA_VIEWPORT_BOUNDS;
  }

  const lats = markers.map((marker) => marker.lat);
  const lngs = markers.map((marker) => marker.lng);
  const rawMinLat = Math.min(...lats);
  const rawMaxLat = Math.max(...lats);
  const rawMinLng = Math.min(...lngs);
  const rawMaxLng = Math.max(...lngs);

  const latSpan = Math.max(rawMaxLat - rawMinLat, 0.08);
  const lngSpan = Math.max(rawMaxLng - rawMinLng, 0.08);
  const latPadding = latSpan * 0.3;
  const lngPadding = lngSpan * 0.3;

  return {
    minLat: rawMinLat - latPadding,
    maxLat: rawMaxLat + latPadding,
    minLng: rawMinLng - lngPadding,
    maxLng: rawMaxLng + lngPadding,
  };
}

function projectPointToPercent(lat: number, lng: number, bounds: ViewportBounds): { x: number; y: number } {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.min(98, Math.max(2, Number.isFinite(x) ? x : 50)),
    y: Math.min(98, Math.max(2, Number.isFinite(y) ? y : 50)),
  };
}

interface CompatibilityMapProps {
  markers: MapMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  height: number;
  viewportPreset: MapViewportPreset;
}

function CompatibilityCroquisMap({
  markers,
  selectedMarkerId,
  onSelectMarker,
  height,
  viewportPreset,
}: CompatibilityMapProps) {
  const bounds = useMemo(
    () => computeViewportBounds(markers, viewportPreset),
    [markers, viewportPreset]
  );

  const polygonPath = useMemo(() => {
    const coords = COLOMBIA_BOUNDARY_GEOJSON.features[0]?.geometry?.coordinates?.[0] || [];
    if (!Array.isArray(coords) || coords.length === 0) return '';

    return coords
      .map((entry, index) => {
        const [lng, lat] = entry;
        const projected = projectPointToPercent(lat, lng, bounds);
        return `${index === 0 ? 'M' : 'L'} ${projected.x} ${projected.y}`;
      })
      .join(' ')
      .concat(' Z');
  }, [bounds]);

  const positionedMarkers = useMemo(
    () => markers.map((marker) => ({ marker, ...projectPointToPercent(marker.lat, marker.lng, bounds) })),
    [markers, bounds]
  );

  const selectedPosition = useMemo(
    () => positionedMarkers.find((item) => item.marker.id === selectedMarkerId) || null,
    [positionedMarkers, selectedMarkerId]
  );

  return (
    <div
      data-testid="map-croquis-fallback"
      className="relative rounded-2xl overflow-hidden"
      style={{
        height,
        background:
          'radial-gradient(circle at 12% 10%, rgba(14,165,233,0.18), transparent 52%), linear-gradient(180deg, #f1f9ff 0%, #e0f2fe 58%, #f8fafc 100%)',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={polygonPath}
          fill="rgba(14,165,233,0.14)"
          stroke="rgba(2,132,199,0.85)"
          strokeWidth="0.5"
        />
      </svg>

      {positionedMarkers.map(({ marker, x, y }) => (
        <button
          key={marker.id}
          type="button"
          onClick={() => onSelectMarker(marker.id)}
          className="absolute rounded-full border-2 border-white shadow-md w-4 h-4 transition-transform hover:scale-110 z-10"
          style={{ left: `${x}%`, top: `${y}%`, backgroundColor: MARKER_COLORS[marker.kind], transform: 'translate(-50%, -50%)' }}
          aria-label={`${mapKindLabel(marker.kind)}: ${marker.label}`}
        />
      ))}

      {selectedPosition ? (
        <div
          data-testid="map-croquis-popup"
          className="absolute z-20 rounded-lg border px-3 py-2 max-w-[220px] shadow-lg"
          style={{
            left: `${Math.min(selectedPosition.x + 2.5, 78)}%`,
            top: `${Math.max(selectedPosition.y - 11, 8)}%`,
            background: 'rgba(255,255,255,0.95)',
            borderColor: 'rgba(15,23,42,0.18)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            {selectedPosition.marker.label}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {mapKindLabel(selectedPosition.marker.kind)}
          </p>
        </div>
      ) : null}

      <div
        className="absolute top-3 right-3 z-20 rounded-full px-3 py-1 text-[11px] font-medium"
        style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--text-secondary)', border: '1px solid rgba(15,23,42,0.14)' }}
      >
        Modo compatibilidad
      </div>
    </div>
  );
}

export function DestinationMap({
  markers,
  height = 400,
  className = '',
  viewportPreset = 'colombia',
  showFilters = false,
  showLegend = true,
}: DestinationMapProps) {
  const styleUrl = useMemo(resolveMapStyleUrl, []);
  const mapRef = useRef<MapRef | null>(null);
  const [isNoWebgl, setIsNoWebgl] = useState(false);
  const [styleFailed, setStyleFailed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<MarkerFilter>('all');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const availableKinds = useMemo(() => {
    const set = new Set<MapMarkerKind>();
    for (const marker of markers) set.add(marker.kind);
    return Array.from(set);
  }, [markers]);

  const filterKinds = useMemo(
    () => availableKinds.filter((kind): kind is ProductFilterKind => kind !== 'destination'),
    [availableKinds]
  );

  const filteredMarkers = useMemo(
    () => filterMarkersByKind(markers, showFilters ? selectedFilter : 'all'),
    [markers, showFilters, selectedFilter]
  );

  const selectedMarker = useMemo(
    () => filteredMarkers.find((marker) => marker.id === selectedMarkerId) || null,
    [filteredMarkers, selectedMarkerId]
  );

  const center = useMemo(() => mapCenter(filteredMarkers.length > 0 ? filteredMarkers : markers, viewportPreset), [filteredMarkers, markers, viewportPreset]);

  useEffect(() => {
    if (showFilters && selectedFilter !== 'all' && !filterKinds.includes(selectedFilter as ProductFilterKind)) {
      setSelectedFilter('all');
    }
  }, [showFilters, selectedFilter, filterKinds]);

  useEffect(() => {
    if (!selectedMarkerId) return;
    const stillVisible = filteredMarkers.some((marker) => marker.id === selectedMarkerId);
    if (!stillVisible) {
      setSelectedMarkerId(null);
    }
  }, [filteredMarkers, selectedMarkerId]);

  useEffect(() => {
    if (!supportsWebGL()) {
      setIsNoWebgl(true);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (filteredMarkers.length === 0) return;

    if (filteredMarkers.length === 1) {
      map.easeTo({
        center: [filteredMarkers[0].lng, filteredMarkers[0].lat],
        zoom: viewportPreset === 'colombia' ? 6.5 : 10.2,
        duration: 300,
      });
      return;
    }

    const lats = filteredMarkers.map((marker) => marker.lat);
    const lngs = filteredMarkers.map((marker) => marker.lng);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 56, duration: 300 }
    );
  }, [filteredMarkers, viewportPreset]);

  if (markers.length === 0) {
    return null;
  }

  if (isNoWebgl) {
    return (
      <div className={className}>
        <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
          <CompatibilityCroquisMap
            markers={filteredMarkers.length > 0 ? filteredMarkers : markers}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={setSelectedMarkerId}
            height={height}
            viewportPreset={viewportPreset}
          />

          {showFilters && filterKinds.length > 0 ? (
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 max-w-[85%]">
              {(['all', ...filterKinds] as MarkerFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm"
                  style={{
                    background: selectedFilter === filter ? 'var(--accent)' : 'rgba(255,255,255,0.84)',
                    color: selectedFilter === filter ? 'var(--accent-text)' : 'var(--text-secondary)',
                    borderColor: selectedFilter === filter ? 'var(--accent)' : 'rgba(15,23,42,0.2)',
                  }}
                >
                  {filter === 'all' ? 'Todos' : mapKindLabel(filter)}
                </button>
              ))}
            </div>
          ) : null}

          {showLegend && availableKinds.length > 0 ? (
            <div
              className="absolute bottom-3 left-3 z-10 rounded-xl px-3 py-2 flex flex-wrap gap-3"
              style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.12)' }}
            >
              {availableKinds.map((kind) => (
                <div key={kind} className="flex items-center gap-1.5">
                  <span
                    className="inline-flex w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: MARKER_COLORS[kind] }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {mapKindLabel(kind)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (styleFailed || !styleUrl) {
    return (
      <div className={className}>
        <RouteMap
          points={markers.map((marker) => ({ city: marker.label, lat: marker.lat, lng: marker.lng }))}
          height={height}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={styleUrl}
          initialViewState={{
            latitude: center.lat,
            longitude: center.lng,
            zoom: center.zoom,
          }}
          onError={(event) => {
            const message = String((event as { error?: { message?: string } })?.error?.message || '').toLowerCase();
            if (
              message.includes('style') ||
              message.includes('webgl') ||
              message.includes('context') ||
              message.includes('failed to load')
            ) {
              setStyleFailed(true);
            }
          }}
        >
          <NavigationControl position="top-right" />

          <Source id="colombia-outline" type="geojson" data={COLOMBIA_BOUNDARY_GEOJSON as unknown as GeoJSON.FeatureCollection}>
            <Layer
              id="colombia-fill"
              type="fill"
              paint={{
                'fill-color': '#0ea5e9',
                'fill-opacity': 0.1,
              }}
            />
            <Layer
              id="colombia-line"
              type="line"
              paint={{
                'line-color': '#0284c7',
                'line-width': 2,
                'line-opacity': 0.9,
              }}
            />
          </Source>

          {filteredMarkers.map((marker) => (
            <Marker
              key={marker.id}
              latitude={marker.lat}
              longitude={marker.lng}
              anchor="bottom"
            >
              <button
                type="button"
                onClick={() => setSelectedMarkerId(marker.id)}
                className="rounded-full border-2 border-white shadow-md w-4 h-4 transition-transform hover:scale-110"
                style={{ backgroundColor: MARKER_COLORS[marker.kind] }}
                aria-label={`${mapKindLabel(marker.kind)}: ${marker.label}`}
              />
            </Marker>
          ))}

          {selectedMarker ? (
            <Popup
              closeOnClick={false}
              closeButton
              onClose={() => setSelectedMarkerId(null)}
              latitude={selectedMarker.lat}
              longitude={selectedMarker.lng}
              anchor="top"
            >
              <div className="pr-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {selectedMarker.label}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {mapKindLabel(selectedMarker.kind)}
                </p>
              </div>
            </Popup>
          ) : null}
        </Map>

        {showFilters && filterKinds.length > 0 ? (
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 max-w-[85%]">
            {(['all', ...filterKinds] as MarkerFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm"
                style={{
                  background: selectedFilter === filter ? 'var(--accent)' : 'rgba(255,255,255,0.84)',
                  color: selectedFilter === filter ? 'var(--accent-text)' : 'var(--text-secondary)',
                  borderColor: selectedFilter === filter ? 'var(--accent)' : 'rgba(15,23,42,0.2)',
                }}
              >
                {filter === 'all' ? 'Todos' : mapKindLabel(filter)}
              </button>
            ))}
          </div>
        ) : null}

        {showLegend && availableKinds.length > 0 ? (
          <div
            className="absolute bottom-3 left-3 z-10 rounded-xl px-3 py-2 flex flex-wrap gap-3"
            style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.12)' }}
          >
            {availableKinds.map((kind) => (
              <div key={kind} className="flex items-center gap-1.5">
                <span
                  className="inline-flex w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: MARKER_COLORS[kind] }}
                />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {mapKindLabel(kind)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
