/**
 * editorial-v1 — Planner detail page variant.
 *
 * Route: `/planners/[slug]` on a site whose theme opts into editorial-v1.
 *
 * Port of designer `PlannerDetail` from
 *   themes/references/claude design 1/project/planners.jsx
 *
 * Layout:
 *  - Full-bleed dark hero: big round avatar + name (split with serif
 *    italic last-name emphasis) + role + rating/reviews + region chips +
 *    KPI grid (experiencia / viajes / rating / idiomas).
 *  - Two-column body:
 *      main: pull quote → bio → specialties/regions chips → signature
 *        trip card → other packages → fun facts → reviews.
 *      rail: sticky sidebar with availability, response time, language
 *        pills, WhatsApp CTA pre-filled with planner's first name.
 *
 * Since the live schema doesn't yet surface bio / signature / hallmarks
 * / fun facts, those sections only render when matching data is passed
 * through via `content.plannerPayload` (author-overridable per planner
 * in `websites.sections.content`). The WhatsApp CTA + basic hero always
 * render from `contacts` table data.
 *
 * Reviews: reuse `getReviewsForContext` output (passed in as
 * `reviews` prop). Packages "by this planner" are optional; when the
 * catalog lacks that link, we pass an empty array and the section is
 * hidden.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';
import type { GoogleReviewData } from '@/lib/supabase/get-pages';

import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Icons } from '../primitives/icons';
import { getBasePath } from '@/lib/utils/base-path';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { WaflowCTAButton } from '../waflow/cta-button';
import { editorialHtml } from '../primitives/rich-heading';

// ---------- Shape overrides authors can pass via sections content ----

export interface PlannerPayload {
  /** Optional longer bio text. Falls back to `contacts.position` + fluff. */
  bio?: string;
  /** Years in operation (per planner). */
  years?: number;
  /** Trips designed counter. */
  trips?: number;
  /** Explicit rating (0-5). */
  rating?: number;
  /** Total reviews. */
  reviews?: number;
  /** Region chips. */
  regions?: string[];
  /** Specialty chips. */
  specialties?: string[];
  /** Language pills (3-letter codes, e.g. "ES", "EN"). */
  languages?: string[];
  /** Response time string, e.g. "~3 min". */
  response?: string;
  /** Base city. */
  base?: string;
  /** Availability blurb, e.g. "Acepta viajes a partir de mayo". */
  availability?: string;
  /** Signature trip block. */
  signature?: {
    title: string;
    note: string;
    imageUrl?: string | null;
  };
  /** Fun facts (1-line each). */
  funFacts?: string[];
}

export interface RelatedPackage {
  id: string;
  slug: string;
  title: string;
  location?: string;
  image?: string | null;
  price?: string;
  currency?: string;
  badges?: string[];
}

export interface PlannerDetailReview {
  name: string;
  location?: string | null;
  rating: number;
  text: string;
  pkg?: string;
}

// ---------- Props ----------

export interface EditorialPlannerDetailPageProps {
  website: WebsiteData;
  planner: PlannerData;
  payload?: PlannerPayload;
  reviews?: GoogleReviewData[];
  relatedPackages?: RelatedPackage[];
  /** Short list of other planners for the bottom strip. */
  otherPlanners?: PlannerData[];
}

// ---------- Copy (verbatim copy-catalog.md "Planner detail page") ----

type EditorialTextGetter = ReturnType<typeof getPublicUiExtraTextGetter>;

function createSectionCopy(editorialText: EditorialTextGetter) {
  return {
    bio: editorialText('editorialPlannerDetailBio'),
    differentiators: editorialText('editorialPlannerDetailDifferentiators'),
    differentiatorsEm: editorialText('editorialPlannerDetailDifferentiatorsEm'),
    specialtiesLabel: editorialText('editorialPlannerDetailSpecialtiesLabel'),
    regionsLabel: editorialText('editorialPlannerDetailRegionsLabel'),
    signature: editorialText('editorialPlannerDetailSignature'),
    signatureEm: editorialText('editorialPlannerDetailSignatureEm'),
    signatureSubLabel: editorialText('editorialPlannerDetailSignatureSubLabel'),
    hallmarks: editorialText('editorialPlannerDetailHallmarks'),
    hallmarksEm: editorialText('editorialPlannerDetailHallmarksEm'),
    facts: editorialText('editorialPlannerDetailFacts'),
    factsEm: editorialText('editorialPlannerDetailFactsEm'),
    reviewsTitle: editorialText('editorialPlannerDetailReviewsTitle'),
    reviewsEm: editorialText('editorialPlannerDetailReviewsEm'),
    otherPlanners: editorialText('editorialPlannerDetailOtherPlanners'),
    otherPlannersEm: editorialText('editorialPlannerDetailOtherPlannersEm'),
    kpiExperience: editorialText('editorialPlannerDetailKpiExperience'),
    kpiTrips: editorialText('editorialPlannerDetailKpiTrips'),
    kpiRating: editorialText('editorialPlannerDetailKpiRating'),
    kpiLanguages: editorialText('editorialPlannerDetailKpiLanguages'),
    railSpeakWith: editorialText('editorialPlannerDetailRailSpeakWith'),
    railResponseTime: editorialText('editorialPlannerDetailRailResponseTime'),
    railFrom: editorialText('editorialPlannerDetailRailFrom'),
    railLanguages: editorialText('editorialPlannerDetailRailLanguages'),
    railPrimaryCta: editorialText('editorialPlannerDetailRailPrimaryCta'),
    railSecondaryCta: editorialText('editorialPlannerDetailRailSecondaryCta'),
    railFootnote: editorialText('editorialPlannerDetailRailFootnote'),
    signaturePrimaryCta: editorialText('editorialPlannerDetailSignaturePrimaryCta'),
    signatureSecondaryCta: editorialText('editorialPlannerDetailSignatureSecondaryCta'),
    signatureChip: editorialText('editorialPlannerDetailSignatureChip'),
  } as const;
}

// ---------- Helpers ----------

function mapRole(role: string | null, editorialText: EditorialTextGetter): string {
  const roleMap: Record<string, string> = {
    agent: editorialText('editorialRoleAgent'),
    admin: editorialText('editorialRolePlanner'),
    operations: editorialText('editorialRoleOperations'),
    manager: editorialText('editorialRoleManager'),
    sales: editorialText('editorialRoleSales'),
  };
  return role ? roleMap[role] || role : editorialText('editorialRolePlanner');
}

function waHref(
  phone: string | null | undefined,
  fallback: string | null | undefined,
  firstName: string,
  fullName: string,
): string | null {
  const raw = (phone || fallback || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const text = `Hola ${firstName}, quiero organizar un viaje…`;
  // Include fullName as a hidden reference so ops can reconcile.
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}${
    fullName && fullName !== firstName ? '' : ''
  }`;
}

function splitName(fullName: string): { first: string; rest: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { first: parts[0] || fullName, rest: '' };
  }
  return { first: parts[0], rest: parts.slice(1).join(' ') };
}

// ---------- Page ----------

export function EditorialPlannerDetailPage({
  website,
  planner,
  payload,
  reviews,
  relatedPackages,
  otherPlanners,
}: EditorialPlannerDetailPageProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ??
    website.content?.locale ??
    website.default_locale ??
    'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const isEnglish = resolvedLocale.toLowerCase().startsWith('en');
  const SECTION_COPY = createSectionCopy(editorialText);
  const DEFAULT_AVAILABILITY = editorialText('editorialPlannersAvailable');
  const DEFAULT_RESPONSE = editorialText('editorialPlannerDetailDefaultResponse');
  const DEFAULT_BIO_FALLBACK = editorialText('editorialPlannerDetailBioFallback');
  const basePath = getBasePath(website.subdomain, Boolean((website as { isCustomDomain?: boolean }).isCustomDomain));
  const websiteWhatsapp = website.content?.social?.whatsapp;
  const { first, rest } = splitName(planner.fullName);
  const primaryWhatsappLabel = isEnglish
    ? `Chat with ${first} on WhatsApp`
    : `Hablar con ${first} por WhatsApp`;

  const role = planner.position || mapRole(planner.role, editorialText);
  const quote =
    (planner.quote && planner.quote.trim()) ||
    DEFAULT_BIO_FALLBACK;
  const bio = (payload?.bio && payload.bio.trim()) || DEFAULT_BIO_FALLBACK;
  const base = payload?.base || null;
  const availability = payload?.availability || DEFAULT_AVAILABILITY;
  const response = payload?.response || DEFAULT_RESPONSE;

  const regions = payload?.regions ?? [];
  const specialties = payload?.specialties ?? [];
  // Derive language chip from `contacts.language` when payload omits it.
  const fallbackLanguage =
    planner.language && planner.language.trim()
      ? planner.language.trim().slice(0, 2).toUpperCase()
      : 'ES';
  const languages =
    payload?.languages && payload.languages.length > 0
      ? payload.languages
      : [fallbackLanguage];

  const rating =
    typeof payload?.rating === 'number' ? payload.rating : null;
  const reviewsCount =
    typeof payload?.reviews === 'number' ? payload.reviews : null;
  const trips = payload?.trips ?? null;
  const years = payload?.years ?? null;

  // Ghost pattern: only render a KPI when we actually have the number.
  // The whole KPI grid hides when every cell would be empty (prevents
  // "— viajes / — rating / — años" placeholder strip visible in local
  // audit LOCAL-08-planner-detail-leidy-fullpage.png).
  const kpis: Array<{ key: string; value: string; label: string }> = [];
  if (years != null) {
    kpis.push({ key: 'years', value: String(years), label: SECTION_COPY.kpiExperience });
  }
  if (trips != null) {
    kpis.push({ key: 'trips', value: String(trips), label: SECTION_COPY.kpiTrips });
  }
  if (rating != null) {
    kpis.push({ key: 'rating', value: rating.toFixed(1), label: SECTION_COPY.kpiRating });
  }
  // Languages: always show (at minimum we have the planner's `language`).
  kpis.push({
    key: 'languages',
    value: String(languages.length),
    label: SECTION_COPY.kpiLanguages,
  });

  const waPrimary = waHref(
    planner.phone,
    websiteWhatsapp,
    first,
    planner.fullName,
  );
  const signatureWa = waHref(
    planner.phone,
    websiteWhatsapp,
    first,
    planner.fullName,
  );

  const otherFiltered = (otherPlanners ?? []).filter(
    (p) => p.id !== planner.id,
  );

  return (
    <div data-screen-label="PlannerDetail">
      {/* Hero */}
      <div
        className="pld-hero page-hero"
        style={{
          ...pldHeroWrapperStyle,
          ...(planner.photo
            ? {
                backgroundImage: `url(${planner.photo})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }
            : {}),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.75) 100%)',
            zIndex: 0,
          }}
        />
        <div
          className="ev-container"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Breadcrumbs
            tone="inverse"
            className="pkg-hero-breadcrumb"
            items={[
              { label: editorialText('editorialBreadcrumbHome'), href: basePath || '/' },
              { label: 'Planners', href: `${basePath}/planners` },
              { label: planner.fullName },
            ]}
          />
          <div className="grid">
            <div
              className="big-av"
              style={{
                ...bigAvStyle,
                background: planner.photo
                  ? 'transparent'
                  : 'linear-gradient(135deg, var(--c-accent-2), var(--c-accent))',
              }}
            >
              {planner.photo ? (
                <Image
                  src={planner.photo}
                  alt={planner.fullName}
                  fill
                  priority
                  sizes="(max-width: 1100px) 160px, 180px"
                  style={{
                    objectFit: 'cover',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <span aria-hidden="true" style={avInitialsBig}>
                  {planner.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <span className="role">
                {role}
                {base ? ` · ${base}` : ''}
              </span>
              <h1>
                {first} {rest ? <em>{rest}</em> : null}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: 'rgba(255,255,255,.9)',
                  fontSize: 14,
                  flexWrap: 'wrap',
                }}
              >
                {rating != null ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icons.star size={14} /> <b>{rating.toFixed(1)}</b>
                    {reviewsCount != null ? ` · ${reviewsCount} ${editorialText('editorialTestimonialsReviews')}` : ''}
                  </span>
                ) : null}
                {trips != null ? (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{trips} {editorialText('editorialPlannersListStatsTrips').toLowerCase()}</span>
                  </>
                ) : null}
              </div>
              {regions.length > 0 ? (
                <div className="tags">
                  {regions.map((r) => (
                    <span key={r} className="tg">
                      {r}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {kpis.length > 0 ? (
              <div className="kpis" aria-label="Planner KPIs">
                {kpis.map((k) => (
                  <div className="k" key={k.key}>
                    <b>
                      {k.value}
                      {k.key === 'years' ? <em>a</em> : null}
                    </b>
                    <small>{k.label}</small>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ev-container">
        <div className="pld-body">
          <div className="pld-main">
            {/* Big quote */}
            <section>
              <p className="big-quote">{quote}</p>
            </section>

            {/* Bio */}
            <section>
              <h2>
                {SECTION_COPY.bio} <em>{first}</em>
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7 }}>{bio}</p>
            </section>

            {/* Differentiators */}
            {(specialties.length > 0 || regions.length > 0) && (
              <section>
                <h2>
                  {SECTION_COPY.differentiators}{' '}
                  <em>{SECTION_COPY.differentiatorsEm}</em>
                </h2>
                <div style={differentiatorsGrid}>
                  {specialties.length > 0 ? (
                    <div>
                      <small style={diffLabelStyle}>
                        {SECTION_COPY.specialtiesLabel}
                      </small>
                      <div className="chips-row">
                        {specialties.map((s) => (
                          <span key={s} className="c">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {regions.length > 0 ? (
                    <div>
                      <small style={diffLabelStyle}>
                        {SECTION_COPY.regionsLabel}
                      </small>
                      <div className="chips-row">
                        {regions.map((r) => (
                          <span key={r} className="c">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {/* Signature trip */}
            {payload?.signature ? (
              <section>
                <h2>
                  {SECTION_COPY.signature}{' '}
                  <em>{SECTION_COPY.signatureEm}</em>
                </h2>
                <div className="sig-card">
                  <div
                    className="sig-media"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--c-accent), var(--c-primary))',
                    }}
                  >
                    {payload.signature.imageUrl ? (
                      <Image
                        src={payload.signature.imageUrl}
                        alt={payload.signature.title}
                        fill
                        sizes="(max-width: 1100px) 100vw, 50vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : null}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(180deg,transparent 50%,rgba(0,0,0,.4))',
                      }}
                    />
                    <span
                      className="chip chip-accent"
                      style={{ position: 'absolute', top: 18, left: 18 }}
                    >
                      {SECTION_COPY.signatureChip} {first}
                    </span>
                  </div>
                  <div className="sig-body">
                    <small>{SECTION_COPY.signatureSubLabel}</small>
                    <h3>{payload.signature.title}</h3>
                    <p>{payload.signature.note}</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      {(relatedPackages?.[0]?.slug || '') && (
                        <Link
                          href={`${basePath}/paquetes/${relatedPackages![0].slug}`}
                          className="btn btn-primary btn-sm"
                        >
                          {SECTION_COPY.signaturePrimaryCta}
                          <Icons.arrow size={14} />
                        </Link>
                      )}
                      {signatureWa ? (
                        <WaflowCTAButton
                          variant="A"
                          fallbackHref={signatureWa}
                          className="btn btn-outline btn-sm"
                        >
                          {primaryWhatsappLabel}
                          <Icons.whatsapp size={14} />
                        </WaflowCTAButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Hallmarks — packages designed by this planner */}
            {relatedPackages && relatedPackages.length > 0 ? (
              <section>
                <h2>
                  {SECTION_COPY.hallmarks}{' '}
                  <em>{SECTION_COPY.hallmarksEm}</em>
                </h2>
                <div className="hall-grid">
                  {relatedPackages.map((pk) => (
                    <article
                      key={pk.id}
                      className="pack-card"
                      style={{ cursor: 'pointer' }}
                    >
                      <Link
                        href={`${basePath}/paquetes/${pk.slug}`}
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          display: 'block',
                        }}
                      >
                        <div
                          className="pack-media"
                          style={{
                            position: 'relative',
                            aspectRatio: '16/10',
                            background:
                              'linear-gradient(135deg, var(--c-accent-2), var(--c-primary))',
                            overflow: 'hidden',
                            borderRadius: 'var(--radius-md, 12px)',
                          }}
                        >
                          {pk.image ? (
                            <Image
                              src={pk.image}
                              alt={pk.title}
                              fill
                              sizes="(max-width: 1100px) 100vw, 33vw"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : null}
                          {pk.badges && pk.badges.length > 0 ? (
                            <div
                              className="badges"
                              style={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                              }}
                            >
                              <span className="chip chip-white">
                                {pk.badges[0]}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="pack-body"
                          style={{ padding: '12px 0 4px' }}
                        >
                          {pk.location ? (
                            <div
                              className="pack-loc"
                              style={{
                                fontSize: 11,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: 'var(--c-muted)',
                                fontWeight: 600,
                              }}
                            >
                              {pk.location}
                            </div>
                          ) : null}
                          <div className="pack-header">
                            <h3 style={{ fontSize: 17, margin: '6px 0' }}>
                              {pk.title}
                            </h3>
                          </div>
                          <div
                            className="pack-foot"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginTop: 8,
                            }}
                          >
                            {pk.price ? (
                              <div className="pack-price">
                                <small>{editorialText('editorialPlannerDetailRailFrom')}</small>{' '}
                                <strong>
                                  {pk.currency ? (
                                    <sup>{pk.currency}</sup>
                                  ) : null}
                                  {pk.price}
                                </strong>
                              </div>
                            ) : null}
                            <span className="btn btn-outline btn-sm">
                              {editorialText('editorialPlannersViewProfile').split(' ')[0]} <Icons.arrow size={12} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Fun facts */}
            {payload?.funFacts && payload.funFacts.length > 0 ? (
              <section>
                <h2>
                  {SECTION_COPY.facts} <em>{SECTION_COPY.factsEm}</em>
                </h2>
                <div className="facts">
                  {payload.funFacts.map((f, i) => (
                    <div className="fact" key={i}>
                      <div className="num">0{i + 1}.</div>
                      <p>{f}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Reviews */}
            {reviews && reviews.length > 0 ? (
              <section>
                <h2>
                  {SECTION_COPY.reviewsTitle}{' '}
                  <em>
                    {SECTION_COPY.reviewsEm} {first}
                  </em>
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {reviews.slice(0, 4).map((r, i) => (
                    <div key={i} className="review-card">
                      <div className="stars">
                        {Array.from({ length: Math.round(r.rating ?? 5) }).map(
                          (_, si) => (
                            <Icons.star key={si} size={14} />
                          ),
                        )}
                      </div>
                      <p>&ldquo;{r.text}&rdquo;</p>
                      <div className="who">
                        <div className="av" />
                        <div>
                          <b>{r.author_name}</b>
                          {r.relative_time ? (
                            <small>{r.relative_time}</small>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Rail */}
          <aside className="pld-rail">
            <div className="avail-row">
              <span className="dot" />
              {availability}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--c-muted)',
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {SECTION_COPY.railSpeakWith}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                }}
              >
                {planner.fullName}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--c-muted)',
                  marginTop: 2,
                }}
              >
                {role}
              </div>
            </div>
            <div>
              <div className="resp">
                <span>{SECTION_COPY.railResponseTime}</span>
                <b>{response}</b>
              </div>
              {base ? (
                <div className="resp">
                  <span>{SECTION_COPY.railFrom}</span>
                  <b>{base}</b>
                </div>
              ) : null}
              <div className="resp">
                <span>{SECTION_COPY.railLanguages}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {languages.map((l) => (
                    <span
                      key={l}
                      className="lg"
                      style={{ fontSize: 10, padding: '2px 7px' }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {waPrimary ? (
              <WaflowCTAButton
                variant="A"
                fallbackHref={waPrimary}
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
              >
                <Icons.whatsapp size={14} />
                {primaryWhatsappLabel}
              </WaflowCTAButton>
            ) : null}
            <Link
              href={`${basePath}/#cta`}
              className="btn btn-outline"
              style={{ justifyContent: 'center' }}
            >
              {SECTION_COPY.railSecondaryCta} <Icons.arrow size={14} />
            </Link>
            <div
              style={{
                fontSize: 12,
                color: 'var(--c-muted)',
                textAlign: 'center',
                paddingTop: 10,
                borderTop: '1px solid var(--c-line)',
                lineHeight: 1.5,
              }}
            >
              {SECTION_COPY.railFootnote}
            </div>
          </aside>
        </div>

        {/* Other planners */}
        {otherFiltered.length > 0 ? (
          <section style={otherSectionStyle}>
            <h2 style={otherTitleStyle}>
              {SECTION_COPY.otherPlanners}{' '}
              <em
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent)',
                  fontWeight: 400,
                }}
              >
                {SECTION_COPY.otherPlannersEm}
              </em>
            </h2>
            <div className="pl-grid">
              {otherFiltered.slice(0, 3).map((o) => {
                const oFirst = o.name.split(' ')[0] || o.fullName;
                const oQuote =
                  (o.quote && o.quote.trim()) ||
                  DEFAULT_BIO_FALLBACK;
                return (
                  <article key={o.id} className="pl-card">
                    <Link
                      href={`${basePath}/planners/${o.slug}`}
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
                          style={
                            o.photo
                              ? {
                                  background: 'transparent',
                                  overflow: 'hidden',
                                  position: 'relative',
                                }
                              : undefined
                          }
                        >
                          {o.photo ? (
                            <Image
                              src={o.photo}
                              alt={o.fullName}
                              fill
                              sizes="72px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : null}
                        </div>
                        <div className="who">
                          <b>{o.fullName}</b>
                          <div className="role">
                            {o.position || mapRole(o.role, editorialText)}
                          </div>
                        </div>
                      </div>
                      <div className="body">
                        <p className="quote">&ldquo;{oQuote}&rdquo;</p>
                      </div>
                      <div className="foot">
                        <span className="avail">
                          <span className="dot" />
                          {DEFAULT_AVAILABILITY}
                        </span>
                        <span>
                          {editorialText('editorialPlannersViewProfile')} <Icons.arrow size={12} />
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Inline styles ----------

const pldHeroWrapperStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '0 0 32px 32px',
  padding: '80px 0 64px',
};

const bigAvStyle: CSSProperties = {
  width: 180,
  height: 180,
  borderRadius: '50%',
  position: 'relative',
  overflow: 'hidden',
  boxShadow:
    '0 0 0 6px rgba(255,255,255,.1), 0 10px 40px rgba(0,0,0,.3)',
};

const avInitialsBig: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 44,
};

const differentiatorsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 24,
  marginTop: 20,
};

const diffLabelStyle: CSSProperties = {
  color: 'var(--c-muted)',
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const otherSectionStyle: CSSProperties = {
  padding: '40px 0 80px',
  borderTop: '1px solid var(--c-line)',
  marginTop: 40,
};

const otherTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 26,
  letterSpacing: '-0.02em',
  margin: '0 0 20px',
};

export default EditorialPlannerDetailPage;
