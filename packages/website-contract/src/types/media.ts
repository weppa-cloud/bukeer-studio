export type LocalizedString = Record<string, string>;

export type LocalizableAlt = string | LocalizedString;

export interface MediaAssetAlt {
  es?: string;
  en?: string;
  pt?: string;
  [locale: string]: string | undefined;
}

export interface MediaAsset {
  id: string;
  accountId: string;
  websiteId: string | null;
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  alt: MediaAssetAlt;
  title: MediaAssetAlt;
  caption: MediaAssetAlt;
  entityType:
    | 'blog_post'
    | 'page'
    | 'package'
    | 'activity'
    | 'hotel'
    | 'transfer'
    | 'destination'
    | 'website'
    | 'section'
    | 'brand'
    | 'review'
    | 'gallery_item'
    | null;
  entityId: string | null;
  usageContext: 'hero' | 'gallery' | 'featured' | 'og' | 'avatar' | 'body' | null;
  aiGenerated: boolean;
  format: 'webp' | 'jpeg' | 'jpg' | 'png' | 'gif' | null;
}

function normalizeLocaleToken(locale: string): string {
  return locale.replace('_', '-').trim().toLowerCase();
}

/**
 * Resolve localized alt text with fallback chain.
 * locale full -> language -> es -> legacy string -> empty string.
 */
export function resolveAlt(alt: MediaAssetAlt | string | undefined, locale: string): string {
  if (!alt) return '';
  if (typeof alt === 'string') return alt;

  const normalized = normalizeLocaleToken(locale || 'es');
  const [language] = normalized.split('-');

  return alt[normalized] || alt[language] || alt.es || '';
}
