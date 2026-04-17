import type { MapMarkerKind } from '@/lib/maps/types';

export const DEV_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export const DEFAULT_MARKER_COLORS: Record<MapMarkerKind, string> = {
  destination: '#0f766e',
  hotel: '#2563eb',
  activity: '#16a34a',
  service: '#9333ea',
};

export interface MapThemePalette {
  markerColors: Record<MapMarkerKind, string>;
  colombiaFillColor: string;
  colombiaLineColor: string;
  compatibilityBackground: string;
}

export const DEFAULT_MAP_THEME_PALETTE: MapThemePalette = {
  markerColors: DEFAULT_MARKER_COLORS,
  colombiaFillColor: '#0ea5e9',
  colombiaLineColor: '#0284c7',
  compatibilityBackground:
    'radial-gradient(circle at 12% 10%, rgba(14,165,233,0.18), transparent 52%), linear-gradient(180deg, #f1f9ff 0%, #e0f2fe 58%, #f8fafc 100%)',
};

const COLOR_PREFIXES = ['hsl(', 'oklch(', 'rgb(', 'rgba(', '#', 'lab(', 'lch(', 'color('];

export function resolveMapStyleUrl(): string | null {
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

export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

export function resolveThemeColor(raw: string, fallback: string): string {
  const value = raw.trim();
  if (!value) return fallback;

  if (COLOR_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return value;
  }

  return `hsl(${value})`;
}

export function buildMapThemePaletteFromRoot(root: HTMLElement): MapThemePalette {
  const styles = getComputedStyle(root);

  const destinationColor = resolveThemeColor(
    styles.getPropertyValue('--accent'),
    DEFAULT_MARKER_COLORS.destination
  );
  const hotelColor = resolveThemeColor(
    styles.getPropertyValue('--chart-2'),
    DEFAULT_MARKER_COLORS.hotel
  );
  const activityColor = resolveThemeColor(
    styles.getPropertyValue('--chart-5'),
    DEFAULT_MARKER_COLORS.activity
  );
  const serviceColor = resolveThemeColor(
    styles.getPropertyValue('--chart-3'),
    DEFAULT_MARKER_COLORS.service
  );
  const mapFillColor = resolveThemeColor(
    styles.getPropertyValue('--accent'),
    DEFAULT_MAP_THEME_PALETTE.colombiaFillColor
  );

  return {
    markerColors: {
      destination: destinationColor,
      hotel: hotelColor,
      activity: activityColor,
      service: serviceColor,
    },
    colombiaFillColor: mapFillColor,
    colombiaLineColor: destinationColor,
    compatibilityBackground:
      `radial-gradient(circle at 12% 10%, color-mix(in srgb, ${destinationColor} 18%, transparent), transparent 52%), ` +
      `linear-gradient(180deg, color-mix(in srgb, ${mapFillColor} 24%, white) 0%, color-mix(in srgb, ${mapFillColor} 14%, white) 58%, var(--bg, #f8fafc) 100%)`,
  };
}
