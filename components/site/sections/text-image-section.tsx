'use client';

import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';

interface TextImageSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function TextImageSection({ section }: TextImageSectionProps) {
  const content = (section.content as {
    title?: string;
    text?: string;
    headline?: string;
    body?: string;
    eyebrow?: string;
    image?: string;
    imagePosition?: string;
    ctaText?: string;
    ctaUrl?: string;
  } | null) || {};

  const title = content.title || content.headline || '';
  const text = content.text || content.body || '';
  const eyebrow = content.eyebrow;
  const image = content.image || '';
  const imagePosition = content.imagePosition || 'right';
  const ctaText = content.ctaText;
  const ctaUrl = content.ctaUrl;

  const isImageRight = imagePosition === 'right';

  return (
    <section className="section-padding">
      <div className="container">
        <div className={`flex flex-col ${isImageRight ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 md:gap-12 items-center`}>
          <BlurFade delay={0.05} direction={isImageRight ? 'right' : 'left'} duration={0.45} className="flex-1 w-full">
            <div className="space-y-5">
              {eyebrow && (
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[var(--accent)]">
                  {eyebrow}
                </span>
              )}
              {title && (
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--text-heading)]">
                  {title}
                </h2>
              )}
              {text && (
                <p className="text-[var(--text-secondary)] text-base md:text-lg leading-relaxed">
                  {text}
                </p>
              )}
              {ctaText && ctaUrl && (
                <a
                  href={ctaUrl}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  {ctaText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              )}
            </div>
          </BlurFade>

          <BlurFade delay={0.15} direction={isImageRight ? 'left' : 'right'} duration={0.45} className="flex-1 w-full">
            {image ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src={image}
                  alt={title || 'Imagen'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center" aria-hidden>
                <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
