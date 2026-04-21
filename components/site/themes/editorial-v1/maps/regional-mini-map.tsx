/**
 * <RegionalMiniMap> — compact card-embedded Colombia map.
 *
 * Designed for destination detail cards. Highlights one region, skips
 * the compass, ridges and river overlays. Pins are optional and, when
 * present, render label-less (the card already carries the name).
 *
 * Ported from `themes/references/claude design 1/project/maps.jsx`
 * (RegionalMiniMap). Server component.
 */

import { ColombiaMap, type ColombiaMapPin } from './colombia-map';
import type { EditorialRegion } from './colombia-map-shared';

export interface RegionalMiniMapProps {
  region: EditorialRegion;
  pins?: ReadonlyArray<ColombiaMapPin>;
  activePinId?: string | null;
  /** Height in pixels (defaults to 280). */
  height?: number;
  className?: string;
  ariaLabel?: string;
}

const REGION_LABEL: Record<EditorialRegion, string> = {
  caribe: 'Región Caribe',
  andes: 'Región Andina',
  selva: 'Región Amazónica',
  pacifico: 'Región Pacífica',
};

export function RegionalMiniMap({
  region,
  pins,
  activePinId,
  height = 280,
  className,
  ariaLabel,
}: RegionalMiniMapProps) {
  return (
    <ColombiaMap
      className={['co-map-minimal', className].filter(Boolean).join(' ')}
      highlightedRegions={[region]}
      pins={pins}
      activePinId={activePinId ?? null}
      showCompass={false}
      showRidges={false}
      showRivers={false}
      showLabels={false}
      height={height}
      ariaLabel={ariaLabel ?? `Mapa de ${REGION_LABEL[region]} en Colombia`}
      description={`Silueta editorial de Colombia resaltando la ${REGION_LABEL[region]}.`}
    />
  );
}
