/**
 * editorial-v1 — <EditorialBlogDetailPage />
 *
 * Editorial variant of the blog post page. Uses the shared rich-text rendering
 * path from `components/site/blog/blog-detail.tsx` (SafeHtml + reading-time
 * calc) so sanitisation rules stay in one place.
 *
 * Layout differs from the generic page:
 *   - Full-bleed hero with scenic imagery, breadcrumbs + author card
 *   - 220px sticky share/tag rail + 68ch article column
 *   - Inline CTA block mid-post (rendered after the article body)
 *   - Author card + 3 related posts
 *
 * Source ports:
 *   themes/references/claude design 1/project/blog.jsx (BlogPost)
 *   themes/references/claude design 1/project/blog.css (.post-hero / .post-*)
 *   docs/editorial-v1/copy-catalog.md → "Blog detail page"
 */

import Link from 'next/link';
import Image from 'next/image';

import { SafeHtml } from '@/lib/sanitize';
import { editorialHtml } from '../primitives/rich-heading';
import type {
  WebsiteData,
  BlogPost,
  BlogCategory,
} from '@/lib/supabase/get-website';
import { Eyebrow } from '@/components/site/themes/editorial-v1/primitives/eyebrow';
import { Breadcrumbs } from '@/components/site/themes/editorial-v1/primitives/breadcrumbs';
import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { WaflowCTAButton } from '@/components/site/themes/editorial-v1/waflow/cta-button';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { formatPublicDate } from '@/lib/site/public-ui-messages';
import { getBasePath } from '@/lib/utils/base-path';

export interface EditorialBlogDetailPageProps {
  website: WebsiteData;
  subdomain: string;
  locale: string;
  post: BlogPost;
  related: BlogPost[];
}

function formatDate(raw: string | null | undefined, localeLike: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.valueOf())) return '';
  return formatPublicDate(d, localeLike, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function firstName(value: string | null | undefined): string {
  if (!value) return '';
  return value.split(/\s+/)[0] || value;
}

function resolveWhatsAppHref(website: WebsiteData): string {
  const raw = website.content?.social?.whatsapp || '';
  if (!raw) return '#cta';
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : '#cta';
}

function shareHrefs(post: BlogPost, baseUrl: string) {
  const url = `${baseUrl}/blog/${post.slug}`;
  const text = post.title;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} - ${url}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

function renderCategoryChip(category: BlogCategory | undefined) {
  if (!category?.name) return null;
  return <span className="chip chip-accent">{category.name}</span>;
}

export function EditorialBlogDetailPage({
  website,
  subdomain,
  locale,
  post,
  related,
}: EditorialBlogDetailPageProps) {
  const isCustomDomain = Boolean((website as WebsiteData & { isCustomDomain?: boolean }).isCustomDomain);
  const basePath = getBasePath(subdomain, isCustomDomain);
  const resolvedLocale =
    locale
    || (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    || website.default_locale
    || website.content?.locale
    || 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const isEnglish = resolvedLocale.toLowerCase().startsWith('en');
  const SHARE_LABEL = editorialText('editorialBlogShare');
  const TAGS_LABEL = editorialText('editorialBlogTags');
  const AUTHOR_EYEBROW = editorialText('editorialBlogAuthorEyebrow');
  const CTA_EYEBROW = editorialText('editorialBlogCtaEyebrow');
  const CTA_TITLE_PREFIX = editorialText('editorialBlogCtaTitlePrefix');
  const CTA_TITLE_EM = editorialText('editorialBlogCtaTitleEm');
  const CTA_BODY = editorialText('editorialBlogCtaBody');
  const CTA_PRIMARY = editorialText('editorialBlogCtaPrimary');
  const CTA_WHATSAPP = isEnglish
    ? 'Chat with a planner on WhatsApp'
    : 'Hablar con un planner por WhatsApp';
  const RELATED_HEADING = editorialText('editorialBlogRelatedHeading');
  const RELATED_HEADING_EM = editorialText('editorialBlogRelatedHeadingEm');
  const RELATED_CTA = editorialText('editorialBlogRelatedCta');
  const publicBaseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const siteTitleTrail = website.content?.siteName || subdomain;
  const dateLabel = formatDate(post.published_at, resolvedLocale);
  const categoryName = post.category?.name ?? undefined;
  const shares = shareHrefs(post, publicBaseUrl);
  const waHref = resolveWhatsAppHref(website);

  return (
    <div data-screen-label="BlogPost" data-testid="editorial-blog-detail">
      <div data-testid="detail-blog">
      {/* Full-bleed hero */}
      <div className="post-hero" data-testid="blog-hero">
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.featured_alt || post.title}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover', opacity: 0.55 }}
            priority
            fetchPriority="high"
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, var(--ev-hero-green), var(--ev-hero-green-2))',
              opacity: 0.55,
            }}
          />
        )}
        <div className="wash" aria-hidden="true" />
        <div className="ev-container meta">
          <Breadcrumbs
            tone="inverse"
            className="pkg-hero-breadcrumb"
            items={[
              { label: siteTitleTrail, href: basePath },
              { label: 'Blog', href: `${basePath}/blog` },
              ...(categoryName
                ? [
                    {
                      label: categoryName,
                      href: post.category?.slug
                        ? `${basePath}/blog?category=${post.category.slug}`
                        : undefined,
                    },
                  ]
                : []),
            ]}
          />
          {renderCategoryChip(post.category)}
          <h1 className="display-lg" style={{ maxWidth: '22ch' }} dangerouslySetInnerHTML={editorialHtml(post.title) || { __html: post.title }} />
          <div className="post-author-line">
            {post.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="av"
                src={post.author_avatar}
                alt={post.author_name || ''}
                width={52}
                height={52}
              />
            ) : (
              <span
                className="av"
                aria-hidden="true"
                style={{
                  background:
                    'linear-gradient(135deg, var(--c-accent), var(--c-accent-2))',
                }}
              />
            )}
            <div>
              {post.author_name ? <b>{post.author_name}</b> : null}
              <small>
                {dateLabel}
                {post.reading_time_minutes
                  ? ` · ${post.reading_time_minutes} ${editorialText('editorialBlogReadingSuffix')}`
                  : ''}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ev-container">
        <div className="post-body">
          <aside className="post-rail">
            <div className="post-share">
              <div className="ev-rail-label">{SHARE_LABEL}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={shares.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  aria-label="WhatsApp"
                >
                  <Icons.whatsapp size={16} aria-hidden />
                </a>
                <a
                  href={shares.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  aria-label="Twitter"
                >
                  <Icons.arrowUpRight size={16} aria-hidden />
                </a>
                <a
                  href={shares.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  aria-label="Facebook"
                >
                  <Icons.arrow size={16} aria-hidden />
                </a>
              </div>
            </div>
            {post.seo_keywords && post.seo_keywords.length > 0 ? (
              <div className="post-tags">
                <div className="ev-rail-label">{TAGS_LABEL}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {post.seo_keywords.slice(0, 8).map((tag) => (
                    <span key={tag} className="chip chip-ink">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <article className="post-main" data-testid="blog-article">
            <SafeHtml
              content={post.content}
              fallbackAlt={post.title}
              className="blog-prose"
            />

            {/* Inline CTA */}
            <aside className="post-cta" data-testid="blog-cta">
              <div>
                <div className="label" style={{ color: 'rgba(255,255,255,.75)' }}>
                  {CTA_EYEBROW}
                </div>
                <h3>
                  {CTA_TITLE_PREFIX} <em>{CTA_TITLE_EM}</em>
                </h3>
                <p>
                  {post.author_name
                    ? `Cuéntale a ${firstName(post.author_name)} qué te interesa y recibe una propuesta en 24h.`
                    : CTA_BODY}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                <Link href={`${basePath}/#cta`} className="btn btn-accent">
                  {CTA_PRIMARY} <Icons.arrow size={14} aria-hidden />
                </Link>
                <WaflowCTAButton
                  variant="A"
                  fallbackHref={waHref}
                  className="btn btn-ghost"
                  style={{ color: '#fff' }}
                >
                  <Icons.whatsapp size={14} aria-hidden /> {CTA_WHATSAPP}
                </WaflowCTAButton>
              </div>
            </aside>

            {post.author_name ? (
              <aside className="post-author-card" data-testid="blog-author-card">
                {post.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="av"
                    src={post.author_avatar}
                    alt={post.author_name}
                    width={84}
                    height={84}
                  />
                ) : (
                  <span
                    className="av"
                    aria-hidden="true"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--c-accent), var(--c-accent-2))',
                    }}
                  />
                )}
                <div>
                  <Eyebrow>{AUTHOR_EYEBROW}</Eyebrow>
                  <b>{post.author_name}</b>
                  <p>{editorialText('editorialBlogAuthorBioFallback')}</p>
                </div>
              </aside>
            ) : null}
          </article>
        </div>

        {related.length > 0 ? (
          <section className="post-related" data-testid="blog-related">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 28,
              }}
            >
              <h2 className="display-md">
                {RELATED_HEADING} <em>{RELATED_HEADING_EM}</em>
              </h2>
              <Link href={`${basePath}/blog`} className="btn btn-ghost btn-sm">
                {RELATED_CTA} <Icons.arrow size={14} aria-hidden />
              </Link>
            </div>
            <div className="blog-grid">
              {related.slice(0, 3).map((rp) => {
                const href = `${basePath}/blog/${encodeURIComponent(rp.slug)}`;
                return (
                  <article key={rp.id} className="blog-card">
                    <Link href={href} className="blog-card-media" aria-label={rp.title}>
                      {rp.featured_image ? (
                        <Image
                          src={rp.featured_image}
                          alt={rp.featured_alt || rp.title}
                          fill
                          sizes="(max-width: 1100px) 45vw, 33vw"
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
                      {rp.category?.name ? (
                        <span className="chip chip-white blog-cat-tag">
                          {rp.category.name}
                        </span>
                      ) : null}
                    </Link>
                    <div className="blog-card-body">
                      <h3>
                        <Link href={href}>{rp.title}</Link>
                      </h3>
                      {rp.excerpt ? <p>{rp.excerpt}</p> : null}
                      <div className="blog-meta">
                        {rp.author_name ? <span>{rp.author_name}</span> : null}
                        {rp.reading_time_minutes ? (
                          <>
                            {rp.author_name ? <span aria-hidden="true">·</span> : null}
                            <span>{rp.reading_time_minutes} min</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}

export default EditorialBlogDetailPage;
