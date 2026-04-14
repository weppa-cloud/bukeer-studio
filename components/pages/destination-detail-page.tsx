'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getBasePath } from '@/lib/utils/base-path';
import { getDestinationContent } from '@/lib/data/colombia-destinations';
import { RouteMap } from '@/components/ui/route-map';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ProductSchema } from '@/components/seo/product-schema';
import type { ProductData as ContractProductData } from '@bukeer/website-contract';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { DestinationData } from '@/lib/supabase/get-pages';

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  images?: string[];
  location?: string;
  price?: string;
  type: string;
  duration?: string;
}

interface SerpEnrichmentData {
  description: string | null;
  photos: string[];
  rating: number | null;
  reviewCount: number | null;
  reviews: Array<{ author: string; rating: number; text: string; date: string }>;
  source: 'serpapi';
}

interface DestinationDetailPageProps {
  website: WebsiteData;
  destination: DestinationData;
  products: ProductData[];
  serpEnrichment?: SerpEnrichmentData | null;
}

export function DestinationDetailPage({
  website,
  destination,
  products,
  serpEnrichment,
}: DestinationDetailPageProps) {
  const basePath = getBasePath(website.subdomain);
  const staticContent = getDestinationContent(destination.name);

  // Merge: SerpAPI data (server-fetched) > static content > defaults
  const serpData = serpEnrichment || null;
  const enrichment = {
    description: serpData?.description || staticContent?.description || null,
    photos: serpData?.photos?.length ? serpData.photos : [],
    rating: serpData?.rating || null,
    reviewCount: serpData?.reviewCount || null,
    reviews: serpData?.reviews || [],
    highlights: staticContent?.highlights || [],
    bestTimeToVisit: staticContent?.bestTimeToVisit || null,
    weather: staticContent?.weather || null,
    heroImage: staticContent?.heroImage || null,
    facts: staticContent?.facts || [],
  };

  // Issue #48: fallback content when serpEnrichment fails
  if (!enrichment.description) {
    enrichment.description =
      `Descubre ${destination.name}${destination.state ? `, ${destination.state}` : ''}.` +
      ` Encuentra ${destination.hotel_count} hoteles y ${destination.activity_count} actividades` +
      ` seleccionadas para tu viaje.` +
      (destination.min_price ? ` Precios desde ${destination.min_price}.` : '');
  }

  const packages = products.filter(
    (p) => p.type === 'package' || p.type === 'package_kit'
  );
  const activities = products.filter((p) => p.type === 'activity');
  const hotels = products.filter((p) => p.type === 'hotel');

  const heroImage =
    (enrichment.photos.length > 0 ? enrichment.photos[0] : null) ||
    enrichment.heroImage ||
    destination.image ||
    '/placeholder-destination.jpg';

  // Issue #34: JSON-LD TouristDestination schema
  const websiteUrl = website.subdomain
    ? `https://${website.subdomain}.bukeer.com`
    : undefined;
  const schemaProduct: ContractProductData = {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    type: 'destination',
    description: enrichment.description || undefined,
    image: heroImage || destination.image || undefined,
    location: destination.state || undefined,
    latitude: destination.lat,
    longitude: destination.lng,
    rating: enrichment.rating || undefined,
    review_count: enrichment.reviewCount || undefined,
  };

  const websiteSocial = (website as unknown as { social?: { whatsapp?: string } }).social;
  const whatsappNumber = websiteSocial?.whatsapp || '';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola! Me interesa viajar a ${destination.name}`)}`
    : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Issue #34: JSON-LD TouristDestination + BreadcrumbList */}
      <ProductSchema
        product={schemaProduct}
        productType="destination"
        websiteUrl={websiteUrl}
      />

      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px]">
        <Image
          src={heroImage}
          alt={`Vista de ${destination.name}${destination.state ? `, ${destination.state}` : ''}`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-16 max-w-7xl mx-auto">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
              {destination.name}
            </h1>
            {destination.state && (
              <p className="text-lg text-white/70 mt-2">{destination.state}</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ background: 'var(--accent)' }}
              >
                {destination.hotel_count} hoteles &middot;{' '}
                {destination.activity_count} actividades
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-4">
        <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-body)' }}>
          <li>
            <Link href={basePath || '/'} className="hover:underline">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`${basePath}/destinos`} className="hover:underline">
              Destinos
            </Link>
          </li>
          <li>/</li>
          <li style={{ color: 'var(--text-heading)' }} className="font-medium">
            {destination.name}
          </li>
        </ol>
      </nav>

      {/* About Section */}
      {enrichment && (
        <BlurFade delay={0.1}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <h2
                  className="text-3xl font-bold mb-4"
                  style={{ color: 'var(--text-heading)' }}
                >
                  Sobre {destination.name}
                </h2>
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: 'var(--text-body)' }}
                >
                  {enrichment.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {enrichment.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-xl p-4"
                    style={{ background: 'var(--surface-secondary)' }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      {fact.label}
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {fact.label === 'Poblacion' ? (
                        <NumberTicker
                          value={parseInt(fact.value.replace(/[^0-9]/g, ''), 10)}
                        />
                      ) : (
                        fact.value
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </BlurFade>
      )}

      {/* Highlights Section */}
      {enrichment && enrichment.highlights.length > 0 && (
        <BlurFade delay={0.2}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <h2
              className="text-3xl font-bold mb-8"
              style={{ color: 'var(--text-heading)' }}
            >
              Lo mejor de {destination.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {enrichment.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl p-5"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <svg
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--accent)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {/* Google Photos Gallery (from SerpAPI) */}
      {enrichment.photos.length > 1 && (
        <BlurFade delay={0.25}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-heading)' }}>
              Fotos de {destination.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {enrichment.photos.slice(0, 8).map((photo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative rounded-xl overflow-hidden group cursor-pointer ${
                    i === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                  style={{ aspectRatio: i === 0 ? '1/1' : '4/3' }}
                >
                  <Image
                    src={photo}
                    alt={`${destination.name} - foto ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes={i === 0 ? '50vw' : '25vw'}
                  />
                </motion.div>
              ))}
            </div>
            {serpData?.source === 'serpapi' && (
              <p className="text-xs mt-3 font-mono" style={{ color: 'var(--text-muted)' }}>
                Fotos de Google Maps
              </p>
            )}
          </section>
        </BlurFade>
      )}

      {/* Google Reviews (from SerpAPI) */}
      {enrichment.reviews.length > 0 && (
        <BlurFade delay={0.3}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
                Opiniones sobre {destination.name}
              </h2>
              {enrichment.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{enrichment.rating}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className={`w-4 h-4 ${i <= Math.round(enrichment.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-muted fill-muted'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {enrichment.reviewCount && (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({enrichment.reviewCount})</span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichment.reviews.slice(0, 6).map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'var(--accent-text)' }}>
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{review.author}</p>
                        {review.date && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{review.date}</p>}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <svg key={j} className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'var(--text-secondary)' }}>{review.text}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-xs mt-4 font-mono" style={{ color: 'var(--text-muted)' }}>
              Opiniones de Google Maps
            </p>
          </section>
        </BlurFade>
      )}

      {/* Best Time & Weather */}
      {enrichment && (
        <BlurFade delay={0.3}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <div
              className="rounded-2xl p-8"
              style={{ background: 'var(--surface-secondary)' }}
            >
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--text-heading)' }}
              >
                Mejor epoca para visitar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p
                    className="text-sm font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    Clima
                  </p>
                  <p style={{ color: 'var(--text-body)' }}>{enrichment.weather}</p>
                </div>
                <div>
                  <p
                    className="text-sm font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    Recomendacion
                  </p>
                  <p style={{ color: 'var(--text-body)' }}>
                    {enrichment.bestTimeToVisit}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </BlurFade>
      )}

      {/* Packages Grid */}
      {packages.length > 0 && (
        <BlurFade delay={0.4}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <h2
              className="text-3xl font-bold mb-8"
              style={{ color: 'var(--text-heading)' }}
            >
              Paquetes en {destination.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Link
                  key={pkg.id}
                  href={`${basePath}/paquetes/${pkg.slug}`}
                >
                  <motion.div
                    className="rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                    style={{ background: 'var(--surface-primary)' }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative" style={{ aspectRatio: '16/10' }}>
                      {pkg.image ? (
                        <Image
                          src={pkg.image}
                          alt={`Paquete ${pkg.name} en ${destination.name}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ background: 'var(--surface-secondary)' }}
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        {pkg.name}
                      </h3>
                      {pkg.duration && (
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {pkg.duration}
                        </p>
                      )}
                      {pkg.price && (
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Desde {pkg.price}
                        </p>
                      )}
                      <p
                        className="text-sm font-medium mt-3 inline-flex items-center gap-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        Ver Paquete
                        <span aria-hidden="true">&rarr;</span>
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {/* Activities Grid */}
      {activities.length > 0 && (
        <BlurFade delay={0.5}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <h2
              className="text-3xl font-bold mb-8"
              style={{ color: 'var(--text-heading)' }}
            >
              Actividades en {destination.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`${basePath}/actividades/${activity.slug}`}
                >
                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                    style={{ aspectRatio: '1/1' }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activity.image ? (
                      <Image
                        src={activity.image}
                        alt={`Actividad ${activity.name} en ${destination.name}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{ background: 'var(--surface-secondary)' }}
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%)',
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                      <h3 className="text-lg font-bold text-white">
                        {activity.name}
                      </h3>
                      {activity.duration && (
                        <p className="text-sm text-white/70 mt-1">
                          {activity.duration}
                        </p>
                      )}
                      {activity.price && (
                        <p
                          className="text-sm font-semibold mt-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Desde {activity.price}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-2 text-white/90 inline-flex items-center gap-1">
                        Ver Actividad
                        <span aria-hidden="true">&rarr;</span>
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {/* Hotels Grid */}
      {hotels.length > 0 && (
        <BlurFade delay={0.55}>
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
            <h2
              className="text-3xl font-bold mb-8"
              style={{ color: 'var(--text-heading)' }}
            >
              Hoteles en {destination.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <Link
                  key={hotel.id}
                  href={`${basePath}/hoteles/${hotel.slug}`}
                >
                  <motion.div
                    className="rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                    style={{ background: 'var(--surface-primary)' }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative" style={{ aspectRatio: '16/10' }}>
                      {hotel.image ? (
                        <Image
                          src={hotel.image}
                          alt={`Hotel ${hotel.name} en ${destination.name}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ background: 'var(--surface-secondary)' }}
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        {hotel.name}
                      </h3>
                      {hotel.price && (
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Desde {hotel.price}
                        </p>
                      )}
                      <p
                        className="text-sm font-medium mt-3 inline-flex items-center gap-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        Ver Hotel
                        <span aria-hidden="true">&rarr;</span>
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {/* Map Section */}
      <BlurFade delay={0.6}>
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
          <h2
            className="text-3xl font-bold mb-8"
            style={{ color: 'var(--text-heading)' }}
          >
            Ubicacion
          </h2>
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: '350px' }}>
            <RouteMap
              points={[
                {
                  city: destination.name,
                  lat: destination.lat,
                  lng: destination.lng,
                },
              ]}
            />
          </div>
        </section>
      </BlurFade>

      {/* CTA Section */}
      <BlurFade delay={0.7}>
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16">
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--surface-secondary)' }}
          >
            <h2
              className="text-3xl font-bold mb-4"
              style={{ color: 'var(--text-heading)' }}
            >
              Planifica tu viaje a {destination.name}
            </h2>
            <p
              className="text-lg mb-8 max-w-xl mx-auto"
              style={{ color: 'var(--text-body)' }}
            >
              Nuestro equipo esta listo para ayudarte a crear la experiencia
              perfecta. Contactanos hoy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold transition-transform hover:scale-105"
                  style={{ background: '#25D366' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
              <Link
                href={`${basePath}/contacto`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-transform hover:scale-105"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-on-accent, #fff)',
                }}
              >
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </BlurFade>
    </div>
  );
}
