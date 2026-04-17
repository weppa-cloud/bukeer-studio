import type { WebsiteData } from '@bukeer/website-contract';

/**
 * og:image fallback cascade for public site pages.
 *
 * Priority:
 *   1. Item-specific image (product, blog post, destination)
 *   2. Hero section backgroundImage (from website_sections)
 *   3. Website SEO image (content.seo.image — if ever set)
 *   4. Website logo (content.logo)
 *   5. Account logo (content.account.logo)
 *   6. undefined (omit tag entirely)
 */
export function resolveOgImage(
  website: WebsiteData,
  itemImage?: string | null
): string | undefined {
  if (itemImage) return itemImage;

  // Find hero section backgroundImage from sections array
  const heroSection = website.sections?.find((s) => s.section_type === 'hero');
  const heroContent = heroSection?.content as { backgroundImage?: string } | undefined;
  if (heroContent?.backgroundImage) return heroContent.backgroundImage;

  // Fallback to SEO image if configured
  const seo = website.content?.seo as { image?: string } | undefined;
  if (seo?.image) return seo.image;

  // Fallback to website logo
  if (website.content?.logo) return website.content.logo;

  // Fallback to account logo
  if (website.content?.account?.logo) return website.content.account.logo;

  return undefined;
}
