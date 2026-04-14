'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';

interface HotelsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface HotelItem {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  price?: string;
  reviewRating?: number;
  reviewCount?: number;
  badge?: string;
}

export function HotelsSection({ section, website }: HotelsSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    hotels?: HotelItem[];
  };

  const variant = section.variant || 'default';
  const title = sectionContent.title || 'Hoteles Recomendados';
  const subtitle = sectionContent.subtitle;
  const hotels = sectionContent.hotels || [];

  if (hotels.length === 0) return null;

  return (
    <section
      className="section-padding"
      style={{
        backgroundColor: variant === 'showcase'
          ? 'color-mix(in srgb, var(--bg-card) 20%, var(--bg))'
          : 'color-mix(in srgb, var(--bg-card) 18%, var(--bg))',
      }}
    >
      <div className="container">
        <SectionHeading title={title} subtitle={subtitle} />

        <MobileCardCarousel
          items={hotels}
          ariaLabel="Carrusel de hoteles"
          getItemKey={(hotel) => hotel.id}
          itemWidthClassName="w-[88%] sm:w-[72%]"
          renderItem={(hotel, index) => <HotelCard hotel={hotel} index={index} subdomain={website.subdomain} />}
        />

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel, index) => (
            <HotelCard key={hotel.id} hotel={hotel} index={index} subdomain={website.subdomain} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={`/site/${website.subdomain}/hoteles`}
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-heading)',
            }}
          >
            Ver todos los hoteles
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <p className="font-mono text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
        Estancias Seleccionadas
      </p>
      <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="section-subtitle mt-4 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

function HotelCard({ hotel, index, subdomain }: { hotel: HotelItem; index: number; subdomain: string }) {
  const detailSlug = (hotel.slug || '').trim();
  const detailHref = detailSlug
    ? `/site/${subdomain}/hoteles/${encodeURIComponent(detailSlug)}`
    : `/site/${subdomain}/hoteles`;

  return (
    <Link
      href={detailHref}
      className="block"
      aria-label={`Ver detalle de ${hotel.name}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: index * 0.08, duration: 0.55 }}
        className="rounded-[20px] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="relative h-52 overflow-hidden">
          {hotel.image ? (
            <Image src={hotel.image} alt={hotel.name} fill draggable={false} className="object-cover" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {hotel.badge && (
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                {hotel.badge}
              </span>
            )}
          </div>

          {hotel.rating && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)' }}
            >
              {Array.from({ length: hotel.rating }).map((_, i) => (
                <svg key={i} className="w-2.5 h-2.5" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          <h3 className="product-card-title mb-2 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {hotel.name}
          </h3>

          {hotel.location && (
            <p className="text-sm mb-2 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              {hotel.location}
            </p>
          )}

          {hotel.reviewRating && (
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {hotel.reviewRating} de 5 {hotel.reviewCount ? `(${hotel.reviewCount} reseñas)` : ''}
            </p>
          )}

          <div className="flex-1" />

          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                Desde
              </p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {hotel.price || 'Consultar'}
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver hotel ›
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
