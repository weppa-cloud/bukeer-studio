/**
 * editorial-v1 Pricing section.
 *
 * Port of the `price-table` in
 *   themes/references/claude design 1/project/details.jsx
 *
 * Layout:
 *  - Section header: eyebrow "Precios" + h2 + optional subtitle
 *  - 3-column grid on desktop, stacked on mobile
 *  - Highlighted tier gets featured visual treatment
 *  - Each tier card: name, badge, price (large), period, description,
 *    features list with checkmarks, installments text, CTA button
 *
 * Pure SSR — no interactivity, no client leaf needed.
 *
 * Content contract:
 *   title?:       string
 *   subtitle?:    string
 *   currency?:    string  — e.g. 'USD'
 *   anchorLabel?: string  — e.g. 'Desde'
 *   tiers: Array<{
 *     name:          string
 *     price:         string    — numeric string, e.g. '2284'
 *     period?:       string    — e.g. '9 días / 8 noches'
 *     description?:  string
 *     features:      string[]
 *     ctaText:       string
 *     ctaUrl:        string
 *     perPerson?:    boolean
 *     badge?:        string    — e.g. 'Más reservado'
 *     highlighted?:  boolean
 *     installments?: string    — e.g. 'o 4 cuotas de $571 USD sin interés'
 *   }>
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';
import { editorialHtml } from '../primitives/rich-heading';

export interface EditorialPricingSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  perPerson?: boolean;
  badge?: string;
  highlighted?: boolean;
  installments?: string;
}

interface PricingContent {
  title?: string;
  subtitle?: string;
  currency?: string;
  anchorLabel?: string;
  tiers?: PricingTier[];
}

const DEFAULT_EYEBROW_KEY = 'editorialPricingEyebrowFallback' as const;

function formatPrice(raw: string): string {
  const num = Number(raw.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString('es-CO');
}

export function PricingSection({
  section,
  website,
}: EditorialPricingSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as PricingContent;

  const rawTiers = Array.isArray(content.tiers) ? content.tiers : [];

  const tiers: PricingTier[] = rawTiers.filter(
    (t): t is PricingTier =>
      !!t &&
      typeof t.name === 'string' &&
      t.name.trim().length > 0 &&
      typeof t.price === 'string' &&
      t.price.trim().length > 0 &&
      typeof t.ctaText === 'string' &&
      typeof t.ctaUrl === 'string' &&
      Array.isArray(t.features),
  );

  if (tiers.length === 0) return null;

  const eyebrow = localizeEditorialText(
    website,
    editorialText(DEFAULT_EYEBROW_KEY) || 'Precios',
  );
  const title = localizeEditorialText(website, content.title?.trim() || '');
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');
  const currency = content.currency?.trim() || 'USD';
  const anchorLabel = localizeEditorialText(
    website,
    content.anchorLabel?.trim() || 'Desde',
  );

  return (
    <section
      className="ev-section ev-pricing"
      data-screen-label="Pricing"
      aria-label={eyebrow}
    >
      <div className="ev-container">
        {/* Section header */}
        <div className="pricing-header" style={{ marginBottom: 40 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          {title ? (
            <h2 className="headline-lg" style={{ marginTop: 12 }} dangerouslySetInnerHTML={editorialHtml(title)} />
          ) : null}
          {subtitle ? (
            <p className="body-md" style={{ marginTop: 16, maxWidth: '56ch' }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Tier grid */}
        <div
          className="pricing-grid"
          style={{
            display: 'grid',
            gap: 24,
            alignItems: 'start',
          }}
          data-tier-count={tiers.length}
        >
          {tiers.map((tier, i) => {
            const isHighlighted = tier.highlighted === true;
            const tierName = localizeEditorialText(website, tier.name.trim());
            const tierBadge = tier.badge
              ? localizeEditorialText(website, tier.badge.trim())
              : null;
            const tierPeriod = tier.period
              ? localizeEditorialText(website, tier.period.trim())
              : null;
            const tierDescription = tier.description
              ? localizeEditorialText(website, tier.description.trim())
              : null;
            const tierInstallments = tier.installments
              ? localizeEditorialText(website, tier.installments.trim())
              : null;
            const ctaText = localizeEditorialText(website, tier.ctaText.trim());
            const ctaUrl = tier.ctaUrl.trim() || '#';
            const perPerson = tier.perPerson !== false; // default true

            return (
              <div
                key={`pricing-tier-${i}`}
                className={`pricing-card${isHighlighted ? ' featured' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  padding: 28,
                  borderRadius: 12,
                  border: isHighlighted
                    ? '2px solid var(--ev-accent, var(--c-accent))'
                    : '1px solid var(--ev-divider, rgba(0,0,0,.1))',
                  background: isHighlighted
                    ? 'var(--ev-ink, var(--c-ink))'
                    : 'var(--ev-surface, var(--c-surface, #fff))',
                  color: isHighlighted ? '#ffffff' : 'inherit',
                  position: 'relative',
                }}
              >
                {/* Badge */}
                {tierBadge ? (
                  <span
                    className={`chip${isHighlighted ? ' chip-accent' : ' chip-ink'}`}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {tierBadge}
                  </span>
                ) : null}

                {/* Tier name */}
                <h3 className="headline-md" style={{ margin: 0 }} dangerouslySetInnerHTML={editorialHtml(tierName)} />

                {/* Price block */}
                <div className="pricing-price-block">
                  <div
                    style={{
                      fontSize: 11,
                      color: isHighlighted ? '#ffffff' : 'inherit',
                      opacity: isHighlighted ? 1.0 : 0.65,
                      marginBottom: 4,
                    }}
                  >
                    {anchorLabel}
                  </div>
                  <div
                    className="pricing-price"
                    style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}
                  >
                    <sup
                      style={{
                        fontSize: '0.65em',
                        fontWeight: 700,
                        letterSpacing: '.04em',
                      }}
                    >
                      {currency}
                    </sup>
                    <span
                      className="display-md"
                      style={{ lineHeight: 1, fontFeatureSettings: '"tnum"' }}
                    >
                      {formatPrice(tier.price)}
                    </span>
                  </div>
                  {tierPeriod ? (
                    <div
                      className="label"
                      style={{ marginTop: 4, color: isHighlighted ? '#ffffff' : 'inherit', opacity: isHighlighted ? 1.0 : 0.7 }}
                    >
                      {tierPeriod}
                      {perPerson ? ' · por persona' : null}
                    </div>
                  ) : perPerson ? (
                    <div
                      className="label"
                      style={{ marginTop: 4, color: isHighlighted ? '#ffffff' : 'inherit', opacity: isHighlighted ? 1.0 : 0.7 }}
                    >
                      por persona
                    </div>
                  ) : null}
                  {tierInstallments ? (
                    <div
                      className="body-md"
                      style={{ marginTop: 6, fontSize: 12, color: isHighlighted ? '#ffffff' : 'inherit', opacity: isHighlighted ? 1.0 : 0.75 }}
                    >
                      {tierInstallments}
                    </div>
                  ) : null}
                </div>

                {/* Description */}
                {tierDescription ? (
                  <p className="body-md" style={{ margin: 0, color: isHighlighted ? '#ffffff' : 'inherit', opacity: isHighlighted ? 1.0 : 0.85 }}>
                    {tierDescription}
                  </p>
                ) : null}

                {/* Features list */}
                {tier.features.length > 0 ? (
                  <ul
                    className="pricing-features"
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    {tier.features.map((feat, j) => {
                      const featText = localizeEditorialText(website, feat.trim());
                      return (
                        <li
                          key={`tier-${i}-feat-${j}`}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              marginTop: 2,
                              color: isHighlighted
                                ? 'var(--ev-accent, var(--c-accent))'
                                : 'var(--ev-accent, var(--c-accent))',
                            }}
                            aria-hidden="true"
                          >
                            {Icons.check({ size: 15 })}
                          </span>
                          <span
                            className="body-md"
                            style={{ color: isHighlighted ? '#ffffff' : 'inherit', opacity: isHighlighted ? 1.0 : 0.8 }}
                            dangerouslySetInnerHTML={editorialHtml(featText)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {/* CTA */}
                <a
                  href={ctaUrl}
                  className={`pricing-cta btn${isHighlighted ? ' btn-accent' : ' btn-outline'}`}
                  style={{ justifyContent: 'center', marginTop: 'auto' }}
                >
                  {ctaText}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
