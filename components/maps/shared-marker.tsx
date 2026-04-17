'use client';

import type { MapMarker, MapMarkerKind } from '@/lib/maps/types';
import { mapKindLabel } from '@/lib/maps/utils';

export interface DestinationMarkerMeta {
  image?: string;
  hotelCount?: number;
  activityCount?: number;
  totalCount?: number;
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? Math.trunc(value) : null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

export function getDestinationMarkerMeta(marker: MapMarker): DestinationMarkerMeta | null {
  if (marker.kind !== 'destination') return null;
  const meta = marker.meta as Record<string, unknown> | undefined;
  if (!meta) return null;

  const image = typeof meta.image === 'string' && meta.image.trim().length > 0 ? meta.image : undefined;
  const hotelCount = toNonNegativeInteger(meta.hotelCount);
  const activityCount = toNonNegativeInteger(meta.activityCount);
  const providedTotal = toNonNegativeInteger(meta.totalCount);
  const inferredTotal = (hotelCount ?? 0) + (activityCount ?? 0);
  const totalCount = providedTotal ?? (inferredTotal > 0 ? inferredTotal : null);

  return {
    image,
    hotelCount: hotelCount ?? undefined,
    activityCount: activityCount ?? undefined,
    totalCount: totalCount ?? undefined,
  };
}

export function formatMarkerCount(value: number | undefined): string | null {
  if (typeof value !== 'number' || value <= 0) return null;
  if (value > 99) return '99+';
  return String(value);
}

export function buildMarkerAriaDescription(marker: MapMarker): string {
  const kindLabel = mapKindLabel(marker.kind);
  const destinationMeta = getDestinationMarkerMeta(marker);
  const markerCount = formatMarkerCount(destinationMeta?.totalCount);

  if (markerCount) {
    return `${kindLabel}: ${marker.label} (${markerCount} experiencias)`;
  }

  return `${kindLabel}: ${marker.label}`;
}

export interface MarkerButtonProps {
  marker: MapMarker;
  markerColors: Record<MapMarkerKind, string>;
  selected: boolean;
  onClick: () => void;
}

export function MarkerButton({ marker, markerColors, selected, onClick }: MarkerButtonProps) {
  const destinationMeta = getDestinationMarkerMeta(marker);
  const isDestination = marker.kind === 'destination';
  const markerCount = formatMarkerCount(destinationMeta?.totalCount);

  if (isDestination) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative transition-transform hover:scale-105 focus:outline-none"
        aria-label={buildMarkerAriaDescription(marker)}
      >
        <span
          className="absolute -inset-1 rounded-full border animate-[pulse_2.2s_ease-in-out_infinite]"
          style={{ borderColor: `color-mix(in srgb, ${markerColors.destination} 60%, white)` }}
          aria-hidden="true"
        />
        <span
          className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-md"
          style={{
            backgroundColor: destinationMeta?.image
              ? `color-mix(in srgb, ${markerColors.destination} 24%, white)`
              : markerColors.destination,
            boxShadow: selected
              ? `0 0 0 2px ${markerColors.destination}, 0 8px 20px color-mix(in srgb, ${markerColors.destination} 32%, transparent)`
              : '0 6px 18px rgba(15,23,42,0.26)',
          }}
        >
          {destinationMeta?.image ? (
            <img
              src={destinationMeta.image}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[12px] font-bold text-white">
              {marker.label.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span
          className="absolute -top-1 -left-1 inline-flex h-3.5 w-3.5 rounded-full border border-white"
          style={{ backgroundColor: markerColors.destination }}
        />
        {markerCount ? (
          <span
            className="absolute -bottom-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full border px-1 text-[10px] font-semibold leading-none h-[18px]"
            style={{
              background: 'rgba(255,255,255,0.96)',
              color: 'var(--text-heading)',
              borderColor: 'rgba(15,23,42,0.2)',
            }}
            aria-hidden="true"
          >
            {markerCount}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border-2 border-white shadow-md w-4 h-4 transition-transform hover:scale-110"
      style={{
        backgroundColor: markerColors[marker.kind],
        transform: selected ? 'scale(1.2)' : undefined,
      }}
      aria-label={buildMarkerAriaDescription(marker)}
    />
  );
}
