import type { Metadata } from 'next';

import type { WebsiteData } from '@/lib/supabase/get-website';

type WebsiteLike = Pick<WebsiteData, 'content' | 'theme'>;

function cleanIconUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return null;
}

function readThemeFaviconUrl(theme: WebsiteLike['theme']): string | null {
  const profile = theme?.profile;
  if (!profile || typeof profile !== 'object') return null;
  return cleanIconUrl((profile as { faviconUrl?: unknown }).faviconUrl);
}

export function resolveSiteFaviconUrl(website: WebsiteLike): string | null {
  const content = website.content ?? {};
  const seo = content.seo as Record<string, unknown> | undefined;

  return (
    cleanIconUrl(seo?.faviconUrl) ||
    cleanIconUrl((content as { faviconUrl?: unknown }).faviconUrl) ||
    readThemeFaviconUrl(website.theme) ||
    cleanIconUrl(content.account?.logo) ||
    cleanIconUrl(content.logo)
  );
}

export function resolveSiteAppleTouchIconUrl(website: WebsiteLike): string | null {
  const content = website.content ?? {};
  const seo = content.seo as Record<string, unknown> | undefined;

  return (
    cleanIconUrl(seo?.appleTouchIconUrl) ||
    cleanIconUrl((content as { appleTouchIconUrl?: unknown }).appleTouchIconUrl) ||
    resolveSiteFaviconUrl(website)
  );
}

export function resolveSiteIcons(website: WebsiteLike): Metadata['icons'] | undefined {
  const faviconUrl = resolveSiteFaviconUrl(website);
  if (!faviconUrl) return undefined;

  const appleTouchIconUrl = resolveSiteAppleTouchIconUrl(website);

  return {
    icon: [
      {
        url: faviconUrl,
        type: faviconUrl.endsWith('.png') ? 'image/png' : undefined,
      },
    ],
    shortcut: [{ url: faviconUrl }],
    apple: appleTouchIconUrl
      ? [
          {
            url: appleTouchIconUrl,
            sizes: '180x180',
            type: appleTouchIconUrl.endsWith('.png') ? 'image/png' : undefined,
          },
        ]
      : undefined,
  };
}
