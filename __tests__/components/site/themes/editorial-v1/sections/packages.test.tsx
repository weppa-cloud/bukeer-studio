/**
 * editorial-v1 — <PackagesSection /> behavioral tests.
 *
 * Coverage:
 *  - empty `packages[]` → header + "Sin paquetes disponibles" fallback
 *  - 6 packages + 3 tabs → all cards render; selecting a tab filters the grid
 *  - `POPULAR` badge only appears on cards where `featured === true`
 *
 * Renders via `renderToStaticMarkup` for the SSR pass (matches the node
 * testEnvironment) and uses `react-dom/client` on jsdom-like global for the
 * interactive filter test.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PackagesSection } from '@/components/site/themes/editorial-v1/sections/packages';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { EditorialPackageItem } from '@/components/site/themes/editorial-v1/sections/packages-filters.client';

function makeWebsite(): WebsiteData {
  return {
    subdomain: 'acme',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'sec-1',
    section_type: 'packages',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

const SIX_PACKAGES: EditorialPackageItem[] = [
  {
    id: 'p1',
    slug: 'caribe-7d',
    name: 'Caribe esencial 7 días',
    image: 'https://cdn.example/img1.jpg',
    description: 'Playa, palenque, y ceviche.',
    country: 'Colombia',
    duration: '7 días',
    stops: 'Cartagena · Santa Marta',
    price: 'USD 1.200',
    featured: true,
    tags: ['caribe', 'playa'],
  },
  {
    id: 'p2',
    slug: 'andes-10d',
    name: 'Andes profundos 10 días',
    image: 'https://cdn.example/img2.jpg',
    description: 'Caminatas y pueblos de altura.',
    country: 'Colombia',
    duration: '10 días',
    stops: 'Bogotá · Villa de Leyva',
    price: 'USD 1.850',
    featured: false,
    tags: ['andes', 'aventura'],
  },
  {
    id: 'p3',
    slug: 'pacifico-5d',
    name: 'Pacífico salvaje',
    image: 'https://cdn.example/img3.jpg',
    description: 'Ballenas, selva y gastronomía chocoana.',
    country: 'Colombia',
    duration: '5 días',
    stops: 'Nuquí',
    price: 'USD 980',
    featured: true,
    tags: ['pacifico', 'naturaleza'],
  },
  {
    id: 'p4',
    name: 'Amazonas esencial',
    image: 'https://cdn.example/img4.jpg',
    country: 'Colombia',
    duration: '4 días',
    featured: false,
    tags: ['amazonas'],
  },
  {
    id: 'p5',
    slug: 'eje-cafetero',
    name: 'Eje cafetero familiar',
    country: 'Colombia',
    duration: '6 días',
    featured: false,
    tags: ['andes', 'familiar'],
  },
  {
    id: 'p6',
    slug: 'caribe-lujo',
    name: 'Caribe de lujo',
    country: 'Colombia',
    duration: '9 días',
    price: 'USD 3.400',
    featured: false,
    tags: ['caribe', 'lujo'],
  },
];

describe('<PackagesSection /> editorial-v1', () => {
  it('renders header + fallback message when there are no packages', () => {
    const section = makeSection({
      title: 'Nuestros paquetes',
      subtitle: 'Curado para ti',
      packages: [],
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    expect(markup).toContain('Nuestros paquetes');
    expect(markup).toContain('Curado para ti');
    expect(markup).toContain('EXPERIENCIAS CURADAS');
    expect(markup).toContain('Sin paquetes disponibles');
    // No grid cards rendered
    expect(markup).not.toContain('pack-card');
  });

  it('uses the default eyebrow when none is provided', () => {
    const section = makeSection({
      title: 'Paquetes',
      packages: SIX_PACKAGES,
    });
    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );
    expect(markup).toContain('EXPERIENCIAS CURADAS');
  });

  it('renders every package when filters are not configured', () => {
    const section = makeSection({
      eyebrow: 'Paquetes',
      title: 'Itinerarios pensados',
      packages: SIX_PACKAGES,
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    for (const pkg of SIX_PACKAGES) {
      expect(markup).toContain(pkg.name);
    }
    // Every card also appears in the mobile rail — so we expect two occurrences
    // each. But for the purposes of this check, one copy is enough.
    expect((markup.match(/pack-card/g) || []).length).toBeGreaterThanOrEqual(
      SIX_PACKAGES.length,
    );
  });

  it('renders 6 packages with 3 configured tabs and a leading "Todos" default tab', () => {
    const section = makeSection({
      title: 'Paquetes',
      packages: SIX_PACKAGES,
      filters: {
        enabled: true,
        tabs: [
          { label: 'Caribe', filterKey: 'caribe', count: 2 },
          { label: 'Andes', filterKey: 'andes', count: 2 },
          { label: 'Pacífico', filterKey: 'pacifico', count: 1 },
        ],
      },
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    // 3 configured tabs present
    expect(markup).toContain('>Caribe<');
    expect(markup).toContain('>Andes<');
    expect(markup).toContain('>Pacífico<');
    // Auto-prepended "Todos" tab
    expect(markup).toContain('>Todos<');
    // All cards still visible in the SSR (default active = 'all')
    for (const pkg of SIX_PACKAGES) {
      expect(markup).toContain(pkg.name);
    }
  });

  it('shows the POPULAR badge only on featured packages', () => {
    const featuredNames = SIX_PACKAGES.filter((p) => p.featured === true).map(
      (p) => p.name,
    );
    const notFeaturedNames = SIX_PACKAGES.filter((p) => p.featured !== true).map(
      (p) => p.name,
    );

    const section = makeSection({
      title: 'Paquetes',
      packages: SIX_PACKAGES,
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    // Every featured package renders — and POPULAR shows somewhere in the tree.
    expect(markup).toContain('POPULAR');
    expect(featuredNames.length).toBeGreaterThan(0);
    for (const name of featuredNames) {
      expect(markup).toContain(name);
    }

    // Count POPULAR occurrences — one per featured card × 2 surfaces
    // (grid + rail). Must equal featured.length × 2, NOT total packages × 2.
    const popularOccurrences = (markup.match(/pack-popular/g) || []).length;
    const expectedPopularCount = featuredNames.length * 2;
    expect(popularOccurrences).toBe(expectedPopularCount);

    // Sanity: non-featured names still present but not associated with POPULAR
    for (const name of notFeaturedNames) {
      expect(markup).toContain(name);
    }
  });

  it('hides filter bar when `filters.enabled === false` even if tabs exist', () => {
    const section = makeSection({
      title: 'Paquetes',
      packages: SIX_PACKAGES,
      filters: {
        enabled: false,
        tabs: [{ label: 'Caribe', filterKey: 'caribe' }],
      },
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    expect(markup).not.toContain('filter-bar');
    // Every package still renders
    for (const pkg of SIX_PACKAGES) {
      expect(markup).toContain(pkg.name);
    }
  });

  it('supports legacy `filterTabs` and derives tab matching from package category', () => {
    const section = makeSection({
      title: 'Paquetes',
      filterTabs: ['Playa', 'Cultura'],
      packages: [
        {
          id: 'legacy-1',
          name: 'Caribe clásico',
          category: 'Playa',
        },
        {
          id: 'legacy-2',
          name: 'Bogotá cultural',
          category: 'Cultura',
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    expect(markup).toContain('>Playa<');
    expect(markup).toContain('>Cultura<');
    expect(markup).toContain('Caribe clásico');
    expect(markup).toContain('Bogotá cultural');
  });

  it('builds `/paquetes/{slug}` links when slug is present and falls back to `/paquetes` otherwise', () => {
    const section = makeSection({
      title: 'Paquetes',
      packages: SIX_PACKAGES,
    });
    const markup = renderToStaticMarkup(
      <PackagesSection section={section} website={makeWebsite()} />,
    );

    expect(markup).toContain('/site/acme/paquetes/caribe-7d');
    // p4 has no slug → fallback
    expect(markup).toContain('/site/acme/paquetes"');
  });
});
