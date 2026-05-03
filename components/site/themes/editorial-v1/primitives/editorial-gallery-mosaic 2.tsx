'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

interface EditorialGalleryMosaicProps {
  images: string[];
  displayName: string;
  title?: string;
  sectionTestId?: string;
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  onOpenLightbox: () => void;
  emptyMessage?: string | null;
}

export function EditorialGalleryMosaic({
  images,
  displayName,
  title = 'Galería',
  sectionTestId,
  activeImageIndex,
  onSelectImage,
  onOpenLightbox,
  emptyMessage = null,
}: EditorialGalleryMosaicProps) {
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const galleryThumbs = useMemo(() => {
    const entries = images.map((src, index) => ({ src, index }));
    const withoutActive = entries.filter((entry) => entry.index !== activeImageIndex);
    const seed = withoutActive.length > 0 ? withoutActive : entries;
    return seed.slice(0, 4);
  }, [images, activeImageIndex]);

  const galleryTiles = useMemo(() => {
    if (images.length === 0) return [];
    const active = images[activeImageIndex] || images[0];
    const rest = images.filter((_, index) => index !== activeImageIndex);
    return [active, ...rest].slice(0, 5);
  }, [images, activeImageIndex]);

  if (images.length === 0 && !emptyMessage) return null;

  const markFailed = (src: string) => {
    if (!src || failedImages[src]) return;
    setFailedImages((prev) => ({ ...prev, [src]: true }));
  };

  const isFailed = (src: string) => Boolean(failedImages[src]);

  return (
    <section data-testid={sectionTestId} className="border-none pt-0">
      <h2 className="mb-5 text-2xl font-bold">{title}</h2>
      {images.length > 0 ? (
        images.length >= 5 ? (
          <div className="activity-gallery-grid">
            {galleryTiles.map((src, tileIndex) => (
              <button
                key={`${src}-${tileIndex}`}
                type="button"
                className={`activity-gallery-tile ${tileIndex === 0 ? 'activity-gallery-tile-main' : ''}`}
                onClick={() => {
                  const clickedIndex = images.findIndex((image) => image === src);
                  onSelectImage(clickedIndex >= 0 ? clickedIndex : 0);
                  onOpenLightbox();
                }}
              >
                <Image
                  src={src}
                  alt={`${displayName} ${tileIndex + 1}`}
                  fill
                  onError={() => markFailed(src)}
                  className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
                {isFailed(src) ? (
                  <div className="absolute inset-0 grid place-items-center bg-[var(--c-surface)] text-xs text-[var(--c-muted)]">
                    Foto no disponible
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="group relative aspect-[16/10] overflow-hidden rounded-2xl sm:col-span-2"
              onClick={() => {
                onSelectImage(activeImageIndex);
                onOpenLightbox();
              }}
            >
              <Image
                src={images[activeImageIndex] || images[0]}
                alt={displayName}
                fill
                onError={() => markFailed(images[activeImageIndex] || images[0])}
                className="object-cover transition-transform group-hover:scale-105"
              />
              {isFailed(images[activeImageIndex] || images[0]) ? (
                <div className="absolute inset-0 grid place-items-center bg-[var(--c-surface)] text-xs text-[var(--c-muted)]">
                  Foto no disponible
                </div>
              ) : null}
            </button>
            {galleryThumbs.map(({ src, index }) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[var(--c-line)]"
                onClick={() => {
                  onSelectImage(index);
                  onOpenLightbox();
                }}
              >
                <Image
                  src={src}
                  alt={`${displayName} ${index + 1}`}
                  fill
                  onError={() => markFailed(src)}
                  className="object-cover"
                />
                {isFailed(src) ? (
                  <div className="absolute inset-0 grid place-items-center bg-[var(--c-surface)] text-xs text-[var(--c-muted)]">
                    Foto no disponible
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-6 text-sm text-[var(--c-muted)]">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
