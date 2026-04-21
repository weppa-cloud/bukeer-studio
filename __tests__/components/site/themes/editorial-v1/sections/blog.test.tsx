/**
 * editorial-v1 — <BlogSection /> (home teaser) SSR tests.
 *
 * Coverage:
 *  - empty `posts[]` → header + "Aún no hay historias." fallback
 *  - renders up to 3 cards with title, excerpt and date
 *  - defaults eyebrow when none provided
 *  - "Ver todo el blog" link uses the custom `viewAllHref` when set
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BlogSection } from '@/components/site/themes/editorial-v1/sections/blog';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

function makeWebsite(): WebsiteData {
  return {
    subdomain: 'acme',
    content: { siteName: 'Acme Travel' },
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'sec-blog',
    section_type: 'blog',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

const POSTS = [
  {
    id: 'p1',
    slug: 'cartagena-secretos',
    title: 'Cartagena más allá de la muralla',
    excerpt: 'Siete rincones que no salen en las guías.',
    featuredImage: 'https://cdn.example/p1.jpg',
    publishedAt: '2026-03-28',
    readMinutes: 7,
    author: 'Mariana Vélez',
    category: 'Guías',
  },
  {
    id: 'p2',
    slug: 'cocora',
    title: 'Caminar el Valle de Cocora sin turistas',
    excerpt: 'El horario que cambia todo.',
    featuredImage: 'https://cdn.example/p2.jpg',
    publishedAt: '2026-03-14',
    readMinutes: 6,
    author: 'Andrés Restrepo',
    category: { name: 'Aventura', slug: 'aventura' },
  },
  {
    id: 'p3',
    slug: 'amazonas',
    title: 'Primer viaje al Amazonas',
    excerpt: 'Lodges, delfines y silencio.',
    featuredImage: 'https://cdn.example/p3.jpg',
    publishedAt: '2026-02-25',
    readMinutes: 10,
    author: 'Luisa Carrizosa',
  },
  {
    id: 'p4',
    slug: 'extra',
    title: 'Cuarto post (no debe renderizarse)',
    excerpt: 'Excedente del límite.',
  },
];

describe('<BlogSection /> editorial-v1', () => {
  it('renders empty fallback when no posts', () => {
    const markup = renderToStaticMarkup(
      <BlogSection
        section={makeSection({ title: 'Historias desde adentro.', posts: [] })}
        website={makeWebsite()}
      />,
    );
    expect(markup).toContain('Historias desde adentro.');
    expect(markup).toContain('Aún no hay historias');
    expect(markup).not.toContain('blog-card');
  });

  it('renders up to three cards with titles, excerpts and "Ver todo" link', () => {
    const markup = renderToStaticMarkup(
      <BlogSection
        section={makeSection({
          eyebrow: 'BLOG',
          title: 'Historias desde adentro.',
          posts: POSTS,
        })}
        website={makeWebsite()}
      />,
    );
    expect(markup).toContain('BLOG');
    expect(markup).toContain('Historias desde adentro.');
    expect(markup).toContain(POSTS[0].title);
    expect(markup).toContain(POSTS[1].title);
    expect(markup).toContain(POSTS[2].title);
    expect(markup).not.toContain(POSTS[3].title);
    expect(markup).toContain(POSTS[0].excerpt);
    // Default href points to /site/{subdomain}/blog
    expect(markup).toContain('href="/site/acme/blog"');
    expect(markup).toContain('Ver todo el blog');
    // Card media links use the slug
    expect(markup).toContain('/site/acme/blog/cartagena-secretos');
  });

  it('prefers a custom `viewAllHref` when provided', () => {
    const markup = renderToStaticMarkup(
      <BlogSection
        section={makeSection({
          title: 'Historias',
          posts: POSTS.slice(0, 1),
          viewAllHref: '/site/acme/blog?category=guias',
        })}
        website={makeWebsite()}
      />,
    );
    expect(markup).toContain('href="/site/acme/blog?category=guias"');
  });

  it('defaults eyebrow to "BLOG" when not configured', () => {
    const markup = renderToStaticMarkup(
      <BlogSection
        section={makeSection({ title: 'Historias', posts: POSTS.slice(0, 1) })}
        website={makeWebsite()}
      />,
    );
    expect(markup).toContain('>BLOG<');
  });
});
