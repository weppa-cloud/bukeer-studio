'use client';

import { useMemo, useRef } from 'react';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

export interface PricingTier {
  id: string;
  label: string;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  features?: string[];
}

export interface PricingTiersProps {
  tiers: PricingTier[];
  selectedTierId: string;
  onSelectTier: (tierId: string) => void;
  formatAmount: (tier: PricingTier) => string;
  /**
   * Visual layout for the tier options.
   * - `'stack'` (default): vertical radiogroup — existing behavior, untouched.
   * - `'grid'`: responsive CSS Grid (auto-fit, minmax(280px, 1fr)) — used by editorial-v1.
   */
  layout?: 'stack' | 'grid';
  /**
   * Optional tier id to visually highlight as the featured/recommended option.
   * Adds a thicker accent border and a "Recomendado" badge.
   */
  featuredId?: string;
}

export function PricingTiers({
  tiers,
  selectedTierId,
  onSelectTier,
  formatAmount,
  layout = 'stack',
  featuredId,
}: PricingTiersProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;
  const options = useMemo(() => tiers.filter((tier) => tier.id.trim().length > 0), [tiers]);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (options.length === 0) return null;

  const selectedIndex = Math.max(
    0,
    options.findIndex((tier) => tier.id === selectedTierId)
  );

  const isGrid = layout === 'grid';

  return (
    <section data-testid="detail-pricing-tiers" aria-labelledby="pricing-tiers-title">
      <h2 id="pricing-tiers-title" className="mb-6 text-2xl font-bold">
        {detailUi.pricingOptionsTitle}
      </h2>

      <div
        role="radiogroup"
        aria-label={detailUi.pricingSelectionAria}
        data-layout={layout}
        className={isGrid ? 'grid gap-4' : 'grid gap-3'}
        style={
          isGrid
            ? { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }
            : undefined
        }
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
          event.preventDefault();
          const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = (selectedIndex + direction + options.length) % options.length;
          const next = options[nextIndex];
          onSelectTier(next.id);
          refs.current[nextIndex]?.focus();
        }}
      >
        {options.map((tier, index) => {
          const checked = tier.id === selectedTierId;
          const featured = featuredId !== undefined && tier.id === featuredId;

          const baseClasses = [
            'relative rounded-2xl border text-left transition-colors',
            isGrid ? 'p-5 flex flex-col gap-3' : 'p-4',
            checked
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border bg-card hover:bg-muted/30',
            featured ? 'ring-2 ring-primary/60 border-primary' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={tier.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              data-featured={featured || undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => onSelectTier(tier.id)}
              className={baseClasses}
            >
              {featured ? (
                <span
                  aria-hidden="false"
                  className="absolute -top-2 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                >
                  Recomendado
                </span>
              ) : null}

              <div className={isGrid ? 'flex items-start justify-between gap-3' : 'flex items-start justify-between gap-4'}>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                  {tier.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                  ) : null}
                </div>
                <p className={isGrid ? 'text-base font-semibold text-primary whitespace-nowrap' : 'text-sm font-semibold text-primary'}>
                  {formatAmount(tier)}
                </p>
              </div>

              {Array.isArray(tier.features) && tier.features.length > 0 ? (
                <ul className={isGrid ? 'mt-1 grid gap-1.5 text-xs text-muted-foreground' : 'mt-3 grid gap-1 text-xs text-muted-foreground'}>
                  {tier.features.slice(0, isGrid ? 8 : 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
