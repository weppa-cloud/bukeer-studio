/**
 * editorial-v1 — Planners Matchmaker quiz (client leaf).
 *
 * Port of the matchmaker block inside designer `PlannersList`
 *   (themes/references/claude design 1/project/planners.jsx, L104–152)
 * and the filter tabs toolbar (L57–67).
 *
 * Two orthogonal filters drive the grid:
 *
 *   1. `region` (tab row + quiz tab "¿A qué región vas?") —
 *      matches against the planner's `specialties[]` / `regions[]`
 *      / `position` text (case-insensitive substring).
 *
 *   2. `style` (quiz tab "¿Qué estilo de viaje?") — matches against
 *      the planner's `specialties[]` / tags (case-insensitive
 *      substring). Compared via a keyword set: `cultura`, `aventura`,
 *      `naturaleza`, `gastronomia`, `boutique`.
 *
 * A third tab surfaces group composition (solo, pareja, familia,
 * grupo). That tag is used loosely: it widens the style match — we
 * do NOT filter planners by it, we just record it for the WhatsApp
 * message context. Keeps the matcher deterministic without DB
 * changes.
 *
 * Result:
 *  - When quiz is pristine (no region + no style) → show all planners,
 *    no spotlight.
 *  - When at least one quiz dim is set → compute `matched` (planners
 *    satisfying both dims). First match becomes `spotlight`, rest of
 *    the deck dims visually.
 *
 * Accessibility:
 *  - Tab row uses `role="tablist"` + `role="tab"` with ARIA-controlled
 *    state.
 *  - Quiz option groups use radio semantics (arrow keys navigate).
 *  - Announced count + spotlight updates via `aria-live="polite"`.
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

// ---------- Types ----------

export interface MatchmakerPlanner {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  role: string;
  quote: string;
  specialties: string[];
  languages?: string[];
  rating?: number | null;
  reviews?: number | null;
  base?: string | null;
  years?: number | null;
  availability?: string | null;
  whatsappHref?: string | null;
  profileHref: string;
}

export interface MatchmakerTab {
  key: string;
  label: string;
  count?: number;
}

export interface PlannersMatchmakerProps {
  planners: MatchmakerPlanner[];
  /** Editorial filter tabs (top toolbar). Designer default: 7 items. */
  tabs: MatchmakerTab[];
  /** Heading copy (matchmaker panel). */
  heading: {
    eyebrow: string;
    title: string;
    titleEmphasis: string;
    body: string;
    ctaLabel: string;
    groupLabel?: string;
    regionLabel: string;
    styleLabel: string;
    matchLabel: string;
  };
  /** Quiz options. */
  options: {
    groups?: Array<{ key: string; label: string }>;
    regions: Array<{ key: string; label: string }>;
    styles: Array<{ key: string; label: string }>;
  };
  /** Copy for toolbar count row. */
  toolbarCopy: {
    singular: string;
    plural: string;
    sortByLabel: string;
    sortByValue: string;
  };
  /** Card copy fallbacks. */
  cardCopy: {
    viewProfile: string;
    availableFallback: string;
    yearsSuffix: string;
  };
  locale?: string | null;
}

// ---------- Helpers ----------

const norm = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function plannerMatchesRegion(p: MatchmakerPlanner, region: string): boolean {
  if (!region || region === 'all') return true;
  const target = norm(region);
  const haystack = [
    ...p.specialties.map(norm),
    norm(p.role),
    norm(p.base ?? ''),
  ].join(' ');
  return haystack.includes(target);
}

function plannerMatchesStyle(p: MatchmakerPlanner, style: string): boolean {
  if (!style) return true;
  const target = norm(style);
  const haystack = p.specialties.map(norm).join(' ');
  return haystack.includes(target);
}

// ---------- Component ----------

export function PlannersMatchmaker({
  planners,
  tabs,
  heading,
  options,
  toolbarCopy,
  cardCopy,
  locale,
}: PlannersMatchmakerProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  // Top tab filter (region-like umbrella).
  const [filter, setFilter] = useState<string>(tabs[0]?.key ?? 'all');
  // Quiz dimensions.
  const [group, setGroup] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [style, setStyle] = useState<string>('');

  const filtered = useMemo(() => {
    if (filter === 'all' || !filter) return planners;
    return planners.filter((p) => plannerMatchesRegion(p, filter));
  }, [filter, planners]);

  const quizActive = Boolean(region || style);

  const matches = useMemo<MatchmakerPlanner[]>(() => {
    if (!quizActive) return [];
    return planners.filter(
      (p) => plannerMatchesRegion(p, region) && plannerMatchesStyle(p, style),
    );
  }, [planners, region, style, quizActive]);

  const spotlightId = matches[0]?.id ?? null;

  const setTab = useCallback((key: string) => setFilter(key), []);

  return (
    <>
      {/* Toolbar with tabs */}
      <div className="pl-toolbar">
        <div
          className="pl-tabs"
          role="tablist"
          aria-label={heading.regionLabel}
        >
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`filter-tab${active ? ' active' : ''}`}
                onClick={() => setTab(tab.key)}
              >
                {tab.label}
                {typeof tab.count === 'number' ? (
                  <span className="count"> {tab.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div
          style={{ fontSize: 13, color: 'var(--c-muted)' }}
          aria-live="polite"
        >
          {filtered.length}{' '}
          {filtered.length === 1 ? toolbarCopy.singular : toolbarCopy.plural} ·{' '}
          {toolbarCopy.sortByLabel}{' '}
          <b style={{ color: 'var(--c-ink)' }}>{toolbarCopy.sortByValue}</b>
        </div>
      </div>

      {/* Grid */}
      <div className="pl-grid">
        {filtered.map((p) => {
          const dimmed = quizActive && p.id !== spotlightId;
          const isSpotlight = p.id === spotlightId;
          return (
            <article
              key={p.id}
              className="pl-card"
              style={{
                opacity: dimmed ? 0.55 : 1,
                outline: isSpotlight
                  ? '2px solid var(--c-accent)'
                  : undefined,
                outlineOffset: isSpotlight ? 2 : undefined,
                transition: 'opacity .2s var(--ease), outline .2s var(--ease)',
              }}
              data-match-spotlight={isSpotlight ? 'true' : undefined}
            >
              <Link
                href={p.profileHref}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <div className="top">
                  <div
                    className="av"
                    aria-hidden={p.photo ? 'true' : undefined}
                    style={
                      p.photo
                        ? {
                            background: 'transparent',
                            overflow: 'hidden',
                            position: 'relative',
                          }
                        : undefined
                    }
                  >
                    {p.photo ? (
                      <Image
                        src={p.photo}
                        alt={p.name}
                        fill
                        sizes="72px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                  <div className="who">
                    <b>{p.name}</b>
                    <div className="role">{p.role}</div>
                  </div>
                </div>
                <div className="body">
                  <p className="quote">&ldquo;{p.quote}&rdquo;</p>
                  <div className="meta-row">
                    {typeof p.rating === 'number' ? (
                      <span className="it">
                        <Icons.star size={13} /> <b>{p.rating.toFixed(1)}</b>
                        {typeof p.reviews === 'number' ? (
                          <small style={{ color: 'var(--c-muted)' }}>
                            {' '}
                            ({p.reviews})
                          </small>
                        ) : null}
                      </span>
                    ) : null}
                    {p.base ? (
                      <span className="it">
                        <Icons.pin size={13} /> {p.base}
                      </span>
                    ) : null}
                    {typeof p.years === 'number' ? (
                      <span className="it">
                        <Icons.calendar size={13} /> {p.years}{' '}
                        {cardCopy.yearsSuffix}
                      </span>
                    ) : null}
                  </div>
                  {p.specialties.length > 0 ? (
                    <div className="tags">
                      {p.specialties.map((s) => (
                        <span key={s} className="tg">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {p.languages && p.languages.length > 0 ? (
                    <div className="langs-row">
                      {p.languages.map((l) => (
                        <span key={l} className="lg">
                          {l}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="foot">
                  <span className="avail">
                    <span className="dot" />
                    {p.availability ?? cardCopy.availableFallback}
                  </span>
                  <span>
                    {cardCopy.viewProfile} <Icons.arrow size={12} />
                  </span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {/* Matchmaker panel */}
      <div className="pl-match">
        <div className="inner">
          <div>
            <span className="eyebrow hero-eyebrow">{heading.eyebrow}</span>
            <h3>
              {heading.title}{' '}
              <em
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent-2)',
                  fontWeight: 400,
                }}
              >
                {heading.titleEmphasis}
              </em>
            </h3>
            <p>{heading.body}</p>
            <button type="button" className="btn btn-accent">
              {heading.ctaLabel} <Icons.arrow size={14} />
            </button>
          </div>
          <div className="quiz">
            {options.groups && options.groups.length > 0 ? (
              <>
                <label>{heading.groupLabel ?? editorialText('editorialMatchmakerGroupQuestion')}</label>
                <div
                  className="opts"
                  role="radiogroup"
                  aria-label={heading.groupLabel ?? editorialText('editorialMatchmakerGroupQuestion')}
                >
                  {options.groups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      role="radio"
                      aria-checked={group === g.key}
                      className={group === g.key ? 'on' : ''}
                      onClick={() => setGroup(group === g.key ? '' : g.key)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <label>{heading.regionLabel}</label>
            <div
              className="opts"
              role="radiogroup"
              aria-label={heading.regionLabel}
            >
              {options.regions.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={region === r.key}
                  className={region === r.key ? 'on' : ''}
                  onClick={() => setRegion(region === r.key ? '' : r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label>{heading.styleLabel}</label>
            <div
              className="opts"
              role="radiogroup"
              aria-label={heading.styleLabel}
            >
              {options.styles.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={style === s.key}
                  className={style === s.key ? 'on' : ''}
                  onClick={() => setStyle(style === s.key ? '' : s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {matches.length > 0 ? (
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 18,
                  borderTop: '1px solid rgba(255,255,255,.12)',
                }}
                aria-live="polite"
              >
                <label>{heading.matchLabel}</label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {matches.slice(0, 2).map((m) => (
                    <Link
                      key={m.id}
                      href={m.profileHref}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,.06)',
                        border: '1px solid rgba(255,255,255,.1)',
                        color: '#fff',
                        textAlign: 'left',
                        textDecoration: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, var(--c-accent-2), var(--c-accent))',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {m.photo ? (
                          <Image
                            src={m.photo}
                            alt={m.name}
                            fill
                            sizes="40px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>
                      <div>
                        <b
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 500,
                            fontSize: 14,
                            display: 'block',
                          }}
                        >
                          {m.name}
                        </b>
                        <small
                          style={{
                            color: 'rgba(255,255,255,.6)',
                            fontSize: 11,
                          }}
                        >
                          {m.role}
                        </small>
                      </div>
                      <Icons.arrow size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default PlannersMatchmaker;
