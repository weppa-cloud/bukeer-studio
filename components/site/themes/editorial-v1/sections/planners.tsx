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
import type { PublicUiExtraTextKey } from '@/lib/site/public-ui-extra-text';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';
import { WaflowCTAButton } from '../waflow/cta-button';

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

// ---------- Helpers ----------

function mapRole(role: string | null, editorialText: (key: PublicUiExtraTextKey) => string): string {
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
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content ?? {}) as PlannersContent;
  const basePath = getBasePath(website.subdomain, Boolean((website as { isCustomDomain?: boolean }).isCustomDomain));

  const eyebrow = localizeEditorialText(
    website,
    (content.eyebrow || '').trim() || editorialText('editorialPlannersEyebrowFallback'),
  );
  const title = localizeEditorialText(
    website,
    (content.title || '').trim() || editorialText('editorialPlannersTitleFallback'),
  );
  const subtitle = localizeEditorialText(
    website,
    (content.subtitle || '').trim() || editorialText('editorialPlannersSubtitleFallback'),
  );
  const viewAllLabel =
    localizeEditorialText(
      website,
      (content.viewAllLabel || '').trim() || editorialText('editorialPlannersViewAll'),
    );
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
        {/* 2-col header: title left, subtitle + "Ver todos" right */}
        <div className="ev-section-head">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
              style={titleStyle}
              dangerouslySetInnerHTML={editorialHtml(title) ?? undefined}
            />
          </div>
          <div className="tools">
            <p
              style={subtitleStyle}
              dangerouslySetInnerHTML={editorialHtml(subtitle) ?? undefined}
            />
            <Link href={viewAllHref} className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
              {viewAllLabel}
              <Icons.arrow size={14} />
            </Link>
          </div>
        </div>

        {planners.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ color: 'var(--c-muted)' }}>
              {editorialText('editorialPlannersEmpty')}
            </p>
          </div>
        ) : (
          <div className="planners">
            {planners.slice(0, 4).map((p) => {
              const firstName = p.name.split(' ')[0] || p.fullName;
              const override = findOverride(content.planners, p.fullName, firstName);
              const role = localizeEditorialText(
                website,
                override?.specialty || mapRole(p.role, editorialText),
              );
              // "8 años diseñando viajes a medida." when available, else quote
              const experienceText = p.yearsExperience
                ? `${p.yearsExperience} ${editorialText('editorialPlannersYearsText')}`
                : localizeEditorialText(
                  website,
                  (p.quote && p.quote.trim())
                    || (override?.quote && override.quote.trim())
                    || editorialText('editorialPlannersQuoteFallback'),
                );
              const profileHref = `${basePath}/planners/${p.slug}`;
              const langs = p.languages && p.languages.length > 0 ? p.languages : [];
              const whatsappHref = resolveWhatsAppHref(p.phone, websiteWhatsapp, firstName);
              return (
                <article key={p.id} className="planner">
                  <Link href={profileHref} className="planner-card-link">
                    <div className="planner-avatar">
                      {p.photo ? (
                        <Image
                          src={p.photo}
                          alt={p.fullName}
                          fill
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 25vw"
                          style={{ objectFit: 'cover' }}
                          unoptimized={p.photo.includes('supabase.co')}
                        />
                      ) : (
                        <div style={avatarGradientStyle}>
                          <div style={avatarShineStyle} />
                          <span style={avatarInitialsStyle}>
                            {p.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3>{p.fullName}</h3>
                      <div className="planner-role">{role}</div>
                    </div>
                    <p className="planner-quote">{experienceText}</p>
                    {langs.length > 0 ? (
                      <div className="planner-langs">
                        {langs.map((l) => <span key={l} className="lg">{l}</span>)}
                      </div>
                    ) : (
                      <div />
                    )}
                  </Link>
                  <div className="planner-actions">
                    <Link href={profileHref} className="planner-action planner-action-profile">
                      {editorialText('editorialPlannersViewProfile')}
                      <Icons.arrow size={14} />
                    </Link>
                    {whatsappHref ? (
                      <WaflowCTAButton
                        variant="A"
                        fallbackHref={whatsappHref}
                        className="planner-action planner-action-whatsapp"
                      >
                        <Icons.whatsapp size={14} />
                        {editorialText('editorialPlannersWhatsapp')}
                      </WaflowCTAButton>
                    ) : null}
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

// ---------- Inline styles ----------

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 'clamp(28px, 3.5vw, 40px)',
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  margin: '8px 0 0',
  maxWidth: '18ch',
};

const subtitleStyle: CSSProperties = {
  fontSize: 17,
  color: 'var(--c-ink-2)',
  maxWidth: '40ch',
  lineHeight: 1.55,
  margin: 0,
};

const avatarGradientStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, var(--c-accent), var(--c-primary))',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const avatarShineStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.2), transparent 60%)',
};

const avatarInitialsStyle: CSSProperties = {
  position: 'relative',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  fontSize: 32,
  zIndex: 1,
};

const emptyStyle: CSSProperties = {
  textAlign: 'center',
  padding: '48px 0',
};

export default PlannersSection;
