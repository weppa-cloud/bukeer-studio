/**
 * editorial-v1 — Planners list page variant.
 *
 * Route: `/planners` on a site whose theme opts into editorial-v1.
 *
 * Port of designer `PlannersList` from
 *   themes/references/claude design 1/project/planners.jsx
 * keeping:
 *  - Hero (PageHero-equivalent: eyebrow + title with emphasis + subtitle)
 *  - "Why a local planner" intro block with stats (6 planners · 939
 *    reseñas · 4.97 rating — now driven by `brandClaims`)
 *  - Filter-tab toolbar + grid
 *  - Matchmaker quiz panel (3 quiz tabs: grupo / región / estilo)
 *
 * Server component; the interactive filter + quiz logic lives in
 * `sections/planners-matchmaker.client.tsx`.
 *
 * Data inputs (all optional):
 *  - `dbPlanners` — hydrated by the page route from `getPlanners`.
 *  - `website.theme.profile.metadata.templateSet` — must resolve to
 *    `editorial-v1` for the page to mount (dispatcher responsibility).
 *  - `brandClaims` — when provided, renders the aggregate stats band
 *    (otherwise falls back to counting live planners in-memory).
 */

import type { CSSProperties } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';
import type { BrandClaims } from '@bukeer/website-contract';

import { Eyebrow } from '../primitives/eyebrow';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import {
  PlannersMatchmaker,
  type MatchmakerPlanner,
  type MatchmakerTab,
} from '../sections/planners-matchmaker.client';
import { getBasePath } from '@/lib/utils/base-path';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

// ---------- Props ----------

export interface EditorialPlannersListPageProps {
  website: WebsiteData;
  dbPlanners: PlannerData[];
  brandClaims?: BrandClaims | null;
}

// ---------- Helpers ----------

function mapRole(
  role: string | null,
  editorialText: ReturnType<typeof getPublicUiExtraTextGetter>,
): string {
  const roleMap: Record<string, string> = {
    agent: editorialText('editorialRoleAgent'),
    admin: editorialText('editorialRolePlanner'),
    operations: editorialText('editorialRoleOperations'),
    manager: editorialText('editorialRoleManager'),
    sales: editorialText('editorialRoleSales'),
  };
  return role ? roleMap[role] || role : editorialText('editorialRolePlanner');
}

function wa(
  phone: string | null | undefined,
  fallback: string | null | undefined,
  firstName: string,
  template: string,
): string | null {
  const raw = (phone || fallback || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(template.replace('{name}', firstName))}`;
}

function toMatchmakerPlanner(
  p: PlannerData,
  basePath: string,
  websiteWhatsapp: string | undefined,
  editorialText: ReturnType<typeof getPublicUiExtraTextGetter>,
  defaultQuoteFallback: string,
  waTemplate: string,
): MatchmakerPlanner {
  const firstName = p.name.split(' ')[0] || p.fullName;
  return {
    id: p.id,
    name: p.fullName,
    slug: p.slug,
    photo: p.photo,
    role: p.position || mapRole(p.role, editorialText),
    quote: (p.quote && p.quote.trim()) || defaultQuoteFallback,
    // No structured specialties column exists yet — we surface `position`
    // and `user_rol` as a low-fidelity match surface. The matchmaker uses
    // substring checks so a free-text "position" of "Planner Caribe,
    // cultura, gastronomía" still matches the quiz dimensions.
    specialties: [p.position, p.role].filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0,
    ),
    languages: [],
    rating: null,
    reviews: null,
    base: null,
    years: null,
    availability: null,
    whatsappHref: wa(p.phone, websiteWhatsapp, firstName, waTemplate),
    profileHref: `${basePath}/planners/${p.slug}`,
  };
}

// ---------- Stats formatting ----------

function formatRating(n: number | null | undefined): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return n.toFixed(2);
}

// ---------- Page ----------

export function EditorialPlannersListPage({
  website,
  dbPlanners,
  brandClaims,
}: EditorialPlannersListPageProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const isEnglish = resolvedLocale.toLowerCase().startsWith('en');
  const basePath = getBasePath(website.subdomain, false);
  const websiteWhatsapp = website.content?.social?.whatsapp;
  const waTemplate = isEnglish
    ? 'Hi {name}, I want to plan a trip'
    : 'Hola {name}, quiero organizar un viaje';

  const tabs: MatchmakerTab[] = [
    { key: 'all', label: editorialText('editorialPackagesAllTab') },
    { key: 'Caribe', label: editorialText('editorialRegionCaribe') },
    { key: 'Eje Cafetero', label: 'Eje Cafetero' },
    { key: 'Amazonas', label: isEnglish ? 'Amazon / Pacific' : 'Amazonas / Pacífico' },
    { key: 'Aventura', label: isEnglish ? 'Adventure' : 'Aventura' },
    { key: 'Medellín', label: 'Medellín' },
    { key: 'Cali', label: isEnglish ? 'South Pacific' : 'Pacífico Sur' },
  ];

  const quizGroups = [
    { key: 'solo', label: isEnglish ? 'Solo' : 'Solo' },
    { key: 'pareja', label: isEnglish ? 'Couple' : 'Pareja' },
    { key: 'familia', label: isEnglish ? 'Family' : 'Familia' },
    { key: 'grupo', label: isEnglish ? 'Group' : 'Grupo' },
  ];

  const quizRegions = [
    { key: 'Caribe', label: editorialText('editorialRegionCaribe') },
    { key: 'Andes', label: editorialText('editorialRegionAndes') },
    { key: 'Amazonas', label: isEnglish ? 'Amazon' : 'Amazonas' },
    { key: 'Pacífico', label: editorialText('editorialRegionPacifico') },
    { key: 'Aventura', label: isEnglish ? 'Adventure' : 'Aventura' },
  ];

  const quizStyles = [
    { key: 'cultura', label: isEnglish ? 'Culture' : 'Cultura' },
    { key: 'aventura', label: isEnglish ? 'Adventure' : 'Aventura' },
    { key: 'naturaleza', label: isEnglish ? 'Nature' : 'Naturaleza' },
    { key: 'gastronomia', label: editorialText('editorialExperienceCategoryGastronomy') },
    { key: 'boutique', label: 'Boutique' },
  ];

  const matchHeading = {
    eyebrow: editorialText('editorialMatchmakerHeadingEyebrow'),
    title: editorialText('editorialMatchmakerHeadingTitle'),
    titleEmphasis: editorialText('editorialMatchmakerHeadingTitleEm'),
    body: editorialText('editorialMatchmakerHeadingBody'),
    ctaLabel: editorialText('editorialMatchmakerHeadingCta'),
    groupLabel: editorialText('editorialMatchmakerGroupQuestion'),
    regionLabel: editorialText('editorialMatchmakerRegionQuestion'),
    styleLabel: editorialText('editorialMatchmakerStyleQuestion'),
    matchLabel: editorialText('editorialMatchmakerMatchLabel'),
  };

  const toolbarCopy = {
    singular: editorialText('editorialPlannersListSingular'),
    plural: editorialText('editorialPlannersListPlural'),
    sortByLabel: editorialText('editorialPlannersListSortBy'),
    sortByValue: editorialText('editorialPlannersListSortByValue'),
  };

  const cardCopy = {
    viewProfile: editorialText('editorialPlannersListCardViewProfile'),
    availableFallback: editorialText('editorialPlannersListCardAvailable'),
    yearsSuffix: editorialText('editorialPlannersListCardYearsSuffix'),
  };

  const defaultQuoteFallback = editorialText('editorialPlannersQuoteFallback');

  const totalPlanners =
    brandClaims?.totalPlanners ?? dbPlanners.length;
  const avgRating = brandClaims?.plannersAvgRating ?? null;
  const totalReviews = brandClaims?.totalReviews ?? null;

  const matchmakerPlanners = dbPlanners.map((p) =>
    toMatchmakerPlanner(
      p,
      basePath,
      websiteWhatsapp,
      editorialText,
      defaultQuoteFallback,
      waTemplate,
    ),
  );

  const tabsWithCounts: MatchmakerTab[] = tabs.map((t) => {
    if (t.key === 'all') {
      return { ...t, count: matchmakerPlanners.length };
    }
    const count = matchmakerPlanners.filter((p) =>
      p.specialties.some((s) =>
        s.toLowerCase().includes(t.key.toLowerCase()),
      ),
    ).length;
    return { ...t, count };
  });

  return (
    <div data-screen-label="PlannersList">
      {/* Hero */}
      <section style={heroStyle} className="planners-hero">
        <div className="ev-container" style={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs
            items={[
              { label: editorialText('editorialBreadcrumbHome'), href: basePath || '/' },
              { label: editorialText('sectionPlannersTitle') },
            ]}
          />
          <div style={{ marginTop: 24 }}>
            <Eyebrow tone="light">{editorialText('editorialPlannersListHeroEyebrow')}</Eyebrow>
            <h1 style={heroTitleStyle}>
              {editorialText('editorialPlannersListHeroTitle')}{' '}
              <em
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent-2)',
                  fontWeight: 400,
                }}
              >
                {editorialText('editorialPlannersListHeroEmphasis')}
              </em>
            </h1>
            <p style={heroSubtitleStyle}>{editorialText('editorialPlannersListHeroSubtitle')}</p>
          </div>
        </div>
      </section>

      {/* Intro + stats */}
      <section className="ev-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="ev-container">
          <div className="pl-intro">
            <div>
              <Eyebrow>{editorialText('editorialPlannersListIntroEyebrow')}</Eyebrow>
              <h2>
                {editorialText('editorialPlannersListIntroTitlePart1')}{' '}
                <em>{editorialText('editorialPlannersListIntroTitleEm')}</em>{' '}
                {editorialText('editorialPlannersListIntroTitlePart2')}
              </h2>
              <p>{editorialText('editorialPlannersListIntroBody')}</p>
            </div>
            <div className="stats" role="group" aria-label="Aggregate stats">
              <div className="s">
                <b>{totalPlanners}</b>
                <small>{editorialText('editorialPlannersListStatsPlanners')}</small>
              </div>
              {typeof avgRating === 'number' ? (
                <div className="s">
                  <b>
                    {formatRating(avgRating)}
                    <em>/5</em>
                  </b>
                  <small>{editorialText('editorialPlannersListStatsRating')}</small>
                </div>
              ) : null}
              {typeof totalReviews === 'number' ? (
                <div className="s">
                  <b>{totalReviews}</b>
                  <small>{editorialText('editorialPlannersListStatsTrips')}</small>
                </div>
              ) : null}
            </div>
          </div>

          {/* Matchmaker + grid (client) */}
          <PlannersMatchmaker
            planners={matchmakerPlanners}
            tabs={tabsWithCounts}
            heading={matchHeading}
            options={{
              groups: quizGroups,
              regions: quizRegions,
              styles: quizStyles,
            }}
            toolbarCopy={toolbarCopy}
            cardCopy={cardCopy}
          />
        </div>
      </section>
    </div>
  );
}

// ---------- Inline styles (section-scoped) ----------

const heroStyle: CSSProperties = {
  background: 'var(--c-ink)',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  padding: '80px 0 64px',
  borderRadius: '0 0 32px 32px',
};

const heroTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 'clamp(40px, 6vw, 64px)',
  letterSpacing: '-0.025em',
  lineHeight: 1.02,
  color: '#fff',
  margin: '12px 0 16px',
};

const heroSubtitleStyle: CSSProperties = {
  color: 'rgba(255,255,255,.78)',
  fontSize: 17,
  lineHeight: 1.55,
  maxWidth: '54ch',
  margin: 0,
};

export default EditorialPlannersListPage;
