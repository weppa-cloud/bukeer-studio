'use client';

import Image from 'next/image';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

export interface GalleryStripProps {
  images: string[];
  displayName: string;
  activeImageIndex: number;
  onSetActiveImageIndex: (index: number) => void;
  onOpenLightbox: (index: number) => void;
}

export function GalleryStrip({
  images,
  displayName,
  activeImageIndex,
  onSetActiveImageIndex,
  onOpenLightbox,
}: GalleryStripProps) {
  const detailUi = getPublicUiMessages('es-CO').productDetail;

  if (images.length <= 1) {
    return null;
  }

  return (
    <section data-testid="detail-gallery">
      <h2 className="mb-6 text-2xl font-bold">{detailUi.galleryTitle}</h2>

      <button
        type="button"
        onClick={() => onOpenLightbox(activeImageIndex)}
        className="group relative mb-4 aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl"
        aria-label={detailUi.openGalleryAria}
      >
        <Image
          src={images[activeImageIndex]}
          alt={`${displayName} - imagen ${activeImageIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
          <span className="rounded-full bg-black/50 px-4 py-2 text-sm text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            {detailUi.openFullscreenLabel}
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => {
              onSetActiveImageIndex(index);
              onOpenLightbox(index);
            }}
            className={`relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl border-2 transition-colors ${
              index === activeImageIndex ? 'border-primary' : 'border-transparent hover:border-border'
            }`}
            aria-label={`Abrir miniatura ${index + 1}`}
          >
            <Image
              src={image}
              alt={`${displayName} - miniatura ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 24vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
