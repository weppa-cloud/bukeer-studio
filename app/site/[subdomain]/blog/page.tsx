import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getWebsiteBySubdomain, getBlogPosts, getBlogCategories } from '@/lib/supabase/get-website';
import { notFound } from 'next/navigation';
import { JsonLd, generateBlogListingSchemas } from '@/lib/schema';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { formatPublicDate, getPublicUiMessages } from '@/lib/site/public-ui-messages';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';

interface BlogPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ category?: string; page?: string; q?: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Blog' };
  }

  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, '/blog');
  const messages = getPublicUiMessages(localeContext.resolvedLocale);
  const localizedBlogPath = localeContext.localizedPathname;
  const canonical = `${baseUrl}${localizedBlogPath}`;
  const languages = buildLocaleAwareAlternateLanguages(baseUrl, '/blog', localeContext);
  const description = `${messages.blogListing.heroDescription} ${siteName}`.trim();
  const ogImage = resolveOgImage(website);

  return {
    title: messages.blogListing.title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: `${messages.blogListing.title} — ${siteName}`,
      description,
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${messages.blogListing.title} — ${siteName}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { subdomain } = await params;
  const { category, page, q } = await searchParams;

  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const pageNum = parseInt(page || '1', 10);
  const limit = 9;
  const offset = (pageNum - 1) * limit;

  const [postsData, categories] = await Promise.all([
    getBlogPosts(website.id, { limit, offset, categorySlug: category }),
    getBlogCategories(website.id),
  ]);

  const { posts, total } = postsData;
  const totalPages = Math.ceil(total / limit);

  // Editorial-v1 filter: optional client-side (q) — server still paginates.
  const filteredPosts = q
    ? posts.filter((p) => {
        const hay = `${p.title} ${p.excerpt ?? ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : posts;

  // Generate base URL for schema
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, '/blog');
  const messages = getPublicUiMessages(localeContext.resolvedLocale);

  // Generate JSON-LD schemas (CollectionPage, Breadcrumb, Organization)
  const schemas = generateBlogListingSchemas(posts, website, baseUrl, localeContext.resolvedLocale);

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />

      <TemplateSlot
        name="blog-list"
        website={website}
        payload={{
          subdomain,
          locale: localeContext.resolvedLocale,
          posts: filteredPosts,
          categories,
          total,
          page: pageNum,
          limit,
          category: category ?? null,
          query: q ?? null,
        }}
      >
      <div className="section-padding">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{messages.blogListing.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {messages.blogListing.heroDescription}
          </p>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <Link
              href={`/site/${subdomain}/blog`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {messages.blogListing.allCategories}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/site/${subdomain}/blog?category=${cat.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {messages.blogListing.noPosts}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group rounded-lg overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-shadow"
              >
                {/* Featured Image */}
                <Link href={`/site/${subdomain}/blog/${post.slug}`}>
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {post.featured_image ? (
                      <Image
                        src={post.featured_image}
                        alt={post.title}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-6">
                  {/* Category */}
                  {post.category && (
                    <Link
                      href={`/site/${subdomain}/blog?category=${post.category.slug}`}
                      className="text-xs font-medium text-primary uppercase tracking-wider"
                    >
                      {post.category.name}
                    </Link>
                  )}

                  {/* Title */}
                  <h2 className="mt-2 text-xl font-semibold line-clamp-2">
                    <Link
                      href={`/site/${subdomain}/blog/${post.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p className="mt-3 text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}

                  {/* Date */}
                  {post.published_at && (
                    <time
                      dateTime={post.published_at}
                      className="mt-4 block text-sm text-muted-foreground"
                    >
                      {formatPublicDate(post.published_at, localeContext.resolvedLocale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {pageNum > 1 && (
              <Link
                href={`/site/${subdomain}/blog?page=${pageNum - 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {messages.blogListing.previous}
              </Link>
            )}

            <span className="px-4 py-2">
              {messages.blogListing.pageLabel} {pageNum} {messages.blogListing.ofLabel} {totalPages}
            </span>

            {pageNum < totalPages && (
              <Link
                href={`/site/${subdomain}/blog?page=${pageNum + 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {messages.blogListing.next}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
    </TemplateSlot>
    </>
  );
}

export const revalidate = 300;
