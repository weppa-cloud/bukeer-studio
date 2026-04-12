import type { WebsiteData } from '@bukeer/website-contract';

/**
 * og:image fallback cascade for public site pages.
 *
 * Priority: item-specific image → hero background → website logo → undefined
 *
 * Note: `website.content` in the DB often contains dynamic fields (hero, header)
 * not declared in the WebsiteContent interface, so we cast through unknown.
 */
export function resolveOgImage(
  website: WebsiteData,
  itemImage?: string | null
): string | undefined {
  const content = website.content as unknown as {
    hero?: { backgroundImage?: string };
    header?: { logo?: string };
  } | undefined;

  return (
    itemImage ||
    content?.hero?.backgroundImage ||
    content?.header?.logo ||
    undefined
  ) ?? undefined;
}
