/**
 * Simplified Colombia silhouette for decorative map overlay.
 * This is intentionally low-detail for a "croquis" visual style.
 */
export const COLOMBIA_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Colombia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-79.05, 1.2],
          [-78.7, 5.4],
          [-77.5, 8.8],
          [-75.2, 12.45],
          [-71.95, 12.45],
          [-70.0, 11.1],
          [-67.25, 7.2],
          [-68.1, 4.1],
          [-69.55, 1.2],
          [-70.4, -2.3],
          [-73.95, -4.25],
          [-76.9, -2.8],
          [-78.9, -1.2],
          [-79.05, 1.2],
        ]],
      },
    },
  ],
} as const;
