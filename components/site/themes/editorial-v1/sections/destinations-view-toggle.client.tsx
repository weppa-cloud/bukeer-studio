'use client';

/**
 * editorial-v1 — <DestinationsViewToggle />
 *
 * Client root that owns the `list | map` state for the destinations
 * section. Renders the toggle pill (with the designer's icons) plus
 * the active view inline. Both views are passed as React nodes via
 * `listView` / `mapView` props — the inactive one stays mounted but
 * gets `hidden` applied so crawlers still see the server-rendered
 * list markup (SEO) and flipping between views carries no re-fetch.
 *
 * Layout contract: the parent passes `headerNode` (the section header
 * content block — eyebrow + h2 + subtitle) so the component can render
 * it beside the toggle pill inside the editorial `.ev-section-head`
 * grid. This keeps the toggle visually in the right column as the
 * designer prototype shows.
 *
 * URL hash sync: when `syncHash` is true (default), `#map` / no hash
 * keeps deep links honest. Uses `replaceState` to avoid polluting
 * browser history for what is effectively a visual toggle.
 *
 * Plan: `.claude/plans/piped-finding-popcorn.md` Wave 2.10.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export type DestinationsViewMode = 'list' | 'map';

const HASH_MAP = 'map';
const HASH_LIST = 'list';

function readHashView(): DestinationsViewMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '').toLowerCase();
  if (raw === HASH_MAP) return 'map';
  if (raw === HASH_LIST) return 'list';
  return null;
}

export interface DestinationsViewToggleProps {
  /** Header column — eyebrow + title + subtitle tree from the server. */
  headerNode: ReactNode;
  /** Server-rendered list grid. */
  listView: ReactNode;
  /** Map view (interactive client component). */
  mapView: ReactNode;
  /** Initial view when no URL hash is present. */
  defaultView?: DestinationsViewMode;
  /** When true (default), keeps `#map` / no-hash in sync with `view`. */
  syncHash?: boolean;
  labels?: {
    list?: string;
    map?: string;
  };
  locale?: string | null;
  /** Optional style for the right-column tools stack. */
  toolsStyle?: CSSProperties;
}

export function DestinationsViewToggle({
  headerNode,
  listView,
  mapView,
  defaultView = 'list',
  syncHash = true,
  labels,
  locale,
  toolsStyle,
}: DestinationsViewToggleProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const [view, setView] = useState<DestinationsViewMode>(defaultView);

  // On mount, prefer the URL hash when present.
  useEffect(() => {
    if (!syncHash) return;
    const hashed = readHashView();
    if (hashed) setView(hashed);
  }, [syncHash]);

  const handleChange = useCallback(
    (next: DestinationsViewMode) => {
      setView(next);
      if (!syncHash || typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      url.hash = next === 'map' ? `#${HASH_MAP}` : '';
      window.history.replaceState(null, '', url.toString());
    },
    [syncHash],
  );

  const listLabel = labels?.list ?? editorialText('editorialDestinationsViewList');
  const mapLabel = labels?.map ?? editorialText('editorialDestinationsViewMap');

  return (
    <>
      <div className="ev-section-head">
        <div>{headerNode}</div>
        <div
          className="tools"
          style={
            toolsStyle ?? {
              alignItems: 'flex-end',
              flexDirection: 'column',
              gap: 16,
            }
          }
        >
          <div
            role="tablist"
            aria-label={editorialText('editorialDestinationsViewAria')}
            className="view-toggle"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={view === 'list' ? 'on' : ''}
              onClick={() => handleChange('list')}
            >
              <Icons.grid size={14} />
              {listLabel}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'map'}
              className={view === 'map' ? 'on' : ''}
              onClick={() => handleChange('map')}
            >
              <Icons.pin size={14} />
              {mapLabel}
            </button>
          </div>
        </div>
      </div>

      <div data-view="list" hidden={view !== 'list'}>
        {listView}
      </div>
      <div data-view="map" hidden={view !== 'map'}>
        {mapView}
      </div>
    </>
  );
}
