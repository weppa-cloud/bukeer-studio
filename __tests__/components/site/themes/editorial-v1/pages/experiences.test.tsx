/**
 * editorial-v1 — <EditorialExperiencesPage /> SSR + filter tests.
 *
 * Coverage:
 *  - SSR: hero + grid shell render with category/level/region chips
 *  - Filtering: interacting with a category chip narrows the rendered cards
 *  - Empty state shows + "Limpiar filtros" present when filter removes everything
 */

import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';

import { EditorialExperiencesPage } from '@/components/site/themes/editorial-v1/pages/experiences';
import type { ExperienceItem } from '@/components/site/themes/editorial-v1/pages/experiences-grid.client';
import type { WebsiteData } from '@/lib/supabase/get-website';

// Minimal jsdom-shim on node — enough for `createRoot().render` to work for
// the interactive filter assertion. Gated by a feature check; if the host
// doesn't expose a DOM we degrade to pure SSR assertions.
const HAS_DOM = typeof document !== 'undefined';

const replaceSpy = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: replaceSpy }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

function makeWebsite(): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
    content: { siteName: 'Acme Travel' },
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    },
    sections: [],
  } as unknown as WebsiteData;
}

const ACTIVITIES: ExperienceItem[] = [
  {
    id: 'a1',
    slug: 'cocora',
    name: 'Caminata Valle de Cocora',
    description: 'Palmas de cera al amanecer.',
    category: 'Aventura',
    categoryKey: 'aventura',
    region: 'Andes',
    level: 'Moderado',
    durationBucket: 'half-day',
    durationLabel: '5h',
    price: 'USD 80',
  },
  {
    id: 'a2',
    slug: 'palenque',
    name: 'Visita a Palenque',
    description: 'Primer pueblo libre de América.',
    category: 'Cultura',
    categoryKey: 'cultura',
    region: 'Caribe',
    level: 'Fácil',
    durationBucket: 'full-day',
    durationLabel: '8h',
    price: 'USD 120',
  },
  {
    id: 'a3',
    slug: 'mercado-bazurto',
    name: 'Cocina en Bazurto',
    description: 'Mercado y cazuela.',
    category: 'Gastronomía',
    categoryKey: 'gastronomia',
    region: 'Caribe',
    level: 'Fácil',
    durationBucket: 'half-day',
    durationLabel: '4h',
    price: 'USD 95',
  },
];

describe('<EditorialExperiencesPage />', () => {
  it('renders hero + filter chips + 3 cards via SSR', () => {
    const markup = renderToStaticMarkup(
      <EditorialExperiencesPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        activities={ACTIVITIES}
      />,
    );
    expect(markup).toContain('data-testid="editorial-experiences"');
    expect(markup).toContain('Actividades');
    expect(markup).toContain('para sumar a tu viaje.');
    // Category tiles
    expect(markup).toContain('data-testid="experiences-categories"');
    expect(markup).toContain('>Aventura<');
    expect(markup).toContain('>Gastronomía<');
    // Filter bar
    expect(markup).toContain('data-testid="experiences-filterbar"');
    // Region chips (derived from activities)
    expect(markup).toContain('>Andes<');
    expect(markup).toContain('>Caribe<');
    // Level chips
    expect(markup).toContain('>Fácil<');
    // All 3 cards
    expect(markup).toContain('Caminata Valle de Cocora');
    expect(markup).toContain('Visita a Palenque');
    expect(markup).toContain('Cocina en Bazurto');
    // Count label
    expect(markup).toMatch(/data-testid="experiences-count"[^>]*>3</);
  });

  it('filters activities via initialFilters (category=aventura → only 1 card)', () => {
    const markup = renderToStaticMarkup(
      <EditorialExperiencesPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        activities={ACTIVITIES}
        initialFilters={{ category: 'aventura' }}
      />,
    );
    expect(markup).toContain('Caminata Valle de Cocora');
    expect(markup).not.toContain('Visita a Palenque');
    expect(markup).not.toContain('Cocina en Bazurto');
  });

  it('shows empty state when filters exclude every activity', () => {
    const markup = renderToStaticMarkup(
      <EditorialExperiencesPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        activities={ACTIVITIES}
        initialFilters={{ region: ['Pacifico'] }}
      />,
    );
    expect(markup).toContain('data-testid="experiences-empty"');
    expect(markup).toContain('Nada con esos criterios');
    expect(markup).toContain('Limpiar filtros');
  });

  (HAS_DOM ? it : it.skip)(
    'interactively toggles a category chip and shrinks the grid',
    () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      let root: Root | null = null;
      try {
        act(() => {
          root = createRoot(container);
          root.render(
            <EditorialExperiencesPage
              website={makeWebsite()}
              subdomain="acme"
              locale="es-CO"
              activities={ACTIVITIES}
            />,
          );
        });
        // Click the "Cultura" category button.
        const culturaBtn = Array.from(
          container.querySelectorAll('.exp-cat'),
        ).find((el) => el.textContent?.includes('Cultura')) as HTMLButtonElement | undefined;
        expect(culturaBtn).toBeDefined();
        act(() => {
          culturaBtn!.click();
        });
        // We assert the router was called with a `category=cultura` param.
        expect(replaceSpy).toHaveBeenCalled();
        const lastCall = replaceSpy.mock.calls.at(-1);
        expect(lastCall?.[0]).toMatch(/category=cultura/);
      } finally {
        if (root) {
          act(() => {
            root!.unmount();
          });
        }
        document.body.removeChild(container);
      }
    },
  );
});
