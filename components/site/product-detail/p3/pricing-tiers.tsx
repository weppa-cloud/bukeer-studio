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
}

export function PricingTiers({ tiers, selectedTierId, onSelectTier, formatAmount }: PricingTiersProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;
  const options = useMemo(() => tiers.filter((tier) => tier.id.trim().length > 0), [tiers]);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (options.length === 0) return null;

  const selectedIndex = Math.max(
    0,
    options.findIndex((tier) => tier.id === selectedTierId)
  );

  return (
    <section data-testid="detail-pricing-tiers" aria-labelledby="pricing-tiers-title">
      <h2 id="pricing-tiers-title" className="mb-6 text-2xl font-bold">
        {detailUi.pricingOptionsTitle}
      </h2>

      <div
        role="radiogroup"
        aria-label={detailUi.pricingSelectionAria}
        className="grid gap-3"
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

          return (
            <button
              key={tier.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onSelectTier(tier.id)}
              className={[
                'rounded-2xl border p-4 text-left transition-colors',
                checked
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/30',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                  {tier.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-primary">{formatAmount(tier)}</p>
              </div>

              {Array.isArray(tier.features) && tier.features.length > 0 ? (
                <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  {tier.features.slice(0, 4).map((feature) => (
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
