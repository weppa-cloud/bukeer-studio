'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getBasePath } from '@/lib/utils/base-path';
import { DestinationMap } from '@/components/maps/destination-map';
import type { MapMarker } from '@/lib/maps/types';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { DestinationData } from '@/lib/supabase/get-pages';

interface DestinationListingPageProps {
  website: WebsiteData;
  destinations: DestinationData[];
}

export function DestinationListingPage({
  website,
  destinations,
}: DestinationListingPageProps) {
  const basePath = getBasePath(website.subdomain);

  // Filter and dedupe by slug to avoid duplicated cards with unstable React keys
  const visibleDestinations = useMemo(() => {
    const bySlug = new Map<string, DestinationData>();

    for (const destination of destinations) {
      if (destination.total < 2) continue;
      const slugKey = destination.slug?.trim() || destination.id;
      const current = bySlug.get(slugKey);

      if (!current || destination.total > current.total) {
        bySlug.set(slugKey, destination);
      }
    }

    return Array.from(bySlug.values());
  }, [destinations]);

  const mapMarkers: MapMarker[] = visibleDestinations
    .filter((destination) => Number.isFinite(destination.lat) && Number.isFinite(destination.lng))
    .map((destination) => ({
      id: destination.id || destination.slug,
      label: destination.name,
      kind: 'destination',
      lat: destination.lat,
      lng: destination.lng,
      slug: destination.slug,
      meta: {
        state: destination.state,
        hotelCount: destination.hotel_count,
        activityCount: destination.activity_count,
      },
    }));

  // Build JSON-LD structured data for CollectionPage + BreadcrumbList
  const jsonLdSchemas = useMemo(() => {
    const siteName =
      website.content?.account?.name ||
      website.content?.siteName ||
      website.subdomain;
    const baseUrl = website.custom_domain
      ? `https://${website.custom_domain}`
      : `https://${website.subdomain}.bukeer.com`;

    const collectionSchema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Destinos | ${siteName}`,
      description: `Descubre los mejores destinos de viaje con ${siteName}.`,
      url: `${baseUrl}/destinos`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: visibleDestinations.length,
        itemListElement: visibleDestinations.slice(0, 10).map((dest, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: dest.name,
          url: `${baseUrl}/destinos/${dest.slug}`,
        })),
      },
    };

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Destinos' },
      ],
    };

    return [collectionSchema, breadcrumbSchema];
  }, [website, visibleDestinations]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* JSON-LD Structured Data */}
      {visibleDestinations.length > 0 &&
        jsonLdSchemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema),
            }}
          />
        ))}
      {/* Header Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            EXPLORA
          </span>
          <h1
            className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold"
            style={{ color: 'var(--text-heading)' }}
          >
            Destinos en Colombia
          </h1>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--text-body)' }}
          >
            Descubre los mejores destinos que tenemos para ti, con hoteles y
            actividades seleccionadas en cada ciudad.
          </p>
        </motion.div>
      </section>

      {/* Map Section */}
      {mapMarkers.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{ height: '400px' }}
          >
            <DestinationMap
              markers={mapMarkers}
              viewportPreset="colombia"
              showFilters={false}
              showLegend={true}
              height={400}
            />
          </motion.div>
        </section>
      )}

      {/* Destinations Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleDestinations.map((dest, index) => (
            <motion.div
              key={`${dest.id}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link href={`${basePath}/destinos/${dest.slug}`}>
                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer group"
                  style={{ aspectRatio: '3/4' }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Background Image */}
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={`Destino ${dest.name}${dest.state ? `, ${dest.state}` : ''} — ${dest.hotel_count} hoteles y ${dest.activity_count} actividades`}
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

                  {/* Gradient Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)',
                    }}
                  />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="text-2xl font-bold text-white">
                      {dest.name}
                    </h3>
                    {dest.state && (
                      <p className="text-sm text-white/70 mt-1">{dest.state}</p>
                    )}
                    <p className="text-sm text-white/80 mt-2">
                      {dest.hotel_count} hoteles &middot; {dest.activity_count} actividades
                    </p>
                    {dest.min_price && (
                      <p
                        className="text-sm font-semibold mt-2"
                        style={{ color: 'var(--accent)' }}
                      >
                        Desde ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(dest.min_price))}
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {visibleDestinations.length === 0 && (
          <div className="text-center py-20">
            <p
              className="text-lg"
              style={{ color: 'var(--text-body)' }}
            >
              No hay destinos disponibles en este momento.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
