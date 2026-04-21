'use client';

/**
 * <ColombiaMapStandalone> — SSR-safe thin wrapper around ColombiaMapLibre.
 *
 * Server components cannot use `dynamic(..., { ssr: false })` directly.
 * This client leaf handles the dynamic import so server components
 * (e.g. destino-detail, destinos-list) can render the validated
 * ColombiaMapLibre without crashing during SSR.
 */

import dynamic from 'next/dynamic';
import type { ColombiaMapLibreProps } from './colombia-maplibre.client';

const ColombiaMapLibre = dynamic(
  () =>
    import('./colombia-maplibre.client').then((m) => ({
      default: m.ColombiaMapLibre,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: 420,
          borderRadius: 16,
          background: '#F5F1E8',
        }}
      />
    ),
  },
);

export function ColombiaMapStandalone(props: ColombiaMapLibreProps) {
  return <ColombiaMapLibre {...props} />;
}
