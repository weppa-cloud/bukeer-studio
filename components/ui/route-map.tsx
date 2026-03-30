'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface RoutePoint {
  city: string;
  lat: number;
  lng: number;
}

interface RouteMapProps {
  points: RoutePoint[];
  className?: string;
  height?: number;
}

/**
 * Interactive route map using OpenStreetMap embed.
 * Shows markers for each destination with a route line.
 * Zero external dependencies — uses iframe embed.
 */
export function RouteMap({ points, className = '', height = 400 }: RouteMapProps) {
  const mapUrl = useMemo(() => {
    if (points.length === 0) return null;

    // Calculate bounding box with padding
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats) - 0.5;
    const maxLat = Math.max(...lats) + 0.5;
    const minLng = Math.min(...lngs) - 0.5;
    const maxLng = Math.max(...lngs) + 0.5;

    // OpenStreetMap embed with bounding box
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;
  }, [points]);

  if (!mapUrl || points.length === 0) return null;

  return (
    <div className={className}>
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden" style={{ height }}>
        <iframe
          src={mapUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Mapa de ruta"
          loading="lazy"
        />
        {/* Overlay with route points */}
        <RouteOverlay points={points} height={height} />
      </div>

      {/* Route legend below map */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {points.map((point, i) => (
          <div key={point.city} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {i + 1}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{point.city}</span>
            {i < points.length - 1 && (
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SVG overlay that draws route markers on top of the map.
 * Positioned absolutely over the iframe.
 */
function RouteOverlay({ points, height }: { points: RoutePoint[]; height: number }) {
  if (points.length === 0) return null;

  // Calculate projection from lat/lng to pixel position
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLng = Math.min(...lngs) - 0.5;
  const maxLng = Math.max(...lngs) + 0.5;

  const project = (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: ((maxLat - lat) / (maxLat - minLat)) * 100,
  });

  const projected = points.map(p => ({ ...p, ...project(p.lat, p.lng) }));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Route line */}
      <motion.polyline
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        points={projected.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.5"
        strokeDasharray="1,1"
        opacity="0.8"
      />

      {/* Markers */}
      {projected.map((p, i) => (
        <motion.g
          key={p.city}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 200 }}
        >
          {/* Pulse ring */}
          <circle cx={p.x} cy={p.y} r="2" fill="var(--accent)" opacity="0.2">
            <animate attributeName="r" values="1.5;3;1.5" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Marker dot */}
          <circle cx={p.x} cy={p.y} r="1.2" fill="var(--accent)" stroke="white" strokeWidth="0.4" />
          {/* Number */}
          <text
            x={p.x}
            y={p.y + 0.4}
            textAnchor="middle"
            fill="white"
            fontSize="1"
            fontWeight="bold"
          >
            {i + 1}
          </text>
        </motion.g>
      ))}
    </svg>
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

/**
 * Known Colombian city coordinates — fallback when DB doesn't have coordinates.
 */
export const COLOMBIA_CITIES: Record<string, { lat: number; lng: number }> = {
  'Bogotá': { lat: 4.711, lng: -74.072 },
  'Medellín': { lat: 6.248, lng: -75.566 },
  'Cartagena': { lat: 10.393, lng: -75.483 },
  'Cartagena de Indias': { lat: 10.393, lng: -75.483 },
  'Santa Marta': { lat: 11.240, lng: -74.211 },
  'Cali': { lat: 3.451, lng: -76.532 },
  'Pereira': { lat: 4.809, lng: -75.691 },
  'Salento': { lat: 4.637, lng: -75.570 },
  'San Andrés': { lat: 12.577, lng: -81.705 },
  'Zipaquirá': { lat: 5.022, lng: -73.997 },
  'Santa Rosa de Cabal': { lat: 4.871, lng: -75.622 },
  'Leticia': { lat: -4.215, lng: -69.941 },
  'Guatapé': { lat: 6.232, lng: -75.157 },
  'Barichara': { lat: 6.634, lng: -73.226 },
  'Villa de Leyva': { lat: 5.633, lng: -73.524 },
};

/**
 * Parse city names from a package/itinerary name or destination string.
 * Returns RoutePoints with coordinates from the known cities map.
 */
export function parseRouteFromName(name: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  const seen = new Set<string>();

  for (const [city, coords] of Object.entries(COLOMBIA_CITIES)) {
    // Normalize for matching (remove accents)
    const normalized = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nameNorm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (nameNorm.toLowerCase().includes(normalized.toLowerCase()) && !seen.has(city)) {
      seen.add(city);
      // Don't add both "Cartagena" and "Cartagena de Indias"
      if (city === 'Cartagena de Indias' && seen.has('Cartagena')) continue;
      if (city === 'Cartagena' && seen.has('Cartagena de Indias')) continue;
      points.push({ city, ...coords });
    }
  }

  return points;
}
