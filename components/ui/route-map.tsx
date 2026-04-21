'use client';

import { motion } from 'framer-motion';
import { useMemo, type ReactNode } from 'react';
import { DestinationMap } from '@/components/maps/destination-map';
import type { MapMarker } from '@/lib/maps/types';

export { COLOMBIA_CITIES, parseRouteFromName } from '@/lib/maps/colombia-cities';
export type { RoutePoint } from '@/lib/maps/colombia-cities';
import type { RoutePoint } from '@/lib/maps/colombia-cities';

/**
 * Context passed to the optional `renderMap` slot. Lets consumers swap the
 * default MapLibre `<DestinationMap>` for a custom renderer (e.g. a hand-drawn
 * SVG map in editorial-v1) while keeping the outer wrapper, route list, and
 * croquis fallback behavior intact.
 */
export interface RouteMapRenderContext {
  points: RoutePoint[];
  markers: MapMarker[];
  routePath?: Array<[number, number]>;
}

interface RouteMapProps {
  points: RoutePoint[];
  className?: string;
  height?: number;
  onPointClick?: (point: RoutePoint, index: number) => void;
  numberedLabels?: boolean;
  connectorStyle?: 'solid' | 'dashed';
  /**
   * When enabled with dashed connector mode, suppresses map polyline rendering
   * so we do not mix two route styles in the same widget.
   */
  hideMapPolylineWhenDashed?: boolean;
  /**
   * Optional slot that bypasses the internal MapLibre `<DestinationMap>` and
   * renders a custom map surface (e.g. editorial SVG). Receives the already
   * computed `markers` + `routePath` so the renderer can reuse the derived data.
   * The outer wrapper (className, route list, croquis fallback) is preserved.
   */
  renderMap?: (ctx: RouteMapRenderContext) => ReactNode;
}

/**
 * Route map — renders destination markers plus a connecting polyline
 * using the shared MapLibre-based DestinationMap primitive (with croquis fallback).
 */
export function RouteMap({
  points,
  className = '',
  height = 400,
  onPointClick,
  numberedLabels = false,
  connectorStyle = 'solid',
  hideMapPolylineWhenDashed = false,
  renderMap,
}: RouteMapProps) {
  const markers = useMemo<MapMarker[]>(() => {
    return points.map((point, index) => ({
      id: `route-${index}-${point.city}`,
      label: numberedLabels ? `${index + 1}. ${point.city}` : point.city,
      kind: 'destination',
      lat: point.lat,
      lng: point.lng,
      meta: {
        routeIndex: index,
        city: point.city,
      },
    }));
  }, [numberedLabels, points]);

  const routePath = useMemo<Array<[number, number]> | undefined>(() => {
    if (points.length < 2) return undefined;
    if (connectorStyle === 'dashed' && hideMapPolylineWhenDashed) return undefined;
    return points.map((point) => [point.lng, point.lat]);
  }, [connectorStyle, hideMapPolylineWhenDashed, points]);

  if (points.length === 0) return null;

  return (
    <div className={className}>
      {renderMap ? (
        renderMap({ points, markers, routePath })
      ) : (
        <DestinationMap
          markers={markers}
          routePath={routePath}
          height={height}
          viewportPreset="destination-detail"
          showLegend={false}
          onMarkerSelect={(marker) => {
            if (!marker || !onPointClick) return;
            const routeIndex = Number((marker.meta as Record<string, unknown> | undefined)?.routeIndex);
            if (!Number.isFinite(routeIndex)) return;
            const point = points[routeIndex];
            if (!point) return;
            onPointClick(point, routeIndex);
          }}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {points.map((point, i) => (
          <div key={`${point.city}-${i}`} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {i + 1}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {point.city}
            </span>
            {i < points.length - 1 && (
              connectorStyle === 'dashed' ? (
                <span
                  aria-hidden="true"
                  className="mx-1 inline-block w-6 border-t border-dashed"
                  style={{ borderColor: 'var(--text-muted)' }}
                />
              ) : (
                <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Visual route timeline — shows stops in order with connecting line.
 * Use alongside or instead of the map for a cleaner visual.
 */
export function RouteTimeline({ points, className = '' }: { points: RoutePoint[]; className?: string }) {
  return (
    <div className={`flex items-center gap-0 overflow-x-auto pb-2 ${className}`}>
      {points.map((point, i) => (
        <div key={point.city} className="flex items-center shrink-0">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, type: 'spring' }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {i + 1}
            </div>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-heading)' }}>
              {point.city}
            </span>
          </motion.div>
          {i < points.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 + 0.05 }}
              className="w-12 h-px mx-1 origin-left"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
