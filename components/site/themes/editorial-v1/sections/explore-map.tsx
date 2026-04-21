/**
 * editorial-v1 — <ExploreMapSection />
 *
 * Home "Explora Colombia" section. Two-column layout:
 *   - LEFT: eyebrow + H2 + subtitle + region legend (4 chips) + CTA
 *   - RIGHT: editorial <ColombiaMap> stage with pins + floating hover card
 *
 * Port of designer `ExploreMap` in
 *   themes/references/claude design 1/project/sections.jsx
 * + CSS in `.../maps.css` (`.explore-map-*`, `.region-legend*`,
 *   `.explore-hover-card*`).
 *
 * The server component resolves copy, builds the pin set from the
 * hydrated `featuredDestinations` (or falls back to the explicit
 * `destinations` content prop) and delegates all interactive
 * orchestration (chip hover ↔ map highlight ↔ floating card) to the
 * `ExploreMapClient` leaf.
 *
 * Opt-in: mounted only when the website's theme profile declares
 * `metadata.templateSet = 'editorial-v1'`.
 */

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

import {
  ExploreMapClient,
  type ExploreMapRegionConfig,
  type ExploreMapDestination,
} from './explore-map.client';

// ---------- Props ----------
export interface ExploreMapSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// Raw shape coming in from DB — all fields optional / loose.
type ExploreMapContent = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  regions?: Array<{
    key?: string | null;
    label?: string | null;
    highlight?: string | null;
  }> | null;
  destinations?: Array<Record<string, unknown>> | null;
  featuredDestinations?: Array<Record<string, unknown>> | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

// ---------- Defaults (from copy-catalog.md + designer sections.jsx) ----------
const DEFAULT_EYEBROW_KEY = 'editorialExploreEyebrowFallback';
const DEFAULT_TITLE_KEY = 'editorialExploreTitleFallback';
const DEFAULT_CTA_LABEL_KEY = 'editorialExploreCtaFallback';
const DEFAULT_CTA_HREF = '/destinos';

const VALID_REGION_KEYS = new Set<ExploreMapRegionConfig['key']>([
  'caribe',
  'andes',
  'selva',
  'pacifico',
]);

function coerceRegions(
  raw: ExploreMapContent['regions'],
  defaults: ExploreMapRegionConfig[],
): ExploreMapRegionConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const out: ExploreMapRegionConfig[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    const key = (entry.key ?? '').toString().trim().toLowerCase();
    if (!VALID_REGION_KEYS.has(key as ExploreMapRegionConfig['key'])) continue;
    const label = (entry.label ?? '').toString().trim();
    if (!label) continue;
    out.push({
      key: key as ExploreMapRegionConfig['key'],
      label,
      highlight: (entry.highlight ?? '').toString().trim() || undefined,
    });
  }
  return out.length > 0 ? out : defaults;
}

/**
 * Normalise raw destinations into a shape the client can consume.
 *
 * Accepts two source shapes without forcing the hydrator to transform:
 *  - authored: `{ id, name, slug?, region?, packagesCount? }`
 *  - hydrated `featuredDestinations`: `{ slug, headline, tagline, ... }`
 *
 * All we need here is: id (stable), a display name, an optional slug
 * (for the CTA link) and an optional region (for chip ↔ pin sync).
 */
function coerceDestinations(
  list: Array<Record<string, unknown>> | null | undefined,
): ExploreMapDestination[] {
  if (!Array.isArray(list)) return [];
  const out: ExploreMapDestination[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const slug = (entry.slug ?? entry.destinationSlug ?? '')
      .toString()
      .trim();
    const name =
      (entry.name ?? entry.headline ?? entry.title ?? '').toString().trim() ||
      slug;
    if (!name) continue;

    const id = (entry.id ?? slug ?? name).toString();
    const region = (entry.region ?? '').toString().trim().toLowerCase();
    const tagline = (entry.tagline ?? entry.subtitle ?? '').toString().trim();
    const packagesCount = typeof entry.packagesCount === 'number'
      ? entry.packagesCount
      : typeof entry.packages_count === 'number'
        ? (entry.packages_count as number)
        : undefined;

    out.push({
      id,
      name,
      slug: slug || undefined,
      region: VALID_REGION_KEYS.has(
        region as ExploreMapRegionConfig['key'],
      )
        ? (region as ExploreMapRegionConfig['key'])
        : undefined,
      tagline: tagline || undefined,
      packagesCount,
    });
  }
  return out;
}

export function ExploreMapSection({
  section,
  website,
}: ExploreMapSectionProps) {
  const editorialText = getEditorialTextGetter(website);
  const raw = (section.content ?? {}) as ExploreMapContent;

  const defaultRegions: ExploreMapRegionConfig[] = [
    {
      key: 'caribe',
      label: editorialText('editorialRegionCaribe'),
      highlight: editorialText('editorialRegionCaribeHighlight'),
    },
    {
      key: 'andes',
      label: editorialText('editorialRegionAndes'),
      highlight: editorialText('editorialRegionAndesHighlight'),
    },
    {
      key: 'selva',
      label: editorialText('editorialRegionSelva'),
      highlight: editorialText('editorialRegionSelvaHighlight'),
    },
    {
      key: 'pacifico',
      label: editorialText('editorialRegionPacifico'),
      highlight: editorialText('editorialRegionPacificoHighlight'),
    },
  ];

  const eyebrow = localizeEditorialText(
    website,
    (raw.eyebrow ?? '').toString().trim() || editorialText(DEFAULT_EYEBROW_KEY),
  );
  const title = localizeEditorialText(
    website,
    (raw.title ?? '').toString().trim() || editorialText(DEFAULT_TITLE_KEY),
  );
  const subtitle = localizeEditorialText(website, (raw.subtitle ?? '').toString().trim());
  const ctaLabel =
    localizeEditorialText(
      website,
      (raw.ctaLabel ?? '').toString().trim() || editorialText(DEFAULT_CTA_LABEL_KEY),
    );
  const ctaHrefRaw =
    (raw.ctaHref ?? '').toString().trim() || DEFAULT_CTA_HREF;

  const regions = coerceRegions(raw.regions, defaultRegions);

  // Prefer explicit `destinations` if the author set it; otherwise use
  // the hydrated `featuredDestinations` (Wave 2.7). If neither is
  // present, `destinations` is `[]` and the map shows no pins — still
  // valid (legend-only rendering).
  const destinations = coerceDestinations(
    raw.destinations ?? raw.featuredDestinations ?? null,
  );

  // Resolve CTA href:
  // - absolute URL / mailto / tel → pass-through
  // - starts with '#' → pass-through
  // - starts with '/' → prefix with /site/{subdomain} when NOT a custom domain
  let ctaHref = ctaHrefRaw;
  if (ctaHrefRaw.startsWith('/')) {
    ctaHref = `/site/${website.subdomain}${ctaHrefRaw}`;
  }

  return (
    <section
      className="ev-section explore-map-section"
      data-screen-label="ExploreMap"
    >
      <div className="ev-container">
        <ExploreMapClient
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle || undefined}
          regions={regions}
          destinations={destinations}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
        />
      </div>
    </section>
  );
}
