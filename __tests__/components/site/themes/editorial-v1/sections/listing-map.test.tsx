/**
 * editorial-v1 — <ListingMap /> SSR tests.
 *
 * Coverage:
 *  - Renders one card per item, regardless of lat/lng presence
 *  - Only pinnable items (with finite lat+lng) produce map pins
 *  - Renders the ColombiaMap stage with role="img"
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ListingMap,
  type ListingMapItem,
} from '@/components/site/themes/editorial-v1/sections/listing-map';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

interface DestItem extends ListingMapItem {
  description?: string;
}

const ITEMS: DestItem[] = [
  {
    id: 'cartagena',
    name: 'Cartagena',
    lat: 10.39,
    lng: -75.51,
    region: 'caribe',
    description: 'Ciudad amurallada',
  },
  {
    id: 'medellin',
    name: 'Medellín',
    lat: 6.24,
    lng: -75.58,
    region: 'andes',
    description: 'Valle de Aburrá',
  },
  {
    // No coords — card renders, pin does not.
    id: 'floating',
    name: 'Sin coordenadas',
    description: 'Item sin lat/lng',
  },
];

function renderCard(item: DestItem) {
  return (
    <div>
      <b data-testid={`card-${item.id}`}>{item.name}</b>
      <small>{item.description}</small>
    </div>
  );
}

describe('<ListingMap />', () => {
  it('renders one card per item and the map stage', () => {
    const markup = renderToStaticMarkup(
      <ListingMap items={ITEMS} renderCard={renderCard} />,
    );
    expect(markup).toContain('data-testid="listing-map"');
    // Card for every item
    expect(markup).toContain('data-testid="card-cartagena"');
    expect(markup).toContain('data-testid="card-medellin"');
    expect(markup).toContain('data-testid="card-floating"');
    // Map stage
    expect(markup).toContain('role="img"');
    expect(markup).toContain('Mapa de listado');
  });

  it('projects pins only for items with finite lat+lng', () => {
    const markup = renderToStaticMarkup(
      <ListingMap items={ITEMS} renderCard={renderCard} />,
    );
    // Two pinnable items → we expect `data-pin-id` to appear for their ids.
    expect(markup).toContain('data-pin-id="cartagena"');
    expect(markup).toContain('data-pin-id="medellin"');
    // The non-pinnable item still has a card (same attribute on the LM card)
    // but it must NOT appear as an SVG `<g data-pin-id="floating"`.
    const pinForFloating = markup.match(
      /<g[^>]+data-pin-id="floating"/,
    );
    expect(pinForFloating).toBeNull();
  });

  it('respects custom ariaLabel', () => {
    const markup = renderToStaticMarkup(
      <ListingMap
        items={ITEMS.slice(0, 1)}
        renderCard={renderCard}
        ariaLabel="Mapa de destinos editoriales"
      />,
    );
    expect(markup).toContain('aria-label="Mapa de destinos editoriales"');
  });
});
