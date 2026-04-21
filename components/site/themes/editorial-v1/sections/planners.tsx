/**
 * editorial-v1 — <PlannersSection />
 *
 * Port of the homepage planners block from designer
 *   themes/references/claude design 1/project/sections.jsx (Planners)
 *   + card shape from planners.jsx `PlannersList` (pl-card).
 *
 * Server component. Renders a 4-column grid (3 tablet, 1 mobile) of
 * planner cards. Data comes from `contacts` (where `show_on_website =
 * true`) via the `dbPlanners` prop — injected by `render-section.tsx`.
 *
 * Content shape lives under `section.content` (all fields optional):
 *   - eyebrow?:   string  (fallback: "Tu planner")
 *   - title?:     string  (fallback: "Una persona que te conoce …")
 *   - subtitle?:  string  (fallback editorial copy)
 *   - planners?:  PlannerOverride[] — per-planner editorial quote /
 *     specialty overrides, matched against DB planners by name.
 *
 * WhatsApp CTA resolution:
 *  1. `dbPlanner.phone` (per-planner direct line), else
 *  2. `website.content.social.whatsapp` (operator-level fallback).
 *
 * LCP notes: no hero, fully static. Images use `next/image`.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';

import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { editorialHtml } from '../primitives/rich-heading';
import { getBasePath } from '@/lib/utils/base-path';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

// ---------- Types ----------

export interface EditorialPlannersSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
  dbPlanners?: PlannerData[];
}

interface PlannerOverride {
  name?: string;
  quote?: string;
  specialty?: string;
  specialties?: string[];
  rating?: number;
  reviewCount?: number;
}

interface PlannersContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  planners?: PlannerOverride[];
  viewAllHref?: string;
  viewAllLabel?: string;
}

// ---------- Constants ----------

const DEFAULT_EYEBROW = editorialText('editorialPlannersEyebrowFallback');
const DEFAULT_TITLE = editorialText('editorialPlannersTitleFallback');
const DEFAULT_SUBTITLE = editorialText('editorialPlannersSubtitleFallback');
const DEFAULT_VIEW_ALL = editorialText('editorialPlannersViewAll');
const DEFAULT_QUOTE_FALLBACK = editorialText('editorialPlannersQuoteFallback');
const DEFAULT_AVAILABILITY = editorialText('editorialPlannersAvailable');

// ---------- Helpers ----------

function mapRole(role: string | null): string {
  const roleMap: Record<string, string> = {
    agent: editorialText('editorialRoleAgent'),
    admin: editorialText('editorialRolePlanner'),
    operations: editorialText('editorialRoleOperations'),
    manager: editorialText('editorialRoleManager'),
    sales: editorialText('editorialRoleSales'),
  };
  return role ? roleMap[role] || role : editorialText('editorialRolePlanner');
}

function resolveWhatsAppHref(
  phone: string | null | undefined,
  websiteFallback: string | undefined,
  name: string,
): string | null {
  const raw = (phone || websiteFallback || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const prefilled = `Hola ${name}, quiero organizar un viaje`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefilled)}`;
}

function findOverride(
  overrides: PlannerOverride[] | undefined,
  fullName: string,
  firstName: string,
): PlannerOverride | undefined {
  if (!overrides) return undefined;
  const target = fullName.toLowerCase();
  const firstTarget = firstName.toLowerCase();
  return overrides.find((o) => {
    const n = (o.name || '').toLowerCase();
    if (!n) return false;
    return (
      n === target ||
      n.includes(firstTarget) ||
      target.includes(n) ||
      firstTarget.includes(n.split(' ')[0])
    );
  });
}

// ---------- Section ----------

export function PlannersSection({
  section,
  website,
  dbPlanners,
}: EditorialPlannersSectionProps) {
  const content = (section.content ?? {}) as PlannersContent;
  const basePath = getBasePath(website.subdomain, false);

  const eyebrow = (content.eyebrow || '').trim() || DEFAULT_EYEBROW;
  const title = (content.title || '').trim() || DEFAULT_TITLE;
  const subtitle = (content.subtitle || '').trim() || DEFAULT_SUBTITLE;
  const viewAllLabel =
    (content.viewAllLabel || '').trim() || DEFAULT_VIEW_ALL;
  const viewAllHref =
    (content.viewAllHref || '').trim() || `${basePath}/planners`;

  const planners = Array.isArray(dbPlanners) ? dbPlanners : [];
  const websiteWhatsapp = website.content?.social?.whatsapp;

  return (
    <section
      className="ev-section ev-planners"
      data-screen-label="Planners"
      style={{ background: 'var(--c-bg)' }}
    >
      <div className="ev-container">
        <header style={headerStyle}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            style={titleStyle}
            dangerouslySetInnerHTML={editorialHtml(title) ?? undefined}
          />
          <p
            style={subtitleStyle}
            dangerouslySetInnerHTML={editorialHtml(subtitle) ?? undefined}
          />
          <div style={viewAllRowStyle}>
            <Link href={viewAllHref} className="btn btn-outline">
              {viewAllLabel}
              <Icons.arrow size={14} />
            </Link>
          </div>
        </header>

        {planners.length === 0 ? (
          <div style={emptyStyle}>
            {/* Intentional soft empty state: editors may preview the
                section before seeding contacts. */}
            <p style={{ color: 'var(--c-muted)' }}>
              {editorialText('editorialPlannersEmpty')}
            </p>
          </div>
        ) : (
          <div className="pl-grid" style={gridStyle}>
            {planners.map((p) => {
              const firstName = p.name.split(' ')[0] || p.fullName;
              const override = findOverride(
                content.planners,
                p.fullName,
                firstName,
              );
              const role = override?.specialty || mapRole(p.role);
              const specialties =
                override?.specialties && override.specialties.length > 0
                  ? override.specialties
                  : override?.specialty
                    ? [override.specialty]
                    : [];
              const quote =
                (p.quote && p.quote.trim()) ||
                (override?.quote && override.quote.trim()) ||
                DEFAULT_QUOTE_FALLBACK;
              const waHref = resolveWhatsAppHref(
                p.phone,
                websiteWhatsapp,
                firstName,
              );
              const profileHref = `${basePath}/planners/${p.slug}`;
              return (
                <article key={p.id} className="pl-card">
                  <Link href={profileHref} style={cardLinkStyle}>
                    <div className="top">
                      <div className="av" style={avatarStyle(!!p.photo)}>
                        {p.photo ? (
                          <Image
                            src={p.photo}
                            alt={p.fullName}
                            fill
                            sizes="72px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            style={avatarInitialsStyle}
                          >
                            {p.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="who">
                        <b>{p.fullName}</b>
                        <div className="role">{role}</div>
                      </div>
                    </div>
                    <div className="body">
                      <p className="quote">&ldquo;{quote}&rdquo;</p>
                      {specialties.length > 0 ? (
                        <div className="tags">
                          {specialties.map((s) => (
                            <span key={s} className="tg">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                  <div className="foot">
                    <span className="avail">
                      <span className="dot" />
                      {DEFAULT_AVAILABILITY}
                    </span>
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        aria-label={`WhatsApp ${p.fullName}`}
                      >
                        <Icons.whatsapp size={14} />
                        {editorialText('editorialPlannersWhatsapp')}
                      </a>
                    ) : (
                      <Link
                        href={profileHref}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--c-ink)',
                        }}
                      >
                        {editorialText('editorialPlannersViewProfile')} <Icons.arrow size={12} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- Inline styles (keep close to designer spec) ----------

const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: 48,
  maxWidth: '68ch',
  marginInline: 'auto',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 'clamp(30px, 4vw, 44px)',
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  margin: '12px 0 14px',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--c-ink-2)',
  fontSize: 17,
  lineHeight: 1.55,
  margin: '0 auto',
  maxWidth: '52ch',
};

const viewAllRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: 24,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
};

const cardLinkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

function avatarStyle(hasPhoto: boolean): CSSProperties {
  return {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: hasPhoto
      ? 'transparent'
      : 'linear-gradient(135deg, var(--c-accent), var(--c-primary))',
    position: 'relative',
    overflow: 'hidden',
    boxShadow:
      '0 0 0 3px var(--c-surface), 0 6px 20px rgba(0,0,0,.1)',
  };
}

const avatarInitialsStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 22,
};

const emptyStyle: CSSProperties = {
  textAlign: 'center',
  padding: '48px 0',
};

export default PlannersSection;
