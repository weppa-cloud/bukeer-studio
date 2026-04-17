'use client';

import { WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Check, Star } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  perPerson?: boolean;
  installments?: string;
  description?: string;
  features: string[];
  ctaText?: string;
  ctaUrl?: string;
  highlighted?: boolean;
  badge?: string;
}

interface PricingContent {
  title?: string;
  subtitle?: string;
  currency?: string;
  anchorLabel?: string;
  tiers: PricingTier[];
}

interface PricingSectionProps {
  section: WebsiteSection;
}

function extractNumericPrice(price: string): number | null {
  const clean = price.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

function PricingCard({ tier, currency, delay }: { tier: PricingTier; currency?: string; delay: number }) {
  const numericPrice = extractNumericPrice(tier.price);

  return (
    <BlurFade delay={delay} direction="up" duration={0.45}>
      <div
        className={`relative flex flex-col rounded-2xl border p-6 h-full transition-shadow hover:shadow-md ${
          tier.highlighted
            ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg'
            : 'border-[var(--border-subtle)] bg-background'
        }`}
      >
        {tier.badge && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white whitespace-nowrap"
            style={{ background: 'var(--accent)' }}
          >
            {tier.badge}
          </div>
        )}

        {tier.highlighted && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-[var(--accent)] text-[var(--accent)]" aria-hidden />
            <span className="text-xs font-semibold text-[var(--accent)]">Recomendado</span>
          </div>
        )}

        <h3 className="text-lg font-bold text-[var(--text-heading)] mb-1">{tier.name}</h3>

        {tier.description && (
          <p className="text-sm text-[var(--text-muted)] mb-3">{tier.description}</p>
        )}

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            {currency && (
              <span className="text-sm font-medium text-[var(--text-secondary)]">{currency}</span>
            )}
            <span className="text-3xl font-extrabold text-[var(--text-heading)]">
              {numericPrice !== null ? (
                <NumberTicker value={numericPrice} decimalPlaces={numericPrice % 1 !== 0 ? 2 : 0} />
              ) : (
                tier.price
              )}
            </span>
          </div>
          {(tier.period || tier.perPerson) && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {tier.period}{tier.perPerson ? ' · por persona' : ''}
            </p>
          )}
          {tier.installments && (
            <p className="text-xs text-[var(--accent)] font-medium mt-1">{tier.installments}</p>
          )}
        </div>

        {tier.features.length > 0 && (
          <ul className="space-y-2 flex-1 mb-6">
            {tier.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Check
                  className={`w-4 h-4 shrink-0 mt-0.5 ${tier.highlighted ? 'text-[var(--accent)]' : 'text-green-500'}`}
                  aria-hidden
                />
                {f}
              </li>
            ))}
          </ul>
        )}

        {tier.ctaUrl && (
          <a
            href={tier.ctaUrl}
            className={`mt-auto block w-full rounded-xl py-3 px-4 text-center text-sm font-semibold transition-colors ${
              tier.highlighted
                ? 'text-white hover:opacity-90'
                : 'text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
            }`}
            style={tier.highlighted ? { background: 'var(--accent)' } : undefined}
          >
            {tier.ctaText || 'Cotizar'}
          </a>
        )}
      </div>
    </BlurFade>
  );
}

export function PricingSection({ section }: PricingSectionProps) {
  const content = (section.content as PricingContent | null) || { tiers: [] };
  const { title, subtitle, currency, anchorLabel, tiers = [] } = content;
  const variant = section.variant || 'tiered_anchor';
  const isSingle = variant === 'single_highlight' || tiers.length === 1;

  return (
    <section className="section-padding" aria-label="Precios y paquetes">
      <div className="container">
        {(title || subtitle) && (
          <BlurFade delay={0} direction="up" duration={0.4}>
            <div className="text-center mb-10">
              {anchorLabel && (
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-2">
                  {anchorLabel}
                </span>
              )}
              {title && <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-heading)]">{title}</h2>}
              {subtitle && <p className="mt-2 text-[var(--text-secondary)] max-w-xl mx-auto">{subtitle}</p>}
            </div>
          </BlurFade>
        )}

        <div
          className={
            isSingle
              ? 'max-w-sm mx-auto'
              : `grid gap-6 ${
                  tiers.length === 2
                    ? 'sm:grid-cols-2'
                    : tiers.length === 3
                    ? 'sm:grid-cols-2 lg:grid-cols-3'
                    : 'sm:grid-cols-2 lg:grid-cols-4'
                }`
          }
        >
          {tiers.map((tier, i) => (
            <PricingCard key={i} tier={tier} currency={currency} delay={0.08 * i + 0.05} />
          ))}
        </div>
      </div>
    </section>
  );
}
