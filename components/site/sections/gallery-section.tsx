'use client';

import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface GallerySectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <svg
        className="w-12 h-12 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

export function GallerySection({ section }: GallerySectionProps) {
  const content = section.content || {};
  const title = content.title || 'Galería';
  const images: GalleryImage[] = content.images || [];
  const variant = section.variant || 'grid';

  if (variant === 'carousel') {
    return <GalleryCarousel title={title} images={images} />;
  }

  if (variant === 'masonry') {
    return <GalleryMasonry title={title} images={images} />;
  }

  // Default: grid
  return <GalleryGrid title={title} images={images} />;
}

function GalleryGrid({ title, images }: { title: string; images: GalleryImage[] }) {
  return (
    <section className="section-padding">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{title}</h2>

        {images.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => (
              <div
                key={index}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
              >
                {image.url ? (
                  <>
                    <Image
                      src={image.url}
                      alt={image.alt || `Imagen ${index + 1}`}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {image.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm">{image.caption}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <ImagePlaceholder />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-muted flex items-center justify-center"
              >
                <svg
                  className="w-12 h-12 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryCarousel({ title, images }: { title: string; images: GalleryImage[] }) {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{title}</h2>

        <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
          <div className="flex gap-6" style={{ width: 'max-content' }}>
            {images.length > 0 ? (
              images.map((image, index) => (
                <div
                  key={index}
                  className="snap-center shrink-0 w-[350px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg"
                >
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.alt || `Imagen ${index + 1}`}
                      width={350}
                      height={467}
                      loading="lazy"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <ImagePlaceholder />
                  )}
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="snap-center shrink-0 w-[350px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg"
                >
                  <ImagePlaceholder />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function GalleryMasonry({ title, images }: { title: string; images: GalleryImage[] }) {
  return (
    <section className="section-padding">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{title}</h2>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.length > 0 ? (
            images.map((image, index) => (
              <div
                key={index}
                className="break-inside-avoid rounded-xl overflow-hidden shadow-md"
              >
                {image.url ? (
                  <Image
                    src={image.url}
                    alt={image.alt || `Imagen ${index + 1}`}
                    width={400}
                    height={300}
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full bg-muted flex items-center justify-center" style={{ height: 250 }}>
                    <ImagePlaceholder />
                  </div>
                )}
              </div>
            ))
          ) : (
            [200, 300, 250, 280, 220, 320].map((h, index) => (
              <div
                key={index}
                className="break-inside-avoid rounded-xl overflow-hidden shadow-md"
                style={{ height: h }}
              >
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImagePlaceholder />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
