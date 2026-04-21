'use client';

/**
 * Experiences page — filter bar + card grid (client leaf).
 *
 * Filters are synced to the URL (`?level=&region=&category=&duration=`) so
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

export function ExperiencesGrid({
  activities,
  basePath,
  initialFilters,
  locale,
}: ExperiencesGridProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const levelFilters =
    levelFromUrl.length > 0 ? levelFromUrl : initialFilters?.level ?? [];
  const regionFilters =
    regionFromUrl.length > 0 ? regionFromUrl : initialFilters?.region ?? [];
  const categoryFilter =
    searchParams?.get('category') ?? initialFilters?.category ?? 'all';
  const durationFilter =
    searchParams?.get('duration') ?? initialFilters?.duration ?? 'all';
  const q = searchParams?.get('q') ?? initialFilters?.q ?? '';

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of activities) {
      if (a.region) set.add(a.region.toString());
    }
    return Array.from(set).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (categoryFilter && categoryFilter !== 'all') {
        const key = normalise(a.categoryKey || a.category);
        if (key !== normalise(categoryFilter)) return false;
      }
      if (durationFilter && durationFilter !== 'all') {
        if (normalise(a.durationBucket) !== normalise(durationFilter)) return false;
      }
      if (!matchList(a.level, levelFilters)) return false;
      if (regionFilters.length > 0 && !matchList(a.region, regionFilters)) return false;
      if (q) {
        const hay = `${a.name} ${a.title ?? ''} ${a.description ?? ''} ${a.location ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [activities, categoryFilter, durationFilter, levelFilters, regionFilters, q]);

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
    (key: 'level' | 'region', value: string) => {
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

  const setSingle = useCallback(
    (key: 'category' | 'duration', value: string) => {
      updateParams((params) => {
        if (!value || value === 'all') params.delete(key);
        else params.set(key, value);
      });
    },
    [updateParams],
  );

  const clearAll = useCallback(() => {
    updateParams((params) => {
      params.delete('level');
      params.delete('region');
      params.delete('category');
      params.delete('duration');
      params.delete('q');
    });
  }, [updateParams]);

  const hasActiveFilters =
    (categoryFilter && categoryFilter !== 'all') ||
    (durationFilter && durationFilter !== 'all') ||
    levelFilters.length > 0 ||
    regionFilters.length > 0 ||
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

      {/* Duration tabs + region/level chips */}
      <div className="exp-filterbar" data-testid="experiences-filterbar">
          <div className="exp-filter-group">
            <span className="label">{editorialText('editorialExperiencesDurationLabel')}</span>
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

        {hasActiveFilters ? (
          <button
            type="button"
            className="chip-filter"
            onClick={clearAll}
            style={{ color: 'var(--c-accent)' }}
            data-testid="experiences-clear"
          >
            {editorialText('editorialExperiencesClearAll')}
          </button>
        ) : null}
      </div>

      <div className="exp-count">
        <b data-testid="experiences-count">{filtered.length}</b> de {activities.length}{' '}
        {editorialText('editorialExperiencesCountSuffix')}
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
              fromPrefix={editorialText('editorialExperiencesFromPrefix')}
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
  fromPrefix: string;
}

function ExperienceCard({ activity, basePath, fromPrefix }: ExperienceCardProps): ReactNode {
  const href = activity.slug
    ? `${basePath}/actividades/${encodeURIComponent(activity.slug)}`
    : `${basePath}/experiencias`;
  const price = activity.price || '';
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
          <div className="exp-price">
            {price ? (
              <>
                <small>{fromPrefix}</small>
                <b>{price}</b>
              </>
            ) : null}
          </div>
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
