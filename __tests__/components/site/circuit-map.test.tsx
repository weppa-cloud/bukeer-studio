import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CircuitMap, type CircuitMapStop } from '@/components/site/circuit-map';

const THREE_STOP_ROUTE: CircuitMapStop[] = [
  { id: 'bogota-1', lat: 4.711, lng: -74.0721, label: 'Bogota', order: 1 },
  { id: 'medellin-2', lat: 6.2476, lng: -75.5658, label: 'Medellin', order: 2 },
  { id: 'cartagena-3', lat: 10.3932, lng: -75.4832, label: 'Cartagena', order: 3 },
];

describe('<CircuitMap>', () => {
  it('returns null when no stops are supplied', () => {
    const markup = renderToStaticMarkup(
      React.createElement(CircuitMap, { stops: [] })
    );
    expect(markup).toBe('');
  });

  it('renders a 3-stop route with ordered numbered labels and stop labels', () => {
    const markup = renderToStaticMarkup(
      React.createElement(CircuitMap, { stops: THREE_STOP_ROUTE })
    );

    expect(markup).toContain('data-testid="circuit-map"');
    // SSR: `supportsWebGL()` returns false so the primitive renders the
    // simplified numbered chip fallback, which is stable and snapshot-able.
    expect(markup).toContain('data-testid="circuit-map-fallback"');
    expect(markup).toContain('Bogota');
    expect(markup).toContain('Medellin');
    expect(markup).toContain('Cartagena');
    // Order badges must reflect the `order` field rather than array index.
    expect(markup).toMatch(/>\s*1\s*<\/span>\s*<span[^>]*>Bogota/);
    expect(markup).toMatch(/>\s*2\s*<\/span>\s*<span[^>]*>Medellin/);
    expect(markup).toMatch(/>\s*3\s*<\/span>\s*<span[^>]*>Cartagena/);
  });

  it('reorders stops by `order` regardless of input array order', () => {
    const shuffled: CircuitMapStop[] = [
      THREE_STOP_ROUTE[2]!,
      THREE_STOP_ROUTE[0]!,
      THREE_STOP_ROUTE[1]!,
    ];

    const markup = renderToStaticMarkup(
      React.createElement(CircuitMap, { stops: shuffled })
    );

    const bogotaIdx = markup.indexOf('Bogota');
    const medellinIdx = markup.indexOf('Medellin');
    const cartagenaIdx = markup.indexOf('Cartagena');

    expect(bogotaIdx).toBeGreaterThan(-1);
    expect(medellinIdx).toBeGreaterThan(bogotaIdx);
    expect(cartagenaIdx).toBeGreaterThan(medellinIdx);
  });

  it('marks the active stop with aria-current="step" when activeIndex is set', () => {
    const markup = renderToStaticMarkup(
      React.createElement(CircuitMap, {
        stops: THREE_STOP_ROUTE,
        activeIndex: 1,
      })
    );

    const ariaMatches = markup.match(/aria-current="step"/g) || [];
    expect(ariaMatches).toHaveLength(1);
    // Active stop should be the second one (Medellin).
    const medellinIdx = markup.indexOf('Medellin');
    const ariaIdx = markup.indexOf('aria-current="step"');
    expect(Math.abs(ariaIdx - medellinIdx)).toBeLessThan(400);
  });
});
