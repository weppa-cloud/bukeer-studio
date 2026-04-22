/**
 * editorial-v1 — <EditorialBlogListPage /> SSR tests.
 *
 * Coverage:
 *  - Renders hero + breadcrumbs + grid directly (no featured block)
 *  - Pagination controls appear only when totalPages > 1
 *  - Empty state shows when posts[] is empty
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialBlogListPage } from '@/components/site/themes/editorial-v1/pages/blog-list';
import type {
  WebsiteData,
  BlogPost,
  BlogCategory,
} from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

function makePost(idx: number): BlogPost {
  return {
    id: `post-${idx}`,
    website_id: 'w1',
    title: `Post ${idx} — Historia`,
    slug: `post-${idx}`,
    excerpt: `Excerpt ${idx}`,
    content: `<p>Body of post ${idx}</p>`,
    featured_image: `https://cdn.example/${idx}.jpg`,
    featured_alt: null,
    category_id: null,
    status: 'published',
    published_at: '2026-03-28T00:00:00Z',
    updated_at: '2026-03-28T00:00:00Z',
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    word_count: 500,
    author_name: `Autor ${idx}`,
    author_avatar: null,
    reading_time_minutes: 5,
  } as BlogPost;
}

const CATEGORIES: BlogCategory[] = [
  { id: 'c1', name: 'Guías', slug: 'guias', description: null, color: null },
  { id: 'c2', name: 'Aventura', slug: 'aventura', description: null, color: null },
];

describe('<EditorialBlogListPage />', () => {
  it('renders hero + grid with N posts and no featured block', () => {
    const posts = [1, 2, 3, 4].map(makePost);
    const markup = renderToStaticMarkup(
      <EditorialBlogListPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        posts={posts}
        categories={CATEGORIES}
        total={4}
        page={1}
        limit={9}
      />,
    );
    // Hero
    expect(markup).toContain('Historias');
    expect(markup).toContain('desde adentro.');
    expect(markup).toContain('Acme Travel');
    // No featured block
    expect(markup).not.toContain('data-testid="blog-featured"');
    // Grid renders all posts
    expect(markup).toContain('data-testid="blog-grid"');
    expect(markup).toContain('Post 1 — Historia');
    expect(markup).toContain('Post 2 — Historia');
    expect(markup).toContain('Post 3 — Historia');
    expect(markup).toContain('Post 4 — Historia');
    // Category chips
    expect(markup).toContain('>Guías<');
    expect(markup).toContain('>Aventura<');
  });

  it('renders grid even when a search query is active (no featured mode)', () => {
    const posts = [1, 2].map(makePost);
    const markup = renderToStaticMarkup(
      <EditorialBlogListPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        posts={posts}
        categories={CATEGORIES}
        total={2}
        page={1}
        limit={9}
        query="historia"
      />,
    );
    expect(markup).not.toContain('data-testid="blog-featured"');
    expect(markup).toContain('Post 1 — Historia');
    expect(markup).toContain('Post 2 — Historia');
  });

  it('renders empty state when no posts', () => {
    const markup = renderToStaticMarkup(
      <EditorialBlogListPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        posts={[]}
        categories={[]}
        total={0}
        page={1}
        limit={9}
        query="nada"
      />,
    );
    expect(markup).toContain('data-testid="blog-empty"');
    expect(markup).toContain('Nada con esos criterios');
  });

  it('renders pagination when totalPages > 1', () => {
    const posts = [1, 2, 3].map(makePost);
    const markup = renderToStaticMarkup(
      <EditorialBlogListPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        posts={posts}
        categories={[]}
        total={20}
        page={1}
        limit={9}
      />,
    );
    // 20/9 ≈ 3 pages — next link must appear
    expect(markup).toContain('Cargar más historias');
    expect(markup).toContain('1 / 3');
  });
});
