import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getWebsiteBySubdomain,
  getBlogPostBySlug,
} from '@/lib/supabase/get-website';
import { JsonLd, generateBlogPostSchemas } from '@/lib/schema';
import { SafeHtml } from '@/lib/sanitize';
import { generateHreflangLinks } from '@/lib/seo/hreflang';
import { resolveOgImage } from '@/lib/seo/og-helpers';

interface BlogPostPageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Post no encontrado' };
  }

  const post = await getBlogPostBySlug(website.id, slug);

  if (!post) {
    return { title: 'Post no encontrado' };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const blogPath = `/blog/${post.slug}`;
  const hreflangLinks = generateHreflangLinks(baseUrl, blogPath);
  const languages: Record<string, string> = {};
  for (const link of hreflangLinks) {
    languages[link.hreflang] = link.href;
  }
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;

  const ogImage = resolveOgImage(website, post.featured_image);
  const metadata: Metadata = {
    title,
    description,
    keywords: post.seo_keywords ?? undefined,
    alternates: {
      canonical: `${baseUrl}${blogPath}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'es_ES',
      siteName,
      url: `${baseUrl}${blogPath}`,
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

  // Generate JSON-LD schemas (Article, Breadcrumb, Organization)
  const schemas = generateBlogPostSchemas(post, website, baseUrl);

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />

      <article className="section-padding">
      <div className="container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href={`/site/${subdomain}`} className="hover:text-foreground transition-colors">
                Inicio
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`/site/${subdomain}/blog`} className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground truncate max-w-[200px]">{post.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {/* Category */}
          {post.category && (
            <Link
              href={`/site/${subdomain}/blog?category=${post.category.slug}`}
              className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4"
            >
              {post.category.name}
            </Link>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            {post.title}
          </h1>

          {/* Meta */}
          {post.published_at && (
            <div className="mt-6 flex items-center gap-4 text-muted-foreground">
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8">
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        {/* Content - Sanitized to prevent XSS */}
        <SafeHtml
          content={post.content}
          fallbackAlt={post.title}
          className="prose prose-lg max-w-none dark:prose-invert
            prose-headings:font-bold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-lg
            prose-blockquote:border-l-primary
          "
        />

        {/* Share / Navigation */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex justify-between items-center">
            <Link
              href={`/site/${subdomain}/blog`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al blog
            </Link>

            {/* Share buttons */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Compartir:</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Compartir en Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Compartir en Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Compartir en WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
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
