'use client';

/**
 * editorial-v1 — <ExploreMapClient />
 *
 * Interactive leaf for the home "Explora Colombia" section. Owns:
 *   - hover state for the 4 region legend chips (local state, debounced
 *     analytics emit)
 *   - the interactive Colombia map (pins derived from `destinations`
 *     → lat/lng via `COLOMBIA_CITIES`)
 *   - the floating `.explore-hover-card` that shows a pin's name +
 *     region + CTA when a pin is hovered or focused.
 *
 * Orchestration strategy:
 *   - Chip hover → sets `hoveredRegion` → the map renders the matching
 *     `<path class="co-region on">` overlay AND pins with
 *     `data-region !== hoveredRegion` get their opacity dimmed via CSS.
 *     No pin is mounted/unmounted — we simply toggle a class.
 *   - Pin hover (from `ColombiaMapClient.onPinHover`) → sets
 *     `hoveredPinId`. The floating card resolves the destination by id
 *     and shows the CTA.
 *
 * Analytics:
 *   - `region_filter_change` on chip hover (debounced 200ms so rapid
 *     mouse sweeps don't spam GA).
 *   - `destination_card_click` on pin click and CTA click in the
 *     floating card.
 *
 * Accessibility:
 *   - Chips are `<button role="tab">`; `tabIndex` + keyboard focus
 *     trigger the same hover orchestration as mouse hover.
 *   - `prefers-reduced-motion` users skip the floating card transition
 *     and pin halo animation (handled in editorial-v1.css).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { ColombiaMapClient } from '@/components/site/themes/editorial-v1/maps/colombia-map.client';
import type { ColombiaMapPin } from '@/components/site/themes/editorial-v1/maps/colombia-map';
import { COLOMBIA_CITIES } from '@/lib/maps/colombia-cities';
import type { ColombiaRegion } from '@/lib/maps/colombia-cities';
import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { editorialHtml } from '@/components/site/themes/editorial-v1/primitives/rich-heading';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

// ---------- Public types ----------
export interface ExploreMapRegionConfig {
  key: ColombiaRegion;
  label: string;
  highlight?: string;
}

export interface ExploreMapDestination {
  id: string;
  name: string;
  slug?: string;
  region?: ColombiaRegion;
  tagline?: string;
  packagesCount?: number;
}

interface ExploreMapClientProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  regions: ExploreMapRegionConfig[];
  destinations: ExploreMapDestination[];
  ctaLabel: string;
  /** Already resolved by the server wrapper — ready to use as `href`. */
  ctaHref: string;
  locale?: string | null;
}

// ---------- Helpers ----------

/**
 * Strip accents + lowercase — destination names from the DB ("Cartagena
 * de Indias", "Medellín") may or may not carry diacritics. We build a
 * single normalized map from `COLOMBIA_CITIES` keys so lookup is O(1).
 *
 * Uses the combining-diacritical range U+0300–U+036F, matching the
 * approach in `lib/maps/colombia-cities.ts :: parseRouteFromName`.
 */
const DIACRITIC_RE = /[̀-ͯ]/g;
const NORMALIZE = (s: string): string =>
  s.normalize('NFD').replace(DIACRITIC_RE, '').toLowerCase();

const CITY_LOOKUP: Record<
  string,
  { lat: number; lng: number; region?: ColombiaRegion }
> = (() => {
  const out: Record<
    string,
    { lat: number; lng: number; region?: ColombiaRegion }
  > = {};
  for (const [city, entry] of Object.entries(COLOMBIA_CITIES)) {
    out[NORMALIZE(city)] = {
      lat: entry.lat,
      lng: entry.lng,
      region: entry.region,
    };
  }
  return out;
})();

/**
 * Resolve a destination → lat/lng using its `name` (or `slug`) against
 * the local `COLOMBIA_CITIES` dictionary. Returns `null` when we don't
 * recognise the city — callers should filter these out silently.
 */
function locateDestination(
  dest: ExploreMapDestination,
): { lat: number; lng: number; region?: ColombiaRegion } | null {
  const candidates = [
    dest.name,
    dest.slug?.replace(/-/g, ' '),
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);

  for (const candidate of candidates) {
    const normalized = NORMALIZE(candidate);
    const hit = CITY_LOOKUP[normalized];
    if (hit) return hit;

    // Fuzzy fallback for slugs like "cartagena-de-indias" where the
    // catalog city key is shorter ("cartagena").
    for (const [city, entry] of Object.entries(CITY_LOOKUP)) {
      if (normalized.includes(city) || city.includes(normalized)) return entry;
    }
  }
  return null;
}

// ---------- Component ----------
export function ExploreMapClient({
  eyebrow,
  title,
  subtitle,
  regions,
  destinations,
  ctaLabel,
  ctaHref,
  locale,
}: ExploreMapClientProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const [hoveredRegion, setHoveredRegion] = useState<ColombiaRegion | null>(
    null,
  );
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // Debounce region analytics so mouse sweeps through the chips don't
  // push 4+ events to GA. 200ms matches the CSS transition timing.
  const lastAnalyticsRegion = useRef<ColombiaRegion | null>(null);
  const analyticsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueRegionAnalytics = useCallback((region: ColombiaRegion | null) => {
    if (analyticsTimer.current) clearTimeout(analyticsTimer.current);
    analyticsTimer.current = setTimeout(() => {
      if (lastAnalyticsRegion.current === region) return;
      lastAnalyticsRegion.current = region;
      trackEvent('region_filter_change', {
        region: region ?? 'all',
      });
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (analyticsTimer.current) clearTimeout(analyticsTimer.current);
    };
  }, []);

  // Build the stable pin set from the destinations prop. We derive
  // `region` from either the explicit prop or the lookup table so the
  // chip highlight CSS can target `data-region="caribe"`.
  const { pins, pinToDest } = useMemo(() => {
    const pinList: ColombiaMapPin[] = [];
    const map = new Map<string, ExploreMapDestination>();
    for (const dest of destinations) {
      const loc = locateDestination(dest);
      if (!loc) continue;
      const region = dest.region ?? loc.region;
      pinList.push({
        id: dest.id,
        lat: loc.lat,
        lng: loc.lng,
        label: dest.name,
        region,
      });
      map.set(dest.id, { ...dest, region });
    }
    return { pins: pinList, pinToDest: map };
  }, [destinations]);

  const hoveredDest = hoveredPinId ? pinToDest.get(hoveredPinId) ?? null : null;

  const handleChipEnter = useCallback(
    (key: ColombiaRegion) => {
      setHoveredRegion(key);
      queueRegionAnalytics(key);
    },
    [queueRegionAnalytics],
  );

  const handleChipLeave = useCallback(() => {
    setHoveredRegion(null);
    queueRegionAnalytics(null);
  }, [queueRegionAnalytics]);

  const handlePinClick = useCallback(
    (id: string) => {
      const dest = pinToDest.get(id);
      if (!dest) return;
      setHoveredPinId(id);
      trackEvent('destination_card_click', {
        destination_id: dest.id,
        destination_slug: dest.slug ?? null,
        surface: 'pin',
      });
    },
    [pinToDest],
  );

  const handleCardCtaClick = useCallback(() => {
    if (!hoveredDest) return;
    trackEvent('destination_card_click', {
      destination_id: hoveredDest.id,
      destination_slug: hoveredDest.slug ?? null,
      surface: 'card_cta',
    });
  }, [hoveredDest]);

  const highlightedRegions = useMemo<ColombiaRegion[]>(
    () => (hoveredRegion ? [hoveredRegion] : []),
    [hoveredRegion],
  );

  // Resolve the floating-card CTA href. When we have a slug, link to
  // the destination page; fall back to the section-level CTA href so
  // the card still leads somewhere.
  const cardCtaHref = hoveredDest?.slug
    ? resolveDestinationHref(ctaHref, hoveredDest.slug)
    : ctaHref;

  return (
    <div className="explore-map-grid">
      {/* Left column — copy + chips + CTA */}
      <div className="explore-map-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2
          className="display-md"
          style={{ margin: '12px 0 16px' }}
          dangerouslySetInnerHTML={editorialHtml(title) ?? undefined}
        />
        {subtitle ? (
          <p
            className="body-lg"
            style={{ marginTop: 16 }}
            dangerouslySetInnerHTML={editorialHtml(subtitle) ?? undefined}
          />
        ) : null}

        <div
          className="region-legend"
          role="tablist"
          aria-label={editorialText('editorialExploreFilterAria')}
        >
          {regions.map((region) => {
            const on = hoveredRegion === region.key;
            return (
              <button
                key={region.key}
                type="button"
                className={`region-legend-chip${on ? ' on' : ''}`}
                onMouseEnter={() => handleChipEnter(region.key)}
                onMouseLeave={handleChipLeave}
                onFocus={() => handleChipEnter(region.key)}
                onBlur={handleChipLeave}
                role="tab"
                aria-selected={on}
                data-region={region.key}
                title={region.highlight}
              >
                <span className="dot" data-region={region.key} />
                {region.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
            flexWrap: 'wrap',
          }}
        >
          <Link href={ctaHref} className="btn btn-primary">
            {ctaLabel} <Icons.arrow size={14} />
          </Link>
        </div>
      </div>

      {/* Right column — map stage + floating hover card */}
      <div className="explore-map-stage">
        <ColombiaMapClient
          highlightedRegions={highlightedRegions}
          pins={pins}
          activePinId={hoveredPinId}
          onPinHover={setHoveredPinId}
          onPinClick={handlePinClick}
          showLabels={true}
          showRidges={true}
          showRivers={true}
          height={580}
          ariaLabel={editorialText('editorialExploreMapAria')}
        />

        <div
          className={`explore-hover-card${hoveredDest ? ' on' : ''}`}
          aria-hidden={hoveredDest ? undefined : true}
        >
          {hoveredDest ? (
            <>
              <div>
                {hoveredDest.region ? (
                  <small>{hoveredDest.region}</small>
                ) : null}
                <b>{hoveredDest.name}</b>
                {typeof hoveredDest.packagesCount === 'number' ? (
                  <small style={{ display: 'block', marginTop: 2 }}>
                    {hoveredDest.packagesCount}{' '}
                    {hoveredDest.packagesCount === 1
                      ? editorialText('editorialPackageWord')
                      : editorialText('editorialPackagesWord')}
                  </small>
                ) : null}
              </div>
              <div className="ehc-right">
                <Link
                  href={cardCtaHref}
                  className="btn btn-ink btn-sm"
                  onClick={handleCardCtaClick}
                >
                  {editorialText('editorialExploreCardCta')} <Icons.arrow size={12} />
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Replace the last path segment of the section CTA href with the
 * destination slug, so `/site/acme/destinos` + `cartagena` →
 * `/site/acme/destinos/cartagena`. When the CTA is external / non-path
 * we just pass it through unchanged.
 */
function resolveDestinationHref(base: string, slug: string): string {
  if (!base.startsWith('/')) return base;
  // Strip trailing slashes before appending.
  const clean = base.replace(/\/+$/, '');
  return `${clean}/${slug}`;
}
