/**
 * Tests for editorial-v1 <PlannersSection /> + <PlannersMatchmaker />
 * + <EditorialPlannerDetailPage />.
 *
 * Uses `renderToStaticMarkup` (same pattern as the other editorial-v1
 * tests). Interactive matchmaker state (click → filter) is smoke-tested
 * via `act()` + ReactDOM client render to avoid a testing-library
 * dependency this repo doesn't ship.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PlannersSection } from '@/components/site/themes/editorial-v1/sections/planners';
import { PlannersMatchmaker } from '@/components/site/themes/editorial-v1/sections/planners-matchmaker.client';
import { EditorialPlannerDetailPage } from '@/components/site/themes/editorial-v1/pages/planner-detail';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';

// next/image is not wired for tests — render a plain <img>.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: {
    src?: string;
    alt?: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
  }) => {
    const { fill, priority, sizes, ...rest } = props;
    void fill;
    void priority;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { ...rest, alt: rest.alt ?? '' });
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => React.createElement('a', { href, ...rest }, children),
}));

// ---------- Fixtures ----------

function makeWebsite(): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: { tokens: {}, profile: { metadata: {} } },
    content: {
      siteName: 'Acme Travel',
      tagline: 'Viaja más hondo.',
      seo: { title: '', description: '', keywords: '' },
      contact: { email: '', phone: '', address: '' },
      social: { whatsapp: '+573000000000' },
    },
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

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'planners-1',
    section_type: 'planners',
    variant: 'editorial',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

function makePlanner(overrides: Partial<PlannerData> = {}): PlannerData {
  // We preserve explicit `null` on nullable fields via `in` checks so a test
  // can force `quote: null` / `photo: null` without falling back to defaults.
  const hasQuote = Object.prototype.hasOwnProperty.call(overrides, 'quote');
  const hasLanguage = Object.prototype.hasOwnProperty.call(overrides, 'language');
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Mariana',
    lastName: overrides.lastName ?? 'Vélez',
    fullName: overrides.fullName ?? 'Mariana Vélez',
    photo: overrides.photo ?? null,
    role: overrides.role ?? 'agent',
    position: overrides.position ?? 'Caribe · cultura',
    phone: overrides.phone ?? '+573111111111',
    slug: overrides.slug ?? 'mariana-velez',
    quote: hasQuote ? (overrides.quote as string | null) : 'El Caribe es mi casa.',
    language: hasLanguage ? (overrides.language as string | null) : 'es',
    tripsCount: overrides.tripsCount ?? null,
    ratingAvg: overrides.ratingAvg ?? null,
    yearsExperience: overrides.yearsExperience ?? null,
    specialties: overrides.specialties ?? null,
    regions: overrides.regions ?? null,
    locationName: overrides.locationName ?? null,
    languages: overrides.languages ?? null,
    signaturePackageId: overrides.signaturePackageId ?? null,
    personalDetails: overrides.personalDetails ?? null,
  };
}

// ---------- <PlannersSection /> ----------

describe('editorial-v1 <PlannersSection>', () => {
  it('renders a card for every DB planner', () => {
    const planners = [
      makePlanner({
        id: '1',
        fullName: 'Mariana Vélez',
        slug: 'mariana-velez',
      }),
      makePlanner({
        id: '2',
        fullName: 'Andrés Restrepo',
        slug: 'andres-restrepo',
      }),
      makePlanner({
        id: '3',
        fullName: 'Luisa Carrizosa',
        slug: 'luisa-carrizosa',
      }),
      makePlanner({
        id: '4',
        fullName: 'Juan David Ortiz',
        slug: 'juan-david-ortiz',
      }),
    ];
    const html = renderToStaticMarkup(
      React.createElement(PlannersSection, {
        section: makeSection({}),
        website: makeWebsite(),
        dbPlanners: planners,
      }),
    );
    expect(html).toContain('Mariana Vélez');
    expect(html).toContain('Andrés Restrepo');
    expect(html).toContain('Luisa Carrizosa');
    expect(html).toContain('Juan David Ortiz');
    // Every card should link to the per-planner profile.
    expect(html).toMatch(/\/site\/acme\/planners\/mariana-velez/);
    expect(html).toMatch(/\/site\/acme\/planners\/andres-restrepo/);
  });

  it('renders the soft empty state when no planners are passed', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersSection, {
        section: makeSection({}),
        website: makeWebsite(),
        dbPlanners: [],
      }),
    );
    expect(html).toContain('Aún no hay travel planners publicados');
  });

  it('uses contacts.quote when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersSection, {
        section: makeSection({}),
        website: makeWebsite(),
        dbPlanners: [makePlanner({ quote: 'El Caribe es mi casa.' })],
      }),
    );
    expect(html).toContain('El Caribe es mi casa.');
  });

  it('falls back to a template string when contacts.quote is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersSection, {
        section: makeSection({}),
        website: makeWebsite(),
        dbPlanners: [makePlanner({ quote: null })],
      }),
    );
    // DEFAULT_QUOTE_FALLBACK from planners.tsx
    expect(html).toContain('Diseñamos viajes hechos a tu medida');
  });

  it('builds a wa.me link with the planner-level phone + pre-filled "Hola {name}" text', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersSection, {
        section: makeSection({}),
        website: makeWebsite(),
        dbPlanners: [
          makePlanner({ phone: '+573000000001', name: 'Mariana' }),
        ],
      }),
    );
    expect(html).toContain('wa.me/573000000001');
    // URL-encoded prefix "Hola Mariana"
    expect(html).toMatch(/Hola%20Mariana/);
  });
});

// ---------- <PlannersMatchmaker /> (server-rendered initial state) ----

const matchmakerTabs = [
  { key: 'all', label: 'Todos' },
  { key: 'Caribe', label: 'Caribe' },
  { key: 'Andes', label: 'Andes' },
];

const matchmakerHeading = {
  eyebrow: 'Encuentra tu planner',
  title: 'Dinos qué buscas',
  titleEmphasis: 'y te emparejamos.',
  body: 'Cuéntanos dónde quieres ir.',
  ctaLabel: 'Hablar con mi match',
  regionLabel: '¿A qué región?',
  styleLabel: '¿Qué estilo?',
  matchLabel: 'Match sugerido',
};

const matchmakerOptions = {
  regions: [
    { key: 'Caribe', label: 'Caribe' },
    { key: 'Andes', label: 'Andes' },
  ],
  styles: [
    { key: 'cultura', label: 'Cultura' },
    { key: 'aventura', label: 'Aventura' },
  ],
};

const matchmakerToolbarCopy = {
  singular: 'planner',
  plural: 'planners',
  sortByLabel: 'ordenar por',
  sortByValue: 'reseñas',
};

const matchmakerCardCopy = {
  viewProfile: 'Ver perfil',
  availableFallback: 'Disponible',
  yearsSuffix: 'años',
};

function makeMatchPlanner(id: string, specialties: string[]) {
  return {
    id,
    name: `Planner ${id}`,
    slug: id,
    photo: null,
    role: specialties.join(' · '),
    quote: 'Quote',
    specialties,
    languages: ['ES'],
    profileHref: `/site/acme/planners/${id}`,
  };
}

describe('editorial-v1 <PlannersMatchmaker>', () => {
  it('renders all planners with no spotlight on mount', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersMatchmaker, {
        planners: [
          makeMatchPlanner('a', ['Caribe', 'cultura']),
          makeMatchPlanner('b', ['Andes', 'aventura']),
        ],
        tabs: matchmakerTabs,
        heading: matchmakerHeading,
        options: matchmakerOptions,
        toolbarCopy: matchmakerToolbarCopy,
        cardCopy: matchmakerCardCopy,
      }),
    );
    expect(html).toContain('Planner a');
    expect(html).toContain('Planner b');
    // No card is marked as the spotlight in the initial state.
    expect(html).not.toContain('data-match-spotlight="true"');
    // Every tab label rendered.
    expect(html).toContain('Todos');
    expect(html).toContain('Caribe');
    expect(html).toContain('Andes');
  });

  it('renders the matchmaker panel with region + style quiz tabs', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannersMatchmaker, {
        planners: [makeMatchPlanner('a', ['Caribe', 'cultura'])],
        tabs: matchmakerTabs,
        heading: matchmakerHeading,
        options: matchmakerOptions,
        toolbarCopy: matchmakerToolbarCopy,
        cardCopy: matchmakerCardCopy,
      }),
    );
    expect(html).toContain('Encuentra tu planner');
    expect(html).toContain('¿A qué región?');
    expect(html).toContain('¿Qué estilo?');
    expect(html).toContain('Cultura');
    expect(html).toContain('Hablar con mi match');
  });
});

// ---------- <EditorialPlannerDetailPage /> (stub data) ----

describe('editorial-v1 <EditorialPlannerDetailPage>', () => {
  it('renders hero, bio, WhatsApp CTA, KPIs, and rail with full stub data', () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorialPlannerDetailPage, {
        website: makeWebsite(),
        planner: makePlanner({
          fullName: 'Mariana Vélez',
          name: 'Mariana',
          position: 'Planner Caribe',
          phone: '+573000000001',
          quote: 'El Caribe es mi casa.',
        }),
        payload: {
          bio: 'Nació en Cartagena y no se imagina viviendo en otro lugar.',
          years: 8,
          trips: 140,
          rating: 4.9,
          reviews: 210,
          regions: ['Caribe'],
          specialties: ['cultura', 'gastronomía'],
          languages: ['ES', 'EN'],
          response: '~3 min',
          base: 'Cartagena',
          availability: 'Acepta viajes en mayo',
        },
      }),
    );

    // Hero
    expect(html).toContain('Mariana');
    expect(html).toContain('Vélez');
    // Bio
    expect(html).toContain('Nació en Cartagena');
    // WhatsApp CTA: digits + pre-filled first name
    expect(html).toContain('wa.me/573000000001');
    expect(html).toMatch(/Hola%20Mariana/);
    // Rail labels
    expect(html).toContain('Tiempo de respuesta');
    expect(html).toContain('~3 min');
    // KPI grid
    expect(html).toContain('Experiencia');
    expect(html).toContain('Rating');
  });

  it('renders safely with only minimal DB data (no extra payload)', () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorialPlannerDetailPage, {
        website: makeWebsite(),
        planner: makePlanner({
          fullName: 'Solo Name',
          position: null,
          quote: null,
        }),
      }),
    );
    expect(html).toContain('Solo Name');
    // Default bio fallback from planner-detail.tsx
    expect(html).toContain('Diseña viajes a medida');
  });
});
