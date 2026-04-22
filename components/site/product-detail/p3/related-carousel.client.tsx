'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

export interface RelatedCarouselItem {
  id: string;
  href: string;
  title: string;
  location?: string | null;
  image?: string | null;
  priceLabel?: string | null;
}

export interface RelatedCarouselProps {
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  items: RelatedCarouselItem[];
  variant?: 'with-panel' | 'cards-carousel';
  showPrice?: boolean;
}

export function RelatedCarousel({
  title,
  viewAllHref,
  viewAllLabel,
  items,
  variant = 'with-panel',
  showPrice = true,
}: RelatedCarouselProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;
  const resolvedTitle = title ?? detailUi.relatedTitle;
  const resolvedViewAllLabel = viewAllLabel ?? detailUi.viewAllLabel;
  const slides = useMemo(() => items.filter((item) => item.id.trim().length > 0), [items]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (slides.length === 0) return null;

  if (variant === 'cards-carousel') {
    const orderedSlides = [...slides.slice(activeIndex), ...slides.slice(0, activeIndex)];
    const visibleSlides = orderedSlides.slice(0, Math.min(6, orderedSlides.length));

    return (
      <section data-testid="detail-related-carousel" className="py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">{resolvedTitle}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveIndex((index) => (index - 1 + slides.length) % slides.length)}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                aria-label={detailUi.relatedPrevAria}
              >
                {detailUi.relatedPrevButton}
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((index) => (index + 1) % slides.length)}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                aria-label={detailUi.relatedNextAria}
              >
                {detailUi.relatedNextButton}
              </button>
              {viewAllHref ? (
                <Link href={viewAllHref} className="ml-2 font-mono text-xs uppercase tracking-wider text-primary hover:underline">
                  {resolvedViewAllLabel}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label={detailUi.relatedListAria}>
            {visibleSlides.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                role="listitem"
                className={[
                  'group block overflow-hidden rounded-2xl border transition-colors',
                  item.id === slides[activeIndex]?.id ? 'border-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                  {item.location ? <p className="text-xs text-muted-foreground">{item.location}</p> : null}
                  {showPrice && item.priceLabel ? <p className="text-sm font-semibold text-primary">{item.priceLabel}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const current = slides[activeIndex];

  return (
    <section data-testid="detail-related-carousel" className="py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{resolvedTitle}</h2>
          {viewAllHref ? (
            <Link href={viewAllHref} className="font-mono text-xs uppercase tracking-wider text-primary hover:underline">
              {resolvedViewAllLabel}
            </Link>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_3fr]">
          <aside className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{detailUi.relatedEyebrow}</p>
            <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
              {`Mostrando ${activeIndex + 1} de ${slides.length}: ${current.title}`}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveIndex((index) => (index - 1 + slides.length) % slides.length)}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                aria-label={detailUi.relatedPrevAria}
              >
                {detailUi.relatedPrevButton}
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((index) => (index + 1) % slides.length)}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                aria-label={detailUi.relatedNextAria}
              >
                {detailUi.relatedNextButton}
              </button>
            </div>
          </aside>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label={detailUi.relatedListAria}>
            {slides.map((item, index) => (
              <Link
                key={item.id}
                href={item.href}
                role="listitem"
                onFocus={() => setActiveIndex(index)}
                className={[
                  'group block overflow-hidden rounded-2xl border transition-colors',
                  index === activeIndex ? 'border-primary' : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                  {item.location ? <p className="text-xs text-muted-foreground">{item.location}</p> : null}
                  {showPrice && item.priceLabel ? <p className="text-sm font-semibold text-primary">{item.priceLabel}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
