'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';
import { buildEntityAlt } from '@/lib/utils/entity-alt';

interface HotelsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export interface HotelItem {
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
  category?: string;
  amenities?: string[];
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

/** Inline SVG amenity icons */
function AmenityIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase().trim();

  if (normalized === 'wifi' || normalized === 'wi-fi') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    );
  }
  if (normalized === 'pool' || normalized === 'piscina') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20.25c1.5 0 2.25-.75 3-1.5s1.5-1.5 3-1.5 2.25.75 3 1.5 1.5 1.5 3 1.5 2.25-.75 3-1.5 1.5-1.5 3-1.5M3 16.5c1.5 0 2.25-.75 3-1.5s1.5-1.5 3-1.5 2.25.75 3 1.5 1.5 1.5 3 1.5 2.25-.75 3-1.5 1.5-1.5 3-1.5M7 4v9m10-9v9" />
      </svg>
    );
  }
  if (normalized === 'spa') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    );
  }
  if (normalized === 'restaurant' || normalized === 'restaurante' || normalized === 'dining') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
      </svg>
    );
  }
  // Generic amenity icon
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

export function HotelCard({ hotel, index, subdomain, basePath: overrideBasePath }: { hotel: HotelItem; index: number; subdomain: string; basePath?: string }) {
  const locale = useWebsiteLocale();
  const base = overrideBasePath ?? `/site/${subdomain}`;
  const detailSlug = (hotel.slug || '').trim();
  const detailHref = detailSlug
    ? `${base}/hoteles/${encodeURIComponent(detailSlug)}`
    : `${base}/hoteles`;

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
        className="group rounded-2xl overflow-hidden flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Image — 16:9 with star overlay */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
          {hotel.image ? (
            <Image src={hotel.image} alt={buildEntityAlt('hotel', hotel.name, locale)} fill draggable={false} className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />

          {/* Badge top-left: category */}
          {(hotel.category || hotel.badge) && (
            <div className="absolute top-3 left-3">
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                {hotel.category || hotel.badge}
              </span>
            </div>
          )}

          {/* Star rating overlay top-right */}
          {hotel.rating && hotel.rating > 0 && (
            <div
              className="absolute top-3 right-3 flex items-center gap-0.5 px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)' }}
            >
              {Array.from({ length: hotel.rating }).map((_, i) => (
                <svg key={i} className="w-3 h-3" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="product-card-title font-bold mb-1 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {hotel.name}
          </h3>

          {/* Location with pin */}
          {hotel.location && (
            <p className="flex items-center gap-1 text-sm mb-3 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {hotel.location}
            </p>
          )}

          {/* Amenities row — up to 4 icons */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              {hotel.amenities.slice(0, 4).map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-1"
                  style={{ color: 'var(--text-muted)' }}
                  title={amenity}
                >
                  <AmenityIcon type={amenity} />
                  <span className="text-[11px] hidden sm:inline">{amenity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Review score */}
          {hotel.reviewRating && (
            <div className="flex items-center gap-1.5 mb-4">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                {hotel.reviewRating}
              </span>
              {hotel.reviewCount && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({hotel.reviewCount} {hotel.reviewCount === 1 ? 'resena' : 'resenas'})
                </span>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                Desde
              </p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {hotel.price ? `${hotel.price} / noche` : 'Consultar'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver hotel
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
