/**
 * editorial-v1 — <EditorialBlogDetailPage /> SSR tests.
 *
 * Coverage:
 *  - Renders hero with title + breadcrumbs + author
 *  - Body renders sanitized content (SafeHtml)
 *  - Share rail with WhatsApp / Twitter / Facebook hrefs
 *  - Inline CTA + author card + related posts
 *  - Falls back when no author / no related posts
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialBlogDetailPage } from '@/components/site/themes/editorial-v1/pages/blog-detail';
import type { WebsiteData, BlogPost } from '@/lib/supabase/get-website';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

// SafeHtml is server-only; mock as a simple passthrough for tests.
jest.mock('@/lib/sanitize', () => ({
  SafeHtml: ({ content }: { content: string }) =>
    React.createElement('div', {
      dangerouslySetInnerHTML: { __html: content },
    }),
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
    content: {
      siteName: 'Acme Travel',
      social: { whatsapp: '+573001112222' },
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

const POST: BlogPost = {
  id: 'p1',
  website_id: 'w1',
  title: 'Cartagena más allá de la muralla',
  slug: 'cartagena',
  excerpt: 'Siete rincones.',
  content: '<p>Cuerpo del post.</p>',
  featured_image: 'https://cdn.example/img.jpg',
  featured_alt: 'Cartagena',
  category_id: 'c1',
  status: 'published',
  published_at: '2026-03-28T00:00:00Z',
  updated_at: '2026-03-28T00:00:00Z',
  seo_title: null,
  seo_description: null,
  seo_keywords: ['caribe', 'cartagena', 'guia'],
  word_count: 500,
  author_name: 'Mariana Vélez',
  author_avatar: null,
  reading_time_minutes: 7,
  category: {
    id: 'c1',
    name: 'Guías',
    slug: 'guias',
    description: null,
    color: null,
  },
} as BlogPost;

const RELATED: BlogPost[] = [
  { ...POST, id: 'r1', slug: 'r1', title: 'Related 1' },
  { ...POST, id: 'r2', slug: 'r2', title: 'Related 2' },
];

describe('<EditorialBlogDetailPage />', () => {
  it('renders hero + body + share rail + CTA + author card', () => {
    const markup = renderToStaticMarkup(
      <EditorialBlogDetailPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        post={POST}
        related={RELATED}
      />,
    );
    expect(markup).toContain('data-testid="editorial-blog-detail"');
    // Hero
    expect(markup).toContain('Cartagena más allá de la muralla');
    expect(markup).toContain('Mariana Vélez');
    expect(markup).toContain('data-testid="blog-hero"');
    // Category chip
    expect(markup).toContain('Guías');
    // Body
    expect(markup).toContain('data-testid="blog-article"');
    expect(markup).toContain('Cuerpo del post.');
    // Share links
    expect(markup).toContain('https://wa.me/?text=');
    expect(markup).toContain('twitter.com/intent/tweet');
    expect(markup).toContain('facebook.com/sharer');
    // CTA block
    expect(markup).toContain('data-testid="blog-cta"');
    expect(markup).toContain('Planear mi viaje');
    // Author card
    expect(markup).toContain('data-testid="blog-author-card"');
    // Tags
    expect(markup).toContain('caribe');
    expect(markup).toContain('cartagena');
    // Related
    expect(markup).toContain('data-testid="blog-related"');
    expect(markup).toContain('Related 1');
    expect(markup).toContain('Related 2');
  });

  it('omits related section when empty', () => {
    const markup = renderToStaticMarkup(
      <EditorialBlogDetailPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        post={POST}
        related={[]}
      />,
    );
    expect(markup).not.toContain('data-testid="blog-related"');
  });

  it('omits author card when author_name missing', () => {
    const markup = renderToStaticMarkup(
      <EditorialBlogDetailPage
        website={makeWebsite()}
        subdomain="acme"
        locale="es-CO"
        post={{ ...POST, author_name: null }}
        related={[]}
      />,
    );
    expect(markup).not.toContain('data-testid="blog-author-card"');
  });
});
