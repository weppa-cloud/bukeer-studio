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

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
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

function parseDurationMinutes(item: ExperienceItem): number {
  const label = normalise(item.durationLabel);
  if (!label) return Number.MAX_SAFE_INTEGER;
  const hourMatch = label.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = label.match(/(\d+)\s*m/);
  const h = hourMatch ? Number.parseFloat(hourMatch[1]) : 0;
  const m = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;
  const parsed = Math.round((h * 60) + m);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const bucket = normalise(item.durationBucket);
  if (bucket === 'short') return 180;
  if (bucket === 'half-day') return 300;
  if (bucket === 'full-day') return 480;
  if (bucket === 'multi-day') return 1440;
  return Number.MAX_SAFE_INTEGER;
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
  const levels = [
    { key: 'facil', label: editorialText('editorialExperienceLevelEasy') },
    { key: 'moderado', label: editorialText('editorialExperienceLevelModerate') },
    { key: 'exigente', label: editorialText('editorialExperienceLevelDemanding') },
    { key: 'intenso', label: editorialText('editorialExperienceLevelIntense') },
  ];
  const categories = [
    { key: 'all', label: editorialText('editorialExperienceCategoryAll') },
    { key: 'aventura', label: editorialText('editorialExperienceCategoryAdventure') },
    { key: 'gastronomia', label: editorialText('editorialExperienceCategoryGastronomy') },
    { key: 'cultura', label: editorialText('editorialExperienceCategoryCulture') },
    { key: 'naturaleza', label: editorialText('editorialExperienceCategoryNature') },
    { key: 'mar', label: editorialText('editorialExperienceCategorySea') },
    { key: 'bienestar', label: editorialText('editorialExperienceCategoryWellness') },
  ];
  const durationBuckets = [
    { key: 'all', label: editorialText('editorialExperienceDurationAny') },
    { key: 'short', label: editorialText('editorialExperienceDurationShort') },
    { key: 'half-day', label: editorialText('editorialExperienceDurationHalfDay') },
    { key: 'full-day', label: editorialText('editorialExperienceDurationFullDay') },
    { key: 'multi-day', label: editorialText('editorialExperienceDurationMultiDay') },
  ];

  // Prefer URL params (bookmarkable); fall back to server-provided `initialFilters`.
  const levelFromUrl = toArray(searchParams?.get('level'));
  const regionFromUrl = toArray(searchParams?.get('region'));
  const locationFromUrl = toArray(searchParams?.get('location'));
  const levelFilters =
    levelFromUrl.length > 0 ? levelFromUrl : initialFilters?.level ?? [];
  const regionFilters =
    regionFromUrl.length > 0 ? regionFromUrl : initialFilters?.region ?? [];
  const locationFilters =
    locationFromUrl.length > 0 ? locationFromUrl : initialFilters?.location ?? [];
  const categoryFilter =
    searchParams?.get('category') ?? initialFilters?.category ?? 'all';
  const durationFilter =
    searchParams?.get('duration') ?? initialFilters?.duration ?? 'all';
  const sortParam = searchParams?.get('sort') ?? initialFilters?.sort ?? 'popular';
  const sortFilter =
    sortParam === 'priceAsc' || sortParam === 'priceDesc'
      ? 'popular'
      : sortParam;
  const q = searchParams?.get('q') ?? initialFilters?.q ?? '';
  const sortOptions = [
    { key: 'popular', label: editorialText('editorialExperiencesSortPopular') },
    { key: 'rating', label: editorialText('editorialExperiencesSortRating') },
    { key: 'duration', label: editorialText('editorialExperiencesSortDuration') },
  ];

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of activities) {
      if (a.region) set.add(a.region.toString());
    }
    return Array.from(set).sort();
  }, [activities]);

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
      if (categoryFilter && categoryFilter !== 'all') {
        const key = normalise(a.categoryKey || a.category);
        if (key !== normalise(categoryFilter)) return false;
      }
      if (durationFilter && durationFilter !== 'all') {
        if (normalise(a.durationBucket) !== normalise(durationFilter)) return false;
      }
      if (!matchList(a.level, levelFilters)) return false;
      if (regionFilters.length > 0 && !matchList(a.region, regionFilters)) return false;
      if (locationFilters.length > 0 && !matchList(a.location, locationFilters)) return false;
      if (q) {
        const hay = `${a.name} ${a.title ?? ''} ${a.description ?? ''} ${a.location ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    activities,
    categoryFilter,
    durationFilter,
    levelFilters,
    locationFilters,
    q,
    regionFilters,
  ]);
  const filtered = useMemo(() => {
    const arr = [...filteredByFilters];
    if (sortFilter === 'rating') {
      return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (sortFilter === 'duration') {
      return arr.sort((a, b) => parseDurationMinutes(a) - parseDurationMinutes(b));
    }
    return arr;
  }, [filteredByFilters, sortFilter]);

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
        const existing = toArray(params.get(key));
        const next = existing.includes(value)
          ? existing.filter((v) => v !== value)
          : [...existing, value];
        if (next.length) params.set(key, next.join(','));
        else params.delete(key);
      });
    },
    [updateParams],
  );

  const setKeyword = useCallback(
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

  const setSingle = useCallback(
    (key: 'category' | 'duration' | 'sort', value: string) => {
      updateParams((params) => {
        if (!value || (key !== 'sort' && value === 'all')) params.delete(key);
        else params.set(key, value);
      });
    },
    [updateParams],
  );

  const clearAll = useCallback(() => {
    updateParams((params) => {
      params.delete('level');
      params.delete('region');
      params.delete('location');
      params.delete('category');
      params.delete('duration');
      params.delete('sort');
      params.delete('q');
    });
  }, [updateParams]);

  const hasActiveFilters =
    (categoryFilter && categoryFilter !== 'all') ||
    (durationFilter && durationFilter !== 'all') ||
    (sortFilter && sortFilter !== 'popular') ||
    levelFilters.length > 0 ||
    regionFilters.length > 0 ||
    locationFilters.length > 0 ||
    !!q;

  return (
    <>
      {/* Category tiles */}
      <div className="exp-cats" data-testid="experiences-categories">
        {categories.map((c) => {
          const isActive = normalise(categoryFilter) === c.key;
          return (
            <button
              key={c.key}
              type="button"
              className={`exp-cat${isActive ? ' active' : ''}`}
              onClick={() => setSingle('category', c.key)}
              aria-pressed={isActive}
            >
              <b>{c.label}</b>
            </button>
          );
        })}
      </div>

      <div className="exp-toolbar" data-testid="experiences-filterbar">
        <label className="exp-search" htmlFor="experiences-keyword">
          <Icons.search size={16} aria-hidden />
          <input
            id="experiences-keyword"
            type="text"
            value={q}
            onChange={(event) => setKeyword(event.target.value)}
            className="listing-keyword-input"
            placeholder={editorialText('editorialExperiencesKeywordPlaceholder')}
            aria-label={editorialText('editorialExperiencesKeywordLabel')}
          />
        </label>

        <div className="exp-dur-tabs" role="group" aria-label={editorialText('editorialExperiencesDurationLabel')}>
          {durationBuckets.map((b) => {
            const isActive = normalise(durationFilter) === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className={`filter-tab${isActive ? ' active' : ''}`}
                onClick={() => setSingle('duration', b.key)}
                aria-pressed={isActive}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <select
          className="sort-sel"
          value={sortFilter}
          onChange={(event) => setSingle('sort', event.target.value)}
          aria-label={editorialText('editorialExperiencesSortLabel')}
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="exp-filterbar">
        {regionOptions.length > 0 ? (
          <div className="exp-filter-group">
            <span className="label">{editorialText('editorialExperiencesRegionLabel')}</span>
            {regionOptions.map((region) => {
              const isOn = regionFilters.map(normalise).includes(normalise(region));
              return (
                <button
                  key={region}
                  type="button"
                  className={`chip-filter${isOn ? ' on' : ''}`}
                  onClick={() => toggleList('region', region)}
                  aria-pressed={isOn}
                >
                  {region}
                </button>
              );
            })}
          </div>
        ) : null}

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

        <div className="exp-filter-group">
          <span className="label">{editorialText('editorialExperiencesLevelLabel')}</span>
          {levels.map((l) => {
            const isOn = levelFilters.map(normalise).includes(normalise(l.key));
            return (
              <button
                key={l.key}
                type="button"
                className={`chip-filter${isOn ? ' on' : ''}`}
                onClick={() => toggleList('level', l.key)}
                aria-pressed={isOn}
              >
                {l.label}
              </button>
            );
          })}
        </div>
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
    <Link href={href} className="exp-card" aria-label={activity.name}>
      <div className="exp-media">
        {activity.image ? (
          <Image
            src={activity.image}
            alt={activity.name}
            fill
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
        <h3 className="exp-title">{activity.name}</h3>
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
