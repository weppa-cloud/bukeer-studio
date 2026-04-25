'use client';

/**
 * Experiences page — filter bar + card grid (client leaf).
 *
 * Filters are synced to the URL (`?level=&region=&category=&duration=&sort=&q=`) so
 * the state survives reloads and is bookmarkable. We push via `router.replace`
 * without a scroll reset so hovering a chip doesn't jump the page.
 *
 * The filter state is computed eagerly from `useMemo(activities, ...)`. With
 * small activity counts (we ship editorial sites with <50 experiences) this
 * stays well under the main-thread budget.
 */

import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { supabaseImageUrl } from '@/lib/images/supabase-transform';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import type { WebsiteData } from '@/lib/supabase/get-website';

export interface ExperienceItem {
  id: string;
  slug?: string | null;
  name: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  location?: string | null;
  region?: string | null;
  category?: string | null;
  categoryKey?: string | null;
  level?: string | null;
  durationLabel?: string | null;
  durationBucket?: string | null;
  price?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  badges?: string[] | null;
  lat?: number | null;
  lng?: number | null;
}

export type ExperiencesInitialFilters = {
  level?: string[];
  region?: string[];
  location?: string[];
  category?: string;
  duration?: string;
  sort?: string;
  q?: string;
};

interface ExperiencesGridProps {
  activities: ExperienceItem[];
  basePath: string;
  initialFilters?: ExperiencesInitialFilters;
  locale?: string;
  account?: WebsiteData['content']['account'] | null;
}

function normalise(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function matchList(value: string | null | undefined, list: string[]): boolean {
  if (list.length === 0) return true;
  const v = normalise(value);
  return list.some((entry) => entry && v === normalise(entry));
}

function toArray(param: string | null | undefined): string[] {
  if (!param) return [];
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readParamList(searchParams: URLSearchParams | ReadonlyURLSearchParams | null | undefined, key: string): string[] {
  if (!searchParams) return [];
  const values = searchParams
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return [];
  if (values.length === 1 && values[0]?.includes(',')) return toArray(values[0]);
  return values;
}

export function ExperiencesGrid({
  activities,
  basePath,
  initialFilters,
  locale,
  account = null,
}: ExperiencesGridProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const router = useRouter();
  const searchParams = useSearchParams();
  void account;

  // Keep only keyword + location filters active for now.
  const locationFilters = useMemo(() => {
    const fromUrl = readParamList(searchParams, 'location');
    return fromUrl.length > 0 ? fromUrl : initialFilters?.location ?? [];
  }, [initialFilters?.location, searchParams]);
  const q = searchParams?.get('q') ?? initialFilters?.q ?? '';
  const [keywordInput, setKeywordInput] = useState(q);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of activities) {
      if (a.location) set.add(a.location.toString());
    }
    return Array.from(set).sort();
  }, [activities]);

  const filteredByFilters = useMemo(() => {
    const seen = new Set<string>();
    return activities.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      if (locationFilters.length > 0 && !matchList(a.location, locationFilters)) return false;
      if (q) {
        const hay = `${a.name} ${a.title ?? ''} ${a.description ?? ''} ${a.location ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [activities, locationFilters, q]);
  const filtered = filteredByFilters;

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams],
  );

  const toggleList = useCallback(
    (key: 'level' | 'region' | 'location', value: string) => {
      updateParams((params) => {
        const existing = readParamList(params, key);
        const next = existing.includes(value)
          ? existing.filter((v) => v !== value)
          : [...existing, value];
        params.delete(key);
        for (const item of next) {
          params.append(key, item);
        }
      });
    },
    [updateParams],
  );

  const setKeywordParam = useCallback(
    (value: string) => {
      updateParams((params) => {
        const next = value.trim();
        if (!next) {
          params.delete('q');
          return;
        }
        params.set('q', next);
      });
    },
    [updateParams],
  );

  useEffect(() => {
    setKeywordInput(q);
  }, [q]);

  useEffect(() => {
    const next = keywordInput.trim();
    const current = q.trim();
    if (next === current) return;
    const timer = setTimeout(() => {
      setKeywordParam(keywordInput);
    }, 180);
    return () => clearTimeout(timer);
  }, [keywordInput, q, setKeywordParam]);

  const clearAll = useCallback(() => {
    updateParams((params) => {
      params.delete('location');
      params.delete('q');
      // Defensive cleanup for old links/bookmarks that still include deprecated filters.
      params.delete('level');
      params.delete('region');
      params.delete('category');
      params.delete('duration');
      params.delete('sort');
    });
  }, [updateParams]);

  const hasActiveFilters =
    locationFilters.length > 0 ||
    !!q;

  return (
    <>
      <div className="exp-toolbar" data-testid="experiences-filterbar">
        <label className="exp-search" htmlFor="experiences-keyword">
          <Icons.search size={16} aria-hidden />
          <input
            id="experiences-keyword"
            type="text"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="listing-keyword-input"
            placeholder={editorialText('editorialExperiencesKeywordPlaceholder')}
            aria-label={editorialText('editorialExperiencesKeywordLabel')}
          />
        </label>
      </div>

      <div className="exp-filterbar">
        {locationOptions.length > 0 ? (
          <div className="exp-filter-group">
            <span className="label">{editorialText('editorialExperiencesLocationLabel')}</span>
            {locationOptions.map((location) => {
              const isOn = locationFilters.map(normalise).includes(normalise(location));
              return (
                <button
                  key={location}
                  type="button"
                  className={`chip-filter${isOn ? ' on' : ''}`}
                  onClick={() => toggleList('location', location)}
                  aria-pressed={isOn}
                >
                  {location}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="listing-top pql-listing-top">
        <div className="count exp-count">
          <b data-testid="experiences-count">{filtered.length}</b> de {activities.length}{' '}
          {editorialText('editorialExperiencesCountSuffix')}
          {hasActiveFilters ? (
            <>
              {' · '}
              <button
                type="button"
                className="chip-filter"
                onClick={clearAll}
                style={{ color: 'var(--c-accent)' }}
                data-testid="experiences-clear"
              >
                {editorialText('editorialExperiencesClearAll')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            background: 'var(--c-surface)',
            borderRadius: 20,
            border: '1px solid var(--c-line)',
          }}
          data-testid="experiences-empty"
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              marginBottom: 10,
            }}
          >
            {editorialText('editorialExperiencesEmptyHeading')}
          </div>
          <p className="body-md" style={{ marginBottom: 20 }}>
            {editorialText('editorialExperiencesEmptyBody')}
          </p>
          <button type="button" className="btn btn-ink" onClick={clearAll}>
            {editorialText('editorialExperiencesClearLabel')}
          </button>
        </div>
      ) : (
        <div className="exp-grid" data-testid="experiences-grid">
          {filtered.map((a) => (
            <ExperienceCard
              key={a.id}
              activity={a}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ExperienceCardProps {
  activity: ExperienceItem;
  basePath: string;
}

function ExperienceCard({
  activity,
  basePath,
}: ExperienceCardProps): ReactNode {
  const href = activity.slug
    ? `${basePath}/actividades/${encodeURIComponent(activity.slug)}`
    : `${basePath}/experiencias`;
  return (
    <Link href={href} className="exp-card">
      <div className="exp-media">
        {activity.image ? (
          <Image
            src={supabaseImageUrl(activity.image, { width: 560, quality: 70 })}
            alt={activity.name}
            fill
            loading="lazy"
            fetchPriority="low"
            sizes="(max-width: 720px) 88vw, (max-width: 1100px) 45vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
            }}
          />
        )}
        <div className="exp-badges-left">
          {activity.category ? (
            <span
              className="chip chip-white"
              style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 10 }}
            >
              {activity.category}
            </span>
          ) : null}
          {activity.level ? (
            <span className={`chip level-${normaliseLevelColor(activity.level)}`}>
              {activity.level}
            </span>
          ) : null}
        </div>
      </div>
      <div className="exp-body">
        {activity.location ? (
          <div className="exp-loc">
            <Icons.pin size={12} aria-hidden /> {activity.location}
          </div>
        ) : null}
        <h2 className="exp-title">{activity.name}</h2>
        {activity.title && activity.title !== activity.name ? (
          <p className="exp-sub">
            <em>— {activity.title}.</em>
          </p>
        ) : null}
        {activity.description ? (
          <p className="exp-desc">{activity.description}</p>
        ) : null}
        <div className="exp-foot">
          {activity.durationLabel ? (
            <div className="exp-dur">
              <Icons.clock size={13} aria-hidden /> {activity.durationLabel}
            </div>
          ) : (
            <span />
          )}
          <div className="exp-price" />
        </div>
      </div>
    </Link>
  );
}

function normaliseLevelColor(level: string): string {
  const v = level.toLowerCase();
  if (v.includes('fác') || v === 'facil') return 'leaf';
  if (v.includes('mod')) return 'amber';
  if (v.includes('exig') || v.includes('intens')) return 'coral';
  return 'leaf';
}

export default ExperiencesGrid;
