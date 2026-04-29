import "./blog-typography.css";
import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getWebsiteBySubdomain,
  getBlogPostBySlug,
  getBlogPostAnyLocale,
  getBlogPostByTranslationGroup,
  getBlogPostTranslationLocales,
  normalizeBlogPublicLocale,
} from "@/lib/supabase/get-website";
import { JsonLd, generateBlogPostSchemas } from "@/lib/schema";
import { BlogDetail } from "@/components/site/blog/blog-detail";
import { TemplateSlot } from "@/components/site/themes/editorial-v1/template-slot";
import { resolveOgImage } from "@/lib/seo/og-helpers";
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from "@/lib/seo/public-metadata";
import { localeToOgLocale } from "@/lib/seo/locale-routing";
import { normalizePublicMetadataTitle } from "@/lib/seo/metadata-title";
import { getPublicUiMessages } from "@/lib/site/public-ui-messages";

interface BlogPostPageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: getPublicUiMessages(undefined).blogPost.notFoundTitle };
  }
  const localeContext = await resolvePublicMetadataLocale(
    website,
    `/blog/${slug}`,
  );
  const messages = getPublicUiMessages(localeContext.resolvedLocale);

  const post = await getBlogPostBySlug(
    website.id,
    slug,
    localeContext.resolvedLocale,
  );

  if (!post) {
    return { title: messages.blogPost.notFoundTitle };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const blogPath = `/blog/${post.slug}`;
  const localizedLocaleContext =
    blogPath === `/blog/${slug}`
      ? localeContext
      : await resolvePublicMetadataLocale(website, blogPath);
  const localizedMessages = getPublicUiMessages(
    localizedLocaleContext.resolvedLocale,
  );
  const localizedBlogPath = localizedLocaleContext.localizedPathname;
  const canonical = `${baseUrl}${localizedBlogPath}`;
  const translatedLocales = await getBlogPostTranslationLocales(
    website.id,
    post.translation_group_id ?? post.id,
    normalizeBlogPublicLocale(post.locale),
  );
  const languages = buildLocaleAwareAlternateLanguages(
    baseUrl,
    blogPath,
    localizedLocaleContext,
    {
      translatedLocales,
    },
  );
  const siteName =
    website.content?.account?.name || website.content?.siteName || subdomain;
  const title = normalizePublicMetadataTitle(
    post.seo_title || post.title || localizedMessages.blogPost.notFoundTitle,
    siteName,
  );
  const description = (
    post.seo_description ||
    post.excerpt ||
    post.content?.replace(/<[^>]*>/g, " ")
  )
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

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
      type: "article",
      locale: localeToOgLocale(localizedLocaleContext.resolvedLocale),
      siteName,
      url: canonical,
      publishedTime: post.published_at || undefined,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: "summary_large_image",
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

  if (!website || website.status !== "published") {
    notFound();
  }

  // Resolve locale before slug lookup so we filter to the correct locale row.
  const localeContextEarly = await resolvePublicMetadataLocale(
    website,
    `/blog/${slug}`,
  );
  const resolvedLocale = localeContextEarly.resolvedLocale;
  const defaultLocale = localeContextEarly.defaultLocale ?? "es-CO";

  const post = await getBlogPostBySlug(website.id, slug, resolvedLocale);

  if (!post) {
    // Slug not found for this locale. Try finding the post in any locale,
    // then redirect to the default-locale counterpart via translation_group_id.
    const anyLocalePost = await getBlogPostAnyLocale(website.id, slug);
    if (anyLocalePost?.translation_group_id) {
      const defaultPost = await getBlogPostByTranslationGroup(
        website.id,
        anyLocalePost.translation_group_id,
        defaultLocale,
      );
      if (defaultPost) {
        redirect(`/site/${subdomain}/blog/${defaultPost.slug}`);
      }
    }
    notFound();
  }

  // If post exists but is in the wrong locale (e.g. ES slug served on /en/),
  // redirect to the correct-locale counterpart if available.
  if (post.locale !== resolvedLocale) {
    const localizedPost = await getBlogPostByTranslationGroup(
      website.id,
      post.translation_group_id ?? post.id,
      resolvedLocale,
    );
    if (localizedPost) {
      redirect(`/site/${subdomain}/blog/${localizedPost.slug}`);
    }
    // No localized version — serve the found post (fallback, will render as-is)
  }

  // Generate base URL for schema
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  // Generate JSON-LD schemas (Article, Breadcrumb, Organization)
  const schemas = generateBlogPostSchemas(
    post,
    website,
    baseUrl,
    resolvedLocale,
  );

  // Related posts — same locale, same category first, fallback to recent.
  const { getBlogPosts } = await import("@/lib/supabase/get-website");
  const categorySlug = post.category?.slug ?? undefined;
  const [sameCategory, recent] = await Promise.all([
    categorySlug
      ? getBlogPosts(website.id, {
          limit: 4,
          categorySlug,
          locale: resolvedLocale,
        })
      : Promise.resolve({ posts: [], total: 0 }),
    getBlogPosts(website.id, { limit: 4, locale: resolvedLocale }),
  ]);
  const relatedPool = [
    ...sameCategory.posts.filter((p) => p.id !== post.id),
    ...recent.posts.filter((p) => p.id !== post.id),
  ];
  const seen = new Set<string>();
  const related = relatedPool
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .slice(0, 3);
  const headerList = await headers();
  const isCustomDomain = Boolean(headerList.get("x-custom-domain"));
  const websiteForRender = {
    ...website,
    resolvedLocale,
    defaultLocale,
    isCustomDomain,
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />
      <TemplateSlot
        name="blog-detail"
        website={websiteForRender}
        payload={{
          subdomain,
          locale: resolvedLocale,
          post,
          related,
        }}
      >
        <BlogDetail
          subdomain={subdomain}
          locale={resolvedLocale}
          post={post}
          isCustomDomain={isCustomDomain}
        />
      </TemplateSlot>
    </>
  );
}

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const { getAllWebsiteSubdomains, getAllBlogSlugs, getWebsiteBySubdomain } =
    await import("@/lib/supabase/get-website");
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
