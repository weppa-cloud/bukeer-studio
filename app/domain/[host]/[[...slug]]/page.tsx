import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { StaticPage } from '@/components/pages/static-page';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { GoogleTagManager, GoogleTagManagerBody } from '@/components/analytics/google-tag-manager';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getPageBySlug } from '@/lib/supabase/get-pages';
import { getBlogPosts, getBlogPostBySlug, getBlogCategories } from '@/lib/supabase/get-website';
import { JsonLd, generateBlogListingSchemas, generateBlogPostSchemas } from '@/lib/schema';
import { SafeHtml } from '@/lib/sanitize';
import { getDefaultLegalContent } from '@/lib/legal-defaults';
import Image from 'next/image';

interface CustomDomainPageProps {
  params: Promise<{ host: string; slug?: string[] }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}

async function getWebsiteByCustomDomain(customDomain: string): Promise<WebsiteData | null> {
  // Normalize: lowercase + strip trailing dot (defense-in-depth, middleware also normalizes)
  const normalizedHost = customDomain.toLowerCase().replace(/\.$/, '');

  const { data: website, error } = await supabase
    .from('websites')
    .select(`
      id,
      subdomain,
      custom_domain,
      status,
      theme,
      content,
      analytics,
      template:website_templates (
        id,
        name,
        available_sections
      )
    `)
    .eq('custom_domain', normalizedHost)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();

  if (error || !website) {
    return null;
  }

  return website as unknown as WebsiteData;
}

export default async function CustomDomainPage({ params, searchParams }: CustomDomainPageProps) {
  const { host, slug } = await params;
  const decodedHost = decodeURIComponent(host);
  const normalizedHost = decodedHost.toLowerCase().replace(/\.$/, '');

  // Look up website by custom domain
  const website = await getWebsiteByCustomDomain(normalizedHost);

  // Website not found for this custom domain
  if (!website) {
    redirect('https://bukeer.com/domain-not-found');
  }

  // Verify custom domain matches (gate: reject if DB domain doesn't match request)
  const websiteDomain = (website.custom_domain || '').toLowerCase().replace(/\.$/, '');
  if (!websiteDomain || websiteDomain !== normalizedHost) {
    redirect('https://bukeer.com/domain-not-verified');
  }

  // Parse the slug path
  const slugPath = slug?.join('/') || '';

  // Generate base URL for custom domain
  const baseUrl = `https://${normalizedHost}`;

  // Handle blog listing
  if (slugPath === 'blog') {
    const { category, page } = await searchParams;
    const pageNum = parseInt(page || '1', 10);
    const limit = 9;
    const offset = (pageNum - 1) * limit;

    const [postsData, categories] = await Promise.all([
      getBlogPosts(website.id, { limit, offset, categorySlug: category }),
      getBlogCategories(website.id),
    ]);

    const { posts, total } = postsData;
    const totalPages = Math.ceil(total / limit);

    const schemas = generateBlogListingSchemas(posts, website, baseUrl);

    return (
      <M3ThemeProvider initialTheme={website.theme}>
        <GoogleTagManager analytics={website.analytics} />
        <div className="min-h-screen flex flex-col">
          <GoogleTagManagerBody analytics={website.analytics} />
          <SiteHeader website={website} isCustomDomain={true} />
          <main className="flex-1">
            <JsonLd data={schemas} />
            <div className="section-padding">
              <div className="container">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-bold mb-4">Blog</h1>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Descubre las últimas novedades, guías de viaje y consejos para tu próxima aventura
                  </p>
                </div>

                {categories.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-12">
                    <Link
                      href="/blog"
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        !category
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Todos
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/blog?category=${cat.slug}`}
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

                {posts.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground text-lg">
                      No hay publicaciones disponibles
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                      <article
                        key={post.id}
                        className="group rounded-lg overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-shadow"
                      >
                        <Link href={`/blog/${post.slug}`}>
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
                                <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="p-6">
                          {post.category && (
                            <Link
                              href={`/blog?category=${post.category.slug}`}
                              className="text-xs font-medium text-primary uppercase tracking-wider"
                            >
                              {post.category.name}
                            </Link>
                          )}
                          <h2 className="mt-2 text-xl font-semibold line-clamp-2">
                            <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                              {post.title}
                            </Link>
                          </h2>
                          {post.excerpt && (
                            <p className="mt-3 text-muted-foreground line-clamp-3">{post.excerpt}</p>
                          )}
                          {post.published_at && (
                            <time dateTime={post.published_at} className="mt-4 block text-sm text-muted-foreground">
                              {new Date(post.published_at).toLocaleDateString('es-ES', {
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

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-12">
                    {pageNum > 1 && (
                      <Link
                        href={`/blog?page=${pageNum - 1}${category ? `&category=${category}` : ''}`}
                        className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Anterior
                      </Link>
                    )}
                    <span className="px-4 py-2">
                      Página {pageNum} de {totalPages}
                    </span>
                    {pageNum < totalPages && (
                      <Link
                        href={`/blog?page=${pageNum + 1}${category ? `&category=${category}` : ''}`}
                        className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Siguiente
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
          <SiteFooter website={website} isCustomDomain={true} />
        </div>
      </M3ThemeProvider>
    );
  }

  // Handle individual blog posts
  if (slugPath.startsWith('blog/')) {
    const postSlug = slugPath.replace('blog/', '');
    const post = await getBlogPostBySlug(website.id, postSlug);

    if (!post) {
      notFound();
    }

    const schemas = generateBlogPostSchemas(post, website, baseUrl);

    return (
      <M3ThemeProvider initialTheme={website.theme}>
        <GoogleTagManager analytics={website.analytics} />
        <div className="min-h-screen flex flex-col">
          <GoogleTagManagerBody analytics={website.analytics} />
          <SiteHeader website={website} isCustomDomain={true} />
          <main className="flex-1">
            <JsonLd data={schemas} />
            <article className="section-padding">
              <div className="container max-w-4xl">
                <nav className="mb-8">
                  <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                    <li>
                      <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
                    </li>
                    <li>/</li>
                    <li>
                      <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
                    </li>
                    <li>/</li>
                    <li className="text-foreground truncate max-w-[200px]">{post.title}</li>
                  </ol>
                </nav>

                <header className="mb-8">
                  {post.category && (
                    <Link
                      href={`/blog?category=${post.category.slug}`}
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4"
                    >
                      {post.category.name}
                    </Link>
                  )}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                    {post.title}
                  </h1>
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

                <SafeHtml
                  content={post.content}
                  className="prose prose-lg max-w-none dark:prose-invert
                    prose-headings:font-bold
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-lg
                    prose-blockquote:border-l-primary
                  "
                />

                <div className="mt-12 pt-8 border-t">
                  <div className="flex justify-between items-center">
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Volver al blog
                    </Link>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Compartir:</span>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${baseUrl}/blog/${post.slug}`)}`}
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
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/blog/${post.slug}`)}`}
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
                        href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - ${baseUrl}/blog/${post.slug}`)}`}
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
          </main>
          <SiteFooter website={website} isCustomDomain={true} />
        </div>
      </M3ThemeProvider>
    );
  }

  // Handle legal pages (terms, privacy, cancellation)
  const legalSlugs: Record<string, { field: 'terms_conditions' | 'privacy_policy' | 'cancellation_policy'; title: string }> = {
    'terms': { field: 'terms_conditions', title: 'Terminos y Condiciones' },
    'privacy': { field: 'privacy_policy', title: 'Politica de Privacidad' },
    'cancellation': { field: 'cancellation_policy', title: 'Politica de Cancelacion' },
  };

  const legalMatch = legalSlugs[slugPath];
  if (legalMatch) {
    const siteName = website.content.account?.name || website.content.siteName;
    const customContent = website.content.account?.legal?.[legalMatch.field];

    // If content is a URL, redirect to it
    if (customContent?.startsWith('http://') || customContent?.startsWith('https://')) {
      redirect(customContent);
    }

    // Use custom content if available, otherwise show default placeholder
    const legalType = slugPath as 'terms' | 'privacy' | 'cancellation';
    const legalContent = customContent || getDefaultLegalContent(legalType, siteName);

    return (
      <M3ThemeProvider initialTheme={website.theme}>
        <GoogleTagManager analytics={website.analytics} />
        <div className="min-h-screen flex flex-col">
          <GoogleTagManagerBody analytics={website.analytics} />
          <SiteHeader website={website} isCustomDomain={true} />
          <main className="flex-1">
            <article className="section-padding">
              <div className="container max-w-4xl">
                <nav className="mb-8">
                  <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                    <li>
                      <Link href="/" className="hover:text-foreground transition-colors">
                        Inicio
                      </Link>
                    </li>
                    <li>/</li>
                    <li className="text-foreground">{legalMatch.title}</li>
                  </ol>
                </nav>

                <header className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold">{legalMatch.title}</h1>
                  <p className="mt-2 text-muted-foreground">{siteName}</p>
                </header>

                <SafeHtml
                  content={legalContent}
                  className="prose prose-lg max-w-none dark:prose-invert
                    prose-headings:font-bold
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  "
                />

                <div className="mt-12 pt-8 border-t">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </article>
          </main>
          <SiteFooter website={website} isCustomDomain={true} />
        </div>
      </M3ThemeProvider>
    );
  }

  // Get the page content (non-blog routes)
  const page = await getPageBySlug(website.subdomain, slugPath || 'home');

  if (!page && slugPath) {
    notFound();
  }

  return (
    <M3ThemeProvider initialTheme={website.theme}>
      {/* Google Tag Manager and Analytics Scripts */}
      <GoogleTagManager analytics={website.analytics} />

      <div className="min-h-screen flex flex-col">
        {/* GTM NoScript fallback */}
        <GoogleTagManagerBody analytics={website.analytics} />

        <SiteHeader website={website} isCustomDomain={true} />
        <main className="flex-1">
          {page && <StaticPage website={website} page={page} />}
        </main>
        <SiteFooter website={website} isCustomDomain={true} />
      </div>
    </M3ThemeProvider>
  );
}

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

// Generate metadata
export async function generateMetadata({ params, searchParams }: CustomDomainPageProps) {
  const { host, slug } = await params;
  const decodedHost = decodeURIComponent(host);
  const normalizedHost = decodedHost.toLowerCase().replace(/\.$/, '');

  const website = await getWebsiteByCustomDomain(normalizedHost);

  if (!website) {
    return { title: 'Sitio no encontrado' };
  }

  const slugPath = slug?.join('/') || '';

  // Legal page metadata
  const legalMeta: Record<string, { title: string; description: string }> = {
    'terms': { title: 'Terminos y Condiciones', description: `Terminos y condiciones de ${website.content.account?.name || website.content.siteName}` },
    'privacy': { title: 'Politica de Privacidad', description: `Politica de privacidad de ${website.content.account?.name || website.content.siteName}` },
    'cancellation': { title: 'Politica de Cancelacion', description: `Politica de cancelacion de ${website.content.account?.name || website.content.siteName}` },
  };

  if (legalMeta[slugPath]) {
    return {
      title: legalMeta[slugPath].title,
      description: legalMeta[slugPath].description,
      robots: { index: false, follow: false },
    };
  }

  // Blog listing metadata
  if (slugPath === 'blog') {
    return {
      title: 'Blog',
      description: `Lee las últimas publicaciones de ${website.content.siteName}`,
    };
  }

  // Blog post metadata
  if (slugPath.startsWith('blog/')) {
    const postSlug = slugPath.replace('blog/', '');
    const post = await getBlogPostBySlug(website.id, postSlug);

    if (post) {
      return {
        title: post.seo_title || post.title,
        description: post.seo_description || post.excerpt,
        keywords: post.seo_keywords ?? undefined,
        openGraph: {
          title: post.seo_title || post.title,
          description: post.seo_description || post.excerpt,
          type: 'article',
          publishedTime: post.published_at || undefined,
          images: post.featured_image ? [{ url: post.featured_image }] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title: post.seo_title || post.title,
          description: post.seo_description || post.excerpt,
          images: post.featured_image ? [post.featured_image] : undefined,
        },
      };
    }
  }

  // Default metadata with og:image
  const title = website.content.seo?.title || website.content.siteName;
  const description = website.content.seo?.description || website.content.tagline;
  const siteName = website.content.siteName;
  const ogImage = website.content.seo?.image || website.content.account?.logo;
  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    openGraph: {
      title,
      description,
      siteName,
      type: 'website',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
