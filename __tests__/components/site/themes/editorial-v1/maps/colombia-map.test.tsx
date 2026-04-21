import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ColombiaMap,
  type ColombiaMapPin,
} from '@/components/site/themes/editorial-v1/maps/colombia-map';

const PINS: ColombiaMapPin[] = [
  {
    id: 'cartagena',
    lat: 10.393,
    lng: -75.483,
    label: 'Cartagena',
    region: 'caribe',
  },
  {
    id: 'medellin',
    lat: 6.248,
    lng: -75.566,
    label: 'Medellín',
    region: 'andes',
  },
];

describe('<ColombiaMap>', () => {
  it('renders the editorial silhouette with accessible title + desc', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ColombiaMap, { pins: PINS })
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Mapa de Colombia"');
    expect(markup).toContain('<title>Mapa de Colombia</title>');
    expect(markup).toContain('<desc>');
    // Hand-drawn silhouette anchor — Punta Gallinas start coordinate.
    expect(markup).toContain('M 580 92');
    // Compass + ridges + rivers default to on.
    expect(markup).toContain('class="co-compass"');
    expect(markup).toContain('class="co-ridge"');
    expect(markup).toContain('class="co-river"');
    // Pins render with data-region for CSS targeting.
    expect(markup).toContain('data-pin-id="cartagena"');
    expect(markup).toContain('data-region="caribe"');
    expect(markup).toContain('>Cartagena</text>');
  });

  it('matches the default-props snapshot', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ColombiaMap, { pins: PINS })
    );
    expect(markup).toMatchSnapshot();
  });

  it('paints the caribe region overlay when highlighted', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ColombiaMap, {
        highlightedRegions: ['caribe'],
        pins: PINS,
      })
    );

    // Caribe path picks up the `on` modifier (visual highlight).
    expect(markup).toMatch(/class="co-region on" data-region="caribe"/);
    // Andes stays in the default (unhighlighted) state.
    expect(markup).toMatch(/class="co-region" data-region="andes"/);
  });

  it('hides optional layers when flags disable them', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ColombiaMap, {
        pins: [],
        showCompass: false,
        showRidges: false,
        showRivers: false,
      })
    );

    expect(markup).not.toContain('class="co-compass"');
    expect(markup).not.toContain('class="co-ridge"');
    expect(markup).not.toContain('class="co-river"');
  });
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  RegionalMiniMap,
} = require('@/components/site/themes/editorial-v1/maps/regional-mini-map');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  CountryChip,
} = require('@/components/site/themes/editorial-v1/maps/country-chip');

describe('<RegionalMiniMap>', () => {
  it('renders minimal variant and highlights the target region', () => {
    const markup = renderToStaticMarkup(
      React.createElement(RegionalMiniMap, { region: 'andes' })
    );
    expect(markup).toContain('co-map-minimal');
    expect(markup).toContain('aria-label="Mapa de Región Andina en Colombia"');
    // Compass / ridges / rivers suppressed in the mini variant.
    expect(markup).not.toContain('class="co-compass"');
    expect(markup).not.toContain('class="co-ridge"');
    expect(markup).not.toContain('class="co-river"');
    // Andes region overlay rendered in highlighted state.
    expect(markup).toMatch(/class="co-region on" data-region="andes"/);
  });
});

describe('<CountryChip>', () => {
  it('renders the mini silhouette + label', () => {
    const markup = renderToStaticMarkup(
      React.createElement(CountryChip, {
        lat: 10.393,
        lng: -75.483,
        label: 'Caribe',
        title: 'Cartagena',
      })
    );
    expect(markup).toContain('class="country-chip"');
    expect(markup).toContain('title="Cartagena"');
    expect(markup).toContain('country-chip-dot');
    expect(markup).toContain('>Caribe</span>');
  });
});
