import "./blog-typography.css";
import { Metadata } from "next";
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
import { getPlannerByUserId } from "@/lib/supabase/get-planners";
import { BlogDetail } from "@/components/site/blog/blog-detail";
import { resolveOgImage } from "@/lib/seo/og-helpers";
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from "@/lib/seo/public-metadata";
import {
  buildPublicLocalizedPath,
  localeToOgLocale,
} from "@/lib/seo/locale-routing";
import { isEnBlogQualityBlocked } from "@/lib/seo/en-quality-gate";
import { normalizePublicMetadataTitle } from "@/lib/seo/metadata-title";
import { getPublicUiMessages } from "@/lib/site/public-ui-messages";
import { inferIsCustomDomainWebsite } from "@/lib/utils/base-path";

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

  const post = await getBlogPostBySlug(
    website.id,
    slug,
    localeContext.resolvedLocale,
  );

  if (!post) {
    await redirectLocaleMismatchedBlogSlug({
      websiteId: website.id,
      slug,
      resolvedLocale: localeContext.resolvedLocale,
      defaultLocale: localeContext.defaultLocale ?? "es-CO",
    });
    notFound();
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
  const title = post.seo_title
    ? post.seo_title
    : normalizePublicMetadataTitle(
        post.title || localizedMessages.blogPost.notFoundTitle,
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
  if (
    (post as unknown as { robots_noindex?: boolean }).robots_noindex ||
    isEnBlogQualityBlocked(localizedLocaleContext.resolvedLocale, post.slug)
  ) {
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
    await redirectLocaleMismatchedBlogSlug({
      websiteId: website.id,
      slug,
      resolvedLocale,
      defaultLocale,
    });
    // A locale-prefixed blog URL is only valid when that locale has a
    // published Studio post. Falling back to another locale creates soft-404
    // surfaces for crawlers, especially `/en/blog/*` rows hidden by the EN
    // quality gate.
    notFound();
  }

  if (post.slug && post.slug !== slug) {
    redirect(
      buildPublicLocalizedPath(`/blog/${post.slug}`, resolvedLocale, defaultLocale),
    );
  }

  // If post exists but is in the wrong locale (e.g. ES slug served on /en/),
  // redirect to the correct-locale counterpart if available.
  const postLocale = normalizeBlogPublicLocale(post.locale);
  const resolvedBlogLocale = normalizeBlogPublicLocale(resolvedLocale);
  if (postLocale && resolvedBlogLocale && postLocale !== resolvedBlogLocale) {
    const localizedPost = await getBlogPostByTranslationGroup(
      website.id,
      post.translation_group_id ?? post.id,
      resolvedLocale,
    );
    if (localizedPost) {
      redirect(
        buildPublicLocalizedPath(
          `/blog/${localizedPost.slug}`,
          resolvedLocale,
          defaultLocale,
        ),
      );
    }
    // No localized version — serve the found post (fallback, will render as-is)
  }

  // Generate base URL for schema
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  // Fetch travel planner when post has a created_by reference
  const planner = post.created_by
    ? await getPlannerByUserId(post.created_by)
    : null;

  // Generate JSON-LD schemas (Article, Breadcrumb, Organization)
  const schemas = generateBlogPostSchemas(
    post,
    website,
    baseUrl,
    resolvedLocale,
    planner,
  );

  const isCustomDomain = inferIsCustomDomainWebsite(website);

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />
      <BlogDetail
        subdomain={subdomain}
        locale={resolvedLocale}
        post={post}
        isCustomDomain={isCustomDomain}
      />
    </>
  );
}

async function redirectLocaleMismatchedBlogSlug({
  websiteId,
  slug,
  resolvedLocale,
  defaultLocale,
}: {
  websiteId: string;
  slug: string;
  resolvedLocale: string;
  defaultLocale: string;
}) {
  const resolvedBlogLocale = normalizeBlogPublicLocale(resolvedLocale);
  const defaultBlogLocale = normalizeBlogPublicLocale(defaultLocale);
  if (!resolvedBlogLocale || resolvedBlogLocale !== defaultBlogLocale) return;

  const postInAnotherLocale = await getBlogPostAnyLocale(websiteId, slug);
  const postLocale = normalizeBlogPublicLocale(postInAnotherLocale?.locale);
  if (
    !postInAnotherLocale ||
    !postLocale ||
    postLocale === resolvedBlogLocale
  ) {
    return;
  }

  redirect(
    buildPublicLocalizedPath(
      `/blog/${postInAnotherLocale.slug}`,
      postLocale,
      defaultLocale,
    ),
  );
}

// Generate static paths for all blog posts
export async function generateStaticParams() {
  if (process.env.BUILD_SKIP_BLOG_STATIC_PARAMS === "1") {
    return [];
  }

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
