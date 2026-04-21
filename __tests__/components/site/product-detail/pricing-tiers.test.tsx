import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  PricingTiers,
  type PricingTier,
} from '@/components/site/product-detail/p3/pricing-tiers';

const TIERS: PricingTier[] = [
  { id: 'essential', label: 'Essential', description: 'Basico', amount: 100, currency: 'USD', features: ['hotel 3*', 'desayuno'] },
  { id: 'classic', label: 'Clásico', description: 'Clasico', amount: 200, currency: 'USD', features: ['hotel 4*', 'traslados'] },
  { id: 'premium', label: 'Premium', description: 'Top', amount: 400, currency: 'USD', features: ['hotel 5*', 'privado'] },
];

function formatAmount(tier: PricingTier) {
  return typeof tier.amount === 'number' ? `$${tier.amount}` : '';
}

describe('<PricingTiers>', () => {
  it('renders nothing when no valid tiers are supplied', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PricingTiers, {
        tiers: [],
        selectedTierId: 'none',
        onSelectTier: () => {},
        formatAmount,
      })
    );
    expect(markup).toBe('');
  });

  it('defaults to the stack layout and preserves existing class signature', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PricingTiers, {
        tiers: TIERS,
        selectedTierId: 'classic',
        onSelectTier: () => {},
        formatAmount,
      })
    );

    // Existing consumers rely on the radiogroup + classic gap-3 layout.
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('data-layout="stack"');
    expect(markup).toContain('class="grid gap-3"');
    // No inline grid-template-columns style for stack.
    expect(markup).not.toMatch(/grid-template-columns:\s*repeat/);
    // No featured badge appears without featuredId.
    expect(markup).not.toContain('Recomendado');
  });

  it('renders a responsive grid when layout="grid" is passed', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PricingTiers, {
        tiers: TIERS,
        selectedTierId: 'classic',
        onSelectTier: () => {},
        formatAmount,
        layout: 'grid',
      })
    );

    expect(markup).toContain('data-layout="grid"');
    expect(markup).toContain('class="grid gap-4"');
    // Inline style uses auto-fit minmax responsive grid.
    expect(markup).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(280px,\s*1fr\)\)/);
  });

  it('highlights the featuredId tier with a "Recomendado" badge and data-featured attr', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PricingTiers, {
        tiers: TIERS,
        selectedTierId: 'classic',
        onSelectTier: () => {},
        formatAmount,
        layout: 'grid',
        featuredId: 'classic',
      })
    );

    // Exactly one featured marker (on the classic tier).
    const featuredMatches = markup.match(/data-featured="true"/g) || [];
    expect(featuredMatches).toHaveLength(1);
    expect(markup).toContain('Recomendado');

    // Classic tier label must appear inside the featured button (after its open tag, before its closing tag).
    const featuredBtnMatch = markup.match(/<button[^>]*data-featured="true"[^>]*>([\s\S]*?)<\/button>/);
    expect(featuredBtnMatch).not.toBeNull();
    expect(featuredBtnMatch![1]).toContain('Clásico');
    expect(featuredBtnMatch![1]).toContain('Recomendado');

    // Other tiers must NOT carry the featured flag.
    const essentialBtn = markup.match(/<button[^>]*>[\s\S]*?Essential[\s\S]*?<\/button>/);
    expect(essentialBtn).not.toBeNull();
    expect(essentialBtn![0]).not.toContain('data-featured="true"');
  });
});
