import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RouteMap, type RouteMapRenderContext } from '@/components/ui/route-map';
import type { RoutePoint } from '@/lib/maps/colombia-cities';

const TWO_POINT_ROUTE: RoutePoint[] = [
  { city: 'Cartagena', lat: 10.3932, lng: -75.4832 },
  { city: 'Santa Marta', lat: 11.2408, lng: -74.199 },
];

describe('<RouteMap>', () => {
  it('returns null when no points are supplied', () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, { points: [] })
    );
    expect(markup).toBe('');
  });

  it('renders the internal DestinationMap tree by default (croquis fallback under SSR)', () => {
    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, { points: TWO_POINT_ROUTE })
    );
    // DestinationMap renders the croquis fallback when WebGL is unavailable.
    expect(markup).toContain('data-testid="map-croquis-fallback"');
    // The route list that lives OUTSIDE the map surface always renders.
    expect(markup).toContain('Cartagena');
    expect(markup).toContain('Santa Marta');
  });

  it('bypasses the internal map when a renderMap slot is provided', () => {
    const captured: Array<RouteMapRenderContext> = [];

    const markup = renderToStaticMarkup(
      React.createElement(RouteMap, {
        points: TWO_POINT_ROUTE,
        renderMap: (ctx) => {
          captured.push(ctx);
          return React.createElement(
            'div',
            { 'data-testid': 'stub-map', 'data-count': ctx.markers.length },
            'STUB_MAP'
          );
        },
      })
    );

    // Custom map rendered.
    expect(markup).toContain('data-testid="stub-map"');
    expect(markup).toContain('STUB_MAP');
    // Internal DestinationMap tree is skipped.
    expect(markup).not.toContain('data-testid="map-croquis-fallback"');

    // Route list OUTSIDE the map is still rendered (outer wrapper preserved).
    expect(markup).toContain('Cartagena');
    expect(markup).toContain('Santa Marta');

    // renderMap received the derived ctx.
    expect(captured).toHaveLength(1);
    const ctx = captured[0]!;
    expect(ctx.markers).toHaveLength(2);
    expect(ctx.markers[0]!.label).toBe('Cartagena');
    expect(ctx.routePath).toEqual([
      [-75.4832, 10.3932],
      [-74.199, 11.2408],
    ]);
  });
});
