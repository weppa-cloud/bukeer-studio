/**
 * editorial-v1 — <EditorialBlogListPage />
 *
 * Ported from designer `BlogList` in
 *   themes/references/claude design 1/project/blog.jsx
 * Copy from `docs/editorial-v1/copy-catalog.md` (Blog listing).
 *
 * Renders:
 *   - Editorial hero (eyebrow + title + subtitle + breadcrumbs)
 *   - Optional featured card (first post with `featured` flag, or the first post)
 *   - Toolbar: category chips + search + sort
 *   - 3-col grid of remaining posts
 *   - Pagination controls (navigational `<Link>`s — no JS required for paging)
 *
 * The toolbar lives in a tiny client leaf (`<BlogListToolbar />` below) so the
 * hero + grid can stay server-rendered. URL state keeps filters bookmarkable.
 */

import Link from 'next/link';
import Image from 'next/image';

import type { WebsiteData, BlogPost, BlogCategory } from '@/lib/supabase/get-website';
import { Eyebrow } from '@/components/site/themes/editorial-v1/primitives/eyebrow';
import { Breadcrumbs } from '@/components/site/themes/editorial-v1/primitives/breadcrumbs';
import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { formatPublicDate } from '@/lib/site/public-ui-messages';

import { BlogListToolbar } from './blog-list-toolbar.client';

export interface EditorialBlogListPageProps {
  website: WebsiteData;
  subdomain: string;
  locale: string;
  posts: BlogPost[];
  categories: BlogCategory[];
  total: number;
  page: number;
  limit: number;
  category?: string | null;
  query?: string | null;
  sort?: string | null;
}

function formatDate(raw: string | null | undefined, localeLike: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.valueOf())) return '';
  return formatPublicDate(d, localeLike, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildHref(
  basePath: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && `${v}` !== '',
  );
  if (entries.length === 0) return `${basePath}/blog`;
  const usp = new URLSearchParams();
  for (const [k, v] of entries) usp.set(k, `${v}`);
  return `${basePath}/blog?${usp.toString()}`;
}

export function EditorialBlogListPage({
  website,
  subdomain,
  locale,
  posts,
  categories,
  total,
  page,
  limit,
  category,
  query,
}: EditorialBlogListPageProps) {
  const basePath = `/site/${subdomain}`;
  const resolvedLocale =
    locale
    || (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    || website.default_locale
    || website.content?.locale
    || 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const DEFAULT_EYEBROW = editorialText('editorialBlogListEyebrow');
  const DEFAULT_TITLE = editorialText('editorialBlogListTitle');
  const DEFAULT_EMPHASIS = editorialText('editorialBlogListEmphasis');
  const DEFAULT_SUBTITLE = editorialText('editorialBlogListSubtitle');
  const ALL_LABEL = editorialText('editorialBlogListAllTab');
  const EMPTY_HEADING = editorialText('editorialBlogEmptyHeading');
  const EMPTY_BODY = editorialText('editorialBlogEmptyBody');
  const LOAD_MORE = editorialText('editorialBlogLoadMore');
  const PREV_LABEL = editorialText('editorialBlogPrev');
  const NEXT_LABEL = editorialText('editorialBlogNext');
  const READ_CTA = editorialText('editorialBlogReadCta');
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Featured: first post in the first page (per designer — featured flag not
  // present on DB row, so we promote the first one).
  const [featured, ...rest] = posts;
  const showFeatured = page === 1 && !query && !category && !!featured;
  const gridPosts = showFeatured ? rest : posts;

  const siteTitleTrail = website.content?.siteName || subdomain;

  return (
    <div data-screen-label="BlogList" data-testid="editorial-blog-list">
      {/* Hero */}
      <section className="section ev-blog-hero" style={{ paddingTop: 72 }}>
        <div className="ev-container">
          <Breadcrumbs
            items={[
              { label: siteTitleTrail, href: basePath },
              { label: 'Blog' },
            ]}
          />
          <div style={{ marginTop: 24, maxWidth: '52ch' }}>
            <Eyebrow>{DEFAULT_EYEBROW}</Eyebrow>
            <h1 className="display-lg" style={{ margin: '12px 0 12px' }}>
              {DEFAULT_TITLE}{' '}
              <em
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent)',
                  fontWeight: 400,
                }}
              >
                {DEFAULT_EMPHASIS}
              </em>
            </h1>
            <p className="body-lg">{DEFAULT_SUBTITLE}</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 56 }}>
        <div className="ev-container">
          {/* Featured */}
          {showFeatured && featured ? (
            <Link
              href={`${basePath}/blog/${encodeURIComponent(featured.slug)}`}
              className="blog-featured"
              data-testid="blog-featured"
            >
              <div className="blog-feat-media">
                {featured.featured_image ? (
                  <Image
                    src={featured.featured_image}
                    alt={featured.featured_alt || featured.title}
                    fill
                    sizes="(max-width: 1100px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
                    }}
                  />
                )}
              </div>
              <div className="blog-feat-body">
                {featured.category?.name ? (
                  <span className="chip chip-accent">{featured.category.name}</span>
                ) : null}
                <h2 className="display-md" style={{ margin: '14px 0 12px' }}>
                  {featured.title}
                </h2>
                {featured.excerpt ? (
                  <p className="body-lg" style={{ maxWidth: '54ch' }}>
                    {featured.excerpt}
                  </p>
                ) : null}
                <div className="blog-meta">
                  {featured.author_name ? <span>{featured.author_name}</span> : null}
                  {featured.published_at ? (
                    <>
                      {featured.author_name ? <span aria-hidden="true">·</span> : null}
                      <time dateTime={featured.published_at}>
                        {formatDate(featured.published_at, resolvedLocale)}
                      </time>
                    </>
                  ) : null}
                  {featured.reading_time_minutes ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{featured.reading_time_minutes} {editorialText('editorialBlogReadingSuffix')}</span>
                    </>
                  ) : null}
                </div>
                <span className="btn btn-ink btn-sm" style={{ marginTop: 20 }}>
                  {READ_CTA} <Icons.arrow size={14} aria-hidden />
                </span>
              </div>
            </Link>
          ) : null}

          {/* Toolbar (client leaf — URL-synced filters) */}
          <BlogListToolbar
            basePath={basePath}
            locale={resolvedLocale}
            categories={categories}
            activeCategorySlug={category ?? null}
            initialQuery={query ?? ''}
            allLabel={ALL_LABEL}
          />

          {/* Grid */}
          {gridPosts.length === 0 ? (
            <div
              className="ev-blog-empty"
              data-testid="blog-empty"
              style={{
                padding: '80px 20px',
                textAlign: 'center',
                background: 'var(--c-surface)',
                borderRadius: 20,
                border: '1px solid var(--c-line)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  marginBottom: 10,
                }}
              >
                {EMPTY_HEADING}
              </div>
              <p className="body-md">{EMPTY_BODY}</p>
            </div>
          ) : (
            <div className="blog-grid" data-testid="blog-grid">
              {gridPosts.map((post) => {
                const href = `${basePath}/blog/${encodeURIComponent(post.slug)}`;
                return (
                  <article key={post.id} className="blog-card">
                    <Link href={href} className="blog-card-media" aria-label={post.title}>
                      {post.featured_image ? (
                        <Image
                          src={post.featured_image}
                          alt={post.featured_alt || post.title}
                          fill
                          sizes="(max-width: 720px) 88vw, (max-width: 1100px) 45vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
                          }}
                        />
                      )}
                      {post.category?.name ? (
                        <span className="chip chip-white blog-cat-tag">
                          {post.category.name}
                        </span>
                      ) : null}
                    </Link>
                    <div className="blog-card-body">
                      <h3>
                        <Link href={href}>{post.title}</Link>
                      </h3>
                      {post.excerpt ? <p>{post.excerpt}</p> : null}
                      <div className="blog-meta">
                        {post.author_name ? <span>{post.author_name}</span> : null}
                        {post.published_at ? (
                          <>
                            {post.author_name ? <span aria-hidden="true">·</span> : null}
                            <time dateTime={post.published_at}>
                              {formatDate(post.published_at, resolvedLocale)}
                            </time>
                          </>
                        ) : null}
                        {post.reading_time_minutes ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{post.reading_time_minutes} min</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination — prefer numbered pages; "Load more" label kept for parity with
              designer but implemented as a next-page link so the behaviour stays
              stateless and crawlable. */}
          {totalPages > 1 ? (
            <nav
              className="ev-blog-pagination"
              aria-label={editorialText('editorialBlogPaginationAria')}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 48,
                alignItems: 'center',
              }}
            >
              {hasPrev ? (
                <Link
                  href={buildHref(basePath, {
                    page: page - 1,
                    category: category || undefined,
                    q: query || undefined,
                  })}
                  className="btn btn-ghost"
                >
                  {PREV_LABEL}
                </Link>
              ) : null}
              <span style={{ color: 'var(--c-ink-2)', fontSize: 14 }}>
                {page} / {totalPages}
              </span>
              {hasNext ? (
                <Link
                  href={buildHref(basePath, {
                    page: page + 1,
                    category: category || undefined,
                    q: query || undefined,
                  })}
                  className="btn btn-ghost"
                >
                  {page + 1 <= totalPages ? LOAD_MORE : NEXT_LABEL}
                  <Icons.arrow size={14} aria-hidden />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default EditorialBlogListPage;
