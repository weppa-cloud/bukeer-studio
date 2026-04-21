import './blog-typography.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getWebsiteBySubdomain,
  getBlogPostBySlug,
} from '@/lib/supabase/get-website';
import { JsonLd, generateBlogPostSchemas } from '@/lib/schema';
import { BlogDetail } from '@/components/site/blog/blog-detail';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

interface BlogPostPageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: getPublicUiMessages('es-CO').blogPost.notFoundTitle };
  }

  const post = await getBlogPostBySlug(website.id, slug);

  if (!post) {
    return { title: getPublicUiMessages('es-CO').blogPost.notFoundTitle };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const blogPath = `/blog/${post.slug}`;
  const localeContext = await resolvePublicMetadataLocale(website, blogPath);
  const messages = getPublicUiMessages(localeContext.resolvedLocale);
  const localizedBlogPath = localeContext.localizedPathname;
  const canonical = `${baseUrl}${localizedBlogPath}`;
  const languages = buildLocaleAwareAlternateLanguages(baseUrl, blogPath, localeContext);
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const title = post.seo_title || post.title || messages.blogPost.notFoundTitle;
  const description = post.seo_description || post.excerpt;

  const ogImage = resolveOgImage(website, post.featured_image);
  const metadata: Metadata = {
    title,
    description,
    keywords: post.seo_keywords ?? undefined,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: localeToOgLocale(localeContext.resolvedLocale),
      siteName,
      url: canonical,
      publishedTime: post.published_at || undefined,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };

  // F2: Blog post noindex support
  if ((post as unknown as { robots_noindex?: boolean }).robots_noindex) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const post = await getBlogPostBySlug(website.id, slug);

  if (!post) {
    notFound();
  }

  // Generate base URL for schema
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, `/blog/${post.slug}`);

  // Generate JSON-LD schemas (Article, Breadcrumb, Organization)
  const schemas = generateBlogPostSchemas(post, website, baseUrl, localeContext.resolvedLocale);

  // Related posts — best-effort: same category first, fallback to recent.
  const { getBlogPosts } = await import('@/lib/supabase/get-website');
  const categorySlug = post.category?.slug ?? undefined;
  const [sameCategory, recent] = await Promise.all([
    categorySlug
      ? getBlogPosts(website.id, { limit: 4, categorySlug })
      : Promise.resolve({ posts: [], total: 0 }),
    getBlogPosts(website.id, { limit: 4 }),
  ]);
  const relatedPool = [
    ...sameCategory.posts.filter((p) => p.id !== post.id),
    ...recent.posts.filter((p) => p.id !== post.id),
  ];
  const seen = new Set<string>();
  const related = relatedPool.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, 3);

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />
      <TemplateSlot
        name="blog-detail"
        website={website}
        payload={{
          subdomain,
          locale: localeContext.resolvedLocale,
          post,
          related,
        }}
      >
        <BlogDetail
          subdomain={subdomain}
          locale={localeContext.resolvedLocale}
          post={post}
        />
      </TemplateSlot>
    </>
  );
}

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const { getAllWebsiteSubdomains, getAllBlogSlugs, getWebsiteBySubdomain } = await import('@/lib/supabase/get-website');
  const subdomains = await getAllWebsiteSubdomains();

  const paths = [];

  for (const subdomain of subdomains) {
    const website = await getWebsiteBySubdomain(subdomain);
    if (website) {
      const slugs = await getAllBlogSlugs(website.id);
      for (const slug of slugs) {
        paths.push({ subdomain, slug });
      }
    }
  }

  return paths;
}

export const revalidate = 300;
