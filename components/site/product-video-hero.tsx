'use client';

import { useState, useCallback } from 'react';
import { MediaLightbox } from './media-lightbox';
import { parseVideoMeta } from '@/lib/products/video-url';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';

interface ProductVideoHeroProps {
  videoUrl: string;
  videoCaption?: string | null;
  productId: string;
  productName: string;
}

export function ProductVideoHero({
  videoUrl,
  videoCaption,
  productId,
  productName,
}: ProductVideoHeroProps) {
  const [open, setOpen] = useState(false);
  const meta = parseVideoMeta(videoUrl);
  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);

  const handlePlay = useCallback(() => {
    if (!meta) return;
    trackEvent('product_video_play', { product_id: productId, provider: meta.provider });
    setOpen(true);
  }, [meta, productId]);

  if (!meta || meta.provider === 'external') {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm bg-background/85 border border-border/70 text-foreground hover:bg-background/95 transition-colors"
        aria-label={text('productVideoOpenAria')}
      >
        <PlayIcon />
        {text('productVideoLabel')}
      </a>
    );
  }

  return (
    <>
      <button
        onClick={handlePlay}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm bg-background/85 border border-border/70 text-foreground hover:bg-background/95 transition-colors cursor-pointer"
        aria-label={text('productVideoAria')}
      >
        <PlayIcon />
        {text('productVideoLabel')}
      </button>

      {open && (
        <MediaLightbox
          type="video"
          embedUrl={meta.embedUrl}
          title={videoCaption ?? productName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}
