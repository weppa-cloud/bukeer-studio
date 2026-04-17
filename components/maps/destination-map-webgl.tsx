'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Layer,
  Map,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from '@vis.gl/react-maplibre';
import { COLOMBIA_BOUNDARY_GEOJSON } from '@/components/maps/colombia-boundary';
import { MarkerButton, getDestinationMarkerMeta } from '@/components/maps/shared-marker';
import type { MapMarker, MapViewportPreset } from '@/lib/maps/types';
import { mapKindLabel } from '@/lib/maps/utils';
import type { MapThemePalette } from '@/lib/maps/theme';

const COLOMBIA_VIEWPORT_BOUNDS = {
  minLat: -4.8,
  maxLat: 13.8,
  minLng: -81.85,
  maxLng: -66.8,
};

export interface DestinationMapWebGLProps {
  markers: MapMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  palette: MapThemePalette;
  styleUrl: string;
  viewportPreset: MapViewportPreset;
  initialCenter: { lat: number; lng: number; zoom: number };
  onStyleFailed: () => void;
  routePath?: Array<[number, number]>;
}

export default function DestinationMapWebGL({
  markers,
  selectedMarkerId,
  onSelectMarker,
  palette,
  styleUrl,
  viewportPreset,
  initialCenter,
  onStyleFailed,
  routePath,
}: DestinationMapWebGLProps) {
  const mapRef = useRef<MapRef | null>(null);

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) || null,
    [markers, selectedMarkerId]
  );
  const selectedMarkerMeta = useMemo(
    () => (selectedMarker ? getDestinationMarkerMeta(selectedMarker) : null),
    [selectedMarker]
  );

  const routeFeature = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!routePath || routePath.length < 2) return null;
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routePath.map(([lng, lat]) => [lng, lat]) },
      properties: {},
    };
  }, [routePath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markers.length === 0) return;

    if (viewportPreset === 'colombia') {
      map.fitBounds(
        [
          [COLOMBIA_VIEWPORT_BOUNDS.minLng, COLOMBIA_VIEWPORT_BOUNDS.minLat],
          [COLOMBIA_VIEWPORT_BOUNDS.maxLng, COLOMBIA_VIEWPORT_BOUNDS.maxLat],
        ],
        { padding: 34, duration: 300 }
      );
      return;
    }

    if (markers.length === 1) {
      map.easeTo({
        center: [markers[0].lng, markers[0].lat],
        zoom: 10.2,
        duration: 300,
      });
      return;
    }

    const lats = markers.map((marker) => marker.lat);
    const lngs = markers.map((marker) => marker.lng);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 56, duration: 300 }
    );
  }, [markers, viewportPreset]);

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={styleUrl}
      initialViewState={{
        latitude: initialCenter.lat,
        longitude: initialCenter.lng,
        zoom: initialCenter.zoom,
      }}
      onError={(event) => {
        const message = String((event as { error?: { message?: string } })?.error?.message || '').toLowerCase();
        if (
          message.includes('style') ||
          message.includes('webgl') ||
          message.includes('context') ||
          message.includes('failed to load')
        ) {
          onStyleFailed();
        }
      }}
    >
      <NavigationControl position="top-right" />

      {routeFeature ? (
        <Source id="route-line" type="geojson" data={routeFeature}>
          <Layer
            id="route-line-casing"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 6,
              'line-opacity': 0.7,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          <Layer
            id="route-line-stroke"
            type="line"
            paint={{
              'line-color': palette.markerColors.destination,
              'line-width': 3,
              'line-dasharray': [2, 1.5],
              'line-opacity': 0.9,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>
      ) : null}

      <Source id="colombia-outline" type="geojson" data={COLOMBIA_BOUNDARY_GEOJSON as unknown as GeoJSON.FeatureCollection}>
        <Layer
          id="colombia-fill"
          type="fill"
          paint={{
            'fill-color': palette.colombiaFillColor,
            'fill-opacity': 0.2,
          }}
        />
        <Layer
          id="colombia-line"
          type="line"
          paint={{
            'line-color': palette.colombiaLineColor,
            'line-width': 2.8,
            'line-opacity': 0.98,
          }}
        />
      </Source>

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          latitude={marker.lat}
          longitude={marker.lng}
          anchor="bottom"
        >
          <div style={{ transform: marker.kind === 'destination' ? 'translateY(-2px)' : undefined }}>
            <MarkerButton
              marker={marker}
              markerColors={palette.markerColors}
              selected={selectedMarkerId === marker.id}
              onClick={() => onSelectMarker(marker.id)}
            />
          </div>
        </Marker>
      ))}

      {selectedMarker ? (
        <Popup
          closeOnClick={false}
          closeButton
          onClose={() => onSelectMarker(null)}
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
            {selectedMarker.kind === 'destination' &&
            (selectedMarkerMeta?.hotelCount || selectedMarkerMeta?.activityCount) ? (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Hoteles: {selectedMarkerMeta?.hotelCount ?? 0} · Actividades: {selectedMarkerMeta?.activityCount ?? 0}
              </p>
            ) : null}
          </div>
        </Popup>
      ) : null}
    </Map>
  );
}
