/**
 * editorial-v1 — <BlogSection /> (home teaser)
 *
 * Server component. Shows a centred heading + 3-col grid of up to 3 posts
 * and a "Ver todo el blog" link top-right.
 *
 * Content contract (normalised snake_case → camelCase by the section-registry
 * dispatcher before reaching this component):
 *   eyebrow?:    string
 *   title:       string
 *   subtitle?:   string
 *   posts:       BlogTeaserPost[]
 *   viewAllHref?: string   (defaults to `/site/{subdomain}/blog`)
 *
 * Port of the designer teaser in `sections.jsx` (`BlogTeaser`) + copy from
 * `docs/editorial-v1/copy-catalog.md` → "Blog listing".
 */

import Link from 'next/link';
import Image from 'next/image';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { Eyebrow } from '@/components/site/themes/editorial-v1/primitives/eyebrow';
import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { formatPublicDate } from '@/lib/site/public-ui-messages';
import { editorialHtml } from '../primitives/rich-heading';

export interface BlogTeaserPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  publishedAt?: string | null;
  category?:
    | string
    | null
    | {
        name?: string | null;
        slug?: string | null;
      };
  readMinutes?: number | null;
  author?: string | null;
}

interface BlogSectionContent {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  posts?: BlogTeaserPost[] | null;
  viewAllHref?: string | null;
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

function categoryLabel(category: BlogTeaserPost['category']): string {
  if (!category) return '';
  if (typeof category === 'string') return category;
  return (category.name ?? '').toString().trim();
}

export interface EditorialBlogSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function BlogSection({ section, website }: EditorialBlogSectionProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    || website.default_locale
    || website.content?.locale
    || 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const DEFAULT_EYEBROW = editorialText('editorialBlogEyebrowFallback');
  const DEFAULT_TITLE = editorialText('editorialBlogTitleFallback');
  const VIEW_ALL = editorialText('editorialBlogViewAll');
  const NO_POSTS = editorialText('editorialBlogNoPosts');
  const raw = (section.content ?? {}) as BlogSectionContent;
  const eyebrow = (raw.eyebrow ?? '').toString().trim() || DEFAULT_EYEBROW;
  const title = (raw.title ?? '').toString().trim() || DEFAULT_TITLE;
  const subtitle = (raw.subtitle ?? '').toString().trim();
  const posts = Array.isArray(raw.posts) ? raw.posts.slice(0, 3) : [];

  const basePath = `/site/${website.subdomain}`;
  const viewAllHref =
    (raw.viewAllHref ?? '').toString().trim() || `${basePath}/blog`;

  return (
    <section
      className="ev-section ev-blog-teaser"
      data-screen-label="blog"
      style={{ background: 'var(--c-surface)' }}
    >
      <div className="ev-container">
        <header className="ev-blog-teaser-head">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
              className="display-md"
              style={{ margin: '12px 0 0', maxWidth: '24ch' }}
              dangerouslySetInnerHTML={editorialHtml(title)}
            />
            {subtitle ? (
              <p
                className="body-md"
                style={{ margin: '12px 0 0', maxWidth: '52ch', color: 'var(--c-ink-2)' }}
                dangerouslySetInnerHTML={editorialHtml(subtitle)}
              />
            ) : null}
          </div>
          <Link href={viewAllHref} className="ev-blog-teaser-viewall">
            {VIEW_ALL}
            <Icons.arrow size={14} aria-hidden />
          </Link>
        </header>

        {posts.length === 0 ? (
          <p
            className="ev-blog-teaser-empty"
            style={{
              textAlign: 'center',
              color: 'var(--c-ink-2)',
              fontSize: 15,
              padding: '48px 0 0',
            }}
          >
            {NO_POSTS}
          </p>
        ) : (
          <div className="blog-grid" data-testid="blog-teaser-grid">
            {posts.map((post) => {
              const cat = categoryLabel(post.category);
              const dateLabel = formatDate(post.publishedAt, resolvedLocale);
              const href = `${basePath}/blog/${encodeURIComponent(post.slug)}`;
              return (
                <article key={post.id} className="blog-card">
                  <Link
                    href={href}
                    className="blog-card-media"
                    aria-label={post.title}
                  >
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        sizes="(max-width: 720px) 88vw, (max-width: 1100px) 45vw, 33vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="blog-card-placeholder"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
                        }}
                      />
                    )}
                    {cat ? (
                      <span className="chip chip-white blog-cat-tag">{cat}</span>
                    ) : null}
                  </Link>
                  <div className="blog-card-body">
                    <h3>
                      <Link href={href}>{post.title}</Link>
                    </h3>
                    {post.excerpt ? <p>{post.excerpt}</p> : null}
                    <div className="blog-meta">
                      {post.author ? <span>{post.author}</span> : null}
                      {post.author && (dateLabel || post.readMinutes) ? (
                        <span aria-hidden="true">·</span>
                      ) : null}
                      {dateLabel ? <span>{dateLabel}</span> : null}
                      {dateLabel && post.readMinutes ? (
                        <span aria-hidden="true">·</span>
                      ) : null}
                      {post.readMinutes ? (
                        <span>{post.readMinutes} min</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default BlogSection;
