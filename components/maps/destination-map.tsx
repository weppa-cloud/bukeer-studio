'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { COLOMBIA_BOUNDARY_GEOJSON } from '@/components/maps/colombia-boundary';
import { MarkerButton, getDestinationMarkerMeta } from '@/components/maps/shared-marker';
import type {
  MapMarker,
  MapMarkerKind,
  MapViewportPreset,
  MarkerFilter,
  MapRenderMode,
} from '@/lib/maps/types';
import { filterMarkersByKind, mapKindLabel } from '@/lib/maps/utils';
import {
  DEFAULT_MAP_THEME_PALETTE,
  buildMapThemePaletteFromRoot,
  resolveMapStyleUrl,
  supportsWebGL,
  type MapThemePalette,
} from '@/lib/maps/theme';

const DestinationMapWebGL = dynamic(() => import('./destination-map-webgl'), {
  ssr: false,
});

interface DestinationMapProps {
  markers: MapMarker[];
  height?: number;
  className?: string;
  viewportPreset?: MapViewportPreset;
  renderMode?: MapRenderMode;
  showFilters?: boolean;
  showLegend?: boolean;
  /** Optional ordered path drawn as a connecting line between points ([lng, lat] pairs). */
  routePath?: Array<[number, number]>;
}

type ProductFilterKind = 'hotel' | 'activity' | 'service';

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
  palette: MapThemePalette;
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  height: number;
  viewportPreset: MapViewportPreset;
  badgeLabel: string;
  routePath?: Array<[number, number]>;
}

function CompatibilityCroquisMap({
  markers,
  palette,
  selectedMarkerId,
  onSelectMarker,
  height,
  viewportPreset,
  badgeLabel,
  routePath,
}: CompatibilityMapProps) {
  const bounds = useMemo(
    () => computeViewportBounds(markers, viewportPreset),
    [markers, viewportPreset]
  );

  const polygonPath = useMemo(() => {
    const coords = COLOMBIA_BOUNDARY_GEOJSON.features[0]?.geometry?.coordinates?.[0];
    if (!coords) return '';

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
  const selectedDestinationMeta = selectedPosition ? getDestinationMarkerMeta(selectedPosition.marker) : null;

  const routePolylinePoints = useMemo(() => {
    if (!routePath || routePath.length < 2) return null;
    return routePath
      .map(([lng, lat]) => {
        const projected = projectPointToPercent(lat, lng, bounds);
        return `${projected.x},${projected.y}`;
      })
      .join(' ');
  }, [routePath, bounds]);

  return (
    <div
      data-testid="map-croquis-fallback"
      className="relative rounded-2xl overflow-hidden"
      style={{
        height,
        background: palette.compatibilityBackground,
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={polygonPath}
          fill={palette.colombiaFillColor}
          fillOpacity={0.14}
          stroke={palette.colombiaLineColor}
          strokeOpacity={0.9}
          strokeWidth="0.5"
        />
        {routePolylinePoints ? (
          <polyline
            points={routePolylinePoints}
            fill="none"
            stroke={palette.markerColors.destination}
            strokeWidth="0.6"
            strokeDasharray="1.5,1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        ) : null}
      </svg>

      {positionedMarkers.map(({ marker, x, y }) => (
        <div
          key={`${marker.id}-visual`}
          className="absolute z-10"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <MarkerButton
            marker={marker}
            markerColors={palette.markerColors}
            selected={marker.id === selectedMarkerId}
            onClick={() => onSelectMarker(marker.id)}
          />
        </div>
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
          {selectedPosition.marker.kind === 'destination' && (selectedDestinationMeta?.hotelCount || selectedDestinationMeta?.activityCount) ? (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Hoteles: {selectedDestinationMeta?.hotelCount ?? 0} · Actividades: {selectedDestinationMeta?.activityCount ?? 0}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className="absolute top-3 right-3 z-20 rounded-full px-3 py-1 text-[11px] font-medium"
        style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--text-secondary)', border: '1px solid rgba(15,23,42,0.14)' }}
      >
        {badgeLabel}
      </div>
    </div>
  );
}

export function DestinationMap({
  markers,
  height = 400,
  className = '',
  viewportPreset = 'colombia',
  renderMode = 'auto',
  showFilters = false,
  showLegend = true,
  routePath,
}: DestinationMapProps) {
  const styleUrl = useMemo(resolveMapStyleUrl, []);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [palette, setPalette] = useState<MapThemePalette>(DEFAULT_MAP_THEME_PALETTE);
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

  const useCroquisMode = renderMode === 'croquis';
  const shouldRenderCompatibilityMap =
    !hasHydrated || useCroquisMode || isNoWebgl || styleFailed || !styleUrl;

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const center = useMemo(
    () => mapCenter(filteredMarkers.length > 0 ? filteredMarkers : markers, viewportPreset),
    [filteredMarkers, markers, viewportPreset]
  );

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
    const root = document.documentElement;
    const syncPalette = () => {
      setPalette(buildMapThemePaletteFromRoot(root));
    };

    syncPalette();
    const observer = new MutationObserver(syncPalette);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const filtersNode = showFilters && filterKinds.length > 0 ? (
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
  ) : null;

  const legendNode = showLegend && availableKinds.length > 0 ? (
    <div
      className="absolute bottom-3 left-3 z-10 rounded-xl px-3 py-2 flex flex-wrap gap-3"
      style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.12)' }}
    >
      {availableKinds.map((kind) => (
        <div key={kind} className="flex items-center gap-1.5">
          <span
            className="inline-flex w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: palette.markerColors[kind] }}
          />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {mapKindLabel(kind)}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  if (shouldRenderCompatibilityMap) {
    const croquisBadgeLabel = useCroquisMode ? 'Croquis Colombia' : 'Modo compatibilidad';
    return (
      <div className={className}>
        <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
          <CompatibilityCroquisMap
            markers={filteredMarkers.length > 0 ? filteredMarkers : markers}
            palette={palette}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={setSelectedMarkerId}
            height={height}
            viewportPreset={viewportPreset}
            badgeLabel={croquisBadgeLabel}
            routePath={routePath}
          />

          {markers.length === 0 ? (
            <div
              className="absolute bottom-3 right-3 z-10 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)', border: '1px solid rgba(15,23,42,0.14)' }}
            >
              Sin puntos geolocalizados
            </div>
          ) : null}

          {filtersNode}
          {legendNode}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
        <DestinationMapWebGL
          markers={filteredMarkers}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={setSelectedMarkerId}
          palette={palette}
          styleUrl={styleUrl!}
          viewportPreset={viewportPreset}
          initialCenter={center}
          onStyleFailed={() => setStyleFailed(true)}
          routePath={routePath}
        />

        {filtersNode}
        {legendNode}
      </div>
    </div>
  );
}
